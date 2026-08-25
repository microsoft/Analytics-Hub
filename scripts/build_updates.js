#!/usr/bin/env node
/* Build the Analytics Hub update feed and the "What's new" page.
 *
 * Source of truth is docs/data/updates.json. Run this after adding an entry:
 *
 *     node scripts/build_updates.js
 *
 * Outputs, both generated and never hand-edited:
 *   docs/feed.xml          RSS 2.0
 *   docs/updates/index.html
 *
 * Why RSS 2.0 rather than Atom: the consumers here are Outlook, the Teams
 * "Post to a channel when a feed item is published" workflow, and ordinary
 * feed readers. All of them read RSS 2.0. Nothing in this feed needs anything
 * Atom offers over it.
 *
 * Two things this script is careful about:
 *
 * 1. GUID stability. A reader decides what is new by comparing guids against
 *    what it has already shown. If a guid changes, every subscriber gets the
 *    item again as if it were new. The guid is the entry's `id`, which is why
 *    updates.json says never to change one after publishing. The build fails
 *    on duplicate ids rather than silently emitting a feed that suppresses
 *    items in some readers.
 *
 * 2. Drift against the per-app changelogs. Those are still hand-written HTML
 *    inside each app page. If someone adds a changelog entry there and forgets
 *    updates.json, the feed goes quiet while the site keeps shipping, which is
 *    the exact failure this feed exists to prevent. So the build compares the
 *    newest changelog date per app against the newest feed entry for that app
 *    and warns loudly when the changelog is ahead.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const SRC = path.join(DOCS, 'data', 'updates.json');

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const site = raw.site;
const updates = raw.updates || [];

/* ---------------------------------------------------------------- validate */

const problems = [];
const seen = new Map();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

for (const u of updates) {
  const where = u.id || u.title || '(unnamed entry)';
  if (!u.id) problems.push(`${where}: missing id`);
  if (!u.title) problems.push(`${where}: missing title`);
  if (!u.summary) problems.push(`${where}: missing summary`);
  if (!DATE_RE.test(u.date || '')) problems.push(`${where}: date must be yyyy-mm-dd, got ${u.date}`);
  if (seen.has(u.id)) problems.push(`${where}: duplicate id, also used by "${seen.get(u.id)}"`);
  seen.set(u.id, u.title);
  // A relative link keeps the JSON portable; absolute ones would silently
  // break if the site ever moves.
  if (u.link && /^https?:\/\//i.test(u.link)) {
    problems.push(`${where}: link should be relative to the site base, got an absolute URL`);
  }
}

if (problems.length) {
  console.error('updates.json is not valid:\n  - ' + problems.join('\n  - '));
  process.exit(1);
}

// Newest first. Ties broken by id so the output is deterministic run to run.
const sorted = updates.slice().sort((a, b) =>
  a.date === b.date ? a.id.localeCompare(b.id) : b.date.localeCompare(a.date));

/* ------------------------------------------------------------------ helpers */

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* RFC 822, which is what RSS 2.0 requires. Built by hand rather than with
   toUTCString() so the day and month names cannot follow a non-English locale.
   Time is fixed at 16:00 UTC: entries carry a date but not a time, and a
   midnight timestamp lands on the previous day for anyone west of UTC. */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function rfc822(isoDate) {
  const d = new Date(isoDate + 'T16:00:00Z');
  return `${DAYS[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, '0')} ` +
    `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} 16:00:00 GMT`;
}

