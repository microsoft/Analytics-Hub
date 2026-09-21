#!/usr/bin/env node
/* build.js - Learning Feed page renderer.
 *
 * Reads a feed registry (./feeds/<id>.json) and its latest snapshot
 * (./snapshots/<id>-latest.json) and renders the public HTML feed page at
 * ../../docs/community/<slug>/index.html in the Cowork Document Monitor format.
 *
 * The renderer NEVER touches the network and NEVER invents text. It prints only
 * facts captured by scan.js: Microsoft's published "last updated" date (ms.date),
 * word counts, git commit ids, section names, and -- for the roadmap feed -- the
 * verbatim item title, status and description returned by the official Microsoft
 * 365 Roadmap API. Where a verbatim before/after cannot be sourced (no archived
 * capture yet), the row says so rather than fabricating a quote.
 *
 * Usage:  node build.js <feedId>|--all
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FEED_DIR = path.join(ROOT, 'feeds');
const SNAP_DIR = path.join(ROOT, 'snapshots');
const DOCS = path.join(ROOT, '..', '..', 'docs', 'community');

const args = process.argv.slice(2);
const ALL = args.includes('--all');
const feedArg = args.find(a => !a.startsWith('--'));

function loadJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? iso + 'T00:00:00Z' : iso);
  if (isNaN(d)) return esc(iso);
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function roadmapUrl(id) { return 'https://www.microsoft.com/en-us/microsoft-365/roadmap?featureid=' + encodeURIComponent(id); }

const NAV = `
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="../../">
      <span class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19V11M9.5 19V6M15 19v-5M20.5 19V8"/></svg></span>
      <span class="brand-name">Analytics Hub</span>
      <span class="brand-by">Open source toolkit</span>
    </a>
    <nav class="primary-nav">
      <a href="../../choose-report/">Reports</a>
      <a href="../../cowork-billing/">Consumption &amp; Cost</a>
      <a href="../../case-studies/">Case Studies</a>
      <a href="../../community/" aria-current="page">Community</a>
      <a class="nav-subscribe" href="../../updates/?from=nav">Stay Up To Date</a>
      <a class="nav-cta" href="https://github.com/microsoft/Analytics-Hub" target="_blank" rel="noopener">GitHub &#8599;</a>
    </nav>
  </div>
</header>`;

const STYLE = `
  <style>
    .dm-hero { padding: 2.6rem 0 .6rem; }
    .dm-crumb { font-size: .8rem; color: var(--text-soft, #5a6470); margin: 0 0 .8rem; }
    .dm-crumb a { color: inherit; }
    .dm-hero h1 { margin: 0 0 .5rem; }
    .dm-hero .lede { max-width: 76ch; color: var(--text-soft, #5a6470); margin: 0 0 .4rem; }
    .dm-meta { font-size: .82rem; color: var(--text-soft, #5a6470); opacity: .9; margin: .8rem 0 0; }
    .dm-kpis { display: grid; gap: .9rem; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin: 1.4rem 0 .4rem; }
    .dm-kpi { border: 1px solid var(--border, #e2e6ea); border-radius: 12px; background: var(--surface, #fff); padding: 1rem 1.1rem; }
    .dm-kpi .v { font-size: 1.7rem; font-weight: 700; line-height: 1.1; }
    .dm-kpi .l { font-size: .8rem; color: var(--text-soft, #5a6470); margin-top: .25rem; }
    .dm-summary { border: 1px solid var(--border, #e2e6ea); background: color-mix(in srgb, var(--accent, #0078d4) 6%, transparent); border-left: 4px solid var(--accent, #0078d4); border-radius: 12px; padding: 1rem 1.2rem; margin: 1.6rem 0 .6rem; }
    .dm-summary h2 { margin: 0 0 .3rem; font-size: 1.05rem; }
    .dm-summary p { margin: 0; font-size: .95rem; }
    .dm-note { font-size: .85rem; color: var(--text-soft, #5a6470); background: color-mix(in srgb, currentColor 5%, transparent); border-radius: 10px; padding: .7rem 1rem; margin: 1rem 0; }
    h2.dm-h { margin: 2.1rem 0 .4rem; font-size: 1.25rem; }
    .dm-scroll { overflow-x: auto; }
    table.dm-log { width: 100%; border-collapse: collapse; margin: 1.1rem 0 .6rem; font-size: .9rem; min-width: 720px; }
    table.dm-log th, table.dm-log td { text-align: left; vertical-align: top; padding: 12px 14px; border-bottom: 1px solid var(--border, #e2e6ea); }
    table.dm-log th { position: sticky; top: 0; background: var(--surface, #fff); font-size: .72rem; text-transform: uppercase; letter-spacing: .05em; color: var(--text-soft, #5a6470); }
    table.dm-log td.dm-page { min-width: 190px; font-weight: 600; }
    table.dm-log td.dm-date { white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--text-soft, #5a6470); }
    table.dm-log td.dm-prev, table.dm-log td.dm-new { max-width: 340px; }
    .dm-badge-new { display: inline-block; font-size: .68rem; font-weight: 800; letter-spacing: .06em; padding: 2px 8px; border-radius: 999px; background: #107c10; color: #fff; }
    .dm-badge-silent { display: inline-block; font-size: .68rem; font-weight: 700; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; background: #5a5a5a; color: #fff; }
    .dm-badge-status { display: inline-block; font-size: .68rem; font-weight: 800; letter-spacing: .04em; padding: 2px 8px; border-radius: 999px; color: #fff; }
    .dm-quote { border-left: 2px solid var(--border, #e2e6ea); padding-left: 10px; margin: 4px 0; }
    .dm-links { columns: 2; column-gap: 40px; margin: 12px 0 40px; font-size: .88rem; padding-left: 18px; }
    .dm-links li { break-inside: avoid; margin: 0 0 7px; }
    .dm-tier { font-size: .7rem; color: var(--text-soft, #5a6470); }
    .dm-disclaimer { font-size: .8rem; color: var(--text-soft, #5a6470); border-top: 1px solid var(--border, #e2e6ea); margin-top: 1.4rem; padding-top: 1rem; }
    .dm-alert { margin: 22px 0 8px; border: 1px solid color-mix(in srgb, #0067c0 32%, var(--border, #e2e6ea)); border-left: 4px solid #0067c0; background: color-mix(in srgb, #0067c0 8%, var(--surface, #fff)); border-radius: 12px; padding: 16px 20px 17px; }
    .dm-alert__head { display: flex; align-items: center; gap: .5rem; font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #0067c0; margin: 0 0 .5rem; }
    .dm-alert__dot { display: inline-block; width: .55rem; height: .55rem; border-radius: 999px; background: #0067c0; }
    .dm-alert__title { margin: 0 0 .25rem; font-size: 1.05rem; font-weight: 700; }
    .dm-alert__body { margin: 0 0 .7rem; font-size: .93rem; line-height: 1.5; }
    .dm-alert__actions { display: flex; flex-wrap: wrap; gap: .5rem; }
    .dm-actbtn { display: inline-flex; align-items: center; gap: .35rem; font-size: .82rem; font-weight: 600; padding: .42rem .8rem; border-radius: 8px; text-decoration: none; border: 1px solid var(--border, #e2e6ea); background: var(--surface, #fff); color: inherit; white-space: nowrap; cursor: pointer; }
    .dm-actbtn:hover { border-color: #0067c0; color: #0067c0; }
    .dm-actbtn--mail { background: #0067c0; border-color: #0067c0; color: #fff; }
    .dm-actbtn--mail:hover { background: #0058a8; border-color: #0058a8; color: #fff; }
    .dm-emailbtn { display: inline-flex; align-items: center; gap: .35rem; font-size: .78rem; font-weight: 600; padding: .34rem .62rem; border: 1px solid var(--border, #e2e6ea); border-radius: 8px; background: var(--surface, #fff); color: #0067c0; text-decoration: none; white-space: nowrap; cursor: pointer; margin-top: 8px; }
    .dm-emailbtn:hover { border-color: #0067c0; background: color-mix(in srgb, #0067c0 8%, transparent); }
    @media (max-width: 780px) { .dm-links { columns: 1; } }
  </style>`;

function emailScript(monitorUrl) {
  return `
<script>
/* Learning Feed \u2014 email-a-change actions. Builds neutral, informational
   mailto: links. Each email carries a summary of the change, the source link,
   and a link back to the exact row on this page. No framing, no sign-off. */
