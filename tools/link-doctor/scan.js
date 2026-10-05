#!/usr/bin/env node
/* scan.js - Link Doctor: broken-link detection for Analytics-Hub enablement guides.
 *
 * Crawls docs/**-/*.html, extracts every GitHub link (github.com + raw.githubusercontent.com),
 * and validates each one against the LIVE repository tree. Instead of HEAD-checking
 * every URL (slow, rate-limited), it fetches each repo's recursive git tree ONCE per
 * (repo, ref) and resolves all of that repo's links offline against the tree.
 *
 * For every broken link it also proposes a fix: it looks for a tree entry whose final
 * path segment matches the broken basename (the classic "folder was moved/renamed"
 * case) and ranks candidates by how many trailing path segments they share. A unique
 * high-overlap match becomes a high-confidence suggested URL that fix.js can apply.
 *
 * Usage:
 *   node scan.js                 scan docs/, print report, write reports/latest.json
 *   node scan.js --json          machine-readable JSON to stdout only
 *   node scan.js --docs <dir>    override docs directory
 *
 * Env:
 *   GITHUB_TOKEN or TRAFFIC_PAT  optional; raises the GitHub API rate limit.
 *
 * Zero dependencies. Network calls go only to the host allowlist below.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const REPO_ROOT = path.resolve(ROOT, '..', '..');            // Analytics-Hub/
const args = process.argv.slice(2);
const JSON_ONLY = args.includes('--json');
const docsFlagIdx = args.indexOf('--docs');
const DOCS_DIR = docsFlagIdx !== -1 && args[docsFlagIdx + 1]
  ? path.resolve(args[docsFlagIdx + 1])
  : path.join(REPO_ROOT, 'docs');
const REPORT_DIR = path.join(ROOT, 'reports');

const TOKEN = process.env.GITHUB_TOKEN || process.env.TRAFFIC_PAT || '';

/* The scanner may ONLY talk to these hosts (enforced on request + redirects). */
const ALLOWED_HOSTS = ['api.github.com', 'github.com', 'raw.githubusercontent.com'];

/* Link kinds that point at a file/dir path inside the repo tree (resolvable). */
const PATH_KINDS = new Set(['tree', 'blob', 'raw', 'blame', 'edit']);
/* Link kinds that are repo-level features, not tree paths (verify repo only). */
const REPO_KINDS = new Set(['releases', 'issues', 'pull', 'pulls', 'actions',
  'wiki', 'discussions', 'commit', 'commits', 'branches', 'tags', 'graphs',
  'network', 'settings', 'security', 'projects']);

function log(...a) { if (!JSON_ONLY) console.log(...a); }

/* ----------------------------- HTTP helper ------------------------------ */