function longDate(isoDate) {
  const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  const d = new Date(isoDate + 'T16:00:00Z');
  return `${d.getUTCDate()} ${FULL[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const base = site.base.replace(/\/+$/, '') + '/';
const linkFor = (u) => base + String(u.link || '').replace(/^\/+/, '');

/* ---------------------------------------------------------------- feed.xml */

const now = rfc822(sorted[0] ? sorted[0].date : new Date().toISOString().slice(0, 10));

const items = sorted.map((u) => {
  const url = linkFor(u);
  const tagLine = (u.tags || []).length ? `[${u.tags.join(', ')}] ` : '';
  const body = `${tagLine}${u.summary}`;
  return `    <item>
      <title>${esc(u.tool ? u.tool + ' — ' + u.title : u.title)}</title>
      <link>${esc(url)}</link>
      <description>${esc(body)}</description>
      <pubDate>${rfc822(u.date)}</pubDate>
      <guid isPermaLink="false">analytics-hub:${esc(u.id)}</guid>${
    (u.tags || []).map((t) => `\n      <category>${esc(t)}</category>`).join('')}
    </item>`;
}).join('\n');

const feedUrl = base + 'feed.xml';
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by scripts/build_updates.js from docs/data/updates.json. Do not edit by hand. -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.title)}</title>
    <link>${esc(base)}</link>
    <description>${esc(site.description)}</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <ttl>1440</ttl>
    <atom:link href="${esc(feedUrl)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

fs.writeFileSync(path.join(DOCS, 'feed.xml'), feed, 'utf8');

/* ------------------------------------------------------- updates/index.html */

const TAG_CLASS = {
  Added: 'add', Changed: 'chg', Fixed: 'fix', Removed: 'rem', Renamed: 'chg',
};

const cards = sorted.map((u) => {
  const url = linkFor(u);
  const tags = (u.tags || []).map((t) =>
    `<span class="up-tag ${TAG_CLASS[t] || 'chg'}">${esc(t)}</span>`).join('');
  return `      <article class="up-item">
        <div class="up-meta">
          <time datetime="${esc(u.date)}">${longDate(u.date)}</time>
          ${u.tool ? `<span class="up-tool">${esc(u.tool)}</span>` : ''}
        </div>
        <h3><a href="${esc(url)}">${esc(u.title)}</a></h3>
        <p class="up-tags">${tags}</p>
        <p>${esc(u.summary)}</p>
      </article>`;
}).join('\n');

const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>What's new · Analytics Hub</title>
  <meta name="description" content="${esc(site.description)}" />
  <link rel="canonical" href="${esc(base)}updates/" />
  <meta name="theme-color" content="#0078d4" />
  <meta name="color-scheme" content="light dark" />
  <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
  <link rel="alternate" type="application/rss+xml" title="Analytics Hub — what's new" href="../feed.xml" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Analytics Hub" />
  <meta property="og:url" content="${esc(base)}updates/" />
  <meta property="og:title" content="What's new · Analytics Hub" />
  <meta property="og:description" content="${esc(site.description)}" />
  <meta property="og:image" content="${esc(base)}og-card.png" />
  <meta name="robots" content="index, follow" />
  <link rel="stylesheet" href="../styles.css" />
  <style>
    .up-wrap { max-width: 860px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
    .up-head h1 { margin: 0 0 .5rem; }
    .up-lede { font-size: 1.05rem; line-height: 1.65; opacity: .85; margin: 0 0 1.5rem; }
    .up-subscribe { border: 1px solid var(--border, rgba(128,128,128,.25));
      border-left: 4px solid #0078d4; border-radius: 0 12px 12px 0;
      padding: 1.1rem 1.3rem; margin: 0 0 2.5rem; background: rgba(0,120,212,.05); }
    .up-subscribe h2 { margin: 0 0 .6rem; font-size: 1.05rem; }
    .up-subscribe ol { margin: .5rem 0 0; padding-left: 1.25rem; }
    .up-subscribe li { margin-bottom: .45rem; line-height: 1.6; font-size: .93rem; }
    .up-feedlink { display: inline-block; margin-top: .35rem; font-family: ui-monospace, Menlo, Consolas, monospace;
      font-size: .88rem; word-break: break-all; }
    .up-item { border-top: 1px solid var(--border, rgba(128,128,128,.2)); padding: 1.6rem 0 .3rem; }
    .up-item h3 { margin: .35rem 0 .5rem; font-size: 1.18rem; line-height: 1.35; }
    .up-item h3 a { text-decoration: none; }
    .up-item h3 a:hover { text-decoration: underline; }
    .up-item p { margin: 0 0 .6rem; line-height: 1.7; }
    .up-meta { display: flex; gap: .75rem; align-items: baseline; flex-wrap: wrap;
      font-size: .82rem; opacity: .7; }
    .up-tool { font-weight: 600; }
    .up-tags { display: flex; gap: .4rem; flex-wrap: wrap; margin-bottom: .7rem !important; }
    .up-tag { font-size: .66rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
      padding: .14rem .5rem; border-radius: 6px; }
    .up-tag.add { background: rgba(52,211,153,.15); color: #0f9b6c; }
    .up-tag.chg { background: rgba(74,158,247,.15); color: #2064a8; }
    .up-tag.fix { background: rgba(245,158,11,.16); color: #9a6206; }
    .up-tag.rem { background: rgba(148,163,184,.2); color: #55637a; }
    @media (prefers-color-scheme: dark) {
      .up-tag.chg { color: #7ab8f5; }
      .up-tag.fix { color: #f0b34a; }
      .up-tag.rem { color: #a3b0c4; }
    }
  </style>
</head>
<body>
  <!-- Generated by scripts/build_updates.js from docs/data/updates.json. Do not edit by hand. -->
  <main class="up-wrap">
    <div class="up-head">
      <p><a href="../">← Analytics Hub</a></p>
      <h1>What's new</h1>
      <p class="up-lede">${esc(site.description)}</p>
    </div>

    <section class="up-subscribe">
      <h2>Get these as they ship</h2>
      <p>Subscribe once and updates arrive where you already work. Nothing to sign up for, and no email address to hand over.</p>
      <ol>
        <li><strong>Microsoft Teams</strong> — the easiest option, and it works for everyone. Open the channel you want, select <em>More options (…)</em> beside the channel name, then <em>Workflows</em>. Search for <em>webfeed</em> and choose <strong>Post to a channel when a webfeed item is published</strong>. Paste the address below when prompted. New items post to the channel automatically.</li>
        <li><strong>Outlook</strong> — only in <em>classic</em> Outlook for Windows: <em>File → Account Settings → Account Settings → RSS Feeds → New</em>. The new Outlook for Windows and Outlook on the web do not support RSS at all, so use the Teams option above instead.</li>
        <li><strong>Any feed reader</strong> — paste the address below.</li>
      </ol>
      <a class="up-feedlink" href="../feed.xml">${esc(feedUrl)}</a>
    </section>

${cards}
  </main>
</body>
</html>
`;

fs.mkdirSync(path.join(DOCS, 'updates'), { recursive: true });
fs.writeFileSync(path.join(DOCS, 'updates', 'index.html'), page, 'utf8');

/* ------------------------------------------------- drift against changelogs */

const APPS = [
  ['Cowork Chargeback', 'docs/cowork-billing/cowork-chargeback/app/index.html'],
  ['Cowork Policy Helper', 'docs/cowork-billing/cowork-policy-helper/app/index.html'],
  ['Multi-Budget Chargeback Report', 'docs/cowork-billing/multi-budget-chargeback/app/index.html'],
];

const warnings = [];
for (const [tool, rel] of APPS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  const dates = [...html.matchAll(/<div class="cl-date">\s*(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]).sort();
  const newestChangelog = dates[dates.length - 1];
  if (!newestChangelog) continue;
  const forTool = sorted.filter((u) => u.tool === tool).map((u) => u.date).sort();
  const newestFeed = forTool[forTool.length - 1];
  if (!newestFeed || newestChangelog > newestFeed) {
    warnings.push(`${tool}: changelog has ${newestChangelog} but the feed's newest entry is ` +
      `${newestFeed || 'none'}. Add it to updates.json or subscribers will not hear about it.`);
  }
}

/* ------------------------------------------------------------------ report */

console.log(`feed.xml           ${sorted.length} items, newest ${sorted[0].date}`);
console.log(`updates/index.html written`);
if (warnings.length) {
  console.log('\nWARNING — the per-app changelogs are ahead of the feed:');
  warnings.forEach((w) => console.log('  ! ' + w));
  process.exitCode = 0; // a warning, not a build failure
} else {
  console.log('changelogs and feed are in step');
}
