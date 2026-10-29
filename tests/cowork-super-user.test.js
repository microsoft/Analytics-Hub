const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const docs = path.resolve(__dirname, '..', 'docs');
const reportDir = path.join(docs, 'choose-report');
const html = fs.readFileSync(path.join(reportDir, 'index.html'), 'utf8');
const island = id => JSON.parse(html.match(new RegExp(
  '<script id="' + id + '" type="application/json">([\\s\\S]*?)</script>'))[1]);
const tools = island('mk-data').TOOLS;
const report = tools.find(t => t.id === 'cowork-super-user');
const template = id => html.match(new RegExp(
  '<template id="' + id + '">([\\s\\S]*?)</template>'))[1];

test('catalog retains 25 public reports and both existing incubations', () => {
  assert.equal(tools.length, 27);
  assert.equal(new Set(tools.map(t => t.id)).size, 27);
  assert.equal(tools.filter(t => !t.incubating).length, 25);
  assert.deepEqual(tools.filter(t => t.incubating).map(t => t.id),
    ['cowork-adoption', 'ai-solutions-intelligence']);
  assert.equal(report.title, 'Cowork Super User');
  assert.doesNotMatch(html, /[Tt]wenty-four open-source/);
  assert.equal(report.repo, 'https://github.com/microsoft/CoworkSuperUser');
  assert.match(report.download, /CoworkSuperUser\.pbit$/);
  assert.doesNotMatch(JSON.stringify(report), /\.pbix/i);
  assert.match(report.blurb, /Public and in testing/);
});

test('every executable inline script compiles', () => {
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/application\/json/.test(script[1])) continue;
    new vm.Script(script[2]);
  }
});

