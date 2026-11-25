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
const tool = tools.find(t => t.id === 'ess-insights');
const template = id => catalog.match(new RegExp(
  '<template id="' + id + '">([\\s\\S]*?)</template>'))[1];
const setup = template('essStep4');
const hero = template('essHero');
const fallback = vm.runInNewContext('({' + catalog.match(
  /'ess-insights': \{([\s\S]*?)\n    \},\s*\n    'value-lens':/)[1] + '})', {
  lk: (url, label) => '<a href="' + url + '">' + label + '</a>',
});

test('ESS catalog labels the stable Dataverse package without promoting the newer RC', () => {
  assert.equal(tool.version, '23.2');
  assert.equal(tool.download, '');
  assert.equal(tools.filter(t => t.version === '23.2').length, 1);
  assert.match(tool.blurb, /Dataverse V23.2 is the stable package/);
  assert.match(tool.blurb, /V23.2.1 RC1 is a test-only visual hotfix/);
  assert.match(tool.blurb, /CSV V18 and Fabric V2/);
  assert.match(setup, /November 25, 2026/);
  assert.match(setup, /releases\/tag\/dataverse-v23.2"/);
  assert.match(setup, /releases\/tag\/dataverse-v23.2.1-rc1"/);
  assert.match(setup, /ESS-039417f-optional-fixes-V23.2.zip/);
  assert.match(setup, /Extract All/);
  assert.match(setup, /Do not use GitHub's Source code ZIP/);
  assert.doesNotMatch(setup, /href="[^"]*(?:\/download\/|\.pbit|\.zip|\.exe)/);
  assert.match(setup, /Python 3.10-3.14/);
  assert.match(setup, /Python 3.15 is not supported/);
  assert.match(setup, /older V23 package and older transcript settings/);
});

test('ESS Dataverse starts on the recommended route with distinct validation and publication', () => {
  assert.match(setup, /aria-selected="true" data-cc="2"/);
  assert.match(setup, /cc-panel active" role="tabpanel" data-cc="2"/);
  for (const phrase of [
    'Developer resources &rarr; Environment URL',
    '.\\START-HERE-DATAVERSE.cmd',
    'tools\\guided_dataverse_setup.py --mode desktop-validation',
    'Desktop Validation - LOCAL ONLY',
    '.\\BUILD-SERVICE-REFRESH.cmd',
    'tools\\guided_dataverse_setup.py --mode service-refresh',
    'Power BI Service - PUBLISH THIS',
    'ESS Dashboard - Dynamic Topics (Dataverse) V23 - Power BI Service - PUBLISH THIS.pbit',
    'no registry, Organization or Credits file parameters',
    'Enter skips', 'selected/skipped summary', 'Organization-only setup is supported',
    'SharePoint.Files', 'file existence, access and schema', 'Rebuild when the file location changes',
    'py -3.14 tools\\guided_dataverse_setup.py --mode service-refresh',
    'Refresh history: Completed', 'expected report readback',
  ]) assert.ok(setup.includes(phrase), phrase);
  assert.match(setup, /never the <strong>Desktop Validation - LOCAL ONLY<\/strong> PBIX/);
  assert.match(setup, /Contributor, Member or Admin/);
  assert.match(setup, /OAuth2 \/ Organizational/);
  assert.match(setup, /then enable a schedule/);
});

test('ESS access, transcript channels, optional sources and sharing remain route-specific', () => {
  assert.match(tool.requirements.roles[0].label, /Bot Transcript Viewer \+ ESS Power BI Transcript Reader/);
  assert.match(tool.requirements.roles[0].label, /conversationtranscript and systemuser/);
  assert.match(tool.requirements.software[1].label, /not URL-only Dataverse/);
  for (const phrase of [
    'Teams and Microsoft 365 Copilot are valid publishing channels',
    '30 minutes of inactivity', 'System Administrator is not required',
    'CSV needs transcript Read', 'Fabric uses a Dataverse Application User',
    'agent-registry.json', 'Agent Registry JSON',
    'User-Level Credit Consumption', 'modeled allocations',
    'Files/config/agent-registry.csv', 'Import',
    'no organization-ingestion notebook is included',
    'Fabric F64+', 'Website or portal', 'HTTPS',
    'Never use <strong>Publish to web</strong>',
    'does not prove report refresh/readback',
    'refresh against a live Lakehouse is not yet confirmed',
  ]) assert.ok(setup.includes(phrase), phrase);
  assert.doesNotMatch(setup, /Message Consumption|Comment out that one filter|Teams and Microsoft 365 Copilot environments do not/);
});

test('ESS retained previews are explicitly illustrative and cannot establish version equivalence', () => {
  assert.match(hero, /DATAVERSE STABLE VERSION 23.2/);
  assert.match(hero, /Retained nine-page illustrative preview/);
  assert.match(hero, /ten pages, including Glossary/);
  assert.match(hero, /do not establish package or demo version equivalence/);
  assert.match(hero, /data-frames="9" data-base="ess-frames"/);
  assert.equal([...hero.matchAll(/class="ess-dot"/g)].length, 9);
  for (let n = 0; n < 9; n++) {
    assert.ok(fs.existsSync(path.join(docs, 'choose-report', 'ess-frames',
      'frame_' + String(n).padStart(2, '0') + '.jpg')));
  }
  assert.equal(tool.preview, 'https://raw.githubusercontent.com/microsoft/ESS/main/images/dashboard-preview.gif');
  assert.equal(tool.demoVideo, 'https://youtu.be/dQqgcUs9Ly4');
  const demos = JSON.parse(read('demos/embeds.json'));
  assert.ok(!demos.reports.some(t => /microsoft\/ESS(?:$|[#/])/.test(t.repo || '')),
    'No ESS secure demo identity is supplied; do not invent an embed or version');
});

test('ESS fallback and ancillary install/overview copy cannot resurrect obsolete guidance', () => {
  const text = JSON.stringify(fallback);
  for (const phrase of [
    'V23.2 is stable', 'V23.2.1 RC1 is a test-only', 'systemuser',
    'Desktop Validation - LOCAL ONLY', 'Power BI Service - PUBLISH THIS',
    'Python 3.10-3.14', 'Completed plus expected readback', 'instructions conflict',
    'not the ten-page stable Dataverse package',
  ]) assert.ok(text.includes(phrase), phrase);
  assert.doesNotMatch(text, /do not write transcripts|Copilot Studio Analytics|explore the nine pages/);
  assert.match(catalog, /Get the complete validated package/);
  assert.match(catalog, /Its retained preview is not proof of the current stable or RC package/);
  assert.match(read('report-ecosystem/library.js'), /Stable Dataverse V23.2 release \(not RC\)/);
  assert.match(read('choose-report/ess-insights/index.html'), /#r=ess-insights/);
});
