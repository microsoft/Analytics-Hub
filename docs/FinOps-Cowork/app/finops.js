/* finops.js - Copilot Cowork Credit FinOps report (100% client-side).
   FinOps Framework + FOCUS-aligned cost view. Renders from embedded synthetic
   demo data only. No frameworks, no network calls. Helpers are copied/adapted
   from app.js so the numbers match the sibling standard report. */
(function () {
    'use strict';

    // ------------------------------------------------------------ state
    var state = {
        users: [],
        listRate: 0.01,
        contractedRate: 0.01,
        allocDim: 'department', // Department / Cost Center / Business Unit toggle
        fallbackLimit: 400,     // loader-adjustable; used when no per-user limit column
        demoActive: false,
        capBasis: 'credits',
        unitCaps: { credits: { department: {}, costCenter: {}, businessUnit: {} }, dollars: { department: {}, costCenter: {}, businessUnit: {} } },
        pending: { entra: null, credits: null }
    };

    // --------------------------------------------------- utilities (from app.js)
    function $(id) { return document.getElementById(id); }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function fmtInt(v) { return (Math.round(v) || 0).toLocaleString('en-US'); }
    function fmtMoney(v) {
        return '$' + (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function fmtPct(v) { return ((Number(v) || 0) * 100).toFixed(1) + '%'; }
    function fmtNum2(v) { return (Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

    function normUpn(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

    function toNumber(s) {
        if (s == null) return 0;
        var n = parseFloat(String(s).replace(/[^0-9.\-]/g, ''));
        return isFinite(n) ? n : 0;
    }

    function toBool(s) {
        var v = String(s == null ? '' : s).trim().toLowerCase();
        return v === 'yes' || v === 'true' || v === '1' || v === 'licensed' || v === 'y';
    }

    // ------------------------------------------------------------ CSV parsing (from app.js)
    function parseCSV(text) {
        var rows = [];
        var field = '';
        var record = [];
        var inQuotes = false;
        text = String(text).replace(/^\uFEFF/, ''); // strip BOM
        for (var i = 0; i < text.length; i++) {
            var c = text[i];
            if (inQuotes) {
                if (c === '"') {
                    if (text[i + 1] === '"') { field += '"'; i++; }
                    else { inQuotes = false; }
                } else { field += c; }
            } else {
                if (c === '"') { inQuotes = true; }
                else if (c === ',') { record.push(field); field = ''; }
                else if (c === '\r') { /* ignore, handled by \n */ }
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

    // Logical field -> candidate header names (copied from app.js).
    var COLUMN_CANDIDATES = {
        upn: ['user principal name', 'userprincipalname', 'upn', 'email', 'user'],
        displayName: ['display name', 'displayname', 'name'],
        department: ['department', 'dept'],
        jobTitle: ['job title', 'jobtitle', 'title'],
        jobFamily: ['job family', 'jobfamily'],
        costCenter: ['cost center', 'costcenter', 'cc'],
        businessUnit: ['business unit', 'businessunit', 'bu'],
        country: ['country', 'usagelocation', 'usage location'],
        manager: ['manager', 'manager upn', 'manager email'],
        creditsUsed: ['monthly credits used', 'credits used', 'creditsused', 'cowork credits', 'credits'],
        creditLimit: ['monthly credit limit', 'credit limit', 'creditlimit', 'limit', 'allowance'],
        license: ['microsoft 365 copilot license', 'copilot license', 'license', 'licensed'],
        lastActivity: ['last activity date', 'last activity', 'lastactivitydate'],
        sessions: ['session count', 'sessions', 'sessioncount']
    };

    function resolveColumns(headers) {
        var lower = {};
        headers.forEach(function (h) { lower[String(h).trim().toLowerCase()] = h; });
        var map = {};
        Object.keys(COLUMN_CANDIDATES).forEach(function (field) {
            var cands = COLUMN_CANDIDATES[field];
            for (var i = 0; i < cands.length; i++) {
                if (lower[cands[i]] != null) { map[field] = lower[cands[i]]; return; }
            }
            map[field] = null;
        });
        return map;
    }

    // --------------------------------------------------------- build + join (adapted from app.js)
    function buildUsers(entraRows, creditRows) {
        var entraMap = resolveColumns(entraRows.length ? Object.keys(entraRows[0]) : []);
        var creditMap = resolveColumns(creditRows.length ? Object.keys(creditRows[0]) : []);

        // Index entra by normalized UPN.
        var byUpn = {};
        entraRows.forEach(function (row) {
            var upn = normUpn(entraMap.upn ? row[entraMap.upn] : '');
            if (!upn) return;
            byUpn[upn] = row;
        });

        var users = [];
        creditRows.forEach(function (crow) {
            var upn = normUpn(creditMap.upn ? crow[creditMap.upn] : '');
            if (!upn) return;
            var erow = byUpn[upn] || {};
            var get = function (map, row, field) { return map[field] ? String(row[map[field]] || '').trim() : ''; };

            var limit = creditMap.creditLimit ? toNumber(crow[creditMap.creditLimit]) : state.fallbackLimit;
            if (!creditMap.creditLimit || (limit <= 0 && !creditMap.creditLimit)) limit = state.fallbackLimit;

            users.push({
                upn: upn,
                displayName: get(creditMap, crow, 'displayName') || get(entraMap, erow, 'displayName') || upn,
                department: get(entraMap, erow, 'department') || 'Unknown',
                jobTitle: get(entraMap, erow, 'jobTitle') || '',
                jobFamily: get(entraMap, erow, 'jobFamily') || '',
                costCenter: get(entraMap, erow, 'costCenter') || 'Unknown',
                businessUnit: get(entraMap, erow, 'businessUnit') || 'Unknown',
                country: get(entraMap, erow, 'country') || '',
                manager: get(entraMap, erow, 'manager') || '',
                used: creditMap.creditsUsed ? toNumber(crow[creditMap.creditsUsed]) : 0,
                limit: limit,
                sessions: creditMap.sessions ? toNumber(crow[creditMap.sessions]) : 0,
                licensed: creditMap.license ? toBool(crow[creditMap.license]) : false,
                lastActivity: get(creditMap, crow, 'lastActivity')
            });
        });
        return users;
    }

    // Spend-tier billing policies (ported from the Policy Helper) for right-size recommendations.
    var POLICIES = [
        { id: 'unassigned', name: 'Unassigned', allowance: 0 },
        { id: 'light', name: 'Light', allowance: 150 },
        { id: 'standard', name: 'Standard', allowance: 400 },
        { id: 'advanced', name: 'Advanced', allowance: 700 },
        { id: 'power', name: 'Power', allowance: 1200 },
        { id: 'frontier', name: 'Frontier', allowance: 2000 }
    ];
    function policyName(id) {
        for (var i = 0; i < POLICIES.length; i++) { if (POLICIES[i].id === id) return POLICIES[i].name; }
        return 'Unassigned';
    }
    function recommendPolicy(u) {
        if (!u.licensed || u.used <= 0) return 'unassigned';
        var ordered = POLICIES.filter(function (p) { return p.allowance > 0; })
            .slice().sort(function (a, b) { return a.allowance - b.allowance; });
        for (var i = 0; i < ordered.length; i++) {
            if (ordered[i].allowance >= u.used) return ordered[i].id;
        }
        return ordered.length ? ordered[ordered.length - 1].id : 'unassigned';
    }
    function userFlag(u) {
        if (u.used > u.limit) return 'Over';
        if (u.limit > 0 && u.used < u.limit * 0.4) return 'Underused';
        return 'OK';
    }

    // --------------------------------------------------------- FOCUS cost helpers
    // FOCUS cost semantics: EffectiveCost = ContractedCost (no amortization in scope).
    function costFigures(credits, overageCredits) {
        var listRate = state.listRate, cRate = state.contractedRate;
        var listCost = credits * listRate;
        var contractedCost = credits * cRate;
        var effectiveCost = contractedCost;       // no amortization in scope
        var billedCost = effectiveCost;
        var savings = listCost - effectiveCost;   // SavingsVsList
        return {
            listCost: listCost,
            contractedCost: contractedCost,
            effectiveCost: effectiveCost,
            billedCost: billedCost,
            savings: savings,
            esr: listCost > 0 ? savings / listCost : 0,    // Effective Savings Rate
            showback: effectiveCost,                        // full effective cost of consumption
            chargeback: overageCredits * cRate             // overage priced at contracted rate
        };
    }

    // Aggregate users by a logical dimension field.
    function aggregateBy(users, field) {
        var g = {};
        users.forEach(function (u) {
            var key = (u[field] && String(u[field]).trim()) ? String(u[field]).trim() : 'Unknown';
            var o = g[key] || (g[key] = {
                label: key, users: 0, active: 0, credits: 0, limit: 0,
                overage: 0, unused: 0, sessions: 0
            });
            o.users += 1;
            if (u.used > 0) o.active += 1;
            o.credits += u.used;
            o.limit += u.limit;
            o.overage += u.overage;
            o.unused += u.unused;
            o.sessions += u.sessions;
        });
        var arr = Object.keys(g).map(function (k) { return g[k]; });
        arr.sort(function (a, b) { return b.credits - a.credits; });
        return arr;
    }

    // --------------------------------------------------------- compute the model
    function compute() {
        var users = state.users;

        // Per-user derived fields (mirror app.js computePerUser core).
        users.forEach(function (u) {
            u.overage = Math.max(0, u.used - u.limit);
            u.unused = Math.max(0, u.limit - u.used);
            u.util = u.limit > 0 ? u.used / u.limit : 0;
            u.recommended = recommendPolicy(u);
            u.flag = userFlag(u);
        });

        // Org totals.
        var org = { users: users.length, active: 0, credits: 0, limit: 0, overage: 0, unused: 0, sessions: 0, allocatedCredits: 0 };
        users.forEach(function (u) {
            if (u.used > 0) org.active += 1;
            org.credits += u.used;
            org.limit += u.limit;
            org.overage += u.overage;
            org.unused += u.unused;
            org.sessions += u.sessions;
            if (u.department && u.department !== 'Unknown') org.allocatedCredits += u.used; // for allocation coverage
        });
        org.util = org.limit > 0 ? org.credits / org.limit : 0;

        var orgCost = costFigures(org.credits, org.overage);
        // Allocation coverage = share of EffectiveCost from users whose department != 'Unknown'.
        var allocatedCost = costFigures(org.allocatedCredits, 0).effectiveCost;
        var allocationCoverage = orgCost.effectiveCost > 0 ? allocatedCost / orgCost.effectiveCost : 0;

        return {
            users: users,
            org: org,
            orgCost: orgCost,
            allocationCoverage: allocationCoverage,
            byDept: aggregateBy(users, 'department'),
            byCC: aggregateBy(users, 'costCenter'),
            byBU: aggregateBy(users, 'businessUnit'),
            unusedWaste: costFigures(org.unused, 0).effectiveCost,
            overageCost: org.overage * state.contractedRate
        };
    }

    // Active allocation dimension (shared with the allocation toggle) + per-unit cap lookup.
    function activeDim(m) {
        if (state.allocDim === 'costCenter') return { key: 'costCenter', label: 'Cost Center', groups: m.byCC };
        if (state.allocDim === 'businessUnit') return { key: 'businessUnit', label: 'Business Unit', groups: m.byBU };
        return { key: 'department', label: 'Department', groups: m.byDept };
    }
    function capFor(basis, dimKey, label, fallbackVal) {
        var byDim = state.unitCaps[basis] || {};
        var caps = byDim[dimKey] || {};
        var v = caps[label];
        return (v == null || v === '') ? fallbackVal : v;
    }

    // =========================================================== section builders

    // (A) Scope & assumptions strip.
    function renderScope(m) {
        var el = $('scopeStrip');
        if (!el) return;
        var items = [
            ['Billing currency', 'USD'],
            ['Provider', 'Microsoft'],
            ['Service', 'Microsoft 365 Copilot Cowork Credits'],
            ['Charge category', 'Usage'],
            ['Data source', state.demoActive ? 'Synthetic demo' : 'Your uploaded exports'],
            ['Billing period', 'Single-month snapshot'],
            ['Users in scope', fmtInt(m.org.users)]
        ];
        var cells = items.map(function (it) {
            return '<div class="scope-item"><div class="scope-k">' + esc(it[0]) + '</div><div class="scope-v">' + esc(it[1]) + '</div></div>';
        }).join('');
        var sourceNote = state.demoActive
            ? 'All data is <strong>synthetic</strong> and must not be used for real financial decisions. '
            : 'This report is computed locally from the files you loaded; nothing leaves your browser. ';
        var note = '<div class="scope-note"><strong>Scope &amp; honesty note.</strong> ' +
            'This is a single-month usage snapshot priced with one list rate and one contracted rate. ' +
            'Out of scope by design: no amortization of commitments, no shared-cost split, and no ' +
            'time-series / forecasting / anomaly detection. ' + sourceNote +
            'Because a credit model is pure consumption, ' +
            'a single blended rate is the only price knob modelled.</div>';
        el.className = 'scope-strip';
        el.innerHTML = cells + note;
    }

    // (B) FinOps KPI band.
    function sectionKPIs(m) {
        var unitCost = m.org.users > 0 ? m.orgCost.effectiveCost / m.org.users : 0;
        function card(label, value, sub, accent, tip) {
            var info = tip ? '<span class="metric-info" tabindex="0" aria-label="' + esc(tip) +
                '">?<span class="metric-tip">' + esc(tip) + '</span></span>' : '';
            return '<div class="metric-card' + (accent ? ' ' + accent : '') + '">' +
                '<div class="metric-label">' + esc(label) + info + '</div>' +
                '<div class="metric-value">' + esc(value) + '</div>' +
                '<div class="metric-sublabel">' + esc(sub) + '</div></div>';
        }
        return '<section class="panel"><h3>FinOps KPI band</h3>' +
            '<div class="metrics-grid">' +
            card('Billed Cost', fmtMoney(m.orgCost.billedCost), 'Effective cost billed this period', '', 'Amount invoiced this period. Equals Effective Cost here: contracted rate x credits consumed. No amortization or shared-cost splits.') +
            card('Effective Cost', fmtMoney(m.orgCost.effectiveCost), 'Contracted rate, no amortization', '', 'Cost after your negotiated discount: credits consumed x contracted unit price ($/credit). The true cost of consumption.') +
            card('List Cost', fmtMoney(m.orgCost.listCost), 'At published rack rate', '', 'Consumption valued at the published rack rate: credits consumed x list unit price ($0.01/credit), before any discount.') +
            card('Effective Savings Rate', fmtPct(m.orgCost.esr), 'vs list price', 'accent-savings', 'Discount vs list: (List Cost - Effective Cost) / List Cost. 0% means the contracted rate equals list.') +
            card('Cost Allocation Coverage', fmtPct(m.allocationCoverage), 'Effective cost with a named department', 'accent-savings', 'Share of effective cost mapped to a named department: allocated cost / total effective cost. 100% means every credit is charged back.') +
            card('Unit Cost', fmtMoney(unitCost), 'Effective cost per user', '', 'Average effective cost per user in scope: Effective Cost / users in scope.') +
            card('Utilization', fmtPct(m.org.util), fmtInt(m.org.credits) + ' of ' + fmtInt(m.org.limit) + ' credits', 'accent-amber', 'Share of the purchased allowance consumed: credits used / credits allowed. Above 100% means overage.') +
            card('Unused Allowance / Waste', fmtMoney(m.unusedWaste), fmtInt(m.org.unused) + ' credits unconsumed', 'accent-red', 'Value of purchased credits left unused: (allowed - used) credits x effective unit price. Lower is more efficient.') +
            '</div></section>';
    }

    // (C) FOCUS 1.2 cost summary by SubAccount (Department).
    function sectionFocusSummary(m) {
        var cols = ['BillingAccountName', 'SubAccountName', 'ChargeCategory', 'ServiceName', 'ServiceCategory',
            'ConsumedQuantity', 'PricingUnit', 'ListUnitPrice', 'ContractedUnitPrice',
            'ListCost', 'ContractedCost', 'EffectiveCost', 'BilledCost', 'BillingCurrency'];
        var numCols = { ConsumedQuantity: 1, ListUnitPrice: 1, ContractedUnitPrice: 1, ListCost: 1, ContractedCost: 1, EffectiveCost: 1, BilledCost: 1 };
        var head = '<thead><tr>' + cols.map(function (c) {
            return '<th class="' + (numCols[c] ? 'num' : '') + '">' + esc(c) + '</th>';
        }).join('') + '</tr></thead>';

        function row(label, credits, overage, isTotal) {
            var f = costFigures(credits, overage);
            var cells = [
                'Copilot Cowork \u2014 Demo Tenant',
                label,
                'Usage',
                'Microsoft 365 Copilot Cowork',
                'AI and Machine Learning',
                fmtInt(credits),
                'Credits',
                fmtMoney(state.listRate),
                fmtMoney(state.contractedRate),
                fmtMoney(f.listCost),
                fmtMoney(f.contractedCost),
                fmtMoney(f.effectiveCost),
                fmtMoney(f.billedCost),
                'USD'
            ];
            return '<tr' + (isTotal ? ' style="font-weight:700"' : '') + '>' + cols.map(function (c, i) {
                return '<td class="' + (numCols[c] ? 'num' : '') + '">' + esc(cells[i]) + '</td>';
            }).join('') + '</tr>';
        }

        var body = '<tbody>' + m.byDept.map(function (g) { return row(g.label, g.credits, g.overage, false); }).join('') +
            row('TOTAL', m.org.credits, m.org.overage, true) + '</tbody>';

        return '<section class="panel"><h3>FOCUS v1.2 cost summary &mdash; by SubAccount (Department)</h3>' +
            '<div class="table-wrap"><table>' + head + body + '</table></div>' +
            '<p class="section-caption">Columns follow the FOCUS v1.2 billing specification. ' +
            'EffectiveCost equals ContractedCost (no amortization in scope); BilledCost equals EffectiveCost.</p></section>';
    }

    // (D) Cost allocation - showback & chargeback, with dimension toggle.
    function sectionAllocation(m) {
        var dims = [
            { key: 'department', label: 'Department', groups: m.byDept },
            { key: 'costCenter', label: 'Cost Center', groups: m.byCC },
            { key: 'businessUnit', label: 'Business Unit', groups: m.byBU }
        ];
        var active = dims.filter(function (d) { return d.key === state.allocDim; })[0] || dims[0];

        var toggle = '<div class="dim-toggle">' + dims.map(function (d) {
            return '<button class="dim-btn' + (d.key === state.allocDim ? ' active' : '') + '" data-dim="' + esc(d.key) + '">' + esc(d.label) + '</button>';
        }).join('') + '</div>';

        var totalEffective = m.orgCost.effectiveCost || 1;
        var head = '<thead><tr>' +
            '<th>' + esc(active.label) + '</th>' +
            '<th class="num">Consumed (credits)</th>' +
            '<th class="num">Showback $</th>' +
            '<th class="num">Chargeback $</th>' +
            '<th class="num">% of total</th></tr></thead>';
        var body = '<tbody>' + active.groups.map(function (g) {
            var f = costFigures(g.credits, g.overage);
            return '<tr>' +
                '<td>' + esc(g.label) + '</td>' +
                '<td class="num">' + fmtInt(g.credits) + '</td>' +
                '<td class="num">' + fmtMoney(f.showback) + '</td>' +
                '<td class="num">' + fmtMoney(f.chargeback) + '</td>' +
                '<td class="num">' + fmtPct(f.effectiveCost / totalEffective) + '</td></tr>';
        }).join('');
        var tf = costFigures(m.org.credits, m.org.overage);
        body += '<tr style="font-weight:700"><td>TOTAL</td>' +
            '<td class="num">' + fmtInt(m.org.credits) + '</td>' +
            '<td class="num">' + fmtMoney(tf.showback) + '</td>' +
            '<td class="num">' + fmtMoney(tf.chargeback) + '</td>' +
            '<td class="num">' + fmtPct(1) + '</td></tr></tbody>';

        return '<section class="panel"><h3>Cost allocation &mdash; showback &amp; chargeback</h3>' +
            toggle +
            '<div class="table-wrap"><table>' + head + body + '</table></div>' +
            '<p class="section-caption">Showback bills the full effective cost of all consumption; ' +
            'chargeback recovers only over-allowance credits at the contracted rate. ' +
            'Allocation coverage: <strong>' + fmtPct(m.allocationCoverage) + '</strong> of effective cost maps to a named department.</p></section>';
    }

    // (E) Budget caps & variance - per chargeback unit, in credits OR dollars.
    function sectionBudgetCaps(m) {
        var dim = activeDim(m);
        var basis = state.capBasis;
        var rate = state.contractedRate;
        function statusOf(util) {
            if (util > 1) return { cls: 'cell-over', txt: 'Over', scls: 'status-over' };
            if (util >= 0.85) return { cls: 'cell-near', txt: 'Near', scls: 'status-near' };
            return { cls: 'cell-under', txt: 'Under', scls: 'status-under' };
        }
        var toggle = '<div class="dim-toggle">' +
            '<button class="dim-btn' + (basis === 'credits' ? ' active' : '') + '" data-basis="credits">Credits</button>' +
            '<button class="dim-btn' + (basis === 'dollars' ? ' active' : '') + '" data-basis="dollars">Dollars ($)</button>' +
            '</div>';
        var isD = basis === 'dollars';
        var head = '<thead><tr>' +
            '<th>' + esc(dim.label) + '</th>' +
            '<th class="num">' + (isD ? 'Consumed ($)' : 'Consumed (credits)') + '</th>' +
            '<th class="num">' + (isD ? 'Budget cap ($)' : 'Budget cap (credits)') + '</th>' +
            '<th class="num">' + (isD ? 'Cap (credits)' : 'Cap ($)') + '</th>' +
            '<th class="num">' + (isD ? 'Variance ($)' : 'Variance (credits)') + '</th>' +
            '<th class="num">Variance %</th>' +
            '<th>Status</th></tr></thead>';
        var body = '<tbody>' + dim.groups.map(function (g) {
            var consumedD = costFigures(g.credits, g.overage).effectiveCost;
            if (isD) {
                var capD = toNumber(capFor('dollars', dim.key, g.label, g.limit * rate));
                var varD = consumedD - capD;
                var utilD = capD > 0 ? consumedD / capD : 0;
                var sd = statusOf(utilD);
                var altCredits = rate > 0 ? capD / rate : 0;
                return '<tr>' +
                    '<td>' + esc(g.label) + '</td>' +
                    '<td class="num">' + fmtMoney(consumedD) + '</td>' +
                    '<td class="num"><input type="number" min="0" step="0.01" class="cap-input" data-basis="dollars" data-dim="' + esc(dim.key) + '" data-label="' + esc(g.label) + '" value="' + esc(capD.toFixed(2)) + '"></td>' +
                    '<td class="num">' + fmtInt(altCredits) + '</td>' +
                    '<td class="num">' + (varD >= 0 ? '+' : '') + fmtMoney(varD) + '</td>' +
                    '<td class="num">' + fmtPct(capD > 0 ? varD / capD : 0) + '</td>' +
                    '<td class="' + sd.cls + '"><span class="' + sd.scls + '">' + esc(sd.txt) + '</span></td></tr>';
            }
            var cap = toNumber(capFor('credits', dim.key, g.label, g.limit));
            var variance = g.credits - cap;
            var util = cap > 0 ? g.credits / cap : 0;
            var s = statusOf(util);
            return '<tr>' +
                '<td>' + esc(g.label) + '</td>' +
                '<td class="num">' + fmtInt(g.credits) + '</td>' +
                '<td class="num"><input type="number" min="0" step="1" class="cap-input" data-basis="credits" data-dim="' + esc(dim.key) + '" data-label="' + esc(g.label) + '" value="' + esc(String(Math.round(cap))) + '"></td>' +
                '<td class="num">' + fmtMoney(cap * rate) + '</td>' +
                '<td class="num">' + (variance >= 0 ? '+' : '') + fmtInt(variance) + '</td>' +
                '<td class="num">' + fmtPct(cap > 0 ? variance / cap : 0) + '</td>' +
                '<td class="' + s.cls + '"><span class="' + s.scls + '">' + esc(s.txt) + '</span></td></tr>';
        }).join('') + '</tbody>';
        return '<section class="panel"><h3>Budget caps &amp; variance &mdash; by ' + esc(dim.label) + '</h3>' +
            toggle +
            '<div class="table-wrap"><table>' + head + body + '</table></div>' +
            '<p class="section-caption">Set a monthly budget cap per ' + esc(String(dim.label).toLowerCase()) +
            ' in <strong>credits or dollars</strong> (toggle above). Caps default to the sum of per-user allowances (priced at the contracted rate for dollars) and drive showback/variance only; the platform does not enforce them. ' +
            'Status: Over (&gt; 100% of cap), Near (&ge; 85%), Under. Caps live in this session and are written into the CSV export.</p></section>';
    }

    // (F) Unit economics per department.
    function sectionUnitEconomics(m) {
        var hasSessions = m.org.sessions > 0;
        var head = '<thead><tr>' +
            '<th>Department</th>' +
            '<th class="num">Cost / User</th>' +
            '<th class="num">Cost / Active User</th>' +
            '<th class="num">Cost / Credit</th>' +
            '<th class="num">Credits / User</th>' +
            (hasSessions ? '<th class="num">Sessions / User</th>' : '') +
            '</tr></thead>';
        var body = '<tbody>' + m.byDept.map(function (g) {
            var f = costFigures(g.credits, g.overage);
            var perUser = g.users > 0 ? f.effectiveCost / g.users : 0;
            var perActive = g.active > 0 ? f.effectiveCost / g.active : 0;
            var creditsPerUser = g.users > 0 ? g.credits / g.users : 0;
            var sessPerUser = g.users > 0 ? g.sessions / g.users : 0;
            return '<tr>' +
                '<td>' + esc(g.label) + '</td>' +
                '<td class="num">' + fmtMoney(perUser) + '</td>' +
                '<td class="num">' + fmtMoney(perActive) + '</td>' +
                '<td class="num">' + fmtMoney(state.contractedRate) + '</td>' +
                '<td class="num">' + fmtNum2(creditsPerUser) + '</td>' +
                (hasSessions ? '<td class="num">' + fmtNum2(sessPerUser) + '</td>' : '') +
                '</tr>';
        }).join('') + '</tbody>';
        return '<section class="panel"><h3>Unit economics &mdash; by Department</h3>' +
            '<div class="table-wrap"><table>' + head + body + '</table></div>' +
            '<p class="section-caption">Effective-cost basis. Active user = consumed &gt; 0 credits. ' +
            'Cost per credit equals the contracted unit price.</p></section>';
    }

    // (F2) Per-user showback & right-size roster (top rows on screen; full set in the export).
    function sectionRoster(m) {
        var users = m.users.slice().sort(function (a, b) { return (b.used - b.limit) - (a.used - a.limit); });
        var LIMIT = 25;
        var shown = users.slice(0, LIMIT);
        function flagCell(f) {
            var cls = f === 'Over' ? 'status-over' : (f === 'Underused' ? 'status-near' : 'status-under');
            return '<span class="' + cls + '">' + esc(f) + '</span>';
        }
        var head = '<thead><tr>' +
            '<th>User</th><th>Department</th>' +
            '<th class="num">Used</th><th class="num">Allowance</th><th class="num">Utilization</th>' +
            '<th>Flag</th><th class="num">Showback $</th><th class="num">Chargeback $</th><th>Right-size to</th></tr></thead>';
        var body = '<tbody>' + shown.map(function (u) {
            var f = costFigures(u.used, u.overage);
            return '<tr>' +
                '<td>' + esc(u.displayName) + '</td>' +
                '<td>' + esc(u.department) + '</td>' +
                '<td class="num">' + fmtInt(u.used) + '</td>' +
                '<td class="num">' + fmtInt(u.limit) + '</td>' +
                '<td class="num">' + fmtPct(u.util) + '</td>' +
                '<td>' + flagCell(u.flag) + '</td>' +
                '<td class="num">' + fmtMoney(f.showback) + '</td>' +
                '<td class="num">' + fmtMoney(f.chargeback) + '</td>' +
                '<td>' + esc(policyName(u.recommended)) + '</td></tr>';
        }).join('') + '</tbody>';
        var note = users.length > LIMIT
            ? 'Showing the top ' + LIMIT + ' users by over-allowance. All ' + fmtInt(users.length) + ' users are in the by-user CSV export.'
            : 'All ' + fmtInt(users.length) + ' users shown.';
        return '<section class="panel"><h3>Per-user showback &amp; right-size</h3>' +
            '<div class="table-wrap"><table>' + head + body + '</table></div>' +
            '<p class="section-caption">Flag: Over (used &gt; allowance), Underused (&lt; 40% of allowance), OK. ' +
            'Right-size shows the smallest spend tier that covers the user usage. ' + note + '</p></section>';
    }

    // (G) Rate / commitment optimization.
    function sectionRateOptimization(m) {
        var list = m.orgCost.listCost, contracted = m.orgCost.contractedCost, effective = m.orgCost.effectiveCost;
        var max = Math.max(list, contracted, effective, 1);
        function bar(label, cls, value) {
            var pct = (value / max) * 100;
            return '<div class="rate-bar-row">' +
                '<div class="rb-label">' + esc(label) + '</div>' +
                '<div class="rate-bar-track"><div class="rate-bar-fill ' + cls + '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
                '<div class="rb-value">' + fmtMoney(value) + '</div></div>';
        }
        return '<section class="panel"><h3>Rate &amp; commitment optimization</h3>' +
            '<div class="esr-headline">Effective Savings Rate: ' + fmtPct(m.orgCost.esr) + '</div>' +
            '<div class="rate-bars">' +
            bar('List cost', 'rb-list', list) +
            bar('Contracted cost', 'rb-contracted', contracted) +
            bar('Effective cost', 'rb-effective', effective) +
            '</div>' +
            '<div class="metrics-grid" style="margin-top:1rem">' +
            '<div class="metric-card accent-savings"><div class="metric-label">Savings vs List</div>' +
            '<div class="metric-value">' + esc(fmtMoney(m.orgCost.savings)) + '</div>' +
            '<div class="metric-sublabel">List minus effective cost</div></div>' +
            '<div class="metric-card accent-red"><div class="metric-label">Unused-Allowance Waste</div>' +
            '<div class="metric-value">' + esc(fmtMoney(m.unusedWaste)) + '</div>' +
            '<div class="metric-sublabel">Optimization target: ' + esc(fmtInt(m.org.unused)) + ' idle credits</div></div>' +
            '</div>' +
            '<p class="section-caption">Commitments / reservations are <strong>N/A</strong> for a pure consumption ' +
            'credit model &mdash; the only rate lever is the negotiated (contracted) unit price. The primary ' +
            'in-period optimization target is reallocating unused allowance away from waste.</p></section>';
    }

    // (H) FinOps Framework capability coverage matrix.
    function sectionCapabilityCoverage() {
        var rows = [
            ['Understand', 'Data Ingestion', 'partial', 'parameterized CSV sources, not a billing feed'],
            ['Understand', 'Cost Allocation', 'strong', 'split by Dept, Cost Center, BU; RLS-ready'],
            ['Understand', 'Reporting & Analytics', 'strong', 'multi-section report, cohorts, per-user'],
            ['Understand', 'Anomaly Management', 'none', 'no time-series in a single-month snapshot'],
            ['Quantify', 'Budgeting', 'partial', 'per-unit budget caps in credits or dollars + variance; session-only, not enforced'],
            ['Quantify', 'Forecasting', 'none', 'snapshot only, by design'],
            ['Quantify', 'Unit Economics', 'partial', 'cost per user/credit; no business-value unit'],
            ['Optimize', 'Rate Optimization', 'partial', 'List/Contracted/Effective + ESR; single rate'],
            ['Optimize', 'Workload Optimization', 'partial', 'unused vs overage reallocation, current month'],
            ['Manage', 'Invoicing & Chargeback', 'strong', 'core purpose; showback->chargeback, RLS'],
            ['Manage', 'Policy & Governance', 'partial', 'allowance policy, right-size recommendations, per-user export'],
        ];
        var dotClass = { strong: 'cov-strong', partial: 'cov-partial', none: 'cov-none' };
        var dotText = { strong: 'Strong', partial: 'Partial', none: 'None' };
        var head = '<thead><tr><th>Capability</th><th>Domain</th><th>Coverage</th><th>Note</th></tr></thead>';
        var body = '<tbody>' + rows.map(function (r) {
            return '<tr>' +
                '<td class="cov-label">' + esc(r[1]) + '</td>' +
                '<td class="cap-domain">' + esc(r[0]) + '</td>' +
                '<td><span class="cov-dot ' + dotClass[r[2]] + '"></span>' + esc(dotText[r[2]]) + '</td>' +
                '<td>' + esc(r[3]) + '</td></tr>';
        }).join('') + '</tbody>';
        return '<section class="panel"><h3>FinOps Framework capability coverage</h3>' +
            '<div class="table-wrap"><table>' + head + body + '</table></div>' +
            '<p class="section-caption">Coverage is scored honestly against the FinOps Framework domains ' +
            '(Understand, Quantify, Optimize, Manage). Green = Strong, amber = Partial, grey = None.</p></section>';
    }

    // (I) FinOps glossary.
    function sectionGlossary() {
        var terms = [
            ['FOCUS', 'FinOps Open Cost and Usage Specification &mdash; a vendor-neutral schema for billing and usage data.'],
            ['List Cost', 'Cost at the published rack (list) unit price, before any negotiated discount.'],
            ['Contracted Cost', 'Cost at the negotiated (contracted) unit price agreed with the provider.'],
            ['Effective Cost', 'The cost actually borne after discounts; here equal to Contracted Cost (no amortization in scope).'],
            ['Billed Cost', 'The amount invoiced for the period; here equal to Effective Cost.'],
            ['Effective Savings Rate (ESR)', '(List Cost &minus; Effective Cost) / List Cost. Zero when list and contracted rates match.'],
            ['Cost Allocation Coverage', 'Share of effective cost attributable to a named department (not "Unknown").'],
            ['Showback', 'Reporting the full cost of consumption back to a team for visibility, without a formal charge.'],
            ['Chargeback', 'Formally charging a team for its consumption &mdash; here, over-allowance credits at the contracted rate.'],
            ['Unit Economics', 'Cost normalized to a unit such as per user, per active user, or per credit.'],
            ['Utilization', 'Consumed credits divided by allowance (credit limit).'],
            ['Allowance Gap / Waste', 'Unconsumed allowance (limit minus used), valued at the effective rate.'],
            ['SubAccount', 'A FOCUS grouping below the billing account; here mapped to Department.'],
            ['ChargeCategory', 'FOCUS classification of a charge; here "Usage" for consumption.'],
            ['PricingUnit', 'The unit a price is quoted in; here "Credits".']
        ];
        var dl = terms.map(function (t) {
            return '<dt>' + esc(t[0]) + '</dt><dd>' + t[1] + '</dd>';
        }).join('');
        return '<section class="panel"><h3>FinOps glossary</h3><dl class="glossary-dl">' + dl + '</dl></section>';
    }

    // =========================================================== render
    function render() {
        var m = compute();
        renderScope(m);
        var body = $('finopsBody');
        if (!body) return;
        body.innerHTML =
            sectionKPIs(m) +
            sectionFocusSummary(m) +
            sectionAllocation(m) +
            sectionBudgetCaps(m) +
            sectionRoster(m) +
            sectionUnitEconomics(m) +
            sectionRateOptimization(m) +
            sectionCapabilityCoverage() +
            sectionGlossary();
    }

    // =========================================================== wiring
    function readRates() {
        var l = $('rateList'), c = $('rateContracted');
        if (l) { var lv = parseFloat(l.value); state.listRate = isFinite(lv) && lv >= 0 ? lv : 0; }
        if (c) { var cv = parseFloat(c.value); state.contractedRate = isFinite(cv) && cv >= 0 ? cv : 0; }
    }

    // ------------------------------------------------------------ export (CSV, dependency-free)
    function downloadBlob(text, filename) {
        var blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    }
    function csvCell(v) {
        var s = String(v == null ? '' : v);
        if (/[",\r\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
        return s;
    }
    function toCsv(rows) { return rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'); }
    function demoSuffix() { return state.demoActive ? '-DEMO' : ''; }
    function exportUnitCsv() {
        if (!state.users.length) { alert('Load data first.'); return; }
        var m = compute();
        var dim = activeDim(m);
        var basis = state.capBasis, rate = state.contractedRate, isD = basis === 'dollars';
        var rows = [['Chargeback unit (' + dim.label + ')', 'Users', 'Consumed credits', 'Consumed $', 'Showback $', 'Chargeback $', (isD ? 'Budget cap ($)' : 'Budget cap (credits)'), (isD ? 'Variance ($)' : 'Variance (credits)'), 'Status']];
        dim.groups.forEach(function (g) {
            var f = costFigures(g.credits, g.overage);
            var capVal, variance, util, capOut, varOut;
            if (isD) {
                capVal = toNumber(capFor('dollars', dim.key, g.label, g.limit * rate));
                variance = f.effectiveCost - capVal;
                util = capVal > 0 ? f.effectiveCost / capVal : 0;
                capOut = capVal.toFixed(2); varOut = variance.toFixed(2);
            } else {
                capVal = toNumber(capFor('credits', dim.key, g.label, g.limit));
                variance = g.credits - capVal;
                util = capVal > 0 ? g.credits / capVal : 0;
                capOut = Math.round(capVal); varOut = Math.round(variance);
            }
            var status = util > 1 ? 'Over' : (util >= 0.85 ? 'Near' : 'Under');
            rows.push([g.label, g.users, Math.round(g.credits), f.effectiveCost.toFixed(2), f.showback.toFixed(2), f.chargeback.toFixed(2), capOut, varOut, status]);
        });
        if (state.demoActive) rows.unshift(['SYNTHETIC DEMO DATA - not for real decisions']);
        downloadBlob(toCsv(rows), 'cowork-chargeback-by-' + dim.key + demoSuffix() + '.csv');
    }
    function exportUserCsv() {
        if (!state.users.length) { alert('Load data first.'); return; }
        var m = compute();
        var dim = activeDim(m);
        var basis = state.capBasis, rate = state.contractedRate, isD = basis === 'dollars';
        var rows = [['User Principal Name', 'Display Name', 'Department', 'Cost Center', 'Business Unit', 'Credits Used', 'Allowance', 'Utilization %', 'Flag', 'Right-size tier', 'Showback $', 'Chargeback $', (isD ? 'Unit budget cap ($)' : 'Unit budget cap (credits)')]];
        m.users.forEach(function (u) {
            var f = costFigures(u.used, u.overage);
            var unitLabel = (u[dim.key] && String(u[dim.key]).trim()) ? String(u[dim.key]).trim() : 'Unknown';
            var groupAllow = 0;
            dim.groups.forEach(function (g) { if (g.label === unitLabel) groupAllow = g.limit; });
            var capOut;
            if (isD) { capOut = toNumber(capFor('dollars', dim.key, unitLabel, groupAllow * rate)).toFixed(2); }
            else { capOut = Math.round(toNumber(capFor('credits', dim.key, unitLabel, groupAllow))); }
            rows.push([u.upn, u.displayName, u.department, u.costCenter, u.businessUnit, Math.round(u.used), Math.round(u.limit), (u.util * 100).toFixed(1), u.flag, policyName(u.recommended), f.showback.toFixed(2), f.chargeback.toFixed(2), capOut]);
        });
        if (state.demoActive) rows.unshift(['SYNTHETIC DEMO DATA - not for real decisions']);
        downloadBlob(toCsv(rows), 'cowork-chargeback-by-user' + demoSuffix() + '.csv');
    }

    // ------------------------------------------------------------ deck + PDF export
    function exportDeck() {
        if (!window.PptxGenJS) { alert('PPTX library not loaded.'); return; }
        if (!state.users.length) { alert('Load data first.'); return; }
        var m = compute();
        var dim = activeDim(m);
        var pptx = new window.PptxGenJS();
        pptx.defineLayout({ name: 'W', width: 13.33, height: 7.5 });
        pptx.layout = 'W';
        var BG = '0B1120', SURF = '1E293B', BLUE = '4A9EF7', CYAN = '00D4FF', TXT = 'F1F5F9', SUB = '94A3B8';
        var demoNote = state.demoActive ? '  |  SYNTHETIC DEMO DATA' : '';
        function bg(s) { s.background = { color: BG }; }

        var s1 = pptx.addSlide(); bg(s1);
        s1.addText('Copilot Cowork Credit - FinOps Cost Report', { x: 0.7, y: 2.2, w: 12, h: 1, fontFace: 'Segoe UI', fontSize: 38, bold: true, color: CYAN });
        s1.addText('Billed cost ' + fmtMoney(m.orgCost.billedCost) + '  |  Chargeback (overage) ' + fmtMoney(m.orgCost.chargeback), { x: 0.7, y: 3.3, w: 12, h: 0.6, fontFace: 'Segoe UI', fontSize: 20, color: TXT });
        s1.addText(new Date().toLocaleDateString() + demoNote, { x: 0.7, y: 4.1, w: 12, h: 0.5, fontFace: 'Segoe UI', fontSize: 14, color: SUB });

        var s2 = pptx.addSlide(); bg(s2);
        s2.addText('FOCUS Cost Summary', { x: 0.7, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: BLUE, fontFace: 'Segoe UI' });
        var kpis = [
            ['List cost', fmtMoney(m.orgCost.listCost)],
            ['Effective cost', fmtMoney(m.orgCost.effectiveCost)],
            ['Billed cost', fmtMoney(m.orgCost.billedCost)],
            ['Effective savings rate', fmtPct(m.orgCost.esr)],
            ['Allocation coverage', fmtPct(m.allocationCoverage)],
            ['Users in scope', fmtInt(m.org.users)]
        ];
        kpis.forEach(function (k, i) {
            var x = 0.7 + (i % 3) * 4.2, y = 1.5 + Math.floor(i / 3) * 1.9;
            s2.addShape(pptx.ShapeType.roundRect, { x: x, y: y, w: 3.9, h: 1.6, fill: { color: SURF }, line: { color: BLUE, width: 0.5 }, rectRadius: 0.1 });
            s2.addText(k[0], { x: x + 0.2, y: y + 0.15, w: 3.5, h: 0.4, fontSize: 12, color: SUB, fontFace: 'Segoe UI' });
            s2.addText(k[1], { x: x + 0.2, y: y + 0.6, w: 3.5, h: 0.7, fontSize: 24, bold: true, color: CYAN, fontFace: 'Segoe UI' });
        });

        var s3 = pptx.addSlide(); bg(s3);
        s3.addText('Chargeback by ' + dim.label, { x: 0.7, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: BLUE, fontFace: 'Segoe UI' });
        var topN = dim.groups.slice(0, 10);
        s3.addChart(pptx.ChartType.bar, [{ name: 'Chargeback', labels: topN.map(function (g) { return g.label; }), values: topN.map(function (g) { return Math.round(costFigures(g.credits, g.overage).chargeback * 100) / 100; }) }],
            { x: 0.7, y: 1.3, w: 12, h: 5.6, barDir: 'bar', showValue: true, chartColors: [CYAN], catAxisLabelColor: TXT, valAxisLabelColor: SUB, dataLabelColor: TXT, showLegend: false, valAxisLabelFormatCode: '$#,##0' });

        var s4 = pptx.addSlide(); bg(s4);
        s4.addText(dim.label + ' Allocation (top 12)', { x: 0.7, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: BLUE, fontFace: 'Segoe UI' });
        var trows = [[
            { text: dim.label, options: { bold: true, color: BLUE } }, { text: 'Users', options: { bold: true, color: BLUE } },
            { text: 'Consumed', options: { bold: true, color: BLUE } }, { text: 'Showback $', options: { bold: true, color: BLUE } },
            { text: 'Chargeback $', options: { bold: true, color: BLUE } }
        ]];
        dim.groups.slice(0, 12).forEach(function (g) {
            var f = costFigures(g.credits, g.overage);
            trows.push([g.label, fmtInt(g.users), fmtInt(g.credits), fmtMoney(f.showback), fmtMoney(f.chargeback)]);
        });
        s4.addTable(trows, { x: 0.7, y: 1.4, w: 12, color: TXT, fontFace: 'Segoe UI', fontSize: 12, border: { type: 'solid', color: '334155', pt: 0.5 }, fill: { color: SURF } });

        var s5 = pptx.addSlide(); bg(s5);
        s5.addText('Methodology & Notes', { x: 0.7, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: BLUE, fontFace: 'Segoe UI' });
        var method = [
            'FOCUS-aligned: List / Contracted / Effective / Billed cost.',
            'Contracted rate: ' + fmtMoney(state.contractedRate) + ' per credit (adjustable).',
            'Showback = full effective cost of consumption per unit.',
            'Chargeback = over-allowance credits x contracted rate.',
            'Allocation by ' + dim.label + '; coverage = share of effective cost mapped to a named unit.',
            'Single-month snapshot; no amortization, forecast, or anomaly detection.',
            (state.demoActive ? 'SYNTHETIC DEMO DATA - not for real decisions.' : 'Computed locally in-browser from your uploaded files.')
        ];
        s5.addText(method.map(function (mm) { return { text: mm, options: { bullet: true, color: TXT, fontSize: 16, fontFace: 'Segoe UI', paraSpaceAfter: 8 } }; }), { x: 0.9, y: 1.5, w: 11.5, h: 5 });

        pptx.writeFile({ fileName: 'Cowork_FinOps_Report' + (state.demoActive ? '_DEMO' : '') + '.pptx' });
    }

    function exportPdf() {
        if (!window.jspdf || !window.html2canvas) { alert('PDF library not loaded.'); return; }
        if (!state.users.length) { alert('Load data first.'); return; }
        var el = $('finopsReport');
        if (!el) { alert('Nothing to export yet.'); return; }
        var demo = state.demoActive;
        window.html2canvas(el, { backgroundColor: '#0B1120', scale: 2, useCORS: true }).then(function (canvas) {
            var jsPDF = window.jspdf.jsPDF;
            var pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            var pw = pdf.internal.pageSize.getWidth();
            var ph = pdf.internal.pageSize.getHeight();
            var imgH = canvas.height * (pw / canvas.width);
            var img = canvas.toDataURL('image/png');
            var page = 0, drawn = 0;
            while (drawn < imgH) {
                if (page > 0) pdf.addPage();
                pdf.addImage(img, 'PNG', 0, -(page * ph), pw, imgH);
                drawn += ph;
                page += 1;
            }
            pdf.save('Cowork_FinOps_Report' + (demo ? '_DEMO' : '') + '.pdf');
        }).catch(function () { alert('PDF export failed.'); });
    }

    // ------------------------------------------------------------ data loading
    function showError(msg) {
        var e = $('finopsLandingError');
        if (!e) { alert(msg); return; }
        e.textContent = msg; e.hidden = false;
    }

    function readFile(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function () { resolve(String(reader.result)); };
            reader.onerror = function () { reject(new Error('Could not read file')); };
            reader.readAsText(file);
        });
    }

    function wireDropzone(dzId, inputId, statusId, which) {
        var dz = $(dzId), input = $(inputId), status = $(statusId);
        if (!dz || !input || !status) return;
        dz.addEventListener('click', function () { input.click(); });
        dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', function () { dz.classList.remove('dragover'); });
        dz.addEventListener('drop', function (e) {
            e.preventDefault(); dz.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], dz, status, which);
        });
        input.addEventListener('change', function () { if (input.files[0]) handleFile(input.files[0], dz, status, which); });
    }

    function handleFile(file, dz, status, which) {
        var err = $('finopsLandingError'); if (err) err.hidden = true;
        readFile(file).then(function (text) {
            state.pending[which] = parseCSV(text);
            status.textContent = file.name + ' - ' + fmtInt(state.pending[which].length) + ' rows';
            dz.classList.add('loaded');
            var gen = $('btnGenerateF');
            if (gen) gen.disabled = !(state.pending.entra && state.pending.credits);
        }).catch(function () { showError('Failed to read ' + file.name); });
    }

    function startFrom(entraRows, creditRows, demo) {
        state.demoActive = !!demo;
        var fb = $('fallbackLimitF');
        if (fb) { var fbv = parseFloat(fb.value); state.fallbackLimit = isFinite(fbv) && fbv > 0 ? fbv : 400; }
        state.users = buildUsers(entraRows, creditRows);
        if (!state.users.length) { showError('No users could be built from these files. Check that the credit file has a user principal name column.'); return; }
        showReport();
    }

    function showReport() {
        var landing = $('finopsLanding'), report = $('finopsReport');
        if (landing) landing.hidden = true;
        if (report) report.hidden = false;
        var banner = $('finopsDemoBanner'); if (banner) banner.hidden = !state.demoActive;
        var badge = $('badgeMode');
        if (badge) badge.innerHTML = state.demoActive ? 'Synthetic &middot; demo data' : 'Your data &middot; single-month snapshot';
        var foot = $('finopsFooter');
        if (foot) foot.innerHTML = state.demoActive
            ? 'Synthetic data &middot; 100% client-side &middot; <a href="PRIVACY.md">Privacy</a> &middot; <a href="../../cowork-billing/" target="_top">Cowork Billing hub</a> &middot; v1.1'
            : '100% client-side &middot; your files never leave your browser &middot; <a href="PRIVACY.md">Privacy</a> &middot; <a href="../../cowork-billing/" target="_top">Cowork Billing hub</a> &middot; v1.1';
        readRates();
        render();
        window.scrollTo(0, 0);
    }

    function loadDemo() {
        if (!window.DEMO_ENTRA_CSV || !window.DEMO_CREDITS_CSV) { showError('Demo data not available.'); return; }
        startFrom(parseCSV(window.DEMO_ENTRA_CSV), parseCSV(window.DEMO_CREDITS_CSV), true);
    }

    function resetToLanding() {
        state.pending = { entra: null, credits: null };
        state.users = []; state.demoActive = false;
        state.capBasis = 'credits';
        state.unitCaps = { credits: { department: {}, costCenter: {}, businessUnit: {} }, dollars: { department: {}, costCenter: {}, businessUnit: {} } };
        var report = $('finopsReport'), landing = $('finopsLanding');
        if (report) report.hidden = true;
        if (landing) landing.hidden = false;
        ['statusEntraF', 'statusCreditsF'].forEach(function (id) { var s = $(id); if (s) s.textContent = 'No file selected'; });
        ['dzEntraF', 'dzCreditsF'].forEach(function (id) { var d = $(id); if (d) d.classList.remove('loaded'); });
        ['fileEntraF', 'fileCreditsF'].forEach(function (id) { var f = $(id); if (f) f.value = ''; });
        var gen = $('btnGenerateF'); if (gen) gen.disabled = true;
        var err = $('finopsLandingError'); if (err) err.hidden = true;
        window.scrollTo(0, 0);
    }

    function init() {
        wireDropzone('dzEntraF', 'fileEntraF', 'statusEntraF', 'entra');
        wireDropzone('dzCreditsF', 'fileCreditsF', 'statusCreditsF', 'credits');

        var gen = $('btnGenerateF');
        if (gen) gen.addEventListener('click', function () {
            if (state.pending.entra && state.pending.credits) startFrom(state.pending.entra, state.pending.credits, false);
        });
        var demoBtn = $('btnDemoF'); if (demoBtn) demoBtn.addEventListener('click', loadDemo);
        var resetBtn = $('btnResetF'); if (resetBtn) resetBtn.addEventListener('click', resetToLanding);

        // Live rate controls (inside the report; wired once).
        var l = $('rateList'), c = $('rateContracted');
        if (l) l.addEventListener('input', function () { readRates(); render(); });
        if (c) c.addEventListener('input', function () { readRates(); render(); });

        // Delegate the allocation dimension toggle (buttons re-render on click).
        var body = $('finopsBody');
        if (body) body.addEventListener('click', function (ev) {
            var btn = ev.target.closest ? ev.target.closest('.dim-btn') : null;
            if (!btn) return;
            if (btn.getAttribute('data-dim')) { state.allocDim = btn.getAttribute('data-dim'); render(); return; }
            if (btn.getAttribute('data-basis')) { state.capBasis = btn.getAttribute('data-basis'); render(); return; }
        });
        if (body) body.addEventListener('change', function (ev) {
            var inp = ev.target;
            if (inp && inp.classList && inp.classList.contains('cap-input')) {
                var basis = inp.getAttribute('data-basis') || 'credits';
                var dk = inp.getAttribute('data-dim'), lbl = inp.getAttribute('data-label');
                var val = parseFloat(inp.value);
                if (!state.unitCaps[basis]) state.unitCaps[basis] = {};
                if (!state.unitCaps[basis][dk]) state.unitCaps[basis][dk] = {};
                state.unitCaps[basis][dk][lbl] = isFinite(val) && val >= 0 ? val : 0;
                render();
            }
        });
        var exUnit = $('btnExportUnitF'); if (exUnit) exUnit.addEventListener('click', exportUnitCsv);
        var exUser = $('btnExportUserF'); if (exUser) exUser.addEventListener('click', exportUserCsv);
        var exDeck = $('btnExportDeckF'); if (exDeck) exDeck.addEventListener('click', exportDeck);
        var exPdf = $('btnExportPdfF'); if (exPdf) exPdf.addEventListener('click', exportPdf);

        // Deep-link / embed convenience: ?demo=1 opens straight into the demo report.
        if (/[?&]demo=1\b/.test(location.search)) loadDemo();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
