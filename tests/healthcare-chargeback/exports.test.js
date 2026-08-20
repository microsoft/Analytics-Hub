/* Exports are the actual deliverable: the customer reviews in the app but ships
   these files. They get asserted like an interface, because a downstream GL
   import failing is far more expensive than a UI glitch. */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const APP = 'C:/Studio proj/Analytics-Hub/docs/cowork-billing/healthcare-chargeback/app';

const dom = new JSDOM(fs.readFileSync(path.join(APP, 'index.html'), 'utf8'),
  { url: 'https://x/', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.clarity = () => {}; w.alert = (m) => console.log('[alert] ' + m);

const files = {};
let pending = null;
w.Blob = class { constructor(parts) { this._p = parts; } };
w.URL.createObjectURL = (b) => { pending = b; return 'blob:1'; };
w.URL.revokeObjectURL = () => {};
Object.defineProperty(w.HTMLAnchorElement.prototype, 'click', {
  value: function () {
    if (!this.download || !pending) return;
    const p = pending._p;
    files[this.download] = typeof p[0] === 'string' ? p.join('') : Buffer.from(p[0]);
    pending = null;
  }, configurable: true,
});

for (const f of ['demo-data.js', 'xlsx-export.js', 'settlement.js', 'chargeback.js'])
  w.eval(fs.readFileSync(path.join(APP, f), 'utf8'));
w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
w.document.getElementById('btnDemo').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

let fails = 0;
const ok = (n, c) => { if (!c) { fails++; console.log('  FAIL ' + n); } else console.log('  ok   ' + n); };
const click = (id) => {
  const el = w.document.getElementById(id);
  if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  else { fails++; console.log('  FAIL missing button ' + id); }
};

// a real customer sets the period before exporting
const per = w.document.getElementById('periodInput');
per.value = 'March 2027';
per.dispatchEvent(new w.Event('input', { bubbles: true }));

['btnExportGl', 'btnExportJournal', 'btnExportLines', 'stExport', 'stTemplate', 'btnExportXlsx'].forEach(click);
const names = Object.keys(files);
console.log('   files: ' + names.join('\n          '));

// ---------- naming and identity ----------
ok('every export names the app', names.every(n => /^healthcare-chargeback|^entitlement-template/.test(n)));
ok('no cowork-chargeback filenames', !names.some(n => /^cowork-chargeback/.test(n)));
ok('period appears in filenames', names.filter(n => /march-2027/.test(n)).length >= 4);

const csvs = names.filter(n => n.endsWith('.csv')).map(n => files[n]);
ok('no CSV is titled Cowork Chargeback', !csvs.some(t => /Cowork Chargeback/.test(t)));

// ---------- the GL file is machine-importable ----------
const gl = files[names.find(n => /post-to-gl/.test(n))];
const glLines = gl.trim().split(/\r?\n/);
ok('GL has no preamble, header is row 1', /^Billing period,/.test(glLines[0]));
ok('GL has no blank lines', !glLines.some(l => l.trim() === ''));
ok('GL has no TOTAL row (double-post risk)', !/,TOTAL,/.test(gl));
ok('GL has no definitions block', !/Column definitions/.test(gl));
const glCols = glLines[0].split(',').length;
ok('GL is rectangular', glLines.every(l => splitCsv(l).length === glCols));
ok('GL period on every row', glLines.slice(1).every(l => l.indexOf('March 2027') === 0));
ok('GL unit header is title-cased', /,[A-Z]\w* \(GL key\),/.test(glLines[0]));

// ---------- pennies foot exactly ----------
function splitCsv(line) {
  const f = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { f.push(cur); cur = ''; }
    else cur += c;
  }
  f.push(cur); return f;
}
const amtIx = glLines[0].split(',').indexOf('Amount USD');
const glSum = glLines.slice(1).reduce((a, l) => a + parseFloat(splitCsv(l)[amtIx]), 0);

const settle = files[names.find(n => /settlement/.test(n))];
const tenant = parseFloat((settle.match(/Tenant cost \(what Microsoft charges\),([\d.]+)/) || [])[1]);
console.log('   GL sum: ' + glSum.toFixed(2) + '   tenant cost: ' + tenant.toFixed(2));
ok('GL rows foot exactly to the tenant cost', Math.abs(glSum - tenant) < 0.005);

const sLines = settle.split(/\r?\n/);
const sHead = sLines.findIndex(l => /^[A-Z].*,Users,Credits used/.test(l));
const billIx = splitCsv(sLines[sHead]).indexOf('Settled bill $');
let sSum = 0;
for (let i = sHead + 1; i < sLines.length && sLines[i].trim(); i++) sSum += parseFloat(splitCsv(sLines[i])[billIx]);
console.log('   settlement column sum: ' + sSum.toFixed(2));
ok('settlement bill column foots exactly', Math.abs(sSum - tenant) < 0.005);

// ---------- readability ----------
ok('settlement carries column definitions', /Column definitions/.test(settle));
ok('definitions explain Entitlement', /Entitlement,"?Share of the prepaid pool/.test(settle));
ok('settlement header title-cased', /^Department,Users,Credits used/m.test(settle));
ok('settlement shows unused entitlement', /Unused entitlement \(credits\),\d+/.test(settle));
ok('settlement shows the over-collection', /Over-collection before treatment,[\d.]+/.test(settle));
ok('settlement states the treatment used', /Surplus treatment applied,\w+/.test(settle));
ok('settlement totals sit in column B', /^Tenant cost \(what Microsoft charges\),[\d.]+$/m.test(settle));
ok('settlement gives a PAYG comparison', /Saving vs PAYG \$/.test(settle));

const journal = files[names.find(n => /journal/.test(n))];
ok('journal carries definitions', /Column definitions/.test(journal));
ok('journal points at the settlement export', /use the settlement export or Post to GL/.test(journal));
ok('every CSV stamps the billing period', [gl, settle, journal].every(t => /March 2027/.test(t)));

// ---------- workbook ----------
const xlsxName = names.find(n => n.endsWith('.xlsx'));
fs.mkdirSync('C:/Studio proj/Analytics-Hub/_audit', { recursive: true });
fs.writeFileSync('C:/Studio proj/Analytics-Hub/_audit/' + xlsxName, files[xlsxName]);
ok('workbook exported', files[xlsxName].length > 10000);

console.log('\n' + (fails ? fails + ' FAILURES' : 'ALL PASS'));
process.exit(fails ? 1 : 0);
