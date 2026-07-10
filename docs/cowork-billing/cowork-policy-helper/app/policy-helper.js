/* policy-helper.js - Cowork Policy Helper (100% client-side).
   Sibling to app.js / finops.js. Assigns users to spend-tier billing policies
   (monthly credit allowance + access role), recommends a policy from usage,
   and exports assignments to CSV. No frameworks, no network calls. Helpers are
   copied verbatim from app.js so the numbers match the sibling reports. */
(function () {
    'use strict';

    // ------------------------------------------------------------------ state
    var state = {
        pending: { entra: null, credits: null },
        entraRows: [],
        creditRows: [],
        users: [],
        rate: 0.01,
        fallbackLimit: 400,
        usedFallbackLimit: false,
        demoActive: false,
        joinStats: { matched: 0, total: 0 },
        assignments: {}, // upn -> policy id
        selected: {},    // upn -> true when row checkbox is checked
        search: '',
        deptFilter: 'All',
        cohortFilter: 'All',
        growthPct: 0,
        ownedCredits: null,
        packSize: 25000,
        packPrice: 200,
        buyCredits: 0,
        activeTab: 'manager',
        baseline: {},
        prevBaseline: null,
        groupBy: 'individual',
        groupBudgets: {},
        rules: [],
        rulesDefault: 'light'
    };

    var COHORT_ORDER = ['Light', 'Regular', 'Engaged', 'Native', 'Power', 'Frontier'];

    var COHORT_COLORS = {
        Light: '#4A9EF7',
        Regular: '#00D4FF',
        Engaged: '#34D399',
        Native: '#F59E0B',
        Power: '#A855F7',
        Frontier: '#EF4444'
    };

    var TIER_COLORS = {
        unassigned: '#94A3B8',
        light: '#4A9EF7',
        standard: '#00D4FF',
        advanced: '#34D399',
        power: '#A855F7',
        frontier: '#F59E0B'
    };

    // ---------------------------------------------------------- billing policies
    // Ordered set; allowances are editable live via the policy editor.
    var POLICIES = [
        { id: 'unassigned', name: 'Unassigned', role: 'None', allowance: 0 },
        { id: 'light', name: 'Light', role: 'Viewer', allowance: 150 },
        { id: 'standard', name: 'Standard', role: 'Member', allowance: 400 },
        { id: 'advanced', name: 'Advanced', role: 'Member', allowance: 700 },
        { id: 'power', name: 'Power', role: 'Power', allowance: 1200 },
        { id: 'frontier', name: 'Frontier', role: 'Admin', allowance: 2000 }
    ];

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

    // --------------------------------------------------------------- utilities
    function $(id) { return document.getElementById(id); }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function truncate(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + '\u2026' : s; }

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

    // ------------------------------------------------------------ CSV parsing
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

    // --------------------------------------------------------- build + join
    function buildUsers(entraRows, creditRows) {
        var entraMap = resolveColumns(entraRows.length ? Object.keys(entraRows[0]) : []);
        var creditMap = resolveColumns(creditRows.length ? Object.keys(creditRows[0]) : []);

        var byUpn = {};
        entraRows.forEach(function (row) {
            var upn = normUpn(entraMap.upn ? row[entraMap.upn] : '');
            if (!upn) return;
            byUpn[upn] = row;
        });

        state.usedFallbackLimit = !creditMap.creditLimit;

        var users = [];
        var joinMatched = 0, joinTotal = 0;
        creditRows.forEach(function (crow) {
            var upn = normUpn(creditMap.upn ? crow[creditMap.upn] : '');
            if (!upn) return;
            joinTotal += 1;
            if (byUpn[upn]) joinMatched += 1;
            var erow = byUpn[upn] || {};
            var get = function (map, row, field) { return map[field] ? String(row[map[field]] || '').trim() : ''; };

            var limit = creditMap.creditLimit ? toNumber(crow[creditMap.creditLimit]) : state.fallbackLimit;
            if (!creditMap.creditLimit || limit <= 0 && !creditMap.creditLimit) limit = state.fallbackLimit;

            users.push({
                upn: upn,
                displayName: get(creditMap, crow, 'displayName') || get(entraMap, erow, 'displayName') || upn,
                department: get(entraMap, erow, 'department') || 'Unknown',
                jobTitle: get(entraMap, erow, 'jobTitle') || '',
                jobFamily: get(entraMap, erow, 'jobFamily') || '',
                costCenter: get(entraMap, erow, 'costCenter') || '',
                businessUnit: get(entraMap, erow, 'businessUnit') || '',
                country: get(entraMap, erow, 'country') || '',
                manager: get(entraMap, erow, 'manager') || '',
                used: creditMap.creditsUsed ? toNumber(crow[creditMap.creditsUsed]) : 0,
                limit: limit,
                licensed: creditMap.license ? toBool(crow[creditMap.license]) : false
            });
        });
        state.joinStats = { matched: joinMatched, total: joinTotal };
        return users;
    }

    // ------------------------------------------------------------- compute
    function cohortForP(p) {
        if (p <= 0.50) return 'Light';
        if (p <= 0.75) return 'Regular';
        if (p <= 0.90) return 'Engaged';
        if (p <= 0.95) return 'Native';
        if (p <= 0.99) return 'Power';
        return 'Frontier';
    }

    function computePerUser() {
        var users = state.users;
        var n = users.length || 1;
        var sorted = users.slice().sort(function (a, b) { return a.used - b.used; });
        sorted.forEach(function (u, i) { u.cohort = cohortForP((i + 1) / n); });
    }

    // Consumption fit: smallest non-zero tier whose allowance covers current usage.
    function recommendPolicy(u) {
        if (!u.licensed || u.used <= 0) return 'unassigned';
        var ordered = POLICIES.filter(function (p) { return p.allowance > 0; })
            .slice().sort(function (a, b) { return a.allowance - b.allowance; });
        for (var i = 0; i < ordered.length; i++) {
            if (ordered[i].allowance >= u.used) return ordered[i].id;
        }
        return ordered.length ? ordered[ordered.length - 1].id : 'unassigned';
    }

    function recomputeRecommendations() {
        state.users.forEach(function (u) { u.recommended = recommendPolicy(u); });
    }

    // Baseline "current" policy from the user's existing monthly credit limit
    // (nearest non-zero tier). Used as the initial, non-auto-adjusted assignment.
    function currentPolicy(u) {
        if (!u.licensed || !(u.limit > 0)) return 'unassigned';
        var ordered = POLICIES.filter(function (p) { return p.allowance > 0; });
        if (!ordered.length) return 'unassigned';
        var best = ordered[0], bestDiff = Infinity;
        for (var i = 0; i < ordered.length; i++) {
            var diff = Math.abs(ordered[i].allowance - u.limit);
            if (diff < bestDiff) { bestDiff = diff; best = ordered[i]; }
        }
        return best.id;
    }

    function policyById(id) {
        for (var i = 0; i < POLICIES.length; i++) { if (POLICIES[i].id === id) return POLICIES[i]; }
        return POLICIES[0];
    }

    // Derived per-user values from the current assignment + editable allowances.
    function derive(u) {
        var pid = state.assignments[u.upn] || 'unassigned';
        var pol = policyById(pid);
        var allowance = pol.allowance;
        var util = allowance > 0 ? u.used / allowance : 0;
        var fit;
        if (u.used > allowance) fit = 'Over-allowance';
        else if (allowance > 0 && u.used < allowance * 0.4) fit = 'Over-provisioned';
        else fit = 'OK';
        return { pid: pid, pol: pol, allowance: allowance, util: util, fit: fit, cost: allowance * state.rate };
    }

    function utilClass(util) { return util > 1 ? 'cell-over' : (util >= 0.85 ? 'cell-near' : 'cell-under'); }
    function fitClass(fit) { return fit === 'Over-allowance' ? 'status-over' : (fit === 'Over-provisioned' ? 'status-near' : 'status-under'); }

    // ----------------------------------------------------------- filtering
    function filteredUsers() {
        var q = state.search.toLowerCase();
        var dep = state.deptFilter;
        var coh = state.cohortFilter;
        return state.users.filter(function (u) {
            if (q && (u.displayName + ' ' + u.upn).toLowerCase().indexOf(q) === -1) return false;
            if (dep !== 'All' && (u.department || 'Unknown') !== dep) return false;
            if (coh !== 'All' && u.cohort !== coh) return false;
            return true;
        });
    }

    // ------------------------------------------------------------- rendering
    function metricCard(label, value, sub, accent, tip) {
        var info = tip ? '<span class="metric-info" tabindex="0" aria-label="' + esc(tip) +
            '">?<span class="metric-tip">' + esc(tip) + '</span></span>' : '';
        return '<div class="metric-card ' + (accent || '') + '"><div class="metric-label">' +
            esc(label) + info + '</div><div class="metric-value">' + esc(value) + '</div>' +
            (sub ? '<div class="metric-sublabel">' + esc(sub) + '</div>' : '') + '</div>';
    }

    function renderSummary() {
        var users = state.users;
        var rate = state.rate;
        var totalUsers = users.length;
        var needReview = 0, totalUsed = 0, totalAllowance = 0, totalCost = 0;

        // Per-policy accumulators.
        var pol = {};
        POLICIES.forEach(function (p) { pol[p.id] = { users: 0, used: 0, allowance: 0, cost: 0 }; });

        users.forEach(function (u) {
            var d = derive(u);
            if (d.fit === 'Over-allowance') needReview += 1;
            totalUsed += u.used;
            totalAllowance += d.allowance;
            totalCost += d.cost;
            var acc = pol[d.pid] || (pol[d.pid] = { users: 0, used: 0, allowance: 0, cost: 0 });
            acc.users += 1;
            acc.used += u.used;
            acc.allowance += d.allowance;
            acc.cost += d.cost;
        });

        var avgUtil = totalAllowance > 0 ? totalUsed / totalAllowance : 0;

        var head = '<div class="metrics-grid">' +
            metricCard('Total Users', fmtInt(totalUsers), 'in scope', '',
                'Distinct users joined from the Entra + credit exports.') +
            metricCard('Users Needing Review', fmtInt(needReview), 'over their allowance', 'accent-red',
                'Count of users whose monthly credits used exceed their assigned policy allowance (fit = Over-allowance).') +
            metricCard('Projected Monthly Cost', fmtMoney(totalCost), 'committed allowance', '',
                'Sum over users of assigned allowance x rate (' + fmtMoney(rate) + '/credit). Cost of committed allowance, not usage.') +
            metricCard('Avg Utilization', fmtPct(avgUtil), fmtInt(totalUsed) + ' / ' + fmtInt(totalAllowance), 'accent-amber',
                'Total credits used / total assigned allowance across all users.') +
            '</div>';

        var cards = POLICIES.map(function (p) {
            var acc = pol[p.id];
            var u = acc.allowance > 0 ? acc.used / acc.allowance : 0;
            return metricCard(p.name + ' (' + p.role + ')', fmtInt(acc.users) + ' users',
                fmtInt(acc.allowance) + ' cr - ' + fmtMoney(acc.cost) + ' - ' + fmtPct(u) + ' util', '',
                'Policy ' + p.name + ': allowance ' + fmtInt(p.allowance) + ' cr/user, role ' + p.role + '. ' +
                'Total allowance = users x allowance. Projected cost = allowance x rate x users (' + fmtMoney(rate) +
                '/credit). Avg utilization = sum used / sum allowance among assigned users.');
        }).join('');

        $('summaryHead').innerHTML = head;
        $('policyCards').innerHTML = '<div class="metrics-grid">' + cards + '</div>';
    }

    function growthFrac() {
        var g = state.growthPct / 100;
        if (!isFinite(g)) g = 0;
        if (g < -1) g = -1;
        return g;
    }

    function computeForecast() {
        var g = growthFrac();
        var rate = state.rate;
        var curUsed = 0, fcUsed = 0, provAllow = 0, over = 0;
        state.users.forEach(function (u) {
            var d = derive(u);
            var f = u.used * (1 + g);
            curUsed += u.used;
            fcUsed += f;
            provAllow += d.allowance;
            if (f > d.allowance) over += 1;
        });
        return {
            g: g, curUsed: curUsed, fcUsed: fcUsed, fcCost: fcUsed * rate,
            provAllow: provAllow, provBudget: provAllow * rate,
            headroom: provAllow - fcUsed, over: over
        };
    }

    function renderForecast() {
        var f = computeForecast();
        var rate = state.rate;
        var gTxt = (state.growthPct >= 0 ? '+' : '') + fmtNum2(state.growthPct) + '%';
        var headClass = f.headroom < 0 ? 'accent-red' : '';
        var cards = '<div class="metrics-grid">' +
            metricCard('Forecast Consumption', fmtInt(f.fcUsed) + ' cr', 'next month at ' + gTxt + ' growth', '',
                'Anticipated credits consumed next month = sum over all users of current credits used x (1 + growth). Current total ' + fmtInt(f.curUsed) + ' cr, growth ' + gTxt + '.') +
            metricCard('Forecast Cost', fmtMoney(f.fcCost), 'expected spend', '',
                'Forecast consumption x rate (' + fmtMoney(rate) + '/credit). Your expected actual spend next month.') +
            metricCard('Provisioned Allowance', fmtInt(f.provAllow) + ' cr', 'budgeted capacity', '',
                'Sum of the monthly allowance of every user assigned tier. The capacity you are budgeting for.') +
            metricCard('Provisioned Budget', fmtMoney(f.provBudget), 'committed budget', '',
                'Provisioned allowance x rate (' + fmtMoney(rate) + '/credit). The budget you commit if every user uses their full tier allowance.') +
            metricCard('Headroom vs Forecast', fmtInt(f.headroom) + ' cr', (f.headroom < 0 ? 'under-provisioned' : 'spare capacity'), headClass,
                'Provisioned allowance minus forecast consumption. Negative means projected usage exceeds the capacity you have provisioned.') +
            metricCard('Users Over Tier (forecast)', fmtInt(f.over), 'exceed their allowance', (f.over > 0 ? 'accent-red' : ''),
                'Count of users whose forecast next-month usage exceeds their assigned tier allowance.') +
            '</div>';
        $('forecastCards').innerHTML = cards;
    }

    // Impact of current assignments vs the load-time baseline (state.baseline).
    function computeImpact() {
        var rate = state.rate;
        var baseAllow = 0, curAllow = 0, used = 0, changed = 0;
        state.users.forEach(function (u) {
            var bid = state.baseline[u.upn] || 'unassigned';
            var cid = state.assignments[u.upn] || 'unassigned';
            baseAllow += policyById(bid).allowance;
            curAllow += derive(u).allowance;
            used += u.used;
            if (bid !== cid) changed += 1;
        });
        return {
            rate: rate, used: used,
            baseAllow: baseAllow, baseUnused: baseAllow - used, baseCost: baseAllow * rate,
            baseUtil: baseAllow > 0 ? used / baseAllow : 0,
            curAllow: curAllow, curUnused: curAllow - used, curCost: curAllow * rate,
            curUtil: curAllow > 0 ? used / curAllow : 0,
            dAllow: curAllow - baseAllow, dCost: (curAllow - baseAllow) * rate,
            changed: changed
        };
    }

    function impactStat(k, v, sub, cls) {
        return '<div class="impact-stat' + (cls ? ' ' + cls : '') + '"><div class="k">' + k +
            '</div><div class="v">' + v + '</div>' + (sub ? '<div class="s">' + sub + '</div>' : '') + '</div>';
    }

    function signedCr(v) {
        if (v === 0) return 'no net change vs today';
        return '<strong>' + (v > 0 ? '+' : '-') + fmtInt(Math.abs(v)) + ' cr</strong> vs today';
    }
    function signedMoney(v, suffix) {
        if (v === 0) return 'no change vs today';
        return '<strong>' + (v > 0 ? '+' : '-') + fmtMoney(Math.abs(v)) + (suffix || '') + '</strong> vs today';
    }

    function impactGroup(cls, title, allow, used, unused, cost, util, allowSub, unusedSub, costSub, unusedCls) {
        return '<div class="impact-group ' + cls + '">' +
            '<div class="impact-title">' + title + '</div>' +
            '<div class="impact-stats">' +
            impactStat('Credits allotted', fmtInt(allow) + ' cr', allowSub) +
            impactStat('Credits consumed', fmtInt(used) + ' cr', fmtPct(util) + ' of allotment') +
            impactStat('Unused credits', fmtInt(unused) + ' cr', unusedSub, unusedCls) +
            impactStat('Committed cost', fmtMoney(cost) + '/mo', costSub) +
            '</div></div>';
    }

    function unusedSubText(unused, rate) {
        return unused < 0
            ? 'over allotment by ' + fmtMoney(Math.abs(unused * rate))
            : fmtMoney(unused * rate) + ' idle';
    }

    var APPLY_CONFIRM_USERS = 1000;
    var APPLY_CONFIRM_COST = 10000;

    function copyMap(m) {
        var o = {};
        for (var k in m) { if (Object.prototype.hasOwnProperty.call(m, k)) o[k] = m[k]; }
        return o;
    }

    function applyRow(im) {
        var up = im.dAllow > 0;
        var note = 'Nothing is committed until you apply. Applying makes this your new baseline (' +
            (up ? '+' : '-') + fmtMoney(Math.abs(im.dCost)) + '/mo for ' +
            fmtInt(im.changed) + ' user' + (im.changed === 1 ? '' : 's') + ').';
        return '<div class="impact-actions">' +
            '<button type="button" class="btn-secondary btn-apply" data-action="apply">Apply changes</button>' +
            '<button type="button" class="btn-secondary btn-danger" data-action="discard">Discard changes</button>' +
            '<span class="impact-actions-note">' + note + '</span>' +
            '</div>';
    }

    function undoRow() {
        if (!state.prevBaseline) return '';
        return '<div class="impact-actions">' +
            '<button type="button" class="btn-secondary" data-action="undo">Undo last apply</button>' +
            '<span class="impact-actions-note">These tiers are your committed baseline. Undo restores the tiers from before you applied.</span>' +
            '</div>';
    }

    function applyChanges() {
        var im = computeImpact();
        if (im.changed === 0) return;
        if (im.changed > APPLY_CONFIRM_USERS || Math.abs(im.dCost) > APPLY_CONFIRM_COST) {
            var msg = 'Apply tier changes for ' + fmtInt(im.changed) + ' user' + (im.changed === 1 ? '' : 's') +
                '?\n\nCommitted cost changes by ' + (im.dCost >= 0 ? '+' : '-') + fmtMoney(Math.abs(im.dCost)) +
                '/mo and this becomes your new baseline.';
            if (!window.confirm(msg)) return;
        }
        state.prevBaseline = copyMap(state.baseline);
        state.baseline = copyMap(state.assignments);
        refreshAll();
    }

    function discardChanges() {
        state.assignments = copyMap(state.baseline);
        refreshAll();
    }

    function undoApply() {
        if (!state.prevBaseline) return;
        state.baseline = copyMap(state.prevBaseline);
        state.assignments = copyMap(state.prevBaseline);
        state.prevBaseline = null;
        refreshAll();
    }

    function renderImpact() {
        var el = $('changeImpact');
        if (!el) return;
        var im = computeImpact();
        var changed = im.changed > 0;

        var today = impactGroup(
            'impact-today', 'Where you stand today',
            im.baseAllow, im.used, im.baseUnused, im.baseCost, im.baseUtil,
            'current tiers', unusedSubText(im.baseUnused, im.rate), 'committed if fully used',
            im.baseUnused < 0 ? 'stat-warn' : '');

        if (!changed) {
            el.className = 'impact-bar impact-neutral';
            el.innerHTML = today + undoRow();
            return;
        }

        var up = im.dAllow > 0;
        var after = impactGroup(
            up ? 'impact-up' : 'impact-down',
            'After your changes &middot; ' + fmtInt(im.changed) + ' user' + (im.changed === 1 ? '' : 's') + ' re-tiered',
            im.curAllow, im.used, im.curUnused, im.curCost, im.curUtil,
            signedCr(im.dAllow), signedCr(im.curUnused - im.baseUnused), signedMoney(im.dCost, '/mo') + ' going forward',
            im.curUnused < 0 ? 'stat-warn' : '');

        el.className = 'impact-bar impact-compare';
        el.innerHTML = today + '<div class="impact-arrow">&darr;</div>' + after + applyRow(im);
    }

    // -------------------------------------------------------- budget + pricing
    function totalUsed() { var s = 0; state.users.forEach(function (u) { s += u.used; }); return s; }
    function totalProvisioned() { var s = 0; state.users.forEach(function (u) { s += derive(u).allowance; }); return s; }
    function ownedCreditsVal() { return state.ownedCredits != null ? state.ownedCredits : totalProvisioned(); }
    function packEffRate() { return state.packSize > 0 ? state.packPrice / state.packSize : 0; }

    function computeBudget() {
        var rate = state.rate;
        var owned = ownedCreditsVal();
        var used = totalUsed();
        var unused = owned - used;
        return {
            owned: owned, used: used, unused: unused,
            budget: owned * rate, spend: used * rate, unusedValue: unused * rate,
            util: owned > 0 ? used / owned : 0
        };
    }

    function computeBuy(credits) {
        var rate = state.rate;
        var paygCost = credits * rate;
        var packs = state.packSize > 0 ? Math.ceil(credits / state.packSize) : 0;
        var packCredits = packs * state.packSize;
        var packCost = packs * state.packPrice;
        var packEff = credits > 0 ? packCost / credits : 0;
        return {
            credits: credits, paygCost: paygCost, packs: packs,
            packCredits: packCredits, packCost: packCost, packEff: packEff,
            packSaving: paygCost - packCost
        };
    }

    function renderPricing() {
        if (!$('budgetCards')) return;
        var b = computeBudget();
        var rate = state.rate;
        var unusedAccent = b.unused < 0 ? 'accent-red' : '';
        $('budgetCards').innerHTML = '<div class="metrics-grid">' +
            metricCard('Credits Owned', fmtInt(b.owned) + ' cr', 'monthly budget capacity', '',
                'Credits you have available this month. Defaults to total provisioned allowance; override it with your real Microsoft figure.') +
            metricCard('Credits Used', fmtInt(b.used) + ' cr', 'actual consumption', '',
                'Total monthly credits consumed across all users, from your usage export.') +
            metricCard('Unused Credits', fmtInt(b.unused) + ' cr', fmtMoney(b.unusedValue) + ' at rate', unusedAccent,
                'Owned minus used. Negative means you consumed more than you own. Value = unused x rate (' + fmtMoney(rate) + '/credit).') +
            metricCard('Committed Budget', fmtMoney(b.budget), 'owned x rate', '',
                'The dollar budget represented by your owned credits at ' + fmtMoney(rate) + '/credit.') +
            metricCard('Current Spend', fmtMoney(b.spend), 'used x rate', '',
                'What your actual consumption costs at ' + fmtMoney(rate) + '/credit.') +
            metricCard('Utilization', fmtPct(b.util), fmtInt(b.used) + ' / ' + fmtInt(b.owned), 'accent-amber',
                'Credits used divided by credits owned. How much of your budget you are consuming.') +
            '</div>';

        var buy = computeBuy(state.buyCredits);
        var saveAccent = buy.packSaving > 0 ? 'accent-green' : '';
        $('buyCards').innerHTML = '<div class="metrics-grid">' +
            metricCard('Pay-as-you-go Cost', fmtMoney(buy.paygCost), fmtInt(buy.credits) + ' cr at ' + fmtMoney(rate), '',
                'Cost to buy ' + fmtInt(buy.credits) + ' credits on the pay-as-you-go meter = credits x list rate (' + fmtMoney(rate) + '/credit).') +
            metricCard('Prepaid Pack Cost', fmtMoney(buy.packCost), buy.packs + ' pack(s) = ' + fmtInt(buy.packCredits) + ' cr', '',
                'Prepaid packs sell in blocks of ' + fmtInt(state.packSize) + ' credits at ' + fmtMoney(state.packPrice) + ' each. Buying ' + fmtInt(buy.credits) + ' credits needs ' + buy.packs + ' pack(s).') +
            metricCard('Effective $/credit (packs)', fmtMoney(buy.credits > 0 ? buy.packEff : 0), 'vs ' + fmtMoney(rate) + ' list', '',
                'Prepaid pack cost divided by the credits you wanted. Lower than list when you use most of a pack.') +
            metricCard('Savings vs Pay-as-you-go', fmtMoney(buy.packSaving), (buy.packSaving >= 0 ? 'packs cheaper' : 'pay-as-you-go cheaper'), saveAccent,
                'Pay-as-you-go cost minus prepaid pack cost for the same purchase. Positive means prepaid packs save money.') +
            '</div>';

        var newOwnedPayg = b.owned + buy.credits;
        var newOwnedPack = b.owned + buy.packCredits;
        $('pricingCompare').innerHTML =
            '<table class="compare-table"><thead><tr>' +
            '<th>Option</th><th>Credits added</th><th>Cost</th><th>Eff $/credit</th><th>New owned</th><th>New unused</th>' +
            '</tr></thead><tbody>' +
            '<tr><td>Pay-as-you-go</td><td>' + fmtInt(buy.credits) + '</td><td>' + fmtMoney(buy.paygCost) + '</td><td>' + fmtMoney(rate) + '</td><td>' + fmtInt(newOwnedPayg) + '</td><td>' + fmtInt(newOwnedPayg - b.used) + '</td></tr>' +
            '<tr><td>Prepaid packs</td><td>' + fmtInt(buy.packCredits) + '</td><td>' + fmtMoney(buy.packCost) + '</td><td>' + (buy.credits > 0 ? fmtMoney(buy.packEff) : '&mdash;') + '</td><td>' + fmtInt(newOwnedPack) + '</td><td>' + fmtInt(newOwnedPack - b.used) + '</td></tr>' +
            '</tbody></table>';

        var f = computeForecast();
        var items = '';
        if (b.unused > 0) {
            items += '<div class="minmax-item warn"><strong>Reclaim before you buy.</strong> You have ' + fmtInt(b.unused) + ' unused credits (' + fmtMoney(b.unusedValue) + ') this month. Right-size over-provisioned users with <strong>Auto-adjust to fit</strong> on the Policy Manager tab before purchasing more.</div>';
        } else if (b.unused < 0) {
            items += '<div class="minmax-item warn"><strong>Over budget now.</strong> Consumption exceeds owned credits by ' + fmtInt(-b.unused) + ' credits (' + fmtMoney(-b.unusedValue) + '). Raise owned credits or reduce usage.</div>';
        }
        var shortfall = f.fcUsed - b.owned;
        if (shortfall > 0) {
            var packsNeeded = state.packSize > 0 ? Math.ceil(shortfall / state.packSize) : 0;
            items += '<div class="minmax-item warn"><strong>Forecast shortfall.</strong> Next month forecast consumption (' + fmtInt(f.fcUsed) + ' cr) exceeds owned budget (' + fmtInt(b.owned) + ' cr) by ' + fmtInt(shortfall) + ' credits. To cover it: ' + fmtMoney(shortfall * rate) + ' pay-as-you-go, or ' + packsNeeded + ' pack(s) at ' + fmtMoney(packsNeeded * state.packPrice) + '.</div>';
        } else {
            items += '<div class="minmax-item ok"><strong>Budget covers forecast.</strong> Owned credits (' + fmtInt(b.owned) + ' cr) cover next month forecast (' + fmtInt(f.fcUsed) + ' cr) with ' + fmtInt(-shortfall) + ' credits to spare. No purchase needed.</div>';
        }
        $('minmaxBox').innerHTML = items;
    }

    function switchTab(name) {
        state.activeTab = name;
        $('tabManager').hidden = name !== 'manager';
        $('tabRules').hidden = name !== 'rules';
        $('tabPricing').hidden = name !== 'pricing';
        $('tabBtnManager').classList.toggle('active', name === 'manager');
        $('tabBtnRules').classList.toggle('active', name === 'rules');
        $('tabBtnPricing').classList.toggle('active', name === 'pricing');
        if (name === 'pricing') renderPricing();
        if (name === 'rules') { renderRules(); renderExceptions(); }
    }

    function renderPolicyEditor() {
        var html = POLICIES.map(function (p) {
            var disabled = p.id === 'unassigned' ? ' disabled' : '';
            var col = TIER_COLORS[p.id] || '#94A3B8';
            return '<div class="pol-edit-item"><label class="pol-edit-label">' +
                '<span class="tier-pill" style="color:' + col + ';border-color:' + col + '">' + esc(p.name) + '</span></label>' +
                '<input type="number" min="0" step="1" class="pol-edit-input" id="polAlw_' + p.id +
                '" data-policy="' + p.id + '" value="' + p.allowance + '"' + disabled + '></div>';
        }).join('');
        $('policyEditor').innerHTML = html;
        Array.prototype.forEach.call($('policyEditor').querySelectorAll('.pol-edit-input'), function (inp) {
            inp.addEventListener('input', function () {
                var id = inp.getAttribute('data-policy');
                var v = parseFloat(inp.value);
                if (!isFinite(v) || v < 0) v = 0;
                policyById(id).allowance = v;
                recomputeRecommendations();
                renderSummary();
                renderRoster();
                renderForecast();
            });
        });
    }

    function cohortChip(name) {
        var color = COHORT_COLORS[name] || '#94A3B8';
        return '<span class="cohort-pill" style="color:' + color + ';border-color:' + color + '">' + esc(name) + '</span>';
    }

    function rosterRow(u) {
        var d = derive(u);
        var checked = state.selected[u.upn] ? ' checked' : '';
        var recName = policyById(u.recommended).name;
        var options = POLICIES.map(function (p) {
            return '<option value="' + p.id + '"' + (p.id === d.pid ? ' selected' : '') + '>' + esc(p.name) + '</option>';
        }).join('');
        return '<tr data-upn="' + esc(u.upn) + '">' +
            '<td class="col-check"><input type="checkbox" class="row-check" data-upn="' + esc(u.upn) + '"' + checked + ' aria-label="Select ' + esc(u.displayName) + '"></td>' +
            '<td>' + esc(truncate(u.displayName, 40)) + '</td>' +
            '<td>' + esc(u.department || 'Unknown') + '</td>' +
            '<td>' + esc(u.jobTitle || '') + '</td>' +
            '<td>' + cohortChip(u.cohort) + '</td>' +
            '<td class="num">' + fmtInt(u.used) + '</td>' +
            '<td>' + esc(recName) + '</td>' +
            '<td><select class="pol-select" data-upn="' + esc(u.upn) + '">' + options + '</select></td>' +
            '<td class="num cell-alw">' + fmtInt(d.allowance) + '</td>' +
            '<td class="cell-role">' + esc(d.pol.role) + '</td>' +
            '<td class="num cell-util ' + utilClass(d.util) + '">' + fmtPct(d.util) + '</td>' +
            '<td class="cell-fit ' + fitClass(d.fit) + '">' + esc(d.fit) + '</td>' +
            '</tr>';
    }

    // ------------------------------------------------------- grouped views
    // The view switcher renders the roster either as the per-user editable
    // table (Individual) or a read-only rollup grouped by department or team.
    // Team is keyed by the user's manager. Editing still happens in Individual.
    function groupKeyOf(u) {
        if (state.groupBy === 'department') return u.department || 'Unknown';
        return u.manager || 'No manager';
    }

    function aggregateGroups() {
        var map = {};
        var order = [];
        filteredUsers().forEach(function (u) {
            var key = groupKeyOf(u);
            var g = map[key];
            if (!g) { g = map[key] = { key: key, users: 0, used: 0, allowance: 0, cost: 0, review: 0 }; order.push(key); }
            var d = derive(u);
            g.users += 1;
            g.used += u.used;
            g.allowance += d.allowance;
            g.cost += d.cost;
            if (d.fit === 'Over-allowance') g.review += 1;
        });
        var arr = order.map(function (k) { return map[k]; });
        arr.sort(function (a, b) { return b.cost - a.cost; });
        return arr;
    }

    function teamLabel(key) {
        if (state.groupBy !== 'team') return key;
        if (key === 'No manager') return key;
        var at = key.indexOf('@');
        return at > 0 ? key.slice(0, at) : key;
    }

    function budgetKeyFor(key) { return state.groupBy + ':' + key; }

    function budgetStatus(cost, budget) {
        if (!(budget > 0)) return { txt: '&mdash;', cls: '' };
        var d = cost - budget;
        if (d > 0) return { txt: '+' + fmtMoney(d) + ' over', cls: 'cell-over' };
        return { txt: fmtMoney(-d) + ' under', cls: 'cell-under' };
    }

    function aggRow(g) {
        var util = g.allowance > 0 ? g.used / g.allowance : 0;
        var reviewCell = g.review > 0
            ? '<td class="num cell-over">' + fmtInt(g.review) + '</td>'
            : '<td class="num">0</td>';
        var budget = state.groupBudgets[budgetKeyFor(g.key)];
        var bval = (budget > 0) ? budget : '';
        var st = budgetStatus(g.cost, (budget > 0) ? budget : 0);
        return '<tr data-key="' + esc(g.key) + '" data-cost="' + g.cost + '">' +
            '<td class="agg-name">' + esc(teamLabel(g.key)) + '</td>' +
            '<td class="num">' + fmtInt(g.users) + '</td>' +
            '<td class="num">' + fmtInt(g.used) + '</td>' +
            '<td class="num">' + fmtInt(g.allowance) + '</td>' +
            '<td class="num cell-util ' + utilClass(util) + '">' + fmtPct(util) + '</td>' +
            '<td class="num">' + fmtMoney(g.cost) + '</td>' +
            reviewCell +
            '<td class="num"><input type="number" class="agg-budget" min="0" step="100" data-key="' + esc(g.key) + '" value="' + bval + '" aria-label="Monthly budget"></td>' +
            '<td class="agg-vs ' + st.cls + '">' + st.txt + '</td>' +
            '<td><button type="button" class="btn-secondary agg-fit" data-key="' + esc(g.key) + '">Auto-fit</button></td>' +
            '</tr>';
    }

    function renderAgg() {
        var label = state.groupBy === 'department' ? 'Department' : 'Team';
        $('aggHead').innerHTML = '<tr>' +
            '<th>' + label + '</th>' +
            '<th class="num">Users</th>' +
            '<th class="num">Credits Used</th>' +
            '<th class="num">Allowance</th>' +
            '<th class="num">Avg Utilization</th>' +
            '<th class="num">Projected Cost</th>' +
            '<th class="num">Needing Review</th>' +
            '<th class="num">Budget ($/mo)</th>' +
            '<th>vs Budget</th>' +
            '<th>Action</th>' +
            '</tr>';
        var groups = aggregateGroups();
        $('aggBody').innerHTML = groups.map(aggRow).join('');
        return groups.length;
    }

    function renderRoster() {
        if (state.groupBy === 'individual') {
            $('rosterTable').hidden = false;
            $('aggTable').hidden = true;
            var rows = filteredUsers();
            $('rosterBody').innerHTML = rows.map(rosterRow).join('');
            $('rosterNote').textContent = 'Showing ' + fmtInt(rows.length) + ' of ' + fmtInt(state.users.length) + ' users.';
            syncSelectAll();
            return;
        }
        $('rosterTable').hidden = true;
        $('aggTable').hidden = false;
        var n = renderAgg();
        var noun = state.groupBy === 'department' ? 'department' : 'team';
        $('rosterNote').textContent = 'Showing ' + fmtInt(n) + ' ' + noun + (n === 1 ? '' : 's') +
            ' across ' + fmtInt(filteredUsers().length) + ' users.';
    }

    function switchView(mode) {
        state.groupBy = mode;
        $('viewIndividual').classList.toggle('active', mode === 'individual');
        $('viewDepartment').classList.toggle('active', mode === 'department');
        $('viewTeam').classList.toggle('active', mode === 'team');
        renderRoster();
    }

    // Update just the derived cells of one row after an assignment change.
    function updateRowDerived(upn) {
        var tr = $('rosterBody').querySelector('tr[data-upn="' + cssEscape(upn) + '"]');
        if (!tr) return;
        var u = userByUpn(upn);
        if (!u) return;
        var d = derive(u);
        var alw = tr.querySelector('.cell-alw');
        var role = tr.querySelector('.cell-role');
        var util = tr.querySelector('.cell-util');
        var fit = tr.querySelector('.cell-fit');
        if (alw) alw.textContent = fmtInt(d.allowance);
        if (role) role.textContent = d.pol.role;
        if (util) { util.className = 'num cell-util ' + utilClass(d.util); util.textContent = fmtPct(d.util); }
        if (fit) { fit.className = 'cell-fit ' + fitClass(d.fit); fit.textContent = d.fit; }
    }

    function cssEscape(s) { return String(s).replace(/["\\]/g, '\\$&'); }

    function userByUpn(upn) {
        for (var i = 0; i < state.users.length; i++) { if (state.users[i].upn === upn) return state.users[i]; }
        return null;
    }

    function syncSelectAll() {
        var box = $('selectAll');
        if (!box) return;
        var rows = filteredUsers();
        var total = rows.length;
        var sel = 0;
        rows.forEach(function (u) { if (state.selected[u.upn]) sel += 1; });
        box.checked = total > 0 && sel === total;
        box.indeterminate = sel > 0 && sel < total;
    }

    function buildControls() {
        var depts = {};
        state.users.forEach(function (u) { depts[u.department || 'Unknown'] = true; });
        var deptList = Object.keys(depts).sort();
        var deptSel = $('deptFilter');
        deptSel.innerHTML = '<option value="All">All departments</option>' +
            deptList.map(function (d) { return '<option value="' + esc(d) + '">' + esc(d) + '</option>'; }).join('');
        var cohSel = $('cohortFilter');
        cohSel.innerHTML = '<option value="All">All cohorts</option>' +
            COHORT_ORDER.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('');

        var bulkSel = $('bulkPolicy');
        bulkSel.innerHTML = POLICIES.map(function (p) {
            return '<option value="' + p.id + '"' + (p.id === 'standard' ? ' selected' : '') + '>' + esc(p.name) + '</option>';
        }).join('');
    }

    // ----------------------------------------------------------- policy rules
    // Attribute-driven tiering. Rules evaluate top to bottom; first match wins.
    // Users matched by no rule fall to the default policy. Applying rules sets
    // assignments through the same commit gate as every other change.
    var RULE_ATTRS = [
        { id: 'department', label: 'Department' },
        { id: 'jobFamily', label: 'Job family' },
        { id: 'jobTitle', label: 'Job title' },
        { id: 'businessUnit', label: 'Business unit' },
        { id: 'costCenter', label: 'Cost center' }
    ];

    function ruleAttrVal(u, attr) {
        if (attr === 'department') return u.department || '';
        if (attr === 'jobFamily') return u.jobFamily || '';
        if (attr === 'jobTitle') return u.jobTitle || '';
        if (attr === 'businessUnit') return u.businessUnit || '';
        if (attr === 'costCenter') return u.costCenter || '';
        return '';
    }

    function distinctVals(attr) {
        var seen = {}, out = [];
        state.users.forEach(function (u) {
            var v = ruleAttrVal(u, attr);
            if (v && !seen[v]) { seen[v] = true; out.push(v); }
        });
        out.sort();
        return out;
    }

    function policyForUserByRules(u) {
        for (var i = 0; i < state.rules.length; i++) {
            var r = state.rules[i];
            if (!r.value) continue;
            if (ruleAttrVal(u, r.attr).toLowerCase() === String(r.value).toLowerCase()) return r.policy;
        }
        return state.rulesDefault;
    }

    function computeRulesCoverage() {
        var counts = state.rules.map(function () { return 0; });
        var matched = 0, def = 0;
        state.users.forEach(function (u) {
            var hit = -1;
            for (var i = 0; i < state.rules.length; i++) {
                var r = state.rules[i];
                if (!r.value) continue;
                if (ruleAttrVal(u, r.attr).toLowerCase() === String(r.value).toLowerCase()) { hit = i; break; }
            }
            if (hit >= 0) { counts[hit] += 1; matched += 1; } else { def += 1; }
        });
        return { counts: counts, matched: matched, def: def, total: state.users.length };
    }

    function applyRules() {
        state.users.forEach(function (u) { state.assignments[u.upn] = policyForUserByRules(u); });
        refreshAll();
        renderRules();
        switchTab('manager');
    }

    function policyOptions(sel) {
        return POLICIES.map(function (p) {
            return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.name) + '</option>';
        }).join('');
    }

    function renderRules() {
        if (!$('rulesList')) return;
        var cov = computeRulesCoverage();
        var dls = RULE_ATTRS.map(function (a) {
            return '<datalist id="dl_' + a.id + '">' + distinctVals(a.id).map(function (v) {
                return '<option value="' + esc(v) + '"></option>';
            }).join('') + '</datalist>';
        }).join('');
        var rows = state.rules.map(function (r, i) {
            var attrOpts = RULE_ATTRS.map(function (a) {
                return '<option value="' + a.id + '"' + (a.id === r.attr ? ' selected' : '') + '>' + esc(a.label) + '</option>';
            }).join('');
            return '<div class="rule-row">' +
                '<span class="rule-idx">' + (i + 1) + '</span>' +
                '<select class="rule-attr" data-idx="' + i + '" aria-label="Attribute">' + attrOpts + '</select>' +
                '<span class="rule-eq">is</span>' +
                '<input type="text" class="rule-value" data-idx="' + i + '" list="dl_' + r.attr + '" value="' + esc(r.value) + '" placeholder="value" aria-label="Value">' +
                '<span class="rule-arrow">&rarr;</span>' +
                '<select class="rule-policy" data-idx="' + i + '" aria-label="Policy">' + policyOptions(r.policy) + '</select>' +
                '<span class="rule-count">' + fmtInt(cov.counts[i]) + ' users</span>' +
                '<button type="button" class="rule-remove" data-idx="' + i + '" aria-label="Remove rule">Remove</button>' +
                '</div>';
        }).join('');
        if (!rows) rows = '<p class="rule-empty">No rules yet. Every user gets the default policy below. Add a rule to tier by attribute.</p>';
        $('rulesList').innerHTML = dls + rows;
        $('rulesDefaultRow').innerHTML = '<span class="rule-default-label">Everyone else &rarr;</span>' +
            '<select id="rulesDefault" aria-label="Default policy">' + policyOptions(state.rulesDefault) + '</select>' +
            '<span class="rule-count">' + fmtInt(cov.def) + ' users</span>';
        $('rulesCoverage').innerHTML = '<strong>' + fmtInt(cov.matched) + '</strong> of ' + fmtInt(cov.total) +
            ' users matched by rule, <strong>' + fmtInt(cov.def) + '</strong> to default. ' +
            'Applying updates every assignment; review the change bar in the Policy Manager tab before committing.';
    }

    // -------------------------------------------------------- exception queue
    // Users whose current assignment mis-fits actual usage. Under-provisioned
    // (using more than allowance) is a work-blocking risk; over-provisioned is
    // waste. Right-size moves a user to the smallest policy covering their use,
    // flowing through the same commit gate as every other change.
    function computeExceptions() {
        var under = [], over = [];
        state.users.forEach(function (u) {
            var d = derive(u);
            if (d.fit === 'Over-allowance') under.push({ u: u, d: d, gap: u.used - d.allowance });
            else if (d.fit === 'Over-provisioned') over.push({ u: u, d: d, gap: d.allowance - u.used });
        });
        under.sort(function (a, b) { return b.gap - a.gap; });
        over.sort(function (a, b) { return b.gap - a.gap; });
        return { under: under, over: over };
    }

    function exceptionRow(item, kind) {
        var u = item.u, d = item.d;
        var recName = policyById(u.recommended).name;
        var issue = kind === 'under'
            ? '<span class="exc-tag exc-under">Under-provisioned</span>'
            : '<span class="exc-tag exc-over">Over-provisioned</span>';
        var detail = kind === 'under'
            ? fmtInt(item.gap) + ' over allowance'
            : fmtInt(item.gap) + ' unused';
        return '<tr>' +
            '<td>' + esc(truncate(u.displayName, 40)) + '</td>' +
            '<td>' + esc(u.department || 'Unknown') + '</td>' +
            '<td class="num">' + fmtInt(u.used) + '</td>' +
            '<td>' + esc(d.pol.name) + '</td>' +
            '<td class="num">' + fmtInt(d.allowance) + '</td>' +
            '<td class="num cell-util ' + utilClass(d.util) + '">' + fmtPct(d.util) + '</td>' +
            '<td>' + issue + '<span class="exc-detail">' + detail + '</span></td>' +
            '<td>' + esc(recName) + '</td>' +
            '<td><button type="button" class="btn-secondary exc-fix" data-upn="' + esc(u.upn) + '">Right-size</button></td>' +
            '</tr>';
    }

    function renderExceptions() {
        if (!$('exceptionQueue')) return;
        var ex = computeExceptions();
        var total = state.users.length;
        var n = ex.under.length + ex.over.length;
        if (n === 0) {
            $('exceptionQueue').innerHTML = '<div class="exc-clear">No exceptions to review. Every assigned policy fits current usage.</div>';
            return;
        }
        var pct = total > 0 ? (n / total * 100).toFixed(1) : '0.0';
        var head = '<div class="exc-head">' +
            '<div class="exc-summary"><strong>' + fmtInt(n) + '</strong> exception' + (n === 1 ? '' : 's') + ' to review &middot; ' +
            fmtInt(ex.under.length) + ' under-provisioned, ' + fmtInt(ex.over.length) + ' over-provisioned &middot; ' +
            pct + '% of ' + fmtInt(total) + ' users</div>' +
            '<button type="button" class="btn-secondary exc-fix-all">Right-size all</button></div>';
        var body = ex.under.map(function (it) { return exceptionRow(it, 'under'); }).join('') +
            ex.over.map(function (it) { return exceptionRow(it, 'over'); }).join('');
        $('exceptionQueue').innerHTML = head +
            '<div class="table-wrap"><table><thead><tr>' +
            '<th>Name</th><th>Department</th><th class="num">Credits Used</th><th>Assigned Policy</th>' +
            '<th class="num">Allowance</th><th class="num">Utilization</th><th>Issue</th><th>Recommended</th><th>Action</th>' +
            '</tr></thead><tbody>' + body + '</tbody></table></div>';
    }

    // --------------------------------------------------------------- export
    function q(v) { var s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }

    function exportCsv() {
        var g = growthFrac();
        var lines = [];
        if (state.demoActive) { lines.push(q('SYNTHETIC DEMO DATA - synthetic figures, not for real decisions')); }
        lines.push('UPN,Display Name,Department,Job Title,Cohort,Current Monthly Credits,Recommended Policy,Assigned Policy,Policy Role,Policy Allowance,Utilization %,Projected Monthly Cost,Fit Status,Forecast Next-Month Credits,Forecast Next-Month Cost');
        state.users.forEach(function (u) {
            var d = derive(u);
            var utilNum = (d.util * 100).toFixed(1);
            var cost = (d.allowance * state.rate).toFixed(2);
            var fcCr = u.used * (1 + g);
            var fcCost = (fcCr * state.rate).toFixed(2);
            lines.push([
                q(u.upn), q(u.displayName), q(u.department || 'Unknown'), q(u.jobTitle || ''), q(u.cohort),
                q(Math.round(u.used)), q(policyById(u.recommended).name), q(d.pol.name), q(d.pol.role),
                q(d.allowance), q(utilNum), q(cost), q(d.fit), q(Math.round(fcCr)), q(fcCost)
            ].join(','));
        });
        var f = computeForecast();
        lines.push('');
        lines.push('Budget forecast (next month),Value');
        lines.push('Expected growth %,' + q(state.growthPct.toFixed(2)));
        lines.push('Current monthly credits (all users),' + q(Math.round(f.curUsed)));
        lines.push('Forecast next-month credits,' + q(Math.round(f.fcUsed)));
        lines.push('Forecast next-month cost,' + q(f.fcCost.toFixed(2)));
        lines.push('Provisioned allowance credits,' + q(Math.round(f.provAllow)));
        lines.push('Provisioned monthly budget,' + q(f.provBudget.toFixed(2)));
        lines.push('Headroom (allowance - forecast) credits,' + q(Math.round(f.headroom)));
        lines.push('Users forecast over tier,' + q(f.over));
        var b = computeBudget();
        var buy = computeBuy(state.buyCredits);
        lines.push('');
        lines.push('Budget and pricing,Value');
        lines.push('Credits owned this month,' + q(Math.round(b.owned)));
        lines.push('Credits used,' + q(Math.round(b.used)));
        lines.push('Unused credits,' + q(Math.round(b.unused)));
        lines.push('Committed budget,' + q(b.budget.toFixed(2)));
        lines.push('Current spend,' + q(b.spend.toFixed(2)));
        lines.push('Unused credit value,' + q(b.unusedValue.toFixed(2)));
        lines.push('List rate per credit,' + q(state.rate.toFixed(4)));
        lines.push('Pack size credits,' + q(state.packSize));
        lines.push('Pack price,' + q(state.packPrice.toFixed(2)));
        lines.push('Pack effective rate per credit,' + q(packEffRate().toFixed(4)));
        lines.push('Credits to purchase,' + q(Math.round(buy.credits)));
        lines.push('Purchase cost pay-as-you-go,' + q(buy.paygCost.toFixed(2)));
        lines.push('Purchase packs needed,' + q(buy.packs));
        lines.push('Purchase cost via packs,' + q(buy.packCost.toFixed(2)));
        lines.push('Purchase savings via packs,' + q(buy.packSaving.toFixed(2)));
        var budgetKeys = Object.keys(state.groupBudgets);
        if (budgetKeys.length) {
            var budgetRows = [];
            budgetKeys.forEach(function (bk) {
                var amount = state.groupBudgets[bk];
                if (!(amount > 0)) return;
                var ci = bk.indexOf(':');
                var mode = bk.slice(0, ci);
                var name = bk.slice(ci + 1);
                var gcost = 0, gusers = 0;
                state.users.forEach(function (u) {
                    var uk = mode === 'department' ? (u.department || 'Unknown') : (u.manager || 'No manager');
                    if (uk !== name) return;
                    gcost += derive(u).cost;
                    gusers += 1;
                });
                var over = gcost - amount;
                var status = over > 0 ? 'Over budget by ' + over.toFixed(2)
                    : (over < 0 ? 'Under budget by ' + (-over).toFixed(2) : 'On budget');
                var label = name;
                if (mode === 'team' && name !== 'No manager') {
                    var at = name.indexOf('@');
                    label = at > 0 ? name.slice(0, at) : name;
                }
                budgetRows.push({ view: mode === 'department' ? 'Department' : 'Team', name: label, users: gusers, cost: gcost, budget: amount, status: status, sort: gcost });
            });
            if (budgetRows.length) {
                budgetRows.sort(function (a, b) { return b.sort - a.sort; });
                lines.push('');
                lines.push('Group budgets (point-in-time)');
                lines.push('View,Group,Users,Projected Monthly Cost,Monthly Budget,Budget Status');
                budgetRows.forEach(function (r) {
                    lines.push([q(r.view), q(r.name), q(r.users), q(r.cost.toFixed(2)), q(r.budget.toFixed(2)), q(r.status)].join(','));
                });
            }
        }
        if (state.rules.length) {
            var rcov = computeRulesCoverage();
            var attrLabels = {};
            RULE_ATTRS.forEach(function (a) { attrLabels[a.id] = a.label; });
            lines.push('');
            lines.push('Policy rules (governing policy, first match wins)');
            lines.push('Order,Attribute,Value,Policy,Users Matched');
            state.rules.forEach(function (r, ri) {
                lines.push([q(ri + 1), q(attrLabels[r.attr] || r.attr), q(r.value || ''), q(policyById(r.policy).name), q(rcov.counts[ri])].join(','));
            });
            lines.push([q('Default'), q('Everyone else'), q(''), q(policyById(state.rulesDefault).name), q(rcov.def)].join(','));
            lines.push('Rules coverage,' + q(fmtInt(rcov.matched) + ' of ' + fmtInt(rcov.total) + ' users matched by rule; ' + fmtInt(rcov.def) + ' to default'));
        }
        var csv = lines.join('\r\n');
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = 'billing-policy-assignments.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function () { URL.revokeObjectURL(url); }, 0);
    }

    // --------------------------------------------------------------- deck
    function exportDeck() {
        if (!window.PptxGenJS) { alert('PPTX library not loaded.'); return; }
        var pptx = new window.PptxGenJS();
        pptx.defineLayout({ name: 'W', width: 13.33, height: 7.5 });
        pptx.layout = 'W';
        var BG = '0B1120', SURF = '1E293B', BLUE = '4A9EF7', CYAN = '00D4FF', TXT = 'F1F5F9', SUB = '94A3B8', GREEN = '34D399', AMBER = 'F59E0B', RED = 'F87171', LINE = '334155';
        var FONT = 'Segoe UI';
        var demoNote = state.demoActive ? '  |  SYNTHETIC DEMO DATA' : '';
        var i;

        function bg(s) { s.background = { color: BG }; }
        function heading(s, t) { s.addText(t, { x: 0.7, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: BLUE, fontFace: FONT }); }
        function hcell(t) { return { text: t, options: { bold: true, color: BLUE } }; }

        var counts = {}, costs = {};
        for (i = 0; i < POLICIES.length; i++) { counts[POLICIES[i].id] = 0; costs[POLICIES[i].id] = 0; }
        var totalUsed = 0, totalCost = 0, totalAllow = 0, licensed = 0;
        state.users.forEach(function (u) {
            var d = derive(u);
            counts[d.pid] = (counts[d.pid] || 0) + 1;
            costs[d.pid] = (costs[d.pid] || 0) + d.cost;
            totalUsed += u.used; totalCost += d.cost; totalAllow += d.allowance;
            if (u.licensed) licensed += 1;
        });
        var util = totalAllow > 0 ? totalUsed / totalAllow : 0;
        var ex = computeExceptions();
        var exCount = ex.under.length + ex.over.length;

        var s1 = pptx.addSlide(); bg(s1);
        s1.addText('Cowork Policy Helper Record', { x: 0.7, y: 2.1, w: 12, h: 1, fontFace: FONT, fontSize: 38, bold: true, color: CYAN });
        s1.addText(fmtInt(state.users.length) + ' users  |  ' + fmtMoney(totalCost) + ' projected monthly cost  |  ' + fmtMoney(state.rate) + '/credit', { x: 0.7, y: 3.25, w: 12, h: 0.6, fontFace: FONT, fontSize: 20, color: TXT });
        s1.addText('Point-in-time policy assignment record  |  ' + new Date().toLocaleDateString() + demoNote, { x: 0.7, y: 4.05, w: 12, h: 0.5, fontFace: FONT, fontSize: 14, color: SUB });

        var s2 = pptx.addSlide(); bg(s2);
        heading(s2, 'Policy Summary');
        var kpis = [
            ['Users', fmtInt(state.users.length)],
            ['Licensed', fmtInt(licensed)],
            ['Projected monthly cost', fmtMoney(totalCost)],
            ['Utilization', fmtPct(util)],
            ['Exceptions', fmtInt(exCount)]
        ];
        kpis.forEach(function (k, idx) {
            var x = 0.7 + (idx % 3) * 4.2, y = 1.4 + Math.floor(idx / 3) * 1.55;
            s2.addShape(pptx.ShapeType.roundRect, { x: x, y: y, w: 3.9, h: 1.35, fill: { color: SURF }, line: { color: BLUE, width: 0.5 }, rectRadius: 0.1 });
            s2.addText(k[0], { x: x + 0.2, y: y + 0.15, w: 3.5, h: 0.4, fontSize: 12, color: SUB, fontFace: FONT });
            s2.addText(k[1], { x: x + 0.2, y: y + 0.5, w: 3.5, h: 0.7, fontSize: 24, bold: true, color: CYAN, fontFace: FONT });
        });
        var chLabels = [], chVals = [];
        for (i = 0; i < POLICIES.length; i++) { chLabels.push(POLICIES[i].name); chVals.push(counts[POLICIES[i].id]); }
        s2.addChart(pptx.ChartType.bar, [{ name: 'Users', labels: chLabels, values: chVals }],
            { x: 0.7, y: 4.7, w: 12, h: 2.4, barDir: 'bar', showValue: true, chartColors: [BLUE], catAxisLabelColor: TXT, valAxisLabelColor: SUB, dataLabelColor: TXT, showLegend: false });

        var s3 = pptx.addSlide(); bg(s3);
        heading(s3, 'Policy Allowances & Assignments');
        var prows = [[hcell('Policy'), hcell('Role'), hcell('Monthly Allowance'), hcell('Users Assigned'), hcell('Projected Cost')]];
        POLICIES.forEach(function (p) {
            prows.push([p.name, p.role, fmtInt(p.allowance), fmtInt(counts[p.id]), fmtMoney(costs[p.id])]);
        });
        prows.push([{ text: 'Total', options: { bold: true, color: CYAN } }, '', '', { text: fmtInt(state.users.length), options: { bold: true, color: CYAN } }, { text: fmtMoney(totalCost), options: { bold: true, color: CYAN } }]);
        s3.addTable(prows, { x: 0.7, y: 1.4, w: 12, color: TXT, fontFace: FONT, fontSize: 13, border: { type: 'solid', color: LINE, pt: 0.5 }, fill: { color: SURF } });

        var f = computeForecast();
        var s4 = pptx.addSlide(); bg(s4);
        heading(s4, 'Budget Forecast (next month)');
        var frows = [[hcell('Metric'), hcell('Value')]];
        frows.push(['Expected growth', state.growthPct.toFixed(2) + '%']);
        frows.push(['Current monthly credits (all users)', fmtInt(f.curUsed)]);
        frows.push(['Forecast next-month credits', fmtInt(f.fcUsed)]);
        frows.push(['Forecast next-month cost', fmtMoney(f.fcCost)]);
        frows.push(['Provisioned allowance credits', fmtInt(f.provAllow)]);
        frows.push(['Provisioned monthly budget', fmtMoney(f.provBudget)]);
        frows.push(['Headroom (allowance - forecast)', fmtInt(f.headroom) + ' credits']);
        frows.push(['Users forecast over tier', fmtInt(f.over)]);
        s4.addTable(frows, { x: 0.7, y: 1.4, w: 9, color: TXT, fontFace: FONT, fontSize: 14, border: { type: 'solid', color: LINE, pt: 0.5 }, fill: { color: SURF } });

        var budgetKeys = Object.keys(state.groupBudgets);
        var budgetRows = [];
        budgetKeys.forEach(function (bk) {
            var amount = state.groupBudgets[bk];
            if (!(amount > 0)) return;
            var ci = bk.indexOf(':');
            var mode = bk.slice(0, ci);
            var name = bk.slice(ci + 1);
            var gcost = 0, gusers = 0;
            state.users.forEach(function (u) {
                var uk = mode === 'department' ? (u.department || 'Unknown') : (u.manager || 'No manager');
                if (uk !== name) return;
                gcost += derive(u).cost; gusers += 1;
            });
            var over = gcost - amount;
            var status = over > 0 ? 'Over by ' + fmtMoney(over) : (over < 0 ? 'Under by ' + fmtMoney(-over) : 'On budget');
            var label = name;
            if (mode === 'team' && name !== 'No manager') { var at = name.indexOf('@'); label = at > 0 ? name.slice(0, at) : name; }
            budgetRows.push({ view: mode === 'department' ? 'Department' : 'Team', name: label, users: gusers, cost: gcost, budget: amount, status: status, over: over, sort: gcost });
        });
        if (budgetRows.length) {
            budgetRows.sort(function (a, b) { return b.sort - a.sort; });
            var s5 = pptx.addSlide(); bg(s5);
            heading(s5, 'Group Budgets (point-in-time)');
            var grows = [[hcell('View'), hcell('Group'), hcell('Users'), hcell('Projected Cost'), hcell('Budget'), hcell('Status')]];
            budgetRows.slice(0, 12).forEach(function (r) {
                var col = r.over > 0 ? RED : GREEN;
                grows.push([r.view, r.name, fmtInt(r.users), fmtMoney(r.cost), fmtMoney(r.budget), { text: r.status, options: { color: col } }]);
            });
            s5.addTable(grows, { x: 0.7, y: 1.4, w: 12, color: TXT, fontFace: FONT, fontSize: 12, border: { type: 'solid', color: LINE, pt: 0.5 }, fill: { color: SURF } });
        }

        var s6 = pptx.addSlide(); bg(s6);
        heading(s6, 'Rules-Based Tiering');
        var attrLabel = {};
        for (i = 0; i < RULE_ATTRS.length; i++) { attrLabel[RULE_ATTRS[i].id] = RULE_ATTRS[i].label; }
        if (state.rules.length) {
            var cov = computeRulesCoverage();
            s6.addText(fmtInt(cov.matched) + ' of ' + fmtInt(cov.total) + ' users matched by rule, ' + fmtInt(cov.def) + ' to default (' + policyById(state.rulesDefault).name + ').', { x: 0.7, y: 1.2, w: 12, h: 0.5, fontSize: 14, color: SUB, fontFace: FONT });
            var rrows = [[hcell('#'), hcell('Attribute'), hcell('Value'), hcell('Policy'), hcell('Users')]];
            state.rules.forEach(function (r, idx) {
                rrows.push([String(idx + 1), attrLabel[r.attr] || r.attr, r.value || '(unset)', policyById(r.policy).name, fmtInt(cov.counts[idx])]);
            });
            rrows.push([{ text: '', options: {} }, { text: 'Everyone else', options: { bold: true, color: CYAN } }, '', { text: policyById(state.rulesDefault).name, options: { bold: true, color: CYAN } }, { text: fmtInt(cov.def), options: { bold: true, color: CYAN } }]);
            s6.addTable(rrows, { x: 0.7, y: 1.9, w: 12, color: TXT, fontFace: FONT, fontSize: 13, border: { type: 'solid', color: LINE, pt: 0.5 }, fill: { color: SURF } });
        } else {
            s6.addText('No attribute rules were defined. Policy assignments were set manually or from per-user usage recommendations.', { x: 0.7, y: 1.6, w: 11, h: 1, fontSize: 16, color: TXT, fontFace: FONT });
        }

        var s7 = pptx.addSlide(); bg(s7);
        heading(s7, 'Exception Queue');
        if (exCount === 0) {
            s7.addText('No exceptions. Every assigned policy fits current usage.', { x: 0.7, y: 1.6, w: 11, h: 1, fontSize: 16, color: GREEN, fontFace: FONT });
        } else {
            var pct = state.users.length > 0 ? (exCount / state.users.length * 100).toFixed(1) : '0.0';
            s7.addText(fmtInt(exCount) + ' exceptions  |  ' + fmtInt(ex.under.length) + ' under-provisioned, ' + fmtInt(ex.over.length) + ' over-provisioned  |  ' + pct + '% of users', { x: 0.7, y: 1.2, w: 12, h: 0.5, fontSize: 14, color: SUB, fontFace: FONT });
            var erows = [[hcell('Name'), hcell('Department'), hcell('Used'), hcell('Policy'), hcell('Allowance'), hcell('Issue'), hcell('Recommended')]];
            var items = ex.under.map(function (it) { return { it: it, kind: 'under' }; }).concat(ex.over.map(function (it) { return { it: it, kind: 'over' }; }));
            items.slice(0, 12).forEach(function (row) {
                var it = row.it, u = it.u, d = it.d;
                var issue = row.kind === 'under' ? { text: fmtInt(it.gap) + ' over', options: { color: RED } } : { text: fmtInt(it.gap) + ' unused', options: { color: AMBER } };
                erows.push([truncate(u.displayName, 32), u.department || 'Unknown', fmtInt(u.used), d.pol.name, fmtInt(d.allowance), issue, policyById(u.recommended).name]);
            });
            s7.addTable(erows, { x: 0.7, y: 1.9, w: 12, color: TXT, fontFace: FONT, fontSize: 12, border: { type: 'solid', color: LINE, pt: 0.5 }, fill: { color: SURF } });
        }

        var s8 = pptx.addSlide(); bg(s8);
        heading(s8, 'Methodology & Notes');
        var method = [
            'Recommended policy = the smallest non-zero tier whose allowance covers actual monthly consumption (unassigned if unlicensed or zero usage).',
            'Fit status: Over-allowance = using more than the assigned tier allows; Over-provisioned = using under 40% of the allowance; otherwise OK.',
            'Projected cost = policy allowance x rate per credit (' + fmtMoney(state.rate) + ').',
            'Rules assign tiers by attribute (top to bottom, first match wins); the exception queue lists users the rules or manual choices mis-fit.',
            'Single-month snapshot; the budget forecast applies the expected-growth knob only.',
            (state.demoActive ? 'SYNTHETIC DEMO DATA - not for real decisions.' : 'Computed locally in your browser; no data leaves your device.')
        ];
        s8.addText(method.map(function (m) { return { text: m, options: { bullet: true, color: TXT, fontSize: 15, fontFace: FONT, paraSpaceAfter: 10 } }; }), { x: 0.9, y: 1.5, w: 11.5, h: 5 });

        pptx.writeFile({ fileName: 'billing-policy-record.pptx' });
    }

    // ------------------------------------------------------- dashboard wiring
    // ------------------------------------------------------ data quality gate
    // Input-integrity scan run on every refresh. Surfaces source-data problems
    // that would make a policy change unsafe to commit. Review surface only - it
    // never blocks, but it puts the problems in front of you before you act.
    function computeDataQuality() {
        var users = state.users;
        var issues = [];
        var seen = {}, dups = 0;
        var noPolicy = 0, missingDept = 0, missingCC = 0, badNum = 0;
        for (var i = 0; i < users.length; i++) {
            var u = users[i];
            if (Object.prototype.hasOwnProperty.call(seen, u.upn)) dups += 1;
            else seen[u.upn] = true;
            if (u.used > 0 && policyById(state.assignments[u.upn] || 'unassigned').allowance <= 0) noPolicy += 1;
            if (!u.department || u.department === 'Unknown') missingDept += 1;
            if (!u.costCenter) missingCC += 1;
            if (u.used < 0 || u.limit < 0) badNum += 1;
        }
        if (dups > 0) issues.push({ sev: 'error', label: 'Duplicate user rows', count: dups, note: 'The same user appears more than once in the credit file. Consumption may be double-counted.' });
        if (noPolicy > 0) issues.push({ sev: 'error', label: 'Consumption without an active policy', count: noPolicy, note: 'Users are consuming credits but are assigned to the Unassigned tier (no allowance). Assign an active billing policy before billing.' });
        if (badNum > 0) issues.push({ sev: 'error', label: 'Invalid usage or allowance', count: badNum, note: 'Negative usage or allowance values were found - likely a bad export.' });
        if (missingDept > 0) issues.push({ sev: 'warn', label: 'Not matched to the directory', count: missingDept, note: 'No department could be resolved. These users cannot be rolled up by org or reviewed by owner.' });
        if (missingCC > 0) issues.push({ sev: 'warn', label: 'Missing cost center', count: missingCC, note: 'No cost center on record. These users cannot be charged back to a budget owner.' });
        return { checked: users.length, issues: issues };
    }

    function renderDataQuality() {
        var el = $('dataQuality');
        if (!el) return;
        var dq = computeDataQuality();
        if (!dq.issues.length) {
            el.className = 'dq-ok';
            el.innerHTML = '<strong>Data quality:</strong> ' + fmtInt(dq.checked) + ' users checked &middot; no source-data issues found.';
            return;
        }
        var errs = 0;
        var rows = '';
        for (var j = 0; j < dq.issues.length; j++) {
            var it = dq.issues[j];
            if (it.sev === 'error') errs += 1;
            rows += '<div class="dq-row dq-' + it.sev + '">' +
                '<span class="dq-count">' + fmtInt(it.count) + '</span>' +
                '<span class="dq-body"><span class="dq-label">' + esc(it.label) + '</span>' +
                '<span class="dq-note">' + esc(it.note) + '</span></span></div>';
        }
        var head = errs > 0 ? '&#9888; Data quality review' : 'Data quality review';
        el.className = errs > 0 ? 'dq-panel dq-has-error' : 'dq-panel dq-has-warn';
        el.innerHTML = '<div class="dq-head">' + head + ' &middot; ' + fmtInt(dq.checked) +
            ' users checked</div>' + rows +
            '<div class="dq-foot">Resolve source-data issues before committing policy changes.</div>';
    }

    function refreshAll() { recomputeRecommendations(); renderSummary(); renderDataQuality(); renderPolicyEditor(); renderRoster(); renderForecast(); renderImpact(); renderPricing(); renderExceptions(); updateTopbar(); }

    function updateTopbar() {
        var needReview = 0;
        state.users.forEach(function (u) { if (derive(u).fit === 'Over-allowance') needReview += 1; });
        $('topbarSub').textContent = fmtInt(state.users.length) + ' users  |  ' + fmtInt(needReview) +
            ' needing review  |  rate ' + fmtMoney(state.rate) + '/credit';
    }

    function wireDashboard() {
        // Delegated events on the roster tbody: per-row select + checkbox.
        var tbody = $('rosterBody');
        tbody.addEventListener('change', function (e) {
            var t = e.target;
            if (t.classList.contains('pol-select')) {
                var upn = t.getAttribute('data-upn');
                state.assignments[upn] = t.value;
                updateRowDerived(upn);
                renderSummary();
                renderForecast();
                renderImpact();
                renderPricing();
                updateTopbar();
            } else if (t.classList.contains('row-check')) {
                var cu = t.getAttribute('data-upn');
                if (t.checked) state.selected[cu] = true; else delete state.selected[cu];
                syncSelectAll();
            }
        });

        var selAll = $('selectAll');
        selAll.addEventListener('change', function () {
            var rows = filteredUsers();
            rows.forEach(function (u) {
                if (selAll.checked) state.selected[u.upn] = true; else delete state.selected[u.upn];
            });
            renderRoster();
        });

        $('rbacSearch').addEventListener('input', function () { state.search = this.value; renderRoster(); });
        $('deptFilter').addEventListener('change', function () { state.deptFilter = this.value; renderRoster(); });
        $('cohortFilter').addEventListener('change', function () { state.cohortFilter = this.value; renderRoster(); });
        $('viewIndividual').addEventListener('click', function () { switchView('individual'); });
        $('viewDepartment').addEventListener('click', function () { switchView('department'); });
        $('viewTeam').addEventListener('click', function () { switchView('team'); });

        var aggBody = $('aggBody');
        aggBody.addEventListener('input', function (e) {
            var t = e.target;
            if (!t.classList.contains('agg-budget')) return;
            var key = t.getAttribute('data-key');
            var v = parseFloat(t.value);
            var bk = state.groupBy + ':' + key;
            if (!isFinite(v) || v < 0) delete state.groupBudgets[bk];
            else state.groupBudgets[bk] = v;
            var tr = t.parentNode.parentNode;
            var cost = parseFloat(tr.getAttribute('data-cost')) || 0;
            var st = budgetStatus(cost, (isFinite(v) && v >= 0) ? v : 0);
            var vs = tr.querySelector('.agg-vs');
            if (vs) { vs.className = 'agg-vs ' + st.cls; vs.innerHTML = st.txt; }
        });
        aggBody.addEventListener('click', function (e) {
            var t = e.target;
            if (!t.classList.contains('agg-fit')) return;
            var key = t.getAttribute('data-key');
            recomputeRecommendations();
            filteredUsers().forEach(function (u) {
                if (groupKeyOf(u) === key) state.assignments[u.upn] = u.recommended;
            });
            refreshAll();
        });

        $('btnBulkAssign').addEventListener('click', function () {
            var pid = $('bulkPolicy').value;
            filteredUsers().forEach(function (u) {
                if (state.selected[u.upn]) state.assignments[u.upn] = pid;
            });
            refreshAll();
        });

        $('btnApplyRecs').addEventListener('click', function () {
            recomputeRecommendations();
            state.users.forEach(function (u) { state.assignments[u.upn] = u.recommended; });
            refreshAll();
        });

        $('btnClearSel').addEventListener('click', function () {
            state.selected = {};
            renderRoster();
        });

        $('btnResetPolicies').addEventListener('click', function () {
            state.users.forEach(function (u) { state.assignments[u.upn] = state.baseline[u.upn] || 'unassigned'; });
            refreshAll();
        });

        $('changeImpact').addEventListener('click', function (e) {
            var b = e.target;
            var act = b && b.getAttribute ? b.getAttribute('data-action') : null;
            if (act === 'apply') applyChanges();
            else if (act === 'discard') discardChanges();
            else if (act === 'undo') undoApply();
        });

        $('rbacRate').addEventListener('input', function () {
            var v = parseFloat(this.value);
            if (isFinite(v) && v >= 0) { state.rate = v; renderSummary(); renderForecast(); renderPricing(); updateTopbar(); }
        });

        $('growthInput').addEventListener('input', function () {
            var v = parseFloat(this.value);
            if (!isFinite(v)) v = 0;
            state.growthPct = v;
            renderForecast();
        });

        $('tabBtnManager').addEventListener('click', function () { switchTab('manager'); });
        $('tabBtnRules').addEventListener('click', function () { switchTab('rules'); });
        $('tabBtnPricing').addEventListener('click', function () { switchTab('pricing'); });

        var rulesList = $('rulesList');
        rulesList.addEventListener('change', function (e) {
            var t = e.target;
            var idx = parseInt(t.getAttribute('data-idx'), 10);
            if (t.classList.contains('rule-attr')) { state.rules[idx].attr = t.value; state.rules[idx].value = ''; renderRules(); }
            else if (t.classList.contains('rule-policy')) { state.rules[idx].policy = t.value; renderRules(); }
            else if (t.classList.contains('rule-value')) { state.rules[idx].value = t.value; renderRules(); }
        });
        rulesList.addEventListener('input', function (e) {
            var t = e.target;
            if (!t.classList.contains('rule-value')) return;
            var idx = parseInt(t.getAttribute('data-idx'), 10);
            state.rules[idx].value = t.value;
        });
        rulesList.addEventListener('click', function (e) {
            var t = e.target;
            if (!t.classList.contains('rule-remove')) return;
            var idx = parseInt(t.getAttribute('data-idx'), 10);
            state.rules.splice(idx, 1);
            renderRules();
        });
        $('rulesDefaultRow').addEventListener('change', function (e) {
            if (e.target.id === 'rulesDefault') { state.rulesDefault = e.target.value; renderRules(); }
        });
        $('btnAddRule').addEventListener('click', function () {
            state.rules.push({ attr: 'department', value: '', policy: 'standard' });
            renderRules();
        });
        $('btnApplyRules').addEventListener('click', applyRules);

        $('exceptionQueue').addEventListener('click', function (e) {
            var t = e.target;
            if (t.classList.contains('exc-fix')) {
                var upn = t.getAttribute('data-upn');
                var u = userByUpn(upn);
                if (u) { state.assignments[upn] = recommendPolicy(u); refreshAll(); }
            } else if (t.classList.contains('exc-fix-all')) {
                recomputeRecommendations();
                var ex = computeExceptions();
                ex.under.concat(ex.over).forEach(function (it) {
                    state.assignments[it.u.upn] = recommendPolicy(it.u);
                });
                refreshAll();
                switchTab('manager');
            }
        });

        $('ownedInput').addEventListener('input', function () {
            var v = parseFloat(this.value);
            state.ownedCredits = (isFinite(v) && v >= 0) ? v : null;
            renderPricing();
        });
        $('buyInput').addEventListener('input', function () {
            var v = parseFloat(this.value); if (!isFinite(v) || v < 0) v = 0;
            state.buyCredits = v; renderPricing();
        });
        $('packSizeInput').addEventListener('input', function () {
            var v = parseFloat(this.value); if (!isFinite(v) || v < 1) v = 1;
            state.packSize = v; renderPricing();
        });
        $('packPriceInput').addEventListener('input', function () {
            var v = parseFloat(this.value); if (!isFinite(v) || v < 0) v = 0;
            state.packPrice = v; renderPricing();
        });

        $('btnExport').addEventListener('click', exportCsv);
        var deckBtn = $('btnExportDeck'); if (deckBtn) deckBtn.addEventListener('click', exportDeck);
        $('btnReset').addEventListener('click', reset);
    }

    function showDashboard() {
        computePerUser();
        recomputeRecommendations();
        state.users.forEach(function (u) {
            if (state.assignments[u.upn] === undefined) state.assignments[u.upn] = currentPolicy(u);
        });
        state.baseline = {};
        state.users.forEach(function (u) { state.baseline[u.upn] = state.assignments[u.upn]; });
        $('landing').hidden = true;
        $('dashboard').hidden = false;
        $('demoBanner').hidden = !state.demoActive;
        $('rbacFooter').innerHTML = state.demoActive
            ? 'Synthetic demo data - not for real decisions &middot; 100% client-side &middot; <a href="PRIVACY.md">Privacy</a> &middot; <a href="index.html">Standard report</a> &middot; v1.0'
            : '100% client-side &middot; No data leaves your browser &middot; <a href="PRIVACY.md">Privacy</a> &middot; <a href="index.html">Standard report</a> &middot; v1.0';
        $('rbacRate').value = state.rate;
        $('growthInput').value = state.growthPct;
        $('ownedInput').value = Math.round(ownedCreditsVal());
        $('packSizeInput').value = state.packSize;
        $('packPriceInput').value = state.packPrice;
        $('buyInput').value = state.buyCredits;
        switchTab('manager');
        buildControls();
        switchView('individual');
        refreshAll();
        window.scrollTo(0, 0);
    }

    function startFrom(entraRows, creditRows, demo) {
        state.entraRows = entraRows;
        state.creditRows = creditRows;
        state.demoActive = !!demo;
        state.rate = parseFloat($('rateInput').value) || 0.01;
        state.fallbackLimit = parseFloat($('fallbackLimit').value) || 400;
        state.assignments = {};
        state.selected = {};
        state.prevBaseline = null;
        state.groupBudgets = {};
        state.rules = [];
        state.rulesDefault = 'light';
        state.users = buildUsers(entraRows, creditRows);
        if (!state.users.length) { showError('No users could be built from these files. Check that the credit file has a user principal name column.'); return; }
        showDashboard();
    }

    // ------------------------------------------------------------ landing wiring
    function showError(msg) {
        var e = $('landingError');
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
        dz.addEventListener('click', function () { input.click(); });
        dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', function () { dz.classList.remove('dragover'); });
        dz.addEventListener('drop', function (e) {
            e.preventDefault(); dz.classList.remove('dragover');
            var files = e.dataTransfer && e.dataTransfer.files;
            if (files && files[0]) handleFile(files[0], dz, status, which);
        });
        input.addEventListener('change', function () {
            if (input.files && input.files[0]) handleFile(input.files[0], dz, status, which);
            input.value = '';
        });
    }

    function handleFile(file, dz, status, which) {
        $('landingError').hidden = true;
        readFile(file).then(function (text) {
            var rows = parseCSV(text);
            state.pending[which] = rows;
            status.textContent = file.name + ' - ' + fmtInt(rows.length) + ' rows';
            dz.classList.add('loaded');
            $('btnGenerate').disabled = !(state.pending.entra && state.pending.credits);
        }).catch(function () { showError('Failed to read ' + file.name); });
    }

    function loadDemo() {
        if (!window.DEMO_ENTRA_CSV || !window.DEMO_CREDITS_CSV) { showError('Demo data not available.'); return; }
        startFrom(parseCSV(window.DEMO_ENTRA_CSV), parseCSV(window.DEMO_CREDITS_CSV), true);
    }

    function reset() {
        state.pending = { entra: null, credits: null };
        state.users = []; state.demoActive = false;
        state.assignments = {}; state.selected = {}; state.baseline = {}; state.prevBaseline = null;
        state.search = ''; state.deptFilter = 'All'; state.cohortFilter = 'All'; state.growthPct = 0;
        state.ownedCredits = null; state.packSize = 25000; state.packPrice = 200; state.buyCredits = 0; state.activeTab = 'manager'; state.groupBy = 'individual'; state.groupBudgets = {}; state.rules = []; state.rulesDefault = 'light';
        $('dashboard').hidden = true;
        $('landing').hidden = false;
        $('statusEntra').textContent = 'No file selected';
        $('statusCredits').textContent = 'No file selected';
        $('dzEntra').classList.remove('loaded');
        $('dzCredits').classList.remove('loaded');
        $('fileEntra').value = ''; $('fileCredits').value = '';
        $('btnGenerate').disabled = true;
        window.scrollTo(0, 0);
    }

    function init() {
        wireDropzone('dzEntra', 'fileEntra', 'statusEntra', 'entra');
        wireDropzone('dzCredits', 'fileCredits', 'statusCredits', 'credits');

        $('btnGenerate').addEventListener('click', function () {
            if (state.pending.entra && state.pending.credits) startFrom(state.pending.entra, state.pending.credits, false);
        });
        $('btnDemo').addEventListener('click', loadDemo);

        wireDashboard();

        // ?demo=1 auto-load.
        if (/[?&]demo=1\b/.test(location.search)) loadDemo();

        // Service worker (guard file://).
        if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
            navigator.serviceWorker.register('sw.js').catch(function () { });
        }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    // Expose a few internals for testing/console use.
    window.CoworkPolicyApp = { parseCSV: parseCSV, buildUsers: buildUsers, recommendPolicy: recommendPolicy, POLICIES: POLICIES, state: state };
})();
