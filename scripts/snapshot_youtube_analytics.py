#!/usr/bin/env python3
"""
Daily YouTube Analytics snapshot for Analytics Hub.

Uses a Google OAuth refresh token for a YouTube channel manager account, queries
the official YouTube Analytics API, stores a small SQLite history, and exports a
browser-ready JSON file for docs/pages-analytics/video.html.
"""
from __future__ import annotations

import argparse
import json
import os
import sqlite3
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib import error, parse, request

ROOT = Path(__file__).resolve().parents[1]
OUT_DB = ROOT / "docs" / "data" / "youtube-analytics.sqlite"
OUT_JSON = ROOT / "docs" / "data" / "youtube-analytics.json"

DEFAULT_CHANNEL_ID = "UCiWNgBL0p8q23LnNe5sczGw"
DEFAULT_LOOKBACK_DAYS = 90
TOP_VIDEO_LIMIT = 25

TOKEN_URL = "https://oauth2.googleapis.com/token"
TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
YT_ANALYTICS_URL = "https://youtubeanalytics.googleapis.com/v2/reports"
YT_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

BASE_METRICS = [
    "views",
    "estimatedMinutesWatched",
    "subscribersGained",
    "subscribersLost",
    "averageViewDuration",
    "averageViewPercentage",
]
REVENUE_METRICS = ["estimatedRevenue"]
REQUIRED_SCOPES = {
    "https://www.googleapis.com/auth/yt-analytics.readonly",
    "https://www.googleapis.com/auth/youtube.readonly",
}


class ConfigError(RuntimeError):
    pass


def env_required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ConfigError(f"Missing required environment variable: {name}")
    return value


def api_json(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, body: bytes | None = None) -> dict:
    req = request.Request(url, headers=headers or {}, data=body, method=method)
    try:
        with request.urlopen(req, timeout=45) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {detail}") from exc


def refresh_access_token(client_id: str, client_secret: str, refresh_token: str) -> str:
    payload = parse.urlencode({
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }).encode("utf-8")
    data = api_json(
        TOKEN_URL,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        body=payload,
    )
    token = data.get("access_token")
    if not token:
        raise RuntimeError(f"Google OAuth refresh did not return an access_token: {data}")
    return str(token)


def validate_access_token_scopes(access_token: str) -> None:
    data = api_json(f"{TOKENINFO_URL}?{parse.urlencode({'access_token': access_token})}")
    granted = set(str(data.get("scope", "")).split())
    missing = sorted(REQUIRED_SCOPES - granted)
    if missing:
        raise RuntimeError(
            "The YouTube refresh token is missing required OAuth scopes. "
            "Re-authorize in OAuth Playground with BOTH scopes and replace YOUTUBE_REFRESH_TOKEN: "
            + ", ".join(missing)
        )


def metric_names(include_revenue: bool) -> list[str]:
    return BASE_METRICS + (REVENUE_METRICS if include_revenue else [])


def query_report(
    access_token: str,
    *,
    channel_id: str,
    start_date: str,
    end_date: str,
    dimensions: str,
    metrics: list[str],
    sort: str | None = None,
    max_results: int | None = None,
) -> dict:
    params: dict[str, str | int] = {
        "ids": f"channel=={channel_id}",
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "metrics": ",".join(metrics),
    }
    if sort:
        params["sort"] = sort
    if max_results:
        params["maxResults"] = max_results
    return api_json(
        f"{YT_ANALYTICS_URL}?{parse.urlencode(params)}",
        headers={"Authorization": f"Bearer {access_token}", "User-Agent": "analytics-hub-youtube-snapshot"},
    )


def rows_from_report(report: dict) -> tuple[list[str], list[list]]:
    columns = [col.get("name", "") for col in report.get("columnHeaders", [])]
    rows = report.get("rows", []) or []
    if not columns:
        return [], []
    return columns, rows


def row_dict(columns: list[str], row: list) -> dict:
    return {columns[i]: row[i] if i < len(row) else None for i in range(len(columns))}