(function () {
  'use strict';
  var MONITOR = ${JSON.stringify(monitorUrl)};
  function encodeBody(lines) { return encodeURIComponent(lines.join('\\r\\n')); }
  function mailto(subject, lines) { return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeBody(lines); }
  function firstText(cell) { if (!cell) return ''; for (var n = cell.firstChild; n; n = n.nextSibling) { if (n.nodeType === 3 && n.nodeValue.trim()) return n.nodeValue.trim(); if (n.nodeType === 1) return n.textContent.trim(); } return cell.textContent.trim(); }
  function summarise(cell) { if (!cell) return ''; var ps = Array.prototype.slice.call(cell.querySelectorAll('p')); var plain = ps.map(function (p) { return p.textContent.replace(/\\s+/g, ' ').trim(); }).filter(Boolean); var text = plain.length ? plain.join(' ') : cell.textContent.replace(/\\s+/g, ' ').trim(); if (text.length > 800) text = text.slice(0, 800).replace(/\\s+\\S*$/, '') + '\\u2026'; return text; }
  function bodyLines(title, date, summary, srcUrl, anchor) {
    return ['Sharing an update tracked on the Analytics Hub Learning Feed.', '', 'Page: ' + title, 'Date: ' + date, '', 'Summary:', summary, '', 'Source:', srcUrl, '', 'Tracked on the Learning Feed:', MONITOR + (anchor ? '#' + anchor : '')];
  }
  var rows = document.querySelectorAll('table.dm-log tbody tr');
  Array.prototype.forEach.call(rows, function (tr, i) {
    if (!tr.id) tr.id = 'change-' + (i + 1);
    var link = tr.querySelector('.dm-page a'); var newCell = tr.querySelector('.dm-new'); var dateCell = tr.querySelector('.dm-date');
    if (!link || !newCell) return;
    var title = link.textContent.replace(/\\s+/g, ' ').trim();
    var srcUrl = link.href; var date = firstText(dateCell) || 'see page'; var summary = summarise(newCell);
    var subject = 'Documentation update \u2014 ' + title + ' (' + date + ')';
    var a = document.createElement('a'); a.className = 'dm-emailbtn'; a.href = mailto(subject, bodyLines(title, date, summary, srcUrl, tr.id)); a.innerHTML = '\\u2709 Email this change';
    newCell.appendChild(a);
  });
  var bannerBtn = document.getElementById('dmBannerEmail');
  if (bannerBtn) {
    var t = document.getElementById('dmBannerTitle'); var b = document.getElementById('dmBannerBody');
    bannerBtn.href = mailto('Analytics Hub Learning Feed \u2014 ' + (t ? t.textContent.trim() : 'update'), ['Sharing an update tracked on the Analytics Hub Learning Feed.', '', (t ? t.textContent.trim() : ''), '', (b ? b.textContent.replace(/\\s+/g, ' ').trim() : ''), '', 'Tracked on the Learning Feed:', MONITOR]);
  }
})();
</script>`;
}

function head(feed, canonical) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(feed.title)} \u00b7 Analytics Hub</title>
  <meta name="description" content="${esc(feed.blurb.slice(0, 180))}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="theme-color" content="#0078d4" />
  <meta name="color-scheme" content="light dark" />
  <link rel="icon" type="image/svg+xml" href="../../favicon.svg" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Analytics Hub" />
  <meta property="og:title" content="${esc(feed.title)} \u00b7 Analytics Hub" />
  <meta property="og:description" content="${esc(feed.blurb.slice(0, 180))}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="stylesheet" href="../../styles.css" />
  <link rel="stylesheet" href="../../palette.css" />
  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "wxb0r23ozh");
  </script>
  <meta name="clarity-page" content="${esc(feed.title)}" />
  <script src="../../clarity-events.js?v=202609141210" defer></script>
  <script src="../../consent.js?v=1" defer></script>
  <script src="../../palette.js" defer></script>
  <script src="../../nudges.js" defer></script>
${STYLE}
</head>
<body>
<a class="ah-skip" href="#top">Skip to main content</a>
${NAV}
<main id="top">`;
}

