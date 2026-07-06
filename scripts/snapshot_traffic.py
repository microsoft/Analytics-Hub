#!/usr/bin/env python3
"""
Nightly traffic snapshot for the Analytics Hub.

Pulls two sources and appends to docs/data/traffic-history.json:

  1. GitHub Traffic API for every repo listed in REPOS (views, clones,
     referrers, popular paths, plus public meta: stars/forks/watchers).
     Requires a PAT with `repo` scope in env var GITHUB_TOKEN. Push access
     is required per-repo to read traffic endpoints; repos the token can't
     reach fall back to public meta only.

  2. Microsoft Clarity Data Export API for every project in CLARITY_SITES
     (sessions, pages-per-session, scroll depth, engagement time over the
     last 1 day). Requires CLARITY_API_TOKEN in env. Cap is 10 calls/day
     per Clarity project.

Idempotent: re-running on the same UTC date overwrites that day's snapshot
rather than appending a duplicate.

Standard library only — no pip installs needed in the workflow.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib import error, request

# ---------------------------------------------------------------- config

REPOS: list[str] = [
    "microsoft/Analytics-Hub",
    "microsoft/DecodingSuperUsage",
    "microsoft/superuserimpact",
    "microsoft/customizecopilot",
    "microsoft/AI-in-One-Dashboard",
    "microsoft/CopilotChatAnalytics",
    "microsoft/GitHubCopilotImpact",
    "microsoft/What-I-Did-Copilot",
    "microsoft/M365UsageAnalytics",
    "microsoft/PAX",
    "microsoft/PAX-Cookbook",
    "microsoft/CreditUsage",
    "olivierpecheux/copilot-adoption-sentiment-report",
    "jordankingisalive/CopilotROICalculator",
]

# Repos where the TRAFFIC_PAT is KNOWN to lack push access. The script will
# log their 403/404 responses but NOT fail the run. Every other repo in REPOS
# is treated as a hard dependency: any non-200 response from its traffic
# endpoints causes the script to exit non-zero so GitHub Actions emails a
# failure notification. This is what catches silent PAT expiry / revocation.
EXPECTED_FORBIDDEN: frozenset[str] = frozenset({
    "olivierpecheux/copilot-adoption-sentiment-report",
})

# Maximum allowed age (in hours) of any required repo's lastTrafficSync at the
# end of a successful run. Daily cron + 14-day rolling API window means a fresh
# sync should land every 24h; we allow a 12h safety buffer.
MAX_SYNC_AGE_HOURS: int = 36

# Clarity Data Export API tokens are scoped per-project: the token alone
# determines which project's data the call returns. We keep one entry per
# project so we know what to label the snapshot in the output JSON.
#
# Each entry: label -> (project_id_for_display, env_var_name_holding_token)
CLARITY_SITES: dict[str, tuple[str, str]] = {
    "analytics-hub": ("wxb0r23ozh", "CLARITY_TOKEN_HUB"),
    "jordan-homepage": ("wt5uwqabv0", "CLARITY_TOKEN_PERSONAL"),
}

OUTPUT = Path(__file__).resolve().parents[1] / "docs" / "data" / "traffic-history.json"

# Default token — the microsoft-org-scoped fine-grained PAT. Rotates weekly
# because Microsoft's SAML SSO policy caps PAT lifetime at 8 days.
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()

# Personal token — scoped to jordankingisalive/* repos. Not subject to the
# microsoft-org 8-day cap, so it can be a long-lived PAT.
GITHUB_TOKEN_PERSONAL = os.environ.get("GITHUB_TOKEN_PERSONAL", "").strip()

# Owners routed to the personal token. Anything else uses GITHUB_TOKEN.
_PERSONAL_TOKEN_OWNERS: frozenset[str] = frozenset({"jordankingisalive"})


def _token_for_repo(repo: str) -> str:
    """Return the appropriate PAT for a given owner/repo."""
    owner = repo.split("/", 1)[0]
    if owner in _PERSONAL_TOKEN_OWNERS and GITHUB_TOKEN_PERSONAL:
        return GITHUB_TOKEN_PERSONAL
    return GITHUB_TOKEN

# ---------------------------------------------------------------- helpers


def _get_json(url: str, headers: dict[str, str]) -> tuple[int, dict | list | None]:
    """Return (status, parsed_json_or_None). Never raises for HTTP errors."""
    req = request.Request(url, headers=headers, method="GET")
    try:
        with request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, (json.loads(body) if body else None)
    except error.HTTPError as e:
        return e.code, None
    except (error.URLError, TimeoutError, json.JSONDecodeError) as e:
        print(f"  ! network/parse error for {url}: {e}", file=sys.stderr)
        return 0, None


# ---------------------------------------------------------------- github


def gh_headers(repo: str) -> dict[str, str]:
    h = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "analytics-hub-snapshot",
    }
    token = _token_for_repo(repo)
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def fetch_repo_meta(repo: str) -> dict | None:
    status, data = _get_json(f"https://api.github.com/repos/{repo}", gh_headers(repo))
    if status != 200 or not isinstance(data, dict):
        print(f"  ! meta {repo}: HTTP {status}", file=sys.stderr)
        return None
    return {
        "stars": data.get("stargazers_count"),
        "forks": data.get("forks_count"),
        "watchers": data.get("subscribers_count"),
        "openIssues": data.get("open_issues_count"),
        "pushedAt": data.get("pushed_at"),
        "defaultBranch": data.get("default_branch"),
    }


def fetch_traffic(repo: str) -> tuple[dict, list[tuple[str, int]]]:
    """Fetch all 4 traffic endpoints.

    Returns (data_dict, failures) where failures is a list of
    (endpoint_key, http_status) tuples for any non-200 response. The caller
    decides whether the failures are expected (EXPECTED_FORBIDDEN) or hard
    errors that must abort the run.
    """
    out: dict = {}
    failures: list[tuple[str, int]] = []
    headers = gh_headers(repo)

    for key, path in (
        ("views", "traffic/views"),
        ("clones", "traffic/clones"),
        ("referrers", "traffic/popular/referrers"),
        ("paths", "traffic/popular/paths"),
    ):
        url = f"https://api.github.com/repos/{repo}/{path}"
        status, data = _get_json(url, headers)
        if status == 200 and data is not None:
            out[key] = data
        else:
            failures.append((key, status))
            if status in (403, 404):
                print(f"  - {repo}/{key}: HTTP {status} (no push access — skipping)", file=sys.stderr)
            else:
                print(f"  ! {repo}/{key}: HTTP {status}", file=sys.stderr)
    return out, failures


# ---------------------------------------------------------------- clarity


def fetch_clarity(token: str) -> dict | None:
    """Single Clarity Data Export call: last 3 days (max allowed), no
    dimensions = totals.

    The token is project-scoped — Clarity returns data for whichever
    project generated it. No project ID is sent on the request.

    numOfDays=3 is the maximum supported by the free Clarity Data Export
    API and matches the default 3-day rolling window shown in the Clarity
    dashboard UI. Each daily snapshot therefore covers the trailing 3
    days; consumers should treat the latest snapshot as a 3-day rolling
    summary, not a single-day total.
    """
    if not token:
        return None
    url = (
        "https://www.clarity.ms/export-data/api/v1/project-live-insights"
        "?numOfDays=3"
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "User-Agent": "analytics-hub-snapshot",
    }
    status, data = _get_json(url, headers)
    if status == 200:
        return data
    print(f"  ! clarity: HTTP {status}", file=sys.stderr)
    return None


# ---------------------------------------------------------------- main


def main() -> int:
    now = datetime.now(timezone.utc)
    today_key = now.strftime("%Y-%m-%d")

    # Load existing history (or start fresh).
    if OUTPUT.exists():
        try:
            history = json.loads(OUTPUT.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"! corrupt history file, starting over: {OUTPUT}", file=sys.stderr)
            history = {}
    else:
        history = {}
    history.setdefault("repos", {})
    history.setdefault("sites", {})

    if not GITHUB_TOKEN:
        print("! GITHUB_TOKEN not set — public meta only, no traffic data", file=sys.stderr)
    if not GITHUB_TOKEN_PERSONAL:
        print(
            "! GITHUB_TOKEN_PERSONAL not set — jordankingisalive/* repos "
            "will fall back to GITHUB_TOKEN (likely 403 without it)",
            file=sys.stderr,
        )

    # Per-repo health: maps repo -> list[(endpoint, http_status)] of non-200s.
    repo_failures: dict[str, list[tuple[str, int]]] = {}

    # --- GitHub ---
    for repo in REPOS:
        print(f"github: {repo}")
        entry = history["repos"].setdefault(repo, {})
        # Long-memory daily series, keyed by YYYY-MM-DD. Each run's API
        # response covers up to 14 days; we merge new days in and let
        # newer values overwrite the same date if seen twice.
        daily_views  = entry.setdefault("dailyViews", {})
        daily_clones = entry.setdefault("dailyClones", {})

        meta = fetch_repo_meta(repo)
        if meta:
            entry["meta"] = meta

        traffic, failures = fetch_traffic(repo)
        if failures:
            repo_failures[repo] = failures
        if traffic:
            for bucket in (traffic.get("views",  {}) or {}).get("views",  []):
                day = (bucket.get("timestamp") or "")[:10]
                if day:
                    daily_views[day] = {
                        "count":   bucket.get("count", 0),
                        "uniques": bucket.get("uniques", 0),
                    }
            for bucket in (traffic.get("clones", {}) or {}).get("clones", []):
                day = (bucket.get("timestamp") or "")[:10]
                if day:
                    daily_clones[day] = {
                        "count":   bucket.get("count", 0),
                        "uniques": bucket.get("uniques", 0),
                    }
            # Referrers and paths are snapshot-in-time, not time series.
            # Keep only the latest.
            if "referrers" in traffic:
                entry["referrers"] = traffic["referrers"]
            if "paths" in traffic:
                entry["paths"] = traffic["paths"]
            entry["lastTrafficSync"] = today_key

        # Drop the legacy `snapshots` key if it's still hanging around
        # from the prior data shape.
        entry.pop("snapshots", None)

    # --- Clarity ---
    for label, (project_id, env_var) in CLARITY_SITES.items():
        token = os.environ.get(env_var, "").strip()
        if not token:
            print(f"! {env_var} not set — skipping {label}", file=sys.stderr)
            continue
        print(f"clarity: {label} ({project_id or 'no id'})")
        site = history["sites"].setdefault(
            label, {"projectId": project_id, "snapshots": {}}
        )
        if project_id:
            site["projectId"] = project_id
        data = fetch_clarity(token)
        if data is not None:
            site.setdefault("snapshots", {})[today_key] = data

    history["lastUpdated"] = now.isoformat().replace("+00:00", "Z")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {OUTPUT}")

    # ---------------- health gates (fail the workflow on regressions) ----
    # The script ALWAYS writes the file first so partial progress is
    # preserved, then exits non-zero if any health gate trips. A non-zero
    # exit fails the GitHub Actions run, which sends the repo's default
    # failure notification email.
    hard_errors: list[str] = []

    # Gate 1: any non-200 from a required repo's traffic endpoints.
    # Catches PAT expiry/revocation, GitHub outages, repo renames, and
    # accidental loss of push access. Known-forbidden repos are exempt.
    for repo, fails in repo_failures.items():
        if repo in EXPECTED_FORBIDDEN:
            continue
        codes = ", ".join(f"{k}={s}" for k, s in fails)
        hard_errors.append(f"{repo} traffic API failures: {codes}")

    # Gate 2: lastTrafficSync staleness. If a required repo hasn't had a
    # successful traffic sync within MAX_SYNC_AGE_HOURS, fail — even if
    # today's call ostensibly returned 200. Defends against partial
    # silent failures where the API responds 200 with empty payloads.
    today_date = now.date()
    for repo in REPOS:
        if repo in EXPECTED_FORBIDDEN:
            continue
        sync_str = (history["repos"].get(repo, {}) or {}).get("lastTrafficSync")
        if not sync_str:
            hard_errors.append(f"{repo}: lastTrafficSync missing")
            continue
        try:
            sync_date = datetime.strptime(sync_str, "%Y-%m-%d").date()
        except ValueError:
            hard_errors.append(f"{repo}: lastTrafficSync unparseable ({sync_str!r})")
            continue
        age_hours = (today_date - sync_date).days * 24
        if age_hours > MAX_SYNC_AGE_HOURS:
            hard_errors.append(
                f"{repo}: lastTrafficSync {sync_str} is {age_hours}h old "
                f"(> {MAX_SYNC_AGE_HOURS}h threshold)"
            )

    if hard_errors:
        print("\n" + "=" * 60, file=sys.stderr)
        print("SNAPSHOT HEALTH FAILED — stakeholders depend on this data:", file=sys.stderr)
        for err in hard_errors:
            print(f"  × {err}", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(
            "Common causes: TRAFFIC_PAT expired or revoked; lost push "
            "access on a repo; GitHub API outage. Rotate the PAT in "
            "repo Settings → Secrets → Actions → TRAFFIC_PAT.",
            file=sys.stderr,
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
