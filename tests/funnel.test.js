/* Drives the demo/real funnel against the real traffic data.
 *
 * Three things are being defended.
 *
 * 1. The table and cards render against the live data shape.
 * 2. A window with no post-tagging snapshots renders blank, never zero.
 *    Tagging shipped after the 2026-08-21 07:34Z snapshot, so nothing before
 *    2026-08-22 carries it. Printing "0 real runs" for that period would be a
 *    confident false statement, which is worse than an obvious gap. This is the
 *    specific trap here: ?demo=1 already existed as a hand-written link on the
 *    Policy Helper landing page, so a few tagged sessions DO appear in old
 *    data. A presence-based check would pass and quietly report one entry path
 *    as though it were the whole picture.
 * 3. Once a post-tagging snapshot exists, the arithmetic is right.
 *
 * Cases 2 and 3 are exercised by synthesising snapshots rather than waiting for
 * tomorrow's collector run.
 */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const DIR = 'C:/Studio proj/Analytics-Hub/docs/pages-analytics';
const RAW = JSON.parse(fs.readFileSync('C:/Studio proj/Analytics-Hub/docs/data/traffic-history.json', 'utf8'));
const APP_SRC = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');

const SINCE = (APP_SRC.match(/COWORK_MODE_TAGGING_SINCE = "([\d-]+)"/) || [])[1];

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
const click = (w, key) => {
  const b = w.document.querySelector(`[data-window="${key}"]`);
  if (b) b.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  return !!b;
};
const cellsOf = (tr) => [...tr.querySelectorAll('td')].map((t) => t.textContent.trim());

/* Add a snapshot dated on or after tagging began, carrying mode-flagged URLs.
   Cloned from a real snapshot so the row shape matches what Clarity returns. */
function withTaggedSnapshot(data, day, demoSessions, realSessions) {
  const copy = JSON.parse(JSON.stringify(data));
  for (const site of Object.values(copy.sites || {})) {
    const byUrl = site.snapshotsByUrl;
    if (!byUrl) continue;
    const days = Object.keys(byUrl).sort();
    const newest = days[days.length - 1];
    if (!newest) continue;
    const snap = JSON.parse(JSON.stringify(byUrl[newest]));
    const traffic = snap.find((x) => x && x.metricName === 'Traffic');
    if (!traffic) continue;
    const base = 'https://microsoft.github.io/Analytics-Hub/cowork-billing/multi-budget-chargeback/app/';
    traffic.information.push(
      { Url: base + '?demo=1', sessionsCount: String(demoSessions), totalSessionCount: String(demoSessions), distinctUserCount: '3' },
      { Url: base + '?report=1', sessionsCount: String(realSessions), totalSessionCount: String(realSessions), distinctUserCount: '2' },
    );
    byUrl[day] = snap;
    return copy;
  }
  return copy;
}

console.log('tagging starts: ' + SINCE);
ok('tagging start date found in app.js', !!SINCE);

console.log('\n=== real data, no post-tagging snapshot yet ===');
const w1 = boot(RAW);
setTimeout(() => {
  const demo = g(w1, 'cowork-kpi-demo-runs');
  const real = g(w1, 'cowork-kpi-real-runs');
  console.log('  demo runs: ' + demo + ' | real runs: ' + real);
  console.log('  foot: ' + g(w1, 'cowork-kpi-real-runs-foot'));
  ok('demo runs blank, not zero', demo === '\u2014');
  ok('real runs blank, not zero', real === '\u2014');
  ok('real share blank', g(w1, 'cowork-kpi-real-share') === '\u2014');
  ok('foot says not measured', /not measured before/i.test(g(w1, 'cowork-kpi-real-runs-foot')));
  ok('note names the start date', g(w1, 'cowork-funnel-note').includes(SINCE));

  // Sessions must still be shown. Withholding the split is honest; withholding
  // traffic we do have would be a regression.
  const tbody = w1.document.getElementById('cowork-funnel-tbody');
  ok('funnel table lists tools', !!tbody && tbody.querySelectorAll('tr').length > 0);
  const c1 = cellsOf(tbody.querySelector('tr'));
  console.log('  first row: ' + c1.join(' | '));
  ok('sessions column still populated', /^[\d,]+$/.test(c1[1]) && Number(c1[1].replace(/,/g, '')) > 0);
  ok('demo/real columns withheld', c1[2] === '\u2014' && c1[3] === '\u2014');
  ok('loaded-data share withheld', c1[4] === '\u2014');

  console.log('\n=== with a post-tagging snapshot (demo 12, real 8) ===');
  const w2 = boot(withTaggedSnapshot(RAW, SINCE, 12, 8));
  setTimeout(() => {
    click(w2, '3d');
    const d = g(w2, 'cowork-kpi-demo-runs');
    const r = g(w2, 'cowork-kpi-real-runs');
    const share = g(w2, 'cowork-kpi-real-share');
    console.log('  demo: ' + d + ' | real: ' + r + ' | real share: ' + share);
    console.log('  note: ' + g(w2, 'cowork-funnel-note'));
    ok('demo runs counted', d === '12');
    ok('real runs counted', r === '8');
    ok('real share is 8/20 = 40%', share === '40%');
    ok('foot no longer says unmeasured', !/not measured/i.test(g(w2, 'cowork-kpi-real-runs-foot')));

    const mbRow = [...w2.document.querySelectorAll('#cowork-funnel-tbody tr')]
      .find((tr) => /Multi-Budget/.test(tr.textContent));
    ok('multi-budget row present', !!mbRow);
    if (mbRow) {
      const c = cellsOf(mbRow);
      console.log('  row: ' + c.join(' | '));
      ok('row demo = 12', c[2] === '12');
      ok('row real = 8', c[3] === '8');
      ok('row real share = 40%', c[5] === '40%');
    }

    // A wider window mixes tagged and untagged days, so the loaded-data share
    // must be withheld rather than dividing across mismatched periods.
    console.log('\n=== wider window, partial tagging coverage ===');
    click(w2, '30d');
    console.log('  note: ' + g(w2, 'cowork-funnel-note'));
    const wideRow = [...w2.document.querySelectorAll('#cowork-funnel-tbody tr')]
      .find((tr) => /Multi-Budget/.test(tr.textContent));
    if (wideRow) {
      const c = cellsOf(wideRow);
      console.log('  row: ' + c.join(' | '));
      ok('partial coverage withholds loaded-data share', c[4] === '\u2014');
      ok('partial coverage still shows demo/real', c[2] === '12' && c[3] === '8');
    }
    ok('note explains partial coverage', /not directly comparable/i.test(g(w2, 'cowork-funnel-note')));

    console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PASS'));
    process.exit(fails ? 1 : 0);
  }, 500);
}, 500);
