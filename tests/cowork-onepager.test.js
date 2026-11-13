const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

const app = path.resolve(__dirname, '..', 'docs', 'tools', 'cowork-credit-forecasting');
const source = name => fs.readFileSync(path.join(app, name), 'utf8');

test('forecasting provides a single one-pager view action before entering a scenario', () => {
  const document = new JSDOM(source('index.html')).window.document;
  const actions = document.querySelector('.page-hero .onepager-actions');
  assert.ok(actions);
  const view = actions.querySelector('a[href="customer-onepager.html"]');
  assert.equal(view.textContent, 'View customer one-pager');
  assert.equal(view.target, '_blank');
  assert.ok(view.relList.contains('noopener'));
  assert.ok(view.relList.contains('noreferrer'));
  assert.match(view.getAttribute('aria-label'), /new tab/);
  assert.equal(actions.querySelectorAll('a').length, 1);
  assert.equal(actions.querySelector('a[href="customer-onepager.pdf"]'), null);
  assert.equal(actions.closest('#scheduled-app'), null);
  assert.equal(actions.querySelector('[disabled]'), null);
  assert.equal(fs.readFileSync(path.join(app, 'customer-onepager.pdf')).subarray(0, 5).toString(), '%PDF-');
});

test('one-pager provides a PDF download, return link and low-pressure app CTA', () => {
  const document = new JSDOM(source('customer-onepager.html')).window.document;
  const download = document.querySelector('.page-actions a[download]');
  assert.equal(download.getAttribute('href'), 'customer-onepager.pdf');
  assert.equal(download.download, 'Cowork-Credit-Forecasting-Customer-One-Pager.pdf');
  assert.equal(document.querySelector('.page-actions a:not([download])').getAttribute('href'), './');
  assert.equal(document.querySelector('.cta h2').textContent, 'Start with one question. Not a commitment.');
  assert.equal(document.querySelector('.cta a').href,
    'https://microsoft.github.io/Analytics-Hub/tools/cowork-credit-forecasting/');
  assert.equal(document.querySelectorAll('.benefit').length, 4);
  assert.equal(document.querySelector('.fit h2').textContent, 'Best time to use it');
  assert.match(source('customer-onepager.html'), /\.fit h2\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(source('customer-onepager.html'), /\.page-actions\s*\{\s*display:\s*none/);
  assert.equal(document.querySelectorAll('script[src], link[rel="stylesheet"], iframe, form').length, 0);
});

test('both pages retain valid inline JavaScript', () => {
  for (const name of ['index.html', 'customer-onepager.html']) {
    const document = new JSDOM(source(name)).window.document;
    for (const script of document.querySelectorAll('script:not([src])')) {
      if (!script.type || script.type === 'text/javascript') {
        new vm.Script(script.textContent, { filename: name });
      }
    }
  }
});
