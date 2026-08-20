/* settlement.js - entitlement-based settlement for shared prepaid pools.
   ES5, no dependencies, no network.

   The problem this solves
   ----------------------
   Prepaid capacity packs are a single tenant-wide pool. Consumption order is
   fixed: packs, then P3, then pay-as-you-go. There is no way to reserve part of
   the pool for one entity. So in an organisation where several entities each
   funded a share of that pool, whoever consumes earliest in the month gets the
   discounted rate and everyone else is pushed onto PAYG. The entity that funded
   the credits can end up paying the higher rate for its own money.

   The consumption export is a per-user monthly total. It carries no timestamps,
   so the drawdown sequence cannot be reconstructed. This module does not try.
   Instead it re-derives each entity's bill from what that entity funded:

       bill = min(used, entitlement) x prepaidRate
            + max(0, used - entitlement) x paygRate

   Drawdown order stops mattering because it is not an input.

   The surplus
   -----------
   Settlement does not automatically tie back to the Microsoft invoice. If entity
   A funds 750k and uses 500k, its unused 250k was consumed by someone else at
   the prepaid rate, but that someone is billed PAYG for it. The difference,
   250k x (payg - prepaid), is a real over-collection.

   Three treatments are offered because this is a policy decision, not a
   technical one:
     rebate       - return surplus to under-users pro rata by unused entitlement
     redistribute - lend unused entitlement to over-users at the prepaid rate,
                    which reconciles to the invoice exactly
     hold         - keep it centrally, e.g. to fund next period

   Everything here is arithmetic on numbers the caller already has. No customer
   data leaves the page.
*/
(function () {
    'use strict';

    function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
    function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }

    /* Split a pool across units. Used before entitlements are agreed, so the
       customer can see what each basis implies.
         even    - equal share each
         users   - pro rata by user count
         usage   - pro rata by credits consumed
       Returns { unit: credits }. */
    function proposeSplit(groups, pool, basis) {
        var out = {}, i, g, denom = 0;
        if (!groups || !groups.length || !(pool > 0)) return out;
        if (basis === 'even') {
            var share = pool / groups.length;
            for (i = 0; i < groups.length; i++) out[groups[i].label] = share;
            return out;
        }
        var key = basis === 'users' ? 'users' : 'credits';
        for (i = 0; i < groups.length; i++) denom += Number(groups[i][key]) || 0;
        if (!(denom > 0)) return proposeSplit(groups, pool, 'even');
        for (i = 0; i < groups.length; i++) {
            g = groups[i];
            out[g.label] = pool * ((Number(g[key]) || 0) / denom);
        }
        return out;
    }

    /* Core settlement.
       groups        [{ label, users, credits }]  from the chargeback model
       entitlements  { label: credits funded }
       opts          { prepaidRate, paygRate, pool, surplusMode, invoiceTotal } */
    function settle(groups, entitlements, opts) {
        var pr = Number(opts.prepaidRate) || 0;
        var rt = Number(opts.paygRate) || 0;
        var mode = opts.surplusMode || 'rebate';
        var ent = entitlements || {};

        var rows = [], i, g;
        var totalUsed = 0, totalEnt = 0, totalUnused = 0, totalExcess = 0;

        for (i = 0; i < (groups || []).length; i++) {
            g = groups[i];
            var used = Number(g.credits) || 0;
            var e = Number(ent[g.label]) || 0;
            var covered = Math.min(used, e);
            var excess = Math.max(0, used - e);
            var unused = Math.max(0, e - used);

            rows.push({
                label: g.label,
                users: g.users || 0,
                used: used,
                entitlement: e,
                covered: covered,
                excess: excess,
                unused: unused,
                coveredCost: covered * pr,
                excessCost: excess * rt,
                bill: covered * pr + excess * rt,
                adjustment: 0,
                finalBill: covered * pr + excess * rt
            });

            totalUsed += used;
            totalEnt += e;
            totalUnused += unused;
            totalExcess += excess;
        }

        /* What Microsoft actually charges: the pool is consumed first at the
           prepaid rate regardless of who consumed it, then the remainder at PAYG.
           Pool is capped at what was actually funded when entitlements are set. */
        var poolAvailable = (opts.pool != null && opts.pool > 0) ? Number(opts.pool) : totalEnt;
        var poolConsumed = Math.min(totalUsed, poolAvailable);
        var tenantPayg = Math.max(0, totalUsed - poolAvailable);
        var actualCost = poolConsumed * pr + tenantPayg * rt;

        var billed = 0;
        for (i = 0; i < rows.length; i++) billed += rows[i].bill;
        var surplus = billed - actualCost;

        /* Surplus treatment */
        if (mode === 'redistribute' && totalUnused > 0 && totalExcess > 0) {
            /* Lend unused entitlement to over-users at the prepaid rate, pro rata
               by excess. Under-users are unaffected; they already paid only for
               what they used. This is the treatment that reconciles exactly. */
            var lendable = Math.min(totalUnused, totalExcess);
            for (i = 0; i < rows.length; i++) {
                var r = rows[i];
                if (r.excess <= 0) continue;
                var lent = lendable * (r.excess / totalExcess);
                r.adjustment = -lent * (rt - pr);
                r.finalBill = r.bill + r.adjustment;
                r.lent = lent;
            }
        } else if (mode === 'rebate' && totalUnused > 0 && surplus > 0) {
            /* Return the surplus to under-users in proportion to the entitlement
               they funded but did not use. */
            for (i = 0; i < rows.length; i++) {
                var r2 = rows[i];
                if (r2.unused <= 0) continue;
                r2.adjustment = -surplus * (r2.unused / totalUnused);
                r2.finalBill = r2.bill + r2.adjustment;
            }
        }
        /* mode === 'hold' leaves adjustments at zero */

        var finalBilled = 0;
        for (i = 0; i < rows.length; i++) finalBilled += rows[i].finalBill;

        rows.sort(function (a, b) { return b.finalBill - a.finalBill; });

        return {
            rows: rows,
            totalUsed: totalUsed,
            totalEntitlement: totalEnt,
            totalUnused: totalUnused,
            totalExcess: totalExcess,
            poolAvailable: poolAvailable,
            poolConsumed: poolConsumed,
            tenantPayg: tenantPayg,
            actualCost: actualCost,
            billedBeforeAdjustment: billed,
            surplus: surplus,
            finalBilled: finalBilled,
            residual: finalBilled - actualCost,
            surplusMode: mode,
            /* Entitlements that do not sum to the pool are a real problem: it
               means the split is over- or under-committed against what was bought. */
            entitlementVsPool: (opts.pool != null && opts.pool > 0) ? totalEnt - Number(opts.pool) : null,
            invoiceTotal: (opts.invoiceTotal != null) ? Number(opts.invoiceTotal) : null,
            invoiceVariance: (opts.invoiceTotal != null) ? actualCost - Number(opts.invoiceTotal) : null
        };
    }

    /* Flat internal rate, the alternative model raised in the field: charge every
       entity the same blended rate and let the centre absorb the difference. */
    function settleFlat(groups, flatRate, opts) {
        var pr = Number(opts.prepaidRate) || 0;
        var rt = Number(opts.paygRate) || 0;
        var rows = [], totalUsed = 0, i;
        for (i = 0; i < (groups || []).length; i++) {
            var used = Number(groups[i].credits) || 0;
            totalUsed += used;
            rows.push({
                label: groups[i].label,
                users: groups[i].users || 0,
                used: used,
                bill: used * flatRate,
                finalBill: used * flatRate,
                entitlement: 0, covered: 0, excess: 0, unused: 0,
                coveredCost: 0, excessCost: 0, adjustment: 0
            });
        }
        var poolAvailable = (opts.pool != null && opts.pool > 0) ? Number(opts.pool) : 0;
        var poolConsumed = Math.min(totalUsed, poolAvailable);
        var actualCost = poolConsumed * pr + Math.max(0, totalUsed - poolAvailable) * rt;
        var billed = totalUsed * flatRate;
        rows.sort(function (a, b) { return b.finalBill - a.finalBill; });
        return {
            rows: rows, totalUsed: totalUsed, flatRate: flatRate,
            poolAvailable: poolAvailable, poolConsumed: poolConsumed,
            actualCost: actualCost, billedBeforeAdjustment: billed,
            finalBilled: billed, surplus: billed - actualCost, residual: billed - actualCost,
            totalEntitlement: 0, totalUnused: 0, totalExcess: 0,
            tenantPayg: Math.max(0, totalUsed - poolAvailable),
            surplusMode: 'flat', entitlementVsPool: null,
            invoiceTotal: (opts.invoiceTotal != null) ? Number(opts.invoiceTotal) : null,
            invoiceVariance: (opts.invoiceTotal != null) ? actualCost - Number(opts.invoiceTotal) : null
        };
    }

    /* Break-even flat rate: the internal rate that collects exactly the invoice. */
    function breakEvenRate(totalUsed, actualCost) {
        return totalUsed > 0 ? actualCost / totalUsed : 0;
    }

    /* Parse a pasted entitlement table. Accepts "Unit, credits" or "Unit, packs"
       with tab, comma or multiple spaces as separator. packSize converts packs. */
    function parseEntitlements(text, packSize) {
        var out = {}, lines = String(text || '').split(/\r?\n/), i;
        for (i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            var parts = line.split(/\t|,|\s{2,}/);
            if (parts.length < 2) continue;
            var label = parts[0].trim();
            if (!label) continue;
            if (/^(unit|department|lhd|entity|name)$/i.test(label)) continue; // header
            var raw = parts[parts.length - 1].trim();
            var v = num(raw);
            if (!(v > 0)) continue;
            // a value that looks like a pack count rather than a credit count
            if (packSize > 0 && /pack/i.test(line) && v < 1000) v = v * packSize;
            out[label] = (out[label] || 0) + v;
        }
        return out;
    }

    window.CBSettle = {
        settle: settle,
        settleFlat: settleFlat,
        proposeSplit: proposeSplit,
        breakEvenRate: breakEvenRate,
        parseEntitlements: parseEntitlements,
        round2: round2
    };
})();
