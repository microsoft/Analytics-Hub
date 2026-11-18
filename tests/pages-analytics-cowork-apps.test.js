const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('docs/pages-analytics/app.js');
const correlation = read('docs/pages-analytics/enablement-correlation.js');
const forecast = read('docs/tools/cowork-credit-forecasting/index.html');
const base = 'https://microsoft.github.io/Analytics-Hub/';

function analyticsContext() {
  const tbody = { innerHTML: '' };
  const context = { document: { getElementById: () => tbody } };
  vm.createContext(context);
  vm.runInContext(app.slice(0, app.indexOf('// Quick preview numbers')), context);
  vm.runInContext(app.slice(app.indexOf('function renderSubAppRankings('),
    app.indexOf('// ------------------------------------------------------------ cowork billing tab')), context);
  vm.runInContext('function fmt(n) { return String(n); }', context);
  return { context, tbody };
}

test('both requested families render in sub-app rankings without changing existing families', () => {
  const { context, tbody } = analyticsContext();
  context.renderSubAppRankings({
    'analytics-hub': { snapshotsByUrl: { '2026-11-18': [
      { metricName: 'Traffic', information: [
        { Url: base + 'choose-report/#r=cowork-super-user', sessionsCount: '8', pagesViews: '11' },
        { Url: base + 'tools/cowork-credit-forecasting/', sessionsCount: '5', pagesViews: '7' },
        { Url: base + 'tools/copilot-roi-calculator/', sessionsCount: '3', pagesViews: '4' },
      ] },
      { metricName: 'ScrollDepth', information: [
        { Url: base + 'tools/cowork-credit-forecasting/', sessionsCount: '5', pagesViews: '7' },
      ] },
    ] } },
  });
  assert.match(tbody.innerHTML, /Cowork Super User<\/td>\s*<td class="num">8<\/td>/);
  assert.match(tbody.innerHTML, /Cowork Credit Forecasting<\/td>\s*<td class="num">5<\/td>\s*<td class="num">7<\/td>/);
  assert.match(tbody.innerHTML, /Copilot ROI Calculator<\/td>\s*<td class="num">3<\/td>/);
  assert.equal(context.coworkApp(base + 'tools/cowork-credit-forecasting/'), null,
    'forecast visits must not be reported as measured upload/demo runs');
});

test('engagement correlation recognizes direct and catalog routes and excludes local data', () => {
  const context = vm.createContext({});
  vm.runInContext(correlation.slice(0, correlation.indexOf('function topRowsFromMap(')), context);
  for (const key of ['cowork-super-user', 'cowork-credit-forecasting']) {
    for (const route of ['choose-report/' + key + '/', 'choose-report/#r=' + key,
      'choose-report/?catalog=version#d=' + key]) {
      assert.equal(context.matchReportFamily(base + route), key, route);
    }
  }
  const series = context.readReportSeries({ snapshotsByUrl: { '2026-11-18': [
    { metricName: 'Traffic', information: [
      { Url: base + 'tools/cowork-credit-forecasting/', sessionsCount: '9', totalBotSessionCount: '2' },
      { Url: base + 'choose-report/#r=cowork-super-user', sessionsCount: '4' },
      { Url: 'http://127.0.0.1/choose-report/#r=cowork-super-user', sessionsCount: '100' },
    ] },
  ] } });
  assert.equal(series['cowork-credit-forecasting'].get('2026-11-18'), 7);
  assert.equal(series['cowork-super-user'].get('2026-11-18'), 4);
  assert.equal(context.reportGuideHref({ key: 'cowork-credit-forecasting' }),
    '../choose-report/#r=cowork-credit-forecasting');
});

test('unobserved families are not presented as measured zero traffic', () => {
  const { context, tbody } = analyticsContext();
  context.renderSubAppRankings({
    'analytics-hub': { snapshotsByUrl: { '2026-11-18': [
      { metricName: 'Traffic', information: [
        { Url: base + 'choose-report/#r=cowork-super-user', sessionsCount: '0', pagesViews: '0' },
      ] },
    ] } },
  });
  assert.match(tbody.innerHTML, /Cowork Super User<\/td>\s*<td class="num">0<\/td>/);
  assert.match(tbody.innerHTML, /Cowork Credit Forecasting<\/td>\s*<td class="num">—<\/td>/);
});

test('nightly collector includes the Super User repository once and does not invent a forecasting repo', () => {
  const collector = read('scripts/snapshot_traffic.py');
  const repos = collector.match(/REPOS: list\[str\] = \[([\s\S]*?)\n\]/)[1];
  assert.equal((repos.match(/"microsoft\/CoworkSuperUser"/g) || []).length, 1);
  assert.doesNotMatch(repos, /forecasting/i);
});

test('forecast analytics loads only on production HTTPS, with masked content and existing consent controls', () => {
  const loader = [...forecast.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).find(script => script.includes('clarity.ms/tag/'));
  assert.ok(loader);
  for (const [protocol, hostname, expected] of [
    ['https:', 'microsoft.github.io', 1],
    ['http:', 'localhost', 0],
    ['http:', '127.0.0.1', 0],
    ['file:', '', 0],
    ['https:', 'preview.example.com', 0],
  ]) {
    const inserted = [];
    const window = {};
    const first = { parentNode: { insertBefore: script => inserted.push(script) } };
    vm.runInNewContext(loader, {
      location: { protocol, hostname }, window,
      document: { createElement: () => ({}), getElementsByTagName: () => [first] },
    });
    assert.equal(inserted.length, expected, hostname);
    if (expected) assert.equal(inserted[0].src, 'https://www.clarity.ms/tag/wxb0r23ozh');
  }
  assert.match(forecast, /<body data-clarity-mask="true">/);
  assert.match(forecast, /src="\.\.\/\.\.\/consent\.js\?v=1" defer/);
  assert.match(forecast, /<footer class="foot site-footer">/);
  assert.match(forecast, /Site usage analytics are collected with page content masked/);
  assert.doesNotMatch(forecast, /nothing is (?:uploaded|stored or sent)/);
  for (const script of forecast.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    new vm.Script(script[1]);
  }
});