test('guide wires the report-specific hero, data contract, and nine pages', () => {
  assert.match(html, /t\.id === 'cowork-super-user'[\s\S]*?getElementById\('csuStep4'\)/);
  assert.match(html, /t\.id === 'cowork-super-user'[\s\S]*?getElementById\('csuHero'\)/);
  const hero = template('csuHero');
  assert.doesNotMatch(hero, /built by microsoft/i);
  assert.match(hero, /<div class="cc-badges"><span>POWER BI TEMPLATE<\/span><span>PUBLIC &middot; IN TESTING<\/span><\/div>/);
  assert.match(hero, /class="su-player" data-frames="9"/);
  assert.doesNotMatch(hero, /data-autoplay="false"/);
  assert.match(hero, /<img class="su-img" src="cowork-super-user\/media\/pages\/01-overview\.png"/);
  assert.match(hero, /width="2085" height="1172" loading="eager"/);
  assert.match(hero, /Auto-playing &middot; pause to inspect/);
  const controls = hero.match(/<div class="su-controls">([\s\S]*?)<\/div>/)[1];
  assert.deepEqual([...controls.matchAll(/data-act="([^"]+)"/g)].map(m => m[1]),
    ['prev', 'play', 'next']);
  assert.match(controls, /class="su-playico"/);
  assert.match(hero, /class="su-fs-cta"/);
  assert.doesNotMatch(hero, /\.gif|Pages do not advance automatically/);
  assert.doesNotMatch(hero, /<video\b|role="tab|CoworkSuperUser-Overview\.png/);
  const connect = template('csuStep4');
  for (const token of ['CoworkWeeklyMetrics.csv', 'PeopleMetaData.csv',
    'PeopleHistoricalId', 'DataFolder', 'Export by week', 'Appendix - Weekly detail',
    'Value assumptions', 'Category assumptions', 'no preconfigured row-level security']) {
    assert.ok(connect.includes(token), token);
  }
  assert.equal((connect.match(/<tr><td>(?:Overview|Cost Concentration|Trends|Group Breakdown|Value assumptions|Appendix - Share Shift|Appendix - Weekly detail|Metric Glossary|Category assumptions)<\/td>/g) || []).length, 9);
  assert.doesNotMatch(hero + connect, /\.pbix/i);
});

test('requirements describe authorized customer deployment, not a demonstration', () => {
  const roles = report.requirements.roles.map(r => r.label).join('\n');
  assert.match(roles, /Insights Analyst with global partition access OR Microsoft 365 Global Administrator/);
  assert.match(roles, /authorized read access to the customer's Cowork CSV source folder/);
  assert.match(roles, /If publishing.*Contributor, Member, or Admin; Pro or PPU/);
  assert.match(report.requirements.roles[0].url, /learn\.microsoft\.com\/viva\/insights\/org-team-insights\/export-ai-cost-metrics#prerequisites$/);
  assert.doesNotMatch(roles + report.blurb + report.meta.license, /\b(?:sample|synthetic|demo|fabricated)\b/i);
  assert.equal(report.meta.time, undefined);
  const context = vm.createContext({});
  for (const name of ['EFFORT', 'FACETS']) {
    const map = html.match(new RegExp('  var ' + name + ' = \\{[^]*?\\n  \\};'))[0];
    vm.runInContext(map, context);
  }
  assert.equal(context.EFFORT[report.id], undefined);
  assert.equal(context.FACETS[report.id].d.includes('sample'), false);
});

test('customer guide cites export evidence and enforces the task-level schema gate', () => {
  const connect = template('csuStep4');
  assert.doesNotMatch(connect, /\b(?:sample|synthetic|demo|fabricated)\b|14,599|240 metadata|219 distinct/i);
  assert.doesNotMatch(connect, /data-cc="(?:sample|production)"/);
  for (const text of ['public preview', 'PersonServiceCreditsMetrics.csv',
    'Do not rename the service-credit export or use sessions as tasks',
    'JobFunction', 'FunctionType', 'IsCopilotLicensed', '2&ndash;8 days behind',
    'Power BI Pro or PPU', 'Contributor, Member, or Admin',
    'AI Administrator', 'gateway', 'Stop and obtain the correct Cowork data',
    'No fresh customer-export import or refresh has been run for this guide']) {
    assert.ok(connect.includes(text), text);
  }
  for (const source of ['export-ai-cost-metrics', 'identification-copilot-analytics',
    'service-roles-new-workspaces', 'service-share-dashboards#prerequisites',
    'SETUP.md#data-contract']) {
    assert.ok(connect.includes(source), source);
  }
});

test('connection defaults to seven concrete actions, with safeguards beside the affected action', () => {
  const connect = template('csuStep4');
  const visible = connect.replace(/<details\b[\s\S]*?<\/details>/g, '');
  const plain = visible.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  const wordCount = plain.trim().split(/\s+/).length;
  assert.ok(wordCount <= 500, 'Default connection copy: ' + wordCount + ' words');
  assert.deepEqual([...visible.matchAll(/<span class="cc-num">(\d)<\/span>/g)].map(m => m[1]),
    ['1', '2', '3', '4', '5', '6', '7']);
  for (const text of ['You need', 'Request the weekly Cowork export',
    'Export by week', 'Export to CSV', 'PersonServiceCreditsMetrics.csv',
    'TaskCategory', 'TaskType', 'Total Cowork tasks',
    'Viva Insights analyst who handles Cowork exports or Microsoft 365 tenant administrator',
    'Do not rename the service-credit export or use sessions as tasks',
    'Continue only when both files are approved', 'Never guess missing metadata or license values',
    'Put the approved files in one folder', 'CoworkWeeklyMetrics.csv', 'PeopleMetaData.csv',
    'CoworkSuperUser.pbit', 'Set DataFolder', '<strong>Load</strong>',
    '<strong>Home</strong>', '<strong>Refresh</strong>', 'Check the result on Overview',
    'filters and slicers', 'Total credits used', 'Success check',
    'stop before sharing', 'no preconfigured row-level security role']) {
    assert.ok(visible.includes(text), text);
  }
  assert.ok(visible.indexOf('Stop if you receive the wrong export') <
    visible.indexOf('Get both files checked by your data owner'));
  assert.ok(visible.indexOf('Continue only when both files are approved') <
    visible.indexOf('Put the approved files in one folder'));
  assert.doesNotMatch(visible, /<table\b|learn\.microsoft\.com|Power BI Pro or PPU|AI Administrator|Appendix - Weekly detail/);
});

test('technical help is closed by default, with descriptive native summaries and retained checks', () => {
  const connect = template('csuStep4');
  const details = [...connect.matchAll(/<details\b([^>]*)>([\s\S]*?)<\/details>/g)];
  assert.equal(details.length, 5);
  assert.ok(details.every(d => !/\bopen\b/.test(d[1])));
  const summaries = details.map(d => d[2].match(/<summary><strong>([^<]+)<\/strong><\/summary>/)[1]);
  assert.deepEqual(summaries, [
    'Exact columns and data-owner checks',
    'Fix a file or refresh problem',
    'Publish and share with stakeholders (only after checks pass)',
    'Read all nine pages responsibly',
    'Why the export may differ, and the sources behind these steps'
  ]);
  assert.match(details[0][2], /Every usage row must match exactly one metadata row/);
  assert.match(details[0][2], /do not default an unknown license status to false/);
  assert.match(details[0][2], /renames <code>FunctionType<\/code> to <code>Function<\/code>/);
  assert.match(details[1][2], /Transform data &gt; Edit parameters/);
  assert.match(details[1][2], /Do not disable protections/);
  assert.match(details[2][2], /Do not share while any check is unresolved/);
  assert.match(details[2][2], /Test refresh in the service/);
  assert.match(details[3][2], /not productivity, quality, or employee performance/);
  assert.match(details[4][2], /No fresh customer-export import or refresh has been run/);
});

test('Overview uses the corrected YouTube video and retains the local still Preview', () => {
  assert.equal(report.demoVideos[0].url, 'https://www.youtube.com/watch?v=c23BOhnDLVU');
  assert.equal(report.demoVideos[0].label, 'Overview');
  assert.match(report.preview, /CoworkSuperUser-Overview\.png$/);
  assert.ok(fs.existsSync(path.join(reportDir, report.preview)));
  assert.doesNotMatch(JSON.stringify(report), /Full-Clickthrough\.gif/);
  assert.doesNotMatch(html, /CoworkSuperUser-Walkthrough\.mp4|3:43/);
});

test('guide and flyout use the shared privacy-enhanced embed and accessible watch link', () => {
  const context = vm.createContext({
    esc: value => value,
    escAsset: value => value,
    decodeEnt: value => value,
    titleOf: t => t.title
  });
  for (const name of ['safeUrl', 'ytIdOf', 'ytEmbedHtml', 'videoSlotUrl', 'gxSlot']) {
    vm.runInContext(html.match(new RegExp('  function ' + name + '\\([^]*?\\n  \\}'))[0], context);
  }
  assert.equal(context.ytIdOf(report.demoVideos[0].url), 'c23BOhnDLVU');
  for (const output of [
    context.videoSlotUrl(report.demoVideos[0].url, 'Cowork Super User Overview'),
    context.gxSlot(report, { kind: 'video', url: report.demoVideos[0].url, label: 'Overview' })
  ]) {
    assert.match(output, /src="https:\/\/www\.youtube-nocookie\.com\/embed\/c23BOhnDLVU\?rel=0&amp;enablejsapi=1"/);
    assert.match(output, /title="Cowork Super User Overview"/);
    assert.match(output, /referrerpolicy="strict-origin-when-cross-origin"/);
    assert.match(output, /href="https:\/\/youtu\.be\/c23BOhnDLVU"[^>]*>Watch on YouTube/);
    assert.doesNotMatch(output, /autoplay|<video\b/);
  }
});

test('hero viewer uses all nine authentic static captures in manifest order', () => {
  const crypto = require('node:crypto');
  const pages = path.join(reportDir, 'cowork-super-user', 'media', 'pages');
  const manifest = JSON.parse(fs.readFileSync(path.join(pages, 'capture-manifest.json')));
  const hero = template('csuHero');
  const files = JSON.parse(hero.match(/data-files='([^']+)'/)[1]);
  const labels = [...hero.matchAll(/class="su-dot"[^>]+aria-label="([^"]+)"/g)]
    .map(m => m[1].replace(/&ndash;/g, '\u2013'));
  assert.equal(manifest.length, 9);
  assert.deepEqual(files, manifest.map(p => p.file));
  assert.deepEqual(labels, manifest.map(p => p.page));
  for (const page of manifest) {
    const png = fs.readFileSync(path.join(pages, page.file));
    assert.equal(png.toString('ascii', 1, 4), 'PNG');
    assert.equal(png.readUInt32BE(16), page.width);
    assert.equal(png.readUInt32BE(20), page.height);
    assert.equal(crypto.createHash('sha256').update(png).digest('hex'),
      page.sha256.toLowerCase(), page.file);
  }
});

test('Cowork centers its three navigation buttons independently of the page counter', () => {
  const styles = html.match(/<style id="csu-hero-styles">([\s\S]*?)<\/style>/)[1];
  assert.match(styles, /\.csu-hero \.su-controls\{display:grid;grid-template-columns:repeat\(3,34px\);gap:8px 12px\}/);
  assert.match(styles, /\.csu-hero \.su-counter\{grid-column:1 \/ -1\}/);
});

test('shared Super User viewer initializes Cowork and the reference with default autoplay', () => {
  const script = html.match(/<script id="su-player">([\s\S]*?)<\/script>/)[1];
  const hero = template('csuHero');
  const files = JSON.parse(hero.match(/data-files='([^']+)'/)[1]);
  function initialize(cowork) {
    let timers = 0;
    const img = { src: '', alt: 'original' };
    const counter = { textContent: '' };
    const pageName = { textContent: '' };
    const dots = (cowork ? files : Array(11).fill('')).map((file, i) => ({
      setAttribute: () => {},
      getAttribute: name => name === 'aria-label' ? (i === 0 ? 'Overview' : 'Page ' + (i + 1)) : null
    }));
    const attrs = cowork
      ? { 'data-files': JSON.stringify(files), 'data-base': 'cowork-super-user/media/pages',
        'data-frames': '9' }
      : { 'data-base': 'su-frames', 'data-frames': '11' };
    const el = {
      getAttribute: key => attrs[key] || null,
      querySelector: key => ({ '.su-img': img, '.su-counter': counter,
        '[data-page-name]': cowork ? pageName : null }[key] || null),
      querySelectorAll: () => dots
    };
    vm.runInNewContext(script, {
      document: { readyState: 'complete', addEventListener: () => {},
        querySelectorAll: () => [el] },
      window: {},
      setInterval: () => { timers++; return 1; },
      clearInterval: () => {}
    });
    return { img, counter, pageName, timers };
  }
  const cowork = initialize(true);
  assert.equal(cowork.timers, 1);
  assert.equal(cowork.img.src, 'cowork-super-user/media/pages/01-overview.png');
  assert.equal(cowork.counter.textContent, '1 / 9');
  assert.equal(cowork.pageName.textContent, 'Overview');
  const legacy = initialize(false);
  assert.equal(legacy.timers, 1);
  assert.equal(legacy.img.src, 'su-frames/frame_00.jpg');
  assert.equal(legacy.counter.textContent, '1 / 11');
  assert.equal(legacy.img.alt, 'original');
});

test('guide uses the established video-only Overview below its hero preview', () => {
  const context = vm.createContext({
    mediaItems: () => [
      { key: 'v0', kind: 'video', label: 'Overview', url: report.demoVideos[0].url },
      { key: 'i', kind: 'image', label: 'Preview' }
    ],
    esc: value => value,
    gxSlot: (t, item) => item.kind
  });
  vm.runInContext(html.match(/  var HERO_GIF_IDS = \{[^]*?\n  \};/)[0], context);
  vm.runInContext(html.match(/  function gxMedia\([^]*?\n  \}/)[0], context);
  assert.equal(context.HERO_GIF_IDS[report.id], 1);
  const media = context.gxMedia(report);
  assert.match(media, /class="gx-figcap">Overview</);
  assert.match(media, /class="gx-figslot">video</);
  assert.doesNotMatch(media, /Preview|gx-figtabs|>image</);
  assert.match(html, /var heroHasPreview = !!HERO_GIF_IDS\[t\.id\] && videosOf\(t\)\.length === 0;/);
  assert.match(html, /Watch the narrated walkthrough, then follow the customer-data setup below/);
});

test('native and YouTube guide videos pause when their report tab or view becomes hidden', () => {
  const calls = [];
  const video = { pause: () => calls.push('pause') };
  const frame = {
    contentWindow: { postMessage: (message, origin) => calls.push([JSON.parse(message), origin]) }
  };
  const root = { querySelectorAll: selector => selector === 'video' ? [video] : [frame, { contentWindow: null }] };
  const context = vm.createContext({});
  vm.runInContext(html.match(/  function pauseGuideVideos\([^]*?\n  \}/)[0], context);
  context.pauseGuideVideos(root);
  assert.deepEqual(calls, ['pause',
    [{ event: 'command', func: 'pauseVideo', args: [] }, 'https://www.youtube-nocookie.com']]);
  const setView = html.match(/  function setView\([^]*?\n  \}/)[0];
  const showTab = html.match(/  function gdShowTab\([^]*?\n  \}/)[0];
  assert.match(setView, /if \(!guide\) pauseGuideVideos\(guidedPanel\)/);
  assert.match(showTab, /if \(p\.hidden\) pauseGuideVideos\(p\)/);
});

test('video helpers accept local MP4 assets but reject executable schemes', () => {
  const context = vm.createContext({});
  for (const name of ['safeUrl', 'safeAsset', 'ytIdOf', 'isEmbeddableVideo']) {
    const fn = html.match(new RegExp('  function ' + name + '\\([^]*?\\n  \\}'))[0];
    vm.runInContext(fn, context);
  }
  assert.equal(context.isEmbeddableVideo(report.demoVideos[0].url), true);
  assert.equal(context.isEmbeddableVideo('https://youtu.be/u0VznEwIrd4'), true);
  assert.equal(context.isEmbeddableVideo('https://example.com/walkthrough.mp4'), true);
  assert.equal(context.isEmbeddableVideo('javascript:alert(1)//video.mp4'), false);
  assert.equal(context.isEmbeddableVideo('data:video/mp4;base64,test.mp4'), false);
});

test('Launch ticket occupies the Reports intro beside the unchanged lead, above instructions', () => {
  const intro = html.match(/<div class="pk-intro">([\s\S]*?)<div class="pk-how">/)[1];
  assert.match(intro, /class="pk-lead3"/);
  assert.match(intro, /Filter by <span class="pk-hl-a">goal/);
  assert.match(intro, /class="pk-launch-date"><span>Released<\/span><time datetime="2026-10-29">Oct 29, 2026<\/time>/);
  assert.match(intro, /class="pk-launch-new">New</);
  assert.match(intro, /<h2 id="pkLaunchTitle">Cowork Super User<\/h2>/);
  assert.match(intro, /href="cowork-super-user\/\?route=2">Open enablement guide/);
  assert.ok(intro.indexOf('pk-lead3') < intro.indexOf('pk-launch-date'));
});

test('Featured leads with Cowork Super User without changing metric sorts or remaining curated order', () => {
  const sort = fs.readFileSync(path.join(docs, 'report-sort.js'), 'utf8');
  const comparator = sort.match(/cards\.sort\((function \(a, b\) \{[\s\S]*?\n      \})\);/)[1];
  const cards = ['first', 'second', 'cowork-super-user', 'fourth'];
  const context = vm.createContext({
    mode: 'featured', idOf: id => id, baseIndex: id => cards.indexOf(id),
    valueFor: id => ({ first: 12, second: 30, fourth: 4 }[id] ?? null)
  });
  const compare = vm.runInContext('(' + comparator + ')', context);
  assert.deepEqual([...cards].sort(compare), ['cowork-super-user', 'first', 'second', 'fourth']);
  assert.deepEqual(['fourth', 'second'].sort(compare), ['second', 'fourth']);
  for (const mode of ['pop-week', 'pop-month', 'stars', 'views', 'clones']) {
    context.mode = mode;
    assert.deepEqual([...cards].sort(compare), ['second', 'first', 'fourth', 'cowork-super-user']);
  }
  assert.doesNotMatch(sort, /if \(ctl\.sel\.value === 'featured'\) return/);
  assert.match(sort, /apply\(ctl\.sel\.value\);\s*\n  \}/);
  assert.match(html, /id === 'cowork-super-user' \? '<span class="rf-tag rf-tag--cowork-new">NEW<\/span>'/);
  assert.match(html, /background:linear-gradient\(135deg,#ede9fe,#ddd6fe\);color:#4c1d95/);
});

test('share stub versions the catalog by content and preserves queries before the guide hash', () => {
  const stub = fs.readFileSync(path.join(reportDir, 'cowork-super-user', 'index.html'), 'utf8');
  assert.match(stub, /og:image" content="https:\/\/microsoft\.github\.io\/Analytics-Hub\/choose-report\/cowork-super-user\/media\/CoworkSuperUser-Overview\.png"/);
  const version = require('node:crypto').createHash('sha256')
    .update(html.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);
  assert.ok(stub.includes('../?catalog=' + version + '#r=cowork-super-user'),
    'Regenerate the Cowork stub after editing the catalog');
  const script = stub.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const search of ['', '?route=2&embed=1&campaign=customer', '?catalog=stale&route=2']) {
    let redirected;
    vm.runInNewContext(script, {
      URL, URLSearchParams,
      location: {
        href: 'https://example.test/choose-report/cowork-super-user/' + search,
        search, replace: value => { redirected = new URL(value); }
      }
    });
    assert.equal(redirected.pathname, '/choose-report/');
    assert.equal(redirected.hash, '#r=cowork-super-user');
    assert.equal(redirected.searchParams.get('catalog'), version);
    if (search.includes('embed')) assert.equal(redirected.searchParams.get('embed'), '1');
    if (search.includes('route')) assert.equal(redirected.searchParams.get('route'), '2');
  }
  assert.match(html, /encodeURIComponent\(t\.id\) \+ '\/' \+ \(t\.id === 'cowork-super-user' \? '\?route=2'/);
  assert.match(html, /gdSel\[0\] === 'cowork-super-user' \? '\?route=2'/);
});

test('sorting represents uncollected data as null rather than invented counts', () => {
  for (const source of [island('mk-sort'),
    JSON.parse(fs.readFileSync(path.join(docs, 'data', 'sort-data.json'))),
    JSON.parse(fs.readFileSync(path.join(docs, 'data', 'report-metrics.json')))]) {
    const metrics = source.reports[report.id];
    assert.ok(metrics);
    assert.equal(metrics.stars, null);
    assert.equal(metrics.viewsTotal, null);
  }
});

const home = fs.readFileSync(path.join(docs, 'index.html'), 'utf8');
test('homepage gives Cowork its own positioning section above the unchanged Recently added trio', () => {
  const cowork = home.match(/<section[^>]*id="recent-cowork-super-user"[\s\S]*?<\/section>/)[0];
  assert.ok(home.indexOf(cowork) < home.indexOf('id="flagship"'));
  assert.match(cowork, /<h2 class="section-title" id="coworkWhyTitle">Cowork Super User<\/h2>/);
  assert.match(cowork, /class="flagship-logo"/);
  assert.match(cowork, /<p class="eyebrow">Recently Added<\/p>/);
  assert.match(cowork, /data-theme="dark"/);
  assert.doesNotMatch(cowork, /see who drives/i);
  assert.ok(cowork.indexOf('Recently Added') < cowork.indexOf('id="coworkWhyTitle"'));
  assert.ok(cowork.indexOf('class="flagship-desc"') < cowork.indexOf('<iframe'));
  const section = home.slice(home.indexOf('id="flagship"'));
  const grid = section.slice(section.indexOf('<div class="flagship-grid">'), section.indexOf('<!-- =========================================================== ALSO NEW -->'));
  const cards = [...grid.matchAll(/<article class="flagship-card"[\s\S]*?<\/article>/g)].map(m => m[0]);
  assert.equal(cards.length, 3);
  assert.deepEqual(cards.map(card => card.match(/<h3>(.*?)<\/h3>/)[1]),
    ['ValueLens', 'Consumption Central', 'Agent Evaluator']);
  assert.match(section, /Three new dashboards, built to work together/);
  assert.match(section, /One measures whether Copilot is landing\. One tracks what it costs\./);
  assert.match(section, /Sample data ships with each, so you can look before setting anything up\./);
  assert.doesNotMatch(grid, /Cowork Super User|c23BOhnDLVU/);
  assert.match(cowork, /youtube-nocookie\.com\/embed\/c23BOhnDLVU\?rel=0&amp;enablejsapi=1/);
  assert.doesNotMatch(cowork, /autoplay/i);
  assert.match(cowork, /https:\/\/youtu\.be\/c23BOhnDLVU/);
  assert.match(cowork, /href="choose-report\/cowork-super-user\/\?route=2">See the details/);
  const description = cowork.match(/class="flagship-desc">([\s\S]*?)<\/p>/)[1];
  assert.equal((description.match(/\./g) || []).length, 3);
  assert.match(description, /which Cowork tasks use the most credits/);
  assert.match(description, /how usage changes week by week/);
  assert.match(description, /focus enablement/);
  assert.match(description, /directional value scenarios.*not measured savings/);
  for (const [index, video] of ['P0uHJb13ZR0', 'JdOVx_6kw5Y', 'Tg594Hst5MY'].entries()) {
    assert.ok(cards[index].includes(video));
  }
});
const announcements = home.match(/<script id="ah-home-announcements">([\s\S]*?)<\/script>/)[1];
const launch = Date.UTC(2026, 9, 29);
const expires = Date.UTC(2026, 10, 28);
const bannerId = 'ah-cowork-super-user-banner';
const dismissKey = 'ah_new_cowork_super_user_dismissed_v1';
const existingKey = 'ah_new_cowork_valuelens_dismissed_v1';

function announcementState(now, stored = {}, blockedStorage = false) {
  const handlers = {};
  const banners = {};
  for (const id of ['ah-new-banner', bannerId]) {
    banners[id] = {
      hidden: true,
      querySelector: () => ({ addEventListener: (event, fn) => { handlers[id] = fn; } })
    };
  }
  const storage = {
    getItem: key => {
      if (blockedStorage) throw new Error('Storage unavailable');
      return stored[key] || null;
    },
    setItem: (key, value) => {
      if (blockedStorage) throw new Error('Storage unavailable');
      stored[key] = value;
    }
  };
  vm.runInNewContext(announcements, {
    document: { getElementById: id => banners[id] },
    localStorage: storage,
    Date: class extends Date { static now() { return now; } }
  });
  return { banners, handlers, stored };
}

test('homepage banner sits beneath the existing announcement and links straight to the guide', () => {
  const existing = home.indexOf('id="ah-new-banner"');
  const added = home.indexOf('id="' + bannerId + '"');
  const hero = home.indexOf('<!-- =========================================================== HERO -->');
  assert.ok(existing < added && added < hero);
  const banner = home.match(/<aside[^>]*id="ah-cowork-super-user-banner"[\s\S]*?<\/aside>/)[0];
  assert.match(banner, /href="choose-report\/cowork-super-user\/\?route=2"/);
  assert.match(banner, />\s*Cowork Super User Report\s*</);
  assert.match(banner, /aria-label="Dismiss the Cowork Super User Report announcement"/);
});

test('new announcement shows for exactly 30 days and not before launch or at expiry', () => {
  assert.equal(expires - launch, 30 * 24 * 60 * 60 * 1000);
  for (const [now, hidden] of [
    [launch - 1, true], [launch, false], [expires - 1, false],
    [expires, true], [expires + 1, true]
  ]) {
    assert.equal(announcementState(now).banners[bannerId].hidden, hidden,
      new Date(now).toISOString());
  }
  assert.equal(announcementState(Date.UTC(2026, 10, 6)).banners['ah-new-banner'].hidden, true);
  assert.equal(announcementState(Date.UTC(2026, 10, 6)).banners[bannerId].hidden, false);
});

test('announcements dismiss independently, persist across reloads, and tolerate blocked storage', () => {
  const state = announcementState(launch);
  assert.equal(state.banners['ah-new-banner'].hidden, false);
  state.handlers[bannerId]();
  assert.equal(state.banners[bannerId].hidden, true);
  assert.equal(state.banners['ah-new-banner'].hidden, false);
  assert.equal(state.stored[dismissKey], '1');
  assert.equal(announcementState(launch, state.stored).banners[bannerId].hidden, true);
  const oldDismissed = announcementState(launch, { [existingKey]: '1' });
  assert.equal(oldDismissed.banners['ah-new-banner'].hidden, true);
  assert.equal(oldDismissed.banners[bannerId].hidden, false);
  const blocked = announcementState(launch, {}, true);
  assert.equal(blocked.banners[bannerId].hidden, false);
  assert.doesNotThrow(() => blocked.handlers[bannerId]());
  assert.equal(blocked.banners[bannerId].hidden, true);
});
