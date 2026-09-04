#!/usr/bin/env node
/* Build the Analytics Hub update feed and the "What's new" page.
 *
 * Source of truth is docs/data/updates.json.
 *
 *   node scripts/build_updates.js              rebuild from published entries
 *   node scripts/build_updates.js --list       show drafts and published
 *   node scripts/build_updates.js --publish    publish every draft, dated today
 *   node scripts/build_updates.js --publish ID publish one draft
 *
 * Outputs, both generated and never hand-edited:
 *   docs/feed.xml          RSS 2.0
 *   docs/updates/index.html
 *
 * Draft gating. Entries are drafts until published, and only published ones
 * reach the feed. The feed carries announcements only: new reports, new
 * features to existing reports, critical bug fixes. Not every small change.
 * Write the entry when the work happens, publish when it is worth announcing.
 *
 * Publishing stamps the date. A draft carries no date and gets today's when it
 * is published. Dating it when it was written would drop an item into
 * subscribers' readers already several days old, where it sorts below things
 * they have read and, in some readers, is not surfaced at all. The date that
 * matters to a subscriber is when it reached them.
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
 *    and warns loudly when the changelog is ahead. A waiting draft counts as
 *    covered, since the entry exists and is only being held back on purpose.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const SRC = path.join(DOCS, 'data', 'updates.json');

const argv = process.argv.slice(2);
const wantList = argv.includes('--list');
const publishIdx = argv.indexOf('--publish');
const wantPublish = publishIdx > -1;
const publishTarget = wantPublish ? argv[publishIdx + 1] : null;

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const site = raw.site;
const all = raw.updates || [];

// Absent status means draft. Anything written by hand and not yet thought
// about should stay out of the feed rather than fall into it.
const isDraft = (u) => (u.status || 'draft') !== 'published';

/* --------------------------------------------------------------- --publish */

if (wantPublish) {
  const today = new Date().toISOString().slice(0, 10);
  const waiting = all.filter(isDraft);

  if (!waiting.length) {
    console.log('Nothing to publish. No drafts waiting.');
    process.exit(0);
  }

  let chosen = waiting;
  if (publishTarget && !publishTarget.startsWith('--')) {
    chosen = waiting.filter((u) => u.id === publishTarget);
    if (!chosen.length) {
      console.error(`No draft with id "${publishTarget}". Waiting drafts:`);
      waiting.forEach((d) => console.error('  ' + d.id));
      process.exit(1);
    }
  }

  for (const u of chosen) {
    u.status = 'published';
    // Stamped on publish, not on draft. See the note at the top of this file.
    u.date = today;
    delete u.drafted;
    console.log(`published  ${u.id}  (dated ${today})`);
  }

  fs.writeFileSync(SRC,
    JSON.stringify({ $comment: raw.$comment, site, updates: all }, null, 2) + '\n', 'utf8');
  const left = all.filter(isDraft).length;
  console.log(`\n${chosen.length} published, ${left} draft${left === 1 ? '' : 's'} still waiting.`);
  console.log('Rebuilding\u2026\n');
}

const updates = all.filter((u) => !isDraft(u));
const drafts = all.filter(isDraft);

/* ------------------------------------------------------------------ --list */

if (wantList) {
  console.log(`published (${updates.length}) \u2014 live in the feed`);
  updates.slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((u) => console.log(`  ${u.date}  ${u.id}`));
  console.log(`\ndrafts (${drafts.length}) \u2014 not in the feed, nobody has been notified`);
  if (!drafts.length) console.log('  (none)');
  drafts.forEach((u) =>
    console.log(`  ${String(u.drafted || 'undated').padEnd(10)}  ${u.id}  ${u.title || ''}`));
  if (drafts.length) {
    console.log('\nPublish everything:  node scripts/build_updates.js --publish');
    console.log('Publish one:         node scripts/build_updates.js --publish ' + drafts[0].id);
  }
  process.exit(0);
}

/* ---------------------------------------------------------------- validate */

const problems = [];
const seen = new Map();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

