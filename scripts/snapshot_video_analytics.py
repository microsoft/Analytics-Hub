#!/usr/bin/env python3
"""
Daily video analytics snapshot for Analytics Hub.

Pulls anonymous aggregate video counters from the Cloudflare KV namespace used
by tools/video-analytics, stores them in a small SQLite database, and exports a
browser-ready JSON file for docs/pages-analytics/video.html.
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, parse, request

ROOT = Path(__file__).resolve().parents[1]
OUT_DB = ROOT / "docs" / "data" / "video-analytics.sqlite"
OUT_JSON = ROOT / "docs" / "data" / "video-analytics.json"
VIDEO_TOOL_DIR = ROOT / "tools" / "video-analytics"

DEFAULT_ACCOUNT_ID = "d70f11f2ba8e6ff00108d1692a7a3981"
DEFAULT_NAMESPACE_ID = "c33ac2cd3b55451cb737e2b710841272"
DEFAULT_WORKER_URL = "https://analytics-hub-video-stats.stephansmith-msft.workers.dev"


def _api_json(url: str, token: str) -> dict | list:
    req = request.Request(
        url,
        headers={
            "Authorization": f"******",
            "User-Agent": "analytics-hub-video-snapshot",
        },
        method="GET",
    )
    try:
        with request.urlopen(req, timeout=45) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Cloudflare API HTTP {exc.code}: {body}") from exc
    if isinstance(data, dict) and data.get("success") is False:
        raise RuntimeError(f"Cloudflare API error: {data.get('errors')}")
    return data


def _api_text(url: str, token: str) -> str:
    req = request.Request(
        url,
        headers={
            "Authorization": f"******",
            "User-Agent": "analytics-hub-video-snapshot",
        },
        method="GET",
    )
    try:
        with request.urlopen(req, timeout=45) as resp:
            return resp.read().decode("utf-8")
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Cloudflare KV value HTTP {exc.code}: {body}") from exc


def fetch_via_api(account_id: str, namespace_id: str, token: str) -> dict[str, dict]:
    base = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}"
    keys: list[str] = []
    cursor = ""
    while True:
        qs = {"prefix": "day#", "limit": "1000"}
        if cursor:
            qs["cursor"] = cursor
        data = _api_json(f"{base}/keys?{parse.urlencode(qs)}", token)
        if not isinstance(data, dict):
            raise RuntimeError("Unexpected Cloudflare keys response")
        keys.extend(k["name"] for k in data.get("result", []) if str(k.get("name", "")).startswith("day#"))
        cursor = (data.get("result_info") or {}).get("cursor") or ""
        if not cursor:
            break

    out: dict[str, dict] = {}
    for key in sorted(keys):
        raw = _api_text(f"{base}/values/{parse.quote(key, safe='')}", token)
        out[key.removeprefix("day#")] = json.loads(raw or "{}")
    return out


def _run(cmd: list[str], env: dict[str, str]) -> str:
    p = subprocess.run(
        cmd,
        cwd=VIDEO_TOOL_DIR,
        env=env,
        check=False,
        text=True,
        capture_output=True,
    )
    if p.returncode != 0:
        raise RuntimeError((p.stderr or p.stdout).strip())
    return p.stdout


def fetch_via_wrangler(account_id: str, namespace_id: str) -> dict[str, dict]:
    env = os.environ.copy()
    env["CLOUDFLARE_ACCOUNT_ID"] = account_id
    npx = shutil.which("npx") or shutil.which("npx.cmd") or "npx"
    key_data = json.loads(_run([npx, "wrangler", "kv", "key", "list", "--namespace-id", namespace_id], env))
    out: dict[str, dict] = {}
    for item in sorted(key_data, key=lambda x: x["name"]):
        key = item["name"]
        if not key.startswith("day#"):
            continue
        raw = _run([npx, "wrangler", "kv", "key", "get", key, "--namespace-id", namespace_id], env)
        out[key.removeprefix("day#")] = json.loads(raw or "{}")
    return out


def clean_int(value) -> int:
    try:
        return max(0, int(round(float(value))))
    except (TypeError, ValueError):
        return 0


def normalized_rows(days: dict[str, dict]) -> list[tuple[str, str, int, int]]:
    rows: list[tuple[str, str, int, int]] = []
    for day, videos in sorted(days.items()):
        if not isinstance(videos, dict):
            continue
        for video, metrics in sorted(videos.items()):
            if not isinstance(metrics, dict):
                continue
            plays = clean_int(metrics.get("plays"))
            seconds = clean_int(metrics.get("secs", metrics.get("seconds")))
            if plays or seconds:
                rows.append((day, str(video), plays, seconds))
    return rows


def write_database(rows: list[tuple[str, str, int, int]], fetched_at: str, namespace_id: str, worker_url: str) -> None:
    OUT_DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(OUT_DB)
    try:
        con.execute("PRAGMA journal_mode=DELETE")
        con.execute(
            "CREATE TABLE IF NOT EXISTS video_daily ("
            "date TEXT NOT NULL, video TEXT NOT NULL, plays INTEGER NOT NULL, seconds INTEGER NOT NULL, "
            "PRIMARY KEY (date, video))"
        )
        con.execute(
            "CREATE TABLE IF NOT EXISTS snapshot_meta ("
            "key TEXT PRIMARY KEY, value TEXT NOT NULL)"
        )
        con.executemany(
            "INSERT INTO video_daily(date, video, plays, seconds) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(date, video) DO UPDATE SET plays=excluded.plays, seconds=excluded.seconds",
            rows,
        )
        con.executemany(
            "INSERT INTO snapshot_meta(key, value) VALUES (?, ?) "
            "ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            [
                ("lastUpdated", fetched_at),
                ("namespaceId", namespace_id),
                ("workerUrl", worker_url),
            ],
        )
        con.commit()
        con.execute("VACUUM")
    finally:
        con.close()


def export_json(fetched_at: str, namespace_id: str, worker_url: str) -> None:
    con = sqlite3.connect(OUT_DB)
    try:
        con.row_factory = sqlite3.Row
        daily = con.execute(
            "SELECT date, video, plays, seconds FROM video_daily ORDER BY date DESC, video"
        ).fetchall()
    finally:
        con.close()

    by_day: dict[str, dict] = {}
    totals_by_video: dict[str, dict[str, int]] = {}
    for row in daily:
        day = by_day.setdefault(row["date"], {"date": row["date"], "videos": {}})
        day["videos"][row["video"]] = {"plays": row["plays"], "secs": row["seconds"]}
        vid = totals_by_video.setdefault(row["video"], {"plays": 0, "secs": 0})
        vid["plays"] += row["plays"]
        vid["secs"] += row["seconds"]

    days = [by_day[d] for d in sorted(by_day.keys(), reverse=True)]
    payload = {
        "lastUpdated": fetched_at,
        "source": {
            "type": "cloudflare-kv",
            "workerUrl": worker_url,
            "namespaceId": namespace_id,
        },
        "days": days,
        "summary": {
            "dayCount": len(days),
            "videoCount": len(totals_by_video),
            "plays": sum(v["plays"] for v in totals_by_video.values()),
            "seconds": sum(v["secs"] for v in totals_by_video.values()),
            "firstDate": days[-1]["date"] if days else None,
            "lastDate": days[0]["date"] if days else None,
        },
        "videos": totals_by_video,
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--account-id", default=os.environ.get("CLOUDFLARE_ACCOUNT_ID", DEFAULT_ACCOUNT_ID))
    parser.add_argument("--namespace-id", default=os.environ.get("VIDEO_STATS_NAMESPACE_ID", DEFAULT_NAMESPACE_ID))
    parser.add_argument("--worker-url", default=os.environ.get("VIDEO_STATS_WORKER_URL", DEFAULT_WORKER_URL))
    parser.add_argument("--prefer-wrangler", action="store_true", help="Use local Wrangler auth instead of CLOUDFLARE_API_TOKEN.")
    args = parser.parse_args()

    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if token and not args.prefer_wrangler:
        days = fetch_via_api(args.account_id, args.namespace_id, token)
    else:
        days = fetch_via_wrangler(args.account_id, args.namespace_id)

    fetched_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    rows = normalized_rows(days)
    write_database(rows, fetched_at, args.namespace_id, args.worker_url)
    export_json(fetched_at, args.namespace_id, args.worker_url)

    print(
        f"wrote {OUT_DB} and {OUT_JSON} "
        f"({len(days)} days, {len(rows)} video/day rows)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
