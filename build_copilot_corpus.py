"""Build the Copilot widget corpus.

Reads:
  - Every page's visible text in docs/**/*.html (strips scripts/styles/tags)
  - The TOOLS registry inline-defined in docs/find-a-tool/app.js
  - Every sibling repo's README.md (in the parent workspace folder)
  - Every email template body in Analytics-Hub/Email Templates/*.txt

Writes:
  - docs/copilot/corpus.json
        { "version": iso8601, "docs": [ {id, title, url, source, text}, ... ] }

The widget loads corpus.json once on first open, then runs an in-browser
BM25 search to pick the top-k chunks to ground each answer.

Run before commit:
    python build_copilot_corpus.py
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent.resolve()           # .../Analytics-Hub
WORKSPACE = ROOT.parent                          # .../AI Analytics Hub
DOCS = ROOT / "docs"
OUT = DOCS / "copilot" / "corpus.json"

SIBLING_REPOS = [
    "AI-in-One-Dashboard",
    "AI-Solutions-Intelligence-Dashboard",
    "copilot-adoption-sentiment-report",
    "CopilotChatAnalytics",
    "customizecopilot",
    "DecodingSuperUsage",
    "GitHubCopilotImpact",
    "M365UsageAnalytics",
    "pax",
    "superuserimpact",
]

SCRIPT_OR_STYLE = re.compile(r"<(script|style)\b[^>]*>.*?</\1>", re.DOTALL | re.IGNORECASE)
TAG = re.compile(r"<[^>]+>")
WS = re.compile(r"\s+")


def strip_html(html: str) -> str:
    html = SCRIPT_OR_STYLE.sub(" ", html)
    html = TAG.sub(" ", html)
    # Decode the handful of entities we actually use
    html = (html.replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", '"')
                .replace("&#39;", "'"))
    return WS.sub(" ", html).strip()


def title_of(html: str, fallback: str) -> str:
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.DOTALL | re.IGNORECASE)
    if m:
        return WS.sub(" ", m.group(1)).strip()
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.DOTALL | re.IGNORECASE)
    if h1:
        return strip_html(h1.group(1))
    return fallback


def page_url(rel: Path) -> str:
    parts = list(rel.parts)
    if parts[-1] == "index.html":
        parts = parts[:-1]
    base = "https://microsoft.github.io/Analytics-Hub/"
    return base + ("/".join(parts) + "/" if parts else "")


def collect_pages() -> list[dict]:
    docs: list[dict] = []
    for html_path in sorted(DOCS.rglob("*.html")):
        # Skip generated / non-page assets
        rel = html_path.relative_to(DOCS)
        if rel.parts and rel.parts[0] in {"copilot", "demos"}:
            continue
        if html_path.name in {"google3493de09080400a0.html"}:
            continue
        html = html_path.read_text(encoding="utf-8", errors="ignore")
        text = strip_html(html)
        if len(text) < 80:
            continue
        docs.append({
            "id": f"page::{rel.as_posix()}",
            "title": title_of(html, rel.as_posix()),
            "url": page_url(rel),
            "source": "Site page",
            "text": text[:12000],
        })
    return docs


def collect_tool_registry() -> list[dict]:
    """Parse the TOOLS array out of find-a-tool/app.js (regex, not a JS parser)."""
    js = (DOCS / "find-a-tool" / "app.js").read_text(encoding="utf-8")
    # Match each { ... }, between `const TOOLS = [` and the next `];`
    block_m = re.search(r"const TOOLS\s*=\s*\[(.*?)\n\];", js, re.DOTALL)
    if not block_m:
        return []
    body = block_m.group(1)
    # Crude split on `},\n  {` boundaries inside the array
    items = re.split(r"\n  \},\s*\n  \{", body)
    out: list[dict] = []
    for raw in items:
        def grab(key: str) -> str | None:
            m = re.search(
                rf"\b{key}\s*:\s*(['\"`])(.*?)\1",
                raw,
                re.DOTALL,
            )
            return m.group(2) if m else None
        tid = grab("id")
        title = grab("title")
        if not tid or not title:
            continue
        meta_audience = re.search(r"audience:\s*['\"](.*?)['\"]", raw, re.DOTALL)
        meta_license = re.search(r"license:\s*['\"](.*?)['\"]", raw, re.DOTALL)
        meta_time = re.search(r"time:\s*['\"](.*?)['\"]", raw, re.DOTALL)
        parts = [
            f"Tool: {title}",
            f"Use case: {grab('question') or ''}",
            f"Data source: {grab('source') or ''}",
            f"Repository: {grab('repo') or ''}",
            f"Summary: {grab('blurb') or ''}",
            f"Audience: {meta_audience.group(1) if meta_audience else ''}",
            f"License / permissions: {meta_license.group(1) if meta_license else ''}",
            f"Time to set up: {meta_time.group(1) if meta_time else ''}",
        ]
        out.append({
            "id": f"tool::{tid}",
            "title": title,
            "url": grab("repo") or "",
            "source": "Tool catalog",
            "text": "\n".join(p for p in parts if p.split(": ", 1)[1]),
        })
    return out


def collect_readmes() -> list[dict]:
    out: list[dict] = []
    for repo in SIBLING_REPOS:
        readme = WORKSPACE / repo / "README.md"
        if not readme.exists():
            continue
        text = readme.read_text(encoding="utf-8", errors="ignore")
        # Truncate aggressively — keeping the first ~20 KB per README is plenty
        out.append({
            "id": f"readme::{repo}",
            "title": f"{repo} — README",
            "url": f"https://github.com/microsoft/{repo}",
            "source": "Repository README",
            "text": text[:20000],
        })
    # Analytics-Hub itself
    self_readme = WORKSPACE / "Analytics-Hub" / "README.md"
    if self_readme.exists():
        out.append({
            "id": "readme::Analytics-Hub",
            "title": "Analytics-Hub — README",
            "url": "https://github.com/microsoft/Analytics-Hub",
            "source": "Repository README",
            "text": self_readme.read_text(encoding="utf-8", errors="ignore")[:20000],
        })
    return out


def collect_email_templates() -> list[dict]:
    out: list[dict] = []
    email_dir = WORKSPACE / "Email Templates"
    if not email_dir.exists():
        return out
    for txt in sorted(email_dir.glob("*.txt")):
        body = txt.read_text(encoding="utf-8", errors="ignore")
        if len(body) < 80:
            continue
        out.append({
            "id": f"email::{txt.stem}",
            "title": f"Admin email template — {txt.stem}",
            "url": "",
            "source": "Email template",
            "text": body[:8000],
        })
    return out


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    docs: list[dict] = []
    docs += collect_pages()
    docs += collect_tool_registry()
    docs += collect_readmes()
    docs += collect_email_templates()

    payload = {
        "version": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "doc_count": len(docs),
        "docs": docs,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    kb = OUT.stat().st_size / 1024
    print(f"Wrote {OUT.relative_to(ROOT)}  ({len(docs)} docs, {kb:.1f} KB)")
    by_source = {}
    for d in docs:
        by_source[d["source"]] = by_source.get(d["source"], 0) + 1
    for s, n in sorted(by_source.items()):
        print(f"  {n:3d}  {s}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
