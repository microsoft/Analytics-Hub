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
    .dm-scope { max-width: 76ch; font-size: .84rem; color: var(--text-soft, #5a6470); background: color-mix(in srgb, var(--accent, #0078d4) 5%, transparent); border-left: 3px solid var(--accent, #0078d4); border-radius: 8px; padding: .5rem .7rem; margin: .2rem 0 .2rem; }
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
    /* Roadmap filter bar (status chips + timeframe + search) */
    .rm-filter { position: sticky; top: 0; z-index: 6; background: var(--surface, #fff); border: 1px solid var(--border, #e2e6ea); border-radius: 12px; padding: 11px 13px; margin: 1.1rem 0 .4rem; display: flex; flex-wrap: wrap; gap: 12px 14px; align-items: center; }
    .rm-flabel { font-size: .72rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--text-soft, #5a6470); margin-right: -6px; }
    .rm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .rm-chip { font-size: .76rem; font-weight: 700; padding: 5px 11px; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; user-select: none; color: var(--rmc, #5a6470); border: 1px solid color-mix(in srgb, var(--rmc, #8a8a99) 45%, var(--border, #e2e6ea)); background: var(--surface, #fff); transition: background .12s ease, color .12s ease; }
    .rm-chip:hover { border-color: var(--rmc, #8a8a99); }
    .rm-chip[aria-pressed="true"] { background: var(--rmc, #0067c0); color: #fff; border-color: transparent; }
    .rm-chip .rm-c { font-weight: 600; font-size: .72rem; opacity: .7; }
    .rm-chip[aria-pressed="true"] .rm-c { opacity: .85; }
    .rm-tools { display: flex; gap: 10px; align-items: center; margin-left: auto; flex-wrap: wrap; }
    .rm-search { font-size: .85rem; padding: 6px 10px; border: 1px solid var(--border, #e2e6ea); border-radius: 8px; min-width: 170px; background: var(--surface, #fff); color: inherit; }
    .rm-range { font-size: .85rem; padding: 6px 10px; border: 1px solid var(--border, #e2e6ea); border-radius: 8px; background: var(--surface, #fff); color: inherit; }
    .rm-count { font-size: .82rem; color: var(--text-soft, #5a6470); white-space: nowrap; font-variant-numeric: tabular-nums; }
    .rm-empty { text-align: center; color: var(--text-soft, #5a6470); padding: 22px; font-size: .9rem; }
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

function roadmapFilterScript() {
  return `
<script>
/* Roadmap digest — client-side status / timeframe / text filtering over the full
   set of tracked Copilot items (no server needed). Every row carries data-status,
   data-date and data-search; this shows/hides rows and keeps a live count. */
(function () {
  'use strict';
  var chips = Array.prototype.slice.call(document.querySelectorAll('#rmChips .rm-chip'));
  var rows = Array.prototype.slice.call(document.querySelectorAll('table.dm-log tbody tr[data-status]'));
  var search = document.getElementById('rmSearch');
  var range = document.getElementById('rmRange');
  var count = document.getElementById('rmCount');
  var tbody = rows.length ? rows[0].parentNode : null;
  var allChip = chips.filter(function (c) { return c.dataset.status === '__all__'; })[0];
  var statusChips = chips.filter(function (c) { return c.dataset.status !== '__all__'; });
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function cutoff() { var v = range ? range.value : 'all'; if (v === '30') return daysAgo(30); if (v === '90') return daysAgo(90); if (v === '365') return daysAgo(365); if (v === 'win') return '2026-07-01'; return null; }
  function activeSet() { var s = {}; statusChips.forEach(function (c) { s[c.dataset.status] = c.getAttribute('aria-pressed') === 'true'; }); return s; }
  function syncAll() { if (!allChip) return; var all = statusChips.every(function (c) { return c.getAttribute('aria-pressed') === 'true'; }); allChip.setAttribute('aria-pressed', all ? 'true' : 'false'); }
  function apply() {
    var set = activeSet(); var cut = cutoff(); var q = (search ? search.value : '').trim().toLowerCase(); var shown = 0;
    rows.forEach(function (tr) {
      var ok = !!set[tr.dataset.status];
      if (ok && cut) ok = (tr.dataset.date || '') >= cut;
      if (ok && q) ok = (tr.dataset.search || '').indexOf(q) >= 0;
      tr.style.display = ok ? '' : 'none';
      if (ok) shown++;
    });
    if (count) count.textContent = 'Showing ' + shown + ' of ' + rows.length + ' item' + (rows.length === 1 ? '' : 's');
    var er = document.getElementById('rmEmptyRow');
    if (shown === 0) { if (!er && tbody) { er = document.createElement('tr'); er.id = 'rmEmptyRow'; er.innerHTML = '<td colspan="4" class="rm-empty">No roadmap items match these filters.</td>'; tbody.appendChild(er); } }
    else if (er && er.parentNode) { er.parentNode.removeChild(er); }
  }
  statusChips.forEach(function (c) { c.addEventListener('click', function () { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); syncAll(); apply(); }); });
  if (allChip) allChip.addEventListener('click', function () {
    var turnOn = allChip.getAttribute('aria-pressed') !== 'true' || statusChips.some(function (c) { return c.getAttribute('aria-pressed') !== 'true'; });
    statusChips.forEach(function (c) { c.setAttribute('aria-pressed', turnOn ? 'true' : 'false'); });
    allChip.setAttribute('aria-pressed', turnOn ? 'true' : 'false'); apply();
  });
  if (search) search.addEventListener('input', apply);
  if (range) range.addEventListener('change', apply);
  apply();
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
const MC_COLOR = { 'Plan for change': '#8661c5', 'Stay informed': '#0067c0', 'Prevent or fix issues': '#c50f1f' };

function buildDocFeed(feed, snap, canonical) {
  const pages = (snap.pages || []).filter(p => p.ok);
  const inWindow = pages.filter(p => p.inWindow).sort((a, b) => (b.msDate || '').localeCompare(a.msDate || ''));
  const mostRecent = inWindow[0] ? inWindow[0].msDate : (pages.map(p => p.msDate).filter(Boolean).sort().pop());
  const noMsDate = !!feed.noMsDate;
  const winLabel = fmtDate(feed.windowStart);
  // Optional Wayback "before" enrichment (from backfill-wayback.js).
  const wayback = (function () { try { return JSON.parse(fs.readFileSync(path.join(FEED_DIR, feed.id + '.wayback.json'), 'utf8')).pages || {}; } catch (e) { return {}; } })();
  function beforeSnippet(pageId) {
    const w = wayback[pageId];
    if (!w || !w.beforeText) return '';
    const snippet = w.beforeText.length > 480 ? w.beforeText.slice(0, 480).replace(/\s+\S*$/, '') + '\u2026' : w.beforeText;
    return `<p class="dm-quote" style="opacity:.8"><strong>Archived ${fmtDate(w.archivedDate)}</strong> (before the change), via the <a href="${esc(w.archivedUrl)}" target="_blank" rel="noopener">Internet Archive</a>: \u201c${esc(snippet)}\u201d</p>`;
  }

  const curated = pages.filter(p => !p.discovered);
  const discoveredPages = pages.filter(p => p.discovered);
  const curatedInWindow = inWindow.filter(p => !p.discovered);
  const discoveredInWindow = inWindow.filter(p => p.discovered);
  const newPages = pages.filter(p => p.isNew);

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
  } else {
    // Change log leads with the curated (highest-stakes) pages and any newly
    // discovered pages. The complete watched set is listed under "Pages we watch".
    const logPages = curatedInWindow.slice();
    newPages.forEach(p => { if (!logPages.find(x => x.id === p.id)) logPages.push(p); });
    logPages.sort((a, b) => (b.msDate || '').localeCompare(a.msDate || ''));
    if (logPages.length) {
      rows = logPages.map((p, i) => `
        <tr id="change-${i + 1}">
          <td class="dm-page"><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>${p.isNew ? ' <span class="dm-badge-new">NEW PAGE</span>' : ''}</td>
          <td class="dm-prev"><span class="dm-badge-new">${p.isNew ? 'NEWLY DISCOVERED' : 'UPDATED IN WINDOW'}</span>
            <p>${p.isNew ? 'This page newly appeared in the documentation tree for this product area and has been added to the watch. ' : ''}Microsoft's published "last updated" date for this page is <strong>${fmtDate(p.msDate)}</strong>, which falls within the tracking window that begins ${winLabel}.${beforeSnippet(p.id) ? '' : ' Verbatim before/after text will be added from an archived capture as one becomes available.'}</p>
            ${beforeSnippet(p.id)}
          </td>
          <td class="dm-new">
            <p>${esc(p.why)}</p>
            <p class="dm-tier">Source signal: ms.date ${esc((p.msDate || '').slice(0, 10))}${p.gitCommit ? ' \u00b7 git commit ' + esc(String(p.gitCommit).slice(0, 8)) : ''} \u00b7 current length ${esc(p.wordCount || (p.bodyLen + ' chars'))} words.</p>
          </td>
          <td class="dm-date">${fmtDate(p.msDate)}</td>
        </tr>`).join('');
    } else {
      rows = `<tr><td colspan="4">No curated page has a Microsoft-published update dated on or after ${winLabel}. The daily scan will log changes as they occur across all ${pages.length} watched pages.</td></tr>`;
    }
  }

  // "Pages we watch" = the COMPLETE footprint (curated + auto-discovered),
  // so readers can see exactly what is and isn't covered.
  const renderWatchItem = (p) => {
    const badge = p.inWindow ? ' <span class="dm-badge-new" style="font-size:.6rem">since ' + winLabel + '</span>' : '';
    const date = p.msDate ? ' <span class="dm-tier">(updated ' + fmtDate(p.msDate) + ')</span>' : (noMsDate ? '' : '');
    return `      <li><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>${date}${badge}</li>`;
  };
  const curatedList = curated.slice().sort((a, b) => (a.tier || 9) - (b.tier || 9)).map(renderWatchItem).join('\n');
  const discoveredList = discoveredPages.slice().sort((a, b) => (b.msDate || '').localeCompare(a.msDate || '')).map(renderWatchItem).join('\n');
  const watchList = curatedList + (discoveredPages.length ? '\n' + discoveredList : '');

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
    : `The change log below leads with the ${curated.length} curated, highest-stakes pages${discoveredPages.length ? `, and the full watched set of ${pages.length} pages (auto-discovered daily from the product's documentation tree) is listed under "Pages we watch."` : '.'}${newPages.length ? ` ${newPages.length} page(s) newly appeared in the documentation tree this run.` : ''}`;
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
      ${feed.scopeNote ? `<p class="dm-scope">${esc(feed.scopeNote)}</p>` : ''}
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
    <p class="dm-note">The complete set of ${pages.length} pages under daily watch for this area${discoveredPages.length ? ` \u2014 ${curated.length} curated (highest-stakes, listed first) and ${discoveredPages.length} auto-discovered from the product's documentation tree` : ''}. Pages updated since ${winLabel} are badged. A page appearing or disappearing here is itself a tracked signal.</p>
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
  const byDate = (a, b) => (b.modified || b.created || '').localeCompare(a.modified || a.created || '');
  const inWin = items.filter(i => (i.modified || i.created || '') >= win).sort(byDate);
  const counts = {};
  items.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
  const launchedInWin = inWin.filter(i => i.status === 'Launched').length;
  const winLabel = fmtDate(win);
  // Render the COMPLETE tracked set, newest first — the table is filtered
  // client-side by status / timeframe / text, so no history is thrown away.
  const all = items.slice().sort(byDate);

  const rows = all.map((it, i) => {
    const color = STATUS_COLOR[it.status] || '#5a5a6e';
    const desc = (it.description || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&#8217;/g, "'").replace(/&mdash;|&#8212;/g, '\u2014')
      .replace(/\s+/g, ' ').trim();
    const shortDesc = desc.length > 260 ? desc.slice(0, 260).replace(/\s+\S*$/, '') + '\u2026' : desc;
    const dateISO = (it.modified || it.created || '').slice(0, 10);
    const searchKey = esc((it.title + ' #' + it.id).toLowerCase());
    return `
        <tr id="change-${i + 1}" data-status="${esc(it.status)}" data-date="${esc(dateISO)}" data-search="${searchKey}">
          <td class="dm-page"><a href="${esc(roadmapUrl(it.id))}" target="_blank" rel="noopener">${esc(it.title)}</a> <span class="dm-tier">#${esc(it.id)}</span></td>
          <td class="dm-prev"><span class="dm-badge-status" style="background:${color}">${esc(it.status)}</span></td>
          <td class="dm-new"><p class="dm-quote">${esc(shortDesc)}</p></td>
          <td class="dm-date">${fmtDate(it.modified || it.created)}</td>
        </tr>`;
  }).join('');

  // Status filter chips, ordered by lifecycle, each coloured to match its badge.
  const chipOrder = ['In development', 'Rolling out', 'Launched', 'Cancelled'];
  const statusChips = chipOrder.filter(s => counts[s]).map(s =>
    `<button type="button" class="rm-chip" data-status="${esc(s)}" aria-pressed="true" style="--rmc:${STATUS_COLOR[s] || '#5a5a6e'}">${esc(s)} <span class="rm-c">${counts[s]}</span></button>`
  ).join('\n        ');
  const filterBar = `
    <div class="rm-filter" role="group" aria-label="Filter roadmap items">
      <span class="rm-flabel">Status</span>
      <div class="rm-chips" id="rmChips">
        <button type="button" class="rm-chip" data-status="__all__" aria-pressed="true" style="--rmc:#0067c0">All <span class="rm-c">${all.length}</span></button>
        ${statusChips}
      </div>
      <div class="rm-tools">
        <input id="rmSearch" class="rm-search" type="search" placeholder="Search feature or #ID\u2026" aria-label="Search roadmap items by title or ID" />
        <select id="rmRange" class="rm-range" aria-label="Filter by timeframe">
          <option value="all" selected>All time (since 2024)</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="win">Since ${winLabel}</option>
          <option value="365">Last 12 months</option>
        </select>
        <span class="rm-count" id="rmCount"></span>
      </div>
    </div>`;

  const watchNote = `      <li>Source: <a href="${esc(feed.source)}" target="_blank" rel="noopener">Microsoft 365 Roadmap API</a> \u2014 official public feed, filtered to Copilot items.</li>
      <li>Roadmap statuses: <strong>In development</strong>, <strong>Rolling out</strong>, <strong>Launched</strong>, <strong>Cancelled</strong>.</li>`;

  const bannerTitle = `${inWin.length} Copilot roadmap items updated since ${winLabel} \u2014 ${launchedInWin} now Launched`;
  const bannerBody = `Built from the official Microsoft 365 Roadmap feed. All ${items.length} tracked Copilot items are listed below (${counts['Launched'] || 0} Launched, ${counts['Rolling out'] || 0} Rolling out, ${counts['In development'] || 0} In development, ${counts['Cancelled'] || 0} Cancelled), newest first \u2014 filter by status or timeframe to go back as far as ${fmtDate(all[all.length - 1] ? (all[all.length - 1].modified || all[all.length - 1].created) : win)}.`;

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
      Every tracked Copilot item is listed, newest first. Use the <strong>Status</strong> chips to show only <em>In development</em>, <em>Rolling out</em>, <em>Launched</em> or <em>Cancelled</em> items, the timeframe menu to reach further back, or search by feature name or roadmap #ID. Status reflects the roadmap's own value on the day of the pull.
    </div>
${filterBar}

    <h2 class="dm-h">Copilot roadmap items</h2>
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
${roadmapFilterScript()}
</body>
</html>`;
}

function buildMessageCenterFeed(feed, snap, canonical) {
  const items = (snap.items || []).slice();
  const win = feed.windowStart || '2026-06-01';
  const byDate = (a, b) => (b.modified || b.created || '').localeCompare(a.modified || a.created || '');
  const inWin = items.filter(i => (i.modified || i.created || '') >= win).sort(byDate);
  const counts = {};
  items.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
  const majorCount = items.filter(i => i.isMajor).length;
  const winLabel = fmtDate(win);
  const all = items.slice().sort(byDate);

  const rows = all.map((it, i) => {
    const color = MC_COLOR[it.status] || '#5a5a6e';
    const svc = (it.services || []).join(', ');
    const svcShort = svc.length > 90 ? svc.slice(0, 90).replace(/,?\s+\S*$/, '') + '\u2026' : svc;
    const dateISO = (it.modified || it.created || '').slice(0, 10);
    const searchKey = esc((it.title + ' ' + it.id + ' ' + svc).toLowerCase());
    const major = it.isMajor ? ' <span class="dm-badge-status" style="background:#c50f1f">Major</span>' : '';
    return `
        <tr id="change-${i + 1}" data-status="${esc(it.status)}" data-date="${esc(dateISO)}" data-search="${searchKey}">
          <td class="dm-page"><a href="${esc(it.url)}" target="_blank" rel="noopener">${esc(it.title)}</a> <span class="dm-tier">${esc(it.id)}</span></td>
          <td class="dm-prev"><span class="dm-badge-status" style="background:${color}">${esc(it.status)}</span>${major}</td>
          <td class="dm-new"><p class="dm-quote">${esc(svcShort)}</p></td>
          <td class="dm-date">${fmtDate(it.modified || it.created)}</td>
        </tr>`;
  }).join('');

  const chipOrder = ['Plan for change', 'Stay informed', 'Prevent or fix issues'];
  const statusChips = chipOrder.filter(s => counts[s]).map(s =>
    `<button type="button" class="rm-chip" data-status="${esc(s)}" aria-pressed="true" style="--rmc:${MC_COLOR[s] || '#5a5a6e'}">${esc(s)} <span class="rm-c">${counts[s]}</span></button>`
  ).join('\n        ');
  const filterBar = `
    <div class="rm-filter" role="group" aria-label="Filter Message center posts">
      <span class="rm-flabel">Category</span>
      <div class="rm-chips" id="rmChips">
        <button type="button" class="rm-chip" data-status="__all__" aria-pressed="true" style="--rmc:#0067c0">All <span class="rm-c">${all.length}</span></button>
        ${statusChips}
      </div>
      <div class="rm-tools">
        <input id="rmSearch" class="rm-search" type="search" placeholder="Search post, MC ID or service\u2026" aria-label="Search Message center posts" />
        <select id="rmRange" class="rm-range" aria-label="Filter by timeframe">
          <option value="all" selected>All tracked</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="win">Since ${winLabel}</option>
          <option value="365">Last 12 months</option>
        </select>
        <span class="rm-count" id="rmCount"></span>
      </div>
    </div>`;

  const attr = feed.attribution || {};
  const watchNote = `      <li>Source: <a href="${esc(attr.url || feed.source)}" target="_blank" rel="noopener">${esc(attr.repo || 'merill/mc')}</a> \u2014 the public, ${esc(attr.license || 'MIT')}-licensed M365 Message Center Archive, filtered to Copilot cost &amp; Cowork posts.</li>
      <li>Categories: <strong>Plan for change</strong>, <strong>Stay informed</strong>. Each row links to its Message center post on the public mirror.</li>`;

  const bannerTitle = `${inWin.length} Copilot cost &amp; Cowork Message center posts since ${winLabel} \u2014 ${majorCount} major`;
  const bannerBody = `Built from the public merill/mc Message Center Archive, filtered to Copilot Cowork, Copilot Credits, usage-based billing and Cost management. All ${items.length} tracked posts are listed below (${counts['Plan for change'] || 0} Plan for change, ${counts['Stay informed'] || 0} Stay informed), newest first. Message center content varies by tenant \u2014 always confirm against your own tenant's Message center.`;

  return head(feed, canonical) + `
  <section class="dm-hero">
    <div class="wrap">
      <p class="dm-crumb"><a href="../">&larr; Community</a> &middot; Learning Feed</p>
      <h1>${esc(feed.title)}</h1>
      <p class="lede">${esc(feed.blurb)}</p>
      <p class="dm-scope">Message center posts vary by tenant. This digest is built from a public archive for reference &mdash; always use your own tenant's Message center as the source of truth.</p>
      <div class="dm-kpis">
        <div class="dm-kpi"><div class="v">${items.length}</div><div class="l">Copilot cost/Cowork posts tracked</div></div>
        <div class="dm-kpi"><div class="v">${inWin.length}</div><div class="l">since ${winLabel}</div></div>
        <div class="dm-kpi"><div class="v">${majorCount}</div><div class="l">major changes</div></div>
      </div>
      <p class="dm-meta">Reflects the archive pulled on ${fmtDate(snap.runAt)} &middot; Source: ${esc(attr.repo || 'merill/mc')} (${esc(attr.license || 'MIT')}). Titles, categories and dates are reproduced from that archive.</p>

      <div class="dm-alert" id="dmAlert" role="alert" aria-label="Message center update summary">
        <p class="dm-alert__head"><span class="dm-alert__dot" aria-hidden="true"></span> Update summary</p>
        <p class="dm-alert__title" id="dmBannerTitle">${bannerTitle}</p>
        <p class="dm-alert__body" id="dmBannerBody">${bannerBody}</p>
        <div class="dm-alert__actions">
          <a class="dm-actbtn dm-actbtn--mail" id="dmBannerEmail" href="#">&#9993; Email someone about this</a>
        </div>
      </div>
    </div>
  </section>

  <section class="wrap">
    <div class="dm-summary">
      <h2>About this feed</h2>
      <p>A plain-language index of Microsoft 365 Message center posts touching Copilot Cowork, Copilot Credits, usage-based billing and Cost management. Each row links to the full post on the public Message Center Archive. This is not an official Microsoft communication.</p>
    </div>

    <div class="dm-note">
      Every tracked post is listed, newest first. Use the <strong>Category</strong> chips, the timeframe menu, or search by title, MC ID or service. Message center rollout dates and availability vary by tenant.
    </div>
${filterBar}

    <h2 class="dm-h">Copilot cost &amp; Cowork Message center posts</h2>
    <div class="dm-scroll">
    <table class="dm-log">
      <thead><tr><th>Post</th><th>Category</th><th>Services</th><th>Updated</th></tr></thead>
      <tbody>
${rows}
      </tbody>
    </table>
    </div>

    <h2 class="dm-h">About the source</h2>
    <ul class="dm-links">
${watchNote}
    </ul>

    <p class="dm-disclaimer">This is an independent, community-run index published by the Analytics Hub, built from the public, MIT-licensed <a href="${esc(attr.url || 'https://github.com/merill/mc')}" target="_blank" rel="noopener">${esc(attr.repo || 'merill/mc')}</a> Message Center Archive. It is not an official Microsoft communication. Message center posts vary by tenant and are subject to change; always confirm against your own tenant's Message center.</p>
  </section>
</main>
${FOOTER}
${emailScript(canonical)}
${roadmapFilterScript()}
</body>
</html>`;
}

function buildOne(id) {
  const feed = loadJson(path.join(FEED_DIR, id + '.json'), null);
  if (!feed) { console.error('feed not found: ' + id); return; }
  const snap = loadJson(path.join(SNAP_DIR, id + '-latest.json'), null);
  if (!snap) { console.error('no snapshot for ' + id + ' - run scan.js first'); return; }
  const canonical = 'https://microsoft.github.io/Analytics-Hub/community/' + feed.slug + '/';
  const html = feed.mode === 'roadmap' ? buildRoadmapFeed(feed, snap, canonical)
    : feed.mode === 'messagecenter' ? buildMessageCenterFeed(feed, snap, canonical)
    : buildDocFeed(feed, snap, canonical);
  const outDir = path.join(DOCS, feed.slug);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log('built ' + feed.slug + '/index.html (' + html.length + ' bytes)');
}

if (ALL) fs.readdirSync(FEED_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.discovered.json')).forEach(f => buildOne(f.replace('.json', '')));
else if (feedArg) buildOne(feedArg);
else { console.error('Usage: node build.js <feedId>|--all'); process.exit(1); }
