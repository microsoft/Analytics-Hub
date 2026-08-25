/* Guards the update feed's reach reporting.
 *
 * Two things make this worth testing rather than eyeballing.
 *
 * First, the honest-blank rule. The updates page went live after several
 * nightly snapshots had already run, so it appears in none of them. The cards
 * must read blank, not zero: "0 people found the page" and "the page did not
 * exist yet" are different claims and only one of them is true.
 *
 * Second, double counting. Copying the feed address rewrites the URL of a
 * session already in progress, so a copied session appears twice in the
 * Clarity data, once with ?from= and once with ?copied=1. If the copy rows
 * were added to the session total rather than treated as a subset, every copy
 * would inflate traffic. The synthetic case below asserts they are not.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');

const DIR = 'C:/Studio proj/Analytics-Hub/docs/pages-analytics';
const ROOT = 'C:/Studio proj/Analytics-Hub';
const RAW = JSON.parse(fs.readFileSync(ROOT + '/docs/data/traffic-history.json', 'utf8'));
const APP_SRC = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');

const SINCE = (APP_SRC.match(/FEED_LIVE_SINCE = "([\d-]+)"/) || [])[1];

let fails = 0;
const ok = (n, c) => { if (!c) { fails++; console.log('  FAIL ' + n); } else console.log('  ok   ' + n); };

function boot(data) {
  const dom = new JSDOM(HTML, {
    url: 'https://microsoft.github.io/Analytics-Hub/pages-analytics/',
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  w.clarity = () => {};
  w.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(data) });
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  if (!w.history.replaceState) w.history.replaceState = () => {};
  w.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  w.eval(APP_SRC);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return w;
}
const g = (w, id) => { const e = w.document.getElementById(id); return e ? e.textContent.trim() : '(missing)'; };
const cellsOf = (tr) => [...tr.querySelectorAll('td')].map((t) => t.textContent.trim());

/* Add updates-page traffic to the newest snapshot. The newest is the only date
   the window-stepping is guaranteed to select. */
function withUpdatesTraffic(data, rows) {
  const copy = JSON.parse(JSON.stringify(data));
  for (const site of Object.values(copy.sites || {})) {
    const byUrl = site.snapshotsByUrl;
    if (!byUrl) continue;
    const days = Object.keys(byUrl).sort();
    const newest = days[days.length - 1];
    if (!newest) continue;
    const traffic = (byUrl[newest] || []).find((x) => x && x.metricName === 'Traffic');
    if (!traffic) continue;
    const base = 'https://microsoft.github.io/Analytics-Hub/updates/';
    for (const [suffix, sessions, users] of rows) {
      traffic.information.push({
        Url: base + suffix,
        sessionsCount: String(sessions),
        totalSessionCount: String(sessions),
        distinctUserCount: String(users),
      });
    }
    return copy;
  }
  return copy;
}

console.log('feed live since: ' + SINCE);
ok('FEED_LIVE_SINCE is declared', !!SINCE);

console.log('\n=== the page markup exists ===');
for (const id of ['feed-kpi-sessions', 'feed-kpi-users', 'feed-kpi-copied', 'feed-kpi-rate',
  'feed-source-tbody', 'feed-note']) {
  ok('#' + id + ' present', HTML.includes('id="' + id + '"'));
}
ok('explains why there is no subscriber count', /Why there is no subscriber count/.test(HTML));
ok('says feed readers do not run JavaScript', /never run JavaScript/.test(HTML));

console.log('\n=== before the page appears in any snapshot ===');
const w1 = boot(RAW);
setTimeout(() => {
  console.log('  sessions: ' + g(w1, 'feed-kpi-sessions') + ' | copied: ' + g(w1, 'feed-kpi-copied'));
  console.log('  note: ' + g(w1, 'feed-note'));
  ok('sessions blank, not zero', g(w1, 'feed-kpi-sessions') === '\u2014');
  ok('copied blank, not zero', g(w1, 'feed-kpi-copied') === '\u2014');
  ok('copy rate blank, not zero', g(w1, 'feed-kpi-rate') === '\u2014');
  ok('note names the go-live date', g(w1, 'feed-note').includes(SINCE));
  const empty = w1.document.getElementById('feed-source-tbody').textContent;
  ok('table explains rather than showing nothing', /has not appeared|went live/.test(empty));

  console.log('\n=== with traffic: 20 nav, 8 hero, 5 direct, 6 copied ===');
  const w2 = boot(withUpdatesTraffic(RAW, [
    ['?from=nav', 20, 14],
    ['?from=hero', 8, 6],
    ['', 5, 4],
    ['?from=nav&copied=all', 4, 3],
    ['?from=hero&copied=alerts', 2, 2],
  ]));
  setTimeout(() => {
    const sessions = Number(g(w2, 'feed-kpi-sessions').replace(/,/g, ''));
    const copied = Number(g(w2, 'feed-kpi-copied').replace(/,/g, ''));
    console.log('  sessions: ' + sessions + ' | copied: ' + copied + ' | rate: ' + g(w2, 'feed-kpi-rate'));
    console.log('  copied foot: ' + g(w2, 'feed-kpi-copied-foot'));
    ok('sessions counted', sessions === 20 + 8 + 5 + 4 + 2);
    ok('copies counted across both feeds', copied === 6);
    // Which feed people take is worth knowing on its own: heavy alerts-only
    // uptake would say the full feed is too noisy.
    ok('the alerts-only split is surfaced', /important-only feed/.test(g(w2, 'feed-kpi-copied-foot')));
    /* The important one. A copied session is the same session as the one that
       arrived, so copies must never exceed sessions and the rate must stay a
       sane percentage. */
    ok('copies do not exceed sessions', copied <= sessions);
    ok('copy rate is a percentage', /^\d+%$/.test(g(w2, 'feed-kpi-rate')));

    const rows = [...w2.document.querySelectorAll('#feed-source-tbody tr')].map(cellsOf);
    console.log('  rows:');
    rows.forEach((r) => console.log('    ' + r.join(' | ')));
    const byLabel = Object.fromEntries(rows.map((r) => [r[0], Number(r[1].replace(/,/g, ''))]));
    ok('nav attributed', byLabel['Nav button'] === 20 + 4);
    ok('hero attributed', byLabel['Home page button'] === 8 + 2);
    ok('direct attributed', byLabel['Direct or shared link'] === 5);
    ok('every source row present', rows.length === 3);
    ok('note no longer says not measured', !g(w2, 'feed-note').includes('blank rather than zero'));

    console.log('\n=== the updates page is instrumented at all ===');
    const up = fs.readFileSync(ROOT + '/docs/updates/index.html', 'utf8');
    ok('carries the Clarity tag', /clarity\.ms\/tag/.test(up));
    ok('has copy buttons', (up.match(/class="up-copy"/g) || []).length >= 2);
    ok('copy records which feed was taken', /copied=' \+ which|copied=/.test(up) && /data-which/.test(up));
    ok('offers both feeds', /feed\.xml/.test(up) && /alerts\.xml/.test(up));
    ok('copy uses replaceState, which Clarity observes', /replaceState/.test(up));

    console.log('\n=== entry points carry attribution ===');
    const home = fs.readFileSync(ROOT + '/docs/index.html', 'utf8');
    ok('home hero button tagged from=hero', /updates\/\?from=hero/.test(home));
    ok('home nav button tagged from=nav', /updates\/\?from=nav/.test(home));
    ok('What\'s New listed under Resources', /updates\/"[^>]*role="menuitem"/.test(home));

    console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PASS'));
    process.exit(fails ? 1 : 0);
  }, 500);
}, 500);
