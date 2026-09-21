// insights-tabs.js
// Render the 5 analytics views (Adoption Insights, Organizations, Apps & Behavior,
// Risk & Waste, Forecast & Sensitivity) into any container element. Used both by
// the standalone analytics pages and by the in-report tabs on demo.html and the
// user-upload report.
//
// API: window.InsightsTabs.renderAdoption(mainEl, data)
//      window.InsightsTabs.renderOrgs(mainEl, data)
//      window.InsightsTabs.renderApps(mainEl, data)
//      window.InsightsTabs.renderAtRisk(mainEl, data)
//      window.InsightsTabs.renderForecast(mainEl, data)
//
// `data` is whatever InsightsShared.loadSharedData() returns:
//   { personIndex, sortedDates, config, dateRange, groupLabel }
//
// All per-render state lives on the main element (mainEl.__state = {...}) so the
// same page can host multiple renders without colliding globals.

(function () {
    'use strict';
    if (!window.InsightsShared) {
        console.warn('[insights-tabs] requires insights-shared.js to be loaded first.');
        return;
    }
    const IS = window.InsightsShared;
    const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    // SVG presentation attributes need a resolved colour, not a var() reference.
    // Inline style= strings keep using var() directly so they re-skin with CSS.
    const ink = (token, fallback) => IS.cssVar(token, fallback);

    // Inject all the per-view CSS once. Standalone pages also include it inline
    // (no harm — last definition wins, all match). This lets the in-report tabs
    // render without each page needing to duplicate the styles.
    if (!document.getElementById('insights-tabs-css')) {
        const css = `
        .insights-card { background: var(--surface, #1E293B); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; }
        .insights-card h2 { color: var(--text-primary, #F1F5F9); margin: 0 0 0.5rem; font-size: 1.4rem; }
        .insights-card .lede { color: var(--text-secondary, #94A3B8); margin: 0 0 1.5rem; }
        .insights-host .kpi-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .insights-host .kpi { flex: 1 1 180px; background: var(--surface-raised, #253449); border-radius: 12px; padding: 1.25rem; border-left: 4px solid var(--copilot-cyan, #00D4FF); }
        .insights-host .kpi .label { font-size: 0.8rem; color: var(--text-secondary, #94A3B8); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
        .insights-host .kpi .value { font-size: 1.75rem; font-weight: 700; color: var(--text-primary, #F1F5F9); }
        .insights-host .kpi .sub { font-size: 0.8rem; color: var(--text-secondary, #94A3B8); margin-top: 0.25rem; }
        .insights-host .chart-wrapper { overflow-x: auto; }
        /* Adoption — migration matrix */
        .migration-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .migration-table th, .migration-table td { padding: 0.5rem 0.75rem; text-align: center; font-size: 0.85rem; border: 1px solid var(--rule); }
        .migration-table th { background: var(--surface-raised, #253449); color: var(--text-secondary, #94A3B8); font-weight: 600; }
        .migration-table td.row-label { text-align: left; font-weight: 600; color: var(--text-primary, #F1F5F9); background: var(--surface-raised, #253449); }
        .migration-table td.diagonal { background: var(--light-gray); }
        .migration-table td.up { color: var(--positive); font-weight: 600; }
        .migration-table td.down { color: var(--negative); font-weight: 600; }
        /* Organizations */
        .insights-host .org-table { width: 100%; border-collapse: collapse; }
        .insights-host .org-table th { padding: 0.75rem 1rem; text-align: left; background: var(--surface-raised, #253449); color: var(--text-secondary, #94A3B8); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--rule); }
        .insights-host .org-table td { padding: 0.85rem 1rem; color: var(--text-primary, #F1F5F9); font-size: 0.95rem; border-bottom: 1px solid var(--rule); }
        .insights-host .org-table tr.expandable { cursor: pointer; transition: background 0.15s; }
        .insights-host .org-table tr.expandable:hover { background: var(--accent-soft); }
        .insights-host .org-table .num { text-align: right; font-variant-numeric: tabular-nums; }
        .insights-host .org-detail { background: var(--accent-soft); padding: 1.5rem 2rem; border-left: 3px solid var(--accent); }
        .insights-host .org-detail .cohort-pill { display: inline-block; padding: 0.4rem 0.85rem; border-radius: 999px; font-size: 0.85rem; margin: 0.25rem 0.4rem 0.25rem 0; color: white; font-weight: 600; }
        .insights-host .controls { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; }
        .insights-host .controls input, .insights-host .controls select { background: var(--surface-raised, #253449); border: 1px solid var(--border, rgba(255,255,255,0.08)); color: var(--text-primary, #F1F5F9); padding: 0.5rem 0.85rem; border-radius: 8px; font-size: 0.9rem; }
        .insights-host .controls label { color: var(--text-secondary, #94A3B8); font-size: 0.85rem; }
        /* Organizations — benchmark toggle (chip styled to match .segmented) */
        .insights-host .controls .bench-seg { display: inline-flex; align-items: center; gap: 2px; padding: 3px; background: var(--ink-600, #253449); border: 1px solid var(--rule, rgba(255,255,255,0.08)); border-radius: 8px; }
        .insights-host .controls .bench-chip { display: inline-flex; align-items: center; gap: 0.5rem; margin: 0; padding: 0.4375rem 0.875rem; border: 1px solid transparent; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; line-height: 1.2; color: var(--text-secondary, #94A3B8); cursor: pointer; white-space: nowrap; transition: background-color 0.16s ease, color 0.16s ease; }
        .insights-host .controls .bench-chip:hover { color: var(--text-primary, #F1F5F9); }
        .insights-host .controls .bench-chip:focus-within { box-shadow: 0 0 0 3px var(--accent-soft); }
        .insights-host .controls .bench-chip.active { background: var(--surface, #1E293B); color: var(--text-primary, #F1F5F9); font-weight: 600; border-color: var(--accent); }
        .insights-host .controls .bench-chip input[type=checkbox] { width: 14px; height: 14px; margin: 0; padding: 0; accent-color: var(--accent); cursor: pointer; }
        :root[data-theme="light"] .insights-host .controls .bench-seg { background: #F1EFEA; box-shadow: inset 0 1px 2px rgba(23,26,33,0.06); }
        :root[data-theme="light"] .insights-host .controls .bench-chip.active { background: #FFFFFF; box-shadow: 0 1px 2px var(--shadow, rgba(23,26,33,0.12)); }
        .insights-host .bench-delta { display: inline-block; margin-left: 0.4rem; padding: 0.05rem 0.4rem; border-radius: 999px; background: var(--accent-soft); font-size: 0.72rem; font-weight: 700; font-variant-numeric: tabular-nums; }
        .insights-host .org-table tr.bench-avg-row td { background: var(--accent-soft); font-weight: 700; border-bottom: 2px solid var(--accent); }
        .insights-host .org-table tr.bench-avg-row .sub { display: block; font-size: 0.72rem; font-weight: 500; color: var(--text-secondary, #94A3B8); }
        /* Apps */
        .insights-host .behavior-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
        .insights-host .behavior-card { background: var(--surface-raised, #253449); border-radius: 12px; padding: 1.25rem; border-top: 3px solid; }
        .insights-host .behavior-card h3 { margin: 0 0 0.75rem; color: var(--text-primary, #F1F5F9); font-size: 1rem; }
        .insights-host .app-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
        .insights-host .app-row .name { flex: 0 0 130px; font-size: 0.85rem; color: var(--text-primary, #F1F5F9); }
        .insights-host .app-row .bar { flex: 1; height: 8px; background: var(--light-gray); border-radius: 4px; overflow: hidden; }
        .insights-host .app-row .bar-fill { height: 100%; background: var(--copilot-cyan, #00D4FF); }
        .insights-host .app-row .pct { flex: 0 0 50px; text-align: right; font-size: 0.8rem; color: var(--text-secondary, #94A3B8); font-variant-numeric: tabular-nums; }
        /* Risk & Waste */
        .insights-host .risk-table { width: 100%; border-collapse: collapse; }
        .insights-host .risk-table th { padding: 0.75rem 1rem; text-align: left; background: var(--surface-raised, #253449); color: var(--text-secondary, #94A3B8); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .insights-host .risk-table td { padding: 0.85rem 1rem; color: var(--text-primary, #F1F5F9); font-size: 0.9rem; border-bottom: 1px solid var(--rule); }
        .insights-host .risk-table .num { text-align: right; font-variant-numeric: tabular-nums; }
        .insights-host .pill { display: inline-block; padding: 0.25rem 0.65rem; border-radius: 999px; font-size: 0.78rem; font-weight: 600; color: white; }
        .insights-host .waste-callout { background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(245,158,11,0.1)); border: 1px solid rgba(245,158,11,0.3); border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; }
        .insights-host .filter { background: var(--surface-raised, #253449); border: 1px solid var(--border, rgba(255,255,255,0.08)); color: var(--text-primary, #F1F5F9); padding: 0.5rem 0.85rem; border-radius: 8px; font-size: 0.9rem; margin-left: 0.5rem; }
        /* Forecast slider */
        .insights-host .slider-control { display: flex; align-items: center; gap: 1rem; margin: 1rem 0; flex-wrap: wrap; }
        .insights-host .slider-control label { color: var(--text-primary, #F1F5F9); min-width: 200px; }
        .insights-host .slider-control input[type=range] { flex: 1; min-width: 200px; max-width: 360px; accent-color: var(--copilot-cyan, #00D4FF); }
        .insights-host .slider-control .val { font-weight: 700; color: var(--copilot-cyan, #00D4FF); min-width: 60px; text-align: right; font-variant-numeric: tabular-nums; }
        `;
        const styleEl = document.createElement('style');
        styleEl.id = 'insights-tabs-css';
        styleEl.textContent = css;
        document.head.appendChild(styleEl);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Adoption Insights — cohort trajectory, migration matrix, time-to-habit
    // ─────────────────────────────────────────────────────────────────────────
    function renderAdoption(main, data) {
        const personIndex = data.personIndex;
        const sortedDates = data.sortedDates;
        const cfg = data.config;
        const cohorts = IS.computeCohorts(personIndex, sortedDates, cfg);
        const totalUsers = cohorts.totals.count;
        const habitualOrBetter = cohorts.rows
            .filter(r => r.name === 'Power Users' || r.name === 'Habitual Users')
            .reduce((s, r) => s + r.count, 0);

        const kpis = `
            <div class="kpi-row">
                <div class="kpi"><div class="label">Total Licensed Users</div><div class="value">${IS.fmtInt(totalUsers)}</div><div class="sub">across ${data.sortedDates.length} weeks</div></div>
                <div class="kpi"><div class="label">Power + Habitual</div><div class="value">${IS.fmtInt(habitualOrBetter)}</div><div class="sub">${IS.fmtPct(habitualOrBetter / Math.max(totalUsers,1) * 100, 1)} of base</div></div>
                <div class="kpi"><div class="label">Monthly Value</div><div class="value">${IS.fmtMoneyShort(cohorts.totals.monthlyValue)}</div><div class="sub">${cohorts.totals.roi.toFixed(1)}x ROI</div></div>
                <div class="kpi"><div class="label">Window</div><div class="value">${data.sortedDates.length}w</div><div class="sub">${data.dateRange}</div></div>
            </div>`;

        const trajectory = IS.computeCohortTrajectory(personIndex, sortedDates);
        const trajectorySvg = IS.svgStackedArea(trajectory, { width: 880, height: 320 });
        const trajectoryCard = `
            <div class="insights-card">
                <h2>Cohort trajectory ${IS.tooltip({ label: 'How many users are in each Usage Threshold cohort at the end of each weekly snapshot.', math: 'For each person at each week W: avg12(W) = mean of actions over [W-77d, W], habit12(W) = COUNTROWS(actions>=1 over that window) >= 9. Power = avg12>=20 AND habit; Habitual = avg12>=8 AND habit; Novice = avg12>=1; Low = avg12>0; else Non.', source: 'Power BI Super User Adoption template (Usage Threshold calculated column).' })}</h2>
                <p class="lede">Per-user threshold reclassified at each week's trailing 12-week window. Shows whether your base is shifting up the engagement ladder or stalling.</p>
                <div class="chart-wrapper">${trajectorySvg}</div>
                ${IS.mathBlock({ label: 'Cohort assignment per week', formula: 'avg12 = mean(actions[W-77d..W])  habit12 = count(actions>=1 in window) >= 9\nPower    : avg12 >= 20 AND habit12\nHabitual : avg12 >=  8 AND habit12\nNovice   : avg12 >=  1\nLow      : avg12 >   0\nNon      : avg12 =   0', note: 'Stacked area = persons-per-cohort at each weekly snapshot. Re-classification at each week mirrors the Power BI Adoption template.' })}
            </div>`;

        const migration = IS.computeMigration(personIndex, sortedDates, 4);
        let migrationCard = '';
        if (migration) {
            const m = migration.matrix;
            const cohortOrder = IS.COHORT_ORDER;
            let rowsHtml = '';
            let upTotal = 0, downTotal = 0, sameTotal = 0;
            cohortOrder.forEach((from, fi) => {
                let cells = `<td class="row-label">${from}</td>`;
                cohortOrder.forEach((to, ti) => {
                    const v = m[from][to];
                    let cls = '';
                    if (fi === ti) cls = 'diagonal';
                    else if (ti < fi) cls = 'up';
                    else cls = 'down';
                    if (fi === ti) sameTotal += v;
                    else if (ti < fi) upTotal += v;
                    else downTotal += v;
                    cells += `<td class="${cls}">${v || ''}</td>`;
                });
                rowsHtml += `<tr>${cells}</tr>`;
            });
            migrationCard = `
                <div class="insights-card">
                    <h2>Cohort migration (last 4 weeks vs prior 4 weeks) ${IS.tooltip({ label: 'How many users moved up, stayed, or moved down in cohort between the two 4-week windows.', math: 'For each person P: priorCohort = cohort at week (latest - 4). recentCohort = cohort at latest week. Matrix[priorCohort][recentCohort] += 1. Upper triangle (ti<fi) = moved UP; diagonal = stayed; lower (ti>fi) = moved DOWN.' })}</h2>
                    <p class="lede">Rows = where each user was at <strong>${migration.priorLabel}</strong>. Columns = where they are at <strong>${migration.recentLabel}</strong>. Green = moved up, red = moved down, neutral = stayed.</p>
                    <div class="kpi-row">
                        <div class="kpi" style="border-left-color:var(--positive);"><div class="label">Moved Up</div><div class="value">${IS.fmtInt(upTotal)}</div><div class="sub">${IS.fmtPct(upTotal / Math.max(totalUsers,1) * 100, 1)} of base</div></div>
                        <div class="kpi" style="border-left-color:var(--text-tertiary);"><div class="label">Stayed</div><div class="value">${IS.fmtInt(sameTotal)}</div><div class="sub">${IS.fmtPct(sameTotal / Math.max(totalUsers,1) * 100, 1)} of base</div></div>
                        <div class="kpi" style="border-left-color:var(--negative);"><div class="label">Moved Down</div><div class="value">${IS.fmtInt(downTotal)}</div><div class="sub">${IS.fmtPct(downTotal / Math.max(totalUsers,1) * 100, 1)} of base</div></div>
                    </div>
                    <div style="overflow-x:auto;">
                        <table class="migration-table">
                            <thead>
                                <tr><th>From &darr; / To &rarr;</th>${cohortOrder.map(c => `<th>${c}</th>`).join('')}</tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </div>
                    ${IS.mathBlock({ label: 'Migration math', formula: 'priorCohort(P)  = cohort at week (latest - 4)\nrecentCohort(P) = cohort at week  latest\nUp   = users where recent index < prior index   (ladder up)\nSame = users where recent index = prior index\nDown = users where recent index > prior index   (ladder down)', note: 'Order: Power(0), Habitual(1), Novice(2), Low(3), Non(4).' })}
                </div>`;
        }

        const tth = IS.computeTimeToHabit(personIndex);
        let tthCard = '';
        if (tth.count > 0) {
            const histData = tth.histogram.map((v, i) => ({
                label: (i === tth.histogram.length - 1 ? `${i}+w` : `${i}w`),
                value: v
            }));
            tthCard = `
                <div class="insights-card">
                    <h2>Time to habit ${IS.tooltip({ label: 'How long it takes a typical user to graduate from first-touch to Habitual or Power status.', math: 'For each person P with any week classified Power or Habitual: firstAction = min(week where actions>0). firstHabit = min(week classified Power or Habitual). TTH(P) = (firstHabit - firstAction) / 7 days.' })}</h2>
                    <p class="lede">For each user who reached Power or Habitual status, weeks elapsed between their first non-zero action week and their first habit week. This is the #1 metric for whether onboarding is working.</p>
                    <div class="kpi-row">
                        <div class="kpi"><div class="label">Users Who Reached Habit</div><div class="value">${IS.fmtInt(tth.count)}</div><div class="sub">${IS.fmtPct(tth.count / Math.max(totalUsers,1) * 100, 1)} of total</div></div>
                        <div class="kpi"><div class="label">Median Weeks</div><div class="value">${tth.median}</div><div class="sub">half got there faster</div></div>
                        <div class="kpi"><div class="label">Mean Weeks</div><div class="value">${tth.mean.toFixed(1)}</div><div class="sub">average</div></div>
                    </div>
                    <div class="chart-wrapper">${IS.svgBarChart(histData, { width: 880, height: 260, color: ink('--accent', '#4C8DFF') })}</div>
                    ${IS.mathBlock({ label: 'Time-to-habit per person', formula: 'TTH(P) weeks = (firstHabitWeek(P) - firstActionWeek(P)) / 7\nmedian = 50th percentile of {TTH(P) : P reached habit}\nmean   = sum(TTH) / count', note: 'Bar i = number of users whose TTH equals i weeks. The final bar (i+) = the right-tail bucket.' })}
                </div>`;
        } else {
            tthCard = `
                <div class="insights-card">
                    <h2>Time to habit</h2>
                    <p class="lede">No users in this dataset have a clearly-bounded first-action &rarr; first-habit transition (need at least 12 weeks of pre-habit history). This view will populate as more weeks accumulate.</p>
                </div>`;
        }

        main.innerHTML = kpis + trajectoryCard + migrationCard + tthCard;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Organizations — sortable, expandable org-level breakdown
    // ─────────────────────────────────────────────────────────────────────────
    const BENCH_KEY = 'cri.orgs.benchmark';
    const readBench = () => { try { return sessionStorage.getItem(BENCH_KEY) === '1'; } catch (e) { return false; } };
    const writeBench = v => { try { sessionStorage.setItem(BENCH_KEY, v ? '1' : '0'); } catch (e) { /* private mode */ } };

    // Single code path for every metric in the Organizations table. Called once per
    // group AND once over the whole population, so the benchmark row is a true
    // population aggregate rather than an unweighted mean of the per-group numbers.
    function computeGroupMetrics(persons, sortedDates, cfg) {
        const userCount = persons.length;
        const weeklyAvg = sortedDates.map(d => {
            let withActions = 0, sumActions = 0;
            persons.forEach(({ p }) => {
                const wk = p.weeks.find(w => w.d === d);
                if (wk && wk.a > 0) { withActions += 1; sumActions += wk.a; }
            });
            return withActions > 0 ? sumActions / withActions : 0;
        });
        const cohortCounts = { 'Power Users': 0, 'Habitual Users': 0, 'Novice Users': 0, 'Low Users': 0, 'Non Users': 0 };
        persons.forEach(({ p }) => {
            const last = p.weeks[p.weeks.length - 1];
            if (!last) return;
            const t = last.threshold || 'Non Users';
            cohortCounts[t] = (cohortCounts[t] || 0) + 1;
        });
        const habitOrPower = cohortCounts['Power Users'] + cohortCounts['Habitual Users'];
        const habitPct = userCount > 0 ? (habitOrPower / userCount) * 100 : 0;
        const groupCohorts = IS.computeCohorts(
            Object.fromEntries(persons.map(({ pid, p }) => [pid, p])),
            sortedDates,
            cfg
        );
        const n = weeklyAvg.length;
        const recent4 = weeklyAvg.slice(Math.max(0, n - 4));
        const prior4 = weeklyAvg.slice(Math.max(0, n - 8), Math.max(0, n - 4));
        const avg = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
        const recentAvg = avg(recent4);
        const priorAvg = avg(prior4);
        const trendPct = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0;
        const monthlyValue = groupCohorts.totals.monthlyValue;
        return {
            userCount, weeklyAvg, cohortCounts, habitOrPower, habitPct,
            monthlyValue,
            monthlyValuePerUser: userCount > 0 ? monthlyValue / userCount : 0,
            roi: groupCohorts.totals.roi,
            avgActionsPerUserWeek: recentAvg,
            trendPct
        };
    }

    function renderOrgs(main, data) {
        const personIndex = data.personIndex;
        const sortedDates = data.sortedDates;
        const cfg = data.config;

        const byOrg = {};
        Object.entries(personIndex).forEach(([pid, p]) => {
            const o = p.orgAgg || 'Other';
            if (!byOrg[o]) byOrg[o] = [];
            byOrg[o].push({ pid, p });
        });

        const orgs = Object.entries(byOrg).map(([orgName, persons]) =>
            Object.assign({ orgName }, computeGroupMetrics(persons, sortedDates, cfg)));

        // The benchmark reference: identical computation run over every person.
        const orgWide = computeGroupMetrics(
            Object.entries(personIndex).map(([pid, p]) => ({ pid, p })),
            sortedDates,
            cfg
        );

        const state = { orgs, orgWide, sortKey: 'monthlyValue', sortDir: -1, benchmark: readBench() };
        main.__state = state;

        main.innerHTML = `
            <div class="insights-card">
                <h2>${orgs.length} ${(data.groupLabel || 'organization').toLowerCase()}${orgs.length === 1 ? '' : 's'} ${IS.tooltip({ label: 'Distinct grouping values rolled up using the Power BI "Organization (Aggregated)" rule.', math: 'For each person P: group(P) = chosen grouping field (default Organization). If a group has <5 distinct persons or is blank/N/A, it rolls into "Other". Per group: monthlyValue = sum over its persons of cohort-specific monetized value (see Adoption Insights tooltip).' })}</h2>
                <p class="lede">Aggregated using the Power BI &ldquo;Organization (Aggregated)&rdquo; rule (groups with fewer than 5 distinct users or blank labels roll into <strong>Other</strong>). Click any row to expand its cohort breakdown.</p>
                <div class="controls">
                    <label>Sort by:</label>
                    <select class="js-sortKey">
                        <option value="monthlyValue">Monthly Value</option>
                        <option value="userCount">User Count</option>
                        <option value="habitPct">% Habitual+Power</option>
                        <option value="avgActionsPerUserWeek">Avg Actions/User/Week (last 4w)</option>
                        <option value="roi">ROI</option>
                        <option value="trendPct">4w Trend %</option>
                    </select>
                    <label>Direction:</label>
                    <select class="js-sortDir">
                        <option value="-1">High &rarr; Low</option>
                        <option value="1">Low &rarr; High</option>
                    </select>
                    <span class="bench-seg">
                        <label class="bench-chip${state.benchmark ? ' active' : ''}">
                            <input type="checkbox" class="js-benchToggle"${state.benchmark ? ' checked' : ''}>
                            <span>Benchmark against Organization</span>
                        </label>
                    </span>
                    ${IS.tooltip({ label: 'Compares every row against the whole organization, not against the other rows. The reference row is the population aggregate across all persons in the upload | % Habit+Power and Avg Actions/User/Week are compared as absolute differences | Monthly Value is compared per user so a small group is not penalised for being small | ROI is compared in multiples', math: 'orgHabitPct = (all Power + all Habitual) / all persons &times; 100. orgAvgActions = same last-4-week method applied to every person. orgMonthlyValuePerUser = orgMonthlyValue / all persons. orgRoi = orgMonthlyValue / (all persons &times; licenseCost). Delta = rowValue - orgValue.' })}
                </div>
                <div style="overflow-x:auto;">
                    <table class="org-table js-orgTable ${state.benchmark ? 'bench-on' : ''}"><thead></thead><tbody></tbody></table>
                </div>
                ${IS.mathBlock({ label: 'Per-row math', formula: '% Habit+Power = (PowerUsers + HabitualUsers) / users  &times; 100\nAvg Actions/User/Week = mean over last 4 weeks of (sum(actions) / count(users with actions))\nTrend (4w)  = (recent4Avg - prior4Avg) / prior4Avg  &times; 100\nMonthly Value = &Sigma; cohort-weight &times; weekly_actions &times; minutesPerAction / 60 &times; professionalRate &times; 4.33\nROI = monthlyValue / (users &times; licenseCost)\n&mdash; Benchmark mode &mdash;\nOrganization average = the same five formulas run over ALL persons in the upload (population aggregate, not a mean of the rows)\n&Delta;% Habit+Power = row - org      (percentage points)\n&Delta;Avg Actions = row - org        (actions/user/week)\n&Delta;Monthly Value = (row/users - org/allUsers) / (org/allUsers) &times; 100   (per-user, %)\n&Delta;ROI = row - org               (multiples)', note: 'Cohort weights reflect the Adjusted Compounding Adoption Hypothesis: Power=1.0, Habitual=0.7, Novice=0.4, Low=0.1, Non=0. Benchmark mode adds no new valuation math — the reference row reuses the identical per-row computation over the full population.' })}
            </div>`;

        main.querySelector('.js-sortKey').addEventListener('change', e => { state.sortKey = e.target.value; renderOrgsTable(main); });
        main.querySelector('.js-sortDir').addEventListener('change', e => { state.sortDir = parseInt(e.target.value); renderOrgsTable(main); });
        const benchEl = main.querySelector('.js-benchToggle');
        benchEl.addEventListener('change', e => {
            state.benchmark = e.target.checked;
            writeBench(state.benchmark);
            benchEl.closest('.bench-chip').classList.toggle('active', state.benchmark);
            // Delta chips widen the row, so the table needs the tighter column rules.
            const tbl = main.querySelector('.js-orgTable');
            if (tbl) tbl.classList.toggle('bench-on', state.benchmark);
            renderOrgsTable(main);
        });
        renderOrgsTable(main);
    }

    // Delta chip: coloured against the org-wide reference, muted inside `tol`.
    function benchChip(delta, tol, fmt) {
        const color = delta > tol ? 'var(--positive)' : delta < -tol ? 'var(--negative)' : 'var(--text-tertiary)';
        const sign = delta > tol ? '+' : delta < -tol ? '\u2212' : '\u00b1';
        return `<span class="bench-delta" style="color:${color};">${sign}${fmt(Math.abs(delta))}</span>`;
    }

    function renderOrgsTable(main) {
        const state = main.__state;
        const bench = !!state.benchmark;
        const ref = state.orgWide;
        const orgs = state.orgs.slice().sort((a, b) => {
            const av = a[state.sortKey] || 0, bv = b[state.sortKey] || 0;
            return (av - bv) * state.sortDir;
        });
        const table = main.querySelector('.js-orgTable');
        table.querySelector('thead').innerHTML = `
            <tr>
                <th>Organization</th>
                <th class="num">Users</th>
                <th class="num">% Habit+Power</th>
                <th class="num">Avg Actions/User/Week</th>
                <th>Trend (last 4w)</th>
                <th>14-week trend</th>
                <th class="num">Monthly Value</th>
                <th class="num">ROI</th>
            </tr>`;
        const tbody = table.querySelector('tbody');
        let avgRow = '';
        if (bench) {
            const refTrendColor = ref.trendPct > 5 ? 'var(--positive)' : ref.trendPct < -5 ? 'var(--negative)' : 'var(--text-tertiary)';
            const refTrendArrow = ref.trendPct > 5 ? '&uarr;' : ref.trendPct < -5 ? '&darr;' : '&rarr;';
            avgRow = `
            <tr class="bench-avg-row js-orgAvgRow">
                <td>Organization average<span class="sub">all ${IS.fmtInt(ref.userCount)} people in this upload</span></td>
                <td class="num">${IS.fmtInt(ref.userCount)}</td>
                <td class="num">${IS.fmtPct(ref.habitPct, 1)}</td>
                <td class="num">${ref.avgActionsPerUserWeek.toFixed(1)}</td>
                <td><span style="color:${refTrendColor};font-weight:700;">${refTrendArrow} ${ref.trendPct.toFixed(0)}%</span></td>
                <td>${IS.svgSparkline(ref.weeklyAvg, { color: ink('--accent', '#4C8DFF'), width: 120, height: 26 })}</td>
                <td class="num">${IS.fmtMoneyShort(ref.monthlyValue)}<span class="sub">${IS.fmtMoneyShort(ref.monthlyValuePerUser)}/user</span></td>
                <td class="num">${ref.roi.toFixed(1)}x</td>
            </tr>`;
        }
        tbody.innerHTML = avgRow + orgs.map((o, i) => {
            const trendColor = o.trendPct > 5 ? 'var(--positive)' : o.trendPct < -5 ? 'var(--negative)' : 'var(--text-tertiary)';
            const trendArrow = o.trendPct > 5 ? '&uarr;' : o.trendPct < -5 ? '&darr;' : '&rarr;';
            const sparkColor = o.trendPct >= 0 ? ink('--positive', '#46B77F') : ink('--negative', '#D2685F');
            const dValuePct = ref.monthlyValuePerUser > 0
                ? (o.monthlyValuePerUser - ref.monthlyValuePerUser) / ref.monthlyValuePerUser * 100 : 0;
            const habitChip   = bench ? benchChip(o.habitPct - ref.habitPct, 0.5, v => v.toFixed(1) + ' pts') : '';
            const actionsChip = bench ? benchChip(o.avgActionsPerUserWeek - ref.avgActionsPerUserWeek, 0.1, v => v.toFixed(1)) : '';
            const valueChip   = bench ? benchChip(dValuePct, 1, v => v.toFixed(0) + '%/user') : '';
            const roiChip     = bench ? benchChip(o.roi - ref.roi, 0.05, v => v.toFixed(1) + 'x') : '';
            return `
            <tr class="expandable js-orgRow" data-idx="${i}">
                <td><strong>${esc(o.orgName)}</strong></td>
                <td class="num">${IS.fmtInt(o.userCount)}</td>
                <td class="num">${IS.fmtPct(o.habitPct, 1)}${habitChip}</td>
                <td class="num">${o.avgActionsPerUserWeek.toFixed(1)}${actionsChip}</td>
                <td><span style="color:${trendColor};font-weight:600;">${trendArrow} ${o.trendPct.toFixed(0)}%</span></td>
                <td>${IS.svgSparkline(o.weeklyAvg, { color: sparkColor, width: 120, height: 26 })}</td>
                <td class="num">${IS.fmtMoneyShort(o.monthlyValue)}${valueChip}</td>
                <td class="num">${o.roi.toFixed(1)}x${roiChip}</td>
            </tr>
            <tr class="js-orgDetail" data-idx="${i}" style="display:none;"><td colspan="8" style="padding:0;">
                <div class="org-detail">
                    <strong style="color:var(--text-primary,#F1F5F9);">Cohort distribution at latest week</strong>
                    <div style="margin-top:0.75rem;">
                        ${Object.entries(o.cohortCounts).map(([name, count]) => {
                            if (!count) return '';
                            const color = IS.COHORT_COLORS[name] || ink('--text-tertiary', '#6C7684');
                            return `<span class="cohort-pill" style="background:${color};">${name}: ${count}</span>`;
                        }).join('')}
                    </div>
                    <div style="margin-top:1rem;color:var(--text-secondary,#94A3B8);font-size:0.85rem;">
                        ${o.userCount} users &middot; ${IS.fmtMoneyShort(o.monthlyValue)}/mo &middot; ${o.roi.toFixed(1)}x ROI
                    </div>
                </div>
            </td></tr>`;
        }).join('');
        tbody.querySelectorAll('.js-orgRow').forEach(row => {
            row.addEventListener('click', () => {
                const idx = row.dataset.idx;
                const detail = tbody.querySelector(`.js-orgDetail[data-idx="${idx}"]`);
                if (detail) detail.style.display = detail.style.display === 'none' ? '' : 'none';
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Apps & Behavior — per-app value attribution + cohort behavioral profile
    // ─────────────────────────────────────────────────────────────────────────
    function renderApps(main, data) {
        const personIndex = data.personIndex;
        const cfg = data.config;

        const samplePerson = Object.values(personIndex)[0];
        const hasApps = samplePerson && samplePerson.weeks.some(w => w.apps && Object.keys(w.apps).length > 0);
        if (!hasApps) {
            renderNoApps(main, data, cfg);
            return;
        }

        const appTotals = {};
        const appByCohort = { 'Power Users': {}, 'Habitual Users': {}, 'Novice Users': {}, 'Low Users': {} };
        Object.values(personIndex).forEach(p => {
            const lastWeek = p.weeks[p.weeks.length - 1];
            const cohort = lastWeek ? lastWeek.threshold : 'Non Users';
            p.weeks.forEach(w => {
                if (!w.apps) return;
                Object.entries(w.apps).forEach(([app, n]) => {
                    appTotals[app] = (appTotals[app] || 0) + n;
                    if (appByCohort[cohort]) {
                        appByCohort[cohort][app] = (appByCohort[cohort][app] || 0) + n;
                    }
                });
            });
        });

        const totalAppActions = Object.values(appTotals).reduce((s, n) => s + n, 0);
        const numWeeks = data.sortedDates.length;
        const monthsInWindow = numWeeks / 4.33;
        const appsRanked = Object.entries(appTotals).map(([app, total]) => {
            const monthlyActions = total / monthsInWindow;
            const monthlyValue = (monthlyActions * cfg.minutesPerAction / 60) * cfg.professionalRate;
            return { app, total, monthlyActions, monthlyValue, share: total / Math.max(totalAppActions, 1) };
        }).sort((a, b) => b.total - a.total);

        const totalMonthlyValueAttributed = appsRanked.reduce((s, r) => s + r.monthlyValue, 0);

        const kpis = `
            <div class="kpi-row">
                <div class="kpi"><div class="label">Apps detected</div><div class="value">${appsRanked.length}</div><div class="sub">in your export</div></div>
                <div class="kpi"><div class="label">Top app</div><div class="value" style="font-size:1.25rem;">${esc(appsRanked[0].app)}</div><div class="sub">${IS.fmtPct(appsRanked[0].share * 100, 1)} of actions</div></div>
                <div class="kpi"><div class="label">Total attributed value</div><div class="value">${IS.fmtMoneyShort(totalMonthlyValueAttributed)}/mo</div><div class="sub">across all apps</div></div>
            </div>`;

        const appBarData = appsRanked.slice(0, 12).map(a => ({ label: a.app, value: a.monthlyValue }));
        const attributionCard = `
            <div class="insights-card">
                <h2>Monthly value attribution by app ${IS.tooltip({ label: 'Splits the total monthly productivity value across the apps your users actually performed actions in.', math: 'For each app A: actionsA = &Sigma; over all persons of (&Sigma; weekly app[A] actions). monthlyActionsA = actionsA / (weeks / 4.33). monthlyValueA = monthlyActionsA &times; minutesPerAction / 60 &times; professionalRate.' })}</h2>
                <p class="lede">Action volume per app &times; ${cfg.minutesPerAction} min &times; $${cfg.professionalRate}/hr. Reveals which surface is doing the heavy lifting and where to invest training next.</p>
                ${kpis}
                <div style="overflow-x:auto;">${IS.svgHBarChart(appBarData, { width: 800, color: ink('--accent', '#4C8DFF'), padL: 200, valueFmt: v => IS.fmtMoneyShort(v) })}</div>
                ${IS.mathBlock({ label: 'Per-app value', formula: 'actionsA       = &Sigma;over all persons, weeks of apps[A]\nmonthlyActionsA = actionsA / (numWeeks / 4.33)\nmonthlyValueA  = monthlyActionsA &times; minutesPerAction / 60 &times; professionalRate', note: 'Numerator comes straight from the per-app columns in your Viva export (e.g. "Copilot actions taken in Word").' })}
            </div>`;

        const cohortColors = IS.COHORT_COLORS;
        const profileCards = ['Power Users', 'Habitual Users', 'Novice Users', 'Low Users'].map(cohort => {
            const apps = appByCohort[cohort];
            const totalC = Object.values(apps).reduce((s, n) => s + n, 0);
            if (totalC === 0) {
                return `<div class="behavior-card" style="border-top-color:${cohortColors[cohort]};">
                    <h3>${cohort}</h3>
                    <p style="color:var(--text-secondary,#94A3B8);font-size:0.85rem;margin:0;">No app activity recorded for this cohort.</p>
                </div>`;
            }
            const top = Object.entries(apps)
                .map(([a, n]) => ({ app: a, n, pct: n / totalC * 100 }))
                .sort((a, b) => b.n - a.n)
                .slice(0, 6);
            const max = top[0].pct;
            return `<div class="behavior-card" style="border-top-color:${cohortColors[cohort]};">
                <h3>${cohort}</h3>
                ${top.map(t => `
                    <div class="app-row">
                        <div class="name" title="${esc(t.app)}">${esc(t.app.length > 18 ? t.app.slice(0, 17) + '\u2026' : t.app)}</div>
                        <div class="bar"><div class="bar-fill" style="background:${cohortColors[cohort]};width:${(t.pct / max * 100).toFixed(1)}%;"></div></div>
                        <div class="pct">${t.pct.toFixed(0)}%</div>
                    </div>
                `).join('')}
            </div>`;
        }).join('');

        const profileCard = `
            <div class="insights-card">
                <h2>Behavioral profile by cohort ${IS.tooltip({ label: 'What share of each cohort\'s actions are happening in which app.', math: 'For each (cohort C, app A): actionsC,A = &Sigma; over persons in C of their A-app actions. totalC = &Sigma; over apps. share(C,A) = actionsC,A / totalC.' })}</h2>
                <p class="lede">What share of each cohort's actions happen in which app. Shows the behavioral signature you want Novices to grow into.</p>
                <div class="behavior-grid">${profileCards}</div>
                ${IS.mathBlock({ label: 'Cohort behavioral share', formula: 'actionsC,A = &Sigma; over persons P assigned to cohort C of (&Sigma; weekly app[A] actions)\nshare(C,A) = actionsC,A / &Sigma;over apps actionsC,A &times; 100', note: 'Cohort C is taken from each person\'s threshold at the LATEST week ("current cohort").' })}
            </div>`;

        main.innerHTML = attributionCard + profileCard + meetingImpactCard(personIndex, data.sortedDates, cfg);
    }

    function renderNoApps(main, data, cfg) {
        main.innerHTML = `
            <div class="insights-card">
                <h2>Per-app attribution not available</h2>
                <p class="lede">Your Viva Insights export didn't include the per-app action columns (e.g. <em>Copilot actions taken in Word/Excel/Teams/Outlook</em>). Re-export with those columns selected to unlock app-level value attribution and the behavioral-profile view.</p>
                <p style="color:var(--text-secondary,#94A3B8);font-size:0.9rem;">In the meantime, the meeting &amp; assist-hour module below still works because those columns <em>are</em> present in your export.</p>
            </div>
            ${meetingImpactCard(data.personIndex, data.sortedDates, cfg)}`;
    }

    function meetingImpactCard(personIndex, sortedDates, cfg) {
        let totalRecap = 0, totalAssistHrs = 0;
        Object.values(personIndex).forEach(p => {
            p.weeks.forEach(w => {
                totalRecap += w.ir || 0;
                totalAssistHrs += w.ah || 0;
            });
        });
        const monthsInWindow = sortedDates.length / 4.33;
        const monthlyRecap = totalRecap / monthsInWindow;
        const monthlyAssistHrs = totalAssistHrs / monthsInWindow;
        const recapHoursReclaimed = monthlyRecap * 0.5;
        const recapValue = recapHoursReclaimed * cfg.professionalRate;
        const assistValue = monthlyAssistHrs * cfg.professionalRate;
        return `
            <div class="insights-card">
                <h2>Meeting &amp; assist-hour impact ${IS.tooltip({ label: 'Direct-measured time saved in meetings via Intelligent Recap and Copilot assist hours.', math: 'monthlyRecap = totalRecap / (weeks/4.33). recapHoursReclaimed = monthlyRecap &times; 0.5 hr (heuristic). recapValue = recapHoursReclaimed &times; professionalRate. assistValue = monthlyAssistHrs &times; professionalRate.' })}</h2>
                <p class="lede">Intelligent recap and Copilot assist hours are measured directly by Viva. Modeled here at half an hour reclaimed per recap and full-rate for assist hours.</p>
                <div class="kpi-row">
                    <div class="kpi"><div class="label">Intelligent Recap actions / mo</div><div class="value">${IS.fmtInt(monthlyRecap)}</div><div class="sub">across all users</div></div>
                    <div class="kpi" style="border-left-color:var(--positive);"><div class="label">Modeled meeting hours reclaimed</div><div class="value">${IS.fmtInt(recapHoursReclaimed)}</div><div class="sub">at 0.5 hr / recap</div></div>
                    <div class="kpi" style="border-left-color:var(--positive);"><div class="label">Recap value (monthly)</div><div class="value">${IS.fmtMoneyShort(recapValue)}</div><div class="sub">at $${cfg.professionalRate}/hr</div></div>
                    <div class="kpi" style="border-left-color:var(--accent);"><div class="label">Copilot assist hours / mo</div><div class="value">${IS.fmtInt(monthlyAssistHrs)}</div><div class="sub">measured directly</div></div>
                    <div class="kpi" style="border-left-color:var(--accent);"><div class="label">Assist-hour value</div><div class="value">${IS.fmtMoneyShort(assistValue)}/mo</div><div class="sub">straight-line</div></div>
                </div>
                ${IS.mathBlock({ label: 'Meeting math', formula: 'monthlyRecap        = totalRecap / (weeks / 4.33)\nrecapHoursReclaimed = monthlyRecap &times; 0.5    (heuristic: half-hour per recap)\nrecapValue          = recapHoursReclaimed &times; professionalRate\nassistValue         = monthlyAssistHrs &times; professionalRate', note: 'The 0.5-hr-per-recap factor is conservative. Microsoft research has measured 1.0-1.5 hr per non-attended meeting reclaimed.' })}
            </div>`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Risk & Waste — license waste callout + at-risk power/habitual users
    // ─────────────────────────────────────────────────────────────────────────
    function renderAtRisk(main, data) {
        const personIndex = data.personIndex;
        const sortedDates = data.sortedDates;
        const cfg = data.config;

        const atRisk = IS.computeAtRisk(personIndex, sortedDates);
        const atRiskFromPower = atRisk.filter(r => r.peakCohort === 'Power Users');
        const atRiskFromHabit = atRisk.filter(r => r.peakCohort === 'Habitual Users');

        const cohorts = IS.computeCohorts(personIndex, sortedDates, cfg);
        const nonUsers = cohorts.rows.find(r => r.name === 'Non Users') || { count: 0, monthlyValue: 0, investment: 0 };
        const lowUsers = cohorts.rows.find(r => r.name === 'Low Users') || { count: 0, monthlyValue: 0, investment: 0 };
        const wastedUsers = nonUsers.count + lowUsers.count;
        const wastedSpend = nonUsers.investment + lowUsers.investment;
        const wastedValuePct = (nonUsers.monthlyValue + lowUsers.monthlyValue) / Math.max(cohorts.totals.monthlyValue, 1) * 100;
        const annualWaste = wastedSpend * 12;

        const wasteCard = `
            <div class="waste-callout">
                <h2 style="margin:0 0 0.5rem;color:var(--text-primary);font-size:1.4rem;">License waste opportunity ${IS.tooltip({ label: 'Licenses going to users with little or no usage activity.', math: 'wastedUsers = count(persons where current cohort in {Non, Low}). wastedSpend = wastedUsers &times; licenseCost. annualWaste = wastedSpend &times; 12. wastedValuePct = (NonValue + LowValue) / totalMonthlyValue &times; 100.' })}</h2>
                <p style="color:var(--text-secondary);margin:0 0 1.5rem;">${wastedUsers} licenses sitting at <strong>Non</strong> or <strong>Low</strong> usage. Each one is paying full price for less than ${wastedValuePct < 1 ? wastedValuePct.toFixed(2) : wastedValuePct.toFixed(1)}% of total value generated.</p>
                <div class="kpi-row">
                    <div class="kpi" style="border-left-color:var(--negative);">
                        <div class="label">Wasted licenses</div>
                        <div class="value">${IS.fmtInt(wastedUsers)}</div>
                        <div class="sub">${IS.fmtPct(wastedUsers / Math.max(cohorts.totals.count, 1) * 100, 1)} of base</div>
                    </div>
                    <div class="kpi" style="border-left-color:var(--negative);">
                        <div class="label">Monthly spend at risk</div>
                        <div class="value">${IS.fmtMoney(wastedSpend)}</div>
                        <div class="sub">at $${cfg.licenseCost}/user/month</div>
                    </div>
                    <div class="kpi" style="border-left-color:var(--negative);">
                        <div class="label">Annual waste exposure</div>
                        <div class="value">${IS.fmtMoneyShort(annualWaste)}</div>
                        <div class="sub">if not redeployed</div>
                    </div>
                    <div class="kpi" style="border-left-color:var(--positive);">
                        <div class="label">Value contribution</div>
                        <div class="value">&lt; ${wastedValuePct.toFixed(1)}%</div>
                        <div class="sub">of total monthly value</div>
                    </div>
                </div>
                <p style="color:var(--text-primary);font-size:0.9rem;margin:1rem 0 0;padding:0.75rem 1rem;background:var(--light-gray);border-radius:8px;">
                    <strong>Recommendation:</strong> reassign these ${wastedUsers} licenses to a pilot group of high-need users from your unlicensed pool, or pause them at next renewal. Either move recovers ${IS.fmtMoneyShort(annualWaste)} of annual exposure with negligible value loss.
                </p>
                ${IS.mathBlock({ label: 'Waste math', formula: 'wastedUsers = |{P : cohort(P, latest) &isin; {Non Users, Low Users}}|\nwastedSpend = wastedUsers &times; licenseCost\nannualWaste = wastedSpend &times; 12\nwastedValuePct = (NonValue + LowValue) / totalMonthlyValue &times; 100' })}
            </div>`;

        const atRiskKpis = `
            <div class="kpi-row">
                <div class="kpi" style="border-left-color:var(--negative);">
                    <div class="label">At-risk users</div>
                    <div class="value">${IS.fmtInt(atRisk.length)}</div>
                    <div class="sub">were Power/Habitual, now lower</div>
                </div>
                <div class="kpi" style="border-left-color:var(--negative);">
                    <div class="label">Power Users at risk</div>
                    <div class="value">${IS.fmtInt(atRiskFromPower.length)}</div>
                    <div class="sub">peak engagement slipped</div>
                </div>
                <div class="kpi" style="border-left-color:var(--warn);">
                    <div class="label">Habitual Users at risk</div>
                    <div class="value">${IS.fmtInt(atRiskFromHabit.length)}</div>
                    <div class="sub">losing the habit</div>
                </div>
            </div>`;

        const orgs = [...new Set(atRisk.map(r => r.org))].sort();
        const filterUI = `
            <div style="margin-bottom:1rem;color:var(--text-secondary,#94A3B8);font-size:0.9rem;">
                Filter by org:
                <select class="filter js-orgFilter">
                    <option value="">All organizations</option>
                    ${orgs.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
                </select>
                Filter by peak cohort:
                <select class="filter js-peakFilter">
                    <option value="">All</option>
                    <option value="Power Users">Power Users</option>
                    <option value="Habitual Users">Habitual Users</option>
                </select>
            </div>`;

        const tableHtml = `
            <div style="overflow-x:auto;">
                <table class="risk-table">
                    <thead>
                        <tr>
                            <th>PersonId</th>
                            <th>Organization</th>
                            <th>Peak cohort (last 12w)</th>
                            <th>Current cohort</th>
                            <th class="num">Drop (tiers)</th>
                            <th class="num">Recent actions (4w)</th>
                            <th class="num">Trailing-12w avg</th>
                        </tr>
                    </thead>
                    <tbody class="js-atRiskBody"></tbody>
                </table>
            </div>`;

        main.innerHTML = wasteCard + `
            <div class="insights-card">
                <h2>At-risk Power &amp; Habitual users ${IS.tooltip({ label: 'Users who used to be Power or Habitual but have slipped to a lower cohort in the latest week.', math: 'For each person P: peakCohort = best (lowest-index) cohort across the prior 8 weeks. currentCohort = cohort at latest week. atRisk(P) = peakCohort &isin; {Power, Habitual} AND currentCohort index > peakCohort index. drop = currentIndex - peakIndex.' })}</h2>
                <p class="lede">Users whose peak cohort in the prior 8 weeks was Power or Habitual but who have now slipped down. Highest drop first &mdash; these are your CSM follow-up list.</p>
                ${atRiskKpis}
                ${filterUI}
                ${tableHtml}
                ${IS.mathBlock({ label: 'At-risk math', formula: 'peakCohort(P)    = min-index cohort over weeks [latest-7..latest-1]\ncurrentCohort(P) = cohort at week latest\natRisk(P)        = (peakCohort &isin; {Power, Habitual}) AND (currentIndex > peakIndex)\ndrop(P)          = currentIndex - peakIndex\nrecentActions(P) = &Sigma; actions over last 4 weeks\navg12(P)         = mean(actions) over trailing 12-week window' })}
            </div>`;

        main.__state = { atRisk };
        const repaint = () => renderAtRiskTable(main);
        main.querySelector('.js-orgFilter').addEventListener('change', repaint);
        main.querySelector('.js-peakFilter').addEventListener('change', repaint);
        renderAtRiskTable(main);
    }

    function renderAtRiskTable(main) {
        const state = main.__state;
        const orgFilter = main.querySelector('.js-orgFilter').value;
        const peakFilter = main.querySelector('.js-peakFilter').value;
        const filtered = state.atRisk.filter(r =>
            (!orgFilter || r.org === orgFilter) &&
            (!peakFilter || r.peakCohort === peakFilter)
        );
        const tbody = main.querySelector('.js-atRiskBody');
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:2rem;">No at-risk users match this filter</td></tr>`;
            return;
        }
        tbody.innerHTML = filtered.slice(0, 500).map(r => {
            const peakColor = IS.COHORT_COLORS[r.peakCohort] || ink('--text-tertiary', '#6C7684');
            const currColor = IS.COHORT_COLORS[r.currentCohort] || ink('--text-tertiary', '#6C7684');
            return `<tr>
                <td><code style="font-size:0.8rem;color:var(--text-tertiary);">${esc(r.personId.slice(0, 12))}</code></td>
                <td>${esc(r.org)}</td>
                <td><span class="pill" style="background:${peakColor};">${r.peakCohort}</span></td>
                <td><span class="pill" style="background:${currColor};">${r.currentCohort}</span></td>
                <td class="num" style="color:var(--negative);font-weight:600;">&darr; ${r.drop}</td>
                <td class="num">${IS.fmtInt(r.recentActions)}</td>
                <td class="num">${r.avg12.toFixed(1)}</td>
            </tr>`;
        }).join('') + (filtered.length > 500 ? `<tr><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:1rem;">Showing top 500 of ${filtered.length}</td></tr>` : '');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Forecast — cohort projection + adjusted-CAH slider
    // ─────────────────────────────────────────────────────────────────────────
    function renderForecast(main, data) {
        const personIndex = data.personIndex;
        const sortedDates = data.sortedDates;
        const cfg = data.config;

        const trajectory = IS.computeCohortTrajectory(personIndex, sortedDates);
        const total = Object.keys(personIndex).length;
        const series = trajectory.map((t, i) => {
            const hp = (t.counts['Power Users'] || 0) + (t.counts['Habitual Users'] || 0);
            return { x: i, week: t.week, pct: hp / Math.max(total, 1) * 100, count: hp };
        });

        const fitN = Math.min(series.length, 8);
        const fitSeries = series.slice(-fitN);
        const fit = linearRegression(fitSeries.map(s => s.x), fitSeries.map(s => s.pct));

        const projectN = 13;
        const projection = [];
        for (let i = 1; i <= projectN; i++) {
            const x = series[series.length - 1].x + i;
            const projPct = Math.max(0, Math.min(100, fit.m * x + fit.b));
            const projCount = Math.round(projPct / 100 * total);
            const weekDate = new Date(sortedDates[sortedDates.length - 1]);
            weekDate.setDate(weekDate.getDate() + i * 7);
            projection.push({
                week: weekDate.toISOString().slice(0, 10),
                pct: projPct,
                count: projCount
            });
        }
        const currentPct = series[series.length - 1].pct;
        const projectedPct = projection[projection.length - 1].pct;
        const slopePerWeek = fit.m;

        const chartW = 880, chartH = 280, padL = 56, padR = 24, padT = 16, padB = 44;
        const innerW = chartW - padL - padR, innerH = chartH - padT - padB;
        const combined = series.concat(projection.map(p => ({ pct: p.pct, week: p.week, projected: true })));
        const maxY = Math.max(100, ...combined.map(c => c.pct));
        const xAt = i => padL + (i / (combined.length - 1)) * innerW;
        const yAt = v => padT + innerH - (v / maxY) * innerH;
        const histPts = series.map((s, i) => `${xAt(i).toFixed(1)},${yAt(s.pct).toFixed(1)}`).join(' ');
        const projPts = projection.map((p, i) => `${xAt(series.length + i).toFixed(1)},${yAt(p.pct).toFixed(1)}`).join(' ');
        const connectPts = `${xAt(series.length - 1).toFixed(1)},${yAt(series[series.length - 1].pct).toFixed(1)} ${xAt(series.length).toFixed(1)},${yAt(projection[0].pct).toFixed(1)}`;
        const axisInk = ink('--text-tertiary', '#6C7684');
        const gridInk = ink('--rule', 'rgba(255,255,255,0.075)');
        const actualInk = ink('--accent', '#4C8DFF');
        const projInk = ink('--positive', '#46B77F');
        const todayInk = ink('--warn', '#C9973F');
        const yTicks = [0, 25, 50, 75, 100].filter(v => v <= maxY).map(v =>
            `<text x="${padL - 8}" y="${yAt(v).toFixed(1) + 4}" fill="${axisInk}" font-size="11" text-anchor="end">${v}%</text>
             <line x1="${padL}" x2="${chartW - padR}" y1="${yAt(v).toFixed(1)}" y2="${yAt(v).toFixed(1)}" stroke="${gridInk}"/>`
        ).join('');
        const xTickIdx = [0, series.length - 1, combined.length - 1];
        const xLabels = xTickIdx.map(i => `<text x="${xAt(i).toFixed(1)}" y="${chartH - padB + 18}" fill="${axisInk}" font-size="11" text-anchor="middle">${combined[i].week}</text>`).join('');
        const divider = `<line x1="${xAt(series.length - 1).toFixed(1)}" x2="${xAt(series.length - 1).toFixed(1)}" y1="${padT}" y2="${chartH - padB}" stroke="${todayInk}" stroke-opacity="0.4" stroke-dasharray="4,4"/>
                         <text x="${xAt(series.length - 1).toFixed(1)}" y="${padT + 12}" fill="${todayInk}" font-size="11" text-anchor="middle">today</text>`;
        const forecastSvg = `<svg width="${chartW}" height="${chartH}" viewBox="0 0 ${chartW} ${chartH}" style="max-width:100%;height:auto;">
            ${yTicks}
            <polyline points="${histPts}" fill="none" stroke="${actualInk}" stroke-width="2.5"/>
            <polyline points="${connectPts}" fill="none" stroke="${projInk}" stroke-width="2" stroke-dasharray="3,3" opacity="0.7"/>
            <polyline points="${projPts}" fill="none" stroke="${projInk}" stroke-width="2.5" stroke-dasharray="6,4"/>
            ${divider}
            ${xLabels}
        </svg>
        <div style="display:flex;gap:1.5rem;margin-top:0.5rem;font-size:0.85rem;color:var(--text-secondary,#94A3B8);">
            <span><span style="display:inline-block;width:14px;height:3px;background:var(--accent);vertical-align:middle;margin-right:6px;"></span>Actual</span>
            <span><span style="display:inline-block;width:14px;height:3px;background:var(--positive);vertical-align:middle;margin-right:6px;"></span>Projected (next ${projectN}w)</span>
        </div>`;

        const forecastCard = `
            <div class="insights-card">
                <h2>Forecast: % Habitual + Power Users ${IS.tooltip({ label: 'Linear extrapolation of the % of users at Habitual or Power, projected 13 weeks out.', math: 'Fit ordinary least squares y = m&middot;x + b on the last min(8, available) weekly observations of pct(t) = (Power_t + Habitual_t) / totalUsers &times; 100. Project pct(t+k) = m&middot;(t+k)+b for k=1..13, clamped to [0,100].' })}</h2>
                <p class="lede">Linear extrapolation of the last ${fitN} weeks of real cohort migration, projected ${projectN} weeks out. Slope ${slopePerWeek >= 0 ? '+' : ''}${slopePerWeek.toFixed(2)}pp / week.</p>
                <div class="kpi-row">
                    <div class="kpi"><div class="label">Today</div><div class="value">${currentPct.toFixed(1)}%</div><div class="sub">${IS.fmtInt(series[series.length - 1].count)} users</div></div>
                    <div class="kpi" style="border-left-color:var(--positive);"><div class="label">In ${projectN} weeks</div><div class="value">${projectedPct.toFixed(1)}%</div><div class="sub">${IS.fmtInt(projection[projection.length - 1].count)} users</div></div>
                    <div class="kpi" style="border-left-color:${slopePerWeek > 0 ? 'var(--positive)' : 'var(--negative)'};"><div class="label">Trajectory</div><div class="value">${slopePerWeek >= 0 ? '+' : ''}${slopePerWeek.toFixed(2)}pp/w</div><div class="sub">${slopePerWeek > 0.5 ? 'strong growth' : slopePerWeek > 0 ? 'mild growth' : slopePerWeek > -0.5 ? 'flat' : 'declining'}</div></div>
                </div>
                <div style="overflow-x:auto;">${forecastSvg}</div>
                ${IS.mathBlock({ label: 'Linear regression', formula: 'For y_t = pct of habitual+power at week t over the last 8 weeks:\n   m = (n &Sigma;xy - &Sigma;x &Sigma;y) / (n &Sigma;x&sup2; - (&Sigma;x)&sup2;)\n   b = (&Sigma;y - m &Sigma;x) / n\nProjected pct(t+k) = clamp(m&middot;(t+k)+b, 0, 100)  for k = 1..13', note: 'A simple OLS fit. For datasets &lt; 8 weeks the available range is used. Slope is reported as percentage-points per week.' })}
            </div>`;

        let totalAssistHrs = 0, totalRecap = 0;
        Object.values(personIndex).forEach(p => {
            p.weeks.forEach(w => {
                totalAssistHrs += w.ah || 0;
                totalRecap += w.ir || 0;
            });
        });
        const monthsInWindow = sortedDates.length / 4.33;
        const monthlyAssistHrs = totalAssistHrs / monthsInWindow;
        const monthlyRecap = totalRecap / monthsInWindow;

        const cohorts = IS.computeCohorts(personIndex, sortedDates, cfg);
        const baselineMonthlyValue = cohorts.totals.monthlyValue;
        const baselineRoi = cohorts.totals.roi;

        const cahCard = `
            <div class="insights-card">
                <h2>Adjusted Copilot Assisted Hours valuation ${IS.tooltip({ label: 'Alternate ROI model based on Viva-measured Copilot assisted hours instead of action&middot;minutes math.', math: 'adjustedMonthlyValue = (monthlyAssistHrs + monthlyRecap &times; 0.5) &times; penaltyFactor &times; professionalRate. adjustedRoi = adjustedMonthlyValue / monthlyInvestment.' })}</h2>
                <p class="lede">Alternate ROI model. Instead of <code>actions &times; minutes</code>, value is computed from <strong>Copilot assisted hours</strong> measured directly by Viva, plus half of Intelligent Recap actions counted as reclaimed meeting hours, then dampened by a <strong>penalty factor</strong> to account for partial attribution.</p>
                <div class="slider-control">
                    <label>Penalty factor (1.0 = full credit)</label>
                    <input type="range" class="js-penalty" min="0.25" max="1.0" step="0.05" value="1.0">
                    <span class="val js-penaltyVal">1.00</span>
                </div>
                <div class="js-cahKpis"></div>
                ${IS.mathBlock({ label: 'Adjusted CAH formula', formula: 'recapHours          = monthlyRecap &times; 0.5\nadjustedMonthlyValue = (monthlyAssistHrs + recapHours) &times; penalty &times; professionalRate\nadjustedRoi          = adjustedMonthlyValue / (totalUsers &times; licenseCost)', note: 'Use penalty &lt; 1 to account for the fact that not all assist hours map 1:1 to net productivity. Conservative deployments often use 0.5-0.7.' })}
            </div>`;

        main.innerHTML = forecastCard + cahCard;

        const penaltyEl = main.querySelector('.js-penalty');
        const penaltyValEl = main.querySelector('.js-penaltyVal');
        const cahKpisEl = main.querySelector('.js-cahKpis');
        const renderCah = () => {
            const penalty = parseFloat(penaltyEl.value);
            penaltyValEl.textContent = penalty.toFixed(2);
            const recapHours = monthlyRecap * 0.5;
            const adjustedMonthlyValue = (monthlyAssistHrs + recapHours) * penalty * cfg.professionalRate;
            const investment = cohorts.totals.investment;
            const adjustedRoi = investment > 0 ? adjustedMonthlyValue / investment : 0;
            const diff = adjustedMonthlyValue - baselineMonthlyValue;
            const diffPct = baselineMonthlyValue > 0 ? (diff / baselineMonthlyValue * 100) : 0;
            cahKpisEl.innerHTML = `
                <div class="kpi-row">
                    <div class="kpi"><div class="label">Baseline (actions &times; min)</div><div class="value">${IS.fmtMoneyShort(baselineMonthlyValue)}</div><div class="sub">${baselineRoi.toFixed(1)}x ROI</div></div>
                    <div class="kpi" style="border-left-color:var(--positive);"><div class="label">Adjusted CAH at ${penalty.toFixed(2)}&times;</div><div class="value">${IS.fmtMoneyShort(adjustedMonthlyValue)}</div><div class="sub">${adjustedRoi.toFixed(1)}x ROI</div></div>
                    <div class="kpi" style="border-left-color:${diff >= 0 ? 'var(--positive)' : 'var(--negative)'};"><div class="label">Variance</div><div class="value">${diff >= 0 ? '+' : ''}${IS.fmtMoneyShort(Math.abs(diff))}</div><div class="sub">${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(0)}% vs baseline</div></div>
                </div>`;
        };
        penaltyEl.addEventListener('input', renderCah);
        renderCah();
    }

    function linearRegression(xs, ys) {
        const n = xs.length;
        const xMean = xs.reduce((s, v) => s + v, 0) / n;
        const yMean = ys.reduce((s, v) => s + v, 0) / n;
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            num += (xs[i] - xMean) * (ys[i] - yMean);
            den += (xs[i] - xMean) ** 2;
        }
        const m = den === 0 ? 0 : num / den;
        const b = yMean - m * xMean;
        return { m, b };
    }

    window.InsightsTabs = {
        renderAdoption,
        renderOrgs,
        renderApps,
        renderAtRisk,
        renderForecast
    };
})();
