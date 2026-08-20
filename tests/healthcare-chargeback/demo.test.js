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
ok('pool prefilled', w.document.getElementById('prepaidPurchasedInput').value === '1250000');
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

const reset = w.document.getElementById('btnReset');
if (reset) {
  reset.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  w.document.getElementById('btnDemo').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('reset then demo still works', /Settled bill/.test(w.document.getElementById('cbBody').innerHTML));
}

console.log('\n' + (fails ? fails + ' FAILURES' : 'ALL PASS'));
process.exit(fails ? 1 : 0);
