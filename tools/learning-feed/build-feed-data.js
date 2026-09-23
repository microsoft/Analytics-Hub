#!/usr/bin/env node
/*
 * build-feed-data.js — Learning Feed unified data + smart-tag builder.
 *
 * Reads the snapshots scan.js already wrote and produces a single
 * docs/community/learning-feed/feed-data.json that the redesigned landing page
 * consumes: every tracked change normalized into one list, classified by
 * PRODUCT, grouped by FEED, and SMART-TAGGED for search.
 *
 * Tagging is one-time-heavy then incremental. Each change's tags are cached in
 * tools/learning-feed/tag-store.json keyed by a stable id, so the first run tags
 * everything and every run after only tags genuinely-new changes — the cheap
 * steady state we want in the nightly job. No network, no LLM: deterministic
 * rules in taxonomy.js, same principles as the rest of the scanner.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { tagText } = require('./taxonomy');

const ROOT = __dirname;
const SNAP = path.join(ROOT, 'snapshots');
const FEED_DIR = path.join(ROOT, 'feeds');
const STORE = path.join(ROOT, 'tag-store.json');
const OUT = path.join(ROOT, '..', '..', 'docs', 'community', 'learning-feed', 'feed-data.json');

function load(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }

// Friendly area label per feed id (the current tracker categories).
const AREA = {
  pricing: 'Pricing & Licensing', models: 'Model Deprecations', roadmap: 'Roadmap',
  governance: 'Admin & Governance', ghcopilot: 'GitHub Copilot Billing',
  compliance: 'Compliance & Residency', viva: 'Viva Insights', finops: 'FinOps / FOCUS',
  purview: 'Purview Audit', m365usage: 'M365 Usage Reports', copilotstudio: 'Copilot Studio',
  messagecenter: 'Message Center'
};
// Badge + slug per feed id (mirror of the landing-page card badges).
const BADGE = {
  'cowork-document-monitor': 'Doc tracker', 'pricing-licensing-watch': 'Price tracker',
  'model-deprecation-tracker': 'Retirement tracker', 'roadmap-digest': 'What-shipped digest',
  'message-center-watch': 'Admin notices', 'admin-governance-watch': 'Control tracker',
  'github-copilot-billing-watch': 'Credits tracker', 'compliance-data-residency-watch': 'Compliance tracker',
  'viva-insights-watch': 'Insights tracker', 'finops-focus-watch': 'Cost standard tracker',
  'purview-copilot-audit-watch': 'Audit tracker', 'm365-copilot-usage-reports-watch': 'Usage tracker',
  'copilot-studio-agents-watch': 'Agents tracker'
};

/* Product classifier. Order matters: most specific first. */
function classify(text, feedId) {
  const t = (text || '').toLowerCase();
  const has = (s) => t.indexOf(s) >= 0;
  if (has('powerpoint')) return 'Copilot in PowerPoint';
  if (has('excel')) return 'Copilot in Excel';
  if (has(' word') || has('in word') || has('agent mode in word')) return 'Copilot in Word';
  if (has('outlook')) return 'Copilot in Outlook';
  if (has('onenote')) return 'Copilot in OneNote';
  if (has('loop')) return 'Copilot in Loop';
  if (has('teams')) return 'Copilot in Teams';
  if (has('sharepoint')) return 'Copilot in SharePoint';
  if (has('cowork')) return 'Cowork';
  if (has('work iq') || has('workiq')) return 'Work IQ';
  if (has('copilot studio') || feedId === 'copilotstudio') return 'Copilot Studio';
  if (has('viva') || feedId === 'viva') return 'Viva Insights';
  if (has('purview') || feedId === 'purview') return 'Purview';
  if (has('github copilot') || feedId === 'ghcopilot') return 'GitHub Copilot';
  if (has('researcher') || has('agent 365') || has('declarative agent') || has('autonomous agent')) return 'Agents';
  if (has('copilot chat')) return 'Copilot Chat';
  if (has('focus') || feedId === 'finops') return 'FinOps / FOCUS';
  if (has('admin center') || has('cost management') || has('usage-based billing') || has('copilot credit') ||
      has('spending polic') || has('pay-as-you-go') || has('usage report') || has('billing') ||
      feedId === 'pricing' || feedId === 'm365usage' || feedId === 'governance' || feedId === 'messagecenter') {
    return 'Microsoft 365 admin center (MAC)';
  }
  if (has('model') || feedId === 'models') return 'Models';
  return 'Microsoft 365 Copilot (general)';
}

