#!/usr/bin/env node
/* backfill-wayback.js - recover verbatim "before" text from the Internet Archive.
 *
 * For every watched page that Microsoft updated on or after the feed's
 * windowStart (default 2026-07-01), this queries the public Wayback Machine
 * (Internet Archive) CDX API for the last capture BEFORE the window start,
 * fetches that archived copy, and records its normalised text so the feed can
 * show a real before/after instead of a metadata-only description.
 *
 * Output: feeds/<id>.wayback.json = { generatedAt, pages: { <pageId>: {
 *   archivedDate, archivedUrl, beforeText } } }
 * build.js reads this and renders the archived "before" wording where present.
 *
 * The Internet Archive rate-limits and is periodically offline. This tool is
 * best-effort: "no capture" / "archive offline" is normal, never fatal, and it
 * NEVER invents text. Re-run it and it fills in whatever is now available.
 *
 * Usage:
 *   node backfill-wayback.js <feedId>     one feed
 *   node backfill-wayback.js --all        every doc feed (skips roadmap)
 *   node backfill-wayback.js --check      just report whether the Archive is up
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const FEED_DIR = path.join(ROOT, 'feeds');
const SNAP_DIR = path.join(ROOT, 'snapshots');
const args = process.argv.slice(2);
const ALL = args.includes('--all');
const CHECK = args.includes('--check');
const feedArg = args.find(a => !a.startsWith('--'));

function get(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve) => {
    if (redirects > 6) return resolve({ ok: false, error: 'redir' });
    let host; try { host = new URL(url).hostname.toLowerCase(); } catch (e) { return resolve({ ok: false, error: 'bad url' }); }
    // Only the Internet Archive and the original doc hosts are ever contacted.
    if (!/(^|\.)web\.archive\.org$|(^|\.)archive\.org$|(^|\.)learn\.microsoft\.com$|(^|\.)docs\.github\.com$/.test(host)) {
      return resolve({ ok: false, error: 'blocked host' });
    }
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 LearningFeedWaybackBackfill/1.0', 'Accept': 'text/html,application/json' }, timeout: 45000 }, (res) => {
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

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'").replace(/&mdash;|&#8212;/g, '-')
    .replace(/\s+/g, ' ').trim();
}
function loadJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }

async function archiveUp() {
  // Probe the CDX endpoint itself (not just the availability API), because the
  // Archive is sometimes partially up: the availability API responds while CDX
  // and capture-serving return 503. We only consider it usable when CDX returns
  // parseable rows, since that is what the backfill actually depends on.
  const r = await get('https://web.archive.org/cdx/search/cdx?url=learn.microsoft.com&limit=1&output=json&filter=statuscode:200');
  if (!r.ok) return false;
  try { const j = JSON.parse(r.body); return Array.isArray(j); } catch (e) { return false; }
}

// Find the last capture strictly before <yyyymmdd> via the CDX API.
async function lastCaptureBefore(pageUrl, beforeYmd) {
  const bare = pageUrl.replace(/^https?:\/\//, '');
  const cdx = 'https://web.archive.org/cdx/search/cdx?url=' + encodeURIComponent(bare) +
    '&fl=timestamp,statuscode,digest&filter=statuscode:200&to=' + beforeYmd + '&collapse=digest&limit=-8&output=json';
  const r = await get(cdx);
  if (!r.ok) return { err: r.error };
  let rows; try { rows = JSON.parse(r.body); } catch (e) { return { err: 'cdx parse' }; }
  if (!Array.isArray(rows) || rows.length < 2) return { err: 'no capture' };
  const data = rows.slice(1); // drop header row
  const last = data[data.length - 1];
  return { ts: last[0] };
}

async function backfillFeed(feed) {
  const winStart = (feed.windowStart || '2026-07-01').replace(/-/g, ''); // yyyymmdd
  const snap = loadJson(path.join(SNAP_DIR, feed.id + '-latest.json'), null);
  if (!snap || !snap.pages) { console.log('  [' + feed.id + '] no snapshot, skip'); return null; }
  const outPath = path.join(FEED_DIR, feed.id + '.wayback.json');
  const out = loadJson(outPath, { generatedAt: null, pages: {} });
  const inWindow = snap.pages.filter(p => p.ok && p.inWindow);
  let filled = 0, missing = 0;
  for (const p of inWindow) {
    if (out.pages[p.id] && out.pages[p.id].beforeText) continue; // already have it
    process.stdout.write('  [' + feed.id + '] ' + p.id + ' ... ');
    const cap = await lastCaptureBefore(p.url, winStart);
    if (cap.err) { console.log(cap.err); missing++; continue; }
    const archUrl = 'https://web.archive.org/web/' + cap.ts + 'id_/' + p.url;
    const r = await get(archUrl);
    if (!r.ok) { console.log('fetch ' + r.error); missing++; continue; }
    const text = stripTags(r.body);
    out.pages[p.id] = {
      archivedDate: cap.ts.slice(0, 4) + '-' + cap.ts.slice(4, 6) + '-' + cap.ts.slice(6, 8),
      archivedUrl: 'https://web.archive.org/web/' + cap.ts + '/' + p.url,
      beforeText: text.slice(0, 20000)
    };
    console.log('ok (archived ' + out.pages[p.id].archivedDate + ', ' + text.length + ' chars)');
    filled++;
  }
  out.generatedAt = new Date().toISOString();
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('  [' + feed.id + '] filled ' + filled + ', still missing ' + missing + ' of ' + inWindow.length + ' in-window pages');
  return { feed: feed.id, filled, missing, inWindow: inWindow.length };
}

async function main() {
  if (CHECK) {
    const up = await archiveUp();
    console.log('Internet Archive (Wayback) is ' + (up ? 'ONLINE' : 'OFFLINE/unavailable'));
    process.exit(up ? 0 : 2);
  }
  const up = await archiveUp();
  if (!up) { console.log('Internet Archive is offline right now \u2014 nothing to backfill. Re-run when it recovers.'); process.exit(2); }

  let ids;
  if (ALL) ids = fs.readdirSync(FEED_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.discovered.json') && !f.endsWith('.wayback.json')).map(f => f.replace('.json', ''));
  else if (feedArg) ids = [feedArg];
  else { console.error('Usage: node backfill-wayback.js <feedId>|--all|--check'); process.exit(1); }

  const results = [];
  for (const id of ids) {
    const feed = loadJson(path.join(FEED_DIR, id + '.json'), null);
    if (!feed || feed.mode === 'roadmap') continue; // roadmap has no before/after pages
    const res = await backfillFeed(feed);
    if (res) results.push(res);
  }
  console.log('\n' + '-'.repeat(60));
  results.forEach(r => console.log(r.feed + ': +' + r.filled + ' filled, ' + r.missing + ' still missing (' + r.inWindow + ' in-window)'));
}

main().catch(e => { console.error(e); process.exit(1); });
