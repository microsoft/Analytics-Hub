#!/usr/bin/env node
/* scan.js - MS Learn Watcher multi-feed documentation scanner.
 *
 * Generalizes the Cowork Document Monitor's scanner to any number of feeds.
 * Each feed is a registry in ./feeds/<id>.json. For HTML feeds it fetches every
 * tracked page and records ms.date, git_commit_id, word_count, a body hash,
 * section headings and outbound links, then diffs against the previous run.
 * For the roadmap feed it reads the public Microsoft 365 Roadmap JSON API and
 * tracks each Copilot item's published status.
 *
 * Pages whose Microsoft-published "last updated" date (ms.date) falls on or
 * after the feed's windowStart are flagged inWindow -- this is the factual
 * "changed since <windowStart>" signal, taken from Microsoft's own metadata.
 *
 * Usage:
 *   node scan.js <feedId> [--baseline]   scan one feed
 *   node scan.js --all [--baseline]      scan every feed in ./feeds
 *
 * No dependencies. The only network calls are plain GETs to public pages.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const ROOT = __dirname;
const FEED_DIR = path.join(ROOT, 'feeds');
const SNAP_DIR = path.join(ROOT, 'snapshots');
const REPORT_DIR = path.join(ROOT, 'reports');

const args = process.argv.slice(2);
const BASELINE = args.includes('--baseline');
const ALL = args.includes('--all');
const feedArg = args.find(a => !a.startsWith('--'));

/* Host allowlist: the scanner may ONLY fetch from these official public
   sources. Enforced on every request AND on every redirect target, so a
   mistyped registry URL or a redirect to an off-domain host can never cause
   the tool to fetch (or publish) anything other than public documentation. */
const ALLOWED_HOSTS = [
  'learn.microsoft.com',
  'docs.github.com',
  'www.microsoft.com',            // M365 public Roadmap API (releasecommunications)
  'api.github.com',               // public FOCUS_Spec releases API
  'raw.githubusercontent.com'     // public merill/mc Message Center Archive (MIT)
];
function hostAllowed(url) {
  let h; try { h = new URL(url).hostname.toLowerCase(); } catch (e) { return false; }
  return ALLOWED_HOSTS.includes(h);
}

function get(url, redirects) {
  redirects = redirects || 0;
  return new Promise((resolve) => {
    if (redirects > 5) return resolve({ ok: false, error: 'too many redirects' });
    if (!hostAllowed(url)) return resolve({ ok: false, error: 'blocked host (not on allowlist): ' + url });
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LearningFeedWatch/1.0', 'Accept': 'text/html,application/xhtml+xml,application/json' },
      timeout: 45000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        if (!hostAllowed(next)) return resolve({ ok: false, error: 'blocked redirect to off-allowlist host' });
        return resolve(get(next, redirects + 1));
      }
      if (res.statusCode !== 200) { res.resume(); return resolve({ ok: false, error: 'HTTP ' + res.statusCode }); }
      let body = ''; res.setEncoding('utf8');
      res.on('data', c => body += c);
      res.on('end', () => resolve({ ok: true, body: body, finalUrl: url }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.on('error', e => resolve({ ok: false, error: e.message }));
  });
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&rsquo;|&#8217;/g, "'").replace(/&mdash;|&#8212;/g, '-')
    .replace(/\s+/g, ' ').trim();
}

function meta(html, name) {
  let m = html.match(new RegExp('<meta[^>]+name="' + name + '"[^>]+content="([^"]*)"', 'i'));
  if (m) return m[1];
  m = html.match(new RegExp('^' + name + ':\\s*(.+)$', 'im'));
  return m ? m[1].trim() : null;
}

function sections(html) {
  const out = []; const seen = {};
  const push = (s) => {
    const t = String(s).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();
    if (!t || t.length > 160) return;
    if (/^(in this article|feedback|additional resources|next steps|prerequisites)$/i.test(t)) return;
    if (seen[t]) return; seen[t] = 1; out.push(t);
  };
  let m;
  const tag = /<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  while ((m = tag.exec(html)) !== null) push(m[2]);
  const md = /^#{2,3}\s+(.+)$/gm;
  while ((m = md.exec(html)) !== null) push(m[1]);
  return out;
}

function extractLinks(html, baseUrl, host) {
  const out = new Set(); const re = /href="([^"]+)"/gi; let m;
  while ((m = re.exec(html)) !== null) {
    let href = m[1];
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) continue;
    let abs; try { abs = new URL(href, baseUrl).toString(); } catch (e) { continue; }
    if (host && abs.indexOf(host) < 0) continue;
    abs = abs.split('#')[0].split('?')[0].replace(/\/$/, '');
    if (/\.(png|jpe?g|gif|svg|webp|mp4|zip|pdf|xlsx?|docx?|pptx?)$/i.test(abs)) continue;
    if (/\/media\//i.test(abs)) continue;
    out.add(abs);
  }
  return Array.from(out);
}

