global.window = {};
require('C:/Studio proj/Analytics-Hub/docs/cowork-billing/healthcare-chargeback/app/settlement.js');
const S = global.window.CBSettle;
const PR = 0.008, RT = 0.01, POOL = 1250000;
const groups = [
  { label: 'LHD A', users: 100, credits: 500000 },
  { label: 'LHD B', users: 120, credits: 600000 },
  { label: 'LHD C', users: 40, credits: 200000 },
];
const ent = { 'LHD A': 750000, 'LHD B': 375000, 'LHD C': 125000 };
let f = 0;
const eq = (n, g, w, t = 0.005) => { const o = Math.abs(g - w) <= t; if (!o) f++; console.log((o ? '  ok   ' : '  FAIL ') + n); };

const hold = S.settle(groups, ent, { prepaidRate: PR, paygRate: RT, pool: POOL, surplusMode: 'hold' });
eq('A bill 4000', hold.rows.find(r => r.label === 'LHD A').bill, 4000);
eq('B bill 5250', hold.rows.find(r => r.label === 'LHD B').bill, 5250);
eq('C bill 1750', hold.rows.find(r => r.label === 'LHD C').bill, 1750);
eq('actual cost 10500', hold.actualCost, 10500);
eq('surplus 500', hold.surplus, 500);

const reb = S.settle(groups, ent, { prepaidRate: PR, paygRate: RT, pool: POOL, surplusMode: 'rebate' });
eq('rebate reconciles', reb.residual, 0);
const red = S.settle(groups, ent, { prepaidRate: PR, paygRate: RT, pool: POOL, surplusMode: 'redistribute' });
eq('redistribute reconciles', red.residual, 0);
eq('B credited 375', red.rows.find(r => r.label === 'LHD B').adjustment, -375);

const be = S.breakEvenRate(hold.totalUsed, hold.actualCost);
const flat = S.settleFlat(groups, be, { prepaidRate: PR, paygRate: RT, pool: POOL });
eq('flat break-even reconciles', flat.residual, 0, 0.01);

const sp = S.proposeSplit(groups, POOL, 'users');
eq('split sums to pool', Object.values(sp).reduce((a, b) => a + b, 0), POOL, 0.01);
const p = S.parseEntitlements('Unit,Credits\nNorth,12 packs\nSouth,375000', 25000);
eq('packs parsed', p['North'], 300000);
eq('credits parsed', p['South'], 375000);
const over = S.settle(groups, { 'LHD A': 900000, 'LHD B': 400000, 'LHD C': 100000 }, { prepaidRate: PR, paygRate: RT, pool: POOL, surplusMode: 'hold' });
eq('over-commit flagged', over.entitlementVsPool, 150000);

console.log(f ? '\n' + f + ' FAILURES' : '\nALL PASS');
process.exit(f ? 1 : 0);