def safe_int(value) -> int:
    try:
        return int(round(float(value or 0)))
    except (TypeError, ValueError):
        return 0


def safe_float(value) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def fetch_video_metadata(access_token: str, video_ids: list[str]) -> dict[str, dict]:
    if not video_ids:
        return {}
    meta: dict[str, dict] = {}
    for i in range(0, len(video_ids), 50):
        batch = video_ids[i:i + 50]
        params = parse.urlencode({
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(batch),
            "maxResults": 50,
        })
        data = api_json(
            f"{YT_VIDEOS_URL}?{params}",
            headers={"Authorization": f"Bearer {access_token}", "User-Agent": "analytics-hub-youtube-snapshot"},
        )
        for item in data.get("items", []):
            video_id = item.get("id")
            if not video_id:
                continue
            snippet = item.get("snippet", {}) or {}
            stats = item.get("statistics", {}) or {}
            meta[video_id] = {
                "title": snippet.get("title") or video_id,
                "publishedAt": snippet.get("publishedAt"),
                "url": f"https://www.youtube.com/watch?v={video_id}",
                "thumbnail": ((snippet.get("thumbnails") or {}).get("medium") or {}).get("url"),
                "lifetimeViews": safe_int(stats.get("viewCount")),
            }
    return meta


def fetch_authorized_channels(access_token: str) -> list[dict]:
    params = parse.urlencode({
        "part": "id,snippet",
        "mine": "true",
        "maxResults": 50,
    })
    data = api_json(
        f"https://www.googleapis.com/youtube/v3/channels?{params}",
        headers={"Authorization": f"Bearer {access_token}", "User-Agent": "analytics-hub-youtube-snapshot"},
    )
    channels = [
        {
            "id": item.get("id"),
            "title": (item.get("snippet") or {}).get("title") or item.get("id"),
        }
        for item in data.get("items", [])
        if item.get("id")
    ]
    return channels


def validate_authorized_channel(access_token: str, target_channel_id: str) -> None:
    channels = fetch_authorized_channels(access_token)
    if any(ch["id"] == target_channel_id for ch in channels):
        return
    seen = ", ".join(f"{ch['title']} ({ch['id']})" for ch in channels) or "no channels"
    raise RuntimeError(
        "The YouTube refresh token is not authorized for the target channel "
        f"{target_channel_id}. OAuth currently sees: {seen}. Re-authorize in "
        "OAuth Playground and choose the Analytics Hub / MSFTAnalyticsHub YouTube channel."
    )


def fetch_current_channel_snapshot(access_token: str, channel_id: str) -> dict:
    params = parse.urlencode({
        "part": "id,snippet,statistics,contentDetails",
        "id": channel_id,
        "maxResults": 1,
    })
    data = api_json(
        f"https://www.googleapis.com/youtube/v3/channels?{params}",
        headers={"Authorization": f"Bearer {access_token}", "User-Agent": "analytics-hub-youtube-snapshot"},
    )
    item = (data.get("items") or [{}])[0]
    snippet = item.get("snippet") or {}
    stats = item.get("statistics") or {}
    content = item.get("contentDetails") or {}
    uploads = ((content.get("relatedPlaylists") or {}).get("uploads")) or ""
    videos = fetch_upload_playlist_videos(access_token, uploads) if uploads else []
    return {
        "channel": {
            "id": item.get("id") or channel_id,
            "title": snippet.get("title") or channel_id,
            "url": f"https://www.youtube.com/channel/{channel_id}",
            "viewCount": safe_int(stats.get("viewCount")),
            "subscriberCount": safe_int(stats.get("subscriberCount")),
            "videoCount": safe_int(stats.get("videoCount")),
        },
        "videos": videos,
    }


