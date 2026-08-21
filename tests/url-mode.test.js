/* Verifies the demo / real split actually reaches the URL.
 *
 * This is the only signal in the whole funnel that Clarity's Data Export API
 * can return, because it will not return custom events. If these assertions
 * stop holding, the analytics page silently goes back to being unable to tell
 * an evaluation from a real customer run, with no error anywhere.
 *
 * The constraint being defended, from clarity-js/src/core/history.ts:
 *
 *     function getCurrentUrl(): string {
 *         return location.href.replace(location.hash, Constant.Empty);
 *     }
 *
 * Clarity compares URLs with the hash stripped and never binds hashchange, so
 * a fragment records nothing. The flag has to live in the query string, and it
 * has to be applied with pushState or replaceState, which Clarity proxies.
 * Both of those are asserted below rather than assumed.
 */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const ROOT = 'C:/Studio proj/Analytics-Hub/docs';

const APPS = [
  ['multi-budget', 'cowork-billing/multi-budget-chargeback/app'],
  ['chargeback', 'cowork-billing/cowork-chargeback/app'],
  ['policy-helper', 'cowork-billing/cowork-policy-helper/app'],
];

let fails = 0;
const ok = (n, c) => { if (!c) { fails++; console.log('  FAIL ' + n); } else console.log('  ok   ' + n); };

function boot(rel, url) {
  const dir = path.join(ROOT, rel);
  const dom = new JSDOM(fs.readFileSync(path.join(dir, 'index.html'), 'utf8'), {
    url, runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  const events = [];
  w.clarity = (kind, name) => { if (kind === 'event') events.push(name); };

  // Record every replaceState/pushState call, so the test proves the mechanism
  // Clarity actually watches is the one being used.
  const historyCalls = [];
  for (const m of ['replaceState', 'pushState']) {
    const orig = w.history[m].bind(w.history);
    w.history[m] = function (a, b, u) { historyCalls.push([m, u]); return orig(a, b, u); };
  }

  for (const f of ['demo-data.js', 'xlsx-export.js', 'settlement.js', 'chargeback.js',
                   'policy-helper.js', 'finops.js']) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) { try { w.eval(fs.readFileSync(p, 'utf8')); } catch (e) {} }
  }
  w.eval(fs.readFileSync(path.join(ROOT, 'cowork-billing/cwk-events.js'), 'utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  return { w, events, historyCalls, dir };
}

const BASE = 'https://microsoft.github.io/Analytics-Hub/';

for (const [name, rel] of APPS) {
  console.log('\n=== ' + name + ' ===');
  const { w, historyCalls } = boot(rel, BASE + rel + '/');

  // ---- clicking View Demo must land the flag in the query string
  const demoBtn = w.document.getElementById('btnDemo');
  ok('demo button present', !!demoBtn);
  demoBtn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  console.log('     url after demo: ' + w.location.search + w.location.hash);
  ok('demo sets ?demo=1', /[?&]demo=1\b/.test(w.location.search));
  ok('demo does not use a fragment', w.location.hash === '');
  ok('demo went through history API', historyCalls.some((c) => /demo=1/.test(c[1] || '')));

  // ---- real data must replace the flag, not sit alongside it
  historyCalls.length = 0;
  w.cwkMarkMode('real');
  console.log('     url after real: ' + w.location.search + w.location.hash);
  ok('real sets ?report=1', /[?&]report=1\b/.test(w.location.search));
  ok('real clears demo=1', !/[?&]demo=1\b/.test(w.location.search));
  ok('real does not use a fragment', w.location.hash === '');
  ok('real went through history API', historyCalls.some((c) => /report=1/.test(c[1] || '')));

  // ---- reset must return the URL to the landing state
  w.cwkClearMode();
  ok('reset clears both flags',
    !/[?&](demo|report)=1\b/.test(w.location.search));

  // ---- unrelated query params must survive, or shared links break
  w.history.replaceState(null, '', w.location.pathname + '?ref=teams');
  w.cwkMarkMode('demo');
  console.log('     url with existing param: ' + w.location.search);
  ok('existing params preserved', /ref=teams/.test(w.location.search) && /demo=1/.test(w.location.search));

  // ---- repeated calls must not thrash the URL. Every change costs Clarity a
  // stop/restart cycle, so a render loop calling this would be expensive.
  w.cwkMarkMode('demo');
  const before = w.location.href;
  historyCalls.length = 0;
  w.cwkMarkMode('demo');
  ok('repeat call is a no-op', w.location.href === before && historyCalls.length === 0);
}

// ---- landing on ?demo=1 must still auto-load the demo, so the URL the user
// copies out of the address bar works when pasted back in.
for (const [name, rel] of APPS) {
  const { w } = boot(rel, BASE + rel + '/?demo=1');
  const banner = w.document.getElementById('cbDemoBanner') || w.document.getElementById('demoBanner');
  const landing = w.document.getElementById('cbLanding') || w.document.getElementById('landing');
  ok(name + ': ?demo=1 on load leaves the landing page', !!landing && landing.hidden === true);
  if (banner) ok(name + ': ?demo=1 on load shows the demo banner', banner.hidden === false);
}

console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PASS'));
process.exit(fails ? 1 : 0);
