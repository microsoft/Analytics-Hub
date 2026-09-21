/* build_report_metrics.js
 * Produces docs/data/report-metrics.json — a compact per-report metrics file
 * used by the "Sort by" control on the homepage and the reports page.
 *
 * Sources (authoritative, already maintained by the traffic pipeline):
 *   docs/data/traffic-history.json  — per-repo dailyViews / dailyClones {count,uniques}
 *   docs/data/sort-data.json        — stars + fallback views (per report id)
 *   docs/data/repo-stars.json       — stars fallback
 *
 * Output keyed by report id:
 *   { stars, viewsTotal, viewsWeek, clonesTotal, clonesWeek }
 *
 * Re-run after the traffic snapshot refreshes:  node scripts/build_report_metrics.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DOCS = path.resolve(__dirname, '..', 'docs', 'data');
const readJSON = f => JSON.parse(fs.readFileSync(path.join(DOCS, f), 'utf8'));

const traffic = readJSON('traffic-history.json');
const sortData = readJSON('sort-data.json').reports || {};
const repoStars = readJSON('repo-stars.json').reports || {};

// report id -> GitHub repo (lower-cased full name). Derived from sort-data.
const REPO_BY_ID = {};
Object.keys(sortData).forEach(id => {
  const repo = sortData[id] && sortData[id].repo;
  if (repo) REPO_BY_ID[id] = repo.toLowerCase();
});
// repo (lower) -> traffic entry (traffic keys are case-sensitive full names)
const TRAFFIC_BY_REPO = {};
Object.keys(traffic.repos || {}).forEach(full => {
  TRAFFIC_BY_REPO[full.toLowerCase()] = traffic.repos[full];
});

const DAY = 86400000;
const now = Date.now();

// Sum a daily map ({date: {count, uniques}}) over an optional trailing window.
function sumDaily(daily, sinceMs, field) {
  if (!daily) return 0;
  const key = field || 'count';
  let total = 0;
  Object.keys(daily).forEach(date => {
    const rec = daily[date];
    const n = rec && typeof rec[key] === 'number' ? rec[key] : 0;
    if (sinceMs == null) { total += n; return; }
    const t = Date.parse(date);
    if (!isNaN(t) && t >= sinceMs) total += n;
  });
  return total;
}

// Popularity = overall traffic/hits = unique visits + clones over a window.
// Unique visits weight distinct people; clones weight actual use/downloads.
function popScore(tr, sinceMs) {
  if (!tr) return null;
  const uniqueViews = sumDaily(tr.dailyViews, sinceMs, 'uniques');
  const clones = sumDaily(tr.dailyClones, sinceMs, 'count');
  return uniqueViews + clones;
}

function starsFor(id, repoLower) {
  if (repoLower && TRAFFIC_BY_REPO[repoLower]) {
    const meta = TRAFFIC_BY_REPO[repoLower].meta;
    if (meta && typeof meta.stars === 'number') return meta.stars;
  }
  if (sortData[id] && typeof sortData[id].stars === 'number') return sortData[id].stars;
  if (repoStars[id] && typeof repoStars[id].stars === 'number') return repoStars[id].stars;
  return null;
}

const weekAgo = now - 7 * DAY;
const monthAgo = now - 30 * DAY;
const out = {};
const ids = new Set([...Object.keys(sortData), ...Object.keys(repoStars)]);

ids.forEach(id => {
  const repoLower = REPO_BY_ID[id] || null;
  const tr = repoLower ? TRAFFIC_BY_REPO[repoLower] : null;

  let viewsTotal = null, viewsWeek = null, clonesTotal = null, clonesWeek = null;
  let popWeek = null, popMonth = null, popTotal = null;
  if (tr) {
    viewsTotal = sumDaily(tr.dailyViews, null, 'count');
    viewsWeek = sumDaily(tr.dailyViews, weekAgo, 'count');
    clonesTotal = sumDaily(tr.dailyClones, null, 'count');
    clonesWeek = sumDaily(tr.dailyClones, weekAgo, 'count');
    popWeek = popScore(tr, weekAgo);
    popMonth = popScore(tr, monthAgo);
    popTotal = popScore(tr, null);
  }
  // Views fallback to sort-data if this repo isn't in the traffic history.
  if (viewsTotal === null && sortData[id] && typeof sortData[id].viewsTotal === 'number') {
    viewsTotal = sortData[id].viewsTotal;
    viewsWeek = typeof sortData[id].viewsWeek === 'number' ? sortData[id].viewsWeek : null;
  }

  out[id] = {
    stars: starsFor(id, repoLower),
    viewsTotal: viewsTotal,
    viewsWeek: viewsWeek,
    clonesTotal: clonesTotal,
    clonesWeek: clonesWeek,
    // Popularity = unique visits + clones (overall traffic/hits), by window.
    popWeek: popWeek,
    popMonth: popMonth,
    popTotal: popTotal
  };
});

const payload = {
  schemaVersion: 2,
  generatedBy: 'scripts/build_report_metrics.js',
  generatedAt: new Date().toISOString(),
  note: 'stars/views/clones per report id. views & clones = daily counts summed. week=7d, month=30d. popWeek/popMonth/popTotal = popularity = unique visits + clone count over the window (overall traffic, NOT stars). Reports without a GitHub repo carry nulls and sort last.',
  reports: out
};

fs.writeFileSync(path.join(DOCS, 'report-metrics.json'), JSON.stringify(payload, null, 2) + '\n');
const withClones = Object.values(out).filter(r => r.clonesTotal != null).length;
console.log('Wrote report-metrics.json — ' + Object.keys(out).length + ' reports, ' + withClones + ' with clone data.');
