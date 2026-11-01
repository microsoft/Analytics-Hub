const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const docs = path.resolve(__dirname, '..', 'docs');
const read = file => fs.readFileSync(path.join(docs, file), 'utf8');
const catalog = read('choose-report/index.html');
const tools = JSON.parse(catalog.match(
  /<script id="mk-data" type="application\/json">([\s\S]*?)<\/script>/)[1]).TOOLS;
const demos = JSON.parse(read('demos/embeds.json'));
const sources = [
  'app.js', 'choose-report/index.html', 'demos/embeds.json',
  'report-ecosystem/library.js',
  'guide/cowork.guide.json', 'guide/consumption-central.guide.json',
];
const template = id => catalog.match(new RegExp(
  '<template id="' + id + '">([\\s\\S]*?)</template>'))[1];

test('live installation links delegate artifacts and current filenames to repository guidance', () => {
  for (const file of sources) {
    const source = read(file);
    for (const match of source.matchAll(/https:\/\/(?:github\.com|raw\.githubusercontent\.com)\/[^\s"'<>`]+/g)) {
      const url = decodeURIComponent(match[0]);
      assert.doesNotMatch(url,
        /\/releases\/(?:latest\/)?download\/|\/archive\/|\.pbit\b|\.pbix\b|\.zip\b|\.exe\b/i,
        file + ': external installation/sample asset must go through README or setup guidance');
      assert.doesNotMatch(url,
        /(?:_v\d|[ -]v\d)[^/]*\.(?:ps1|py|md|kql)\b/i,
        file + ': versioned upstream filenames must not be pinned');
    }
    assert.doesNotMatch(source,
      /(?:[\w.-]+_v\d[\w.-]*\.(?:ps1|py)|(?:[ -]V\d|[ -]v\d)[\w.-]*\.(?:pbit|zip))/,
      file + ': stale command or template filename');
  }
});

test('all 27 catalog entries retain their repository action without redundant download actions', () => {
  assert.equal(tools.length, 27);
  for (const tool of tools) {
    assert.ok(tool.repo, tool.id);
    assert.equal(tool.download, '', tool.id);
  }
  assert.doesNotMatch(catalog, /Download this template on GitHub/);
  assert.match(catalog, /Open the README and setup guidance/);
  assert.match(catalog, /Follow the repository README and setup guidance for the current template/);
  assert.match(catalog, /"download": "\.\.\/tools\/copilot-roi-calculator\/preview\/Copilot-ROI-Executive-Deck\.pptx"/);
  assert.match(catalog, /'" download>Download the executive deck \(PPTX\)<\/a>'/);
  assert.doesNotMatch(read('app.js'), /\$\{(?:t|best)\.download\}/);
});

test('demo and ecosystem resource kinds and labels honestly describe documentation', () => {
  const context = { document: { readyState: 'loading', addEventListener() {} } };
  vm.runInNewContext(read('report-ecosystem/library.js') +
    '\nglobalThis.resources = RESOURCES;', context);
  const resources = [
    ...demos.reports.flatMap(report => report.resources || []),
    ...Object.values(context.resources).flat(),
  ];
  for (const resource of resources) {
    assert.notEqual(resource.kind, 'download', resource.url);
    assert.doesNotMatch(resource.label, /\bdownload\b/i, resource.url);
  }
  for (const report of demos.reports) {
    assert.ok(report.resources.some(resource => resource.kind === 'doc'), report.id);
  }
});

test('processor choices, setup paths, privacy safeguards, and Fabric validation warning remain', () => {
  for (const name of [
    'Purview Audit Log Processor', 'Graph Audit Log Processor',
    'Copilot Interactions Content',
  ]) assert.match(catalog, new RegExp(name));
  for (const page of ['SETUP-CSV-Download.md', 'SETUP-Dataverse.md', 'SETUP-Fabric.md']) {
    assert.ok(catalog.includes('https://github.com/microsoft/ESS/blob/main/' + page));
  }
  assert.match(catalog, /refresh against a live Lakehouse is not yet confirmed/);
  assert.match(catalog, /Input and output must be different folders/);
  assert.match(catalog, /Never commit tokens or client secrets/);
  const cowork = template('cwiStep4');
  assert.match(cowork, /https:\/\/github\.com\/microsoft\/What-I-did-with-Cowork/);
  assert.doesNotMatch(cowork, /\.zip/);
  assert.match(template('csuStep4'), /no preconfigured row-level security role/);
});

test('changed live JavaScript, JSON, and executable inline scripts parse', () => {
  for (const file of ['app.js', 'report-ecosystem/library.js']) {
    new vm.Script(read(file), { filename: file });
  }
  for (const file of ['demos/embeds.json', 'guide/cowork.guide.json',
    'guide/consumption-central.guide.json']) JSON.parse(read(file));
  for (const file of ['choose-report/index.html', 'index.html', 'demos/index.html',
    'report-ecosystem/index.html', 'guide/index.html']) {
    for (const script of read(file).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/(?:ld\+)?json/.test(script[1])) {
        JSON.parse(script[2]);
      } else {
        new vm.Script(script[2], { filename: file });
      }
    }
  }
});