def fetch_upload_playlist_videos(access_token: str, playlist_id: str, limit: int = 50) -> list[dict]:
    video_ids: list[str] = []
    page_token = ""
    while len(video_ids) < limit:
        params = {
            "part": "contentDetails",
            "playlistId": playlist_id,
            "maxResults": min(50, limit - len(video_ids)),
        }
        if page_token:
            params["pageToken"] = page_token
        data = api_json(
            f"https://www.googleapis.com/youtube/v3/playlistItems?{parse.urlencode(params)}",
            headers={"Authorization": f"Bearer {access_token}", "User-Agent": "analytics-hub-youtube-snapshot"},
        )
        for item in data.get("items", []):
            vid = ((item.get("contentDetails") or {}).get("videoId")) or ""
            if vid:
                video_ids.append(vid)
        page_token = data.get("nextPageToken") or ""
        if not page_token:
            break
    meta = fetch_video_metadata(access_token, video_ids)
    videos = [
        {
            "videoId": video_id,
            "title": row.get("title") or video_id,
            "url": row.get("url") or f"https://www.youtube.com/watch?v={video_id}",
            "thumbnail": row.get("thumbnail"),
            "publishedAt": row.get("publishedAt"),
            "views": safe_int(row.get("lifetimeViews")),
        }
        for video_id, row in meta.items()
    ]
    return sorted(videos, key=lambda row: row["views"], reverse=True)


def normalize_daily(columns: list[str], rows: list[list], include_revenue: bool) -> list[dict]:
    out = []
    for row in rows:
        item = row_dict(columns, row)
        gained = safe_int(item.get("subscribersGained"))
        lost = safe_int(item.get("subscribersLost"))
        day = {
            "date": str(item.get("day")),
            "views": safe_int(item.get("views")),
            "watchMinutes": safe_float(item.get("estimatedMinutesWatched")),
            "averageViewDuration": safe_float(item.get("averageViewDuration")),
            "averageViewPercentage": safe_float(item.get("averageViewPercentage")),
            "subscribersGained": gained,
            "subscribersLost": lost,
            "subscribersNet": gained - lost,
        }
        if include_revenue:
            day["estimatedRevenue"] = safe_float(item.get("estimatedRevenue"))
        out.append(day)
    return sorted(out, key=lambda d: d["date"], reverse=True)


def normalize_videos(columns: list[str], rows: list[list], metadata: dict[str, dict], include_revenue: bool) -> list[dict]:
    out = []
    for row in rows:
        item = row_dict(columns, row)
        video_id = str(item.get("video") or "")
        gained = safe_int(item.get("subscribersGained"))
        lost = safe_int(item.get("subscribersLost"))
        meta = metadata.get(video_id, {})
        video = {
            "videoId": video_id,
            "title": meta.get("title") or video_id,
            "url": meta.get("url") or f"https://www.youtube.com/watch?v={video_id}",
            "thumbnail": meta.get("thumbnail"),
            "publishedAt": meta.get("publishedAt"),
            "lifetimeViews": safe_int(meta.get("lifetimeViews")),
            "views": safe_int(item.get("views")),
            "watchMinutes": safe_float(item.get("estimatedMinutesWatched")),
            "averageViewDuration": safe_float(item.get("averageViewDuration")),
            "averageViewPercentage": safe_float(item.get("averageViewPercentage")),
            "subscribersGained": gained,
            "subscribersLost": lost,
            "subscribersNet": gained - lost,
        }
        if include_revenue:
            video["estimatedRevenue"] = safe_float(item.get("estimatedRevenue"))
        out.append(video)
    return out


def aggregate_summary(days: list[dict], videos: list[dict], include_revenue: bool) -> dict:
    views = sum(day["views"] for day in days)
    watch_minutes = sum(day["watchMinutes"] for day in days)
    subscribers_net = sum(day["subscribersNet"] for day in days)
    weighted_duration = sum(day["averageViewDuration"] * day["views"] for day in days)
    weighted_percentage = sum(day["averageViewPercentage"] * day["views"] for day in days)
    summary = {
        "dayCount": len(days),
        "videoCount": len(videos),
        "firstDate": days[-1]["date"] if days else None,
        "lastDate": days[0]["date"] if days else None,
        "views": views,
        "watchMinutes": watch_minutes,
        "subscribersNet": subscribers_net,
        "averageViewDuration": weighted_duration / views if views else 0,
        "averageViewPercentage": weighted_percentage / views if views else 0,
    }
    if include_revenue:
        summary["estimatedRevenue"] = sum(day.get("estimatedRevenue", 0) for day in days)
    return summary