function generate() {
  const changes = [];
  const docFeeds = ['pricing', 'models', 'governance', 'ghcopilot', 'compliance', 'viva', 'finops', 'purview', 'm365usage', 'copilotstudio'];

  for (const id of docFeeds) {
    const snap = load(path.join(SNAP, id + '-latest.json'), null);
    if (!snap || !snap.pages) continue;
    for (const p of snap.pages) {
      if (!p.ok || !p.msDate) continue;
      const date = String(p.msDate).slice(0, 10);
      const product = classify((p.title || '') + ' ' + (p.url || ''), id);
      changes.push({
        date, area: AREA[id] || id, product, title: p.title || p.id,
        change: p.isNew ? 'New page added to the watch' : 'Documentation updated (ms.date moved)',
        before: p.isNew ? '(not previously tracked)' : 'Prior published version',
        after: 'Updated ' + date, severity: p.isNew ? 'major' : 'minor', url: p.url, kind: 'doc',
        _src: [p.title, p.why, (p.sections || []).join(' ')].join(' ')
      });
    }
  }

  const rm = load(path.join(SNAP, 'roadmap-latest.json'), null);
  if (rm && rm.items) for (const it of rm.items) {
    const date = String(it.modified || it.created || '').slice(0, 10);
    if (!date) continue;
    const tagStr = (it.tags || []).join(' ');
    const product = classify(it.title + ' ' + tagStr, 'roadmap');
    changes.push({
      date, area: 'Roadmap', product, title: it.title,
      change: 'Roadmap status: ' + it.status, before: '', after: it.status,
      severity: it.status === 'Launched' ? 'major' : 'minor',
      url: 'https://www.microsoft.com/en-us/microsoft-365/roadmap?featureid=' + it.id, kind: 'roadmap',
      _src: [it.title, it.description, tagStr, it.status].join(' ')
    });
  }

  const mc = load(path.join(SNAP, 'messagecenter-latest.json'), null);
  if (mc && mc.items) for (const it of mc.items) {
    const date = String(it.modified || it.created || '').slice(0, 10);
    const product = classify(it.title + ' ' + (it.services || []).join(' '), 'messagecenter');
    changes.push({
      date, area: 'Message Center', product, title: it.title + ' (' + it.id + ')',
      change: 'Message Center: ' + it.status, before: '', after: it.status,
      severity: it.isMajor ? 'major' : 'minor', url: it.url, kind: 'mc',
      _src: [it.title, (it.services || []).join(' '), it.status, it.category].join(' ')
    });
  }

  changes.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // ---- smart tags (incremental via persistent store) ----
  const store = load(STORE, {});
  let tagged = 0, cached = 0, dirty = false;
  const facets = {};
  for (const c of changes) {
    const sid = (c.kind || 'x') + '|' + (c.url || c.title || '');
    let tags = store[sid];
    if (tags) cached++;
    else { tags = tagText(c._src || [c.title, c.change, c.area, c.product].join(' ')); store[sid] = tags; tagged++; dirty = true; }
    c.tags = tags; delete c._src;
    for (const t of tags) facets[t] = (facets[t] || 0) + 1;
  }
  if (dirty) fs.writeFileSync(STORE, JSON.stringify(store, null, 0));

  // ---- pages monitored per product (full footprint) ----
  const monitored = {};
  const countMon = (p) => { monitored[p] = (monitored[p] || 0) + 1; };
  for (const id of docFeeds) {
    const snap = load(path.join(SNAP, id + '-latest.json'), null);
    if (!snap || !snap.pages) continue;
    for (const p of snap.pages) if (p.ok) countMon(classify((p.title || '') + ' ' + (p.url || ''), id));
  }
  if (rm && rm.items) for (const it of rm.items) countMon(classify(it.title + ' ' + (it.tags || []).join(' '), 'roadmap'));
  if (mc && mc.items) for (const it of mc.items) countMon(classify(it.title + ' ' + (it.services || []).join(' '), 'messagecenter'));

  // ---- product rollup ----
  const byProduct = {};
  for (const c of changes) {
    const p = byProduct[c.product] || (byProduct[c.product] = { product: c.product, total: 0, areas: {}, latest: '' });
    p.total++; p.areas[c.area] = (p.areas[c.area] || 0) + 1; if (c.date > p.latest) p.latest = c.date;
  }
  const products = Object.values(byProduct).map(p => ({
    product: p.product, total: p.total, monitored: monitored[p.product] || 0, latest: p.latest,
    areas: Object.keys(p.areas).sort((a, b) => p.areas[b] - p.areas[a])
  })).sort((a, b) => b.total - a.total);

  // ---- feed rollup (from status.json + feed blurbs) ----
  const status = load(path.join(ROOT, '..', '..', 'docs', 'community', 'learning-feed', 'status.json'), { feeds: {} });
  const blurbBySlug = {};
  for (const ff of fs.readdirSync(FEED_DIR)) {
    if (!ff.endsWith('.json') || ff.endsWith('.discovered.json') || ff.endsWith('.wayback.json')) continue;
    const d = load(path.join(FEED_DIR, ff), null);
    if (d && d.slug) blurbBySlug[d.slug] = d.blurb || '';
  }
  const feeds = Object.keys(status.feeds || {}).map(slug => {
    const f = status.feeds[slug], lc = f.lastChange || {};
    return {
      slug, title: f.title, badge: BADGE[slug] || 'Tracker', mode: f.mode || 'doc',
      pagesWatched: f.pagesWatched || 0, updatedInWindow: f.updatedInWindow || 0, windowStart: f.windowStart || '',
      severity: lc.severity || 'none', date: lc.date || '', count: lc.count || 0, blurb: blurbBySlug[slug] || ''
    };
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const facetList = Object.keys(facets).map(t => ({ tag: t, count: facets[t] })).sort((a, b) => b.count - a.count);
  const manifest = { generatedAt: new Date().toISOString(), count: changes.length, facets: facetList, products, feeds, changes };
  fs.writeFileSync(OUT, JSON.stringify(manifest));
  return { manifest, tagged, cached, bytes: fs.statSync(OUT).size };
}

if (require.main === module) {
  const r = generate();
  console.log('feed-data.json written: ' + r.manifest.count + ' changes, ' + r.manifest.products.length + ' products, ' +
    r.manifest.feeds.length + ' feeds, ' + r.manifest.facets.length + ' tags (' + (r.bytes / 1024).toFixed(0) + ' KB).');
  console.log('Tagging: ' + r.tagged + ' newly tagged, ' + r.cached + ' from cache.');
}

module.exports = { generate };
