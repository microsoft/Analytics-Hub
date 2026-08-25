/* Case-variant folding in the GitHub popular-paths tables.
 *
 * GitHub returns popular paths using whatever casing the visitor typed, and
 * repo URLs are case-insensitive, so /microsoft/CreditUsage and
 * /microsoft/creditusage are the same page reported twice. On CreditUsage that
 * split the overview nearly in half (782 vs 756) and it read as two pages.
 *
 * The dangerous half of this fix is over-folding. Git is case-sensitive for
 * file paths, so /blob/main/README.md and /blob/main/readme.md are genuinely
 * different URLs. Only the owner and repo segments may be folded. Both
 * directions are asserted below.
 */
const fs = require('fs'), path = require('path'), { JSDOM } = require('jsdom');
const DIR = 'C:/Studio proj/Analytics-Hub/docs/pages-analytics';
const RAW = JSON.parse(fs.readFileSync('C:/Studio proj/Analytics-Hub/docs/data/traffic-history.json', 'utf8'));
const APP_SRC = fs.readFileSync(path.join(DIR, 'app.js'), 'utf8');
const HTML = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');

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

// ---- unit level: the key function itself
const w0 = boot(RAW);
setTimeout(() => {
  const k = w0.canonicalPathKey;
  ok('canonicalPathKey exists', typeof k === 'function');
  ok('repo casing folds',
    k('/microsoft/CreditUsage') === k('/microsoft/creditusage'));
  ok('owner casing folds',
    k('/Microsoft/CreditUsage') === k('/microsoft/creditusage'));
  ok('file path casing does NOT fold',
    k('/microsoft/CreditUsage/blob/main/README.md') !== k('/microsoft/CreditUsage/blob/main/readme.md'));
  ok('different files stay apart',
    k('/microsoft/CreditUsage/blob/main/a.md') !== k('/microsoft/CreditUsage/blob/main/b.md'));
  ok('deep path under folded repo still folds at the repo only',
    k('/microsoft/CREDITUSAGE/blob/main/README.md') === k('/microsoft/creditusage/blob/main/README.md'));

  // ---- table level, against the real data
  const rows = [...w0.document.querySelectorAll('#paths-rollup-tbody tr')]
    .map((tr) => [...tr.querySelectorAll('td')].map((t) => t.textContent.trim()));
  console.log('\n  top rollup rows:');
  rows.slice(0, 6).forEach((r) => console.log('    ' + r.join(' | ')));

  const lower = rows.filter((r) => /\/microsoft\/creditusage\s*$/i.test(r[0].replace(/\d+ spellings/, '').trim()));
  ok('CreditUsage overview appears exactly once', lower.length === 1);

  if (lower.length === 1) {
    const views = Number(lower[0][1].replace(/,/g, ''));
    /* Derive the expected total from the data rather than pinning a literal.
       The nightly collector moves these numbers every day, so a hardcoded sum
       fails for a reason that has nothing to do with the folding logic. */
    let expected = 0;
    for (const repo of Object.values(RAW.repos || {})) {
      for (const p of (repo.paths || [])) {
        if (k(p.path) === '/microsoft/creditusage') expected += p.count || 0;
      }
    }
    console.log('  expected merged views from source data: ' + expected);
    ok('merged views are the sum of both spellings', expected > 0 && views === expected);
    ok('uniques marked as an upper bound', lower[0][2].startsWith('\u2264'));
    ok('row labelled as merged', /spellings/.test(lower[0][0]));
  }

  // No two rendered rows may fold to the same key, or the fold did not apply.
  const keys = rows.map((r) => k(r[0].replace(/\d+ spellings/, '').trim()));
  ok('no duplicate keys remain in the table', new Set(keys).size === keys.length);

  // README casing is not present twice in the source data, so synthesise it.
  // The count is set high enough to reach the top 15, otherwise the row never
  // renders and the assertion passes without testing anything.
  const synth = JSON.parse(JSON.stringify(RAW));
  const repo = synth.repos['microsoft/CreditUsage'];
  repo.paths.push(
    { path: '/microsoft/CreditUsage/blob/main/README.md', title: null, count: 900, uniques: 500 },
    { path: '/microsoft/CreditUsage/blob/main/readme.md', title: null, count: 890, uniques: 480 },
  );
  const w1 = boot(synth);
  setTimeout(() => {
    const rows1 = [...w1.document.querySelectorAll('#paths-rollup-tbody tr')]
      .map((tr) => [...tr.querySelectorAll('td')].map((t) => t.textContent.trim()));
    const readmes = rows1.filter((r) => /creditusage\/blob\/main\/readme\.md/i.test(r[0]));
    console.log('\n  creditusage readme rows: ' + JSON.stringify(readmes.map((r) => r[0] + ' = ' + r[1])));
    ok('both README casings rendered', readmes.length === 2);
    ok('neither README row is marked merged', readmes.every((r) => !/spellings/.test(r[0])));
    // The real snapshot already carries README.md at 41 views, so the injected
    // 900 sums to 941 on that exact path. That is correct: identical paths do
    // merge. What must not happen is the two casings collapsing into one row.
    const counts = readmes.map((r) => Number(r[1].replace(/,/g, '')));
    console.log('  counts: ' + counts.join(' and ') + ' (must not be their sum on one row)');
    ok('README rows hold different counts', counts.length === 2 && counts[0] !== counts[1]);
    ok('no row carries the combined total',
      !counts.includes(counts[0] + counts[1]));

    console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PASS'));
    process.exit(fails ? 1 : 0);
  }, 400);
}, 500);