function sha(s) { return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16); }
function loadJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function ensure(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

async function scanHtmlFeed(feed) {
  const latestPath = path.join(SNAP_DIR, feed.id + '-latest.json');
  const prev = loadJson(latestPath, null);
  const prevById = {};
  if (prev && prev.pages) prev.pages.forEach(p => { prevById[p.id] = p; });
  const winStart = feed.windowStart || '2026-07-01';

  // Merge curated registry docs with auto-discovered pages (deduped by URL).
  // Curated docs keep their tier/why; discovered pages are tier 3 with a
  // generic note. This makes the feed watch a product's whole surface, not
  // just the hand-picked subset.
  const discovered = loadJson(path.join(FEED_DIR, feed.id + '.discovered.json'), { pages: [], newPages: [] });
  const newUrlSet = new Set(discovered.newPages || []);
  const byUrl = {};
  const norm = u => u.replace(/\/$/, '');
  (feed.docs || []).forEach(d => { byUrl[norm(d.url)] = { id: d.id, tier: d.tier, title: d.title, url: d.url, why: d.why }; });
  (discovered.pages || []).forEach(p => {
    const key = norm(p.url);
    if (!byUrl[key]) byUrl[key] = { id: p.id, tier: 3, title: p.title, url: p.url, why: 'Auto-discovered from the documentation tree for this product area.', discovered: true, isNew: newUrlSet.has(norm(p.url)) };
  });
  const docList = Object.values(byUrl);

  const pages = [];
  for (const doc of docList) {
    process.stdout.write('  [' + feed.id + '] ' + doc.id + ' ... ');
    const r = await get(doc.url);
    if (!r.ok) {
      console.log('FAILED (' + r.error + ')');
      // Carry-forward: preserve the last known-good snapshot for this page so a
      // transient fetch failure does not erase its baseline (which would hide a
      // real change when the page recovers). The record is marked stale so the
      // report/page can surface that it was not re-verified today.
      const prevRec = prevById[doc.id];
      if (prevRec && prevRec.ok) {
        pages.push(Object.assign({}, prevRec, { staleSince: (prevRec.staleSince || (prev && prev.runAt) || null), fetchFailed: true, lastError: r.error, inWindow: prevRec.inWindow }));
      } else {
        pages.push({ id: doc.id, tier: doc.tier, title: doc.title, url: doc.url, why: doc.why, discovered: !!doc.discovered, ok: false, error: r.error });
      }
      continue;
    }
    const text = stripTags(r.body);
    const msDate = meta(r.body, 'ms.date') || meta(r.body, 'updated_at');
    const rec = {
      id: doc.id, tier: doc.tier, title: doc.title, url: doc.url, why: doc.why, ok: true,
      discovered: !!doc.discovered, isNew: !!doc.isNew,
      msDate: msDate,
      gitCommit: meta(r.body, 'git_commit_id'),
      wordCount: meta(r.body, 'word_count'),
      bodyHash: sha(text), bodyLen: text.length,
      sections: sections(r.body),
      inWindow: msDate ? (msDate.slice(0, 10) >= winStart) : null
    };
    pages.push(rec);
    console.log('ok (ms.date ' + (rec.msDate ? rec.msDate.slice(0, 10) : '?') + ', ' + (rec.wordCount || '?') + ' words' + (rec.inWindow ? ', IN-WINDOW' : '') + (rec.isNew ? ', NEW PAGE' : '') + ')');
  }

  // Newly discovered pages are a first-class signal: a page that did not exist
  // (or was not referenced) before now appears in the product's doc tree.
  // Suppressed on baseline runs (on first discovery every page looks "new").
  const changes = [];
  if (prev && !BASELINE) {
    pages.filter(p => p.isNew).forEach(p => changes.push({ sev: 'critical', id: p.id, title: p.title, url: p.url, detail: 'NEW PAGE discovered in the documentation tree \u2014 triage into the curated watch list.' }));
  }
  if (prev && !BASELINE) {
    for (const p of pages) {
      const b = prevById[p.id];
      if (p.isNew) continue; // already reported above as NEW PAGE
      if (!b) { changes.push({ sev: 'new', id: p.id, title: p.title, detail: 'Newly added to the watch list.' }); continue; }
      if (!p.ok) { changes.push({ sev: 'warn', id: p.id, title: p.title, detail: 'Fetch failed: ' + p.error }); continue; }
      if (!b.ok) { changes.push({ sev: 'info', id: p.id, title: p.title, detail: 'Fetch recovered.' }); continue; }
      if (p.msDate !== b.msDate) changes.push({ sev: 'major', id: p.id, title: p.title, url: p.url, detail: 'ms.date changed: ' + b.msDate + ' -> ' + p.msDate });
      if (p.gitCommit !== b.gitCommit) changes.push({ sev: 'major', id: p.id, title: p.title, url: p.url, detail: 'git commit changed: ' + String(b.gitCommit).slice(0, 8) + ' -> ' + String(p.gitCommit).slice(0, 8) });
      if (p.bodyHash !== b.bodyHash) {
        const dl = p.bodyLen - b.bodyLen; const silent = (p.msDate === b.msDate);
        changes.push({ sev: silent ? 'critical' : 'major', id: p.id, title: p.title, url: p.url, detail: 'Body changed (' + (dl >= 0 ? '+' : '') + dl + ' chars)' + (silent ? ' ** DATE UNCHANGED **' : '') });
      }
      const added = p.sections.filter(s => (b.sections || []).indexOf(s) < 0);
      const gone = (b.sections || []).filter(s => p.sections.indexOf(s) < 0);
      added.forEach(s => changes.push({ sev: 'critical', id: p.id, title: p.title, url: p.url, detail: 'SECTION ADDED: "' + s + '"' }));
      gone.forEach(s => changes.push({ sev: 'critical', id: p.id, title: p.title, url: p.url, detail: 'SECTION REMOVED: "' + s + '"' }));
    }
  }

  // Optional: track releases of a versioned spec via the GitHub Releases API.
  let releases = null;
  if (feed.releasesSource) {
    process.stdout.write('  [' + feed.id + '] releases ' + feed.releasesSource.repo + ' ... ');
    const rr = await get('https://api.github.com/repos/' + feed.releasesSource.repo + '/releases?per_page=10');
    if (rr.ok) {
      try {
        releases = JSON.parse(rr.body).filter(x => !x.draft).map(x => ({
          tag: x.tag_name, name: x.name || x.tag_name,
          published: (x.published_at || '').slice(0, 10),
          url: x.html_url, prerelease: !!x.prerelease
        }));
        console.log('ok (' + releases.length + ' releases, latest ' + (releases[0] ? releases[0].tag : '?') + ')');
        if (prev && prev.releases && !BASELINE) {
          const prevTags = new Set(prev.releases.map(r => r.tag));
          releases.forEach(r => { if (!prevTags.has(r.tag)) changes.push({ sev: 'critical', id: 'release', title: feed.releasesSource.label || 'Specification release', url: r.url, detail: 'NEW RELEASE: ' + r.tag + (r.name && r.name !== r.tag ? ' (' + r.name + ')' : '') + ' published ' + r.published }); });
        }
      } catch (e) { console.log('parse fail'); }
    } else { console.log('FAILED (' + rr.error + ')'); }
  }

  return persist(feed, pages, changes, releases);
}

async function scanRoadmapFeed(feed) {
  const latestPath = path.join(SNAP_DIR, feed.id + '-latest.json');
  const prev = loadJson(latestPath, null);
  const prevById = {};
  if (prev && prev.items) prev.items.forEach(i => { prevById[i.id] = i; });

  process.stdout.write('  [roadmap] fetching M365 Roadmap API ... ');
  const r = await get(feed.source);
  if (!r.ok) { console.log('FAILED (' + r.error + ')'); return { feed: feed.id, ok: false, error: r.error, changes: [] }; }
  let all; try { all = JSON.parse(r.body); } catch (e) { console.log('parse fail'); return { feed: feed.id, ok: false, error: 'json parse', changes: [] }; }
  const match = (feed.match || ['copilot']).map(s => s.toLowerCase());
  const items = all.filter(x => {
    const hay = ((x.title || '') + ' ' + (x.description || '')).toLowerCase();
    return match.some(m => hay.includes(m));
  }).map(x => ({
    id: String(x.id), title: x.title || '', status: x.status || '', description: x.description || '',
    created: x.created || '', modified: x.modified || '',
    tags: (x.tags || []).map(t => t.tagName || t).filter(Boolean),
    descHash: sha(stripTags(x.description || ''))
  }));
  console.log('ok (' + items.length + ' Copilot items of ' + all.length + ' total)');

  const changes = [];
  if (prev && !BASELINE) {
    for (const it of items) {
      const b = prevById[it.id];
      if (!b) { changes.push({ sev: 'new', id: it.id, title: it.title, detail: 'New roadmap item (status: ' + it.status + ')' }); continue; }
      if (it.status !== b.status) changes.push({ sev: 'major', id: it.id, title: it.title, detail: 'Status: ' + b.status + ' -> ' + it.status });
      else if (it.descHash !== b.descHash) changes.push({ sev: 'info', id: it.id, title: it.title, detail: 'Description updated' });
    }
  }

  ensure(SNAP_DIR); ensure(REPORT_DIR);
  const runAt = new Date().toISOString(); const stamp = runAt.slice(0, 10);
  const snap = { runAt, feed: feed.id, items };
  fs.writeFileSync(path.join(SNAP_DIR, feed.id + '-snapshot-' + stamp + '.json'), JSON.stringify(snap, null, 2));
  fs.writeFileSync(latestPath, JSON.stringify(snap, null, 2));
  writeReport(feed, stamp, runAt, changes, items.length + ' Copilot roadmap items tracked.');
  return { feed: feed.id, ok: true, changes };
}

/* Message Center feed. Reads the public, MIT-licensed merill/mc archive
   (metadata only: Id, Title, Services, dates, Category, IsMajorChange), filters
   to the feed's Copilot cost/Cowork match set and window, and snapshots each
   post as an item. Bodies are NOT fetched or re-hosted — each item links out to
   its Message center post on the public mirror. Security/incident advisories
   (excludeCategories) are dropped. Item shape mirrors the roadmap feed so the
   status-manifest delta logic and renderer can be reused. */
async function scanMessageCenterFeed(feed) {
  const latestPath = path.join(SNAP_DIR, feed.id + '-latest.json');
  const prev = loadJson(latestPath, null);
  const prevById = {};
  if (prev && prev.items) prev.items.forEach(i => { prevById[i.id] = i; });

  process.stdout.write('  [messagecenter] fetching merill/mc archive ... ');
  const r = await get(feed.source);
  if (!r.ok) { console.log('FAILED (' + r.error + ')'); return { feed: feed.id, ok: false, error: r.error, changes: [] }; }
  let all; try { all = JSON.parse(r.body); } catch (e) { console.log('parse fail'); return { feed: feed.id, ok: false, error: 'json parse', changes: [] }; }

  const match = (feed.match || []).map(s => s.toLowerCase());
  const billingMatch = (feed.billingMatch || []).map(s => s.toLowerCase());
  const matchServices = (feed.matchServices || []);
  const excludeCats = (feed.excludeCategories || []).map(s => s.toLowerCase());
  const win = feed.windowStart || '2026-01-01';
  const urlBase = feed.messageUrlBase || 'https://mc.merill.net/message/';

  const catLabel = { planforchange: 'Plan for change', stayinformed: 'Stay informed', preventorfixissues: 'Prevent or fix issues' };
  const items = all.filter(x => {
    // The index carries both Message center and Roadmap rows; keep MC only.
    if (x.Source && x.Source !== 'messageCenter') return false;
    const cat = String(x.Category || '').toLowerCase();
    if (excludeCats.includes(cat)) return false;
    const modified = (x.LastModifiedDateTime || x.StartDateTime || '').slice(0, 10);
    if (modified && modified < win) return false;
    const svc = Array.isArray(x.Services) ? x.Services : [];
    const title = (x.Title || '').toLowerCase();
    const hay = (title + ' ' + svc.join(' ')).toLowerCase();
    // (a) a Copilot-specific term anywhere, OR (b) a Copilot/Viva service paired
    // with a billing term in the title. Keeps the feed on the Copilot FinOps
    // surface and drops generic pay-as-you-go/consumption posts for other products.
    const copilotHit = match.some(m => hay.includes(m));
    const billingServiceHit = svc.some(s => matchServices.includes(s)) && billingMatch.some(m => title.includes(m));
    return copilotHit || billingServiceHit;
  }).map(x => {
    const cat = String(x.Category || '').toLowerCase();
    return {
      id: String(x.Id),
      title: x.Title || '',
      status: catLabel[cat] || (x.Category || ''),
      category: x.Category || '',
      services: Array.isArray(x.Services) ? x.Services : [],
      isMajor: !!x.IsMajorChange,
      created: x.StartDateTime || '',
      modified: x.LastModifiedDateTime || x.StartDateTime || '',
      url: x.Url || (urlBase + String(x.Id)),
      descHash: sha((x.Title || '') + '|' + (x.Category || '') + '|' + (x.IsMajorChange ? '1' : '0'))
    };
  }).sort((a, b) => (b.modified || '').localeCompare(a.modified || ''));
  console.log('ok (' + items.length + ' Copilot cost/Cowork posts of ' + all.length + ' archived)');

  const changes = [];
  if (prev && !BASELINE) {
    for (const it of items) {
      const b = prevById[it.id];
      if (!b) { changes.push({ sev: 'new', id: it.id, title: it.title, url: it.url, detail: 'New Message center post (' + it.status + ')' }); continue; }
      if (it.status !== b.status) changes.push({ sev: 'major', id: it.id, title: it.title, url: it.url, detail: 'Category: ' + b.status + ' -> ' + it.status });
      else if (it.descHash !== b.descHash) changes.push({ sev: 'info', id: it.id, title: it.title, url: it.url, detail: 'Post updated' });
    }
  }

  ensure(SNAP_DIR); ensure(REPORT_DIR);
  const runAt = new Date().toISOString(); const stamp = runAt.slice(0, 10);
  const snap = { runAt, feed: feed.id, items };
  fs.writeFileSync(path.join(SNAP_DIR, feed.id + '-snapshot-' + stamp + '.json'), JSON.stringify(snap, null, 2));
  fs.writeFileSync(latestPath, JSON.stringify(snap, null, 2));
  writeReport(feed, stamp, runAt, changes, items.length + ' Copilot cost/Cowork Message center posts tracked.');
  return { feed: feed.id, ok: true, changes };
}

function persist(feed, pages, changes, releases) {
  ensure(SNAP_DIR); ensure(REPORT_DIR);
  const runAt = new Date().toISOString(); const stamp = runAt.slice(0, 10);
  const snapshot = { runAt, feed: feed.id, windowStart: feed.windowStart, pages };
  if (releases) snapshot.releases = releases;
  fs.writeFileSync(path.join(SNAP_DIR, feed.id + '-snapshot-' + stamp + '.json'), JSON.stringify(snapshot, null, 2));
  fs.writeFileSync(path.join(SNAP_DIR, feed.id + '-latest.json'), JSON.stringify(snapshot, null, 2));
  const okc = pages.filter(p => p.ok && !p.fetchFailed).length;
  const failedc = pages.filter(p => p.fetchFailed || (!p.ok)).length;
  const failNote = failedc ? ' \u26a0 ' + failedc + ' page(s) could not be fetched today; their last known-good snapshot was carried forward (not re-verified).' : '';
  writeReport(feed, stamp, runAt, changes, okc + ' pages verified, ' + pages.filter(p => p.inWindow).length + ' updated within window (since ' + feed.windowStart + ')' + (releases ? ', ' + releases.length + ' spec releases tracked' : '') + '.' + failNote);
  return { feed: feed.id, ok: true, changes, pages, failed: failedc };
}

function writeReport(feed, stamp, runAt, changes, summary) {
  const order = { critical: 0, major: 1, new: 2, info: 3, warn: 4 };
  changes.sort((a, b) => (order[a.sev] - order[b.sev]));
  let md = '# ' + feed.title + ' - ' + stamp + '\n\nRun: ' + runAt + '\n\n';
  if (BASELINE) md += '_Baseline run - snapshot recorded, no comparison performed._\n\n';
  else if (!changes.length) md += '**No changes detected.** ' + summary + '\n\n';
  else {
    md += '**' + changes.length + ' change(s) detected.** ' + summary + '\n\n';
    let cur = '';
    changes.forEach(c => { if (c.sev !== cur) { cur = c.sev; md += '\n## ' + cur.toUpperCase() + '\n\n'; } md += '- **' + c.title + '**' + (c.url ? ' ([link](' + c.url + '))' : '') + '\n  - ' + c.detail + '\n'; });
  }
  fs.writeFileSync(path.join(REPORT_DIR, feed.id + '-report-' + stamp + '.md'), md);
}

async function main() {
  let feedIds;
  if (ALL) feedIds = fs.readdirSync(FEED_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.discovered.json')).map(f => f.replace('.json', ''));
  else if (feedArg) feedIds = [feedArg];
  else { console.error('Usage: node scan.js <feedId>|--all [--baseline]'); process.exit(1); }

  const results = [];
  for (const id of feedIds) {
    const feed = loadJson(path.join(FEED_DIR, id + '.json'), null);
    if (!feed) { console.error('feed not found: ' + id); continue; }
    const res = feed.mode === 'roadmap' ? await scanRoadmapFeed(feed)
      : feed.mode === 'messagecenter' ? await scanMessageCenterFeed(feed)
      : await scanHtmlFeed(feed);
    results.push(res);
  }
  console.log('\n' + '-'.repeat(60));
  results.forEach(r => {
    const n = r.changes ? r.changes.length : 0;
    console.log(r.feed + ': ' + (r.ok ? (n + ' change(s)') : 'FAILED ' + r.error) + (BASELINE ? ' (baseline)' : ''));
  });

  // Regenerate the landing-page change-status manifest from the snapshots just
  // written, so every card's pill reflects the latest real change (not just
  // that the job ran). Never fatal — a manifest error must not fail the scan.
  try { require('./status.js').generate(); console.log('status.json regenerated.'); }
  catch (e) { console.error('status.json generation skipped: ' + e.message); }

  // Regenerate the cross-feed search index that powers the dedicated search page
  // (docs/community/learning-feed/search/). Also non-fatal.
  try { const m = require('./search-index.js').generate(); console.log('search-index.json regenerated (' + m.entryCount + ' entries).'); }
  catch (e) { console.error('search-index.json generation skipped: ' + e.message); }
}

main().catch(e => { console.error(e); process.exit(1); });
