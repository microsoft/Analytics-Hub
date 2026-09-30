#!/usr/bin/env node
/*
 * gen-enablement-stubs.js
 *
 * Writes one tiny static page per report at choose-report/<id>/index.html.
 *
 * Why these exist: the enablement guide is a single hash-routed SPA
 * (choose-report/#r=<id>). A link unfurler (Teams, Slack, Outlook) never
 * receives the "#..." fragment, so every shared guide link previewed as the
 * same generic "Which report should I use?" card. These stubs give each report
 * a real URL (/choose-report/<id>/) that carries a unique <title> plus Open
 * Graph / Twitter tags for the preview card, then instantly forwards a human
 * visitor to the live guide at ../#r=<id>.
 *
 * The stubs are generated, never hand-edited. The guide's #mk-data island in
 * index.html stays the single source of truth: add or rename a report there,
 * re-run this script, done.
 *
 *   node scripts/gen-enablement-stubs.js
 *
 * Run from docs/choose-report/ (or anywhere - paths are resolved from __dirname).
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');            // docs/choose-report
const INDEX = path.join(ROOT, 'index.html');
const SITE = 'https://microsoft.github.io/Analytics-Hub';
const OG_FALLBACK = SITE + '/og-card.png';

/* Corrections applied to the live dataset at render time inside index.html
 * (see PENDING_DATA_FIXES there). The JSON island is a faithful copy of live
 * and is deliberately not edited, so the same fixes are mirrored here to keep
 * the stub title/image in step with what the guide actually shows. Keep this
 * in sync with PENDING_DATA_FIXES until those land in the live dataset. */
const OVERRIDES = {
  'cowork-billing-report': {
    title: 'Cowork Chargeback and Billing Report',
    preview: 'https://raw.githubusercontent.com/microsoft/CreditUsage/main/images/dashboard-preview.gif'
  }
};

function readTools() {
  const html = fs.readFileSync(INDEX, 'utf8');
  const m = html.match(/<script id="mk-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('mk-data island not found in ' + INDEX);
  const data = JSON.parse(m[1]);
  if (!Array.isArray(data.TOOLS)) throw new Error('mk-data has no TOOLS array');
  return data.TOOLS;
}

function titleOf(t) {
  const o = OVERRIDES[t.id];
  return (o && o.title) || t.title;
}
function previewOf(t) {
  const o = OVERRIDES[t.id];
  return (o && o.preview) || t.preview || '';
}

/* Minimal HTML-attribute escaping - report copy is trusted, but titles and
 * blurbs carry &, ', " and the odd < that must not break the meta tags. */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* An id is the folder name and part of a URL - only ever kebab-case in the
 * dataset, but guard against anything that could escape the directory. */
function safeId(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(id);
}

function pageFor(t) {
  const title = titleOf(t);
  const tabTitle = title + ' \u00b7 Enablement guide \u00b7 Analytics Hub';
  const desc = 'Setup and enablement guide for ' + title + ': the permissions and ' +
    'roles you need, where the data comes from, and the template to download.';
  const ogDesc = (t.blurb && String(t.blurb).trim()) || desc;
  const url = SITE + '/choose-report/' + t.id + '/';
  const guide = '../#r=' + t.id;
  const img = previewOf(t) || OG_FALLBACK;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(tabTitle)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${esc(url)}" />
  <link rel="icon" type="image/svg+xml" href="../../favicon.svg" />

  <!-- Link-preview card (Teams / Slack / Outlook / LinkedIn). These read the
       static markup, which is the whole reason this page exists. -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Analytics Hub" />
  <meta property="og:title" content="${esc(title + ' \u00b7 Enablement guide')}" />
  <meta property="og:description" content="${esc(ogDesc)}" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:image" content="${esc(img)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title + ' \u00b7 Enablement guide')}" />
  <meta name="twitter:description" content="${esc(ogDesc)}" />
  <meta name="twitter:image" content="${esc(img)}" />

  <!-- A human visitor is forwarded straight to the live guide. The meta-refresh
       is the no-JS fallback; the script keeps any query string (e.g. embed). -->
  <meta http-equiv="refresh" content="0; url=${esc(guide)}" />
  <script>
    (function () {
      try { location.replace('${guide}' + (location.search || '')); }
      catch (e) { location.href = '${guide}'; }
    })();
  </script>
  <style>
    body { font: 15px/1.6 "Segoe UI Variable","Segoe UI",system-ui,sans-serif;
      color:#1f2328; background:#faf9f8; margin:0; padding:48px 24px; text-align:center; }
    a { color:#0969da; }
  </style>
</head>
<body>
  <p>Opening the enablement guide for <strong>${esc(title)}</strong>&hellip;</p>
  <p>If you are not redirected, <a href="${esc(guide)}">open the ${esc(title)} enablement guide</a>.</p>
</body>
</html>
`;
}

function main() {
  const tools = readTools();
  let written = 0, skipped = 0;
  tools.forEach(function (t) {
    if (!safeId(t.id)) { console.warn('skip (unsafe id): ' + t.id); skipped++; return; }
    const dir = path.join(ROOT, t.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), pageFor(t), 'utf8');
    written++;
  });
  console.log('enablement stubs written: ' + written + (skipped ? (', skipped: ' + skipped) : '') +
    ' (of ' + tools.length + ' reports)');
}

main();
