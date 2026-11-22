const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'docs', 'tools',
  'copilot-roi-calculator', 'roi-calculator.html'), 'utf8');
const script = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .find(match => match[1].includes('function calculateProjections()'))[1];

test('ROI projection executable inline scripts parse', () => {
  for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) {
    new vm.Script(match[1]);
  }
});

function calculator(overrides = {}) {
  const values = {
    companyName: 'Maintenance Synthetic', licensedUsers: '10', activationRate: '0',
    actionsPerWeek: '1', salesLicenseCost: '32', salesProfessionalRate: '78',
    salesIntelligentRecap: '0', ...overrides
  };
  const elements = new Map();
  for (const [id, value] of Object.entries(values)) {
    elements.set(id, { value, addEventListener() {} });
  }
  const results = { innerHTML: '', style: {}, scrollIntoView() {} };
  elements.set('resultsSection', results);
  elements.set('industry', { addEventListener() {} });
  elements.set('adoptionProfile', { addEventListener() {} });
  const alerts = [];
  const context = vm.createContext({
    document: { getElementById: id => elements.get(id) },
    alert: message => alerts.push(message), setTimeout() {}
  });
  vm.runInContext(script, context);
  return { context, results, alerts };
}

test('zero activation has no modeled payback and no misleading positive business case', () => {
  const { context, results, alerts } = calculator();
  vm.runInContext('calculateProjections()', context);
  assert.equal(alerts.length, 0);
  assert.match(results.innerHTML, /No payback \(no projected value\)/);
  assert.match(results.innerHTML, /Annual Investment:<\/strong> \$3,840/);
  assert.doesNotMatch(results.innerHTML, /Infinity|NaN|rapid value realization|compelling business case/);
});

test('zero license cost is not an ROI multiple or payback, including recap variants', () => {
  const { context, results } = calculator({
    activationRate: '100', salesLicenseCost: '0', salesIntelligentRecap: '4'
  });
  vm.runInContext('calculateProjections()', context);
  assert.match(results.innerHTML, /Not applicable \(no license cost\)/);
  assert.doesNotMatch(results.innerHTML, /Infinity|NaN/);
  assert.match(results.innerHTML, /id="guidanceROI" data-without-recap="Not applicable/);
});

test('positive financial calculations retain the existing monthly-value and annual-cost formula', () => {
  const { context } = calculator();
  const returns = vm.runInContext('projectionReturns(100, 20)', context);
  assert.equal(returns.roi, 5);
  assert.equal(returns.payback, 2.4);
  assert.equal(returns.roiText, '5.0x');
  assert.equal(returns.paybackText, '2.4 mo');
});

test('invalid or out-of-range inputs produce a visible error instead of nonfinite results', () => {
  for (const overrides of [
    { activationRate: '' }, { activationRate: '101' },
    { licensedUsers: '1.5' }, { salesLicenseCost: '-1' },
    { salesProfessionalRate: '' }, { actionsPerWeek: '0' },
    { salesIntelligentRecap: '1.5' }
  ]) {
    const { context, results, alerts } = calculator(overrides);
    vm.runInContext('calculateProjections()', context);
    assert.equal(alerts.length, 1, JSON.stringify(overrides));
    assert.equal(results.innerHTML, '');
  }
});

test('recap toggling updates the cards, table, range and financial guidance together', () => {
  const { context, results } = calculator({ salesIntelligentRecap: '4' });
  vm.runInContext('calculateProjections()', context);
  assert.match(results.innerHTML, /id="guidancePayback" data-without-recap="No payback \(no projected value\)" data-with-recap="24\.6 mo"/);
  assert.match(script, /'guidancePayback', 'guidanceROI'/);
  assert.doesNotMatch(results.innerHTML, /Infinity|NaN/);
});

test('finite inputs that overflow derived values report an error rather than render Infinity', () => {
  for (const overrides of [
    { activationRate: '100', salesProfessionalRate: '1e308' },
    { activationRate: '100', salesLicenseCost: '1e-308' }
  ]) {
    const { context, results, alerts } = calculator(overrides);
    vm.runInContext('calculateProjections()', context);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0], /numeric range/);
    assert.equal(results.innerHTML, '');
  }
});
