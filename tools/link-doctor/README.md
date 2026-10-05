# Link Doctor

Automated broken-link detection and repair for the Analytics Hub enablement guides.

## Why

The hub (`docs/`) hardcodes **hundreds** of `github.com/microsoft/<repo>` links into the
enablement guides. When a teammate restructures one of our ~30 report repos (renames,
renumbers, or moves a folder) those links 404 silently. Nobody tells us; a customer finds
the dead link first. Link Doctor watches for that and fixes it.

## How it works

`scan.js` crawls every `docs/**/*.html`, extracts every GitHub link, and validates each
one against the **live repository tree**. Rather than HEAD-checking hundreds of URLs
(slow, rate-limited), it pulls each repo's recursive git tree **once** and resolves all of
that repo's links offline against it.

For every broken link it proposes a fix: it finds tree entries whose final path segment
matches the broken one and ranks them by how many trailing path segments they share. It is
**renumber-aware** - it strips leading `N. ` ordering prefixes, so a folder that moved from
`3. Fabric` to `1. Fabric`, or `2. SharePoint` to `3. SharePoint`, still matches its real
target. A unique renumber-exact or clearly-best match is marked `high` confidence; ties are
marked `review` for a human.

`fix.js` applies the `high`-confidence suggestions to the exact source file - rewriting the
`href` and any visible path text - **dry-run by default**, idempotent.

## Usage

```bash
# detect (writes reports/latest.json)
node tools/link-doctor/scan.js
node tools/link-doctor/scan.js --json        # machine-readable to stdout

# repair
node tools/link-doctor/fix.js                # dry-run: show planned edits
node tools/link-doctor/fix.js --write        # apply high-confidence fixes
node tools/link-doctor/fix.js --write --all  # also apply review/medium (human review first)
```

### Rate limit / token

The GitHub API allows 60 unauthenticated calls/hour; a full scan uses ~1 call per repo
(~25-30). For the daily automation, set a token so it never starves:

```bash
# PowerShell
$env:GITHUB_TOKEN = "<pat with public repo read>"; node tools/link-doctor/scan.js
```

`GITHUB_TOKEN` or `TRAFFIC_PAT` are both read. A read-only (public repo metadata) PAT is
enough; the same class of token the traffic pipeline already rotates.

## Output

`reports/latest.json`:

```jsonc
{
  "totals": { "links": 302, "ok": 275, "broken": 14, "dead": 3, "errors": 0 },
  "broken": [
    {
      "file": "docs/choose-report/index.html", "line": 4952,
      "repo": "microsoft/ValueLens-for-Microsoft-Copilot",
      "path": "1. Local CSV/ValueLens - Local CSV.pbit",
      "confidence": "high",
      "suggestedPath": "4. Local CSV/ValueLens - Local CSV.pbit",
      "suggestedUrl": "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot/blob/main/4.%20Local%20CSV/ValueLens%20-%20Local%20CSV.pbit"
    }
  ],
  "dead":  [ /* repo or file genuinely gone - needs a human */ ],
  "errors":[ /* tree/ref could not be read */ ]
}
```

- **broken + high**  -> auto-fixable (folder moved/renamed); `fix.js --write` handles these.
- **broken + review** -> multiple plausible targets; a human picks.
- **dead**           -> repo or file is genuinely gone (e.g. a release asset removed); needs a decision.

## Daily automation

A Scout automation runs `scan.js` each morning. High-confidence fixes are applied by
`fix.js --write`; anything in `review`/`dead` is summarized to Jordan via Teams. See the
automation definition in Scout (name: "Link Doctor - enablement link check").
