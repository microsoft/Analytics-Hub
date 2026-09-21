// insights-shared.js
// Shared persistence + analytics helpers for the Insights subpages.
// Designed to work with Viva Insights per-person uploads parsed by script.js.
// Data flow: index.html (script.js) parses CSV -> saveSharedData() into sessionStorage.
// Subpages (insights/orgs/at-risk/apps/forecast) call loadSharedData() to hydrate.

(function (global) {
    const STORAGE_KEY = 'cri_shared_v1';
    const THEME_KEY = 'cri_theme';
    const COHORT_ORDER = ['Power Users', 'Habitual Users', 'Novice Users', 'Low Users', 'Non Users'];

    // ── Theme-aware colour resolution ────────────────────────────────────────
    // Charts are emitted as SVG strings, so they need real colour values rather
    // than var() references. Read them off the root element and cache per theme;
    // the cache invalidates the moment data-theme changes.
    let _varCache = { theme: null, vals: {} };
    function cssVar(name, fallback) {
        const theme = (document.documentElement.getAttribute('data-theme') || 'dark');
        if (_varCache.theme !== theme) _varCache = { theme: theme, vals: {} };
        if (_varCache.vals[name] === undefined) {
            let v = '';
            try { v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); } catch (e) {}
            _varCache.vals[name] = v || fallback || '';
        }
        return _varCache.vals[name];
    }

    // Cohort identity is categorical data encoding, defined by the --cohort-*
    // ramp in styles.css so both themes stay in lockstep. Exposed as live
    // getters so existing `IS.COHORT_COLORS[name]` call sites keep working.
    const COHORT_TOKENS = {
        'Power Users':    '--cohort-power',
        'Habitual Users': '--cohort-habitual',
        'Novice Users':   '--cohort-novice',
        'Low Users':      '--cohort-low',
        'Non Users':      '--cohort-non'
    };
    const COHORT_COLORS = {};
    Object.keys(COHORT_TOKENS).forEach(name => {
        Object.defineProperty(COHORT_COLORS, name, {
            enumerable: true,
            get: () => cssVar(COHORT_TOKENS[name], '#8892A0')
        });
    });

    // ── Persistence ──────────────────────────────────────────────────────────
    function saveSharedData(uploadedData, config) {
        if (!uploadedData || !uploadedData.isVivaInsights) {
            // Only the per-person Viva path supports the subpages
            try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
            return false;
        }
        try {
            // Slim personIndex to primitives only (no Date objects).
            const slim = {};
            Object.entries(uploadedData.personIndex).forEach(([pid, p]) => {
                slim[pid] = {
                    org: p.org || '',
                    orgAgg: p.orgAgg || 'Other',
                    fn: p.fn || '',
                    weeks: p.weeks.map(w => ({
                        d: w.d,
                        a: +w.a || 0,
                        ad: +w.ad || 0,
                        ed: +w.ed || 0,
                        ah: +w.ah || 0,
                        ir: +w.ir || 0,
                        threshold: w.threshold || 'Non Users',
                        avg12: +w.avg12 || 0,
                        apps: w.apps || null   // optional per-app map
                    }))
                };
            });
            const payload = {
                version: 1,
                savedAt: new Date().toISOString(),
                sortedDates: uploadedData.sortedDates,
                dateRange: uploadedData.dateRange,
                detectedWeeks: uploadedData.detectedWeeks,
                personIndex: slim,
                groupLabel: uploadedData.groupLabel || 'Organization',
                config: {
                    licenseCost: +config.licenseCost || 30,
                    professionalRate: +config.professionalRate || 78,
                    minutesPerAction: +config.minutesPerAction || 6,
                    totalPurchasedLicenses: +config.totalPurchasedLicenses || 0,
                    intelligentRecapActions: +config.intelligentRecapActions || 0
                },
                hasAppData: !!uploadedData.hasAppData,
                appColumns: uploadedData.appColumns || []
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            return true;
        } catch (e) {
            console.warn('Could not persist shared insights data:', e.message);
            // Quota exceeded or other — subpages will show empty state.
            try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
            return false;
        }
    }

    function loadSharedData() {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            console.warn('Could not load shared insights data:', e.message);
            return null;
        }
    }

    function hasSharedData() {
        return !!sessionStorage.getItem(STORAGE_KEY);
    }

    // ── Empty state ──────────────────────────────────────────────────────────
    function renderEmptyState(container, pageName) {
        container.innerHTML = `
        <div class="empty-state" style="background: var(--surface, #1E293B); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 16px; padding: 3rem 2rem; margin: 2rem 0; text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📊</div>
            <h2 style="color: var(--text-primary, #F1F5F9); margin-bottom: 0.5rem;">No data loaded yet</h2>
            <p style="color: var(--text-secondary, #94A3B8); max-width: 540px; margin: 0 auto 1.5rem;">
                The <strong>${pageName}</strong> page works with a Viva Insights per-person CSV export.
                Upload your file on the main page first, then return here. Your data stays in this browser tab only.
            </p>
            <a href="index.html" style="display: inline-block; padding: 0.6875rem 1.375rem; background: var(--accent); color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.875rem;">
                Go to upload &rarr;
            </a>
        </div>`;
    }

    // ── Number formatting ────────────────────────────────────────────────────
    const fmtInt = (n) => Number(Math.round(n || 0)).toLocaleString();
    const fmtMoney = (n) => '$' + Math.round(n || 0).toLocaleString();
    const fmtMoneyShort = (n) => {
        const v = +n || 0;
        if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
        if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
        return '$' + Math.round(v).toLocaleString();
    };
    const fmtPct = (n, digits = 0) => (n || 0).toFixed(digits) + '%';

    // ── Cohort recompute (mirrors script.js / Power BI) ─────────────────────
    function classifyThreshold(avg12, habit) {
        if (avg12 >= 20 && habit) return 'Power Users';
        if (avg12 >= 8  && habit) return 'Habitual Users';
        if (avg12 >= 1)           return 'Novice Users';
        if (avg12 >  0)           return 'Low Users';
        return 'Non Users';
    }

    // Compute cohorts for the window defined by dateSlice (array of YYYY-MM-DD strings)
    function computeCohorts(personIndex, dateSlice, config) {
        const set = new Set(dateSlice);
        const rate = config.professionalRate;
        const mpa = config.minutesPerAction;
        const licenseCost = config.licenseCost;
        const buckets = {};
        COHORT_ORDER.forEach(name => buckets[name] = { count: 0, actionsSum: 0, weeksActive: 0 });

        Object.values(personIndex).forEach(p => {
            const inWin = p.weeks.filter(w => set.has(w.d));
            if (inWin.length === 0) return;
            const last = inWin.reduce((a, b) => a.d > b.d ? a : b);
            const cohort = last.threshold || 'Non Users';
            const b = buckets[cohort];
            if (!b) return;
            b.count += 1;
            b.actionsSum += inWin.reduce((s, w) => s + w.a, 0);
            b.weeksActive += inWin.length;
        });

        const rows = COHORT_ORDER.map(name => {
            const b = buckets[name];
            const avgWeeks = b.count > 0 ? b.weeksActive / b.count : 0;
            const avgWeeklyActions = b.count > 0 && avgWeeks > 0
                ? (b.actionsSum / b.count) / avgWeeks
                : 0;
            const actionsPerMonth = avgWeeklyActions * 4.33;
            const investment = b.count * licenseCost;
            const totalWeeklyAcross = avgWeeks > 0 ? b.actionsSum / avgWeeks : 0;
            const totalMonthly = totalWeeklyAcross * 4.33;
            const monthlyValue = (totalMonthly * mpa / 60) * rate;
            const roi = investment > 0 ? monthlyValue / investment : 0;
            return { name, count: b.count, actionsPerMonth, investment, monthlyValue, roi };
        });
        const totalCount = rows.reduce((s, r) => s + r.count, 0);
        const totalInv = rows.reduce((s, r) => s + r.investment, 0);
        const totalVal = rows.reduce((s, r) => s + r.monthlyValue, 0);
        return {
            rows,
            totals: {
                count: totalCount,
                investment: totalInv,
                monthlyValue: totalVal,
                roi: totalInv > 0 ? totalVal / totalInv : 0
            }
        };
    }

    // For each week in the timeline, classify every person at that week's trailing 12w window
    // and return { week: 'YYYY-MM-DD', counts: { 'Power Users': n, ... } }
    function computeCohortTrajectory(personIndex, sortedDates) {
        return sortedDates.map(d => {
            const counts = { 'Power Users': 0, 'Habitual Users': 0, 'Novice Users': 0, 'Low Users': 0, 'Non Users': 0 };
            Object.values(personIndex).forEach(p => {
                // person's week at this date (if exists), or last week <= d
                const wkAtOrBefore = p.weeks.filter(w => w.d <= d).pop();
                if (!wkAtOrBefore) return;
                const threshold = wkAtOrBefore.threshold || 'Non Users';
                counts[threshold] = (counts[threshold] || 0) + 1;
            });
            return { week: d, counts };
        });
    }

    // For two windows (recent N weeks vs prior N weeks), compute a migration matrix:
    // matrix[fromCohort][toCohort] = personCount
    function computeMigration(personIndex, sortedDates, windowSize) {
        const n = sortedDates.length;
        const recent = sortedDates.slice(Math.max(0, n - windowSize));
        const prior  = sortedDates.slice(Math.max(0, n - windowSize * 2), Math.max(0, n - windowSize));
        if (recent.length === 0 || prior.length === 0) return null;
        const lastRecent = recent[recent.length - 1];
        const lastPrior  = prior[prior.length - 1];
        const matrix = {};
        COHORT_ORDER.forEach(from => {
            matrix[from] = {};
            COHORT_ORDER.forEach(to => { matrix[from][to] = 0; });
        });
        Object.values(personIndex).forEach(p => {
            const wPrior  = p.weeks.filter(w => w.d <= lastPrior).pop();
            const wRecent = p.weeks.filter(w => w.d <= lastRecent).pop();
            if (!wPrior || !wRecent) return;
            const from = wPrior.threshold || 'Non Users';
            const to   = wRecent.threshold || 'Non Users';
            matrix[from][to] += 1;
        });
        return { matrix, recentLabel: lastRecent, priorLabel: lastPrior, windowSize };
    }

    // Time-to-habit: for every person who EVER reached Power or Habitual,
    // count weeks from their first non-zero week to their first habit week.
    function computeTimeToHabit(personIndex) {
        const results = [];
        Object.values(personIndex).forEach(p => {
            let firstAction = null;
            let firstHabit = null;
            for (const w of p.weeks) {
                if (firstAction === null && w.a > 0) firstAction = w.d;
                if (firstHabit === null && (w.threshold === 'Power Users' || w.threshold === 'Habitual Users')) {
                    firstHabit = w.d;
                    break;
                }
            }
            if (firstAction && firstHabit) {
                const days = (new Date(firstHabit) - new Date(firstAction)) / 86400000;
                const weeks = Math.max(0, Math.round(days / 7));
                results.push({ personId: 'p', firstAction, firstHabit, weeks });
            }
        });
        if (results.length === 0) return { count: 0, median: null, mean: null, histogram: [] };
        const weeksArr = results.map(r => r.weeks).sort((a, b) => a - b);
        const median = weeksArr[Math.floor(weeksArr.length / 2)];
        const mean = weeksArr.reduce((s, w) => s + w, 0) / weeksArr.length;
        const maxW = Math.max(...weeksArr, 12);
        const bins = Math.min(13, maxW + 1);
        const histogram = Array(bins).fill(0);
        weeksArr.forEach(w => {
            const idx = Math.min(w, bins - 1);
            histogram[idx] += 1;
        });
        return { count: results.length, median, mean, histogram, maxWeeks: maxW };
    }

    // At-risk: users who were Power/Habitual at any week in the priorWindow but
    // dropped to Novice/Low/Non in their LATEST week.
    function computeAtRisk(personIndex, sortedDates) {
        const n = sortedDates.length;
        if (n < 8) return [];
        const recentWeeks = new Set(sortedDates.slice(Math.max(0, n - 4)));
        const priorWeeks = new Set(sortedDates.slice(Math.max(0, n - 12), Math.max(0, n - 4)));
        const atRisk = [];
        Object.entries(personIndex).forEach(([pid, p]) => {
            const wasHabitOrPower = p.weeks.some(w => priorWeeks.has(w.d) &&
                (w.threshold === 'Power Users' || w.threshold === 'Habitual Users'));
            if (!wasHabitOrPower) return;
            const recent = p.weeks.filter(w => recentWeeks.has(w.d));
            if (recent.length === 0) return;
            const last = recent.reduce((a, b) => a.d > b.d ? a : b);
            const peak = p.weeks
                .filter(w => priorWeeks.has(w.d) && (w.threshold === 'Power Users' || w.threshold === 'Habitual Users'))
                .reduce((a, b) => COHORT_ORDER.indexOf(a.threshold) < COHORT_ORDER.indexOf(b.threshold) ? a : b);
            const currentRank = COHORT_ORDER.indexOf(last.threshold);
            const peakRank = COHORT_ORDER.indexOf(peak.threshold);
            if (currentRank > peakRank) {
                atRisk.push({
                    personId: pid,
                    org: p.orgAgg || p.org || 'Other',
                    peakCohort: peak.threshold,
                    currentCohort: last.threshold,
                    drop: currentRank - peakRank,
                    recentActions: recent.reduce((s, w) => s + w.a, 0),
                    avg12: last.avg12 || 0
                });
            }
        });
        atRisk.sort((a, b) => b.drop - a.drop || b.recentActions - a.recentActions);
        return atRisk;
    }

    // ── SVG chart helpers (dependency-free) ─────────────────────────────────
    function svgSparkline(values, opts = {}) {
        const w = opts.width || 90;
        const h = opts.height || 24;
        const color = opts.color || cssVar('--accent', '#4C8DFF');
        if (!values || values.length < 2) return `<svg width="${w}" height="${h}"></svg>`;
        const max = Math.max(...values, 1);
        const min = Math.min(...values, 0);
        const range = max - min || 1;
        const pts = values.map((v, i) => {
            const x = (i / (values.length - 1)) * w;
            const y = h - ((v - min) / range) * h;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
        return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="vertical-align: middle;">
            <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
        </svg>`;
    }

    // Stacked area: data = [{week, counts: {cohort: n}}], cohorts = order array
    function svgStackedArea(data, opts = {}) {
        const W = opts.width || 880;
        const H = opts.height || 320;
        const padL = 56, padR = 24, padT = 16, padB = 44;
        const innerW = W - padL - padR;
        const innerH = H - padT - padB;
        const cohorts = opts.cohorts || COHORT_ORDER;
        const colors = opts.colors || COHORT_COLORS;
        if (!data || data.length === 0) return `<svg width="${W}" height="${H}"></svg>`;

        const totals = data.map(d => cohorts.reduce((s, c) => s + (d.counts[c] || 0), 0));
        const maxTotal = Math.max(...totals, 1);

        // Build cumulative bands
        let bandsSvg = '';
        const xAt = i => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
        const yAt = v => padT + innerH - (v / maxTotal) * innerH;

        // Build per-cohort cumulative top/bottom values
        const cumLower = data.map(() => 0);
        cohorts.forEach(cohort => {
            const upper = data.map((d, i) => cumLower[i] + (d.counts[cohort] || 0));
            const topPts = upper.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`);
            const bottomPts = cumLower.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).reverse();
            bandsSvg += `<polygon points="${topPts.concat(bottomPts).join(' ')}" fill="${colors[cohort]}" opacity="0.78"/>`;
            upper.forEach((v, i) => { cumLower[i] = v; });
        });

        // X-axis labels (first, middle, last)
        const axisInk = cssVar('--text-tertiary', '#6C7684');
        const gridInk = cssVar('--rule', 'rgba(255,255,255,0.075)');
        const ticks = [];
        const tickIdx = [0, Math.floor(data.length / 2), data.length - 1];
        tickIdx.forEach(i => {
            const x = xAt(i);
            ticks.push(`<text x="${x.toFixed(1)}" y="${H - padB + 18}" fill="${axisInk}" font-size="11" text-anchor="middle">${data[i].week}</text>`);
        });
        // Y-axis ticks (0, mid, max)
        const yTicks = [0, Math.round(maxTotal / 2), maxTotal].map(v =>
            `<text x="${padL - 8}" y="${yAt(v).toFixed(1) + 4}" fill="${axisInk}" font-size="11" text-anchor="end">${v.toLocaleString()}</text>
             <line x1="${padL}" x2="${W - padR}" y1="${yAt(v).toFixed(1)}" y2="${yAt(v).toFixed(1)}" stroke="${gridInk}"/>`
        ).join('');

        // Legend
        const legend = cohorts.map((c, i) => {
            const lx = padL + i * 130;
            return `<rect x="${lx}" y="${H - 12}" width="10" height="10" fill="${colors[c]}"/>
                    <text x="${lx + 14}" y="${H - 3}" fill="${axisInk}" font-size="11">${c}</text>`;
        }).join('');

        return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto;">
            ${yTicks}
            ${bandsSvg}
            ${ticks.join('')}
        </svg>
        <div style="display:flex;flex-wrap:wrap;gap:0.75rem 1.25rem;margin-top:0.5rem;font-size:0.85rem;color:var(--text-secondary,#94A3B8);">
            ${cohorts.map(c => `<span><span style="display:inline-block;width:10px;height:10px;background:${colors[c]};margin-right:6px;border-radius:2px;"></span>${c}</span>`).join('')}
        </div>`;
    }

    // Simple bar chart: data = [{label, value}]
    function svgBarChart(data, opts = {}) {
        const W = opts.width || 720;
        const H = opts.height || 280;
        const padL = 80, padR = 24, padT = 16, padB = 40;
        const innerW = W - padL - padR;
        const innerH = H - padT - padB;
        if (!data || data.length === 0) return `<svg width="${W}" height="${H}"></svg>`;
        const max = Math.max(...data.map(d => d.value), 1);
        const barW = innerW / data.length * 0.7;
        const gap = innerW / data.length * 0.3;
        const color = opts.color || cssVar('--accent', '#4C8DFF');
        const valueFmt = opts.valueFmt || (v => v.toLocaleString());
        const labelInk = cssVar('--text-primary', '#E9ECF1');
        const axisInk = cssVar('--text-tertiary', '#6C7684');

        const bars = data.map((d, i) => {
            const x = padL + i * (barW + gap) + gap / 2;
            const h = (d.value / max) * innerH;
            const y = padT + innerH - h;
            return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${color}" opacity="0.85"/>
                    <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" fill="${labelInk}" font-size="11" text-anchor="middle">${valueFmt(d.value)}</text>
                    <text x="${(x + barW / 2).toFixed(1)}" y="${H - 6}" fill="${axisInk}" font-size="11" text-anchor="middle">${d.label}</text>`;
        }).join('');

        return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto;">${bars}</svg>`;
    }

    // Horizontal bar chart (good for org leaderboards)
    function svgHBarChart(data, opts = {}) {
        const W = opts.width || 720;
        const rowH = opts.rowHeight || 26;
        const padL = opts.padL || 180;
        const padR = 60;
        const padT = 8;
        const padB = 8;
        const H = padT + padB + data.length * rowH;
        const innerW = W - padL - padR;
        if (!data || data.length === 0) return `<svg width="${W}" height="40"></svg>`;
        const max = Math.max(...data.map(d => d.value), 1);
        const color = opts.color || cssVar('--accent', '#4C8DFF');
        const fmt = opts.valueFmt || (v => v.toLocaleString());
        const labelInk = cssVar('--text-primary', '#E9ECF1');
        const axisInk = cssVar('--text-tertiary', '#6C7684');

        const rows = data.map((d, i) => {
            const y = padT + i * rowH;
            const bw = (d.value / max) * innerW;
            return `<text x="${padL - 10}" y="${y + rowH * 0.65}" fill="${labelInk}" font-size="12" text-anchor="end">${d.label}</text>
                    <rect x="${padL}" y="${y + 4}" width="${bw.toFixed(1)}" height="${rowH - 10}" fill="${color}" opacity="0.85" rx="3"/>
                    <text x="${padL + bw + 6}" y="${y + rowH * 0.65}" fill="${axisInk}" font-size="11">${fmt(d.value)}</text>`;
        }).join('');

        return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto;">${rows}</svg>`;
    }

    // ── Theme toggle ─────────────────────────────────────────────────────────
    // The <head> of every page applies the stored theme before the stylesheet
    // resolves, so there is no flash of the wrong theme. This module only owns
    // the control itself: injection, click handling, persistence.
    const SUN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2.6M12 19v2.6M4.2 4.2l1.9 1.9M17.9 17.9l1.9 1.9M2.4 12h2.6M19 12h2.6M4.2 19.8l1.9-1.9M17.9 6.1l1.9-1.9"/></svg>';
    const MOON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.4 14.2A8.4 8.4 0 0 1 9.8 3.6a8.4 8.4 0 1 0 10.6 10.6z"/></svg>';

    function getTheme() {
        return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function paintToggle(btn) {
        const isLight = getTheme() === 'light';
        // Icon shows the destination, not the current state.
        btn.innerHTML = isLight ? MOON_ICON : SUN_ICON;
        btn.setAttribute('aria-pressed', String(!isLight));
        btn.setAttribute('title', isLight ? 'Switch to dark' : 'Switch to light');
        btn.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
    }

    function setTheme(theme) {
        const next = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
        document.querySelectorAll('.theme-toggle').forEach(paintToggle);
        document.dispatchEvent(new CustomEvent('cri:themechange', { detail: { theme: next } }));
    }

    // Injects the control into .header-actions, creating that slot only when the
    // page has a header but no actions bar, and falling back to the nav rule on
    // pages that have neither. Silently does nothing when no host exists at all
    // — same existence-guard discipline as the nav helpers.
    function mountThemeToggle() {
        if (document.querySelector('.theme-toggle')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-toggle';
        btn.addEventListener('click', () => setTheme(getTheme() === 'light' ? 'dark' : 'light'));
        paintToggle(btn);

        let slot = document.querySelector('.header-actions');
        if (!slot) {
            const host = document.querySelector('header .header-content') || document.querySelector('header');
            if (host) {
                slot = document.createElement('div');
                slot.className = 'header-actions';
                host.appendChild(slot);
            }
        }
        if (!slot) {
            const nav = document.querySelector('.nav-buttons');
            if (!nav) return;
            btn.classList.add('theme-toggle-nav');
            nav.appendChild(btn);
            return;
        }
        slot.appendChild(btn);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountThemeToggle);
    } else {
        mountThemeToggle();
    }

    // ── Standard nav for all pages ──────────────────────────────────────────
    const NAV_ITEMS = [
        { href: 'index.html',          label: 'Full Data Analysis' },
        { href: 'roi-calculator.html', label: 'ROI Calculator' },
        { href: 'Start Here.html',     label: 'Adoption Journey' },
        { href: 'changelog.html',      label: "What's New" }
    ];

    function renderNav(activeHref) {
        return `<nav class="nav-buttons">${NAV_ITEMS.map(item => {
            const active = item.href === activeHref ? ' nav-btn-active' : '';
            return `<a href="${item.href}" class="nav-btn${active}">
                <span class="nav-text">${item.label}</span>
            </a>`;
        }).join('')}</nav>`;
    }

    function renderHeader(title, subtitle) {
        return `<header>
            <div class="header-content">
                <div>
                    <h1>${title}</h1>
                    <p class="subtitle">${subtitle}</p>
                </div>
            </div>
        </header>`;
    }

    // ── Tooltip + math-block helper ──────────────────────────────────────────
    // tooltip({ label, math, source })  -> a small hover bubble (CSS-only) shown next to a section title.
    //   label  - one-line plain-English description of what this metric/section means
    //   math   - formal formula or rule. Use unicode &times; &divide; &ge; etc.
    //   source - (optional) where the rule is defined, e.g. "Power BI Adoption template (Adoption M Code.txt)"
    function tooltip(opts) {
        opts = opts || {};
        const clean = (v) => String(v == null ? '' : v).replace(/"/g, '&quot;').trim();
        // Native title attributes can't hold markup, so bullets are drawn with • + newlines.
        const bullet = (v) => (clean(v).indexOf('|') !== -1
            ? clean(v).split('|')
            : clean(v).replace(/([a-z0-9%)\]])\.\s+(?=[A-Z])/g, '$1\u0000').split('\u0000'))
            .map(s => s.trim().replace(/\s*\.\s*$/, ''))
            .filter(Boolean)
            .map(s => `\u2022 ${s}`)
            .join('\n');
        const lines = [];
        if (opts.label) lines.push(bullet(opts.label));
        if (opts.math) lines.push('', 'Math:', `\u2022 ${clean(opts.math)}`);
        if (opts.source) lines.push('', 'Source:', `\u2022 ${clean(opts.source)}`);
        const title = lines.join('\n');
        return `<span class="cri-tip" tabindex="0" title="${title}" aria-label="${title}">&#9432;</span>`;
    }

    // mathBlock({ label, formula, note })  -> small math callout under a card body.
    // Each newline-separated line of `formula` becomes one bullet; the text itself
    // (including HTML entities such as &times; / &divide; / &ge;) is passed through verbatim.
    function mathBlock(opts) {
        opts = opts || {};
        const label   = opts.label   || 'Math';
        const formula = opts.formula || '';
        const note    = opts.note    || '';
        const items = String(formula).split('\n')
            .map(line => line.replace(/\s+$/, ''))
            .filter(line => line.trim() !== '')
            .map(line => `<li class="cri-math-item">${line.trim()}</li>`)
            .join('');
        return `<div class="cri-math">
            <div class="cri-math-label">${label}</div>
            ${items ? `<ul class="cri-math-list">${items}</ul>` : ''}
            ${note ? `<div class="cri-math-note">${note}</div>` : ''}
        </div>`;
    }

    // ── Site-wide footer with reference links ────────────────────────────────
    function renderFooter() {
        return `<footer class="cri-footer">
            <p>M365 Copilot Productivity ROI Calculator Suite &middot; All data processed locally in your browser</p>
            <p class="cri-footer-links">
                Reference:
                <a href="https://microsoft.github.io/Analytics-Hub/" target="_blank" rel="noopener">Microsoft Analytics Hub</a>
                &middot;
                <a href="https://learn.microsoft.com/viva/insights/advanced/analyst/templates/microsoft-365-copilot-adoption" target="_blank" rel="noopener">Microsoft 365 Copilot Adoption Report</a>
                &middot;
                <a href="https://aka.ms/decodingsuperusage" target="_blank" rel="noopener">Super Usage Report</a>
            </p>
            <p class="footer-nav"><a href="run-locally.html">Run Locally</a></p>
        </footer>`;
    }

    // Expose
    global.InsightsShared = {
        STORAGE_KEY,
        THEME_KEY,
        COHORT_ORDER,
        COHORT_COLORS,
        cssVar,
        getTheme,
        setTheme,
        mountThemeToggle,
        saveSharedData,
        loadSharedData,
        hasSharedData,
        renderEmptyState,
        renderNav,
        renderHeader,
        renderFooter,
        tooltip,
        mathBlock,
        fmtInt,
        fmtMoney,
        fmtMoneyShort,
        fmtPct,
        classifyThreshold,
        computeCohorts,
        computeCohortTrajectory,
        computeMigration,
        computeTimeToHabit,
        computeAtRisk,
        svgSparkline,
        svgStackedArea,
        svgBarChart,
        svgHBarChart
    };
})(window);
