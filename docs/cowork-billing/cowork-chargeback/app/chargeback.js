/* chargeback.js - Cowork Chargeback (100% client-side).
   One job: turn Cowork consumption + org data into a finance-ready,
   invoice-reconciled chargeback - per unit and per person, in dollars.
   Full-consumption model: allocates 100% of the bill. No frameworks, no network. */
(function () {
    'use strict';

    var state = {
        entraRows: [], creditRows: [], users: [],
        rate: 0.01,
        fallbackLimit: 400,
        invoiceTotal: null,
        unitDim: 'costCenter',
        basis: 'full',
        lineFilter: 'all',
        sortJournal: { key: 'charge', dir: 'desc' },
        sortLines: { key: 'charge', dir: 'desc' },
        demoActive: false,
        pending: { entra: null, credits: null },
        entraFileNames: []
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
        license: ['microsoft 365 copilot license', 'copilot license', 'license', 'licensed']
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
            var limit = creditMap.creditLimit ? toNumber(crow[creditMap.creditLimit]) : state.fallbackLimit;
            if (!creditMap.creditLimit || (limit <= 0 && !creditMap.creditLimit)) limit = state.fallbackLimit;
            users.push({
                upn: upn,
                attrs: erow,
                displayName: get(creditMap, crow, 'displayName') || get(entraMap, erow, 'displayName') || upn,
                department: get(entraMap, erow, 'department') || 'Unknown',
                costCenter: get(entraMap, erow, 'costCenter') || 'Unknown',
                businessUnit: get(entraMap, erow, 'businessUnit') || 'Unknown',
                used: creditMap.creditsUsed ? toNumber(crow[creditMap.creditsUsed]) : 0,
                limit: limit
            });
        });
        return users;
    }

    function unitOf(u) {
        var raw = (u.attrs && u.attrs[state.unitDim] != null) ? u.attrs[state.unitDim] : '';
        var v = String(raw).trim();
        if (!v || v.toLowerCase() === 'unknown') return 'Unallocated';
        return v;
    }
    function unitLabel() { return state.unitDim ? String(state.unitDim) : 'Unit'; }
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
    function populateDimSelect() {
        var sel = $('cbDimSelect'); if (!sel) return;
        var dims = detectDimensions(state.entraRows);
        if (!state.unitDim || dims.indexOf(state.unitDim) < 0) state.unitDim = pickDefaultDim(dims);
        if (!dims.length) { sel.innerHTML = '<option value="">No org columns found</option>'; return; }
        sel.innerHTML = dims.map(function (d) { return '<option value="' + esc(d) + '"' + (d === state.unitDim ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('');
    }
    function computeChargeback() {
        var rate = state.rate, overageMode = state.basis === 'overage';
        var groups = {}, order = [], totalCredits = 0, totalOverage = 0;
        state.users.forEach(function (u) {
            var key = unitOf(u);
            var g = groups[key] || (groups[key] = { label: key, users: 0, credits: 0, overage: 0 });
            if (g.users === 0 && order.indexOf(key) < 0) order.push(key);
            var over = Math.max(0, u.used - u.limit);
            g.users += 1; g.credits += u.used; g.overage += over;
            totalCredits += u.used; totalOverage += over;
        });
        var arr = order.map(function (k) { return groups[k]; });
        arr.forEach(function (g) { g.charge = (overageMode ? g.overage : g.credits) * rate; });
        arr.sort(function (a, b) { return b.charge - a.charge; });
        var totalCharge = (overageMode ? totalOverage : totalCredits) * rate;
        var unalloc = groups['Unallocated'];
        var unallocCharge = unalloc ? unalloc.charge : 0;
        var variance = (state.invoiceTotal != null) ? (totalCharge - state.invoiceTotal) : null;
        return {
            groups: arr, overageMode: overageMode,
            totalCredits: totalCredits, totalOverage: totalOverage,
            totalCharge: totalCharge, totalConsumptionCost: totalCredits * rate,
            unallocCharge: unallocCharge, coverage: totalCharge > 0 ? (totalCharge - unallocCharge) / totalCharge : 1,
            invoiceTotal: state.invoiceTotal, variance: variance,
            variancePct: (variance != null && state.invoiceTotal) ? variance / state.invoiceTotal : null,
            absorbed: (overageMode && state.invoiceTotal != null) ? (state.invoiceTotal - totalCharge) : null,
            totalUsers: arr.reduce(function (a, g) { return a + g.users; }, 0)
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

    function metricCard(label, value, sub, accent) {
        return '<div class="metric-card ' + (accent || '') + '"><div class="metric-label">' + esc(label) + '</div>' +
            '<div class="metric-value">' + esc(value) + '</div><div class="metric-sublabel">' + esc(sub || '') + '</div></div>';
    }
    function renderSummary(m) {
        var el = $('cbSummary'); if (!el) return;
        var chargeSub = m.overageMode ? 'Overage x rate' : 'Full consumption x rate';
        var reconCard;
        if (m.overageMode) {
            var absAccent = m.absorbed == null ? '' : (m.absorbed > 0 ? 'accent-red' : 'accent-savings');
            reconCard = metricCard('Absorbed by org', m.absorbed != null ? fmtMoney(m.absorbed) : '--', m.absorbed != null ? 'Invoice minus overage chargeback' : 'Enter invoice to reconcile', absAccent);
        } else {
            var varAccent = m.variance == null ? '' : (Math.abs(m.variance) < 0.005 ? 'accent-savings' : 'accent-red');
            reconCard = metricCard('Variance vs invoice', m.variance != null ? ((m.variance >= 0 ? '+' : '') + fmtMoney(m.variance)) : '--', m.variancePct != null ? fmtPct(m.variancePct) : 'Enter invoice to reconcile', varAccent);
        }
        el.innerHTML = '<div class="metrics-grid">' +
            metricCard('Total credits', fmtInt(m.totalCredits), 'Consumed this period', '') +
            metricCard('Chargeback total', fmtMoney(m.totalCharge), chargeSub, 'accent-savings') +
            metricCard('Microsoft invoice', m.invoiceTotal != null ? fmtMoney(m.invoiceTotal) : '--', 'Entered for reconciliation', '') +
            reconCard +
            metricCard('Allocation coverage', fmtPct(m.coverage), 'Share mapped to a named unit', '') +
            metricCard('Unallocated', fmtMoney(m.unallocCharge), 'Charge to a catch-all GL', m.unallocCharge > 0 ? 'accent-red' : '') +
            '</div>';
    }
    function renderJournal(m) {
        var total = m.totalCharge || 1;
        var rows = m.groups.map(function (g) { return { label: g.label, users: g.users, credits: g.credits, overage: g.overage, charge: g.charge, pct: g.charge / total }; });
        rows = sortRows(rows, state.sortJournal.key, state.sortJournal.dir);
        var sc = state.sortJournal;
        var head = '<thead><tr>' + sortTh('journal', 'label', unitLabel() + ' (GL key)', false, sc) + sortTh('journal', 'users', 'Users', true, sc) + sortTh('journal', 'credits', 'Credits', true, sc) + sortTh('journal', 'overage', 'Overage cr', true, sc) + sortTh('journal', 'charge', 'Chargeback $', true, sc) + sortTh('journal', 'pct', '% of total', true, sc) + '</tr></thead>';
        var body = '<tbody>' + rows.map(function (g) {
            var un = g.label === 'Unallocated';
            return '<tr>' +
                '<td' + (un ? ' class="cell-over"' : '') + '>' + esc(g.label) + '</td>' +
                '<td class="num">' + fmtInt(g.users) + '</td>' +
                '<td class="num">' + fmtInt(g.credits) + '</td>' +
                '<td class="num">' + fmtInt(g.overage) + '</td>' +
                '<td class="num">' + fmtMoney(g.charge) + '</td>' +
                '<td class="num">' + fmtPct(g.pct) + '</td></tr>';
        }).join('');
        body += '<tr style="font-weight:700"><td>TOTAL</td><td class="num">' + fmtInt(m.totalUsers) + '</td><td class="num">' + fmtInt(m.totalCredits) + '</td><td class="num">' + fmtInt(m.totalOverage) + '</td><td class="num">' + fmtMoney(m.totalCharge) + '</td><td class="num">' + fmtPct(1) + '</td></tr></tbody>';
        var basisNote = m.overageMode
            ? 'Overage-only model: only credits above each unit allowance are charged at ' + fmtMoney(state.rate) + '/credit; the rest is absorbed by the org.'
            : 'Full-consumption model: every credit is charged to its ' + esc(unitLabel().toLowerCase()) + ' at ' + fmtMoney(state.rate) + '/credit, so the journal totals to 100% of the bill.';
        return '<section class="panel"><h3>Per-unit chargeback journal</h3><div class="table-wrap"><table>' + head + body + '</table></div><p class="section-caption">' + basisNote + ' Click a column to sort.</p></section>';
    }
    function renderLineItems(m) {
        var rate = state.rate, overageMode = m.overageMode;
        var rows = state.users.filter(function (u) {
            if (state.lineFilter === 'over') return u.used > u.limit;
            if (state.lineFilter === 'active') return u.used > 0;
            return true;
        }).map(function (u) {
            var over = Math.max(0, u.used - u.limit);
            return { upn: u.upn, name: u.displayName, unit: unitOf(u), credits: u.used, overage: over, charge: (overageMode ? over : u.used) * rate };
        });
        rows = sortRows(rows, state.sortLines.key, state.sortLines.dir);
        var LIMIT = 50, shown = rows.slice(0, LIMIT), sc = state.sortLines;
        var head = '<thead><tr>' + sortTh('lines', 'upn', 'User (MSID / UPN)', false, sc) + sortTh('lines', 'name', 'Display name', false, sc) + sortTh('lines', 'unit', unitLabel() + ' (GL)', false, sc) + sortTh('lines', 'credits', 'Credits', true, sc) + sortTh('lines', 'overage', 'Overage cr', true, sc) + sortTh('lines', 'charge', 'Chargeback $', true, sc) + '</tr></thead>';
        var body = '<tbody>' + shown.map(function (r) {
            return '<tr><td>' + esc(r.upn) + '</td><td>' + esc(r.name) + '</td><td>' + esc(r.unit) + '</td><td class="num">' + fmtInt(r.credits) + '</td><td class="num">' + fmtInt(r.overage) + '</td><td class="num">' + fmtMoney(r.charge) + '</td></tr>';
        }).join('') + '</tbody>';
        var note = rows.length > LIMIT ? 'Showing the top ' + LIMIT + ' of ' + fmtInt(rows.length) + ' matching users. The CSV export includes all users.' : fmtInt(rows.length) + ' users shown.';
        return '<section class="panel"><h3>Per-person line items</h3><div class="table-wrap"><table>' + head + body + '</table></div><p class="section-caption">' + note + ' Click a column to sort.</p></section>';
    }
    function render() {
        var m = computeChargeback();
        renderSummary(m);
        var body = $('cbBody'); if (body) body.innerHTML = renderJournal(m) + renderLineItems(m);
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
        rows.push(['Basis', m.overageMode ? 'Overage only' : 'Full consumption', 'Rate $/credit', state.rate.toFixed(4)]);
        rows.push([unitLabel() + ' (GL key)', 'Users', 'Credits', 'Overage credits', 'Chargeback $', '% of total']);
        m.groups.forEach(function (g) {
            rows.push([g.label, g.users, Math.round(g.credits), Math.round(g.overage), g.charge.toFixed(2), (m.totalCharge > 0 ? (g.charge / m.totalCharge * 100) : 0).toFixed(1)]);
        });
        rows.push(['TOTAL', m.totalUsers, Math.round(m.totalCredits), Math.round(m.totalOverage), m.totalCharge.toFixed(2), '100.0']);
        if (m.invoiceTotal != null) {
            rows.push([]);
            rows.push(['Microsoft invoice', '', '', '', m.invoiceTotal.toFixed(2)]);
            if (m.overageMode) rows.push(['Absorbed by org (invoice - chargeback)', '', '', '', m.absorbed.toFixed(2)]);
            else rows.push(['Variance (chargeback - invoice)', '', '', '', m.variance.toFixed(2)]);
        }
        downloadBlob(toCsv(rows), 'cowork-chargeback-journal' + demoSuffix() + '.csv');
    }
    function exportLineItemsCsv() {
        if (!state.users.length) { alert('Load data first.'); return; }
        var rate = state.rate, overageMode = state.basis === 'overage';
        var rows = stampRows();
        rows.push(['Basis', overageMode ? 'Overage only' : 'Full consumption', 'Rate $/credit', rate.toFixed(4)]);
        rows.push(['User Principal Name (MSID)', 'Display Name', 'Department', 'Cost Center', 'Business Unit', unitLabel() + ' (GL key)', 'Credits', 'Overage credits', 'Chargeback $']);
        state.users.slice().sort(function (a, b) { return b.used - a.used; }).forEach(function (u) {
            var over = Math.max(0, u.used - u.limit);
            rows.push([u.upn, u.displayName, u.department, u.costCenter, u.businessUnit, unitOf(u), Math.round(u.used), Math.round(over), ((overageMode ? over : u.used) * rate).toFixed(2)]);
        });
        downloadBlob(toCsv(rows), 'cowork-chargeback-line-items' + demoSuffix() + '.csv');
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
        state.demoActive = !!demo;
        var fb = $('fallbackLimit'); if (fb) { var fv = parseFloat(fb.value); state.fallbackLimit = isFinite(fv) && fv > 0 ? fv : 400; }
        readRate();
        state.entraRows = entraRows;
        state.users = buildUsers(entraRows, creditRows);
        if (!state.users.length) { showError('No users could be built. Check that the credit file has a user principal name column.'); return; }
        showReport();
    }
    function syncToggle(id, attr, val) {
        var t = $(id); if (!t) return;
        Array.prototype.forEach.call(t.querySelectorAll('.dim-btn'), function (b) { b.classList.toggle('active', b.getAttribute(attr) === val); });
    }
    function showReport() {
        $('cbLanding').hidden = true;
        $('cbReport').hidden = false;
        var banner = $('cbDemoBanner'); if (banner) banner.hidden = !state.demoActive;
        var stamp = $('cbStamp'); if (stamp) stamp.textContent = (state.demoActive ? 'Synthetic demo - ' : '') + 'Generated ' + new Date().toISOString().slice(0, 10) + ' - full-consumption chargeback at ' + fmtMoney(state.rate) + '/credit.';
        var rr = $('rateReport'); if (rr) rr.value = state.rate;
        populateDimSelect();
        syncToggle('cbBasisToggle', 'data-basis', state.basis);
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
        state.basis = 'full'; state.lineFilter = 'all'; state.unitDim = null; state.entraRows = [];
        state.sortJournal = { key: 'charge', dir: 'desc' }; state.sortLines = { key: 'charge', dir: 'desc' };
        $('statusEntra').textContent = 'No file selected'; $('statusCredits').textContent = 'No file selected';
        $('dzEntra').classList.remove('loaded'); $('dzCredits').classList.remove('loaded');
        $('fileEntra').value = ''; $('fileCredits').value = '';
        var clr = $('btnClearEntra'); if (clr) clr.hidden = true;
        var inv = $('invoiceInput'); if (inv) inv.value = '';
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
        var dimSel = $('cbDimSelect');
        if (dimSel) dimSel.addEventListener('change', function () { state.unitDim = dimSel.value; render(); });
        var basisTog = $('cbBasisToggle');
        if (basisTog) basisTog.addEventListener('click', function (ev) {
            var b = ev.target.closest ? ev.target.closest('.dim-btn') : null;
            if (!b || !b.getAttribute('data-basis')) return;
            state.basis = b.getAttribute('data-basis');
            Array.prototype.forEach.call(basisTog.querySelectorAll('.dim-btn'), function (x) { x.classList.toggle('active', x === b); });
            render();
        });
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
            var th = ev.target.closest ? ev.target.closest('th.sortable') : null;
            if (!th) return;
            var tbl = th.getAttribute('data-table'), key = th.getAttribute('data-sort');
            var st = tbl === 'lines' ? state.sortLines : state.sortJournal;
            var textKeys = { label: 1, upn: 1, name: 1, unit: 1 };
            if (st.key === key) { st.dir = st.dir === 'asc' ? 'desc' : 'asc'; }
            else { st.key = key; st.dir = textKeys[key] ? 'asc' : 'desc'; }
            render();
        });
        var ej = $('btnExportJournal'); if (ej) ej.addEventListener('click', exportJournalCsv);
        var el = $('btnExportLines'); if (el) el.addEventListener('click', exportLineItemsCsv);
        if (/[?&]demo=1\b/.test(location.search)) loadDemo();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
