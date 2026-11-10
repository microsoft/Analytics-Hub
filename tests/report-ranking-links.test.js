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