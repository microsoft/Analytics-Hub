/* chargeback.js - Cowork Chargeback (100% client-side).
   One job: turn Cowork consumption + org data into a finance-ready,
   invoice-reconciled chargeback - per unit and per person, in dollars.
   Full-consumption model: allocates 100% of the bill. No frameworks, no network. */
(function () {
    'use strict';

    var state = {
        entraRows: [], creditRows: [], users: [],
        rate: 0.01,
        prepaidRate: 0.008,
        prepaidPurchased: null,
        daysInPeriod: 30,
        headroomPct: 15,
        fallbackLimit: 400,
        policyLimits: {},
        entityFilter: {},
        entitySearch: '',
        lineSearch: '',
        invoiceTotal: null,
        unitDim: 'costCenter',
        lineModel: 'paygo',
        valueMode: 'total',
        lineFilter: 'all',
        sortJournal: { key: 'paygo', dir: 'desc' },
        sortLines: { key: 'charge', dir: 'desc' },
        expandedUnits: {},
        demoActive: false,
        pending: { entra: null, credits: null },
        entraFileNames: [],
        // --- settlement (HealthCareChargeback) ---
        entitlements: {},          // { unitLabel: credits funded }
        surplusMode: 'redistribute',
        settleMode: 'entitlement', // 'entitlement' | 'flat'
        flatRate: null,            // null = use break-even
        packSize: 25000,
        howOpen: true              // walkthrough starts open; the mechanic is not obvious
    };

    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function fmtInt(v) { return (Math.round(v) || 0).toLocaleString('en-US'); }
    function fmtMoney(v) { return '$' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function fmtPct(v) { return ((Number(v) || 0) * 100).toFixed(1) + '%'; }
    /* Rates are sub-cent, so fmtMoney's 2dp would render $0.0080 as $0.01. */
    function fmtRate(v) { return '$' + (Number(v) || 0).toFixed(4); }
    function normUpn(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
    function toNumber(s) { if (s == null) return 0; var n = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
    function toBool(s) { var v = String(s == null ? '' : s).trim().toLowerCase(); return v === 'yes' || v === 'true' || v === '1' || v === 'licensed' || v === 'y'; }

    function parseCSV(text) {
        var rows = [], field = '', record = [], inQuotes = false;
        text = String(text).replace(/^\uFEFF/, '');
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            if (inQuotes) {
                if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; } }
                else { field += c; }
            } else {
                if (c === '"') { inQuotes = true; }
                else if (c === ',') { record.push(field); field = ''; }
                else if (c === '\r') { }
                else if (c === '\n') { record.push(field); rows.push(record); record = []; field = ''; }
                else { field += c; }
            }
        }
        if (field.length > 0 || record.length > 0) { record.push(field); rows.push(record); }
        rows = rows.filter(function (r) { return r.length > 1 || (r.length === 1 && r[0].trim() !== ''); });
        if (rows.length === 0) return [];
        var headers = rows[0].map(function (h) { return String(h).trim(); });
        var out = [];
        for (var r = 1; r < rows.length; r++) {
            var obj = {};
            for (var h = 0; h < headers.length; h++) { obj[headers[h]] = rows[r][h] != null ? rows[r][h] : ''; }
            out.push(obj);
        }
        return out;
    }

    var COLUMN_CANDIDATES = {
        upn: ['user principal name', 'userprincipalname', 'upn', 'email', 'user'],
        displayName: ['display name', 'displayname', 'name'],
        department: ['department', 'dept'],
        jobTitle: ['job title', 'jobtitle', 'title'],
        costCenter: ['cost center', 'costcenter', 'cc'],
        businessUnit: ['business unit', 'businessunit', 'bu'],
        creditsUsed: ['monthly credits used', 'credits used', 'creditsused', 'cowork credits', 'credits'],
        creditLimit: ['monthly credit limit', 'credit limit', 'creditlimit', 'limit', 'allowance'],
        license: ['microsoft 365 copilot license', 'copilot license', 'license', 'licensed'],
        policy: ['billing policy', 'spending policy', 'copilot spending policy', 'credit policy', 'billingpolicy', 'policy']
    };
    function resolveColumns(headers) {
        var lower = {};
        headers.forEach(function (h) { lower[String(h).trim().toLowerCase()] = h; });
        var map = {};
        Object.keys(COLUMN_CANDIDATES).forEach(function (field) {
            var cands = COLUMN_CANDIDATES[field];
            for (var i = 0; i < cands.length; i++) { if (lower[cands[i]] != null) { map[field] = lower[cands[i]]; return; } }
            map[field] = null;
        });
        return map;
    }

    function buildUsers(entraRows, creditRows) {
        var entraMap = resolveColumns(entraRows.length ? Object.keys(entraRows[0]) : []);
        var creditMap = resolveColumns(creditRows.length ? Object.keys(creditRows[0]) : []);
        var byUpn = {};
        entraRows.forEach(function (row) { var upn = normUpn(entraMap.upn ? row[entraMap.upn] : ''); if (upn) byUpn[upn] = row; });
        var users = [];
        creditRows.forEach(function (crow) {
            var upn = normUpn(creditMap.upn ? crow[creditMap.upn] : '');
            if (!upn) return;
            var erow = byUpn[upn] || {};
            var get = function (map, row, field) { return map[field] ? String(row[map[field]] || '').trim() : ''; };
            var explicit = creditMap.creditLimit ? toNumber(crow[creditMap.creditLimit]) : 0;
            var policyVal = get(creditMap, crow, 'policy') || get(entraMap, erow, 'policy') || '';
            users.push({
                upn: upn,
                attrs: erow,
                displayName: get(creditMap, crow, 'displayName') || get(entraMap, erow, 'displayName') || upn,
                department: get(entraMap, erow, 'department') || 'Unknown',
                costCenter: get(entraMap, erow, 'costCenter') || 'Unknown',
                businessUnit: get(entraMap, erow, 'businessUnit') || 'Unknown',
                policy: policyVal || 'Unassigned',
                explicitLimit: (creditMap.creditLimit && explicit > 0) ? explicit : null,
                used: creditMap.creditsUsed ? toNumber(crow[creditMap.creditsUsed]) : 0,
                limit: 0
            });
        });
        applyLimits(users);
        return users;
    }
    function applyLimits(users) {
        (users || state.users).forEach(function (u) {
            if (u.explicitLimit != null && u.explicitLimit > 0) { u.limit = u.explicitLimit; u.limitSource = 'file'; return; }
            var pl = (u.policy && state.policyLimits[u.policy] != null) ? state.policyLimits[u.policy] : null;
            if (pl != null && pl > 0) { u.limit = pl; u.limitSource = 'policy'; return; }
            u.limit = state.fallbackLimit; u.limitSource = 'fallback';
        });
    }

    function unitOf(u) {
        if (state.unitDim === 'Spending policy') { var pv = u.policy; return (!pv || pv === 'Unassigned') ? 'Unallocated' : pv; }
        var raw = (u.attrs && u.attrs[state.unitDim] != null) ? u.attrs[state.unitDim] : '';
        var v = String(raw).trim();
        if (!v || v.toLowerCase() === 'unknown') return 'Unallocated';
        return v;
    }
    function unitLabel() { return state.unitDim ? String(state.unitDim) : 'Unit'; }
    /* unitLabel() is the raw column name, e.g. "costCenter". Fine as a table
       header, wrong inside a sentence. Split camelCase and lowercase it. */
    function unitWord() {
        var s = unitLabel();
        if (!s) return 'unit';
        return String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-]+/g, ' ').trim().toLowerCase();
    }
    function unitWordPl() { var w = unitWord(); return /s$/.test(w) ? w : w + 's'; }
    function entityFilterActive() { for (var k in state.entityFilter) { if (state.entityFilter.hasOwnProperty(k)) return true; } return false; }
    function inScope(u) { return !entityFilterActive() || state.entityFilter[unitOf(u)] === true; }
    function matchSearch(u) {
        var q = (state.lineSearch || '').trim().toLowerCase();
        if (!q) return true;
        return (String(u.displayName) + ' ' + String(u.upn) + ' ' + unitOf(u) + ' ' + String(u.policy || '')).toLowerCase().indexOf(q) >= 0;
    }
    function detectDimensions(entraRows) {
        if (!entraRows.length) return [];
        var headers = Object.keys(entraRows[0]);
        var map = resolveColumns(headers);
        var excluded = {};
        ['upn', 'displayName', 'creditsUsed', 'creditLimit', 'license'].forEach(function (f) { if (map[f]) excluded[map[f]] = 1; });
        var deny = /^(user ?id|object ?id|guid|id|last ?activity ?date?|session ?count|sessions?)$/i;
        return headers.filter(function (h) { var hs = String(h).trim(); return hs && !excluded[h] && !deny.test(hs); });
    }
    function pickDefaultDim(dims) {
        var pref = ['cost center', 'costcenter', 'cc', 'department', 'dept', 'business unit', 'businessunit', 'bu'];
        for (var i = 0; i < pref.length; i++) { for (var j = 0; j < dims.length; j++) { if (String(dims[j]).trim().toLowerCase() === pref[i]) return dims[j]; } }
        return dims.length ? dims[0] : '';
    }
    function hasPolicies() {
        for (var i = 0; i < state.users.length; i++) { if (state.users[i].policy && state.users[i].policy !== 'Unassigned') return true; }
        return false;
    }
    function populateDimSelect() {
        var sel = $('cbDimSelect'); if (!sel) return;
        var dims = detectDimensions(state.entraRows);
        if (hasPolicies() && dims.indexOf('Spending policy') < 0) dims = dims.concat(['Spending policy']);
        if (!state.unitDim || dims.indexOf(state.unitDim) < 0) state.unitDim = pickDefaultDim(dims);
        if (!dims.length) { sel.innerHTML = '<option value="">No org columns found</option>'; return; }
        sel.innerHTML = dims.map(function (d) { return '<option value="' + esc(d) + '"' + (d === state.unitDim ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('');
    }
    function populatePolicyLimits() {
        var field = $('cbPolicyField'), box = $('cbPolicyLimits');
        if (!field || !box) return;
        var seen = {}, keys = [];
        state.users.forEach(function (u) { if (u.explicitLimit == null && u.policy && !seen[u.policy]) { seen[u.policy] = 1; keys.push(u.policy); } });
        keys.sort();
        if (!keys.length) { field.hidden = true; box.innerHTML = ''; return; }
        field.hidden = false;
        box.innerHTML = keys.map(function (p) {
            var val = state.policyLimits[p] != null ? state.policyLimits[p] : '';
            return '<div class="cb-policyrow"><span class="cb-policyname" title="' + esc(p) + '">' + esc(p) + '</span><input type="number" min="0" step="1" class="cb-policyinput" data-policy="' + esc(p) + '" value="' + val + '" placeholder="' + state.fallbackLimit + '"></div>';
        }).join('');
    }
    function populateEntityFilter() {
        var box = $('cbEntityFilter'); if (!box) return;
        var vals = {}; state.users.forEach(function (u) { vals[unitOf(u)] = 1; });
        var keys = Object.keys(vals).sort();
        var q = (state.entitySearch || '').toLowerCase();
        var shown = q ? keys.filter(function (k) { return k.toLowerCase().indexOf(q) >= 0; }) : keys;
        box.innerHTML = shown.length ? shown.map(function (k) {
            return '<label class="cb-ef-item"><input type="checkbox" data-entity="' + esc(k) + '"' + (state.entityFilter[k] ? ' checked' : '') + '><span>' + esc(k) + '</span></label>';
        }).join('') : '<p class="cb-ef-empty">No matching values</p>';
    }
    function chargeForModel(used, limit, model) {
        var rt = state.rate, pr = state.prepaidRate, over = Math.max(0, used - limit);
        if (model === 'prepaid') return limit * pr;
        if (model === 'hybrid') return limit * pr + over * rt;
        return used * rt;
    }
    function groupChargeModel(g, model) {
        var rt = state.rate, pr = state.prepaidRate;
        if (model === 'prepaid') return g.limit * pr;
        if (model === 'hybrid') return g.limit * pr + g.overage * rt;
        return g.credits * rt;
    }
    function modelLabel(model) {
        if (model === 'prepaid') return 'Prepaid pack';
        if (model === 'hybrid') return 'Hybrid';
        return 'PAYGO';
    }
    function computeChargeback() {
        var rate = state.rate, pr = state.prepaidRate;
        var groups = {}, order = [], totalCredits = 0, totalOverage = 0, totalLimit = 0, totalWastedCredits = 0, totalHeadroomPack = 0;
        var hf = 1 + (state.headroomPct / 100);
        state.users.forEach(function (u) {
            if (!inScope(u)) return;
            var key = unitOf(u);
            var g = groups[key] || (groups[key] = { label: key, users: 0, credits: 0, overage: 0, limit: 0 });
            if (g.users === 0 && order.indexOf(key) < 0) order.push(key);
            var over = Math.max(0, u.used - u.limit);
            g.users += 1; g.credits += u.used; g.overage += over; g.limit += u.limit;
            totalCredits += u.used; totalOverage += over;
            totalLimit += u.limit;
            totalWastedCredits += Math.max(0, u.limit - u.used);
            totalHeadroomPack += Math.ceil(u.used * hf);
        });
        var arr = order.map(function (k) { return groups[k]; });
        arr.forEach(function (g) { g.paygo = groupChargeModel(g, 'paygo'); g.prepaid = groupChargeModel(g, 'prepaid'); g.hybrid = groupChargeModel(g, 'hybrid'); });
        arr.sort(function (a, b) { return b.paygo - a.paygo; });
        var totalPaygo = arr.reduce(function (a, g) { return a + g.paygo; }, 0);
        var totalPrepaid = arr.reduce(function (a, g) { return a + g.prepaid; }, 0);
        var totalHybrid = arr.reduce(function (a, g) { return a + g.hybrid; }, 0);
        var totalCharge = totalPaygo;
        var unalloc = groups['Unallocated'];
        var unallocCharge = unalloc ? unalloc.paygo : 0;
        var variance = (state.invoiceTotal != null) ? (totalCharge - state.invoiceTotal) : null;
        return {
            groups: arr,
            totalCredits: totalCredits, totalOverage: totalOverage,
            totalCharge: totalCharge, totalPaygo: totalPaygo, totalPrepaid: totalPrepaid, totalHybrid: totalHybrid,
            totalConsumptionCost: totalCredits * rate,
            unallocCharge: unallocCharge, coverage: totalCharge > 0 ? (totalCharge - unallocCharge) / totalCharge : 1,
            invoiceTotal: state.invoiceTotal, variance: variance,
            variancePct: (variance != null && state.invoiceTotal) ? variance / state.invoiceTotal : null,
            totalUsers: arr.reduce(function (a, g) { return a + g.users; }, 0),
            totalLimit: totalLimit,
            prepay: {
                paygoCost: totalCredits * rate,
                fullAllowanceCost: totalLimit * pr,
                rightSizedCost: totalCredits * pr,
                wastedPrepaidCost: totalWastedCredits * pr,
                headroomPack: totalHeadroomPack,
                headroomCost: totalHeadroomPack * pr,
                purchased: state.prepaidPurchased,
                poolCost: state.prepaidPurchased != null ? state.prepaidPurchased * pr : null,
                consumedPct: state.prepaidPurchased ? totalCredits / state.prepaidPurchased : null,
                unusedPool: state.prepaidPurchased != null ? Math.max(0, state.prepaidPurchased - totalCredits) : 0,
                shortfall: state.prepaidPurchased != null ? Math.max(0, totalCredits - state.prepaidPurchased) : 0,
                unusedPoolValue: state.prepaidPurchased != null ? Math.max(0, state.prepaidPurchased - totalCredits) * pr : 0,
                shortfallPaygo: state.prepaidPurchased != null ? Math.max(0, totalCredits - state.prepaidPurchased) * rate : 0
            }
        };
    }

    function cmpVal(a, b) { if (a < b) return -1; if (a > b) return 1; return 0; }
    function sortRows(rows, key, dir) {
        var s = rows.slice();
        s.sort(function (a, b) {
            var av = a[key], bv = b[key];
            var r = (typeof av === 'number' && typeof bv === 'number') ? (av - bv) : cmpVal(String(av).toLowerCase(), String(bv).toLowerCase());
            return dir === 'asc' ? r : -r;
        });
        return s;
    }
    function sortTh(table, key, label, num, cur) {
        var caret = cur.key === key ? (cur.dir === 'asc' ? ' &#9650;' : ' &#9660;') : '';
        return '<th class="sortable' + (num ? ' num' : '') + '" data-table="' + table + '" data-sort="' + key + '">' + label + caret + '</th>';
    }

    function metricCard(label, value, sub, accent, tip) {
        var info = tip ? '<span class="metric-info" tabindex="0" aria-label="' + esc(tip) + '">?<span class="metric-tip">' + esc(tip) + '</span></span>' : '';
        return '<div class="metric-card ' + (accent || '') + '"><div class="metric-label">' + esc(label) + info + '</div>' +
            '<div class="metric-value">' + esc(value) + '</div><div class="metric-sublabel">' + esc(sub || '') + '</div></div>';
    }
    function panelHead(titleHtml, tip) {
        var info = tip ? ' <span class="panel-info" tabindex="0" aria-label="' + esc(tip) + '">?<span class="panel-tip">' + esc(tip) + '</span></span>' : '';
        return '<h3>' + titleHtml + info + '</h3>';
    }
    function renderSummary(m) {
        var el = $('cbSummary'); if (!el) return;
        var chargeSub = 'Pay-as-you-go, matches invoice';
        var varAccent = m.variance == null ? '' : (Math.abs(m.variance) < 0.005 ? 'accent-savings' : 'accent-red');
        var reconCard = metricCard('Variance vs invoice', m.variance != null ? ((m.variance >= 0 ? '+' : '') + fmtMoney(m.variance)) : '--', m.variancePct != null ? fmtPct(m.variancePct) : 'Enter invoice to reconcile', varAccent, 'Pay-as-you-go chargeback minus the Microsoft invoice. Positive over-recovers; negative means the org absorbs the difference.');
        el.innerHTML = '<div class="metrics-grid">' +
            metricCard('Total credits', fmtInt(m.totalCredits), 'Consumed this period', '', 'Total Cowork credits consumed by all users in scope this period.') +
            metricCard('Chargeback total', fmtMoney(m.totalCharge), chargeSub, 'accent-savings', 'Headline chargeback at the pay-as-you-go rate (every credit x rate) - the basis that reconciles to the Microsoft invoice. Compare Prepaid and Hybrid billing models per unit in the journal below.') +
            metricCard('Microsoft invoice', m.invoiceTotal != null ? fmtMoney(m.invoiceTotal) : '--', 'Entered for reconciliation', '', 'The Microsoft invoice amount you entered, used to reconcile the chargeback against the actual bill.') +
            reconCard +
            metricCard('Allocation coverage', fmtPct(m.coverage), 'Share mapped to a named unit', '', 'Share of the chargeback mapped to a named GL unit rather than the Unallocated catch-all. 100% means every credit has an owner.') +
            metricCard('Unallocated', fmtMoney(m.unallocCharge), 'Charge to a catch-all GL', m.unallocCharge > 0 ? 'accent-red' : '', 'Chargeback for users with no value in the chosen GL dimension, posted to a catch-all account. Lower is better.') +
            '</div>';
    }
    function renderPrepaid(m) {
        var p = m.prepay;
        var cards = '<div class="metrics-grid">' +
            metricCard('Pay-as-you-go cost', fmtMoney(p.paygoCost), 'All credits x ' + fmtMoney(state.rate) + '/credit', '', 'All consumed credits priced at the contracted pay-as-you-go rate ($/credit).') +
            metricCard('Prepay full allowance', fmtMoney(p.fullAllowanceCost), 'Buy every allowance; wasted ' + fmtMoney(p.wastedPrepaidCost), p.wastedPrepaidCost > 0 ? 'accent-red' : '', 'Cost of buying every user full prepaid allowance up front, at the prepaid rate. Allowance bought but not used is wasted spend.') +
            metricCard('Prepay right-sized', fmtMoney(p.rightSizedCost), 'Buy exactly what was used', 'accent-savings', 'Cost of prepaying only the credits actually used - the leanest prepay scenario.') +
            metricCard('Prepay + headroom ' + state.headroomPct + '%', fmtMoney(p.headroomCost), fmtInt(p.headroomPack) + ' credits (used +' + state.headroomPct + '%)', '', 'Right-sized prepay plus a growth buffer: each user usage rounded up by the headroom percent, priced at the prepaid rate.') +
            '</div>';
        var pool = '';
        if (p.purchased != null && p.purchased > 0) {
            var third = p.shortfall > 0
                ? metricCard(fmtInt(p.shortfall) + ' credits over pool', fmtMoney(p.shortfallPaygo), 'PAYG on overflow (used - purchased) x ' + fmtMoney(state.rate), 'accent-red', 'Consumption beyond your purchased prepaid pool. These credits are not covered by prepaid and would bill at the pay-as-you-go rate.')
                : metricCard(fmtInt(p.unusedPool) + ' credits remaining', fmtMoney(p.unusedPoolValue), 'Unused prepaid (purchased - used) x ' + fmtMoney(state.prepaidRate), 'accent-savings', 'Prepaid credits still available in your pool, valued at the prepaid rate.');
            pool = '<h4 style="color:var(--copilot-blue);font-size:1.02rem;font-weight:600;margin:0.4rem 0 0.85rem">Prepaid pool vs actual usage</h4><div class="metrics-grid">' +
                metricCard('Prepaid pool purchased', fmtInt(p.purchased), 'Worth ' + fmtMoney(p.poolCost) + ' at ' + fmtMoney(state.prepaidRate) + '/credit', '', 'The total prepaid credits you entered as purchased, and their value at the prepaid rate.') +
                metricCard('Pool consumed', fmtPct(p.consumedPct), fmtInt(m.totalCredits) + ' of ' + fmtInt(p.purchased) + ' used', p.consumedPct > 1 ? 'accent-red' : 'accent-savings', 'Share of your purchased prepaid pool consumed this period. Over 100% means you used more than you bought.') +
                third +
                '</div>';
        }
        return '<section class="panel">' + panelHead('Prepay sizing vs Pay-as-you-go', 'Compares paying per credit against three prepaid credit-pack scenarios: full allowance, right-sized to actual usage, and right-sized plus a growth buffer.') + cards + pool +
            '<p class="section-caption">Prepaid rate ' + fmtMoney(state.prepaidRate) + '/credit. Full allowance buys every user pack (unused is wasted); right-sized buys only actual usage; headroom adds a ' + state.headroomPct + '% buffer for growth. Per-day usage and daily charge are in the line items below.</p></section>';
    }
    function renderJournal(m) {
        var daily = state.valueMode === 'daily' && state.daysInPeriod > 0, days = state.daysInPeriod;
        function vCount(v) { return daily ? (v / days).toFixed(1) : fmtInt(v); }
        function vMoney(v) { return fmtMoney(daily ? v / days : v); }
        var suf = daily ? '/day' : '';
        var rows = m.groups.map(function (g) { return { label: g.label, users: g.users, credits: g.credits, overage: g.overage, paygo: g.paygo, prepaid: g.prepaid, hybrid: g.hybrid }; });
        rows = sortRows(rows, state.sortJournal.key, state.sortJournal.dir);
        var sc = state.sortJournal;
        var head = '<thead><tr>' + sortTh('journal', 'label', unitLabel() + ' (GL key)', false, sc) + sortTh('journal', 'users', 'Users', true, sc) + sortTh('journal', 'credits', 'Credits' + suf, true, sc) + sortTh('journal', 'overage', 'Overage cr' + suf, true, sc) + sortTh('journal', 'paygo', 'PAYGO $' + suf, true, sc) + sortTh('journal', 'prepaid', 'Prepaid $' + suf, true, sc) + sortTh('journal', 'hybrid', 'Hybrid $' + suf, true, sc) + '</tr></thead>';
        var body = '<tbody>' + rows.map(function (g) {
            var un = g.label === 'Unallocated';
            var open = !!state.expandedUnits[g.label];
            var caret = '<span class="cb-caret">' + (open ? '&#9660;' : '&#9654;') + '</span>';
            var row = '<tr class="cb-grouprow">' +
                '<td' + (un ? ' class="cell-over"' : '') + '><button type="button" class="cb-expand" data-expand="' + esc(g.label) + '">' + caret + esc(g.label) + '</button></td>' +
                '<td class="num">' + fmtInt(g.users) + '</td>' +
                '<td class="num">' + vCount(g.credits) + '</td>' +
                '<td class="num">' + vCount(g.overage) + '</td>' +
                '<td class="num">' + vMoney(g.paygo) + '</td>' +
                '<td class="num">' + vMoney(g.prepaid) + '</td>' +
                '<td class="num">' + vMoney(g.hybrid) + '</td></tr>';
            if (open) {
                var members = state.users.filter(function (u) { return unitOf(u) === g.label; }).sort(function (a, b) { return b.used - a.used; });
                row += members.map(function (u) {
                    var over = Math.max(0, u.used - u.limit);
                    return '<tr class="cb-userrow">' +
                        '<td class="cb-username">' + esc(u.displayName) + ' <span class="cb-useupn">' + esc(u.upn) + '</span></td>' +
                        '<td></td>' +
                        '<td class="num">' + vCount(u.used) + '</td>' +
                        '<td class="num">' + vCount(over) + '</td>' +
                        '<td class="num">' + vMoney(chargeForModel(u.used, u.limit, 'paygo')) + '</td>' +
                        '<td class="num">' + vMoney(chargeForModel(u.used, u.limit, 'prepaid')) + '</td>' +
                        '<td class="num">' + vMoney(chargeForModel(u.used, u.limit, 'hybrid')) + '</td></tr>';
                }).join('');
            }
            return row;
        }).join('');
        body += '<tr style="font-weight:700"><td>TOTAL</td><td class="num">' + fmtInt(m.totalUsers) + '</td><td class="num">' + vCount(m.totalCredits) + '</td><td class="num">' + vCount(m.totalOverage) + '</td><td class="num">' + vMoney(m.totalPaygo) + '</td><td class="num">' + vMoney(m.totalPrepaid) + '</td><td class="num">' + vMoney(m.totalHybrid) + '</td></tr></tbody>';
        var valTog = '<div class="cb-linemodel"><span class="cb-linemodel-label">Values:</span><div class="dim-toggle">' + [['total', 'Total (period)'], ['daily', 'Daily average']].map(function (p) { return '<button class="dim-btn' + (state.valueMode === p[0] ? ' active' : '') + '" data-valuemode="' + p[0] + '">' + p[1] + '</button>'; }).join('') + '</div></div>';
        var basisNote = 'Each ' + esc(unitLabel().toLowerCase()) + ' priced three ways: PAYGO = every credit x ' + fmtMoney(state.rate) + '; Prepaid = allowance x ' + fmtMoney(state.prepaidRate) + '; Hybrid = prepaid allowance + PAYG on overage. PAYGO reconciles to the Microsoft invoice.' + (daily ? ' Showing per-day averages (total / ' + days + ' days).' : '');
        return '<section class="panel">' + panelHead('Per-unit chargeback journal', 'Chargeback rolled up per GL unit, priced under all three billing models side by side (PAYGO, Prepaid, Hybrid). Toggle Total vs Daily average, click a unit name to expand its people, or click a column header to sort.') + valTog + '<div class="table-wrap"><table>' + head + body + '</table></div><p class="section-caption">' + basisNote + ' Click a unit name to expand its members; click a column header to sort.</p></section>';
    }
    function renderLineItems(m) {
        var rate = state.rate, lm = state.lineModel, showPol = hasPolicies();
        var rows = state.users.filter(function (u) {
            if (!inScope(u) || !matchSearch(u)) return false;
            if (state.lineFilter === 'over') return u.used > u.limit;
            if (state.lineFilter === 'active') return u.used > 0;
            return true;
        }).map(function (u) {
            var over = Math.max(0, u.used - u.limit);
            var daily = state.daysInPeriod > 0 ? u.used / state.daysInPeriod : 0;
            return { upn: u.upn, name: u.displayName, unit: unitOf(u), policy: u.policy, credits: u.used, dailyUse: daily, dailyCharge: daily * rate, allowance: u.limit, overage: over, charge: chargeForModel(u.used, u.limit, lm) };
        });
        rows = sortRows(rows, state.sortLines.key, state.sortLines.dir);
        var LIMIT = 50, shown = rows.slice(0, LIMIT), sc = state.sortLines;
        var head = '<thead><tr>' + sortTh('lines', 'upn', 'User (MSID / UPN)', false, sc) + sortTh('lines', 'name', 'Display name', false, sc) + sortTh('lines', 'unit', unitLabel() + ' (GL)', false, sc) + (showPol ? sortTh('lines', 'policy', 'Policy', false, sc) : '') + sortTh('lines', 'credits', 'Credits', true, sc) + sortTh('lines', 'dailyUse', 'Daily use', true, sc) + sortTh('lines', 'dailyCharge', 'Daily $', true, sc) + sortTh('lines', 'allowance', 'Prepaid allowance', true, sc) + sortTh('lines', 'overage', 'PAYG (overage)', true, sc) + sortTh('lines', 'charge', 'Chargeback $ (' + modelLabel(lm) + ')', true, sc) + '</tr></thead>';
        var body = '<tbody>' + shown.map(function (r) {
            return '<tr><td>' + esc(r.upn) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.unit) + '</td>' + (showPol ? '<td>' + esc(r.policy) + '</td>' : '') + '<td class="num">' + fmtInt(r.credits) + '</td><td class="num">' + r.dailyUse.toFixed(1) + '</td><td class="num">' + fmtMoney(r.dailyCharge) + '</td><td class="num">' + fmtInt(r.allowance) + '</td><td class="num">' + fmtInt(r.overage) + '</td><td class="num">' + fmtMoney(r.charge) + '</td></tr>';
        }).join('') + '</tbody>';
        var note = rows.length > LIMIT ? 'Showing the top ' + LIMIT + ' of ' + fmtInt(rows.length) + ' matching users. The CSV export includes all users and all three models.' : fmtInt(rows.length) + ' users shown.';
        var modelTog = '<div class="cb-linemodel"><span class="cb-linemodel-label">Billing model:</span><div class="dim-toggle" id="cbLineModel">' + ['paygo', 'prepaid', 'hybrid'].map(function (mm) { return '<button class="dim-btn' + (lm === mm ? ' active' : '') + '" data-linemodel="' + mm + '">' + modelLabel(mm) + '</button>'; }).join('') + '</div></div>';
        return '<section class="panel">' + panelHead('Per-person line items', 'One row per user with credits, per-day usage and charge, prepaid allowance, PAYG overage, and chargeback dollars under the selected billing model. Switch the model with the toggle; the CSV export includes all three. Shows the top 50. Click a column to sort.') + modelTog + '<div class="table-wrap"><table>' + head + body + '</table></div><p class="section-caption">' + note + ' Click a column to sort.</p></section>';
    }
    function render() {
        var m = computeChargeback();
        renderSummary(m);
        var body = $('cbBody'); if (body) body.innerHTML = renderSettlement(m) + renderPrepaid(m) + renderJournal(m) + renderLineItems(m);
        bindSettlement(m);
    }

    /* ---------------------------------------------------------------- settlement
       Prepaid packs are a single tenant pool with no reservation mechanism, so
       whoever consumes first gets the discounted rate. Settlement re-derives each
       unit's bill from what that unit funded, which removes drawdown order from
       the calculation entirely. See settlement.js for the arithmetic. */
    function settlementModel(m) {
        if (!window.CBSettle) return null;
        var opts = {
            prepaidRate: state.prepaidRate,
            paygRate: state.rate,
            pool: state.prepaidPurchased,
            surplusMode: state.surplusMode,
            invoiceTotal: state.invoiceTotal
        };
        if (state.settleMode === 'flat') {
            var base = window.CBSettle.settle(m.groups, state.entitlements, opts);
            var fr = (state.flatRate != null && state.flatRate > 0)
                ? state.flatRate
                : window.CBSettle.breakEvenRate(base.totalUsed, base.actualCost);
            return window.CBSettle.settleFlat(m.groups, fr, opts);
        }
        return window.CBSettle.settle(m.groups, state.entitlements, opts);
    }

    function entitlementCount() {
        var n = 0; for (var k in state.entitlements) { if (state.entitlements.hasOwnProperty(k)) n++; }
        return n;
    }

    /* ------------------------------------------------------------- walkthrough
       Settlement is not self-explanatory: units are billed against a pool that
       nobody can reserve a share of, so each bill has to be re-derived rather
       than read off a report. This walks the numbers actually on screen through
       the five steps, using the customer's own units as the worked example. */
    function howStep(letter, title, bodyHtml) {
        return '<li class="cb-how-step"><span class="cb-how-mark">' + letter + '</span>' +
            '<div class="cb-how-body"><h4>' + title + '</h4>' + bodyHtml + '</div></li>';
    }
    function howCalc(lines) {
        return '<div class="cb-how-calc">' + lines.map(function (l) {
            return '<div' + (l[2] ? ' class="cb-how-tot"' : '') + '><span>' + esc(l[0]) + '</span><b>' + esc(l[1]) + '</b></div>';
        }).join('') + '</div>';
    }

    function renderHow(s, m) {
        var pr = state.prepaidRate, rt = state.rate;
        var unit = unitWord(), unitPl = unitWordPl();
        var hasEnt = entitlementCount() > 0;
        var steps = '';

        // ---- A: what Microsoft actually charges
        steps += howStep('A', 'Microsoft bills the tenant, not the ' + esc(unitPl),
            '<p>Prepaid credits sit in one tenant-wide pool. Consumption draws that pool first, then pay-as-you-go, and the order cannot be changed or reserved against. One invoice comes back for the whole tenant.</p>' +
            howCalc([
                ['Pool consumed', fmtInt(s.poolConsumed) + ' \u00D7 ' + fmtRate(pr) + '  =  ' + fmtMoney(s.poolConsumed * pr)],
                ['Beyond the pool', fmtInt(s.tenantPayg) + ' \u00D7 ' + fmtRate(rt) + '  =  ' + fmtMoney(s.tenantPayg * rt)],
                ['Tenant cost', fmtMoney(s.actualCost), true]
            ]) +
            '<p class="cb-how-note">Nothing in that invoice says which ' + esc(unit) + ' got the discounted credits. Whoever consumed earliest did.</p>');

        if (state.settleMode === 'flat') {
            var be = window.CBSettle.breakEvenRate(s.totalUsed, s.actualCost);
            steps += howStep('B', 'Every ' + esc(unit) + ' is charged the same internal rate',
                '<p>No entitlements, no drawdown order. One blended rate applied to every credit consumed, and the centre carries any difference against the invoice.</p>' +
                howCalc([
                    ['Internal rate', fmtRate(s.flatRate) + ' per credit'],
                    ['Credits consumed', fmtInt(s.totalUsed)],
                    ['Collected from ' + unitPl, fmtMoney(s.finalBilled), true]
                ]));
            steps += howStep('C', 'The centre absorbs whatever is left',
                howCalc([
                    ['Collected', fmtMoney(s.finalBilled)],
                    ['Tenant cost', fmtMoney(s.actualCost)],
                    [Math.abs(s.residual) < 0.01 ? 'Reconciles' : (s.residual > 0 ? 'Over-collected' : 'Under-collected'), fmtMoney(s.residual), true]
                ]) +
                '<p class="cb-how-note">The break-even rate is ' + fmtRate(be) + ' per credit. Anything above it over-collects, anything below leaves the centre funding the gap. Simple to run, but it hides that some ' + esc(unit) + 's paid for credits others consumed.</p>');
            return wrapHow(steps);
        }

        // ---- B: what each unit funded
        var bLines = [['Pool purchased', state.prepaidPurchased > 0 ? fmtInt(state.prepaidPurchased) + ' credits' : 'not entered']];
        if (hasEnt) {
            bLines.push(['Allocated across ' + fmtInt(s.rows.length) + ' ' + unitPl, fmtInt(s.totalEntitlement) + ' credits']);
            if (s.entitlementVsPool != null && Math.abs(s.entitlementVsPool) > 1) {
                bLines.push([s.entitlementVsPool > 0 ? 'Over-committed' : 'Still unallocated', fmtInt(Math.abs(s.entitlementVsPool)) + ' credits', true]);
            } else {
                bLines.push(['Unallocated', '0 credits', true]);
            }
        }
        steps += howStep('B', 'Each ' + esc(unit) + ' states what it funded',
            '<p>Entitlement is the share of the pool a ' + esc(unit) + ' paid for. It is a claim on the money, not a reservation of credits, because there is no mechanism to ring-fence part of the pool.</p>' +
            howCalc(bLines) +
            (hasEnt ? '' : '<p class="cb-how-note">Not set yet. Enter them below, or propose a split of the pool by usage, by users, or evenly.</p>'));

        // ---- C: rebuild each bill from entitlement
        var ex = null, i;
        for (i = 0; i < s.rows.length; i++) {
            if (s.rows[i].excess > 0 && (!ex || s.rows[i].excess > ex.excess)) ex = s.rows[i];
        }
        var cWorked = '';
        if (ex) {
            cWorked = '<p class="cb-how-worked">Worked on <b>' + esc(ex.label) + '</b>:</p>' +
                howCalc([
                    ['Credits used', fmtInt(ex.used)],
                    ['Entitlement funded', fmtInt(ex.entitlement)],
                    ['Covered, at prepaid', fmtInt(ex.covered) + ' \u00D7 ' + fmtRate(pr) + '  =  ' + fmtMoney(ex.coveredCost)],
                    ['Excess, at pay-as-you-go', fmtInt(ex.excess) + ' \u00D7 ' + fmtRate(rt) + '  =  ' + fmtMoney(ex.excessCost)],
                    ['Bill before adjustment', fmtMoney(ex.bill), true]
                ]);
        }
        steps += howStep('C', 'Each bill is rebuilt from that ' + esc(unit) + '\u2019s own entitlement',
            '<p class="cb-how-formula">bill&nbsp;=&nbsp;min(used, entitlement) \u00D7 ' + fmtRate(pr) +
            '&nbsp;&nbsp;+&nbsp;&nbsp;max(0, used \u2212 entitlement) \u00D7 ' + fmtRate(rt) + '</p>' + cWorked +
            '<p class="cb-how-note">Drawdown order is not an input, so it stops mattering. A ' + esc(unit) +
            ' gets the prepaid rate on the credits it funded whether it consumed them on the 1st or the 28th.</p>');

        // ---- D: the gap
        var un = null;
        for (i = 0; i < s.rows.length; i++) {
            if (s.rows[i].unused > 0 && (!un || s.rows[i].unused > un.unused)) un = s.rows[i];
        }
        var dWhy = un
            ? '<p class="cb-how-worked"><b>' + esc(un.label) + '</b> funded ' + fmtInt(un.entitlement) + ' and used ' + fmtInt(un.used) +
              '. The other ' + fmtInt(un.unused) + ' were consumed by someone else at the prepaid rate, but that ' + esc(unit) +
              ' is billed pay-as-you-go for them. Across every ' + esc(unit) + ' the gap is ' + fmtInt(s.totalUnused) +
              ' \u00D7 (' + fmtRate(rt) + ' \u2212 ' + fmtRate(pr) + ').</p>'
            : '';
        steps += howStep('D', 'The ' + esc(unit) + ' bills will not add up to the invoice',
            howCalc([
                ['Sum of ' + unit + ' bills', fmtMoney(s.billedBeforeAdjustment)],
                ['Tenant cost', fmtMoney(s.actualCost)],
                [s.surplus >= 0 ? 'Over-collected' : 'Under-collected', fmtMoney(Math.abs(s.surplus)), true]
            ]) + dWhy);

        // ---- E: close it
        var chosen = state.surplusMode;
        var opt = function (key, name, text) {
            return '<li class="cb-how-opt' + (chosen === key ? ' is-on' : '') + '"><b>' + name + '</b> ' + text + '</li>';
        };
        steps += howStep('E', 'Decide where that difference goes',
            '<ul class="cb-how-opts">' +
                opt('redistribute', 'Redistribute', 'lends unused entitlement to the ' + esc(unit) + 's that went over, at the prepaid rate. Reconciles to the invoice exactly.') +
                opt('rebate', 'Rebate', 'returns the over-collection to the ' + esc(unit) + 's that funded credits they did not use.') +
                opt('hold', 'Hold centrally', 'keeps it, for example to fund the next period. Leaves a deliberate surplus.') +
            '</ul>' +
            howCalc([
                ['Settled to ' + unitPl, fmtMoney(s.finalBilled)],
                ['Tenant cost', fmtMoney(s.actualCost)],
                ['Residual', fmtMoney(s.residual) + (Math.abs(s.residual) < 0.01 ? '   \u2713 reconciles' : ''), true]
            ]) +
            '<p class="cb-how-note">This is a policy choice, not a technical one. Redistribute and rebate both clear to zero; they differ in who benefits.</p>');

        return wrapHow(steps);
    }

    function wrapHow(steps) {
        return '<details class="cb-how" id="cbHow"' + (state.howOpen !== false ? ' open' : '') + '>' +
            '<summary>How this works, step by step</summary>' +
            '<ol class="cb-how-list">' + steps + '</ol></details>';
    }

    function renderSettlement(m) {
        var s = settlementModel(m);
        if (!s) return '';
        var has = entitlementCount() > 0 || state.settleMode === 'flat';
        var unit = unitLabel();

        var head = '<div class="panel cb-settle">' +
            panelHead('Prepaid settlement',
                'Prepaid credits sit in one shared tenant pool, so the unit that consumes earliest in the month gets the discounted rate. Settlement re-bills each unit against the share it funded, so drawdown order stops mattering.');

        // controls
        var modeBtns = '<div class="dim-toggle" id="stMode">' +
            '<button type="button" class="dim-btn' + (state.settleMode === 'entitlement' ? ' active' : '') + '" data-stmode="entitlement">By entitlement</button>' +
            '<button type="button" class="dim-btn' + (state.settleMode === 'flat' ? ' active' : '') + '" data-stmode="flat">Flat internal rate</button>' +
            '</div>';

        var surplusBtns = state.settleMode === 'entitlement'
            ? '<div class="cb-settle-field"><label>Surplus treatment</label><div class="dim-toggle" id="stSurplus">' +
              '<button type="button" class="dim-btn' + (state.surplusMode === 'redistribute' ? ' active' : '') + '" data-surplus="redistribute">Redistribute</button>' +
              '<button type="button" class="dim-btn' + (state.surplusMode === 'rebate' ? ' active' : '') + '" data-surplus="rebate">Rebate</button>' +
              '<button type="button" class="dim-btn' + (state.surplusMode === 'hold' ? ' active' : '') + '" data-surplus="hold">Hold centrally</button>' +
              '</div><small>' + surplusHelp() + '</small></div>'
            : '<div class="cb-settle-field"><label for="stFlatRate">Internal rate $/credit</label>' +
              '<input type="number" id="stFlatRate" step="0.0001" min="0" value="' + (s.flatRate != null ? s.flatRate.toFixed(4) : '') + '">' +
              '<small>Blank uses the break-even rate, which collects exactly the tenant cost.</small></div>';

        var entryPanel = state.settleMode === 'entitlement'
            ? '<div class="cb-settle-entry">' +
                '<label for="stEntitle">Entitlement per ' + esc(unitWord()) + '</label>' +
                '<textarea id="stEntitle" rows="4" placeholder="' + esc(unit) + ', credits\n' + esc(sampleUnit(m)) + ', 300000">' + esc(entitlementText()) + '</textarea>' +
                '<div class="cb-settle-row">' +
                  '<button type="button" class="btn-secondary" id="stApply">Apply</button>' +
                  '<span class="cb-settle-split">Or propose a split of the pool: ' +
                    '<button type="button" class="cb-linkbtn" data-split="usage">by usage</button> \u00B7 ' +
                    '<button type="button" class="cb-linkbtn" data-split="users">by users</button> \u00B7 ' +
                    '<button type="button" class="cb-linkbtn" data-split="even">evenly</button>' +
                  '</span>' +
                '</div>' +
                '<small>One row per ' + esc(unitWord()) + ', comma or tab separated. Values are credits; write \u201C12 packs\u201D to enter packs at ' + fmtInt(state.packSize) + ' each. Requires a prepaid pool size in the left rail.</small>' +
              '</div>'
            : '';

        if (!has) {
            return head + renderHow(s, m) + modeBtns + entryPanel +
                '<p class="cb-settle-empty">No entitlements set. Until each ' + esc(unitWord()) +
                ' has a funded share, every credit bills at the pay-as-you-go rate above.</p></div>';
        }

        // cards
        var cards = '<div class="metrics-grid">' +
            metricCard('Tenant cost', fmtMoney(s.actualCost),
                fmtInt(s.poolConsumed) + ' at prepaid + ' + fmtInt(s.tenantPayg) + ' at PAYG', '',
                'What Microsoft actually charges: the shared pool is consumed first at the prepaid rate, the remainder at pay-as-you-go.') +
            metricCard('Settled to units', fmtMoney(s.finalBilled),
                state.settleMode === 'flat' ? 'At ' + fmtMoney(s.flatRate) + '/credit' : 'After ' + esc(state.surplusMode) + ' adjustment', '',
                'Sum of what each unit is billed once settlement is applied.') +
            metricCard('Residual', fmtMoney(s.residual),
                Math.abs(s.residual) < 0.01 ? 'Reconciles exactly' : (s.residual > 0 ? 'Over-collected' : 'Under-collected'),
                Math.abs(s.residual) < 0.01 ? 'accent-savings' : 'accent-red',
                'Difference between what units are billed and what the tenant actually pays. Zero means the settlement reconciles to the invoice.');

        if (state.settleMode === 'entitlement') {
            cards += metricCard('Unused entitlement', fmtInt(s.totalUnused),
                'Worth ' + fmtMoney(s.totalUnused * state.prepaidRate) + ' at the prepaid rate',
                s.totalUnused > 0 ? 'accent-red' : '',
                'Credits funded by units that did not consume them. Under a shared pool these were consumed by someone else.');
        }
        cards += '</div>';

        // warnings
        var warn = '';
        if (state.settleMode === 'entitlement' && s.entitlementVsPool != null && Math.abs(s.entitlementVsPool) > 1) {
            warn += '<p class="cb-settle-warn">' + (s.entitlementVsPool > 0
                ? 'Entitlements exceed the pool by ' + fmtInt(s.entitlementVsPool) + ' credits. More has been allocated than was purchased.'
                : 'Entitlements are ' + fmtInt(-s.entitlementVsPool) + ' credits short of the pool. Part of the pool is unallocated.') + '</p>';
        }
        if (state.prepaidPurchased == null || !(state.prepaidPurchased > 0)) {
            warn += '<p class="cb-settle-warn">No prepaid pool size entered. Settlement is assuming the pool equals total entitlements.</p>';
        }

        // table
        var showEnt = state.settleMode === 'entitlement';
        var rows = s.rows.map(function (r) {
            var adj = r.adjustment ? fmtMoney(r.adjustment) : '\u2014';
            return '<tr>' +
                '<td>' + esc(r.label) + '</td>' +
                '<td class="num">' + fmtInt(r.users) + '</td>' +
                '<td class="num">' + fmtInt(r.used) + '</td>' +
                (showEnt ? '<td class="num">' + fmtInt(r.entitlement) + '</td>' : '') +
                (showEnt ? '<td class="num">' + fmtInt(r.covered) + '</td>' : '') +
                (showEnt ? '<td class="num' + (r.excess > 0 ? ' cell-over' : '') + '">' + fmtInt(r.excess) + '</td>' : '') +
                (showEnt ? '<td class="num">' + adj + '</td>' : '') +
                '<td class="num"><strong>' + fmtMoney(r.finalBill) + '</strong></td>' +
                '</tr>';
        }).join('');

        var thead = '<tr><th>' + esc(unit) + '</th><th class="num">Users</th><th class="num">Credits used</th>' +
            (showEnt ? '<th class="num">Entitlement</th><th class="num">Covered</th><th class="num">Excess</th><th class="num">Adjustment</th>' : '') +
            '<th class="num">Settled bill</th></tr>';

        var table = '<div class="table-wrap"><table><thead>' + thead + '</thead><tbody>' + rows + '</tbody></table></div>';

        var exportRow = '<div class="cb-settle-row"><button type="button" class="btn-secondary" id="stExport">\u2b07 Export settlement (CSV)</button></div>';

        return head + renderHow(s, m) + modeBtns + entryPanel + surplusBtns + cards + warn + table + exportRow + '</div>';
    }

    /* Round-trips the entitlement map back into the textarea so a re-render does
       not wipe what the user typed. */
    function entitlementText() {
        var out = [], k;
        for (k in state.entitlements) {
            if (state.entitlements.hasOwnProperty(k)) out.push(k + ', ' + Math.round(state.entitlements[k]));
        }
        return out.join('\n');
    }

    function surplusHelp() {
        if (state.surplusMode === 'redistribute') return 'Unused entitlement is lent to units that went over, at the prepaid rate. Reconciles exactly to the tenant cost.';
        if (state.surplusMode === 'rebate') return 'Over-collection is returned to units that funded credits they did not use.';
        return 'Over-collection is retained centrally, for example to fund the next period.';
    }
    function sampleUnit(m) { return (m.groups && m.groups.length) ? m.groups[0].label : 'Unit A'; }

    function bindSettlement(m) {
        var modeBox = $('stMode');
        if (modeBox) modeBox.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-stmode]') : null;
            if (!b) return;
            state.settleMode = b.getAttribute('data-stmode');
            render();
        });
        var sBox = $('stSurplus');
        if (sBox) sBox.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-surplus]') : null;
            if (!b) return;
            state.surplusMode = b.getAttribute('data-surplus');
            render();
        });
        var apply = $('stApply');
        if (apply) apply.addEventListener('click', function () {
            var ta = $('stEntitle');
            if (!ta) return;
            state.entitlements = window.CBSettle.parseEntitlements(ta.value, state.packSize);
            try { if (window.cwkTrack) window.cwkTrack('settlement_applied'); } catch (e) {}
            render();
        });
        Array.prototype.forEach.call(document.querySelectorAll('[data-split]'), function (btn) {
            btn.addEventListener('click', function () {
                var pool = state.prepaidPurchased;
                if (!(pool > 0)) { alert('Enter the prepaid pool size in the left rail first.'); return; }
                var basis = btn.getAttribute('data-split');
                state.entitlements = window.CBSettle.proposeSplit(m.groups, pool, basis);
                var ta = $('stEntitle');
                if (ta) {
                    ta.value = m.groups.map(function (g) {
                        return g.label + ', ' + Math.round(state.entitlements[g.label] || 0);
                    }).join('\n');
                }
                try { if (window.cwkTrack) window.cwkTrack('settlement_split_' + basis); } catch (e) {}
                render();
            });
        });
        var fr = $('stFlatRate');
        if (fr) fr.addEventListener('change', function () {
            var v = parseFloat(fr.value);
            state.flatRate = (isFinite(v) && v > 0) ? v : null;
            render();
        });
        var ex = $('stExport');
        if (ex) ex.addEventListener('click', exportSettlementCsv);
        var how = $('cbHow');
        if (how) how.addEventListener('toggle', function () {
            state.howOpen = how.open;
            try { if (window.cwkTrack && how.open) window.cwkTrack('settlement_how_opened'); } catch (e) {}
        });
    }

    function exportSettlementCsv() {
        var m = computeChargeback();
        var s = settlementModel(m);
        if (!s) { alert('Settlement not available.'); return; }
        var rows = stampRows();
        rows.push(['Settlement basis', state.settleMode === 'flat' ? 'Flat internal rate' : 'Entitlement',
                   'Prepaid $/credit', state.prepaidRate.toFixed(4), 'PAYG $/credit', state.rate.toFixed(4)]);
        if (state.settleMode === 'flat') rows.push(['Internal rate $/credit', s.flatRate.toFixed(6)]);
        else rows.push(['Surplus treatment', state.surplusMode]);
        rows.push([]);
        var head = [unitLabel(), 'Users', 'Credits used'];
        if (state.settleMode !== 'flat') head = head.concat(['Entitlement', 'Covered', 'Excess', 'Covered $', 'Excess $', 'Adjustment $']);
        head.push('Settled bill $');
        rows.push(head);
        s.rows.forEach(function (r) {
            var line = [r.label, r.users, Math.round(r.used)];
            if (state.settleMode !== 'flat') {
                line = line.concat([Math.round(r.entitlement), Math.round(r.covered), Math.round(r.excess),
                                    r.coveredCost.toFixed(2), r.excessCost.toFixed(2), r.adjustment.toFixed(2)]);
            }
            line.push(r.finalBill.toFixed(2));
            rows.push(line);
        });
        rows.push([]);
        rows.push(['Tenant cost (what Microsoft charges)', '', '', '', '', '', '', '', '', s.actualCost.toFixed(2)]);
        rows.push(['Settled to units', '', '', '', '', '', '', '', '', s.finalBilled.toFixed(2)]);
        rows.push(['Residual', '', '', '', '', '', '', '', '', s.residual.toFixed(2)]);
        if (s.invoiceTotal != null) {
            rows.push(['Microsoft invoice entered', '', '', '', '', '', '', '', '', s.invoiceTotal.toFixed(2)]);
            rows.push(['Variance vs tenant cost', '', '', '', '', '', '', '', '', s.invoiceVariance.toFixed(2)]);
        }
        try { if (window.cwkTrack) window.cwkTrack('export_settlement_csv'); } catch (e) {}
        downloadBlob(toCsv(rows), 'healthcare-chargeback-settlement' + demoSuffix() + '.csv');
    }

    function downloadBlob(text, filename) {
        var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    }
    function csvCell(v) { var s = String(v == null ? '' : v); if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"'; return s; }
    function toCsv(rows) { return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'); }
    function stampRows() { return [['Cowork Chargeback - generated ' + new Date().toISOString().slice(0, 10) + (state.demoActive ? ' - SYNTHETIC DEMO DATA' : '')]]; }
    function demoSuffix() { return state.demoActive ? '-DEMO' : ''; }
    function exportJournalCsv() {
        if (!state.users.length) { alert('Load data first.'); return; }
        var m = computeChargeback();
        var rows = stampRows();
        rows.push(['Billing models', 'PAYGO / Prepaid / Hybrid', 'Rate $/credit', state.rate.toFixed(4), 'Prepaid $/credit', state.prepaidRate.toFixed(4)]);
        rows.push([unitLabel() + ' (GL key)', 'Users', 'Credits', 'Overage credits', 'PAYGO $', 'Prepaid $', 'Hybrid $']);
        m.groups.forEach(function (g) {
            rows.push([g.label, g.users, Math.round(g.credits), Math.round(g.overage), g.paygo.toFixed(2), g.prepaid.toFixed(2), g.hybrid.toFixed(2)]);
        });
        rows.push(['TOTAL', m.totalUsers, Math.round(m.totalCredits), Math.round(m.totalOverage), m.totalPaygo.toFixed(2), m.totalPrepaid.toFixed(2), m.totalHybrid.toFixed(2)]);
        if (m.invoiceTotal != null) {
            rows.push([]);
            rows.push(['Microsoft invoice (PAYGO basis)', '', '', '', m.invoiceTotal.toFixed(2)]);
            rows.push(['Variance (PAYGO chargeback - invoice)', '', '', '', m.variance.toFixed(2)]);
        }
        var pp = m.prepay;
        rows.push([]);
        rows.push(['Prepay sizing vs PAYG', 'Prepaid rate', state.prepaidRate.toFixed(4), 'Days', state.daysInPeriod, 'Headroom %', state.headroomPct]);
        rows.push(['Pay-as-you-go cost', '', '', '', pp.paygoCost.toFixed(2)]);
        rows.push(['Prepay full allowance', '', '', '', pp.fullAllowanceCost.toFixed(2)]);
        rows.push(['  wasted prepaid', '', '', '', pp.wastedPrepaidCost.toFixed(2)]);
        rows.push(['Prepay right-sized (actual)', '', '', '', pp.rightSizedCost.toFixed(2)]);
        rows.push(['Prepay + headroom (' + state.headroomPct + '%)', '', '', Math.round(pp.headroomPack), pp.headroomCost.toFixed(2)]);
        if (pp.purchased != null) {
            rows.push([]);
            rows.push(['Prepaid pool purchased (credits)', pp.purchased, 'Pool value $', pp.poolCost.toFixed(2)]);
            rows.push(['Credits used', Math.round(m.totalCredits), 'Pool consumed %', (pp.consumedPct != null ? (pp.consumedPct * 100).toFixed(1) : '')]);
            if (pp.shortfall > 0) rows.push(['Over pool (credits)', Math.round(pp.shortfall), 'PAYG on overflow $', pp.shortfallPaygo.toFixed(2)]);
            else rows.push(['Remaining in pool (credits)', Math.round(pp.unusedPool), 'Unused prepaid value $', pp.unusedPoolValue.toFixed(2)]);
        }
        downloadBlob(toCsv(rows), 'cowork-chargeback-journal' + demoSuffix() + '.csv');
    }
    function exportLineItemsCsv() {
        if (!state.users.length) { alert('Load data first.'); return; }
        var rate = state.rate;
        var rows = stampRows();
        rows.push(['Billing models', 'PAYGO / Prepaid / Hybrid', 'Rate $/credit', rate.toFixed(4), 'Prepaid $/credit', state.prepaidRate.toFixed(4)]);
        rows.push(['User Principal Name (MSID)', 'Display Name', 'Department', 'Cost Center', 'Business Unit', unitLabel() + ' (GL key)', 'Credits', 'Daily usage', 'Daily charge $', 'Prepaid allowance', 'PAYG (overage) credits', 'PAYGO $', 'Prepaid $', 'Hybrid $', 'Spending policy', 'Limit source']);
        state.users.slice().sort(function (a, b) { return b.used - a.used; }).forEach(function (u) {
            var over = Math.max(0, u.used - u.limit);
            var daily = state.daysInPeriod > 0 ? u.used / state.daysInPeriod : 0;
            rows.push([u.upn, u.displayName, u.department, u.costCenter, u.businessUnit, unitOf(u), Math.round(u.used), daily.toFixed(1), (daily * rate).toFixed(2), Math.round(u.limit), Math.round(over), chargeForModel(u.used, u.limit, 'paygo').toFixed(2), chargeForModel(u.used, u.limit, 'prepaid').toFixed(2), chargeForModel(u.used, u.limit, 'hybrid').toFixed(2), u.policy, u.limitSource || 'fallback']);
        });
        downloadBlob(toCsv(rows), 'cowork-chargeback-line-items' + demoSuffix() + '.csv');
    }

    function exportWorkbook() {
        if (!window.CBXLSX) { alert('Workbook exporter not loaded.'); return; }
        if (!state.users.length) { alert('Load data first.'); return; }
        var m = computeChargeback();
        var unit = unitLabel();
        var modelName = state.lineModel === 'prepaid' ? 'Prepaid' : (state.lineModel === 'hybrid' ? 'Hybrid' : 'PAYGO');
        var demo = state.demoActive, i, r, g, u;
        function money(v) { return { t: 'n', v: Math.round(v * 100) / 100, s: 'cur' }; }
        function intc(v) { return { t: 'n', v: Math.round(v), s: 'int' }; }
        function d1(v) { return { t: 'n', v: Math.round(v * 10) / 10, s: 'dec1' }; }
        function H(v) { return { t: 's', v: v, s: 'hdr' }; }
        function B(v) { return { t: 's', v: v, s: 'bold' }; }
        function TT(v) { return { t: 's', v: v, s: 'title' }; }
        function txt(v) { return { t: 's', v: v, s: 'def' }; }
        function fCur(f) { return { t: 'f', f: f, s: 'cur' }; }
        function fPct(f) { return { t: 'f', f: f, s: 'pct' }; }
        function fCurB(f) { return { t: 'f', f: f, s: 'boldCur' }; }
        function fIntB(f) { return { t: 'f', f: f, s: 'boldInt' }; }

        var readme = { name: 'Read me', cols: [40, 82], rows: [] };
        readme.rows.push([TT('Cowork Chargeback - allocation workbook')]);
        readme.rows.push(['Generated', new Date().toISOString().slice(0, 10) + (demo ? '  (SYNTHETIC DEMO DATA - do not use for real decisions)' : '')]);
        readme.rows.push([]);
        readme.rows.push([B('What this is')]);
        readme.rows.push(['A working tool to allocate Copilot Cowork credit costs back to your ' + unit + 's and bill them internally.']);
        readme.rows.push([]);
        readme.rows.push([H('Tab'), H('Purpose')]);
        readme.rows.push(['Summary', 'Org totals under all three billing models, plus assumptions and invoice reconciliation.']);
        readme.rows.push(['Allocation', 'Chargeback per ' + unit + '. Pick a model in cell B2; Chosen $ and Final $ recompute. Add manual tweaks in Adjustment $.']);
        readme.rows.push(['Users', 'Every user with org attributes and per-model charges. Filter or pivot freely.']);
        readme.rows.push(['Model comparison', 'PAYGO vs Prepaid vs Hybrid per ' + unit + ', with deltas and the cheapest model.']);
        readme.rows.push([]);
        readme.rows.push([B('How to use')]);
        readme.rows.push(['1. On the Allocation tab, set the billing model in cell B2 to PAYGO, Prepaid, or Hybrid.']);
        readme.rows.push(['2. Review Chosen $ per ' + unit + '. Enter any manual tweak in Adjustment $; Final $ updates automatically.']);
        readme.rows.push(['3. Send each ' + unit + ' owner their Final $, or pivot the Users tab by Business Unit / Manager.']);
        readme.rows.push(['4. Models: PAYGO = every credit x rate; Prepaid = allowance x prepaid rate; Hybrid = prepaid allowance + PAYG on overage.']);

        var summary = { name: 'Summary', cols: [38, 18], rows: [] };
        summary.rows.push([TT('Summary')]);
        summary.rows.push([]);
        summary.rows.push([H('Assumptions'), H('')]);
        summary.rows.push(['Contracted rate ($/credit)', { t: 'n', v: state.rate, s: 'rate' }]);
        summary.rows.push(['Prepaid rate ($/credit)', { t: 'n', v: state.prepaidRate, s: 'rate' }]);
        summary.rows.push(['Days in period', intc(state.daysInPeriod)]);
        summary.rows.push(['Headroom % (forecast)', { t: 'n', v: state.headroomPct, s: 'def' }]);
        summary.rows.push([]);
        summary.rows.push([H('Org totals'), H('')]);
        summary.rows.push(['Users', intc(m.totalUsers)]);
        summary.rows.push(['Credits consumed', intc(m.totalCredits)]);
        summary.rows.push(['PAYGO chargeback (matches invoice)', money(m.totalPaygo)]);
        summary.rows.push(['Prepaid chargeback', money(m.totalPrepaid)]);
        summary.rows.push(['Hybrid chargeback', money(m.totalHybrid)]);
        summary.rows.push(['Microsoft invoice', m.invoiceTotal != null ? money(m.invoiceTotal) : txt('Not entered')]);
        summary.rows.push(['Variance vs invoice (PAYGO - invoice)', m.invoiceTotal != null ? money(m.variance) : txt('n/a')]);
        summary.rows.push(['Allocation coverage', { t: 'n', v: m.coverage, s: 'pct' }]);
        summary.rows.push(['Unallocated', money(m.unallocCharge)]);
        if (m.prepay.purchased != null) {
            summary.rows.push([]);
            summary.rows.push([H('Prepaid pool'), H('')]);
            summary.rows.push(['Prepaid credits purchased', intc(m.prepay.purchased)]);
            summary.rows.push(['Prepaid pool value', money(m.prepay.poolCost)]);
            summary.rows.push(['Pool consumed', { t: 'n', v: m.prepay.consumedPct, s: 'pct' }]);
            summary.rows.push([m.prepay.shortfall > 0 ? 'Credits over pool (PAYG overflow)' : 'Prepaid credits remaining', intc(m.prepay.shortfall > 0 ? m.prepay.shortfall : m.prepay.unusedPool)]);
            summary.rows.push([m.prepay.shortfall > 0 ? 'PAYG cost on overflow' : 'Unused prepaid value', money(m.prepay.shortfall > 0 ? m.prepay.shortfallPaygo : m.prepay.unusedPoolValue)]);
        }

        var groups = m.groups;
        var alloc = { name: 'Allocation', cols: [26, 8, 12, 12, 13, 13, 13, 13, 11, 13, 13], rows: [] };
        alloc.rows.push([TT('Chargeback allocation by ' + unit)]);
        alloc.rows.push([B('Billing model'), txt(modelName)]);
        alloc.rows.push([txt('Set B2 to PAYGO, Prepaid, or Hybrid - Chosen $ and Final $ recompute.')]);
        alloc.rows.push([H(unit), H('Users'), H('Credits'), H('Overage cr'), H('PAYGO $'), H('Prepaid $'), H('Hybrid $'), H('Chosen $'), H('% of total'), H('Adjustment $'), H('Final $')]);
        var first = 5, totalRow = first + groups.length, last = totalRow - 1;
        for (i = 0; i < groups.length; i++) {
            g = groups[i]; r = first + i;
            alloc.rows.push([
                txt(g.label), intc(g.users), intc(g.credits), intc(g.overage),
                money(g.paygo), money(g.prepaid), money(g.hybrid),
                fCur('IF($B$2="Prepaid",F' + r + ',IF($B$2="Hybrid",G' + r + ',E' + r + '))'),
                fPct('IF($H$' + totalRow + '=0,0,H' + r + '/$H$' + totalRow + ')'),
                money(0),
                fCur('H' + r + '+J' + r)
            ]);
        }
        alloc.rows.push([
            B('TOTAL'), fIntB('SUM(B' + first + ':B' + last + ')'), fIntB('SUM(C' + first + ':C' + last + ')'), fIntB('SUM(D' + first + ':D' + last + ')'),
            fCurB('SUM(E' + first + ':E' + last + ')'), fCurB('SUM(F' + first + ':F' + last + ')'), fCurB('SUM(G' + first + ':G' + last + ')'),
            fCurB('SUM(H' + first + ':H' + last + ')'), { t: 'f', f: 'SUM(I' + first + ':I' + last + ')', s: 'pct' }, fCurB('SUM(J' + first + ':J' + last + ')'), fCurB('SUM(K' + first + ':K' + last + ')')
        ]);
        alloc.freeze = 4;
        alloc.autofilter = 'A4:K' + last;

        var usersS = { name: 'Users', cols: [26, 20, 18, 16, 16, 18, 10, 10, 12, 10, 12, 12, 12, 12, 16], rows: [] };
        usersS.rows.push([TT('Users - per-person detail')]);
        usersS.rows.push([B('Billing model'), { t: 'f', f: 'Allocation!$B$2', s: 'def' }]);
        usersS.rows.push([txt('Chosen $ follows the model on the Allocation tab. Use the filter row to slice, or pivot this table.')]);
        usersS.rows.push([H('User (MSID / UPN)'), H('Display name'), H('Department'), H('Cost Center'), H('Business Unit'), H(unit + ' (GL)'), H('Credits'), H('Daily use'), H('Allowance'), H('Overage'), H('PAYGO $'), H('Prepaid $'), H('Hybrid $'), H('Chosen $'), H('Spending policy')]);
        var us = state.users.slice().sort(function (a, b) { return b.used - a.used; }), ufirst = 5;
        for (i = 0; i < us.length; i++) {
            u = us[i]; r = ufirst + i;
            var over = Math.max(0, u.used - u.limit);
            var daily = state.daysInPeriod > 0 ? u.used / state.daysInPeriod : 0;
            usersS.rows.push([
                txt(u.upn), txt(u.displayName), txt(u.department), txt(u.costCenter), txt(u.businessUnit), txt(unitOf(u)),
                intc(u.used), d1(daily), intc(u.limit), intc(over),
                money(chargeForModel(u.used, u.limit, 'paygo')), money(chargeForModel(u.used, u.limit, 'prepaid')), money(chargeForModel(u.used, u.limit, 'hybrid')),
                fCur('IF($B$2="Prepaid",L' + r + ',IF($B$2="Hybrid",M' + r + ',K' + r + '))'), txt(u.policy)
            ]);
        }
        usersS.freeze = 4;
        usersS.autofilter = 'A4:O' + (ufirst + us.length - 1);

        var cmp = { name: 'Model comparison', cols: [26, 13, 13, 13, 13, 15, 15, 16], rows: [] };
        cmp.rows.push([TT('Billing model comparison by ' + unit)]);
        cmp.rows.push([H(unit), H('PAYGO $'), H('Prepaid $'), H('Hybrid $'), H('Cheapest $'), H('Prepaid - PAYGO'), H('Hybrid - PAYGO'), H('Cheapest model')]);
        var cfirst = 3, clast = cfirst + groups.length - 1;
        for (i = 0; i < groups.length; i++) {
            g = groups[i]; r = cfirst + i;
            cmp.rows.push([
                txt(g.label), money(g.paygo), money(g.prepaid), money(g.hybrid),
                fCur('MIN(B' + r + ':D' + r + ')'), fCur('C' + r + '-B' + r), fCur('D' + r + '-B' + r),
                { t: 'f', f: 'IF(E' + r + '=B' + r + ',"PAYGO",IF(E' + r + '=C' + r + ',"Prepaid","Hybrid"))', s: 'def' }
            ]);
        }
        cmp.rows.push([B('TOTAL'), fCurB('SUM(B' + cfirst + ':B' + clast + ')'), fCurB('SUM(C' + cfirst + ':C' + clast + ')'), fCurB('SUM(D' + cfirst + ':D' + clast + ')'), fCurB('SUM(E' + cfirst + ':E' + clast + ')'), fCurB('SUM(F' + cfirst + ':F' + clast + ')'), fCurB('SUM(G' + cfirst + ':G' + clast + ')'), txt('')]);
        cmp.freeze = 2;
        cmp.autofilter = 'A2:H' + clast;

        window.CBXLSX.download('cowork-chargeback-workbook' + demoSuffix() + '.xlsx', [readme, summary, alloc, usersS, cmp]);
    }

    function showError(msg) { var e = $('cbLandingError'); if (!e) { alert(msg); return; } e.textContent = msg; e.hidden = false; }
    function readFile(file) { return new Promise(function (resolve, reject) { var r = new FileReader(); r.onload = function () { resolve(String(r.result)); }; r.onerror = function () { reject(new Error('Could not read file')); }; r.readAsText(file); }); }
    function readFiles(fileList) {
        var arr = [];
        for (var i = 0; i < fileList.length; i++) arr.push(fileList[i]);
        return Promise.all(arr.map(function (f) { return readFile(f).then(function (t) { return { name: f.name, rows: parseCSV(t) }; }); }));
    }
    function handleEntraFiles(fileList, dz, status) {
        if (!fileList || !fileList.length) return;
        $('cbLandingError').hidden = true;
        readFiles(fileList).then(function (results) {
            if (!state.pending.entra) state.pending.entra = [];
            results.forEach(function (res) { state.pending.entra = state.pending.entra.concat(res.rows); state.entraFileNames.push(res.name); });
            var n = state.entraFileNames.length;
            status.textContent = fmtInt(n) + (n === 1 ? ' file - ' : ' files - ') + fmtInt(state.pending.entra.length) + ' rows';
            dz.classList.add('loaded');
            var clr = $('btnClearEntra'); if (clr) clr.hidden = false;
            $('btnGenerate').disabled = !(state.pending.entra && state.pending.entra.length && state.pending.credits);
        }).catch(function () { showError('Failed to read one or more Entra files'); });
    }
    function handleCreditFile(file, dz, status) {
        $('cbLandingError').hidden = true;
        readFile(file).then(function (text) {
            state.pending.credits = parseCSV(text);
            status.textContent = file.name + ' - ' + fmtInt(state.pending.credits.length) + ' rows';
            dz.classList.add('loaded');
            $('btnGenerate').disabled = !(state.pending.entra && state.pending.entra.length && state.pending.credits);
        }).catch(function () { showError('Failed to read ' + file.name); });
    }
    function wireDropzone(dzId, inputId, statusId, which) {
        var dz = $(dzId), input = $(inputId), status = $(statusId);
        if (!dz || !input || !status) return;
        dz.addEventListener('click', function () { input.click(); });
        dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', function () { dz.classList.remove('dragover'); });
        dz.addEventListener('drop', function (e) {
            e.preventDefault(); dz.classList.remove('dragover');
            var files = e.dataTransfer && e.dataTransfer.files;
            if (!files || !files.length) return;
            if (which === 'entra') handleEntraFiles(files, dz, status); else handleCreditFile(files[0], dz, status);
        });
        input.addEventListener('change', function () {
            if (input.files && input.files.length) { if (which === 'entra') handleEntraFiles(input.files, dz, status); else handleCreditFile(input.files[0], dz, status); }
            input.value = '';
        });
    }

    function readRate() { var r = $('rateInput'); if (r) { var v = parseFloat(r.value); state.rate = isFinite(v) && v >= 0 ? v : 0.01; } }
    function startFrom(entraRows, creditRows, demo) {
        // Telemetry: distinguish a real customer upload from demo-mode evaluation.
        try { if (window.cwkTrack) window.cwkTrack(demo ? 'demo_opened' : 'data_loaded', true); } catch (e) {}
        state.demoActive = !!demo;
        var fb = $('fallbackLimit'); if (fb) { var fv = parseFloat(fb.value); state.fallbackLimit = isFinite(fv) && fv > 0 ? fv : 400; }
        readRate();
        state.entraRows = entraRows;
        state.users = buildUsers(entraRows, creditRows);
        if (!state.users.length) { showError('No users could be built. Check that the credit file has a user principal name column.'); return; }
        if (demo) seedDemoSettlement();
        showReport();
    }

    /* Demo mode should land on a populated settlement, not an empty form. The
       entitlement split is deliberately by headcount rather than by usage: a
       first-pass allocation is usually per-head, and it produces units that
       over- and under-consume against their share. That is the situation the
       settlement exists to correct, so the demo shows the problem and the fix
       at the same time. A usage-based split would net to zero and demonstrate
       nothing. */
    function seedDemoSettlement() {
        if (!window.CBSettle) return;
        // computeChargeback groups by state.unitDim, which showReport resolves
        // later. Resolve it here first or every user lands in Unallocated.
        var dims = detectDimensions(state.entraRows);
        if (hasPolicies() && dims.indexOf('Spending policy') < 0) dims = dims.concat(['Spending policy']);
        // Demo only: named departments read far better in a settlement story
        // than cost-centre codes. Real uploads keep the normal default.
        var pref = '';
        for (var i = 0; i < dims.length; i++) { if (String(dims[i]).trim().toLowerCase() === 'department') { pref = dims[i]; break; } }
        state.unitDim = pref || pickDefaultDim(dims);
        var m = computeChargeback();

        /* Size the pool at ~70% of actual demo usage, rounded to whole packs.
           A pool far below usage leaves almost every unit over its entitlement,
           so nothing is left unused and the surplus collapses to a few dollars,
           which teaches nothing about steps D and E. At 70% the split lands 8
           units over and 8 under, which is the point of the panel. */
        var total = 0;
        for (i = 0; i < m.groups.length; i++) total += m.groups[i].credits || 0;
        state.prepaidPurchased = Math.max(state.packSize, Math.round(total * 0.7 / state.packSize) * state.packSize);
        var ppi = $('prepaidPurchasedInput'); if (ppi) ppi.value = String(state.prepaidPurchased);

        state.entitlements = window.CBSettle.proposeSplit(m.groups, state.prepaidPurchased, 'users');
        state.surplusMode = 'redistribute';
        state.settleMode = 'entitlement';
    }
    function syncToggle(id, attr, val) {
        var t = $(id); if (!t) return;
        Array.prototype.forEach.call(t.querySelectorAll('.dim-btn'), function (b) { b.classList.toggle('active', b.getAttribute(attr) === val); });
    }
    function showReport() {
        $('cbLanding').hidden = true;
        $('cbReport').hidden = false;
        var banner = $('cbDemoBanner'); if (banner) banner.hidden = !state.demoActive;
        var stamp = $('cbStamp'); if (stamp) stamp.textContent = (state.demoActive ? 'Synthetic demo - ' : '') + 'Generated ' + new Date().toISOString().slice(0, 10) + ' - chargeback at ' + fmtMoney(state.rate) + '/credit (PAYGO baseline; Prepaid & Hybrid compared in the journal).';
        var rr = $('rateReport'); if (rr) rr.value = state.rate;
        var pri = $('prepaidRateInput'); if (pri) pri.value = state.prepaidRate;
        var ppi = $('prepaidPurchasedInput'); if (ppi) ppi.value = state.prepaidPurchased != null ? state.prepaidPurchased : '';
        var dpi = $('daysInput'); if (dpi) dpi.value = state.daysInPeriod;
        var hri = $('headroomInput'); if (hri) hri.value = state.headroomPct;
        populateDimSelect();
        populatePolicyLimits();
        populateEntityFilter();
        var cbs0 = $('cbSearch'); if (cbs0) cbs0.value = state.lineSearch;
        syncToggle('cbFilterToggle', 'data-filter', state.lineFilter);
        render();
        window.scrollTo(0, 0);
    }
    function loadDemo() {
        if (!window.DEMO_ENTRA_CSV || !window.DEMO_CREDITS_CSV) { showError('Demo data not available.'); return; }
        startFrom(parseCSV(window.DEMO_ENTRA_CSV), parseCSV(window.DEMO_CREDITS_CSV), true);
    }
    function resetToLanding() {
        state.pending = { entra: null, credits: null }; state.users = []; state.demoActive = false; state.entraFileNames = []; state.invoiceTotal = null;
        state.lineModel = 'paygo'; state.lineFilter = 'all'; state.unitDim = null; state.entraRows = [];
        state.prepaidRate = 0.008; state.daysInPeriod = 30; state.headroomPct = 15; state.prepaidPurchased = null;
        state.expandedUnits = {}; state.valueMode = 'total'; state.policyLimits = {}; state.entityFilter = {}; state.entitySearch = ''; state.lineSearch = '';
        state.sortJournal = { key: 'paygo', dir: 'desc' }; state.sortLines = { key: 'charge', dir: 'desc' };
        state.entitlements = {}; state.settleMode = 'entitlement'; state.surplusMode = 'redistribute'; state.flatRate = null;
        $('statusEntra').textContent = 'No file selected'; $('statusCredits').textContent = 'No file selected';
        $('dzEntra').classList.remove('loaded'); $('dzCredits').classList.remove('loaded');
        $('fileEntra').value = ''; $('fileCredits').value = '';
        var clr = $('btnClearEntra'); if (clr) clr.hidden = true;
        var inv = $('invoiceInput'); if (inv) inv.value = '';
        var ppi = $('prepaidPurchasedInput'); if (ppi) ppi.value = '';
        var cbs = $('cbSearch'); if (cbs) cbs.value = '';
        var ces2 = $('cbEntitySearch'); if (ces2) ces2.value = '';
        $('btnGenerate').disabled = true;
        var err = $('cbLandingError'); if (err) err.hidden = true;
        window.scrollTo(0, 0);
    }

    function init() {
        wireDropzone('dzEntra', 'fileEntra', 'statusEntra', 'entra');
        wireDropzone('dzCredits', 'fileCredits', 'statusCredits', 'credits');
        var clr = $('btnClearEntra');
        if (clr) clr.addEventListener('click', function (e) {
            e.stopPropagation();
            state.pending.entra = null; state.entraFileNames = [];
            $('statusEntra').textContent = 'No file selected'; $('dzEntra').classList.remove('loaded'); clr.hidden = true;
            $('btnGenerate').disabled = true;
        });
        $('btnGenerate').addEventListener('click', function () { if (state.pending.entra && state.pending.entra.length && state.pending.credits) startFrom(state.pending.entra, state.pending.credits, false); });
        $('btnDemo').addEventListener('click', loadDemo);
        var rb = $('btnReset'); if (rb) rb.addEventListener('click', resetToLanding);
        var rr = $('rateReport'); if (rr) rr.addEventListener('input', function () { var v = parseFloat(rr.value); state.rate = isFinite(v) && v >= 0 ? v : 0; render(); });
        var inv = $('invoiceInput'); if (inv) inv.addEventListener('input', function () { var v = parseFloat(inv.value); state.invoiceTotal = (inv.value === '' || !isFinite(v) || v < 0) ? null : v; render(); });
        var pri2 = $('prepaidRateInput'); if (pri2) pri2.addEventListener('input', function () { var v = parseFloat(pri2.value); state.prepaidRate = isFinite(v) && v >= 0 ? v : 0; render(); });
        var ppi2 = $('prepaidPurchasedInput'); if (ppi2) ppi2.addEventListener('input', function () { var v = parseFloat(ppi2.value); state.prepaidPurchased = (ppi2.value === '' || !isFinite(v) || v < 0) ? null : v; render(); });
        var dpi2 = $('daysInput'); if (dpi2) dpi2.addEventListener('input', function () { var v = parseFloat(dpi2.value); state.daysInPeriod = isFinite(v) && v > 0 ? v : 30; render(); });
        var hri2 = $('headroomInput'); if (hri2) hri2.addEventListener('input', function () { var v = parseFloat(hri2.value); state.headroomPct = isFinite(v) && v >= 0 ? v : 0; render(); });
        var dimSel = $('cbDimSelect');
        if (dimSel) dimSel.addEventListener('change', function () { state.unitDim = dimSel.value; state.entityFilter = {}; state.entitySearch = ''; var es0 = $('cbEntitySearch'); if (es0) es0.value = ''; populateEntityFilter(); render(); });
        var pbox = $('cbPolicyLimits');
        if (pbox) pbox.addEventListener('input', function (e) {
            var t = e.target.closest ? e.target.closest('[data-policy]') : null;
            if (!t) return;
            var pol = t.getAttribute('data-policy'), v = parseFloat(t.value);
            if (t.value === '' || !isFinite(v) || v < 0) { delete state.policyLimits[pol]; } else { state.policyLimits[pol] = v; }
            applyLimits(); render();
        });
        var cbSearchEl = $('cbSearch'); if (cbSearchEl) cbSearchEl.addEventListener('input', function () { state.lineSearch = cbSearchEl.value; render(); });
        var ces = $('cbEntitySearch'); if (ces) ces.addEventListener('input', function () { state.entitySearch = ces.value; populateEntityFilter(); });
        var efbox = $('cbEntityFilter'); if (efbox) efbox.addEventListener('change', function (e) {
            var t = e.target.closest ? e.target.closest('[data-entity]') : null; if (!t) return;
            var k = t.getAttribute('data-entity');
            if (t.checked) { state.entityFilter[k] = true; } else { delete state.entityFilter[k]; }
            render();
        });
        var efc = $('cbEntityClear'); if (efc) efc.addEventListener('click', function () { state.entityFilter = {}; state.entitySearch = ''; if (ces) ces.value = ''; populateEntityFilter(); render(); });
        var filterTog = $('cbFilterToggle');
        if (filterTog) filterTog.addEventListener('click', function (ev) {
            var b = ev.target.closest ? ev.target.closest('.dim-btn') : null;
            if (!b || !b.getAttribute('data-filter')) return;
            state.lineFilter = b.getAttribute('data-filter');
            Array.prototype.forEach.call(filterTog.querySelectorAll('.dim-btn'), function (x) { x.classList.toggle('active', x === b); });
            render();
        });
        var cbBody = $('cbBody');
        if (cbBody) cbBody.addEventListener('click', function (ev) {
            var ex = ev.target.closest ? ev.target.closest('[data-expand]') : null;
            if (ex) { var uk = ex.getAttribute('data-expand'); state.expandedUnits[uk] = !state.expandedUnits[uk]; render(); return; }
            var vm = ev.target.closest ? ev.target.closest('[data-valuemode]') : null;
            if (vm) { state.valueMode = vm.getAttribute('data-valuemode'); render(); return; }
            var lm = ev.target.closest ? ev.target.closest('[data-linemodel]') : null;
            if (lm) { state.lineModel = lm.getAttribute('data-linemodel'); render(); return; }
            var th = ev.target.closest ? ev.target.closest('th.sortable') : null;
            if (!th) return;
            var tbl = th.getAttribute('data-table'), key = th.getAttribute('data-sort');
            var st = tbl === 'lines' ? state.sortLines : state.sortJournal;
            var textKeys = { label: 1, upn: 1, name: 1, unit: 1, policy: 1 };
            if (st.key === key) { st.dir = st.dir === 'asc' ? 'desc' : 'asc'; }
            else { st.key = key; st.dir = textKeys[key] ? 'asc' : 'desc'; }
            render();
        });
        var ej = $('btnExportJournal'); if (ej) ej.addEventListener('click', exportJournalCsv);
        var el = $('btnExportLines'); if (el) el.addEventListener('click', exportLineItemsCsv);
        var ex2 = $('btnExportXlsx'); if (ex2) ex2.addEventListener('click', exportWorkbook);
        if (/[?&]demo=1\b/.test(location.search)) loadDemo();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