const FOOTER = `
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-secondary"><a href="../../faq/">FAQ</a> \u00b7 <a href="../../glossary/">Glossary</a> \u00b7 <a href="../../feedback/">Feedback</a></div>
    <div class="footer-fine">
      \u00a9 Microsoft Corporation \u00b7 MIT Licensed \u00b7 <a href="../../">Analytics Hub home</a> \u00b7 <a href="../">Community</a> \u00b7 <a href="../../feedback/">Send feedback</a>
    </div>
  </div>
</footer>`;

const STATUS_COLOR = { 'Launched': '#107c10', 'Rolling out': '#0067c0', 'In development': '#8661c5', 'Cancelled': '#8a8886' };

function buildDocFeed(feed, snap, canonical) {
  const pages = (snap.pages || []).filter(p => p.ok);
  const inWindow = pages.filter(p => p.inWindow).sort((a, b) => (b.msDate || '').localeCompare(a.msDate || ''));
  const mostRecent = inWindow[0] ? inWindow[0].msDate : (pages.map(p => p.msDate).filter(Boolean).sort().pop());
  const noMsDate = !!feed.noMsDate;
  const winLabel = fmtDate(feed.windowStart);

  let rows = '';
  if (noMsDate) {
    // GitHub docs: no published date. Establish baseline; track forward.
    rows = pages.map((p, i) => `
        <tr id="change-${i + 1}">
          <td class="dm-page"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></td>
          <td class="dm-prev"><span class="dm-badge-silent">BASELINE</span>
            <p>GitHub documentation does not publish a machine-readable "last updated" date, so this page's current state is recorded as the baseline on ${fmtDate(snap.runAt)}. Future body changes are detected on the daily scan and logged here.</p>
          </td>
          <td class="dm-new">
            <p>${esc(p.why)}</p>
            <p class="dm-tier">Current published length: ${esc(p.wordCount || (p.bodyLen + ' chars'))} \u00b7 baseline recorded ${fmtDate(snap.runAt)}.</p>
          </td>
          <td class="dm-date">${fmtDate(snap.runAt)}<br><span style="opacity:.7">baseline</span></td>
        </tr>`).join('');
  } else if (inWindow.length) {
    rows = inWindow.map((p, i) => `
        <tr id="change-${i + 1}">
          <td class="dm-page"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a></td>
          <td class="dm-prev"><span class="dm-badge-new">UPDATED IN WINDOW</span>
            <p>Microsoft's published "last updated" date for this page is <strong>${fmtDate(p.msDate)}</strong>, which falls within the tracking window that begins ${winLabel}. Verbatim before/after text will be added from an archived capture as one becomes available.</p>
          </td>
          <td class="dm-new">
            <p>${esc(p.why)}</p>
            <p class="dm-tier">Source signal: ms.date ${esc((p.msDate || '').slice(0, 10))}${p.gitCommit ? ' \u00b7 git commit ' + esc(String(p.gitCommit).slice(0, 8)) : ''} \u00b7 current length ${esc(p.wordCount || (p.bodyLen + ' chars'))} words.</p>
          </td>
          <td class="dm-date">${fmtDate(p.msDate)}</td>
        </tr>`).join('');
  } else {
    rows = `<tr><td colspan="4">No tracked page has a Microsoft-published update dated on or after ${winLabel}. The daily scan will log changes as they occur.</td></tr>`;
  }

  const watchList = feed.docs.map(d => {
    const p = pages.find(x => x.id === d.id);
    const badge = p && p.inWindow ? ' <span class="dm-badge-new" style="font-size:.6rem">since ' + winLabel + '</span>' : '';
    const date = p && p.msDate ? ' <span class="dm-tier">(updated ' + fmtDate(p.msDate) + ')</span>' : (noMsDate ? '' : ' <span class="dm-tier">(date unknown)</span>');
    return `      <li><a href="${esc(d.url)}" target="_blank" rel="noopener">${esc(d.title)}</a>${date}${badge}</li>`;
  }).join('\n');

  let releasesBlock = '';
  if (snap.releases && snap.releases.length) {
    const relRows = snap.releases.map(r => `
        <tr>
          <td class="dm-page"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.tag)}</a>${r.prerelease ? ' <span class="dm-tier">(pre-release)</span>' : ''}</td>
          <td>${esc(r.name && r.name !== r.tag ? r.name : '\u2014')}</td>
          <td class="dm-date">${fmtDate(r.published)}</td>
        </tr>`).join('');
    const relLabel = (feed.releasesSource && feed.releasesSource.label) || 'Specification releases';
    releasesBlock = `
    <h2 class="dm-h">${esc(relLabel)}</h2>
    <p class="dm-note">Published releases of the versioned specification these reports conform to, newest first, taken verbatim from the source repository's releases. A new release can change column definitions or naming that the reports depend on.</p>
    <div class="dm-scroll">
    <table class="dm-log">
      <thead><tr><th>Version</th><th>Name</th><th>Published</th></tr></thead>
      <tbody>${relRows}
      </tbody>
    </table>
    </div>
`;
  }

  const bannerTitle = noMsDate
    ? `${pages.length} GitHub Copilot billing pages now under daily watch`
    : `${inWindow.length} of ${pages.length} watched pages were updated by Microsoft since ${winLabel}`;
  let bannerBody = noMsDate
    ? `This feed records the current published state of each page today and reports any change detected on the daily scan. GitHub documentation does not expose a machine-readable last-updated date, so changes are detected from the page body itself.`
    : `Each was updated on or after ${winLabel}, based on Microsoft's own published "last updated" date. The change log below lists them newest first, with a link to the source page and to the exact row for sharing.`;
  let bannerTitleFinal = bannerTitle;
  if (snap.releases && snap.releases.length) {
    const latest = snap.releases.find(r => !r.prerelease) || snap.releases[0];
    const relLabel = (feed.releasesSource && feed.releasesSource.label) || 'specification';
    if (!inWindow.length) bannerTitleFinal = `Latest ${relLabel.replace(/ releases$/i, '')} release: ${latest.tag} (${fmtDate(latest.published)})`;
    bannerBody += ` The versioned specification these reports conform to is tracked below \u2014 latest release ${latest.tag}, published ${fmtDate(latest.published)}.`;
  }

  return head(feed, canonical) + `
  <section class="dm-hero">
    <div class="wrap">
      <p class="dm-crumb"><a href="../">&larr; Community</a> &middot; Learning Feed</p>
      <h1>${esc(feed.title)}</h1>
      <p class="lede">${esc(feed.blurb)}</p>
      <div class="dm-kpis">
        <div class="dm-kpi"><div class="v">${pages.length}</div><div class="l">${noMsDate ? 'GitHub' : 'Microsoft Learn'} pages watched</div></div>
        <div class="dm-kpi"><div class="v">${noMsDate ? 'Baseline' : inWindow.length}</div><div class="l">${noMsDate ? 'recorded ' + fmtDate(snap.runAt) : 'updated since ' + winLabel}</div></div>
        <div class="dm-kpi"><div class="v">${noMsDate ? fmtDate(snap.runAt) : fmtDate(mostRecent)}</div><div class="l">${noMsDate ? 'Watch started' : 'Most recent update'}</div></div>
      </div>
      <p class="dm-meta">Reflects the scan run on ${fmtDate(snap.runAt)} &middot; Source: Microsoft's own published documentation metadata${noMsDate ? ' and page content' : ' (the "last updated" date on each page)'}. Where an archived capture is unavailable, a change is reported from the available signal (published date, length, section) rather than quoted.</p>

      <div class="dm-alert" id="dmAlert" role="alert" aria-label="Documentation update summary">
        <p class="dm-alert__head"><span class="dm-alert__dot" aria-hidden="true"></span> Update summary</p>
        <p class="dm-alert__title" id="dmBannerTitle">${esc(bannerTitleFinal)}</p>
        <p class="dm-alert__body" id="dmBannerBody">${esc(bannerBody)}</p>
        <div class="dm-alert__actions">
          <a class="dm-actbtn dm-actbtn--mail" id="dmBannerEmail" href="#">&#9993; Email someone about this</a>
        </div>
      </div>
    </div>
  </section>

  <section class="wrap">
    <div class="dm-summary">
      <h2>About this feed</h2>
      <p>This page tracks factual changes to public ${noMsDate ? 'GitHub' : 'Microsoft'} documentation only. Each row records what changed on a page and the date it was detected, sourced from the documentation's own metadata. No customer, tenant, or internal information is included.</p>
    </div>

    <div class="dm-note">
      Rows are sourced from ${noMsDate ? 'the page body captured on each scan' : 'Microsoft\u2019s published "last updated" date and page metadata'}. Verbatim before/after quotes are added on later runs as archived captures become available. Absence of a row means no update was detected, never that a check failed.
    </div>

    <h2 class="dm-h">Change log</h2>
    <div class="dm-scroll">
    <table class="dm-log">
      <thead><tr><th>Page</th><th>Change detected</th><th>Details &amp; source</th><th>Date</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    </div>
${releasesBlock}
    <h2 class="dm-h">Pages we watch</h2>
    <ul class="dm-links">
${watchList}
    </ul>

    <p class="dm-disclaimer">This is an independent, community-run documentation monitor published by the Analytics Hub. It is not an official Microsoft notification service. Always confirm any change against the linked source page before acting on it. Dates shown are Microsoft's own published "last updated" values where available.</p>
  </section>
</main>
${FOOTER}
${emailScript(canonical)}
</body>
</html>`;
}

