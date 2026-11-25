const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'tools', 'link-doctor', 'scan.js'), 'utf8');
const kindsSource = source.slice(source.indexOf('const PATH_KINDS ='),
  source.indexOf('\nfunction log('));
const parserSource = source.slice(source.indexOf('function parseGitHubUrl('),
  source.indexOf('\nfunction listHtmlFiles('));
const context = vm.createContext({ URL });
vm.runInContext(kindsSource + '\n' + parserSource, context);
const parse = context.parseGitHubUrl;

test('Link Doctor excludes personal GitHub settings from repository checks', () => {
  for (const url of [
    'https://github.com/settings/enterprises',
    'https://github.com/settings/billing',
    'https://github.com/settings/tokens?type=beta#fine-grained'
  ]) {
    assert.equal(parse(url), null, url);
  }
});

test('Link Doctor normalizes clone URL suffix without changing the source link', () => {
  const url = 'https://github.com/microsoft/What-I-Did-Copilot.git';
  const parsed = parse(url);
  assert.equal(parsed.owner, 'microsoft');
  assert.equal(parsed.repo, 'What-I-Did-Copilot');
  assert.equal(parsed.kind, 'repo');
  assert.equal(parsed.raw, url);
});

test('Link Doctor still checks real repositories, repo settings and moved paths', () => {
  const root = parse('https://github.com/microsoft/Missing-Repo');
  assert.equal(root.repo, 'Missing-Repo');
  const settings = parse('https://github.com/microsoft/Analytics-Hub/settings/pages');
  assert.equal(settings.repo, 'Analytics-Hub');
  assert.equal(settings.kind, 'feature');
  assert.equal(settings.feature, 'settings');
  const moved = parse('https://github.com/microsoft/ESS/blob/main/old%20folder/README.md');
  assert.equal(moved.ref, 'main');
  assert.equal(moved.path, 'old folder/README.md');
  assert.equal(moved.kind, 'blob');
});

test('Link Doctor preserves raw content refs and dot-prefixed repositories', () => {
  const raw = parse('https://raw.githubusercontent.com/microsoft/ESS/refs/heads/main/SETUP.md');
  assert.equal(raw.repo, 'ESS');
  assert.equal(raw.ref, 'main');
  assert.equal(raw.path, 'SETUP.md');
  const dot = parse('https://github.com/microsoft/.github');
  assert.equal(dot.repo, '.github');
});

test('Link Doctor rejects hosts outside its GitHub repository parser scope', () => {
  assert.equal(parse('https://example.com/microsoft/ESS'), null);
});