def write_database(days: list[dict], videos: list[dict], payload: dict, include_revenue: bool) -> None:
    OUT_DB.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(OUT_DB)
    try:
        con.execute("PRAGMA journal_mode=DELETE")
        con.execute(
            "CREATE TABLE IF NOT EXISTS youtube_daily ("
            "date TEXT PRIMARY KEY, views INTEGER NOT NULL, watch_minutes REAL NOT NULL, "
            "subscribers_gained INTEGER NOT NULL, subscribers_lost INTEGER NOT NULL, subscribers_net INTEGER NOT NULL, "
            "average_view_duration REAL NOT NULL, average_view_percentage REAL NOT NULL, estimated_revenue REAL)"
        )
        con.execute(
            "CREATE TABLE IF NOT EXISTS youtube_top_video ("
            "snapshot_date TEXT NOT NULL, video_id TEXT NOT NULL, title TEXT NOT NULL, url TEXT NOT NULL, "
            "views INTEGER NOT NULL, watch_minutes REAL NOT NULL, subscribers_net INTEGER NOT NULL, "
            "average_view_duration REAL NOT NULL, average_view_percentage REAL NOT NULL, estimated_revenue REAL, "
            "PRIMARY KEY (snapshot_date, video_id))"
        )
        con.execute("CREATE TABLE IF NOT EXISTS youtube_snapshot_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
        con.executemany(
            "INSERT INTO youtube_daily(date, views, watch_minutes, subscribers_gained, subscribers_lost, subscribers_net, average_view_duration, average_view_percentage, estimated_revenue) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(date) DO UPDATE SET views=excluded.views, watch_minutes=excluded.watch_minutes, "
            "subscribers_gained=excluded.subscribers_gained, subscribers_lost=excluded.subscribers_lost, "
            "subscribers_net=excluded.subscribers_net, average_view_duration=excluded.average_view_duration, "
            "average_view_percentage=excluded.average_view_percentage, "
            "estimated_revenue=excluded.estimated_revenue",
            [
                (
                    day["date"], day["views"], day["watchMinutes"], day["subscribersGained"],
                    day["subscribersLost"], day["subscribersNet"], day["averageViewDuration"], day["averageViewPercentage"],
                    day.get("estimatedRevenue") if include_revenue else None,
                )
                for day in days
            ],
        )
        snapshot_date = payload["source"]["endDate"]
        con.execute("DELETE FROM youtube_top_video WHERE snapshot_date = ?", (snapshot_date,))
        con.executemany(
            "INSERT INTO youtube_top_video(snapshot_date, video_id, title, url, views, watch_minutes, subscribers_net, average_view_duration, average_view_percentage, estimated_revenue) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                (
                    snapshot_date, video["videoId"], video["title"], video["url"], video["views"],
                    video["watchMinutes"], video["subscribersNet"], video["averageViewDuration"], video["averageViewPercentage"],
                    video.get("estimatedRevenue") if include_revenue else None,
                )
                for video in videos
            ],
        )
        con.executemany(
            "INSERT INTO youtube_snapshot_meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
            [
                ("lastUpdated", payload["lastUpdated"]),
                ("channelId", payload["source"]["channelId"]),
                ("includeRevenue", "true" if include_revenue else "false"),
                ("startDate", payload["source"]["startDate"]),
                ("endDate", payload["source"]["endDate"]),
            ],
        )
        con.commit()
        con.execute("VACUUM")
    finally:
        con.close()


