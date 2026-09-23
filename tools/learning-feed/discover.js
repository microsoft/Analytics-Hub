#!/usr/bin/env node
/* discover.js - exhaustive page discovery for MS Learn Watcher feeds.
 *
 * For each feed with a "discovery" block, this enumerates the authoritative
 * documentation tree(s) and records EVERY relevant page, so a feed watches a
 * product's whole surface rather than a hand-picked subset. Two sources:
 *
 *   1. Microsoft Learn TOC JSON  - the complete table of contents for a doc
 *      area (e.g. .../viva/insights/toc.json). This is the authoritative list
 *      of every page Microsoft files under that area, including ones added later.
 *   2. Outbound-link crawl (optional) - follows links from seed pages up to a
 *      small depth to catch cross-area pages the TOC doesn't include.
 *
 * Include/exclude regexes scope each feed to the report-relevant pages.
 *
 * Output: feeds/<id>.discovered.json = { generatedAt, pages:[{id,title,url}], stats }
 * The scanner (scan.js) reads registry docs + discovered pages and diffs both.
 * New pages appearing between runs are flagged by scan.js as "new" (triage).
 *
 * Usage:
 *   node discover.js <feedId>        discover one feed
 *   node discover.js --all           discover every feed that has a discovery block
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const FEED_DIR = path.join(ROOT, 'feeds');
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const feedArg = args.find(a => !a.startsWith('--'));

function get(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve) => {
    if (redirects > 5) return resolve({ ok: false, error: 'redir' });
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LearningFeedDiscover/1.0', 'Accept': 'application/json,text/html' },
      timeout: 45000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(get(new URL(res.headers.location, url).toString(), redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return resolve({ ok: false, error: 'HTTP ' + res.statusCode }); }
      let body = ''; res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => resolve({ ok: true, body: body }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.on('error', e => resolve({ ok: false, error: e.message }));
  });
}

function loadJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function norm(u) { try { return new URL(u).toString().split('#')[0].split('?')[0].replace(/\/$/, ''); } catch (e) { return null; } }
function slugId(url) {
  return url.replace(/^https?:\/\/[^/]+\/en-us\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 80);
}
function titleFromUrl(url) {
  const seg = url.split('/').filter(Boolean).pop() || url;
  return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* Walk a Microsoft Learn TOC JSON, resolving every relative href against base. */
function tocPages(toc, base) {
  const out = new Set();
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    const kids = node.children || node.items;
    if (typeof node.href === 'string' && !/^https?:|^#|^mailto:/.test(node.href)) {
      const abs = norm(new URL(node.href, base).toString());
      if (abs) out.add(abs);
    } else if (typeof node.href === 'string' && /^https?:/.test(node.href)) {
      const abs = norm(node.href);
      if (abs) out.add(abs);
    }
    if (Array.isArray(kids)) kids.forEach(walk);
  }
  (toc.items || []).forEach(walk);
  return out;
}

/* Extract in-scope outbound doc links from an HTML page. */
function pageLinks(html, base) {
  const out = new Set();
  const re = /href="([^"]+)"/gi; let m;
  while ((m = re.exec(html)) !== null) {
    let h = m[1];
    if (h.startsWith('#') || h.startsWith('mailto:') || h.startsWith('javascript:')) continue;
    let abs; try { abs = new URL(h, base).toString(); } catch (e) { continue; }
    abs = norm(abs);
    if (abs) out.add(abs);
  }
  return out;
}

function matchFilters(url, inc, exc, topic) {
  // Global host allowlist: only official Microsoft Learn and GitHub docs.
  if (!/^https:\/\/(learn\.microsoft\.com|docs\.github\.com)\//i.test(url)) return false;
  if (exc && exc.some(rx => new RegExp(rx, 'i').test(url))) return false;
  if (inc && inc.length && !inc.some(rx => new RegExp(rx, 'i').test(url))) return false;
  if (topic && topic.length && !topic.some(rx => new RegExp(rx, 'i').test(url))) return false;
  return true;
}

async function discoverFeed(feed) {
  const d = feed.discovery;
  if (!d) { console.log('  [' + feed.id + '] no discovery block, skipping'); return null; }
  const inc = d.include || [];
  const exc = d.exclude || [];
  const topic = d.includeExact || null;
  const found = new Set();

  // 1. TOC sources
  for (const tocUrl of (d.tocs || [])) {
    process.stdout.write('  [' + feed.id + '] TOC ' + tocUrl.replace('https://learn.microsoft.com', '') + ' ... ');
    const r = await get(tocUrl);
    if (!r.ok) { console.log('FAILED (' + r.error + ')'); continue; }
    let toc; try { toc = JSON.parse(r.body); } catch (e) { console.log('parse fail'); continue; }
    const base = tocUrl.replace(/toc\.json$/, '');
    let n = 0;
    tocPages(toc, base).forEach(u => { if (matchFilters(u, inc, exc, topic)) { found.add(u); n++; } });
    console.log('ok (' + n + ' in-scope pages)');
  }

  // 2. Optional shallow link crawl from seeds (depth 1)
  if (d.crawlSeeds && d.crawlSeeds.length) {
    for (const seed of d.crawlSeeds) {
      process.stdout.write('  [' + feed.id + '] crawl ' + seed.replace(/^https?:\/\/[^/]+/, '') + ' ... ');
      const r = await get(seed);
      if (!r.ok) { console.log('FAILED (' + r.error + ')'); continue; }
      let n = 0;
      pageLinks(r.body, seed).forEach(u => { if (matchFilters(u, inc, exc, topic)) { if (!found.has(u)) n++; found.add(u); } });
      console.log('ok (+' + n + ' new)');
    }
  }

  const pages = Array.from(found).sort().map(u => ({ id: slugId(u), title: titleFromUrl(u), url: u }));
  const outPath = path.join(FEED_DIR, feed.id + '.discovered.json');
  const prev = loadJson(outPath, { pages: [] });
  const prevUrls = new Set((prev.pages || []).map(p => p.url));
  const newUrls = pages.filter(p => !prevUrls.has(p.url)).map(p => p.url);
  fs.writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    feed: feed.id,
    stats: { total: pages.length, newSincePrev: newUrls.length },
    newPages: newUrls,
    pages: pages
  }, null, 2));
  console.log('  [' + feed.id + '] => ' + pages.length + ' pages (' + newUrls.length + ' new since last discovery)');
  return { feed: feed.id, total: pages.length, newCount: newUrls.length };
}

async function main() {
  let ids;
  if (ALL) ids = fs.readdirSync(FEED_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.discovered.json')).map(f => f.replace('.json', ''));
  else if (feedArg) ids = [feedArg];
  else { console.error('Usage: node discover.js <feedId>|--all'); process.exit(1); }

  const results = [];
  for (const id of ids) {
    const feed = loadJson(path.join(FEED_DIR, id + '.json'), null);
    if (!feed) { console.error('feed not found: ' + id); continue; }
    const res = await discoverFeed(feed);
    if (res) results.push(res);
  }
  console.log('\n' + '-'.repeat(60));
  results.forEach(r => console.log(r.feed + ': ' + r.total + ' pages (' + r.newCount + ' new)'));
}

main().catch(e => { console.error(e); process.exit(1); });