function buildRoadmapFeed(feed, snap, canonical) {
  const items = (snap.items || []).slice();
  const win = feed.windowStart || '2026-07-01';
  const inWin = items.filter(i => (i.modified || i.created || '') >= win)
    .sort((a, b) => (b.modified || b.created || '').localeCompare(a.modified || a.created || ''));
  const counts = {};
  items.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
  const launchedInWin = inWin.filter(i => i.status === 'Launched').length;
  const winLabel = fmtDate(win);
  const show = inWin.slice(0, 60);

  const rows = show.map((it, i) => {
    const color = STATUS_COLOR[it.status] || '#5a5a6e';
    const desc = (it.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&#8217;/g, "'").replace(/&mdash;|&#8212;/g, '\u2014')
      .replace(/\s+/g, ' ').trim();
    const shortDesc = desc.length > 260 ? desc.slice(0, 260).replace(/\s+\S*$/, '') + '\u2026' : desc;
    return `
        <tr id="change-${i + 1}">
          <td class="dm-page"><a href="${esc(roadmapUrl(it.id))}" target="_blank" rel="noopener">${esc(it.title)}</a> <span class="dm-tier">#${esc(it.id)}</span></td>
          <td class="dm-prev"><span class="dm-badge-status" style="background:${color}">${esc(it.status)}</span></td>
          <td class="dm-new"><p class="dm-quote">${esc(shortDesc)}</p></td>
          <td class="dm-date">${fmtDate(it.modified || it.created)}</td>
        </tr>`;
  }).join('');

  const watchNote = `      <li>Source: <a href="${esc(feed.source)}" target="_blank" rel="noopener">Microsoft 365 Roadmap API</a> \u2014 official public feed, filtered to Copilot items.</li>
      <li>Roadmap statuses: <strong>In development</strong>, <strong>Rolling out</strong>, <strong>Launched</strong>, <strong>Cancelled</strong>.</li>`;

  const bannerTitle = `${inWin.length} Copilot roadmap items updated since ${winLabel} \u2014 ${launchedInWin} now Launched`;
  const bannerBody = `Built from the official Microsoft 365 Roadmap feed (${items.length} Copilot items tracked in total: ${counts['Launched'] || 0} Launched, ${counts['Rolling out'] || 0} Rolling out, ${counts['In development'] || 0} In development). The digest below lists the ${Math.min(60, inWin.length)} most recently updated, newest first.`;

  return head(feed, canonical) + `
  <section class="dm-hero">
    <div class="wrap">
      <p class="dm-crumb"><a href="../">&larr; Community</a> &middot; Learning Feed</p>
      <h1>${esc(feed.title)}</h1>
      <p class="lede">${esc(feed.blurb)}</p>
      <div class="dm-kpis">
        <div class="dm-kpi"><div class="v">${items.length}</div><div class="l">Copilot roadmap items tracked</div></div>
        <div class="dm-kpi"><div class="v">${inWin.length}</div><div class="l">updated since ${winLabel}</div></div>
        <div class="dm-kpi"><div class="v">${counts['Launched'] || 0}</div><div class="l">Launched (all time)</div></div>
      </div>
      <p class="dm-meta">Reflects the roadmap feed pulled on ${fmtDate(snap.runAt)} &middot; Source: the official Microsoft 365 Roadmap API. Item titles, statuses and descriptions are reproduced verbatim from that feed.</p>

      <div class="dm-alert" id="dmAlert" role="alert" aria-label="Roadmap update summary">
        <p class="dm-alert__head"><span class="dm-alert__dot" aria-hidden="true"></span> Update summary</p>
        <p class="dm-alert__title" id="dmBannerTitle">${esc(bannerTitle)}</p>
        <p class="dm-alert__body" id="dmBannerBody">${esc(bannerBody)}</p>
        <div class="dm-alert__actions">
          <a class="dm-actbtn dm-actbtn--mail" id="dmBannerEmail" href="#">&#9993; Email someone about this</a>
        </div>
      </div>
    </div>
  </section>

  <section class="wrap">
    <div class="dm-summary">
      <h2>About this feed</h2>
      <p>A plain-language digest of Copilot items on the public Microsoft 365 Roadmap. Each row links to the official roadmap entry. Titles, statuses and descriptions are reproduced verbatim from the Microsoft 365 Roadmap API \u2014 no interpretation is added.</p>
    </div>

    <div class="dm-note">
      Showing the ${Math.min(60, inWin.length)} Copilot items most recently created or modified on or after ${winLabel}. Status reflects the roadmap's own value on the day of the pull.
    </div>

    <h2 class="dm-h">Recently updated Copilot roadmap items</h2>
    <div class="dm-scroll">
    <table class="dm-log">
      <thead><tr><th>Feature</th><th>Status</th><th>Description (verbatim)</th><th>Updated</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    </div>

    <h2 class="dm-h">About the source</h2>
    <ul class="dm-links">
${watchNote}
    </ul>

    <p class="dm-disclaimer">This is an independent, community-run digest published by the Analytics Hub, built from the public Microsoft 365 Roadmap feed. It is not an official Microsoft communication. Roadmap items are subject to change; always confirm status against the linked roadmap entry.</p>
  </section>
</main>
${FOOTER}
${emailScript(canonical)}
</body>
</html>`;
}

function buildOne(id) {
  const feed = loadJson(path.join(FEED_DIR, id + '.json'), null);
  if (!feed) { console.error('feed not found: ' + id); return; }
  const snap = loadJson(path.join(SNAP_DIR, id + '-latest.json'), null);
  if (!snap) { console.error('no snapshot for ' + id + ' - run scan.js first'); return; }
  const canonical = 'https://microsoft.github.io/Analytics-Hub/community/' + feed.slug + '/';
  const html = feed.mode === 'roadmap' ? buildRoadmapFeed(feed, snap, canonical) : buildDocFeed(feed, snap, canonical);
  const outDir = path.join(DOCS, feed.slug);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('built ' + feed.slug + '/index.html (' + html.length + ' bytes)');
}

if (ALL) fs.readdirSync(FEED_DIR).filter(f => f.endsWith('.json')).forEach(f => buildOne(f.replace('.json', '')));
else if (feedArg) buildOne(feedArg);
else { console.error('Usage: node build.js <feedId>|--all'); process.exit(1); }
