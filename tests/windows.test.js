/* Drives every window option against the real data and reads the resulting
   numbers out of the DOM, so the toggles are proven to change what they claim
   to change rather than merely existing. */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const DIR = 'C:/Studio proj/Analytics-Hub/docs/pages-analytics';
const DATA = fs.readFileSync('C:/Studio proj/Analytics-Hub/docs/data/traffic-history.json', 'utf8');

const dom = new JSDOM(fs.readFileSync(path.join(DIR, 'index.html'), 'utf8'), {
  url: 'https://microsoft.github.io/Analytics-Hub/pages-analytics/',
  runScripts: 'outside-only', pretendToBeVisual: true,
});
const w = dom.window;
w.clarity = () => {};
w.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(DATA)) });
w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
if (!w.history.replaceState) w.history.replaceState = () => {};
w.requestAnimationFrame = (cb) => setTimeout(cb, 0);

try { w.eval(fs.readFileSync(path.join(DIR, 'app.js'), 'utf8')); }
catch (e) { console.log('EVAL ERROR: ' + e.message); process.exit(1); }
w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));

const g = (id) => { const e = w.document.getElementById(id); return e ? e.textContent.trim() : '(missing)'; };
const q = (sel) => { const e = w.document.querySelector(sel); return e ? e.textContent.trim() : '(missing)'; };

let fails = 0;
const ok = (n, c) => { if (!c) { fails++; console.log('  FAIL ' + n); } else console.log('  ok   ' + n); };

setTimeout(() => {
  const windows = ['3d', '7d', '14d', '30d', 'ytd'];
  const seen = {};
  console.log('window   views    clones   dl       webSess  foot');
  console.log('-'.repeat(96));
  for (const key of windows) {
    const btn = w.document.querySelector(`[data-window="${key}"]`);
    if (!btn) { fails++; console.log('  FAIL missing button ' + key); continue; }
    btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const row = {
      views: q('[data-kpi="views"]'),
      clones: q('[data-kpi="clones"]'),
      dl: q('[data-kpi="downloads"]'),
      web: g('cowork-kpi-web-sessions'),
      foot: g('cowork-kpi-web-sessions-foot'),
    };
    seen[key] = row;
    console.log(key.padEnd(9) + row.views.padEnd(9) + row.clones.padEnd(9) +
      row.dl.padEnd(9) + row.web.padEnd(9) + row.foot.slice(0, 44));
  }

  console.log('');
  const n = (s) => +String(s).replace(/[^0-9]/g, '') || 0;
  ok('3d views < 14d views', n(seen['3d'].views) < n(seen['14d'].views));
  ok('14d views < 30d views', n(seen['14d'].views) <= n(seen['30d'].views));
  ok('3d web sessions < 14d web sessions', n(seen['3d'].web) < n(seen['14d'].web));
  ok('window labels updated', q('[data-window-label]') === 'YTD');
  ok('downloads constant across windows (lifetime figure)',
    new Set(windows.map((k) => seen[k].dl)).size === 1);
  ok('every window produced a web figure', windows.every((k) => seen[k].web !== '—' && seen[k].web !== '(missing)'));

  console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PASS'));
  process.exit(fails ? 1 : 0);
}, 2500);
