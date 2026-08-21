/* Verifies the instrumentation actually binds and fires on the real pages.
 *
 * The point is not that the file parses. It is that on each app the intended
 * elements exist, the app resolves to the right name, and an export click
 * produces a mode-stamped event. Grepping the source would not catch a binding
 * whose element id no longer exists.
 */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const ROOT = 'C:/Studio proj/Analytics-Hub/docs';

const APPS = [
  ['multi-budget', 'cowork-billing/multi-budget-chargeback/app', 'btnDemo', 'btnExportGl'],
  ['chargeback', 'cowork-billing/cowork-chargeback/app', 'btnDemo', 'btnExportJournal'],
  ['policy-helper', 'cowork-billing/cowork-policy-helper/app', 'btnDemo', 'btnExport'],
];

let fails = 0;
const ok = (n, c) => { if (!c) { fails++; console.log('  FAIL ' + n); } else console.log('  ok   ' + n); };

for (const [expectApp, rel, demoId, exportId] of APPS) {
  const dir = path.join(ROOT, rel);
  const html = path.join(dir, 'index.html');
  if (!fs.existsSync(html)) { console.log('\n' + rel + ' — no index.html'); continue; }
  console.log('\n=== ' + rel + ' ===');

  const dom = new JSDOM(fs.readFileSync(html, 'utf8'), {
    url: 'https://microsoft.github.io/Analytics-Hub/' + rel + '/',
    runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  const events = [];
  w.clarity = (kind, name) => { if (kind === 'event') events.push(name); };

  // load the app itself so demo mode can be driven, then the tracker
  for (const f of ['demo-data.js', 'xlsx-export.js', 'settlement.js', 'chargeback.js',
                   'policy-helper.js', 'finops.js']) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) { try { w.eval(fs.readFileSync(p, 'utf8')); } catch (e) {} }
  }
  try { w.eval(fs.readFileSync(path.join(ROOT, 'cowork-billing/cwk-events.js'), 'utf8')); }
  catch (e) { console.log('  tracker eval error: ' + e.message); }
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

  ok('app resolves to ' + expectApp, (() => {
    events.length = 0;
    w.cwkTrack('probe');
    return events[0] === expectApp + ':probe';
  })());

  const demoBtn = w.document.getElementById(demoId);
  ok('demo button present (' + demoId + ')', !!demoBtn);
  if (demoBtn) {
    events.length = 0;
    demoBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    ok('demo click fires demo_opened', events.some((e) => e.endsWith(':demo_opened')));
  }

  const expBtn = w.document.getElementById(exportId);
  ok('export button present (' + exportId + ')', !!expBtn);
  if (expBtn) {
    events.length = 0;
    expBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const stamped = events.find((e) => e.indexOf('export') > -1);
    console.log('     export event: ' + (stamped || '(none)'));
    ok('export event is mode-stamped', !!stamped && /:(demo|real)$/.test(stamped));
  }
}

console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PASS'));
process.exit(fails ? 1 : 0);
