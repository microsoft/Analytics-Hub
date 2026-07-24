/* tracker.js - Cowork Usage Tracker (100% client-side, ES5, no frameworks, no network).
   Slice 1: forced period-type choice -> ingest export(s) -> save checkpoints (IndexedDB)
   with a verbatim raw copy + derived roll-ups -> export / import a checkpoint bundle.
   Deltas, trends and forecasting build on top of this spine (next slices). */
(function () {
    'use strict';

    var PERIOD_LABEL = { MTD: 'Month to Date', LastMonth: 'Last Month', YTD: 'Year to Date' };

    var state = {
        periodType: null,
        pendingCredit: null,   // { rows, name, map }
        pendingEntra: null,    // { rows, names, map }
        checkpoints: [],
        sliceDim: null,        // active slice-by dimension in the trends view
        sliceVal: ''           // active value filter within sliceDim ('' = whole tenant)
    };

    // ---------------------------------------------------------------- helpers
    function $(id) { return document.getElementById(id); }
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function fmtInt(v) { return (Math.round(v) || 0).toLocaleString('en-US'); }
    function normUpn(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
    function toNumber(s) { if (s == null) return 0; var n = parseFloat(String(s).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; }
    function todayISO() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    function uuid() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return 'ck-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
    }

    // ---------------------------------------------------------------- CSV (reused)
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
        policy: ['billing policy', 'spending policy', 'copilot spending policy', 'credit policy', 'billingpolicy', 'policy'],
        lastActivity: ['last activity date', 'last activity', 'lastactivity'],
        sessions: ['session count', 'sessions', 'sessioncount']
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
        var get = function (map, row, field) { return map[field] ? String(row[map[field]] || '').trim() : ''; };
        var users = [];
        creditRows.forEach(function (crow) {
            var upn = normUpn(creditMap.upn ? crow[creditMap.upn] : '');
            if (!upn) return;
            var erow = byUpn[upn] || {};
            users.push({
                upn: upn,
                displayName: get(creditMap, crow, 'displayName') || get(entraMap, erow, 'displayName') || upn,
                department: get(entraMap, erow, 'department') || 'Unknown',
                costCenter: get(entraMap, erow, 'costCenter') || 'Unknown',
                businessUnit: get(entraMap, erow, 'businessUnit') || 'Unknown',
                jobTitle: get(entraMap, erow, 'jobTitle') || '',
                policy: get(creditMap, crow, 'policy') || get(entraMap, erow, 'policy') || 'Unassigned',
                used: creditMap.creditsUsed ? toNumber(crow[creditMap.creditsUsed]) : 0,
                limit: creditMap.creditLimit ? toNumber(crow[creditMap.creditLimit]) : 0,
                lastActivity: get(creditMap, crow, 'lastActivity'),
                sessions: creditMap.sessions ? toNumber(crow[creditMap.sessions]) : null
            });
        });
        return { users: users, creditMap: creditMap, entraMap: entraMap };
    }

    // Bin a per-user credit limit into a named engagement tier (round demo caps).
    function tierByLimit(limit) {
        if (limit >= 175000) return 'Frontier';
        if (limit >= 55000) return 'Power delegator';
        if (limit >= 30000) return 'Cowork-native';
        if (limit >= 15000) return 'Highly engaged';
        if (limit >= 6000) return 'Regular';
        if (limit >= 1000) return 'Light';
        return 'Unassigned';
    }

    function deriveRollups(users) {
        var t = { totalUsed: 0, totalLimit: 0, userCount: users.length, activeUsers: 0, byDept: {}, byPolicy: {}, dims: {}, dimList: [] };
        var DIMS = [
            { key: 'Department', get: function (u) { return u.department || 'Unknown'; } },
            { key: 'Business Unit', get: function (u) { return u.businessUnit || 'Unknown'; } },
            { key: 'Cost Center', get: function (u) { return u.costCenter || 'Unknown'; } },
            { key: 'Job Title', get: function (u) { return u.jobTitle || 'Unknown'; } },
            { key: 'Engagement tier', get: function (u) { return (u.policy && u.policy !== 'Unassigned') ? u.policy : tierByLimit(u.limit); } }
        ];
        DIMS.forEach(function (dm) { t.dims[dm.key] = {}; });
        users.forEach(function (u) {
            t.totalUsed += u.used; t.totalLimit += u.limit;
            if (u.used > 0) t.activeUsers++;
            DIMS.forEach(function (dm) {
                var g = dm.get(u), bucket = t.dims[dm.key];
                if (!bucket[g]) bucket[g] = { used: 0, limit: 0, count: 0 };
                bucket[g].used += u.used; bucket[g].limit += u.limit; bucket[g].count++;
            });
        });
        t.byDept = t.dims['Department'];
        t.byPolicy = t.dims['Engagement tier'];
        // a dimension is offered only when it separates the data into 2+ real groups
        DIMS.forEach(function (dm) {
            var keys = Object.keys(t.dims[dm.key]).filter(function (k) { return k && k !== 'Unknown'; });
            if (keys.length >= 2 || (keys.length >= 1 && dm.key === 'Engagement tier')) t.dimList.push(dm.key);
        });
        if (!t.dimList.length) t.dimList = ['Department'];
        return t;
    }

    // ---------------------------------------------------------------- IndexedDB
    var DB_NAME = 'cowork-usage-tracker', STORE = 'checkpoints';
    function openDB() {
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = function (e) {
                var db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }
    function idbTx(mode, fn) {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx = db.transaction(STORE, mode), store = tx.objectStore(STORE), out;
                out = fn(store);
                tx.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
                tx.onerror = function () { reject(tx.error); };
                tx.onabort = function () { reject(tx.error); };
            });
        });
    }
    function idbPut(rec) { return idbTx('readwrite', function (s) { return s.put(rec); }); }
    function idbDelete(id) { return idbTx('readwrite', function (s) { return s.delete(id); }); }
    function idbClear() { return idbTx('readwrite', function (s) { return s.clear(); }); }
    function idbGetAll() {
        return openDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var out = [], tx = db.transaction(STORE, 'readonly'), s = tx.objectStore(STORE);
                var req = s.openCursor();
                req.onsuccess = function (e) { var c = e.target.result; if (c) { out.push(c.value); c.continue(); } else resolve(out); };
                req.onerror = function () { reject(req.error); };
            });
        });
    }

    // ---------------------------------------------------------------- period choice
    function selectPeriod(pt) {
        state.periodType = pt;
        var cards = document.querySelectorAll('#utPeriods .ut-period');
        for (var i = 0; i < cards.length; i++) cards[i].classList.toggle('selected', cards[i].getAttribute('data-period') === pt);
        $('utChosenText').textContent = PERIOD_LABEL[pt];
        $('utChosenBadge').classList.add('show');
        $('utStep2').classList.remove('locked');
        $('utStep3').classList.remove('locked');
        refreshSaveEnabled();
    }
    function changePeriod() {
        // let the user re-pick; existing checkpoints keep their own stamped type.
        $('utStep2').classList.add('locked');
        $('utStep3').classList.remove('locked'); // keep history visible
    }

    // ---------------------------------------------------------------- file wiring
    function wireDrop(zoneId, inputId, multiple, onFiles) {
        var zone = $(zoneId), input = $(inputId);
        zone.addEventListener('click', function (e) { if (e.target.tagName !== 'BUTTON') input.click(); });
        input.addEventListener('change', function () { if (input.files && input.files.length) onFiles(input.files); });
        ['dragenter', 'dragover'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.add('drag'); }); });
        ['dragleave', 'drop'].forEach(function (ev) { zone.addEventListener(ev, function (e) { e.preventDefault(); zone.classList.remove('drag'); }); });
        zone.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files; if (f && f.length) onFiles(f); });
    }
    function readText(file) {
        return new Promise(function (resolve, reject) {
            var fr = new FileReader();
            fr.onload = function () { resolve(String(fr.result || '')); };
            fr.onerror = function () { reject(fr.error); };
            fr.readAsText(file);
        });
    }

    function onCreditFile(files) {
        var file = files[0];
        readText(file).then(function (txt) {
            var rows = parseCSV(txt);
            state.pendingCredit = { rows: rows, name: file.name, map: resolveColumns(rows.length ? Object.keys(rows[0]) : []) };
            $('statusCredits').textContent = file.name + ' \u2014 ' + fmtInt(rows.length) + ' rows';
            refreshSaveEnabled();
        });
    }
    function onEntraFiles(files) {
        var arr = Array.prototype.slice.call(files);
        Promise.all(arr.map(readText)).then(function (texts) {
            var rows = [], names = [];
            texts.forEach(function (t, i) { var r = parseCSV(t); rows = rows.concat(r); names.push(arr[i].name); });
            state.pendingEntra = { rows: rows, names: names, map: resolveColumns(rows.length ? Object.keys(rows[0]) : []) };
            $('statusEntra').textContent = names.join(', ') + ' \u2014 ' + fmtInt(rows.length) + ' rows';
            $('btnClearEntra').hidden = false;
            refreshSaveEnabled();
        });
    }
    function clearEntra() {
        state.pendingEntra = null; $('fileEntra').value = '';
        $('statusEntra').textContent = 'No file selected'; $('btnClearEntra').hidden = true;
    }

    function refreshSaveEnabled() {
        $('btnSaveCk').disabled = !(state.periodType && state.pendingCredit && state.pendingCredit.rows.length);
    }
    function showError(msg) { var e = $('utError'); if (!msg) { e.hidden = true; return; } e.hidden = false; e.textContent = msg; }

    // ---------------------------------------------------------------- checkpoints
    function saveCheckpoint() {
        showError('');
        if (!state.periodType) { showError('Choose an export period first.'); return; }
        if (!state.pendingCredit || !state.pendingCredit.rows.length) { showError('Load a Copilot credit export first.'); return; }

        // Entra rarely changes: reuse the most recent stored Entra if none provided this time.
        var entraRows = state.pendingEntra ? state.pendingEntra.rows : [];
        var entraNames = state.pendingEntra ? state.pendingEntra.names : [];
        if (!entraRows.length && state.checkpoints.length) {
            var prev = state.checkpoints.slice().sort(byAsOfDesc).filter(function (c) { return c.rawEntra && c.rawEntra.length; })[0];
            if (prev) { entraRows = prev.rawEntra; entraNames = (prev.entraFileNames || []).map(function (n) { return n + ' (reused)'; }); }
        }

        var built = buildUsers(entraRows, state.pendingCredit.rows);
        if (!built.users.length) { showError('No user rows resolved from the credit export. Check the file has a User Principal Name column.'); return; }

        var asOf = $('asOfDate').value || todayISO();
        var label = ($('ckLabel').value || '').trim() || (PERIOD_LABEL[state.periodType] + ' \u2014 ' + asOf);
        var rec = {
            id: uuid(),
            createdAt: new Date().toISOString(),
            asOf: asOf,
            label: label,
            periodType: state.periodType,
            creditFileName: state.pendingCredit.name,
            entraFileNames: entraNames,
            columnMap: { credit: state.pendingCredit.map, entra: built.entraMap },
            rawCredit: state.pendingCredit.rows,   // verbatim, lossless
            rawEntra: entraRows,                    // verbatim
            users: built.users,                     // derived join
            derived: deriveRollups(built.users)     // roll-ups for fast future deltas
        };
        idbPut(rec).then(function () {
            $('ckLabel').value = '';
            $('statusCredits').textContent = 'No file selected';
            state.pendingCredit = null; $('fileCredits').value = '';
            refreshSaveEnabled();
            return loadCheckpoints();
        }).then(function () {
            // Jump to the payoff: open Trends & forecast when it is available,
            // otherwise scroll to the checkpoint history (one more unlocks trends).
            var btn = $('btnViewTrends');
            if (btn && !btn.disabled) { showTrends(); }
            else { var el = $('utStep3'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }).catch(function (err) { showError('Could not save checkpoint: ' + (err && err.message || err)); });
    }

    function byAsOfDesc(a, b) { return (a.asOf < b.asOf) ? 1 : (a.asOf > b.asOf ? -1 : 0); }
    function byAsOfAsc(a, b) { return (a.asOf > b.asOf) ? 1 : (a.asOf < b.asOf ? -1 : 0); }

    function loadCheckpoints() {
        return idbGetAll().then(function (list) {
            state.checkpoints = list || [];
            // History is independent of the current period choice: show it whenever
            // checkpoints exist so returning visitors see their saved data. The forced
            // period choice only gates saving a NEW checkpoint (Step 2).
            if (state.checkpoints.length) $('utStep3').classList.remove('locked');
            renderCheckpoints();
        });
    }

    function renderCheckpoints() {
        var host = $('utCkList');
        var list = state.checkpoints.slice().sort(byAsOfAsc);
        if (!list.length) { host.innerHTML = '<p class="ut-empty">No checkpoints yet. Load an export above and save your first checkpoint.</p>'; updateTrendsButton(); return; }

        var byType = {};
        list.forEach(function (c) { byType[c.periodType] = (byType[c.periodType] || 0) + 1; });
        var typeNote = Object.keys(byType).length > 1
            ? '<p class="ut-mismatch">Heads up: your history mixes ' + Object.keys(byType).map(function (k) { return byType[k] + ' ' + PERIOD_LABEL[k]; }).join(' + ') + '. Trends only compare same-type checkpoints.</p>'
            : '';

        var rows = list.map(function (c) {
            var d = c.derived || {};
            return '<tr>' +
                '<td>' + esc(c.asOf) + '</td>' +
                '<td>' + esc(c.label) + '</td>' +
                '<td><span class="ut-pill ' + c.periodType + '">' + esc(PERIOD_LABEL[c.periodType]) + '</span></td>' +
                '<td class="num">' + fmtInt(d.userCount || (c.users ? c.users.length : 0)) + '</td>' +
                '<td class="num">' + fmtInt(d.totalUsed || 0) + '</td>' +
                '<td class="num">' + fmtInt(Object.keys(d.byDept || {}).length) + '</td>' +
                '<td style="text-align:right;"><button type="button" class="ut-ck-del" data-id="' + esc(c.id) + '">Delete</button></td>' +
                '</tr>';
        }).join('');

        host.innerHTML = typeNote +
            '<table class="ut-cktable"><thead><tr>' +
            '<th>As of</th><th>Label</th><th>Period</th><th class="num">Users' + infoDot('Distinct users resolved from this checkpoint credit export.') + '</th><th class="num">Credits used' + infoDot('Total credits consumed as of this checkpoint - the period-to-date figure from the export.') + '</th><th class="num">Depts' + infoDot('Number of departments represented in this checkpoint.') + '</th><th></th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>';

        var dels = host.querySelectorAll('.ut-ck-del');
        for (var i = 0; i < dels.length; i++) {
            dels[i].addEventListener('click', function () {
                var id = this.getAttribute('data-id');
                idbDelete(id).then(loadCheckpoints);
            });
        }
        updateTrendsButton();
    }

    function updateTrendsButton() {
        var btn = $('btnViewTrends');
        var byType = {};
        state.checkpoints.forEach(function (c) { byType[c.periodType] = (byType[c.periodType] || 0) + 1; });
        var best = 0, bestType = null;
        Object.keys(byType).forEach(function (k) { if (byType[k] > best) { best = byType[k]; bestType = k; } });
        if (best >= 2) {
            btn.disabled = false;
            btn.title = 'Ready: ' + best + ' ' + PERIOD_LABEL[bestType] + ' checkpoints. Trend + forecast view arrives in the next update.';
        } else {
            btn.disabled = true;
            btn.title = 'Save two or more checkpoints of the same period to unlock';
        }
    }

    // ---------------------------------------------------------------- bundle export / import
    function exportBundle() {
        if (!state.checkpoints.length) { alert('No checkpoints to export yet.'); return; }
        var bundle = {
            schema: 'cowork-usage-tracker/bundle',
            version: 1,
            exportedAt: new Date().toISOString(),
            checkpointCount: state.checkpoints.length,
            checkpoints: state.checkpoints
        };
        var blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'cowork-usage-checkpoints-' + todayISO() + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 500);
    }
    function importBundle(files) {
        var file = files[0];
        readText(file).then(function (txt) {
            var bundle;
            try { bundle = JSON.parse(txt); } catch (e) { alert('That file is not valid JSON.'); return; }
            if (!bundle || String(bundle.schema || '').indexOf('cowork-usage-tracker') !== 0 || !Array.isArray(bundle.checkpoints)) {
                alert('That does not look like a Cowork Usage Tracker bundle.'); return;
            }
            var existing = {}; state.checkpoints.forEach(function (c) { existing[c.id] = true; });
            var incoming = bundle.checkpoints.filter(function (c) { return c && c.id; });
            var added = 0;
            var chain = Promise.resolve();
            incoming.forEach(function (c) { chain = chain.then(function () { if (!existing[c.id]) { added++; return idbPut(c); } }); });
            chain.then(loadCheckpoints).then(function () {
                alert('Imported ' + added + ' new checkpoint(s). ' + (incoming.length - added) + ' already present.');
            });
        });
    }
    function clearAll() {
        if (!state.checkpoints.length) return;
        if (!confirm('Delete all ' + state.checkpoints.length + ' checkpoint(s) from this browser? Export a bundle first if you want a backup.')) return;
        idbClear().then(loadCheckpoints);
    }

    // ---------------------------------------------------------------- trends (Slice 2)
    // Delta engine: reconstructs the missing time series from point-in-time
    // checkpoints. MTD reset-detect + chaining, Last-Month month-over-month, YTD
    // pacing. Department roll-ups, run-rate forecast and pool-exhaustion date.
    var RATE_DEFAULT = 0.01;
    if (state.rate == null) state.rate = RATE_DEFAULT;

    function ymKey(iso) { return String(iso || '').slice(0, 7); }
    function parseISO(iso) { var p = String(iso).split('-'); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
    function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
    function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
    function dayOfYear(d) { var s = new Date(d.getFullYear(), 0, 0); return Math.round((d - s) / 86400000); }
    function fmtMoney(v) { return '$' + fmtInt(v); }
    function fmtPct(v) { return (isFinite(v) ? (v * 100).toFixed(1) : '0') + '%'; }
    function fmtCompact(v) {
        v = Math.round(v || 0);
        if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
        if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(1) + 'K';
        return String(v);
    }
    function fmtDate(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
    function signed(v) { return (v >= 0 ? '+' : '\u2212') + fmtCompact(Math.abs(v)); }

    function dominantType() {
        var byType = {};
        state.checkpoints.forEach(function (c) { byType[c.periodType] = (byType[c.periodType] || 0) + 1; });
        var best = 0, bestType = null;
        Object.keys(byType).forEach(function (k) { if (byType[k] > best) { best = byType[k]; bestType = k; } });
        return bestType;
    }

    function computeTrends() {
        var type = dominantType();
        if (!type) return null;
        var series = state.checkpoints.filter(function (c) { return c.periodType === type; }).sort(byAsOfAsc);
        if (series.length < 2) return null;
        var rate = state.rate;

        var pts = series.map(function (c) {
            var d = c.derived || {};
            var dims = d.dims || { 'Department': d.byDept || {}, 'Engagement tier': d.byPolicy || {} };
            return {
                asOf: c.asOf, date: parseISO(c.asOf), label: c.label, monthKey: ymKey(c.asOf),
                allUsed: d.totalUsed || 0, allPool: d.totalLimit || 0, allUsers: d.userCount || 0,
                dims: dims, byDept: d.byDept || {}
            };
        });

        // available slice dimensions come from the latest checkpoint
        var latestDerived = series[series.length - 1].derived || {};
        var dimList = latestDerived.dimList || ['Department'];
        if (!state.sliceDim || dimList.indexOf(state.sliceDim) < 0) state.sliceDim = dimList[0];
        var sliceDim = state.sliceDim;
        var gk = {};
        pts.forEach(function (p) { var gg = p.dims[sliceDim] || {}; Object.keys(gg).forEach(function (k) { gk[k] = 1; }); });
        var groupVals = Object.keys(gk).sort();
        if (state.sliceVal && groupVals.indexOf(state.sliceVal) < 0) state.sliceVal = '';
        var filterVal = state.sliceVal;

        // resolve each point's used/pool/users under the active filter (a group, or whole tenant)
        pts.forEach(function (p) {
            if (filterVal) {
                var g = (p.dims[sliceDim] || {})[filterVal] || { used: 0, limit: 0, count: 0 };
                p.used = g.used; p.pool = g.limit; p.users = g.count;
            } else {
                p.used = p.allUsed; p.pool = p.allPool; p.users = p.allUsers;
            }
        });

        // incremental burn between checkpoints, with MTD/YTD reset detection + chaining
        var i;
        for (i = 0; i < pts.length; i++) {
            if (i === 0) { pts[i].inc = pts[i].used; pts[i].reset = false; continue; }
            var prev = pts[i - 1], cur = pts[i];
            var reset = (type !== 'LastMonth') && (cur.monthKey !== prev.monthKey || cur.used < prev.used);
            cur.reset = reset;
            cur.inc = (type === 'LastMonth' || reset) ? cur.used : (cur.used - prev.used);
        }

        var latest = pts[pts.length - 1];
        var y = latest.date.getFullYear(), m = latest.date.getMonth();
        var fc = { type: type, pool: latest.pool };
        if (type === 'MTD') {
            var dm = daysInMonth(y, m), dom = latest.date.getDate();
            fc.dayOf = dom; fc.daysIn = dm;
            fc.runRate = latest.used / dom;
            fc.projected = Math.round(fc.runRate * dm);
            fc.periodStart = new Date(y, m, 1); fc.periodEnd = new Date(y, m, dm);
            fc.periodLabel = 'month-end';
        } else if (type === 'YTD') {
            var doy = dayOfYear(latest.date), diy = isLeap(y) ? 366 : 365;
            fc.dayOf = doy; fc.daysIn = diy;
            fc.runRate = latest.used / doy;
            fc.projected = Math.round(fc.runRate * diy);
            fc.periodStart = new Date(y, 0, 1); fc.periodEnd = new Date(y, 11, 31);
            fc.periodLabel = 'year-end';
        } else {
            var g2 = [], j;
            for (j = 1; j < pts.length; j++) { if (pts[j - 1].used > 0) g2.push(pts[j].used / pts[j - 1].used - 1); }
            fc.momGrowth = g2.length ? g2.reduce(function (a, b) { return a + b; }, 0) / g2.length : 0;
            fc.projected = Math.round(latest.used * (1 + fc.momGrowth));
            fc.runRate = latest.used / daysInMonth(y, m);
            fc.dayOf = null; fc.daysIn = null; fc.periodLabel = 'next month';
        }
        fc.utilNow = latest.pool ? latest.used / latest.pool : 0;
        fc.projUtil = latest.pool ? fc.projected / latest.pool : 0;
        fc.headroom = latest.pool - fc.projected;
        fc.rate = rate;
        fc.projectedCost = fc.projected * rate;
        fc.runRateCost = fc.runRate * rate;
        fc.latestBurn = latest.inc;
        fc.latestBurnCost = latest.inc * rate;
        fc.exhaustDate = null;
        if ((type === 'MTD' || type === 'YTD') && fc.runRate > 0 && fc.periodStart) {
            var ed = new Date(fc.periodStart.getTime());
            ed.setDate(ed.getDate() + Math.round(fc.pool / fc.runRate));
            fc.exhaustDate = (ed <= fc.periodEnd) ? ed : null; // null means covered through period end
        }

        // breakdown groups for the active slice dimension
        var groups = groupVals.map(function (key) {
            var su = pts.map(function (p) { return ((p.dims[sliceDim] || {})[key] || {}).used || 0; });
            var last = (latest.dims[sliceDim] || {})[key] || { used: 0, limit: 0, count: 0 };
            var lastU = su[su.length - 1], firstU = su[0];
            var proj;
            if ((type === 'MTD' || type === 'YTD') && fc.dayOf) proj = Math.round(lastU / fc.dayOf * fc.daysIn);
            else proj = Math.round(lastU * (1 + (fc.momGrowth || 0)));
            var burn = su.length >= 2 ? (su[su.length - 1] - su[su.length - 2]) : lastU;
            if (burn < 0) burn = lastU;
            return {
                name: key, series: su, used: lastU, limit: last.limit || 0, count: last.count || 0,
                delta: lastU - firstU, projected: proj, util: last.limit ? lastU / last.limit : 0,
                burn: burn, burnCost: burn * rate
            };
        }).sort(function (a, b) { return b.used - a.used; });

        return {
            type: type, points: pts, fc: fc, groups: groups, depts: groups, latest: latest,
            dimList: dimList, sliceDim: sliceDim, groupVals: groupVals, filterVal: filterVal
        };
    }

    // Turn the numbers into a short, prioritized list of what to act on (most urgent first).
    function computeSignals(t) {
        var fc = t.fc, rate = state.rate, sigs = [];
        var periodEnd = fc.periodLabel;
        if (fc.exhaustDate) {
            var short = Math.max(0, fc.projected - fc.pool);
            sigs.push({ sev: 'alert', pri: 0,
                title: 'Allowance runs out before ' + periodEnd,
                detail: 'At today run-rate the pool is exhausted on ' + fmtDate(fc.exhaustDate) + '. Projected overrun ' + fmtCompact(short) + ' cr (' + fmtMoney(Math.round(short * rate)) + '). Buy credits or raise allowances now.',
                actLabel: 'See the burn trend', act: { type: 'scroll' } });
        } else if (fc.pool > 0 && fc.projUtil < 0.6) {
            var idle = Math.round(fc.pool - fc.projected);
            sigs.push({ sev: 'ok', pri: 2,
                title: 'You are over-provisioned',
                detail: 'Projected utilization is only ' + fmtPct(fc.projUtil) + '. About ' + fmtCompact(idle) + ' cr (' + fmtMoney(Math.round(idle * rate)) + ') of allowance looks idle \u2014 reclaim or reallocate it.',
                actLabel: 'Find under-used groups', act: { type: 'under' } });
        } else {
            sigs.push({ sev: 'ok', pri: 3,
                title: 'On track through ' + periodEnd,
                detail: 'Projected ' + fmtCompact(fc.projected) + ' cr against ' + fmtCompact(fc.pool) + ' cr provisioned \u2014 ' + fmtCompact(Math.abs(fc.headroom)) + ' cr headroom at ' + fmtPct(fc.projUtil) + ' utilization.',
                actLabel: null, act: null });
        }
        var over = t.groups.filter(function (g) { return g.util > 1; });
        if (over.length && !t.filterVal) {
            var worst = over[0];
            var nm = over.slice(0, 3).map(function (g) { return g.name; }).join(', ') + (over.length > 3 ? '\u2026' : '');
            sigs.push({ sev: 'warn', pri: 1,
                title: over.length + ' ' + t.sliceDim.toLowerCase() + (over.length > 1 ? ' groups are' : ' is') + ' over allowance',
                detail: nm + '. Right-size the allowance or investigate the spike before it turns into support tickets.',
                actLabel: 'Focus on ' + worst.name, act: { type: 'filter', val: worst.name } });
        }
        var total = t.groups.reduce(function (a, g) { return a + g.used; }, 0);
        if (t.groups.length && total > 0 && !t.filterVal) {
            var top = t.groups[0], share = top.used / total;
            if (share >= 0.25) {
                sigs.push({ sev: 'info', pri: 2,
                    title: top.name + ' drives ' + fmtPct(share) + ' of consumption',
                    detail: 'The heaviest ' + t.sliceDim.toLowerCase() + ' is ' + fmtCompact(top.used) + ' cr of ' + fmtCompact(total) + '. Concentrated usage is where optimization pays off first.',
                    actLabel: 'Drill into ' + top.name, act: { type: 'filter', val: top.name } });
            }
        }
        if (t.points.length >= 3) {
            var rc = t.points[t.points.length - 1].inc, pr = t.points[t.points.length - 2].inc;
            if (pr > 0 && rc > pr * 1.15) {
                sigs.push({ sev: 'warn', pri: 1,
                    title: 'Burn is accelerating (+' + Math.round((rc / pr - 1) * 100) + '% last window)',
                    detail: 'Latest burn ' + fmtCompact(rc) + ' cr vs ' + fmtCompact(pr) + ' cr the window before. If it holds you will land above the straight-line forecast \u2014 budget for it.',
                    actLabel: 'See the burn chart', act: { type: 'scroll' } });
            }
        }
        sigs.sort(function (a, b) { return a.pri - b.pri; });
        return sigs;
    }

    function renderSignals(sigs) {
        if (!sigs.length) return '';
        var cards = sigs.slice(0, 4).map(function (s, idx) {
            var act = s.actLabel ? '<button type="button" class="ut-sig-act" data-sig="' + idx + '">' + esc(s.actLabel) + ' \u2192</button>' : '';
            return '<div class="ut-signal ut-sig-' + s.sev + '"><div class="ut-sig-title">' + esc(s.title) + '</div>' +
                '<div class="ut-sig-detail">' + esc(s.detail) + '</div>' + act + '</div>';
        }).join('');
        return '<div class="ut-signals"><div class="ut-signals-head">What to act on this period' +
            infoDot('Plain-language signals read from your checkpoints, most urgent first. Each action jumps you to the view that helps you act on it.') +
            '</div><div class="ut-signal-grid">' + cards + '</div></div>';
    }

    // ---- inline SVG charts (no libraries) ----
    function svgTrend(pts, w, h) {
        var AXW = 50, BOT = 20, TOP = 8, RGT = 8;
        var x0 = AXW, x1 = w - RGT, y0 = TOP, y1 = h - BOT, iw = x1 - x0, ih = y1 - y0;
        var maxV = 1; pts.forEach(function (p) { maxV = Math.max(maxV, p.used, p.pool); });
        var n = pts.length, rate = state.rate;
        var x = function (i) { return x0 + (n <= 1 ? iw / 2 : iw * i / (n - 1)); };
        var yv = function (v) { return y0 + ih - ih * (v / maxV); };
        function path(sel) {
            var d = '';
            for (var i = 0; i < n; i++) { d += (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + yv(sel(pts[i])).toFixed(1) + ' '; }
            return d;
        }
        var usedPath = path(function (p) { return p.used; });
        var poolPath = path(function (p) { return p.pool; });
        var area = usedPath + 'L' + x(n - 1).toFixed(1) + ' ' + y1 + ' L' + x(0).toFixed(1) + ' ' + y1 + ' Z';
        var grid = '', ticks = 4, ti;
        for (ti = 0; ti <= ticks; ti++) {
            var val = maxV * ti / ticks, gy = yv(val);
            grid += '<line x1="' + x0 + '" y1="' + gy.toFixed(1) + '" x2="' + x1 + '" y2="' + gy.toFixed(1) + '" class="ut-grid"/>';
            grid += '<text x="' + (x0 - 6) + '" y="' + (gy + 3).toFixed(1) + '" class="ut-axl" text-anchor="end">' + esc(fmtCompact(val)) + '</text>';
        }
        var dots = '', xl = '';
        for (var i = 0; i < n; i++) {
            var cx = x(i), cy = yv(pts[i].used);
            var tip = '<strong>' + esc(pts[i].asOf) + '</strong>' +
                '<br>Credits used: ' + fmtInt(pts[i].used) +
                '<br>Users: ' + fmtInt(pts[i].users) +
                '<br>Allowance: ' + fmtInt(pts[i].pool) +
                '<br>Utilization: ' + fmtPct(pts[i].pool ? pts[i].used / pts[i].pool : 0) +
                '<br>Burn since prior: ' + fmtInt(pts[i].inc) + ' (' + fmtMoney(Math.round(pts[i].inc * rate)) + ')';
            dots += '<circle class="ut-pt" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4" fill="#4A9EF7" data-tip="' + esc(tip) + '"/>';
            xl += '<text x="' + cx.toFixed(1) + '" y="' + (h - 6) + '" class="ut-axl" text-anchor="middle">' + esc(pts[i].asOf.slice(5)) + '</text>';
        }
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Usage versus provisioned allowance over time">' +
            '<defs><linearGradient id="utFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A9EF7" stop-opacity="0.35"/><stop offset="1" stop-color="#4A9EF7" stop-opacity="0.02"/></linearGradient></defs>' +
            grid +
            '<path d="' + area + '" fill="url(#utFill)" stroke="none"/>' +
            '<path d="' + poolPath + '" fill="none" stroke="#F59E0B" stroke-width="2" stroke-dasharray="5 4"/>' +
            '<path d="' + usedPath + '" fill="none" stroke="#4A9EF7" stroke-width="2.5"/>' + dots + xl + '</svg>';
    }
    function sparkline(series, w, h) {
        var pad = 2, iw = w - pad * 2, ih = h - pad * 2, maxV = 1, i;
        for (i = 0; i < series.length; i++) maxV = Math.max(maxV, series[i]);
        var n = series.length, d = '';
        for (i = 0; i < n; i++) {
            var x = pad + (n <= 1 ? iw / 2 : iw * i / (n - 1));
            var yv = pad + ih - ih * (series[i] / maxV);
            d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + yv.toFixed(1) + ' ';
        }
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" class="ut-spark" preserveAspectRatio="none"><path d="' + d + '" fill="none" stroke="#00D4FF" stroke-width="1.6"/></svg>';
    }
    function burnBars(pts, w, h) {
        var AXW = 50, BOT = 20, TOP = 8, RGT = 8;
        var x0 = AXW, x1 = w - RGT, y0 = TOP, y1 = h - BOT, iw = x1 - x0, ih = y1 - y0;
        var maxV = 1, i, rate = state.rate;
        for (i = 0; i < pts.length; i++) maxV = Math.max(maxV, pts[i].inc);
        var n = pts.length, gap = iw / n, bw = gap * 0.6;
        var grid = '', ticks = 4, ti;
        for (ti = 0; ti <= ticks; ti++) {
            var val = maxV * ti / ticks, gy = y0 + ih - ih * (val / maxV);
            grid += '<line x1="' + x0 + '" y1="' + gy.toFixed(1) + '" x2="' + x1 + '" y2="' + gy.toFixed(1) + '" class="ut-grid"/>';
            grid += '<text x="' + (x0 - 6) + '" y="' + (gy + 3).toFixed(1) + '" class="ut-axl" text-anchor="end">' + esc(fmtCompact(val)) + '</text>';
        }
        var bars = '', xl = '';
        for (i = 0; i < n; i++) {
            var bh = ih * (pts[i].inc / maxV);
            var bx = x0 + gap * i + (gap - bw) / 2, by = y0 + ih - bh;
            var winDays = i === 0 ? 0 : Math.max(1, Math.round((pts[i].date - pts[i - 1].date) / 86400000));
            var tip = '<strong>' + esc(pts[i].asOf) + '</strong>' +
                '<br>Burn since prior: ' + fmtInt(pts[i].inc) + ' cr' +
                '<br>Burn cost: ' + fmtMoney(Math.round(pts[i].inc * rate)) +
                (winDays ? '<br>Window: ' + winDays + ' days' : '') +
                (winDays ? '<br>Daily burn: ' + fmtInt(Math.round(pts[i].inc / winDays)) + ' cr/day (' + fmtMoney(Math.round(pts[i].inc / winDays * rate)) + '/day)' : '');
            bars += '<rect class="ut-bar" x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(0, bh).toFixed(1) + '" rx="2" fill="#34D399" data-tip="' + esc(tip) + '"/>';
            xl += '<text x="' + (bx + bw / 2).toFixed(1) + '" y="' + (h - 6) + '" class="ut-axl" text-anchor="middle">' + esc(pts[i].asOf.slice(5)) + '</text>';
        }
        return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Incremental burn per checkpoint">' + grid + bars + xl + '</svg>';
    }

    function infoDot(tip) {
        return tip ? ' <span class="metric-info" tabindex="0" aria-label="' + esc(tip) + '">?<span class="metric-tip">' + esc(tip) + '</span></span>' : '';
    }
    function fcCard(k, v, sub, cls, tip) {
        return '<div class="ut-fc ' + (cls || '') + '"><div class="ut-fc-k">' + esc(k) + infoDot(tip) + '</div><div class="ut-fc-v">' + v + '</div>' +
            (sub ? '<div class="ut-fc-s">' + sub + '</div>' : '') + '</div>';
    }

    function renderTrends() {
        var host = $('utTrendsBody');
        var t = computeTrends();
        if (!t) { host.innerHTML = '<p class="ut-empty">Save two or more checkpoints of the same period type to unlock trends.</p>'; return; }
        var fc = t.fc, latest = t.latest, rate = state.rate;
        var typeLabel = PERIOD_LABEL[t.type];
        var sigs = computeSignals(t);

        // forecast cards
        var cards = '';
        cards += fcCard('Projected consumption (' + fc.periodLabel + ')', fmtCompact(fc.projected) + ' cr',
            fmtInt(fc.projected) + ' credits at current run-rate', '',
            'Run-rate x days in the period. Run-rate = credits used so far / days elapsed. A straight-line projection to ' + fc.periodLabel + ', not a promise.');
        cards += fcCard('Projected cost (' + fc.periodLabel + ')', fmtMoney(Math.round(fc.projected * rate)),
            'at $' + rate + '/credit', '',
            'Projected credits x your rate ($' + rate + ' per credit). Edit the rate field to recompute.');
        cards += fcCard('Provisioned allowance', fmtCompact(fc.pool) + ' cr',
            fmtInt(fc.pool) + ' credits committed', '',
            'Total credits committed across the org this period - the sum of every user allowance cap. Your ceiling before buying more.');
        var hr = fc.headroom;
        cards += fcCard('Headroom vs projection', (hr >= 0 ? '' : '\u2212') + fmtCompact(Math.abs(hr)) + ' cr',
            hr >= 0 ? 'allowance covers the forecast' : 'projected overage \u2014 raise allowance',
            hr >= 0 ? 'ut-ok' : 'ut-warn',
            'Provisioned allowance minus projected consumption. Positive means the allowance covers the forecast; negative means you are on track to overspend.');
        if (fc.exhaustDate) {
            cards += fcCard('Pool-exhaustion date', fmtDate(fc.exhaustDate),
                'run-rate hits the allowance before ' + fc.periodLabel, 'ut-warn',
                'The day cumulative usage at the current run-rate would reach the provisioned allowance.');
        } else if (t.type === 'LastMonth') {
            var mom = (fc.momGrowth || 0) * 100;
            cards += fcCard('Month-over-month', (mom >= 0 ? '+' : '\u2212') + Math.abs(mom).toFixed(1) + '%',
                'average change across checkpoints', mom <= 0 ? 'ut-ok' : '',
                'Average change in total credits from one checkpoint to the next.');
        } else {
            cards += fcCard('Pool-exhaustion date', 'Covered', 'allowance lasts through ' + fc.periodLabel, 'ut-ok',
                'At the current run-rate, usage does not reach the provisioned allowance before ' + fc.periodLabel + '.');
        }
        cards += fcCard('Run-rate', fmtCompact(Math.round(fc.runRate)) + ' cr/day',
            fmtMoney(Math.round(fc.runRateCost)) + '/day at this burn', '',
            'Credits used so far / days elapsed. Multiplied by your rate, that is the daily dollar burn behind every projection.');
        cards += fcCard('Utilization', fmtPct(fc.utilNow) + ' \u2192 ' + fmtPct(fc.projUtil),
            'now \u2192 projected at ' + fc.periodLabel, fc.projUtil > 1 ? 'ut-warn' : 'ut-ok',
            'Credits used / provisioned allowance. Shown as now then projected at ' + fc.periodLabel + '.');

        // breakdown rows for the active slice dimension
        var groupRows = t.groups.map(function (d) {
            var statusCls = d.util > 1 ? 'ut-over' : (d.limit && d.used < d.limit * 0.4 ? 'ut-under' : 'ut-okc');
            var statusTxt = d.util > 1 ? 'Over allowance' : (d.limit && d.used < d.limit * 0.4 ? 'Under-utilised' : 'On track');
            return '<tr class="ut-grow" data-val="' + esc(d.name) + '" title="Click to filter the view to ' + esc(d.name) + '">' +
                '<td>' + esc(d.name) + '</td>' +
                '<td class="ut-sparkcell">' + sparkline(d.series, 84, 26) + '</td>' +
                '<td class="num">' + fmtCompact(d.used) + '</td>' +
                '<td class="num">' + signed(d.delta) + '</td>' +
                '<td class="num">' + fmtCompact(d.projected) + '</td>' +
                '<td class="num">' + fmtCompact(d.limit) + '</td>' +
                '<td class="num">' + fmtPct(d.util) + '</td>' +
                '<td class="num">' + fmtMoney(Math.round(d.burnCost)) + '</td>' +
                '<td><span class="ut-dstatus ' + statusCls + '">' + statusTxt + '</span></td>' +
                '</tr>';
        }).join('');

        // slice-by + value-filter controls
        var sliceOpts = t.dimList.map(function (dn) { return '<option value="' + esc(dn) + '"' + (dn === t.sliceDim ? ' selected' : '') + '>' + esc(dn) + '</option>'; }).join('');
        var filterOpts = '<option value="">All ' + esc(t.sliceDim) + ' (whole tenant)</option>' +
            t.groupVals.map(function (gv) { return '<option value="' + esc(gv) + '"' + (gv === t.filterVal ? ' selected' : '') + '>' + esc(gv) + '</option>'; }).join('');
        var filterNote = t.filterVal ? ' <span class="ut-filternote">Filtered to <strong>' + esc(t.filterVal) + '</strong> \u00b7 <button type="button" id="utClearFilter" class="ut-linkbtn">clear</button></span>' : '';
        var line1Title = t.filterVal ? esc(t.filterVal) + ' \u2014 consumption vs allowance' : 'Consumption vs provisioned allowance';

        host.innerHTML =
            '<div class="ut-trends-head">' +
            '<div><span class="ut-pill ' + t.type + '">' + esc(typeLabel) + '</span> <span class="ut-th-note">' + t.points.length + ' checkpoints \u00b7 ' + esc(t.points[0].asOf) + ' \u2192 ' + esc(latest.asOf) + '</span>' + filterNote + '</div>' +
            '<div class="ut-controls">' +
            '<label class="ut-ctl">Slice by <select id="utSlice">' + sliceOpts + '</select></label>' +
            '<label class="ut-ctl">Filter <select id="utFilter">' + filterOpts + '</select></label>' +
            '<label class="ut-rate">Rate $/credit <input type="number" id="utRate" step="0.001" min="0" value="' + rate + '"></label>' +
            '</div>' +
            '</div>' +
            renderSignals(sigs) +
            '<div class="ut-fc-grid">' + cards + '</div>' +
            '<div class="ut-chart-grid">' +
            '<div class="ut-chart"><h3>' + line1Title + infoDot('Each checkpoint cumulative credits used (solid line) versus the provisioned allowance pool (amber dashed). Hover a point for the exact users, credits, allowance and utilization at that checkpoint.') + '</h3>' + svgTrend(t.points, 520, 180) +
            '<div class="ut-legend"><span class="ut-lg ut-lg-used">Credits used</span><span class="ut-lg ut-lg-pool">Allowance pool</span></div></div>' +
            '<div class="ut-chart"><h3>Incremental burn per checkpoint' + infoDot('Credits burned between checkpoints (this checkpoint used minus the previous one) and the $ that represents. Hover a bar for the window length and daily burn. Month-to-Date resets are counted from zero.') + '</h3>' + burnBars(t.points, 520, 180) +
            '<div class="ut-legend"><span class="ut-lg ut-lg-burn">Credits burned since prior checkpoint</span></div></div>' +
            '</div>' +
            '<div class="ut-chart"><h3>' + esc(t.sliceDim) + ' roll-up &amp; forecast' + infoDot('Usage broken down by ' + t.sliceDim + ' across your checkpoints. Change = latest minus first checkpoint. Projected uses the run-rate method. Burn ($) = last-window burn x rate. Click any row to filter the whole view to that group.') + '</h3>' +
            '<table class="ut-cktable ut-depttable"><thead><tr>' +
            '<th>' + esc(t.sliceDim) + '</th><th>Trend</th><th class="num">Used</th><th class="num">&Delta; since 1st' + infoDot('Latest checkpoint used minus first checkpoint used - how much this group grew or shrank.') + '</th><th class="num">Projected' + infoDot('This group at its own run-rate, projected to ' + fc.periodLabel + '.') + '</th><th class="num">Allowance</th><th class="num">Util' + infoDot('Group credits used / group allowance.') + '</th><th class="num">Burn ($)' + infoDot('Credits burned since the prior checkpoint for this group, valued at the current rate.') + '</th><th>Status' + infoDot('On track, Over allowance (used above allowance), or Under-utilised (using under 40% of allowance).') + '</th>' +
            '</tr></thead><tbody>' + groupRows + '</tbody></table></div>';

        var ri = $('utRate');
        if (ri) ri.addEventListener('input', function () {
            var v = parseFloat(this.value); state.rate = (isFinite(v) && v >= 0) ? v : 0; renderTrends();
        });
        var ss = $('utSlice');
        if (ss) ss.addEventListener('change', function () { state.sliceDim = this.value; state.sliceVal = ''; renderTrends(); });
        var fsel = $('utFilter');
        if (fsel) fsel.addEventListener('change', function () { state.sliceVal = this.value; renderTrends(); });
        var cf = $('utClearFilter');
        if (cf) cf.addEventListener('click', function () { state.sliceVal = ''; renderTrends(); });
        var grows = host.querySelectorAll('.ut-grow');
        for (var gi = 0; gi < grows.length; gi++) {
            grows[gi].addEventListener('click', function () { state.sliceVal = this.getAttribute('data-val'); renderTrends(); });
        }
        var sigBtns = host.querySelectorAll('.ut-sig-act');
        for (var sb = 0; sb < sigBtns.length; sb++) {
            sigBtns[sb].addEventListener('click', function () {
                var s = sigs[parseInt(this.getAttribute('data-sig'), 10)];
                if (!s || !s.act) return;
                if (s.act.type === 'filter') { state.sliceVal = s.act.val; renderTrends(); window.scrollTo(0, 0); }
                else if (s.act.type === 'under') {
                    var u = null;
                    t.groups.forEach(function (g) { if (g.limit && g.used < g.limit * 0.4 && (!u || g.limit > u.limit)) u = g; });
                    if (u) { state.sliceVal = u.name; renderTrends(); window.scrollTo(0, 0); }
                    else { var el = host.querySelector('.ut-depttable'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                } else if (s.act.type === 'scroll') {
                    var c = host.querySelector('.ut-chart-grid'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });
        }
        wireChartTips(host);
    }

    // Floating chart tooltip driven by data-tip on SVG points/bars.
    function wireChartTips(host) {
        var tipEl = $('utChartTip');
        if (!tipEl) {
            tipEl = document.createElement('div');
            tipEl.id = 'utChartTip'; tipEl.className = 'ut-charttip'; tipEl.hidden = true;
            document.body.appendChild(tipEl);
        }
        var charts = host.querySelectorAll('.ut-chart svg');
        function move(e) {
            var tgt = e.target;
            var data = tgt && tgt.getAttribute ? tgt.getAttribute('data-tip') : null;
            if (data) {
                tipEl.innerHTML = data; tipEl.hidden = false;
                var px = e.clientX + 14, py = e.clientY + 14;
                var tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
                if (px + tw > window.innerWidth - 8) px = e.clientX - tw - 14;
                if (py + th > window.innerHeight - 8) py = e.clientY - th - 14;
                tipEl.style.left = px + 'px'; tipEl.style.top = py + 'px';
            } else { tipEl.hidden = true; }
        }
        for (var i = 0; i < charts.length; i++) {
            charts[i].addEventListener('mousemove', move);
            charts[i].addEventListener('mouseleave', function () { tipEl.hidden = true; });
        }
    }

    function showTrends() { $('utLanding').hidden = true; $('utTrends').hidden = false; renderTrends(); window.scrollTo(0, 0); }
    function hideTrends() { $('utTrends').hidden = true; $('utLanding').hidden = false; }

    // ---- exports (XLSX workbook + PPTX deck) ----
    function exportXlsx() {
        var t = computeTrends();
        if (!t) { alert('Save two or more checkpoints of the same period type to export trends.'); return; }
        if (!window.CBXLSX) { alert('Spreadsheet library not loaded.'); return; }
        var rate = state.rate, fc = t.fc, typeLabel = PERIOD_LABEL[t.type];
        function H(txt) { return { v: txt, s: 'hdr' }; }
        function iC(v) { return { v: v, s: 'int' }; }
        function pC(v) { return { v: v, s: 'pct' }; }
        function mC(v) { return { v: v, s: 'cur' }; }

        var ckRows = [[H('As of'), H('Label'), H('Period'), H('Users'), H('Credits used'), H('Provisioned allowance'), H('Utilization'), H('Departments')]];
        t.points.forEach(function (p) {
            ckRows.push([p.asOf, p.label, typeLabel, iC(p.users), iC(p.used), iC(p.pool), pC(p.pool ? p.used / p.pool : 0), iC(Object.keys(p.byDept).length)]);
        });
        var trRows = [[H('As of'), H('Credits used'), H('Incremental burn'), H('Users'), H('Provisioned pool'), H('Utilization')]];
        t.points.forEach(function (p) {
            trRows.push([p.asOf, iC(p.used), iC(p.inc), iC(p.users), iC(p.pool), pC(p.pool ? p.used / p.pool : 0)]);
        });
        var dpRows = [[H('Department'), H('Used'), H('Change since first'), H('Projected'), H('Allowance'), H('Utilization'), H('Status')]];
        t.depts.forEach(function (d) {
            var st = d.util > 1 ? 'Over allowance' : (d.limit && d.used < d.limit * 0.4 ? 'Under-utilised' : 'On track');
            dpRows.push([d.name, iC(d.used), iC(d.delta), iC(d.projected), iC(d.limit), pC(d.util), st]);
        });
        var fcRows = [[H('Metric'), H('Value')]];
        fcRows.push(['Period type', typeLabel]);
        fcRows.push(['Checkpoints', iC(t.points.length)]);
        fcRows.push(['Date range', t.points[0].asOf + ' to ' + t.latest.asOf]);
        fcRows.push(['Rate ($/credit)', { v: rate, s: 'rate' }]);
        fcRows.push(['Run-rate (credits/day)', iC(Math.round(fc.runRate))]);
        fcRows.push(['Projected consumption (' + fc.periodLabel + ')', iC(fc.projected)]);
        fcRows.push(['Projected cost (' + fc.periodLabel + ')', mC(fc.projected * rate)]);
        fcRows.push(['Provisioned allowance', iC(fc.pool)]);
        fcRows.push(['Headroom vs projection', iC(fc.headroom)]);
        fcRows.push(['Utilization now', pC(fc.utilNow)]);
        fcRows.push(['Projected utilization', pC(fc.projUtil)]);
        fcRows.push(['Pool-exhaustion', fc.exhaustDate ? fmtDate(fc.exhaustDate) : 'Covered through ' + fc.periodLabel]);

        var sheets = [
            { name: 'Forecast', rows: fcRows, cols: [36, 26], freeze: 1 },
            { name: 'Checkpoints', rows: ckRows, cols: [12, 26, 14, 10, 14, 22, 12, 13], freeze: 1, autofilter: 'A1:H1' },
            { name: 'Trend', rows: trRows, cols: [12, 16, 18, 10, 18, 12], freeze: 1 },
            { name: 'Departments', rows: dpRows, cols: [22, 14, 18, 14, 14, 12, 16], freeze: 1, autofilter: 'A1:G1' }
        ];
        window.CBXLSX.download('cowork-usage-trends.xlsx', sheets);
    }

    function exportDeck() {
        if (!window.PptxGenJS) { alert('Deck library not loaded.'); return; }
        var t = computeTrends();
        if (!t) { alert('Save two or more checkpoints of the same period type to export trends.'); return; }
        var fc = t.fc, latest = t.latest, rate = state.rate, typeLabel = PERIOD_LABEL[t.type];
        var pptx = new window.PptxGenJS();
        pptx.defineLayout({ name: 'W', width: 13.33, height: 7.5 });
        pptx.layout = 'W';
        var BG = '0B1120', SURF = '1E293B', BLUE = '4A9EF7', CYAN = '00D4FF', TXT = 'F1F5F9', SUB = '94A3B8', GREEN = '34D399', AMBER = 'F59E0B', RED = 'F87171', LINE = '334155';
        var FONT = 'Segoe UI';
        var isDemo = /^DEMO/.test(latest.label || '');
        var note = isDemo ? '  |  SYNTHETIC DEMO DATA' : '';
        function bg(s) { s.background = { color: BG }; }
        function heading(s, txt) { s.addText(txt, { x: 0.7, y: 0.4, w: 12, h: 0.7, fontSize: 28, bold: true, color: BLUE, fontFace: FONT }); }
        function hcell(txt) { return { text: txt, options: { bold: true, color: BLUE } }; }

        var s1 = pptx.addSlide(); bg(s1);
        s1.addText('Cowork Usage Tracker', { x: 0.7, y: 1.9, w: 12, h: 1, fontFace: FONT, fontSize: 38, bold: true, color: CYAN });
        s1.addText('Trend & Forecast Record', { x: 0.7, y: 2.8, w: 12, h: 0.7, fontFace: FONT, fontSize: 24, color: TXT });
        s1.addText(typeLabel + '  |  ' + fmtCompact(latest.used) + ' credits used  |  projected ' + fmtCompact(fc.projected) + ' by ' + fc.periodLabel + '  |  ' + fmtMoney(Math.round(fc.projected * rate)), { x: 0.7, y: 3.7, w: 12, h: 0.6, fontFace: FONT, fontSize: 18, color: TXT });
        s1.addText(t.points.length + ' checkpoints  |  ' + t.points[0].asOf + ' to ' + latest.asOf + '  |  ' + new Date().toLocaleDateString() + note, { x: 0.7, y: 4.4, w: 12, h: 0.5, fontFace: FONT, fontSize: 14, color: SUB });

        var s2 = pptx.addSlide(); bg(s2);
        heading(s2, 'Forecast summary');
        var kpis = [
            ['Projected consumption', fmtCompact(fc.projected) + ' cr'],
            ['Projected cost', fmtMoney(Math.round(fc.projected * rate))],
            ['Provisioned allowance', fmtCompact(fc.pool) + ' cr'],
            ['Headroom vs projection', (fc.headroom >= 0 ? '' : '\u2212') + fmtCompact(Math.abs(fc.headroom)) + ' cr'],
            ['Run-rate', fmtCompact(Math.round(fc.runRate)) + ' cr/day'],
            ['Pool-exhaustion', fc.exhaustDate ? fmtDate(fc.exhaustDate) : 'Covered']
        ];
        kpis.forEach(function (k, idx) {
            var x = 0.7 + (idx % 3) * 4.2, y = 1.4 + Math.floor(idx / 3) * 1.7;
            s2.addShape(pptx.ShapeType.roundRect, { x: x, y: y, w: 3.9, h: 1.5, fill: { color: SURF }, line: { color: BLUE, width: 0.5 }, rectRadius: 0.1 });
            s2.addText(k[0], { x: x + 0.2, y: y + 0.18, w: 3.5, h: 0.4, fontSize: 12, color: SUB, fontFace: FONT });
            s2.addText(k[1], { x: x + 0.2, y: y + 0.6, w: 3.5, h: 0.7, fontSize: 22, bold: true, color: CYAN, fontFace: FONT });
        });
        s2.addText('Utilization ' + fmtPct(fc.utilNow) + ' now, ' + fmtPct(fc.projUtil) + ' projected at ' + fc.periodLabel + '  |  rate $' + rate + '/credit.', { x: 0.7, y: 5.0, w: 12, h: 0.5, fontSize: 14, color: SUB, fontFace: FONT });

        var s3 = pptx.addSlide(); bg(s3);
        heading(s3, 'Consumption trend');
        var trows = [[hcell('As of'), hcell('Credits used'), hcell('Burn'), hcell('Users'), hcell('Allowance'), hcell('Utilization')]];
        t.points.forEach(function (p) {
            trows.push([p.asOf, fmtInt(p.used), fmtInt(p.inc), fmtInt(p.users), fmtInt(p.pool), fmtPct(p.pool ? p.used / p.pool : 0)]);
        });
        s3.addTable(trows, { x: 0.7, y: 1.3, w: 7.2, color: TXT, fontFace: FONT, fontSize: 12, border: { type: 'solid', color: LINE, pt: 0.5 }, fill: { color: SURF } });
        s3.addChart(pptx.ChartType.bar, [{ name: 'Credits used', labels: t.points.map(function (p) { return p.asOf; }), values: t.points.map(function (p) { return p.used; }) }],
            { x: 8.1, y: 1.3, w: 4.5, h: 4.8, barDir: 'col', showValue: false, chartColors: [BLUE], catAxisLabelColor: TXT, valAxisLabelColor: SUB, showLegend: false });

        var s4 = pptx.addSlide(); bg(s4);
        heading(s4, 'Department roll-up & forecast');
        var drows = [[hcell('Department'), hcell('Used'), hcell('Change'), hcell('Projected'), hcell('Allowance'), hcell('Util'), hcell('Status')]];
        t.depts.slice(0, 14).forEach(function (d) {
            var over = d.util > 1, under = d.limit && d.used < d.limit * 0.4;
            var st = over ? 'Over allowance' : (under ? 'Under-utilised' : 'On track');
            var col = over ? RED : (under ? AMBER : GREEN);
            drows.push([d.name, fmtInt(d.used), (d.delta >= 0 ? '+' : '\u2212') + fmtInt(Math.abs(d.delta)), fmtInt(d.projected), fmtInt(d.limit), fmtPct(d.util), { text: st, options: { color: col } }]);
        });
        s4.addTable(drows, { x: 0.7, y: 1.3, w: 12, color: TXT, fontFace: FONT, fontSize: 12, border: { type: 'solid', color: LINE, pt: 0.5 }, fill: { color: SURF } });

        var s5 = pptx.addSlide(); bg(s5);
        heading(s5, 'Methodology & notes');
        var method = [
            'The tracker reconstructs a time series from point-in-time consumption exports (there is no history API). Each upload is a checkpoint.',
            'Incremental burn = credits used since the prior checkpoint; Month-to-Date resets are detected and chained across month boundaries.',
            'Run-rate = period-to-date credits / days elapsed; projected consumption = run-rate x days in the period.',
            'Pool-exhaustion date = when cumulative usage at the current run-rate reaches the provisioned allowance ("Covered" if not before period end).',
            'Projected cost = projected credits x rate ($' + rate + '/credit).',
            (isDemo ? 'SYNTHETIC DEMO DATA - not for real decisions.' : 'Computed locally in your browser; no data leaves your device.')
        ];
        s5.addText(method.map(function (m) { return { text: m, options: { bullet: true, color: TXT, fontSize: 15, fontFace: FONT, paraSpaceAfter: 10 } }; }), { x: 0.9, y: 1.5, w: 11.5, h: 5 });

        pptx.writeFile({ fileName: 'cowork-usage-trends.pptx' });
    }

    // ---------------------------------------------------------------- demo
    // Synthetic Customer-Example-shaped demo at 70% scale. Weekly MTD snapshots
    // this month: cumulative usage accumulates and the provisioned allowance pool
    // steps up AHEAD of it (auto-fit look). Roll-ups are synthesized at tenant
    // scale so the trend reflects believable magnitudes without materialising the
    // ~52K individual user rows. Round allowance caps per engagement tier.
    function loadDemo() {
        selectPeriod('MTD');
        var DEPTS = [
            { name: 'Engineering', w: 0.20, uw: 0.225, bu: 'Product & Engineering' },
            { name: 'Data & Analytics', w: 0.16, uw: 0.170, bu: 'Product & Engineering' },
            { name: 'Claims Processing', w: 0.14, uw: 0.130, bu: 'Operations' },
            { name: 'Clinical Operations', w: 0.12, uw: 0.100, bu: 'Operations' },
            { name: 'Member Services', w: 0.11, uw: 0.120, bu: 'Operations' },
            { name: 'Finance', w: 0.10, uw: 0.075, bu: 'Corporate' },
            { name: 'IT Service Desk', w: 0.09, uw: 0.115, bu: 'Corporate' },
            { name: 'Marketing', w: 0.08, uw: 0.065, bu: 'Go-to-Market' }
        ];
        // engagement tiers: user share, credit share, round allowance cap
        var TIERS = [
            { name: 'Light (1K cap)', cap: 1000, ushare: 0.4897, cshare: 0.04 },
            { name: 'Regular (6K cap)', cap: 6000, ushare: 0.2502, cshare: 0.12 },
            { name: 'Highly engaged (15K cap)', cap: 15000, ushare: 0.1501, cshare: 0.20 },
            { name: 'Cowork-native (30K cap)', cap: 30000, ushare: 0.0500, cshare: 0.13 },
            { name: 'Power delegator (55K cap)', cap: 55000, ushare: 0.0400, cshare: 0.19 },
            { name: 'Frontier (175K cap)', cap: 175000, ushare: 0.0200, cshare: 0.32 }
        ];
        // weekly MTD snapshots as a fraction of the month elapsed: cumulative credits
        // used, provisioned allowance pool (round, auto-fit ahead of usage), active
        // users onboarded. Fraction-based so the final snapshot always lands on the
        // true month-end (regardless of month length) at the 70% endpoint.
        var WEEKS = [
            { frac: 0.20, used: 70100000, pool: 400000000, users: 44000 },
            { frac: 0.43, used: 179700000, pool: 460000000, users: 46500 },
            { frac: 0.67, used: 313900000, pool: 520000000, users: 49000 },
            { frac: 0.90, used: 468400000, pool: 570000000, users: 51000 },
            { frac: 1.00, used: 547886201, pool: 600000000, users: 52460 }
        ];
        var base = new Date(); base.setDate(1); // 1st of current month
        var dim = daysInMonth(base.getFullYear(), base.getMonth());
        var chain = Promise.resolve();
        WEEKS.forEach(function (wk, wi) {
            chain = chain.then(function () {
                var day = Math.max(1, Math.round(wk.frac * dim));
                var d = new Date(base); d.setDate(day);
                var asOf = d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
                var rec = {
                    id: uuid(), createdAt: new Date().toISOString(), asOf: asOf,
                    label: 'DEMO \u2014 Week ' + (wi + 1) + ' (MTD)', periodType: 'MTD',
                    creditFileName: 'demo.csv', entraFileNames: ['demo-entra.csv'],
                    columnMap: {}, rawCredit: [], rawEntra: [], users: [], derived: synthRollups(wk, DEPTS, TIERS)
                };
                return idbPut(rec);
            });
        });
        chain.then(loadCheckpoints).then(function () {
            var el = document.getElementById('utStep3');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Synthesize a tenant-scale derived roll-up for one weekly snapshot. Splits the
    // week's totals across departments and engagement tiers; residual rounding is
    // absorbed by the largest bucket so byDept/byPolicy totals stay exact.
    function synthRollups(wk, DEPTS, TIERS) {
        var t = {
            totalUsed: wk.used, totalLimit: wk.pool, userCount: wk.users,
            activeUsers: Math.round(wk.users * 0.9), byDept: {}, byPolicy: {}
        };
        var usedAcc = 0, limitAcc = 0, cntAcc = 0, i;
        for (i = 1; i < DEPTS.length; i++) {
            var dp = DEPTS[i];
            var du = Math.round(wk.used * dp.uw), dl = Math.round(wk.pool * dp.w), dc = Math.round(wk.users * dp.w);
            usedAcc += du; limitAcc += dl; cntAcc += dc;
            t.byDept[dp.name] = { used: du, limit: dl, count: dc };
        }
        t.byDept[DEPTS[0].name] = { used: wk.used - usedAcc, limit: wk.pool - limitAcc, count: wk.users - cntAcc };

        var usedAcc2 = 0, cntAcc2 = 0;
        for (i = 0; i < TIERS.length - 1; i++) {
            var tr = TIERS[i];
            var tc = Math.round(wk.users * tr.ushare), tu = Math.round(wk.used * tr.cshare);
            cntAcc2 += tc; usedAcc2 += tu;
            t.byPolicy[tr.name] = { used: tu, limit: tc * tr.cap, count: tc };
        }
        var last = TIERS[TIERS.length - 1], lc = wk.users - cntAcc2, lu = wk.used - usedAcc2;
        t.byPolicy[last.name] = { used: lu, limit: lc * last.cap, count: lc };

        // roll departments up into business units for the slice-by dimension
        var byBU = {};
        for (i = 0; i < DEPTS.length; i++) {
            var nm = DEPTS[i].name, bu = DEPTS[i].bu || 'Other', dd = t.byDept[nm];
            if (!byBU[bu]) byBU[bu] = { used: 0, limit: 0, count: 0 };
            byBU[bu].used += dd.used; byBU[bu].limit += dd.limit; byBU[bu].count += dd.count;
        }
        t.dims = { 'Department': t.byDept, 'Business Unit': byBU, 'Engagement tier': t.byPolicy };
        t.dimList = ['Department', 'Business Unit', 'Engagement tier'];
        return t;
    }

    // ---------------------------------------------------------------- init
    function init() {
        $('asOfDate').value = todayISO();

        var cards = document.querySelectorAll('#utPeriods .ut-period');
        for (var i = 0; i < cards.length; i++) {
            cards[i].addEventListener('click', function () { selectPeriod(this.getAttribute('data-period')); });
        }
        $('utChangePeriod').addEventListener('click', changePeriod);

        wireDrop('dzCredits', 'fileCredits', false, onCreditFile);
        wireDrop('dzEntra', 'fileEntra', true, onEntraFiles);
        $('btnClearEntra').addEventListener('click', function (e) { e.stopPropagation(); clearEntra(); });

        $('btnSaveCk').addEventListener('click', saveCheckpoint);
        $('btnDemo').addEventListener('click', loadDemo);
        $('btnExportBundle').addEventListener('click', exportBundle);
        $('btnImportBundle').addEventListener('click', function () { $('fileBundle').click(); });
        $('fileBundle').addEventListener('change', function () { if (this.files && this.files.length) importBundle(this.files); });
        $('btnClearAll').addEventListener('click', clearAll);
        $('btnViewTrends').addEventListener('click', showTrends);
        var tb = $('utTrendsBack'); if (tb) tb.addEventListener('click', hideTrends);
        var xb = $('btnTrendXlsx'); if (xb) xb.addEventListener('click', exportXlsx);
        var db = $('btnTrendDeck'); if (db) db.addEventListener('click', exportDeck);

        loadCheckpoints();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