for (const u of all) {
  const where = u.id || u.title || '(unnamed entry)';
  if (!u.id) problems.push(`${where}: missing id`);
  if (!u.title) problems.push(`${where}: missing title`);
  if (!u.summary) problems.push(`${where}: missing summary`);
  // A draft has no date yet; publishing assigns it.
  if (!isDraft(u) && !DATE_RE.test(u.date || '')) {
    problems.push(`${where}: published entries need a yyyy-mm-dd date, got ${u.date}`);
  }
  if (u.status && u.status !== 'draft' && u.status !== 'published') {
    problems.push(`${where}: status must be "draft" or "published", got "${u.status}"`);
  }
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

if (!updates.length) {
  console.error('No published entries, so the feed would be empty. That looks broken to anyone already subscribed.');
  console.error('Publish a draft first: node scripts/build_updates.js --publish');
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

/* -------------------------------------------------------------------- feed */

const now = rfc822(sorted[0] ? sorted[0].date : new Date().toISOString().slice(0, 10));

function itemXml(u) {
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
}

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
${sorted.map(itemXml).join('\n')}
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
  <!-- Microsoft Clarity. Without this the page is invisible to the nightly
       snapshot, and the whole point of ?from= and ?copied= is that the
       snapshot can read them back out of the URL dimension. -->
  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "wxb0r23ozh");
  </script>
  <meta name="clarity-page" content="Updates" />
  <link rel="stylesheet" href="../styles.css" />
  <script src="../clarity-events.js?v=202608181034" defer></script>
  <link rel="stylesheet" href="../palette.css?v=936728fb" />
  <script src="../palette.js" defer></script>
  <script src="../nudges.js" defer></script>
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
    .up-feedrow { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; margin-top: .5rem; }
    .up-howto { margin: 1.4rem 0 .5rem; font-size: 1rem; }
    .up-copy { border: 1px solid var(--border-strong, rgba(128,128,128,.4)); background: var(--surface, transparent);
      color: inherit; font: inherit; font-size: .82rem; font-weight: 600; padding: .34rem .7rem;
      border-radius: 8px; cursor: pointer; white-space: nowrap; transition: background .15s ease, border-color .15s ease; }
    .up-copy:hover { background: rgba(0,120,212,.1); border-color: #0078d4; }
    .up-copy.is-copied { background: rgba(52,211,153,.16); border-color: #34d399; color: #0f9b6c; }
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
<a class="ah-skip" href="#top">Skip to main content</a>
  <!-- Generated by scripts/build_updates.js from docs/data/updates.json. Do not edit by hand. -->
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="../">
      <span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V11M9.5 19V6M15 19v-5M20.5 19V8"/></svg></span>
      <span class="brand-name">Analytics Hub</span>
      <span class="brand-by">Open source toolkit</span>
    </a>
    <nav class="primary-nav">
      <a href="../explore-reports/">Reports</a>
      <a href="../cowork-billing/">Consumption &amp; Cost</a>
      <a href="../case-studies/">Case Studies</a>
      <div class="nav-dropdown" data-open="false">
        <button class="nav-dropdown-trigger" type="button">Resources <span class="caret" aria-hidden="true">&#9662;</span></button>
        <div class="nav-dropdown-menu" role="menu">
          <a href="../team/" role="menuitem"><span class="menu-icon" aria-hidden="true">&#128101;</span><span class="menu-text">Team<span class="menu-sub">Who builds the hub</span></span></a>
          <a href="../faq/" role="menuitem"><span class="menu-icon" aria-hidden="true">&#10067;</span><span class="menu-text">FAQ<span class="menu-sub">Common questions answered</span></span></a>
          <a href="../glossary/" role="menuitem"><span class="menu-icon" aria-hidden="true">&#128214;</span><span class="menu-text">Glossary<span class="menu-sub">Copilot reporting terms</span></span></a>
          <a href="../feedback/" role="menuitem"><span class="menu-icon" aria-hidden="true">&#128172;</span><span class="menu-text">Feedback<span class="menu-sub">Problem &middot; suggestion &middot; praise</span></span></a>
          <hr class="menu-sep" />
          <a href="../demos/" role="menuitem" class="menu-internal"><span class="menu-icon" aria-hidden="true">&#128274;</span><span class="menu-text">Internal Demos<span class="menu-sub">Microsoft-only &middot; live customer walkthroughs</span></span></a>
        </div>
      </div>
      <a class="nav-subscribe" href="../updates/?from=nav" aria-current="page">Stay Up To Date</a>
      <a class="nav-cta" href="https://github.com/microsoft/Analytics-Hub" target="_blank" rel="noopener">GitHub &#8599;</a>
    </nav>
    <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">&#9680;</button>
  </div>
</header>
  <main id="top" class="up-wrap">
    <div class="up-head">
      <h1>What's new</h1>
      <p class="up-lede">${esc(site.description)}</p>
    </div>

    <section class="up-subscribe">
      <h2>Get told when something matters</h2>
      <p>This feed carries announcements only. New reports, new features to existing reports, critical bug fixes. Not every small change, so subscribing will not fill your inbox.</p>

      <div class="up-feedrow">
        <a class="up-feedlink" href="../feed.xml">${esc(feedUrl)}</a>
        <button type="button" class="up-copy" id="upCopy" data-feed="${esc(feedUrl)}">Copy</button>
      </div>

      <h3 class="up-howto">Set up delivery once</h3>
      <ol>
        <li><strong>Email, in any Outlook.</strong> Go to <a href="https://make.powerautomate.com/" target="_blank" rel="noopener">Power Automate</a>, create a flow from blank, and pick the RSS trigger <em>When a feed item is published</em>. Paste the address above, then add the Outlook action <em>Send an email (V2)</em> addressed to yourself. Both connectors are included with Microsoft 365, so there is nothing to buy. This lands in your normal inbox and works in new Outlook, Outlook on the web and on your phone.</li>
        <li><strong>A Teams channel.</strong> Open the channel, select <em>More options (…)</em> beside the channel name, then <em>Workflows</em>. Search for <em>webfeed</em> and choose <strong>Post to a channel when a webfeed item is published</strong>. Paste the address when prompted.</li>
        <li><strong>Classic Outlook only.</strong> <em>File → Account Settings → Account Settings → RSS Feeds → New</em>. This is the built-in RSS reader, and it exists only in classic Outlook. New Outlook and Outlook on the web cannot do it, so use option 1 instead.</li>
        <li><strong>Any feed reader.</strong> Paste the address above.</li>
      </ol>
    </section>

    <script>
      /* Copying the feed address is the closest thing to a measurable
         subscribe, and it is the only part of subscribing that happens on a
         page we can observe. Feed readers fetch the XML over plain HTTP and
         never run JavaScript, so an actual subscriber is invisible to us.

         The copy is recorded by putting ?copied=all into the URL via
         replaceState, which Clarity proxies and treats as a new page view.
         That reuses the same mechanism as the demo tagging on the chargeback
         tools, and works because Clarity's export API returns the URL but
         will not return custom events. */
      (function () {
        var btn = document.getElementById('upCopy');
        if (!btn) return;
        btn.addEventListener('click', function () {
          var url = btn.getAttribute('data-feed');
          function done() {
            var was = btn.textContent;
            btn.textContent = 'Copied';
            btn.classList.add('is-copied');
            setTimeout(function () { btn.textContent = was; btn.classList.remove('is-copied'); }, 1800);
            try {
              if (location.search.indexOf('copied=') === -1) {
                var q = location.search ? location.search + '&copied=all' : '?copied=all';
                history.replaceState(null, '', location.pathname + q);
              }
            } catch (e) {}
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(done, done);
          } else {
            var t = document.createElement('textarea');
            t.value = url; document.body.appendChild(t); t.select();
            try { document.execCommand('copy'); } catch (e) {}
            document.body.removeChild(t);
            done();
          }
        });
      })();
    </script>

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
  // A waiting draft counts as covered: the entry exists and is being held back
  // deliberately, which is not the same as forgetting to write one.
  if (drafts.some((u) => u.tool === tool)) continue;
  const forTool = sorted.filter((u) => u.tool === tool).map((u) => u.date).sort();
  const newestFeed = forTool[forTool.length - 1];
  if (!newestFeed || newestChangelog > newestFeed) {
    warnings.push(`${tool}: changelog has ${newestChangelog} but the feed's newest entry is ` +
      `${newestFeed || 'none'}. Add it to updates.json or subscribers will not hear about it.`);
  }
}

/* ------------------------------------------------------------------ report */

console.log(`feed.xml           ${sorted.length} announced, newest ${sorted[0].date}`);
console.log(`updates/index.html written`);
if (drafts.length) {
  console.log(`\n${drafts.length} draft${drafts.length === 1 ? '' : 's'} held back, nobody notified:`);
  drafts.forEach((u) => console.log(`  · ${u.id}`));
  console.log('Announce when ready: node scripts/build_updates.js --publish');
}
if (warnings.length) {
  console.log('\nWARNING — the per-app changelogs are ahead of the feed:');
  warnings.forEach((w) => console.log('  ! ' + w));
  process.exitCode = 0; // a warning, not a build failure
} else if (!drafts.length) {
  console.log('changelogs and feed are in step');
}