function httpGet(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch (e) { return reject(new Error('bad url ' + url)); }
    if (!ALLOWED_HOSTS.includes(u.hostname)) {
      return reject(new Error('host not allowed: ' + u.hostname));
    }
    const headers = {
      'User-Agent': 'analytics-hub-link-doctor',
      'Accept': 'application/vnd.github+json',
    };
    if (TOKEN && u.hostname === 'api.github.com') headers['Authorization'] = 'Bearer ' + TOKEN;
    https.get(url, { headers }, (res) => {
      const { statusCode } = res;
      if ([301, 302, 307, 308].includes(statusCode) && res.headers.location && redirects < 5) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(httpGet(next, redirects + 1));
      }
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => resolve({ status: statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

/* ------------------------- GitHub tree cache ---------------------------- */

const repoMeta = new Map();   // "owner/repo" -> { defaultBranch, exists }
const treeCache = new Map();  // "owner/repo@ref" -> { paths:Set, dirs:Set, files:Set, byBase:Map, truncated }

async function getRepoMeta(owner, repo) {
  const key = `${owner}/${repo}`;
  if (repoMeta.has(key)) return repoMeta.get(key);
  let meta = { defaultBranch: 'main', exists: false };
  try {
    const r = await httpGet(`https://api.github.com/repos/${owner}/${repo}`);
    if (r.status === 200) {
      const j = JSON.parse(r.body);
      meta = { defaultBranch: j.default_branch || 'main', exists: true };
    } else if (r.status === 404) {
      meta.exists = false;
    } else if (r.status === 403) {
      meta.exists = true; meta.rateLimited = true;   // assume exists, note limit
    }
  } catch (e) { meta.error = e.message; }
  repoMeta.set(key, meta);
  return meta;
}

async function getTree(owner, repo, ref) {
  const key = `${owner}/${repo}@${ref}`;
  if (treeCache.has(key)) return treeCache.get(key);
  const result = { paths: new Set(), dirs: new Set(), files: new Set(), byBase: new Map(), ok: false, truncated: false };
  try {
    const r = await httpGet(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
    if (r.status === 200) {
      const j = JSON.parse(r.body);
      result.truncated = !!j.truncated;
      for (const e of (j.tree || [])) {
        result.paths.add(e.path);
        if (e.type === 'tree') result.dirs.add(e.path); else result.files.add(e.path);
        const base = e.path.split('/').pop();
        if (!result.byBase.has(base)) result.byBase.set(base, []);
        result.byBase.get(base).push({ path: e.path, type: e.type });
      }
      result.ok = true;
    } else {
      result.status = r.status;
    }
  } catch (e) { result.error = e.message; }
  treeCache.set(key, result);
  return result;
}

/* --------------------------- link extraction ---------------------------- */

const URL_RE = /https?:\/\/(?:github\.com|raw\.githubusercontent\.com)\/[^\s"'<>)\]]+/g;

function trimUrl(raw) {
  // strip trailing punctuation that commonly rides along in prose/markup
  return raw.replace(/[.,;:!?)]+$/, '').replace(/&amp;/g, '&');
}

function parseGitHubUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  const segs = u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (u.hostname === 'raw.githubusercontent.com') {
    // /owner/repo/<ref>/path...   where <ref> may be a branch, a sha, or the
    // explicit refs/heads/<branch> | refs/tags/<tag> form (3 segments).
    if (segs.length < 4) return { owner: segs[0], repo: segs[1], kind: 'repo', raw };
    let ref, rest;
    if (segs[2] === 'refs' && (segs[3] === 'heads' || segs[3] === 'tags') && segs.length >= 5) {
      ref = segs[4];                 // the branch/tag name the tree API expects
      rest = segs.slice(5);
    } else {
      ref = segs[2];
      rest = segs.slice(3);
    }
    return { host: u.hostname, owner: segs[0], repo: segs[1], kind: 'raw', ref, path: rest.join('/'), raw };
  }
  // github.com
  if (segs.length < 2) return null;
  const [owner, repo, kind, ref, ...rest] = segs;
  if (!kind) return { host: u.hostname, owner, repo, kind: 'repo', raw };
  if (PATH_KINDS.has(kind)) {
    return { host: u.hostname, owner, repo, kind, ref: ref || 'HEAD', path: rest.join('/'), raw };
  }
  if (REPO_KINDS.has(kind)) return { host: u.hostname, owner, repo, kind: 'feature', feature: kind, raw };
  // unknown structure -> treat as repo-level
  return { host: u.hostname, owner, repo, kind: 'repo', raw };
}

function listHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.isFile() && /\.html?$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function extractLinks(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const found = [];
  lines.forEach((line, i) => {
    const m = line.match(URL_RE);
    if (!m) return;
    for (const rawUrl of m) {
      const url = trimUrl(rawUrl);
      found.push({ url, line: i + 1 });
    }
  });
  return found;
}

/* ---------------------------- fix suggestion ---------------------------- */

function suffixOverlap(aSegs, bSegs) {
  let n = 0;
  let i = aSegs.length - 1, j = bSegs.length - 1;
  while (i >= 0 && j >= 0 && aSegs[i] === bSegs[j]) { n++; i--; j--; }
  return n;
}

// Strip a leading "N. " ordering prefix from each segment, so a folder that was
// renumbered (e.g. "4. Local CSV" -> "1. Local CSV") still matches by its real name.
function normSeg(s) { return s.replace(/^\d+\.\s*/, ''); }
function normSegs(segs) { return segs.map(normSeg); }

function encodePath(p) { return p.split('/').map(encodeURIComponent).join('/'); }

function buildUrl(link, newPath) {
  if (link.host === 'raw.githubusercontent.com') {
    return `https://raw.githubusercontent.com/${link.owner}/${link.repo}/${link.ref}/${encodePath(newPath)}`;
  }
  return `https://github.com/${link.owner}/${link.repo}/${link.kind}/${link.ref}/${encodePath(newPath)}`;
}

function suggestFix(link, tree) {
  const brokenSegs = link.path.split('/');
  const base = brokenSegs[brokenSegs.length - 1];
  const nBroken = normSegs(brokenSegs);
  const nBrokenFull = nBroken.join('/');
  const wantDir = link.kind === 'tree';
  const pool = tree.byBase.get(base) || [];
  let candidates = pool.filter(c => wantDir ? c.type === 'tree' : c.type === 'blob');
  if (candidates.length === 0 && pool.length) candidates = pool; // type flipped; still offer
  if (candidates.length === 0) return { confidence: 'none', candidates: [] };
  const scored = candidates.map(c => {
    const cSegs = c.path.split('/');
    const nCand = normSegs(cSegs);
    return {
      path: c.path, type: c.type,
      // renumber-exact: same path once ordering prefixes are stripped (strongest signal)
      normExact: nCand.join('/') === nBrokenFull ? 1 : 0,
      normOverlap: suffixOverlap(nBroken, nCand),
      overlap: suffixOverlap(brokenSegs, cSegs),
      depth: cSegs.length,
    };
  }).sort((a, b) =>
    b.normExact - a.normExact ||
    b.normOverlap - a.normOverlap ||
    b.overlap - a.overlap ||
    a.depth - b.depth);
  const best = scored[0];
  const second = scored[1];
  const strictlyBest = !second ||
    best.normExact > second.normExact ||
    best.normOverlap > second.normOverlap ||
    best.overlap > second.overlap;
  let confidence;
  if (best.normExact === 1 && strictlyBest) confidence = 'high';
  else if (strictlyBest && (best.normOverlap >= 1 || best.overlap >= 1)) confidence = 'high';
  else if (best.normOverlap >= 1 || best.overlap >= 1) confidence = 'review';
  else confidence = 'medium';
  return {
    confidence,
    suggestedUrl: buildUrl(link, best.path),
    suggestedPath: best.path,
    candidates: scored.slice(0, 5),
  };
}

/* -------------------------------- main ---------------------------------- */

async function main() {
  const files = listHtmlFiles(DOCS_DIR);
  log(`Link Doctor: scanning ${files.length} HTML files under ${path.relative(REPO_ROOT, DOCS_DIR) || DOCS_DIR}`);

  // 1. collect + dedupe links
  const linkRecords = [];        // {url, file, line, parsed}
  const seenPerFile = new Set(); // dedupe identical url within same file
  for (const file of files) {
    for (const { url, line } of extractLinks(file)) {
      const k = file + '|' + url;
      if (seenPerFile.has(k)) continue;
      seenPerFile.add(k);
      const parsed = parseGitHubUrl(url);
      if (!parsed || !parsed.owner || !parsed.repo) continue;
      linkRecords.push({ url, file: path.relative(REPO_ROOT, file), line, parsed });
    }
  }

  // 2. unique repos + refs to fetch
  const repoRefs = new Set();
  const repos = new Set();
  for (const r of linkRecords) {
    repos.add(`${r.parsed.owner}/${r.parsed.repo}`);
    if (r.parsed.path != null && r.parsed.ref) repoRefs.add(`${r.parsed.owner}/${r.parsed.repo}@${r.parsed.ref}`);
  }
  log(`Found ${linkRecords.length} GitHub links across ${repos.size} repos; fetching ${repoRefs.size} trees...`);

  // 3. prefetch trees (one call per repo@ref). Repo meta is fetched lazily only
  //    for repos that have NO successful tree, to conserve the API rate limit.
  for (const key of repoRefs) {
    const [or, ref] = key.split('@');
    const [owner, repo] = or.split('/');
    await getTree(owner, repo, ref);
  }
  const repoExistsFromTree = (owner, repo) => {
    for (const [k, t] of treeCache) {
      if (k.startsWith(`${owner}/${repo}@`) && t.ok) return true;
    }
    return false;
  };

  // 4. resolve each link
  const broken = [], dead = [], errors = [];
  let okCount = 0;
  for (const rec of linkRecords) {
    const p = rec.parsed;
    const isRepoLevel = (p.kind === 'repo' || p.kind === 'feature') || p.path == null || p.path === '';
    if (isRepoLevel) {
      // confirm repo exists: prefer tree evidence, else lazy meta (1 call, cached)
      if (repoExistsFromTree(p.owner, p.repo)) { okCount++; continue; }
      const meta = await getRepoMeta(p.owner, p.repo);
      if (meta.exists || meta.rateLimited) { okCount++; continue; }
      dead.push({ file: rec.file, line: rec.line, url: rec.url, repo: `${p.owner}/${p.repo}`, reason: 'repo-not-found' });
      continue;
    }
    const tree = treeCache.get(`${p.owner}/${p.repo}@${p.ref}`);
    if (!tree || !tree.ok) {
      // tree missing: repo gone, or just that ref/branch gone
      const meta = await getRepoMeta(p.owner, p.repo);
      if (!meta.exists && !meta.rateLimited) {
        dead.push({ file: rec.file, line: rec.line, url: rec.url, repo: `${p.owner}/${p.repo}`, reason: 'repo-not-found' });
      } else {
        errors.push({ file: rec.file, line: rec.line, url: rec.url, reason: tree ? ('tree-' + (tree.status || tree.error)) : 'no-tree', ref: p.ref });
      }
      continue;
    }
    if (tree.paths.has(p.path)) { okCount++; continue; }
    // broken -> suggest
    const fix = suggestFix(p, tree);
    broken.push({
      file: rec.file, line: rec.line, url: rec.url,
      repo: `${p.owner}/${p.repo}`, kind: p.kind, ref: p.ref, path: p.path,
      ...fix,
    });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    docsDir: path.relative(REPO_ROOT, DOCS_DIR) || 'docs',
    totals: {
      files: files.length,
      links: linkRecords.length,
      repos: repos.size,
      ok: okCount,
      broken: broken.length,
      dead: dead.length,
      errors: errors.length,
    },
    broken: broken.sort((a, b) => (a.file.localeCompare(b.file) || a.line - b.line)),
    dead,
    errors,
    rateLimited: [...repoMeta.entries()].filter(([, m]) => m.rateLimited).map(([k]) => k),
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(path.join(REPORT_DIR, 'latest.json'), JSON.stringify(report, null, 2));

  if (JSON_ONLY) { process.stdout.write(JSON.stringify(report, null, 2) + '\n'); return; }

  // console summary
  log('');
  log(`  OK (resolved):    ${okCount}`);
  log(`  BROKEN:           ${broken.filter(b => b.confidence === 'high').length} high-confidence fix · ${broken.filter(b => b.confidence === 'medium' || b.confidence === 'review').length} review · ${broken.filter(b => b.confidence === 'none').length} no-match`);
  log(`  DEAD repo links:  ${dead.length}`);
  log(`  Scan errors:      ${errors.length}`);
  if (report.rateLimited.length) log(`  Rate-limited repos (set GITHUB_TOKEN): ${report.rateLimited.join(', ')}`);
  if (broken.length) {
    log('\n  Broken links:');
    for (const b of broken) {
      const tag = b.confidence === 'high' ? 'FIX ' : b.confidence === 'none' ? 'DEAD' : 'RVW ';
      log(`   [${tag}] ${b.file}:${b.line}`);
      log(`          ${b.repo} :: ${b.path}`);
      if (b.suggestedPath) log(`          -> ${b.suggestedPath}  (${b.confidence})`);
      else log(`          -> no candidate found`);
    }
  }
  log(`\n  Full report: ${path.relative(REPO_ROOT, path.join(REPORT_DIR, 'latest.json'))}`);
}

main().catch(e => { console.error(e); process.exit(1); });
