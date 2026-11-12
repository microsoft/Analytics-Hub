const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'docs/choose-report/index.html'), 'utf8');
const ranking = JSON.parse(fs.readFileSync(path.join(root, 'docs/data/report-ranking.json'), 'utf8'));
const context = { document: { createElement: () => ({}) } };
vm.runInNewContext(
  html.match(/          function esc\(s\) \{[^\n]+/)[0] + '\n' +
  html.match(/          function card\(r\) \{[\s\S]*?\n          \}/)[0], context);

test('AI-in-One tile uses the requested guide and Repo destinations', () => {
  const report = ranking.reports.find(r => r.id === 'ai-in-one');
  assert.equal(report.guide, 'https://microsoft.github.io/AI-in-One-Dashboard/get-started.html');
  assert.equal(report.repo, 'https://microsoft.github.io/AI-in-One-Dashboard/index.html');
  const card = context.card(report).innerHTML;
  assert.ok(card.includes('href="' + report.guide + '">Enablement guide'));
  assert.ok(card.includes('href="' + report.repo + '" target="_blank" rel="noopener noreferrer">Repo'));
});

test('other tiles retain their internal guides and existing action labels', () => {
  for (const report of ranking.reports.filter(r => r.id !== 'ai-in-one')) {
    const card = context.card(report).innerHTML;
    const route = report.id === 'cowork-super-user' ? '?route=2' : '';
    assert.ok(card.includes('href="' + report.id + '/' + route + '">Enablement guide'), report.id);
    if (report.repo) {
      assert.ok(card.includes(/github\.com/.test(report.repo) ? '>Repo ' : '>Open app '), report.id);
    }
  }
});

test('ranked catalog maps its dark palette to the existing page theme', () => {
  const dark = html.match(/html\[data-theme="dark"\] \.rk\{([^}]+)\}/)[1];
  const tokens = {
    ink: 'text', muted: 'soft', line: 'border', panel: 'surface-2',
    surface: 'surface', brand: 'accent', navy: 'accent-strong',
    'on-selected': 'on-accent', 'archive-line': 'border-strong',
  };
  for (const [catalog, page] of Object.entries(tokens)) {
    assert.ok(dark.includes('--rk-' + catalog + ':var(--mk-' + page + ')'), catalog);
  }
  for (const selector of ['.rk-chip', '.rk-card']) {
    const rule = html.match(new RegExp(selector.replace('.', '\\.') + '\\{([^}]+)\\}'))[1];
    assert.match(rule, /background:var\(--rk-surface\)/, selector);
  }
  assert.match(html, /\.rk-chip\[aria-pressed=true\]\{[^}]*color:var\(--rk-on-selected\)/);
});

test('light catalog colors and readable badge fills stay independent of dark links', () => {
  const palette = html.match(/\.rk\{([^}]+)\}/)[1];
  for (const token of [
    '--rk-ink:#242424', '--rk-muted:#605e5c', '--rk-surface:#fff',
    '--rk-brand:#0f6cbd', '--rk-navy:#0f3d6e', '--rk-on-selected:#fff',
    '--rk-badge-brand:#0f6cbd',
  ]) {
    assert.ok(palette.includes(token), token);
  }
  assert.match(html, /\.rk-b\.Popular\{ background:var\(--rk-badge-brand\)/);
  assert.match(html, /html\[data-theme="dark"\] \.rk-b\.spec\{[^}]*color:var\(--rk-muted\)/);
});