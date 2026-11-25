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
    // Dated, error-specific support evidence is not a normal installation path.
    const source = read(file).replace(
      /<template id="paxCsvTroubleshooting">[\s\S]*?<\/template>/, '');
    for (const match of source.matchAll(/https:\/\/(?:github\.com|raw\.githubusercontent\.com)\/[^\s"'<>`]+/g)) {
      const url = decodeURIComponent(match[0]);
      assert.doesNotMatch(url,
        /^https:\/\/github\.com\/[^/]+\/[^/]+\/archive\//i,
        file + ': repository archive downloads must go through setup guidance');
      assert.doesNotMatch(url,
        /\/releases\/(?:latest\/)?download\/|\.pbit\b|\.pbix\b|\.zip\b|\.exe\b/i,
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

test('PAX CSV support pins only the verified diagnostic asset and preserves production guidance', () => {
  const help = template('paxCsvTroubleshooting');
  const release = 'https://github.com/microsoft/PAX/releases/';
  const tag = 'purview-v2.0.0-prerelease-20261110-16';
  const filename = 'PAX_Purview_Audit_Log_Processor_v2.0.0-prerelease-20261110-16.ps1';
  const downloads = [...help.matchAll(/href="([^"]+\/download\/[^"]+)"/g)];
  assert.deepEqual(downloads.map(match => match[1]), [release + 'download/' + tag + '/' + filename]);
  assert.ok(help.includes(release + 'tag/' + tag));
  assert.ok(help.includes(release + 'latest'));
  for (const phrase of [
    'field larger than field limit (131072)', 'remains a prerelease, not production',
    'November 20, 2026', 'Keep retained exports', 'PAX script path',
    'publication/readback must finish', 'does not prove the dashboard is working',
    'ECE52162A2DC0E9B563FA37DD3CEE5339ED1E637C47366D2AE5314452805512F',
  ]) assert.ok(help.includes(phrase), phrase);
  assert.doesNotMatch(help, /Ashish|Sukhija|customer log/i);
  for (const id of ['aioStep4', 'vlStep4', 'paxStep4']) {
    assert.ok(catalog.includes("return _" + id +
      ".innerHTML + document.getElementById('paxCsvTroubleshooting').innerHTML"));
  }
});

const guideAliases = fs.readdirSync(path.join(docs, 'choose-report'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => ({ id: entry.name, file: path.join('choose-report', entry.name, 'index.html') }))
  .filter(alias => fs.existsSync(path.join(docs, alias.file)))
  .filter(alias => /<link\b[^>]*rel="canonical"[^>]*href="https:\/\/microsoft\.github\.io\/Analytics-Hub\/choose-report\//.test(read(alias.file)));

function assertCatalogRoutes(entries) {
  const ids = entries.map(tool => tool.id);
  assert.ok(guideAliases.length > 0, 'Published guide aliases must be discoverable');
  assert.equal(new Set(ids).size, ids.length, 'Catalog IDs must be unique');
  assert.deepEqual([...ids].sort(), guideAliases.map(alias => alias.id).sort(),
    'Every published guide alias must have exactly one canonical catalog entry');
  for (const tool of entries) {
    assert.match(tool.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Route-safe catalog ID');
    assert.ok(tool.title && tool.title.trim(), tool.id + ': title');
    assert.ok(tool.repo, tool.id + ': repository action');
    assert.equal(new URL(tool.repo).protocol, 'https:', tool.id + ': HTTPS repository action');
    assert.equal(tool.download, '', tool.id);
  }
  for (const alias of guideAliases) {
    const source = read(alias.file);
    const canonical = 'https://microsoft.github.io/Analytics-Hub/choose-report/' + alias.id + '/';
    assert.ok(source.includes('href="' + canonical + '"'), alias.id + ': canonical URL');
    const refresh = source.match(/<meta http-equiv="refresh" content="([^"]+)"/);
    assert.ok(refresh, alias.id + ': no-JS redirect');
    const scripted = source.match(/new URL\('([^']+)', location.href\)/);
    assert.ok(scripted, alias.id + ': scripted redirect');
    for (const destination of [refresh[1].replace(/^0;\s*url=/, ''), scripted[1]]) {
      const url = new URL(destination, canonical);
      assert.equal(url.origin + url.pathname,
        'https://microsoft.github.io/Analytics-Hub/choose-report/', alias.id + ': served catalog');
      assert.equal(url.hash, '#r=' + alias.id, alias.id + ': guide destination');
    }
  }
}

test('all catalog entries match published guide aliases and retain repository actions', () => {
  assertCatalogRoutes(tools);
  assert.ok(tools.some(tool => tool.id === 'ai-solutions-intelligence'),
    'AI Solutions Intelligence must remain covered by the catalog regression');
  assert.doesNotMatch(catalog, /Download this template on GitHub/);
  assert.match(catalog, /Open the README and setup guidance/);
  assert.match(catalog, /Follow the repository README and setup guidance for the current template/);
  assert.match(catalog, /"download": "\.\.\/tools\/copilot-roi-calculator\/preview\/Copilot-ROI-Executive-Deck\.pptx"/);
  assert.match(catalog, /'" download>Download the executive deck \(PPTX\)<\/a>'/);
  assert.doesNotMatch(read('app.js'), /\$\{(?:t|best)\.download\}/);
});

test('catalog route checks reject omissions, duplicate IDs and invalid repository actions', () => {
  assert.throws(() => assertCatalogRoutes(tools.slice(1)), /Every published guide alias/);
  assert.throws(() => assertCatalogRoutes([...tools, tools[0]]), /unique/);
  for (const change of [{ repo: '' }, { repo: 'http://example.com' }, { download: 'template.pbit' }]) {
    assert.throws(() => assertCatalogRoutes(
      tools.map((tool, index) => index === 0 ? { ...tool, ...change } : tool)));
  }
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
  assert.match(template('caStep4'), /same successful PAX run and reporting window/);
  assert.match(template('caStep4'), /Keep exports outside Git/);
  assert.match(catalog, /Never commit tokens or client secrets/);
  const cowork = template('cwiStep4');
  assert.match(cowork, /https:\/\/github\.com\/microsoft\/What-I-did-with-Cowork/);
  assert.doesNotMatch(cowork, /\.zip/);
  assert.match(template('csuStep4'), /no preconfigured row-level security role/);
});

test('ValueLens setup distinguishes the sample app, active installers and archived routes', () => {
  const tool = tools.find(tool => tool.id === 'value-lens');
  const setup = template('vlStep4');
  assert.match(tool.blurb, /browser app/);
  assert.match(tool.blurb, /archived routes/);
  assert.match(tool.blurb, /scenarios, not measured savings/);
  assert.equal(tool.version, '2.0');
  assert.match(tool.requirements.roles[0].label, /own-data collection only/);
  assert.ok(tool.requirements.software[0].url.endsWith('/app/README.md'));
  assert.match(tool.requirements.software[1].label, /June 2024/);
  assert.match(setup, /aria-selected="true" data-cc="5">Browser app/);
  assert.match(setup, /cc-panel active[^>]+data-cc="5"/);
  assert.match(setup, /Download raw file/);
  assert.match(setup, /app\/download\/ValueLens-App\.html/);
  assert.match(setup, /No Fabric: PAX \+ SharePoint/);
  assert.match(setup, /does <strong>not<\/strong> deploy the app/);
  assert.match(setup, /SharePoint Site URL/);
  assert.match(setup, /not a combined permission list/);
  assert.match(setup, /gives no site access until an authorised administrator/);
  assert.match(setup, /tenant-wide report privacy settings needs your organisation's approval/);
  assert.match(setup, /archive\/5\.%20Local%20CSV\/README\.md/);
  assert.match(setup, /archive\/3\.%20Power%20Automate%20%2B%20Dataverse\/README\.md/);
  assert.doesNotMatch(setup, /\/main\/3\.%20Power%20Automate%20%2B%20Dataverse\/scripts\//);
  assert.doesNotMatch(catalog, /ValueLens-for-Microsoft-Copilot\/tree\/main\/1\.%20Local%20CSV/);
  assert.doesNotMatch(setup, /dashboard as a Fabric app called|no terminal and no Power BI Desktop/);
  assert.match(catalog, /\.vl-setup th,\.vl-setup td,\.vl-setup code\{overflow-wrap:anywhere\}/);
  const getCopy = catalog.match(/var getCopy = ([\s\S]*?);\s*var /)[1];
  const evaluateCopy = id => vm.runInNewContext(getCopy, {
    t: { id }, isInstaller: false, isPbi: true, isRepo: true,
  });
  assert.match(evaluateCopy('value-lens'), /downloaded browser app/);
  assert.match(evaluateCopy('cowork-adoption'), /paired PAX v2/);
});

test('ValueLens demo requirements stay separate from installation and downloaded app requirements', () => {
  const demo = demos.reports.find(report => report.id === 'value-lens');
  assert.match(demo.blurb, /Power BI demo/);
  assert.match(demo.requirements.software[0].label, /June 2024/);
  assert.match(demo.requirements.software[1].label, /Fabric route only/);
  assert.ok(demo.resources.some(resource => resource.url.endsWith('/app/README.md')));
  assert.equal(new URL(demo.embedUrl).protocol, 'https:');
  assert.equal(new URL(demo.embedUrl).searchParams.get('reportId'), '7d3da952-7b07-4ee9-a06f-378a7962775f');
});

test('Cowork impact preview uses current public resources without promising removed demo artifacts', () => {
  const tool = tools.find(tool => tool.id === 'cowork-impact');
  const setup = template('cwiStep4');
  assert.match(tool.blurb, /business processes, projects and Cowork-fit/);
  assert.match(tool.meta.license, /Copilot Cowork access/);
  assert.match(tool.requirements.roles[0].label, /Microsoft Graph/);
  assert.match(setup, /Preview \(no data\)/);
  assert.match(setup, /https:\/\/youtu\.be\/rNcVOnRO5IU/);
  assert.match(setup, /What-I-did-with-Cowork#report-highlights/);
  assert.match(setup, /What-I-did-with-Cowork#run-the-scripts-directly-dev/);
  assert.match(setup, /--in/);
  assert.match(setup, /--data/);
  assert.doesNotMatch(catalog, /cowork-roi-report-demo\.pdf|skill\/examples\/demo_sessions\.json/);
  assert.doesNotMatch(setup, /<code>python (?:classify|compute|build_report|to_csv)\.py<\/code>/);
  assert.match(setup, /not an interactive report/);
  assert.match(setup, /expected sessions/);
  assert.match(template('cwiHero'), /data-frames="7"/);
  assert.equal(tool.demoVideo, 'https://youtu.be/rNcVOnRO5IU');
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
