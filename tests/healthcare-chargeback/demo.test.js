const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const APP = 'C:/Studio proj/Analytics-Hub/docs/cowork-billing/healthcare-chargeback/app';
const dom = new JSDOM(fs.readFileSync(path.join(APP, 'index.html'), 'utf8'),
  { url: 'https://x/', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.clarity = () => {};
w.alert = (m) => console.log('[alert]', m);
for (const f of ['demo-data.js', 'xlsx-export.js', 'settlement.js', 'chargeback.js']) {
  w.eval(fs.readFileSync(path.join(APP, f), 'utf8'));
}
w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

let fails = 0;
const ok = (n, c) => { if (!c) { fails++; console.log('  FAIL ' + n); } else console.log('  ok   ' + n); };

w.document.getElementById('btnDemo').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const b = w.document.getElementById('cbBody').innerHTML;

ok('settlement populated on demo load', /Settled bill/.test(b));
ok('no empty state', !/No entitlements set/.test(b));
const pool = +w.document.getElementById('prepaidPurchasedInput').value;
ok('pool prefilled in whole packs', pool > 0 && pool % 25000 === 0);
ok('entitlement textarea prefilled', (w.document.getElementById('stEntitle').value || '').length > 20);

function card(name) {
  const m = b.match(new RegExp(name + '[\\s\\S]{0,400}?<div class="metric-value">([^<]+)<'));
  return m ? m[1] : null;
}
const tenant = card('Tenant cost');
const settled = card('Settled to units');
const residual = card('Residual');
const unused = card('Unused entitlement');
console.log('   tenant cost       :', tenant);
console.log('   settled to units  :', settled);
console.log('   residual          :', residual);
console.log('   unused entitlement:', unused);

ok('tenant cost non-zero', tenant && parseFloat(tenant.replace(/[^0-9.]/g, '')) > 0);
const rv = residual ? parseFloat(residual.replace(/[^0-9.\-]/g, '')) : NaN;
ok('residual reconciles', Math.abs(rv) < 1);
const uv = unused ? parseFloat(unused.replace(/[^0-9.\-]/g, '')) : 0;
ok('demo shows unused entitlement (the problem)', uv > 0);
ok('demo shows excess rows', /cell-over/.test(b));

// --- walkthrough ---
const how = w.document.getElementById('cbHow');
ok('walkthrough rendered', !!how);
ok('walkthrough open by default', how && how.open);
const steps = how ? how.querySelectorAll('.cb-how-step') : [];
ok('five steps A-E', steps.length === 5);
ok('steps labelled A-E', [...steps].map(s => s.querySelector('.cb-how-mark').textContent).join('') === 'ABCDE');
ok('formula shown', /min\(used, entitlement\)/.test(how.textContent));
ok('worked example present', /Worked on/.test(how.textContent));
ok('unit word humanised, no camelCase run-on', !/costcenter/i.test(how.textContent));
ok('current surplus mode highlighted', how.querySelectorAll('.cb-how-opts .is-on').length === 1);
// the surplus has to be big enough to be worth explaining, or steps D and E
// teach nothing. Guards against the pool being resized back down.
const sur = parseFloat((how.textContent.match(/Over-collected\s*\$([\d,]+\.\d\d)/) || [0, '0'])[1].replace(/,/g, ''));
console.log('   demo surplus      : $' + sur.toFixed(2));
ok('demo surplus is material (> $100)', sur > 100);
let under = 0, over = 0;
s_rows(w).forEach(r => { if (r.excess > 0) over++; else if (r.entitlement > r.used) under++; });
console.log('   over / under      : ' + over + ' / ' + under);
ok('demo has both over- and under-consumers', over >= 3 && under >= 3);

function s_rows(win) {
  return [...win.document.querySelectorAll('.cb-settle table tbody tr')].map(tr => {
    const n = i => +tr.children[i].textContent.replace(/[^0-9.\-]/g, '');
    return { used: n(2), entitlement: n(3), excess: n(5) };
  });
}

const reset = w.document.getElementById('btnReset');
if (reset) {
  reset.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  w.document.getElementById('btnDemo').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('reset then demo still works', /Settled bill/.test(w.document.getElementById('cbBody').innerHTML));
}

console.log('\n' + (fails ? fails + ' FAILURES' : 'ALL PASS'));
process.exit(fails ? 1 : 0);
