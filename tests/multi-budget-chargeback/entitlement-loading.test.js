/* Entitlement loading: template round-trip, messy input, and name matching.
   These are the paths a customer actually uses, and a mistyped name used to
   silently zero a unit's entitlement, so the matcher gets hard assertions. */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const APP = 'C:/Studio proj/Analytics-Hub/docs/cowork-billing/multi-budget-chargeback/app';
const dom = new JSDOM(fs.readFileSync(path.join(APP, 'index.html'), 'utf8'),
  { url: 'https://x/', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.clarity = () => {}; w.alert = (m) => { lastAlert = m; };
let lastAlert = null, downloaded = null;
for (const f of ['demo-data.js', 'xlsx-export.js', 'settlement.js', 'chargeback.js'])
  w.eval(fs.readFileSync(path.join(APP, f), 'utf8'));

// capture downloads instead of hitting the filesystem
w.URL.createObjectURL = (b) => { downloaded = b; return 'blob:x'; };
w.URL.revokeObjectURL = () => {};
const origClick = w.HTMLAnchorElement.prototype.click;
w.HTMLAnchorElement.prototype.click = function () { if (!this.download) origClick.call(this); };
w.Blob = class { constructor(parts) { this._t = parts.join(''); } text() { return Promise.resolve(this._t); } };

w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
w.document.getElementById('btnDemo').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

let fails = 0;
const ok = (n, c) => { if (!c) { fails++; console.log('  FAIL ' + n); } else console.log('  ok   ' + n); };
const $ = (id) => w.document.getElementById(id);
const summary = () => { const el = w.document.querySelector('.cb-match'); return el ? el.textContent : ''; };
const entTotal = () => [...w.document.querySelectorAll('.cb-settle table tbody tr')]
  .reduce((a, tr) => a + (+tr.children[3].textContent.replace(/[^0-9]/g, '')), 0);

// ---------- template download ----------
$('stTemplate').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
ok('template downloaded', !!downloaded);
const tpl = downloaded._t;
const tplLines = tpl.trim().split(/\r?\n/);
console.log('   template header   : ' + tplLines[0]);
console.log('   template row 1    : ' + tplLines[1]);
ok('template has entitlement column', /Entitlement/i.test(tplLines[0]));
ok('template lists every unit', tplLines.length >= 17);
ok('template pre-fills a proposed split', /,\d+\s*$/.test(tplLines[1]));

// ---------- template round-trips unchanged ----------
const before = entTotal();
const ta = $('stEntitle');
ta.value = tpl;
$('stApply').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
console.log('   after round-trip  : ' + summary());
ok('template round-trips with every unit matched', /^16 of 16 departments matched\.\s*$/.test(summary()));
ok('entitlement total preserved', Math.abs(entTotal() - before) <= 16);

// ---------- messy real-world input ----------
const messy = [
  'Department,Entitlement (credits)',
  '  customer operations ,  400,000 ',        // case, padding, thousands separators
  '"Data & Analytics",250000',              // quoted field
  'Field Services,8 packs',            // packs
  'Depot 12,50000',                          // name not in the data
].join('\n');
$('stEntitle').value = messy;
$('stApply').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const s2 = summary();
console.log('   messy input       : ' + s2);
ok('loose match on case and whitespace', /3 of 16/.test(s2));
ok('unrecognised name surfaced', /Depot 12/.test(s2));
ok('units without entitlement surfaced', /no entitlement set for/.test(s2));
ok('summary flagged bad', !!w.document.querySelector('.cb-match.bad'));

const rows = [...w.document.querySelectorAll('.cb-settle table tbody tr')].map(tr => ({
  label: tr.children[0].textContent,
  ent: +tr.children[3].textContent.replace(/[^0-9]/g, ''),
}));
const get = (l) => (rows.find(r => r.label === l) || {}).ent;
console.log('   Customer Operations : ' + get('Customer Operations'));
console.log('   Field Services      : ' + get('Field Services'));
ok('thousands separators parsed', get('Customer Operations') === 400000);
ok('quoted field parsed', get('Data & Analytics') === 250000);
ok('packs converted at 25,000', get('Field Services') === 200000);

// ---------- tab separated, as pasted from Excel ----------
$('stEntitle').value = 'Department\tEntitlement\nFinance\t123456\nProduct Engineering\t654321';
$('stApply').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
console.log('   tab separated     : ' + summary());
ok('excel paste (tab separated) works', /2 of 16/.test(summary()));

// ---------- two bare columns, no header ----------
$('stEntitle').value = 'Finance,100000\nMarketing,200000\nLegal & Compliance,300000';
$('stApply').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
console.log('   headerless        : ' + summary());
ok('headerless two-column list works', /3 of 16/.test(summary()));

// ---------- split buttons still report a clean match ----------
w.document.querySelector('[data-split="even"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
ok('proposed split reports full match', /16 of 16/.test(summary()));
ok('proposed split summary is clean', !!w.document.querySelector('.cb-match.ok'));

// ---------- reset clears the match report ----------
const reset = $('btnReset');
if (reset) {
  reset.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  $('btnDemo').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ok('reset then demo reports a clean match', /16 of 16/.test(summary()));
}

// ---------- the file upload path, end to end ----------
$('btnDemo').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const csv = 'Department,Users,Credits used,Entitlement (credits)\n' +
            'Finance,26,117872,"1,000,000"\nMarketing,12,50000,4 packs\nDepot 12,3,100,7500';
const fi = $('stFile');
const fake = new w.File([csv], 'entitlements.csv', { type: 'text/csv' });
Object.defineProperty(fi, 'files', { value: [fake], configurable: true });
fi.dispatchEvent(new w.Event('change', { bubbles: true }));

setTimeout(() => {
  const s = summary();
  console.log('   file upload       : ' + s);
  ok('file upload matched the real units', /2 of 16/.test(s));
  ok('file upload flagged the unknown unit', /Depot 12/.test(s));
  const r = [...w.document.querySelectorAll('.cb-settle table tbody tr')]
    .map(tr => ({ l: tr.children[0].textContent, e: +tr.children[3].textContent.replace(/[^0-9]/g, '') }));
  const g = (l) => (r.find(x => x.l === l) || {}).e;
  console.log('   Finance / Marketing: ' + g('Finance') + ' / ' + g('Marketing'));
  ok('quoted thousands from file', g('Finance') === 1000000);
  ok('packs from file', g('Marketing') === 100000);

  console.log('\n' + (fails ? fails + ' FAILURES' : 'ALL PASS'));
  process.exit(fails ? 1 : 0);
}, 60);
