/*
 * search-index.js — Cross-feed change search index for the MS Learn Watcher.
 *
 * The landing page lists 12 feeds, each of which watches dozens–hundreds of
 * Microsoft/GitHub documentation pages (plus the 642-item roadmap). There was no
 * way to ask "where has <topic> changed?" across ALL of them at once. This
 * generator flattens every watched page and every roadmap item from the
 * snapshots scan.js already writes into a single, compact search-index.json that
 * a dedicated search page (docs/community/learning-feed/search/) loads once and
 * filters entirely client-side.
 *
 * It never fetches the network — it only reads the on-disk snapshots. Each entry
 * is deliberately small (short keys, capped description) so ~1,300 entries stay
 * well under ~1 MB. Keys:
 *   f  feed slug            u  source URL           d  date (ms.date / modified)
 *   t  title               w  updated-in-window?    n  newly discovered?
 *   c  curated? (else auto-discovered)              s  roadmap status (roadmap only)
 *   y  why / description snippet (<=180 chars)      k  kind: 'doc' | 'roadmap'
 * The top-level `feeds` map carries per-feed display metadata (title, badge,
 * windowStart) so the search page can render and group results without a second
 * fetch. Nothing here is interpreted or fabricated — titles, dates, statuses and
 * descriptions are reproduced verbatim from the snapshots.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FEED_DIR = path.join(ROOT, 'feeds');
const SNAP_DIR = path.join(ROOT, 'snapshots');
const OUT = path.join(ROOT, '..', '..', 'docs', 'community', 'learning-feed', 'search-index.json');

// Short human badge per feed, matching the landing-page card badges.
const BADGES = {
  'pricing-licensing-watch': 'Price',
  'model-deprecation-tracker': 'Retirement',
  'roadmap-digest': 'Roadmap',
  'admin-governance-watch': 'Governance',
  'github-copilot-billing-watch': 'GH credits',
  'compliance-data-residency-watch': 'Compliance',
  'viva-insights-watch': 'Viva',
  'finops-focus-watch': 'FinOps',
  'purview-copilot-audit-watch': 'Audit',
  'm365-copilot-usage-reports-watch': 'Usage',
  'copilot-studio-agents-watch': 'Agents'
};

function loadJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function dstr(d) { return d ? String(d).slice(0, 10) : null; }

function clean(html, cap) {
  const t = String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&#8217;/g, "'").replace(/&mdash;|&#8212;/g, '\u2014')
    .replace(/\s+/g, ' ').trim();
  if (cap && t.length > cap) return t.slice(0, cap).replace(/\s+\S*$/, '') + '\u2026';
  return t;
}

function generate() {
  const feedFiles = fs.readdirSync(FEED_DIR)
    .filter(f => f.endsWith('.json') && !f.endsWith('.discovered.json') && !f.endsWith('.wayback.json'));

  const feeds = {};
  const entries = [];

  for (const ff of feedFiles) {
    const feed = loadJson(path.join(FEED_DIR, ff), null);
    if (!feed || !feed.slug) continue;
    const snap = loadJson(path.join(SNAP_DIR, feed.id + '-latest.json'), null);
    if (!snap) continue;
    const isRoadmap = feed.mode === 'roadmap';

    feeds[feed.slug] = {
      title: feed.title,
      badge: BADGES[feed.slug] || 'Feed',
      windowStart: feed.windowStart,
      noMsDate: !!feed.noMsDate,
      mode: isRoadmap ? 'roadmap' : 'doc',
      lastScan: snap.runAt
    };

    if (isRoadmap) {
      (snap.items || []).forEach(it => {
        const date = dstr(it.modified || it.created);
        entries.push({
          f: feed.slug, k: 'roadmap',
          t: it.title, u: 'https://www.microsoft.com/en-us/microsoft-365/roadmap?featureid=' + encodeURIComponent(it.id),
          d: date, w: !!(date && date >= feed.windowStart), n: false, c: true,
          s: it.status, y: clean(it.description, 180), id: it.id
        });
      });
    } else {
      (snap.pages || []).filter(p => p.ok).forEach(p => {
        entries.push({
          f: feed.slug, k: 'doc',
          t: p.title, u: p.url,
          d: dstr(p.msDate), w: !!p.inWindow, n: !!p.isNew, c: !p.discovered,
          s: null, y: clean(p.why, 180)
        });
      });
    }
  }

  // Newest-first overall, undated (GitHub) entries last but kept.
  entries.sort((a, b) => (b.d || '').localeCompare(a.d || ''));

  const manifest = {
    generatedAt: new Date().toISOString(),
    feedCount: Object.keys(feeds).length,
    entryCount: entries.length,
    feeds: feeds,
    entries: entries
  };
  fs.writeFileSync(OUT, JSON.stringify(manifest));
  return manifest;
}

if (require.main === module) {
  const m = generate();
  const bytes = fs.statSync(OUT).size;
  console.log('search-index.json written: ' + m.entryCount + ' entries across ' + m.feedCount + ' feeds (' + (bytes / 1024).toFixed(0) + ' KB)');
}

module.exports = { generate };
