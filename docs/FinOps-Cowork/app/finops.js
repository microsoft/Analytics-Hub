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

    // (E) Budget vs actual (variance) per department.
    function sectionVariance(m) {
        function statusOf(util) {
            if (util > 1) return { cls: 'cell-over', txt: 'Over', scls: 'status-over' };
            if (util >= 0.85) return { cls: 'cell-near', txt: 'Near', scls: 'status-near' };
            return { cls: 'cell-under', txt: 'Under', scls: 'status-under' };
        }
        var head = '<thead><tr>' +
            '<th>Department</th>' +
            '<th class="num">Allowance (credits)</th>' +
            '<th class="num">Consumed (credits)</th>' +
            '<th class="num">Variance (credits)</th>' +
            '<th class="num">Variance %</th>' +
            '<th>Status</th></tr></thead>';
        var body = '<tbody>' + m.byDept.map(function (g) {
            var util = g.limit > 0 ? g.credits / g.limit : 0;
            var variance = g.credits - g.limit;
            var s = statusOf(util);
            return '<tr>' +
                '<td>' + esc(g.label) + '</td>' +
                '<td class="num">' + fmtInt(g.limit) + '</td>' +
                '<td class="num">' + fmtInt(g.credits) + '</td>' +
                '<td class="num">' + (variance >= 0 ? '+' : '') + fmtInt(variance) + '</td>' +
                '<td class="num">' + fmtPct(g.limit > 0 ? variance / g.limit : 0) + '</td>' +
                '<td class="' + s.cls + '"><span class="' + s.scls + '">' + esc(s.txt) + '</span></td></tr>';
        }).join('') + '</tbody>';
        return '<section class="panel"><h3>Budget vs actual (variance) &mdash; by Department</h3>' +
            '<div class="table-wrap"><table>' + head + body + '</table></div>' +
            '<p class="section-caption">Allowance is the sum of per-user monthly credit limits. ' +
            'Status: Over (utilization &gt; 100%), Near (&ge; 85%), Under.</p></section>';
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
            ['Quantify', 'Budgeting', 'partial', 'allowance vs actual variance; static, no period budget'],
            ['Quantify', 'Forecasting', 'none', 'snapshot only, by design'],
            ['Quantify', 'Unit Economics', 'partial', 'cost per user/credit; no business-value unit'],
            ['Optimize', 'Rate Optimization', 'partial', 'List/Contracted/Effective + ESR; single rate'],
            ['Optimize', 'Workload Optimization', 'partial', 'unused vs overage reallocation, current month'],
            ['Manage', 'Invoicing & Chargeback', 'strong', 'core purpose; showback->chargeback, RLS'],
            ['Manage', 'Policy & Governance', 'partial', 'allowance policy + reporting segments']
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
            sectionVariance(m) +
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
            ? 'Synthetic data &middot; 100% client-side &middot; <a href="PRIVACY.md">Privacy</a> &middot; <a href="https://microsoft.github.io/CreditUsage/CoworkBilling/" target="_top">Standard report</a> &middot; v1.1'
            : '100% client-side &middot; your files never leave your browser &middot; <a href="PRIVACY.md">Privacy</a> &middot; <a href="https://microsoft.github.io/CreditUsage/CoworkBilling/" target="_top">Standard report</a> &middot; v1.1';
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
            if (btn && btn.getAttribute('data-dim')) { state.allocDim = btn.getAttribute('data-dim'); render(); }
        });

        // Deep-link / embed convenience: ?demo=1 opens straight into the demo report.
        if (/[?&]demo=1\b/.test(location.search)) loadDemo();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