def write_json(payload: dict) -> None:
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def build_payload(
    *,
    channel_id: str,
    start_date: str,
    end_date: str,
    fetched_at: str,
    days: list[dict],
    videos: list[dict],
    windows: dict[str, dict],
    current: dict,
    include_revenue: bool,
) -> dict:
    return {
        "lastUpdated": fetched_at,
        "source": {
            "type": "youtube-analytics-api",
            "channelId": channel_id,
            "channelUrl": f"https://www.youtube.com/channel/{channel_id}",
            "startDate": start_date,
            "endDate": end_date,
            "lookbackDays": len(days),
            "hasRevenue": include_revenue,
        },
        "summary": aggregate_summary(days, videos, include_revenue),
        "days": days,
        "videos": videos,
        "windows": windows,
        "current": current,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--channel-id", default=os.environ.get("YOUTUBE_CHANNEL_ID", DEFAULT_CHANNEL_ID))
    parser.add_argument("--lookback-days", type=int, default=int(os.environ.get("YOUTUBE_LOOKBACK_DAYS", DEFAULT_LOOKBACK_DAYS)))
    parser.add_argument("--include-revenue", action="store_true", default=os.environ.get("YOUTUBE_INCLUDE_REVENUE", "").lower() in {"1", "true", "yes"})
    args = parser.parse_args()

    try:
        client_id = env_required("YOUTUBE_CLIENT_ID")
        client_secret = env_required("YOUTUBE_CLIENT_SECRET")
        refresh_token = env_required("YOUTUBE_REFRESH_TOKEN")
    except ConfigError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=max(1, args.lookback_days) - 1)
    start_s = start.isoformat()
    end_s = end.isoformat()
    metrics = metric_names(args.include_revenue)

    token = refresh_access_token(client_id, client_secret, refresh_token)
    validate_access_token_scopes(token)
    validate_authorized_channel(token, args.channel_id)
    current = fetch_current_channel_snapshot(token, args.channel_id)
    daily_cols, daily_rows = rows_from_report(query_report(
        token,
        channel_id=args.channel_id,
        start_date=start_s,
        end_date=end_s,
        dimensions="day",
        metrics=metrics,
        sort="day",
    ))
    days = normalize_daily(daily_cols, daily_rows, args.include_revenue)

    windows: dict[str, dict] = {}
    all_video_ids: list[str] = []
    raw_video_reports: dict[int, tuple[str, list[str], list[list]]] = {}
    for window_days in sorted({3, 7, 14, 30, max(1, args.lookback_days)}):
        window_start = (end - timedelta(days=window_days - 1)).isoformat()
        video_cols, video_rows = rows_from_report(query_report(
            token,
            channel_id=args.channel_id,
            start_date=window_start,
            end_date=end_s,
            dimensions="video",
            metrics=metrics,
            sort="-views",
            max_results=TOP_VIDEO_LIMIT,
        ))
        raw_video_reports[window_days] = (window_start, video_cols, video_rows)
        all_video_ids.extend(
            str(row_dict(video_cols, row).get("video"))
            for row in video_rows
            if row_dict(video_cols, row).get("video")
        )

    metadata = fetch_video_metadata(token, sorted(set(all_video_ids)))
    videos: list[dict] = []
    for window_days, (window_start, video_cols, video_rows) in raw_video_reports.items():
        window_videos = normalize_videos(video_cols, video_rows, metadata, args.include_revenue)
        window_days_rows = [
            day for day in days
            if window_start <= day["date"] <= end_s
        ]
        windows[str(window_days)] = {
            "startDate": window_start,
            "endDate": end_s,
            "summary": aggregate_summary(window_days_rows, window_videos, args.include_revenue),
            "videos": window_videos,
        }
        if window_days == max(1, args.lookback_days):
            videos = window_videos

    fetched_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload = build_payload(
        channel_id=args.channel_id,
        start_date=start_s,
        end_date=end_s,
        fetched_at=fetched_at,
        days=days,
        videos=videos,
        windows=windows,
        current=current,
        include_revenue=args.include_revenue,
    )
    write_database(days, videos, payload, args.include_revenue)
    write_json(payload)

    print(
        f"wrote {OUT_DB} and {OUT_JSON} "
        f"({len(days)} days, {len(videos)} top videos, revenue={'on' if args.include_revenue else 'off'})"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
