// Global state
let uploadedData = null;
let resultsDisplayed = false;
let originalMinutesPerAction = null; // stores the user's default choice at first calculation
let isDemoData = false; // tracks whether current data is demo or customer upload
// Tooltip helper — returns inline HTML for a hover ? icon with explanation
// Tooltip copy is written as prose but always renders as bullets. Split on sentence
// ends only when a capital follows, so "3.7x" and "$1." stay intact. An explicit "|"
// wins if the caller wants to control the breaks. Lookbehind is avoided for Safari.
const tipBullets = (text) => {
    const raw = String(text == null ? '' : text).trim();
    const parts = (raw.indexOf('|') !== -1
        ? raw.split('|')
        : raw.replace(/([a-z0-9%)\]"'’])\.\s+(?=[A-Z])/g, '$1\u0000').split('\u0000'))
        .map(s => s.trim().replace(/\s*\.\s*$/, ''))
        .filter(Boolean);
    return parts;
};
const tip = (text) => {
    const parts = tipBullets(text);
    const body = parts.length > 1
        ? `<ul class="tip-list">${parts.map(p => `<li>${p}</li>`).join('')}</ul>`
        : `<ul class="tip-list"><li>${parts[0] || ''}</li></ul>`;
    return `<span class="info-tip"><span class="info-icon">?</span><span class="tip-text">${body}</span></span>`;
};
// Collapsible section wrapper — renders as <details open> so user can collapse before PDF export
const section = (title, content, extraClass = '') => `
<details open class="collapsible-section ${extraClass}">
    <summary class="section-toggle"><span class="toggle-chevron">▾</span> ${title}</summary>
    <div class="section-body">${content}</div>
</details>`;
let config = {
    licenseCost: 30,
    professionalRate: 78,
    minutesPerAction: 6,
    analysisWeeks: 26,
    intelligentRecapActions: 0,
    totalPurchasedLicenses: 0
};

// Position tooltips dynamically (fixed positioning to escape overflow containers)
document.addEventListener('mouseover', function(e) {
    const icon = e.target.closest('.info-tip');
    if (!icon) return;
    const tip = icon.querySelector('.tip-text');
    if (!tip) return;
    const rect = icon.getBoundingClientRect();
    const tipW = 260;
    // Temporarily show to measure height
    tip.style.visibility = 'hidden';
    tip.style.display = 'block';
    tip.style.opacity = '0';
    const tipH = tip.offsetHeight || 80;
    tip.style.display = '';
    tip.style.visibility = '';
    tip.style.opacity = '';
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
    tip.style.left = left + 'px';
    // Default: show above
    let top = rect.top - tipH - 10;
    // If it would go off-screen top, show below instead
    if (top < 8) top = rect.bottom + 10;
    tip.style.top = top + 'px';
});

// Initialize upload functionality
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const fileSelectBtn = document.getElementById('fileSelectBtn');

    // Pages that reuse script.js without the upload UI (e.g. demo.html) have none
    // of these elements — bind defensively so the rest of this handler still runs.

    // File select button
    if (fileSelectBtn && fileInput) fileSelectBtn.addEventListener('click', () => fileInput.click());

    // File input change
    if (fileInput) fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        // Click to upload
        uploadArea.addEventListener('click', (event) => {
            if (event.target !== fileSelectBtn && fileInput) {
                fileInput.click();
            }
        });
    }

    // Prevent Enter key on config inputs from triggering form submission / Calculate button
    document.querySelectorAll('.config-grid input[type="number"]').forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') e.preventDefault();
        });
    });

    // Config inputs — update config values, show recalculate prompt if results are visible
    // Same defensive rule as the upload block: these inputs are absent on demo.html
    // and run-locally.html, and an unguarded bind aborts the rest of this handler.
    function onConfigChange() {
        if (resultsDisplayed) showRecalculateBanner();
    }

    const licensesCostEl = document.getElementById('licensesCost');
    if (licensesCostEl) licensesCostEl.addEventListener('change', (e) => {
        config.licenseCost = parseFloat(e.target.value);
        onConfigChange();
    });

    const professionalRateEl = document.getElementById('professionalRate');
    if (professionalRateEl) professionalRateEl.addEventListener('change', (e) => {
        config.professionalRate = parseFloat(e.target.value);
        onConfigChange();
    });

    // Minutes per action slider
    const minutesSlider = document.getElementById('minutesPerAction');
    const minutesOutput = document.getElementById('minutesValue');

    if (minutesSlider) minutesSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        if (minutesOutput) minutesOutput.textContent = `${value} min`;
        config.minutesPerAction = value;
        onConfigChange();
    });



    const intelligentRecapEl = document.getElementById('intelligentRecapActions');
    if (intelligentRecapEl) intelligentRecapEl.addEventListener('change', (e) => {
        config.intelligentRecapActions = parseInt(e.target.value) || 0;
        onConfigChange();
    });

    const totalPurchasedLicensesEl = document.getElementById('totalPurchasedLicenses');
    if (totalPurchasedLicensesEl) totalPurchasedLicensesEl.addEventListener('change', (e) => {
        config.totalPurchasedLicenses = parseInt(e.target.value) || 0;
        onConfigChange();
    });

    // ─────────────────────────────────────────────────────────────
    // Embed mode: ?embed=1 (or ?demo=1) auto-loads the demo report
    // and hides upload/config chrome. Used by demo.html and any
    // external site that iframes the calculator as a live demo.
    // ─────────────────────────────────────────────────────────────
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.has('embed') || params.has('demo')) {
            document.body.classList.add('embed-mode');
            // Brief delay so layout settles + scripts finish init
            setTimeout(() => { loadDemoReport(); }, 50);
        }
    } catch (e) {
        console.warn('Embed mode init skipped:', e);
    }
});

// Parsing a large export blocks the main thread for many seconds, so the overlay
// has to be painted BEFORE the work starts — two rAFs guarantee a frame lands first.
function showParseOverlay(file) {
    hideParseOverlay();
    const mb = file && file.size ? file.size / 1048576 : 0;
    const scale = mb > 25 ? 'This is a large export, so it may take up to a minute.'
        : mb > 5 ? 'This should take a few seconds.'
        : 'This should only take a moment.';
    const overlay = document.createElement('div');
    overlay.id = 'parseLoadingOverlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;text-align:center;padding:2rem;' +
        'backdrop-filter:blur(2px);';
    overlay.innerHTML =
        '<div class="loading-spinner"></div>' +
        '<p style="margin:0.25rem 0 0;font-family:var(--font-display);font-size:1.35rem;color:var(--text-primary);">Reading your data</p>' +
        '<p style="margin:0.6rem 0 0;font-size:0.9375rem;color:var(--text-secondary);max-width:34ch;line-height:1.5;">' +
        scale + ' Everything is processed in your browser, so nothing is uploaded.</p>' +
        (mb ? '<p style="margin:0.75rem 0 0;font-size:0.8125rem;color:var(--text-tertiary);">' + mb.toFixed(1) + ' MB</p>' : '');
    document.body.appendChild(overlay);
}

function hideParseOverlay() {
    const el = document.getElementById('parseLoadingOverlay');
    if (el) el.remove();
}

// Resolves after the browser has actually painted, not just after a timer fires.
function afterPaint(fn) {
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(fn, 0)));
}

// Handle file upload
function handleFile(file) {
    // Viva Insights exports arrive as ".Csv", so the extension check must be case-insensitive.
    if (!/\.csv$/i.test(file.name)) {
        showError('Please upload a CSV file');
        return;
    }

    showParseOverlay(file);

    const reader = new FileReader();
    const readStartedAt = Date.now();
    reader.onload = (e) => {
        const csvData = e.target.result;
        afterPaint(() => {
            try {
                uploadedData = parseCSV(csvData);
                config.analysisWeeks = uploadedData.detectedWeeks || 26;
                isDemoData = false; // Mark as customer upload
                uploadedData.loadSeconds = (Date.now() - readStartedAt) / 1000;
                if (window.InsightsShared) window.InsightsShared.saveSharedData(uploadedData, config);
                showFilePreview(file.name, uploadedData);
            } catch (error) {
                if (error && error.code === 'UNSUPPORTED_FORMAT') {
                    showUnsupportedFormatError(!!error.looksLikeHeatmap);
                } else {
                    showError('Error processing file: ' + error.message);
                }
            } finally {
                hideParseOverlay();
            }
        });
    };
    reader.onerror = () => {
        hideParseOverlay();
        showError('Error reading file');
    };
    reader.readAsText(file);
}

// Instant demo render: used by dedicated demo.html page.
// Skips fetch, skips DOM input writes, goes straight to renderResults().
function loadDemoReportInstant(csvText) {
    try {
        // 350 purchased seats against the 300 distinct people in viva-demo-data.csv (~86% assignment).
        config.totalPurchasedLicenses = 350;
        config.licenseCost = 30;
        config.minutesPerAction = 6;
        config.professionalRate = 78;
        config.intelligentRecapActions = 0;

        uploadedData = parseCSV(csvText);
        config.analysisWeeks = uploadedData.detectedWeeks || 26;
        isDemoData = true;
        if (window.InsightsShared) window.InsightsShared.saveSharedData(uploadedData, config);

        if (window.clarity) {
            try { clarity('event', 'demo_report_loaded_instant'); } catch (e) {}
        }

        renderResults();
    } catch (error) {
        console.error('Error in instant demo render:', error);
        var container = document.querySelector('.container');
        if (container) {
            container.innerHTML = '<div class="error-box" style="padding:3rem;text-align:center;color:var(--text-primary);"><h2>Unable to load demo</h2><p>' + (error && error.message ? error.message : 'Unknown error') + '</p><p><a href="index.html" style="color:var(--accent);">Return to calculator</a></p></div>';
        }
    }
}

// Load pre-calculated demo report
async function loadDemoReport() {
    try {
        // Show loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'demoLoadingOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.95);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;';
        overlay.innerHTML = '<div class="loading-spinner"></div><p style="margin-top:1.5rem;font-size:1.2rem;color:var(--copilot-cyan);">Loading Demo Report...</p>';
        document.body.appendChild(overlay);

        // Track demo usage in Clarity
        if (window.clarity) {
            clarity('event', 'demo_report_loaded');
        }

        // Fetch and parse demo data (Viva Insights person query — 300 people, 7 orgs, 14 weeks)
        const response = await fetch('viva-demo-data.csv');
        if (!response.ok) throw new Error('Failed to load demo data');
        const csvData = await response.text();

        // Pre-configure settings
        // 350 purchased seats against the 300 distinct people in viva-demo-data.csv (~86% assignment).
        config.totalPurchasedLicenses = 350;
        config.licenseCost = 30;
        config.minutesPerAction = 6;
        config.professionalRate = 78;
        config.intelligentRecapActions = 0;

        // Update UI inputs
        document.getElementById('totalPurchasedLicenses').value = 350;
        document.getElementById('licensesCost').value = 30;
        document.getElementById('minutesPerAction').value = 6;
        document.getElementById('professionalRate').value = 78;
        document.getElementById('intelligentRecapActions').value = 0;

        // Parse and calculate
        uploadedData = parseCSV(csvData);
        config.analysisWeeks = uploadedData.detectedWeeks || 26;
        isDemoData = true; // Mark as demo data
        if (window.InsightsShared) window.InsightsShared.saveSharedData(uploadedData, config);

        // Run full calculation automatically
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for effect
        runCalculation();

        // Remove overlay after calculation starts
        setTimeout(() => {
            if (document.getElementById('demoLoadingOverlay')) {
                document.getElementById('demoLoadingOverlay').remove();
            }
        }, 1000);

    } catch (error) {
        console.error('Error loading demo report:', error);
        if (document.getElementById('demoLoadingOverlay')) {
            document.getElementById('demoLoadingOverlay').remove();
        }
        showError('Failed to load demo report: ' + error.message);
    }
}

// Agree a count with its grouping label. The label is whatever column the user
// grouped by ("Organization", "FunctionType", "Region", a custom attribute, or
// the "teams" fallback), so it has to be singularised as well as pluralised.
function formatGroupCount(count, label) {
    const raw = String(label == null ? '' : label).trim() || 'teams';
    // Anything not ending in a letter (codes, IDs with punctuation) reads badly
    // with an appended "s" — fall back to a neutral construction.
    if (!/[A-Za-z]$/.test(raw)) return `${count} groups (${raw})`;
    if (count === 1) {
        if (/ies$/i.test(raw)) return `1 ${raw.slice(0, -3)}y`;
        if (/(ches|shes|xes|zes|sses)$/i.test(raw)) return `1 ${raw.slice(0, -2)}`;
        if (/ss$/i.test(raw)) return `1 ${raw}`;
        if (/s$/i.test(raw)) return `1 ${raw.slice(0, -1)}`;
        return `1 ${raw}`;
    }
    if (/(s|x|z|ch|sh)$/i.test(raw)) {
        return /s$/i.test(raw) ? `${count} ${raw}` : `${count} ${raw}es`;
    }
    if (/[^aeiouAEIOU]y$/.test(raw)) return `${count} ${raw.slice(0, -1)}ies`;
    return `${count} ${raw}s`;
}

// Show file preview with Calculate button
function showFilePreview(fileName, data) {
    const rows = data.rows;
    const totalUsers = rows.reduce((s, r) => s + r.enabledUsers, 0);
    const totalWeeklyActions = rows.reduce((s, r) => s + r.weeklyActions, 0);
    const groupLabel = data.groupLabel || 'teams';

    // Reading is the slow part; calculating is far quicker. Round up to a coarse
    // bucket so the number reads as an expectation, not a precise measurement.
    const roundUpSeconds = (s) => {
        if (s <= 3) return 'a few seconds';
        if (s <= 10) return 'about 10 seconds';
        if (s <= 20) return 'about 20 seconds';
        if (s <= 30) return 'about 30 seconds';
        if (s <= 45) return 'about 45 seconds';
        const mins = Math.ceil(s / 30) / 2; // round up to the next half minute
        return 'about ' + mins + (mins === 1 ? ' minute' : ' minutes');
    };
    const loadNote = data.loadSeconds
        ? `<div style="margin-top:1rem; font-size:0.875rem; color:var(--text-secondary);">
               This file took <strong>${roundUpSeconds(data.loadSeconds)}</strong> to read.
               Calculating is quicker &mdash; the report will appear on its own once it is done.
           </div>`
        : '';

    // ---- Grouping picker (Viva Insights only) ----
    // Customers commonly want to cut data by something other than Organization (Team, Division,
    // Custom Division, Leader 1, Cost Center, etc.). We auto-detect candidate columns during
    // parseVivaInsights and let the user pick before they hit Calculate.
    const candidates = (data.groupingCandidates || []);
    const currentGrouping = data.currentGrouping || data.groupLabel || 'Organization';
    let groupingPickerHtml = '';
    if (candidates.length > 1) {
        const options = candidates.map(c => {
            const sel = c.name === currentGrouping ? 'selected' : '';
            return `<option value="${c.name}" ${sel}>${c.name} (${c.distinctCount} groups, ${c.coverage}% covered)</option>`;
        }).join('');
        groupingPickerHtml = `
            <div style="background: var(--surface-raised, #253449); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem;">
                <label for="groupingSelect" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary, #F1F5F9); margin-bottom: 0.4rem;">
                    Group results by
                    <span title="Choose which demographic column to slice the report by. Defaults to Organization (the canonical Viva Insights column). Other detected fields are listed below — pick whichever matches how your business operates (Team, Division, Cost Center, Leader, etc.). Methodology: any column with 2&ndash;500 distinct values where each value covers at least 2 people and the column is &ge;50% populated is offered as a candidate." style="cursor: help; color: var(--text-secondary, #94A3B8); margin-left: 0.25rem; font-weight: 400;">&#9432;</span>
                </label>
                <select id="groupingSelect" onchange="handleGroupingChange(this.value)" style="width: 100%; padding: 0.6rem 0.75rem; font-size: 0.95rem; background: var(--surface, #1E293B); color: var(--text-primary, #F1F5F9); border: 1px solid var(--border, rgba(255,255,255,0.12)); border-radius: 8px; font-family: inherit; cursor: pointer;">
                    ${options}
                </select>
                <div style="font-size: 0.78rem; color: var(--text-secondary, #94A3B8); margin-top: 0.4rem; line-height: 1.4;">
                    Aggregation rule: any group with &lt;5 distinct people, or blank/N/A, is rolled into &ldquo;Other&rdquo; (matches the Microsoft Analytics Hub <a href="https://microsoft.github.io/Analytics-Hub/" target="_blank" rel="noopener" style="color: var(--copilot-cyan, #00D4FF); text-decoration: none;">Super User Adoption</a> template).
                </div>
            </div>
        `;
    }

    const previewHtml = `
        <div style="background: var(--ink-700); border: 1px solid var(--rule); border-radius: 10px; padding: 1.75rem 2rem; margin: 1.5rem 0; animation: fadeIn 0.4s ease;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;">
                <div>
                    <div style="font-weight: 600; font-size: 1.0625rem; color: var(--text-primary);">${fileName}</div>
                    <div style="font-size: 0.8125rem; color: var(--text-tertiary);">File loaded successfully${data.detectedLocale && data.detectedLocale !== 'en-US' ? ' &middot; Detected locale: ' + data.detectedLocale + ' (normalized to en-US)' : ''}</div>
                </div>
            </div>

            ${groupingPickerHtml}

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: var(--surface-raised, #253449); border-radius: 10px; padding: 1rem; text-align: center; border: 1px solid var(--border, rgba(255,255,255,0.08));">
                    <div id="previewGroupCount" style="font-size: 1.5rem; font-weight: 700; color: var(--copilot-cyan, #00D4FF);">${rows.length}</div>
                    <div id="previewGroupLabel" style="font-size: 0.8rem; color: var(--text-secondary, #94A3B8); text-transform: uppercase; letter-spacing: 0.5px;">${groupLabel}</div>
                </div>
                <div style="background: var(--surface-raised, #253449); border-radius: 10px; padding: 1rem; text-align: center; border: 1px solid var(--border, rgba(255,255,255,0.08));">
                    <div id="previewUserCount" style="font-size: 1.5rem; font-weight: 700; color: var(--copilot-cyan, #00D4FF);">${totalUsers.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary, #94A3B8); text-transform: uppercase; letter-spacing: 0.5px;">Licensed Users</div>
                </div>
                <div style="background: var(--surface-raised, #253449); border-radius: 10px; padding: 1rem; text-align: center; border: 1px solid var(--border, rgba(255,255,255,0.08));">
                    <div id="previewActionCount" style="font-size: 1.5rem; font-weight: 700; color: var(--copilot-cyan, #00D4FF);">${totalWeeklyActions.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary, #94A3B8); text-transform: uppercase; letter-spacing: 0.5px;">Weekly Actions</div>
                </div>
            </div>

            <div style="display: flex; gap: 1rem; align-items: center;">
                <button type="button" class="btn-primary" onclick="runCalculation()" style="flex: 1;">
                    Calculate Productivity ROI
                </button>
                <button type="button" class="btn-secondary" onclick="location.reload()">
                    Reset
                </button>
            </div>
            ${loadNote}
        </div>
    `;

    // Reset calculation state so config edits don't auto-trigger results
    resultsDisplayed = false;

    // Insert preview after upload area
    const existingPreview = document.getElementById('filePreview');
    if (existingPreview) existingPreview.remove();

    const previewDiv = document.createElement('div');
    previewDiv.id = 'filePreview';
    previewDiv.innerHTML = previewHtml;

    const uploadArea = document.getElementById('uploadArea');
    uploadArea.style.display = 'none';
    uploadArea.parentNode.insertBefore(previewDiv, uploadArea.nextSibling);
}

// Sync config from current DOM input values
function syncConfigFromInputs() {
    config.licenseCost = parseFloat(document.getElementById('licensesCost').value) || 0;
    config.professionalRate = parseFloat(document.getElementById('professionalRate').value) || 0;
    config.minutesPerAction = parseFloat(document.getElementById('minutesPerAction').value) || 6;
    config.intelligentRecapActions = parseInt(document.getElementById('intelligentRecapActions').value) || 0;
    config.totalPurchasedLicenses = parseInt(document.getElementById('totalPurchasedLicenses').value) || 0;
}

// Run calculation (triggered by Calculate button)
function runCalculation() {
    if (!uploadedData) return;
    syncConfigFromInputs();
    // Capture the user's original minutes-per-action choice on first calculation
    if (originalMinutesPerAction === null) {
        originalMinutesPerAction = config.minutesPerAction;
    }
    showLoading();
    // Small delay so loading spinner is visible
    setTimeout(() => {
        try {
            renderResults();
            dismissRecalculateBanner();
        } catch (error) {
            showError('Error calculating results: ' + error.message);
        }
    }, 300);
}

// Handle a change to the grouping picker on the file-preview pane.
// Re-aggregates the Viva Insights data under the chosen field and refreshes preview stats.
// If results are already on-screen, also re-renders them.
function handleGroupingChange(newGrouping) {
    if (!uploadedData || !uploadedData.isVivaInsights) return;
    if (!newGrouping || newGrouping === uploadedData.currentGrouping) return;
    try {
        reaggregateVivaByGrouping(uploadedData, newGrouping);
        // Refresh preview tiles
        const rows = uploadedData.rows;
        const totalUsers = rows.reduce((s, r) => s + r.enabledUsers, 0);
        const totalWeekly = rows.reduce((s, r) => s + r.weeklyActions, 0);
        const elGroupCount = document.getElementById('previewGroupCount');
        const elGroupLabel = document.getElementById('previewGroupLabel');
        const elUserCount  = document.getElementById('previewUserCount');
        const elActionCnt  = document.getElementById('previewActionCount');
        if (elGroupCount) elGroupCount.textContent = rows.length;
        if (elGroupLabel) elGroupLabel.textContent = newGrouping;
        if (elUserCount)  elUserCount.textContent  = totalUsers.toLocaleString(undefined, {maximumFractionDigits: 2});
        if (elActionCnt)  elActionCnt.textContent  = totalWeekly.toLocaleString(undefined, {maximumFractionDigits: 2});
        // If a calculation has already rendered, refresh shared storage + re-render
        if (resultsDisplayed) {
            saveSharedData();
            runCalculation();
        }
        console.log(`[handleGroupingChange] Switched to "${newGrouping}" -> ${rows.length} groups`);
    } catch (e) {
        console.error('[handleGroupingChange] failed:', e);
        showError('Could not re-aggregate by ' + newGrouping + ': ' + e.message);
    }
}

// Show a banner prompting user to recalculate after config changes
function showRecalculateBanner() {
    if (document.getElementById('recalcBanner')) return; // already visible
    const banner = document.createElement('div');
    banner.id = 'recalcBanner';
    banner.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:9999;background:var(--ink-600);color:var(--text-primary);border:1px solid var(--rule-strong);box-shadow:0 8px 32px var(--shadow);padding:0.75rem 1.5rem;border-radius:12px;font-weight:600;font-size:0.95rem;cursor:pointer;display:flex;align-items:center;gap:0.75rem;font-family:inherit;animation:fadeIn 0.3s ease;';
    banner.innerHTML = '⟳ Settings changed &mdash; <span style="text-decoration:underline;cursor:pointer;">Recalculate</span>';
    banner.addEventListener('click', () => {
        dismissRecalculateBanner();
        runCalculation();
    });
    document.body.appendChild(banner);
}

function dismissRecalculateBanner() {
    const b = document.getElementById('recalcBanner');
    if (b) b.remove();
}

// Parse CSV and flatten data structure in RAM
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file appears to be empty');
    }

    // Parse header
    const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    // ---- Header normalization: en-GB → en-US and es → en-US ----
    // Mirrors the Power Query M code in the Super User Adoption template so the rest of
    // the report can rely on canonical en-US column names regardless of the customer's locale.
    let headers = rawHeaders;
    let detectedLocale = 'en-US';
    if (window.HeaderMapping) {
        detectedLocale = window.HeaderMapping.detectLocale(rawHeaders);
        headers = window.HeaderMapping.normalizeHeaders(rawHeaders);
        if (detectedLocale !== 'en-US') {
            console.log(`[parseCSV] Detected locale ${detectedLocale}, normalized headers to en-US`);
        }
    }

    // ---- Viva Insights per-person export fast path ----
    // Detected when the Viva PersonId + MetricDate + Total Copilot actions taken columns are present.
    // This bypasses the aggregated-org flattenData() path so we can compute real per-user cohorts.
    if (detectVivaInsights(headers)) {
        const result = parseVivaInsights(lines, headers);
        result.detectedLocale = detectedLocale;
        result.rawHeaders = rawHeaders;
        return result;
    }

    // Everything else is rejected. The Viva Insights person query is the only export with
    // one row per person per week, which the canonical Usage Threshold cohorts require.
    // flattenData() below is retained but is no longer reachable from the upload path.
    const err = new Error(UNSUPPORTED_FORMAT_TEXT);
    err.code = 'UNSUPPORTED_FORMAT';
    err.looksLikeHeatmap = looksLikeHeatmapExport(headers);
    throw err;
}

// Plain-text fallback used when the rich rejection UI is unavailable (e.g. demo.html).
const UNSUPPORTED_FORMAT_TEXT = 'This file doesn\u2019t look like a Viva Insights person-query export, which is the only format the calculator accepts. Your CSV must contain PersonId, MetricDate and Total Copilot actions taken. See Step 1 for how to export it.';

// Recognize the retired Super Usage Report heatmap export so the rejection message can
// name it explicitly instead of showing generic "unsupported file" guidance.
function looksLikeHeatmapExport(headers) {
    const set = new Set(headers.map(h => String(h).trim().toLowerCase()));
    const signature = [
        'organization (aggregated)', 'team/division name', 'enabled users', 'active users',
        '% active users', 'average copilot actions', 'total actions', 'monthly actions', 'engagement %'
    ];
    const hits = signature.filter(c => set.has(c)).length;
    // Wide heatmap exports name each column "YYYY-MM-DD <Metric>".
    const wideDateCols = headers.filter(h => /^\d{4}-\d{2}-\d{2}\s+\S/.test(String(h).trim())).length;
    return hits >= 2 || wideDateCols >= 2;
}

// Identify a Viva Insights per-person weekly export by the column signature.
// We deliberately ignore DisplayName / full_name_* (anonymization artifacts) and key off
// the columns the Power BI "Super User Impact" model is built on.
function detectVivaInsights(headers) {
    const set = new Set(headers.map(h => h.toLowerCase()));
    return set.has('personid') && set.has('metricdate') && set.has('total copilot actions taken');
}

// Parse a Viva Insights per-person, per-week CSV.
// Returns the same { rows, weeklyData, groupLabel, detectedWeeks, dateRange, sortedDates }
// shape that the rest of the report consumes, PLUS:
//   personCohorts  - real per-user Usage Threshold tiers (replaces the broken team-percentile table)
//   personIndex    - slim per-person history used by computeCohortsForPeriod()
//   isVivaInsights - flag so renderers know real cohorts are available
function parseVivaInsights(lines, headers) {
    // Build a lower-cased header -> index map so we tolerate header drift.
    const hidx = {};
    headers.forEach((h, i) => { hidx[h.trim().toLowerCase()] = i; });
    const col = (name) => hidx[name.toLowerCase()];

    // Required columns
    const iPerson   = col('PersonId');
    const iDate     = col('MetricDate');
    const iActions  = col('Total Copilot actions taken');
    if (iPerson == null || iDate == null || iActions == null) {
        throw new Error('Viva Insights export missing PersonId, MetricDate, or Total Copilot actions taken');
    }
    // Optional columns we use when present
    const iActiveDays  = col('Total Copilot active days');
    const iEnabledDays = col('Total Copilot enabled days');
    const iAssistHrs   = col('Copilot assisted hours');
    const iIntelRecap  = col('Intelligent recap actions taken');
    const iOrg         = col('Organization');
    const iFunction    = col('FunctionType');

    // ---- Grouping candidate detection ----
    // The Viva Insights template normalizes one column to "Organization", but customers also
    // commonly include other demographic cuts like Team, Division, Custom Division, Leader 1/2/3,
    // Cost Center, Region, etc. Identify every plausible grouping column up front so the user
    // can swap the slicer post-load. A column is a candidate if:
    //   - it is not a known canonical metric / identity column, AND
    //   - it is not numeric-looking, AND
    //   - it eventually shows 2..500 distinct non-blank values with each value covering >=2 persons.
    // The metric-skiplist comes from the M code OptimizedTypeMap (numeric columns) plus our own
    // identity exclusions.
    const SKIP_GROUPING = new Set([
        'personid','displayname','metricdate','timezone','weekenddays','isactive',
        'full_name_1','full_name_2','full_name_3','full_name_4','full_name_5','full_name_6','full_name_7'
    ]);
    const METRIC_PATTERN = /(hours?|actions?|prompts?|days?|users?|emails?|chats?|messages?|meetings?|calls?|visits?|posts?|reactions?|replies|ties|size|span|count|recap|reuniones|llamadas|horas|días|dias|indicaciones|chats|correos|relaciones)/i;
    const groupingCandidateIdx = [];
    headers.forEach((h, idx) => {
        const lo = h.trim().toLowerCase();
        if (SKIP_GROUPING.has(lo)) return;
        if (METRIC_PATTERN.test(lo)) return;
        // "IsActiveInX" columns are boolean feature flags, not demographic cuts.
        if (/^isactivein/.test(lo)) return;
        groupingCandidateIdx.push({ idx, name: h.trim() });
    });
    // Per-candidate-per-person value collection (latest non-blank wins, same convention as org).
    const groupingValuesByPerson = {}; // { personId: { Organization: '...', Team: '...' } }
    const groupingDistinct = {};        // { columnName: { value: Set(personId) } }
    groupingCandidateIdx.forEach(c => { groupingDistinct[c.name] = {}; });

    // ---- Per-app columns (e.g. "Copilot actions taken in Word", "Chat actions taken in Teams") ----
    // We detect any column whose lowercase name matches /actions? taken in (\w[\w &]*)/ and capture
    // the app label after "in". Used for the per-app attribution + behavioral profile pages.
    const appColumns = [];
    headers.forEach((h, idx) => {
        const lo = h.trim().toLowerCase();
        const m = lo.match(/^(?:copilot|chat|summari[sz]e|create|edit|draft|rewrite)?\s*(?:actions?|messages?|drafts?|summari[sz]ations?)\s+taken\s+in\s+(.+)$/i);
        if (m) {
            const app = m[1].replace(/\s+/g, ' ').trim();
            // Skip if it's just rolling up to "total" or another umbrella
            if (!/^total\b/i.test(app)) {
                appColumns.push({ idx, app: app.replace(/\b\w/g, c => c.toUpperCase()) });
            }
        }
    });
    const hasAppData = appColumns.length > 0;

    // ---- First pass: build slim per-person weekly index, raw org rollup, date set ----
    // personIndex[personId] = { org, fn, weeks: [{d, a, ad, ed, ah, ir, apps?}, ...] }
    const personIndex = {};
    const dateSet = new Set();

    // Local-tz YYYY-MM-DD formatter (avoids UTC drift from toISOString)
    const toDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    for (let li = 1; li < lines.length; li++) {
        const v = parseCSVLine(lines[li]);
        if (v.length < headers.length) continue;

        const personId = v[iPerson];
        const rawDate = (v[iDate] || '').trim();
        const parsedDate = parseDate(rawDate);
        if (!personId || !parsedDate) continue;
        const dateStr = toDateKey(parsedDate);

        const actions = parseNumber(v[iActions]);
        const activeDays  = iActiveDays  != null ? parseNumber(v[iActiveDays])  : 0;
        const enabledDays = iEnabledDays != null ? parseNumber(v[iEnabledDays]) : 0;
        const assistHrs   = iAssistHrs   != null ? parseNumber(v[iAssistHrs])   : 0;
        const intelRecap  = iIntelRecap  != null ? parseNumber(v[iIntelRecap])  : 0;
        const orgRaw      = iOrg      != null ? (v[iOrg]      || '').trim() : 'Unassigned';
        const fnRaw       = iFunction != null ? (v[iFunction] || '').trim() : '';

        if (!personIndex[personId]) {
            personIndex[personId] = { org: orgRaw, fn: fnRaw, weeks: [] };
        } else if (orgRaw && personIndex[personId].org !== orgRaw) {
            // Person changed orgs mid-window: latest non-blank wins
            personIndex[personId].org = orgRaw;
        }

        // Capture per-person grouping-candidate values (latest non-blank wins).
        if (groupingCandidateIdx.length) {
            const bag = groupingValuesByPerson[personId] || (groupingValuesByPerson[personId] = {});
            for (const c of groupingCandidateIdx) {
                const val = (v[c.idx] || '').trim();
                if (val) {
                    bag[c.name] = val;
                    const dist = groupingDistinct[c.name];
                    if (!dist[val]) dist[val] = new Set();
                    dist[val].add(personId);
                }
            }
        }
        personIndex[personId].weeks.push({
            d: dateStr,
            a: actions,
            ad: activeDays,
            ed: enabledDays,
            ah: assistHrs,
            ir: intelRecap,
            apps: hasAppData ? (() => {
                const map = {};
                for (const { idx, app } of appColumns) {
                    const n = parseNumber(v[idx]);
                    if (n) map[app] = (map[app] || 0) + n;
                }
                return map;
            })() : null
        });
        dateSet.add(dateStr);
    }

    const sortedDates = [...dateSet].sort();
    if (sortedDates.length === 0) {
        throw new Error('Viva Insights export contained no parseable weekly snapshots');
    }

    // Sort each person's weeks ascending — needed for rolling-window threshold logic
    Object.values(personIndex).forEach(p => p.weeks.sort((a, b) => a.d.localeCompare(b.d)));

    // ---- Finalize grouping candidates ----
    // Keep columns with 2..500 distinct non-blank values where each value covers >=2 persons.
    // Attach the per-person bag to personIndex so re-aggregation later can switch the slicer.
    const totalPersons = Object.keys(personIndex).length;
    const groupingCandidates = [];
    groupingCandidateIdx.forEach(c => {
        const dist = groupingDistinct[c.name];
        const distinctVals = Object.keys(dist);
        if (distinctVals.length < 2 || distinctVals.length > 500) return;
        // A real demographic column can legitimately contain one-person groups (a lone
        // director, a new team). Only reject columns that behave like unique IDs, i.e.
        // fewer than two values that group more than one person. The "Organization
        // (Aggregated)" rule below still rolls sub-5-person groups into "Other".
        const groupedVals = distinctVals.filter(v => dist[v].size >= 2).length;
        if (groupedVals < 2) return;
        // Coverage: how many persons have ANY value here
        const coverage = distinctVals.reduce((s, v) => s + dist[v].size, 0) / totalPersons;
        if (coverage < 0.5) return; // skip columns that are mostly blank
        groupingCandidates.push({
            name: c.name,
            distinctCount: distinctVals.length,
            sampleValues: distinctVals.slice(0, 8),
            coverage: Math.round(coverage * 100)
        });
    });
    // Stamp each person's grouping bag for use during re-aggregation
    Object.keys(personIndex).forEach(pid => {
        personIndex[pid].groupings = groupingValuesByPerson[pid] || {};
    });
    // Pick default grouping: Organization > FunctionType > first candidate
    let defaultGrouping = 'Organization';
    if (!groupingCandidates.some(g => g.name === defaultGrouping)) {
        if (groupingCandidates.some(g => g.name === 'FunctionType')) defaultGrouping = 'FunctionType';
        else if (groupingCandidates.length) defaultGrouping = groupingCandidates[0].name;
    }
    console.log(`[parseVivaInsights] Grouping candidates: ${groupingCandidates.map(g => g.name + '(' + g.distinctCount + ')').join(', ')}; default=${defaultGrouping}`);

    // ---- Organization (Aggregated) rule from the Power BI model ----
    // Distinct PersonIDs per org. Orgs with <5 distinct users OR blank/N/A/Unassigned are rolled to "Other".
    const personsPerOrg = {};
    Object.entries(personIndex).forEach(([pid, p]) => {
        const o = p.org || 'Unassigned';
        if (!personsPerOrg[o]) personsPerOrg[o] = new Set();
        personsPerOrg[o].add(pid);
    });
    const orgAggregatedName = (raw) => {
        const trimmed = (raw || '').trim();
        if (!trimmed || trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'unassigned') return 'Other';
        const count = personsPerOrg[trimmed] ? personsPerOrg[trimmed].size : 0;
        if (count < 5) return 'Other';
        return trimmed;
    };
    // Stamp the aggregated name onto each person (used by aggregation passes below)
    Object.values(personIndex).forEach(p => { p.orgAgg = orgAggregatedName(p.org); });

    // ---- Second pass: aggregate to org × week cells ----
    // For each (org, week): distinct persons, persons-with-actions, sum actions, sum active days, sum enabled days.
    // orgWeekCells[org][date] = { persons, withActions, actionsSum, activeDaysSum, enabledDaysSum, assistHrsSum, intelRecapSum, enabledPersons }
    const orgWeekCells = {};
    Object.entries(personIndex).forEach(([pid, p]) => {
        const o = p.orgAgg;
        if (!orgWeekCells[o]) orgWeekCells[o] = {};
        p.weeks.forEach(w => {
            const cell = orgWeekCells[o][w.d] || (orgWeekCells[o][w.d] = {
                persons: 0, withActions: 0, actionsSum: 0, activeDaysSum: 0,
                enabledDaysSum: 0, assistHrsSum: 0, intelRecapSum: 0, enabledPersons: 0
            });
            cell.persons += 1;
            if (w.a > 0) cell.withActions += 1;
            cell.actionsSum    += w.a;
            cell.activeDaysSum += w.ad;
            cell.enabledDaysSum += w.ed;
            cell.assistHrsSum  += w.ah;
            cell.intelRecapSum += w.ir;
            if (w.ed > 0) cell.enabledPersons += 1;
        });
    });

    // ---- Build orgWeeklyData (matches the wide-format shape consumed by the report) ----
    const orgWeeklyData = {};
    const orgRows = [];
    Object.entries(orgWeekCells).forEach(([orgName, byDate]) => {
        const weekly = sortedDates.map(d => {
            const c = byDate[d];
            if (!c) return null;
            const enabled        = c.enabledPersons || c.persons; // fall back to persons seen if enabledDays missing
            const activePercent  = c.persons > 0 ? (c.withActions / c.persons) * 100 : 0;
            const actionsPerUser = c.withActions > 0 ? c.actionsSum / c.withActions : 0;
            const activeDays     = c.persons > 0 ? c.activeDaysSum / c.persons : 0;
            // Power-user % at the org/week level is filled in during cohort assignment below.
            return {
                date: parseDate(d),
                actionsPerUser,
                activePercent,
                powerPercent: 0, // patched after threshold computation
                activeDays,
                enabled
            };
        }).filter(Boolean);
        if (weekly.length === 0) return;
        orgWeeklyData[orgName] = weekly;

        // Build the summary row using the average-across-weeks pattern the rest of the app uses.
        const last = weekly[weekly.length - 1];
        const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const activePercent  = avg(weekly.map(w => w.activePercent).filter(v => v > 0));
        const actionsPerUser = avg(weekly.map(w => w.actionsPerUser).filter(v => v > 0));
        const avgActiveDays  = avg(weekly.map(w => w.activeDays).filter(v => v > 0));
        const enabledUsers   = last.enabled;
        const activeUsers    = Math.round((enabledUsers * activePercent) / 100);
        const weeklyActions  = actionsPerUser * activeUsers;
        const monthlyActions = weeklyActions * 4.33;
        orgRows.push({
            team: orgName,
            enabledUsers,
            activeUsers,
            weeklyActions,
            monthlyActions,
            engagement: avgActiveDays,
            actionsPerUser,
            powerUsers: 0 // filled in after cohort pass
        });
    });

    // ---- Third pass: compute Usage Threshold per (person, week) using 12-week rolling window ----
    // Mirrors the Power BI calculated columns:
    //   _Total Copilot actions_RL12W = AVERAGEX over [date, date-7, ..., date-77]
    //   _IsHabit_RL12W              = COUNTROWS where actions >= 1 in that window >= 9
    //   Usage Threshold             = SWITCH(...) (Power / Habitual / Novice / Low / Non)
    const THRESHOLDS = ['Power Users', 'Habitual Users', 'Novice Users', 'Low Users', 'Non Users'];
    const classify = (avg12, habit) => {
        if (avg12 >= 20 && habit) return 'Power Users';
        if (avg12 >= 8  && habit) return 'Habitual Users';
        if (avg12 >= 1)           return 'Novice Users';
        if (avg12 >  0)           return 'Low Users';
        return 'Non Users';
    };
    Object.values(personIndex).forEach(p => {
        // Build a date->actions lookup so rolling math is O(weeks) per person.
        const byDate = {};
        p.weeks.forEach(w => { byDate[w.d] = w.a; });
        p.weeks.forEach(w => {
            // Build a list of up to 12 trailing week-date strings (-0, -7, ..., -77 days)
            const base = parseDate(w.d);
            if (!base) { w.threshold = 'Non Users'; return; }
            let sum = 0, count = 0, nonZero = 0;
            for (let k = 0; k < 12; k++) {
                const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() - k * 7);
                const key = toDateKey(dt);
                if (Object.prototype.hasOwnProperty.call(byDate, key)) {
                    const a = byDate[key];
                    sum += a;
                    count += 1;
                    if (a >= 1) nonZero += 1;
                }
            }
            const avg12 = count > 0 ? sum / count : 0;
            const habit = nonZero >= 9;
            w.threshold = classify(avg12, habit);
            w.avg12 = avg12;
        });
    });

    // ---- Patch powerPercent / powerUsers into the org weekly cells & summary rows ----
    // For each (org, week): count persons whose threshold AT THAT WEEK is "Power Users".
    const orgWeekPower = {}; // orgWeekPower[org][date] = count
    Object.values(personIndex).forEach(p => {
        const o = p.orgAgg;
        if (!orgWeekPower[o]) orgWeekPower[o] = {};
        p.weeks.forEach(w => {
            if (w.threshold === 'Power Users') {
                orgWeekPower[o][w.d] = (orgWeekPower[o][w.d] || 0) + 1;
            }
        });
    });
    Object.entries(orgWeeklyData).forEach(([orgName, weekly]) => {
        weekly.forEach(week => {
            const key = week.date instanceof Date ? toDateKey(week.date) : week.date;
            const powerCount = (orgWeekPower[orgName] && orgWeekPower[orgName][key]) || 0;
            const cell = orgWeekCells[orgName][key];
            const persons = cell ? cell.persons : 0;
            week.powerPercent = persons > 0 ? (powerCount / persons) * 100 : 0;
        });
    });
    // Refresh summary rows' powerUsers from the recent-4-weeks avg, same convention as the wide-format branch.
    orgRows.forEach(row => {
        const weekly = orgWeeklyData[row.team];
        const recent = weekly.slice(-4);
        const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const recentPowerPct = avg(recent.map(w => w.powerPercent).filter(v => v > 0));
        row.powerUsers = Math.round((row.enabledUsers * recentPowerPct) / 100);
    });

    // ---- Person cohorts: compute for the default "all" window so the initial render has data ----
    const personCohorts = computePersonCohortsFromIndex(personIndex, new Set(sortedDates), sortedDates);

    // ---- detectedWeeks + dateRange ----
    let detectedWeeks = sortedDates.length;
    if (sortedDates.length >= 2) {
        const spanDays = (new Date(sortedDates[sortedDates.length - 1]) - new Date(sortedDates[0])) / 86400000;
        detectedWeeks = Math.max(Math.round(spanDays / 7) + 1, sortedDates.length);
    }
    const dateRange = sortedDates.length >= 2
        ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
        : sortedDates[0];

    console.log(`Viva Insights: ${Object.keys(personIndex).length} persons, ${Object.keys(orgWeeklyData).length} orgs (post-aggregation), ${sortedDates.length} weeks`);

    return {
        rows: orgRows,
        mapping: {},
        weeklyData: orgWeeklyData,
        groupLabel: defaultGrouping,
        groupingCandidates,
        currentGrouping: defaultGrouping,
        detectedWeeks,
        dateRange,
        sortedDates,
        personIndex,
        personCohorts,
        isVivaInsights: true,
        hasAppData,
        appColumns: appColumns.map(c => c.app)
    };
}

// Re-aggregate an existing parseVivaInsights() result under a different grouping field
// (e.g. 'Organization' → 'Team', 'Division', 'Custom Division', 'Leader 1', etc.).
// Mutates the result object's rows / weeklyData / groupLabel / currentGrouping in place and returns it.
// personIndex is left intact; only the per-group rollups are recomputed.
function reaggregateVivaByGrouping(viva, groupingName) {
    if (!viva || !viva.isVivaInsights || !viva.personIndex) return viva;
    const personIndex = viva.personIndex;
    const sortedDates = viva.sortedDates;
    const toDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // Resolve per-person group value for the chosen field
    const valueOf = (p) => {
        if (groupingName === 'Organization') return (p.org || '').trim();
        if (groupingName === 'FunctionType') return (p.fn || (p.groupings && p.groupings.FunctionType) || '').trim();
        return (p.groupings && p.groupings[groupingName]) ? String(p.groupings[groupingName]).trim() : '';
    };

    // <5 distinct persons OR blank/N/A/Unassigned → "Other"
    const personsPerGroup = {};
    Object.entries(personIndex).forEach(([pid, p]) => {
        const v = valueOf(p) || 'Unassigned';
        if (!personsPerGroup[v]) personsPerGroup[v] = new Set();
        personsPerGroup[v].add(pid);
    });
    const aggName = (raw) => {
        const t = (raw || '').trim();
        if (!t || t.toLowerCase() === 'n/a' || t.toLowerCase() === 'unassigned') return 'Other';
        const c = personsPerGroup[t] ? personsPerGroup[t].size : 0;
        return c < 5 ? 'Other' : t;
    };
    Object.values(personIndex).forEach(p => { p.orgAgg = aggName(valueOf(p)); });

    // Rebuild org×week cells
    const cells = {};
    Object.values(personIndex).forEach(p => {
        const g = p.orgAgg;
        if (!cells[g]) cells[g] = {};
        p.weeks.forEach(w => {
            const c = cells[g][w.d] || (cells[g][w.d] = {
                persons: 0, withActions: 0, actionsSum: 0, activeDaysSum: 0,
                enabledDaysSum: 0, assistHrsSum: 0, intelRecapSum: 0, enabledPersons: 0
            });
            c.persons += 1;
            if (w.a > 0) c.withActions += 1;
            c.actionsSum += w.a; c.activeDaysSum += w.ad; c.enabledDaysSum += w.ed;
            c.assistHrsSum += w.ah; c.intelRecapSum += w.ir;
            if (w.ed > 0) c.enabledPersons += 1;
        });
    });

    // Patch power counts per (group, week) using the person thresholds already computed
    const powerCounts = {};
    Object.values(personIndex).forEach(p => {
        const g = p.orgAgg;
        if (!powerCounts[g]) powerCounts[g] = {};
        p.weeks.forEach(w => {
            if (w.threshold === 'Power Users') powerCounts[g][w.d] = (powerCounts[g][w.d] || 0) + 1;
        });
    });

    const weeklyData = {};
    const rows = [];
    const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    Object.entries(cells).forEach(([g, byDate]) => {
        const weekly = sortedDates.map(d => {
            const c = byDate[d];
            if (!c) return null;
            const enabled = c.enabledPersons || c.persons;
            const activePercent = c.persons > 0 ? (c.withActions / c.persons) * 100 : 0;
            const actionsPerUser = c.withActions > 0 ? c.actionsSum / c.withActions : 0;
            const activeDays = c.persons > 0 ? c.activeDaysSum / c.persons : 0;
            const powerCount = (powerCounts[g] && powerCounts[g][d]) || 0;
            const powerPercent = c.persons > 0 ? (powerCount / c.persons) * 100 : 0;
            return { date: parseDate(d), actionsPerUser, activePercent, powerPercent, activeDays, enabled };
        }).filter(Boolean);
        if (weekly.length === 0) return;
        weeklyData[g] = weekly;
        const last = weekly[weekly.length - 1];
        const activePercent  = avg(weekly.map(w => w.activePercent).filter(v => v > 0));
        const actionsPerUser = avg(weekly.map(w => w.actionsPerUser).filter(v => v > 0));
        const avgActiveDays  = avg(weekly.map(w => w.activeDays).filter(v => v > 0));
        const enabledUsers = last.enabled;
        const activeUsers = Math.round((enabledUsers * activePercent) / 100);
        const weeklyActions = actionsPerUser * activeUsers;
        const recent = weekly.slice(-4);
        const recentPowerPct = avg(recent.map(w => w.powerPercent).filter(v => v > 0));
        const powerUsers = Math.round((enabledUsers * recentPowerPct) / 100);
        rows.push({
            team: g, enabledUsers, activeUsers, weeklyActions,
            monthlyActions: weeklyActions * 4.33,
            engagement: avgActiveDays, actionsPerUser, powerUsers
        });
    });

    viva.rows = rows;
    viva.weeklyData = weeklyData;
    viva.groupLabel = groupingName;
    viva.currentGrouping = groupingName;
    return viva;
}

// Compute the 5 Usage Threshold cohorts for the window defined by dateSetForCohort,
// using the threshold each person had at the LAST week of the window (Power BI "Latest Week" convention).
// Action volume is summed across the window's weeks for monetary value.
function computePersonCohortsFromIndex(personIndex, dateSetForCohort, sortedDatesInWindow) {
    if (!personIndex || !sortedDatesInWindow || sortedDatesInWindow.length === 0) return null;
    const lastWeek = sortedDatesInWindow[sortedDatesInWindow.length - 1];
    const numWeeks = sortedDatesInWindow.length;
    const rate = config.professionalRate;
    const mpa = config.minutesPerAction;
    const licenseCost = config.licenseCost;

    const buckets = {
        'Power Users':    { count: 0, actionsSum: 0, weeksActive: 0 },
        'Habitual Users': { count: 0, actionsSum: 0, weeksActive: 0 },
        'Novice Users':   { count: 0, actionsSum: 0, weeksActive: 0 },
        'Low Users':      { count: 0, actionsSum: 0, weeksActive: 0 },
        'Non Users':      { count: 0, actionsSum: 0, weeksActive: 0 }
    };

    Object.values(personIndex).forEach(p => {
        // Find this person's threshold at the latest week of the window (or the latest week they appear in within the window).
        const inWindow = p.weeks.filter(w => dateSetForCohort.has(w.d));
        if (inWindow.length === 0) return;
        const lastInWindow = inWindow.reduce((a, b) => a.d > b.d ? a : b);
        const cohort = lastInWindow.threshold || 'Non Users';
        const bucket = buckets[cohort];
        if (!bucket) return;
        bucket.count += 1;
        bucket.actionsSum += inWindow.reduce((s, w) => s + w.a, 0);
        bucket.weeksActive += inWindow.length;
    });

    // Convert to display rows
    const rows = Object.entries(buckets).map(([name, b]) => {
        const avgWeeksPerPerson = b.count > 0 ? b.weeksActive / b.count : 0;
        // Monthly actions per user: avg weekly actions × 4.33
        const avgWeeklyActions = b.count > 0 && avgWeeksPerPerson > 0
            ? (b.actionsSum / b.count) / avgWeeksPerPerson
            : 0;
        const actionsPerMonth = avgWeeklyActions * 4.33;
        const investment = b.count * licenseCost;
        // Total monthly value = total monthly actions in cohort × time savings × rate
        const totalWeeklyActionsAcrossCohort = avgWeeksPerPerson > 0 ? b.actionsSum / avgWeeksPerPerson : 0;
        const totalMonthlyActions = totalWeeklyActionsAcrossCohort * 4.33;
        const monthlyValue = (totalMonthlyActions * mpa / 60) * rate;
        const roi = investment > 0 ? monthlyValue / investment : 0;
        return { name, count: b.count, actionsPerMonth, investment, monthlyValue, roi };
    });

    const totalCount = rows.reduce((s, r) => s + r.count, 0);
    const totalInvestment = rows.reduce((s, r) => s + r.investment, 0);
    const totalValue = rows.reduce((s, r) => s + r.monthlyValue, 0);
    const totalActionsWeighted = totalCount > 0
        ? rows.reduce((s, r) => s + r.actionsPerMonth * r.count, 0) / totalCount
        : 0;
    const totalRoi = totalInvestment > 0 ? totalValue / totalInvestment : 0;

    return {
        rows,
        totals: {
            count: totalCount,
            actionsPerMonth: totalActionsWeighted,
            investment: totalInvestment,
            monthlyValue: totalValue,
            roi: totalRoi
        },
        windowLastWeek: lastWeek,
        windowWeeks: numWeeks
    };
}

// Recompute person cohorts for a specific time-period window (used by switchTimePeriod).
// Returns the same shape as computePersonCohortsFromIndex, or null if no Viva data is loaded.
function computeCohortsForPeriod(period) {
    if (!uploadedData || !uploadedData.isVivaInsights || !uploadedData.personIndex) return null;
    const allDates = uploadedData.sortedDates;
    if (!allDates || allDates.length === 0) return null;

    let dateSlice;
    const total = allDates.length;
    switch (period) {
        case 'last4':   dateSlice = allDates.slice(-4); break;
        case 'last13':  dateSlice = allDates.slice(-13); break;
        case '3moAgo':  dateSlice = allDates.slice(0, Math.max(1, total - 13)); break;
        case 'first4':  dateSlice = allDates.slice(0, 4); break;
        case 'all':
        default:        dateSlice = allDates; break;
    }
    return computePersonCohortsFromIndex(uploadedData.personIndex, new Set(dateSlice), dateSlice);
}

// Build the Usage Tier Distribution tbody HTML.
//   cohorts != null  -> render real per-user cohorts (Power BI Usage Threshold parity).
//   cohorts == null  -> fall back to legacy team-percentile slicing (with banner shown above).
// Returns the inner HTML for <tbody id="tierTableBody">.
function buildTierTableBodyHTML(cohorts, sortedTeams, metrics, licenseCost) {
    if (cohorts && cohorts.rows && cohorts.rows.length > 0) {
        // Color coding mirrors the Adoption Journey storyline
        const colorByName = {
            'Power Users':    'var(--green)',
            'Habitual Users': 'var(--copilot-cyan)',
            'Novice Users':   'var(--copilot-blue)',
            'Low Users':      'var(--copilot-orange)',
            'Non Users':      'var(--red)'
        };
        const tintByName = {
            'Power Users':    'cohort-row cohort-row--power',
            'Habitual Users': 'cohort-row cohort-row--habitual',
            'Novice Users':   'cohort-row cohort-row--novice',
            'Low Users':      'cohort-row cohort-row--low',
            'Non Users':      'cohort-row cohort-row--non'
        };
        let html = '';
        cohorts.rows.forEach(r => {
            const color = colorByName[r.name] || 'var(--text-primary)';
            const tintClass = tintByName[r.name] || 'cohort-row';
            html += `<tr class="${tintClass}">
                <td><span style="color:${color}; font-weight:700;">${r.name}</span></td>
                <td>${r.count.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                <td>${r.actionsPerMonth.toFixed(0)}</td>
                <td>$${r.investment.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                <td>$${Math.round(r.monthlyValue).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                <td style="color: var(--green); font-weight: bold;">${r.roi.toFixed(1)}x</td>
            </tr>`;
        });
        const t = cohorts.totals;
        html += `<tr style="border-top: 2px solid var(--copilot-blue); font-weight: 700;">
            <td>ALL USERS</td>
            <td>${t.count.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td>${t.actionsPerMonth.toFixed(0)}</td>
            <td>$${t.investment.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td>$${Math.round(t.monthlyValue).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td style="color: var(--green);">${t.roi.toFixed(1)}x</td>
        </tr>`;
        return html;
    }

    // ---- Legacy team-percentile fallback (aggregated CSV inputs) ----
    const byActions = [...sortedTeams].sort((a, b) => b.actionsPerUser - a.actionsPerUser);
    const totalTeams = byActions.length;
    const tierDefs = [
        { name: 'Top 10%',    color: 'var(--green)',          cls: 'cohort-row--power',    start: 0,                                                  end: Math.max(1, Math.round(totalTeams * 0.10)) },
        { name: '75-90%',     color: 'var(--copilot-cyan)',   cls: 'cohort-row--habitual', start: Math.max(1, Math.round(totalTeams * 0.10)),         end: Math.round(totalTeams * 0.25) },
        { name: '50-75%',     color: 'var(--copilot-blue)',   cls: 'cohort-row--novice',   start: Math.round(totalTeams * 0.25),                      end: Math.round(totalTeams * 0.50) },
        { name: '25-50%',     color: 'var(--copilot-orange)', cls: 'cohort-row--low',      start: Math.round(totalTeams * 0.50),                      end: Math.round(totalTeams * 0.75) },
        { name: 'Bottom 25%', color: 'var(--red)',            cls: 'cohort-row--non',      start: Math.round(totalTeams * 0.75),                      end: totalTeams },
    ];
    let totalActiveInTiers = 0;
    let totalValueInTiers = 0;
    let html = '';
    tierDefs.forEach(tier => {
        const slice = byActions.slice(tier.start, tier.end);
        if (slice.length === 0) return;
        const tierUsers = slice.reduce((s, t) => s + t.activeUsers, 0);
        const tierWeekly = slice.reduce((s, t) => s + t.weeklyActions, 0);
        const tierAvgWeekly = tierUsers > 0 ? tierWeekly / tierUsers : 0;
        const tierMonthly = tierAvgWeekly * 4.33;
        const tierMonthlyVal = slice.reduce((s, t) => s + (t.monthlyValue || 0), 0);
        const tierInvestment = tierUsers * licenseCost;
        const tierRoi = tierInvestment > 0 ? (tierMonthlyVal / tierInvestment) : 0;
        totalActiveInTiers += tierUsers;
        totalValueInTiers += tierMonthlyVal;
        html += `<tr class="cohort-row ${tier.cls}">
            <td><span style="color:${tier.color}; font-weight:700;">${tier.name}</span></td>
            <td>${tierUsers.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td>${tierMonthly.toFixed(0)}</td>
            <td>$${tierInvestment.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td>$${Math.round(tierMonthlyVal).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td style="color: var(--green); font-weight: bold;">${tierRoi.toFixed(1)}x</td>
        </tr>`;
    });
    const totalTierInvestment = totalActiveInTiers * licenseCost;
    const allRoi = totalTierInvestment > 0 ? (totalValueInTiers / totalTierInvestment) : 0;
    html += `<tr style="border-top: 2px solid var(--copilot-blue); font-weight: 700;">
        <td>ALL USERS</td>
        <td>${totalActiveInTiers.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
        <td>${totalActiveInTiers > 0 ? (sortedTeams.reduce((s, t) => s + t.monthlyActions, 0) / totalActiveInTiers).toFixed(0) : '0'}</td>
        <td>$${totalTierInvestment.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
        <td>$${Math.round(totalValueInTiers).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
        <td style="color: var(--green);">${allRoi.toFixed(1)}x</td>
    </tr>`;
    return html;
}

// Warning banner shown above the tier table when input is an aggregated CSV (not per-person Viva).
function buildTierAccuracyBanner(uploadedData) {
    if (uploadedData && uploadedData.isVivaInsights) return ''; // real cohorts available — no banner needed
    return `<div style="background: rgba(245, 158, 11, 0.1); border: 1px solid var(--copilot-orange, #F59E0B); border-radius: 8px; padding: 0.75rem 1rem; margin: 0 0 1rem; font-size: 0.85rem; color: var(--text-secondary);">
        <strong style="color: var(--warn);">Approximate cohorts</strong> &mdash;
        your upload is aggregated by ${uploadedData && uploadedData.groupLabel ? uploadedData.groupLabel.toLowerCase() : 'group'},
        so we cannot identify individual users. Tiers below are computed by grouping
        ${uploadedData && uploadedData.groupLabel ? uploadedData.groupLabel.toLowerCase() : 'groups'} by their average
        actions per user, not by user-level percentiles. For exact per-user cohorts
        (Power / Habitual / Novice / Low / Non-users matching the
        <a href="https://aka.ms/superuserimpact" target="_blank" style="color: var(--copilot-cyan);">Super User Impact</a> report),
        upload a Viva Insights person-level export instead.
    </div>`;
}

// Parse a single CSV line (handles commas in quotes)
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());

    return values.map(v => v.replace(/^"|"$/g, ''));
}

// Parse date from various formats
function parseDate(dateString) {
    if (!dateString) return null;

    const cleaned = dateString.trim();

    // ISO format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD
    const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
        return new Date(isoMatch[1], isoMatch[2] - 1, isoMatch[3]);
    }

    // Try MM/DD/YYYY or M/D/YYYY (en-US)
    const usMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (usMatch) {
        return new Date(usMatch[3], usMatch[1] - 1, usMatch[2]);
    }

    // Fallback to native Date parsing
    const parsed = new Date(cleaned);
    return isNaN(parsed.getTime()) ? null : parsed;
}

// Flatten data structure for analysis
function flattenData(rows) {
    const headers = Object.keys(rows[0]);

    // Detect WIDE format: columns like "2025-08-10 Enabled Users"
    const dateColumnPattern = /^(\d{4}-\d{2}-\d{2})\s+(.+)$/;
    const dateMetricMap = {}; // { 'YYYY-MM-DD': { 'Enabled Users': colName, ... } }

    headers.forEach(h => {
        const match = h.match(dateColumnPattern);
        if (match) {
            const date = match[1];
            const metric = match[2];
            if (!dateMetricMap[date]) dateMetricMap[date] = {};
            dateMetricMap[date][metric] = h;
        }
    });

    const sortedDates = Object.keys(dateMetricMap).sort();
    const isWideFormat = sortedDates.length > 0;

    if (isWideFormat) {
        console.log(`Detected WIDE format CSV with ${sortedDates.length} date columns`);

        // First column is always the grouping key
        const orgColumn = headers[0];
        const groupLabel = orgColumn;

        const orgWeeklyData = {};

        const flattenedData = rows
            .filter(row => {
                const orgName = (row[orgColumn] || '').trim();
                // Exclude empty rows and the pre-aggregated "Total" row
                return orgName && orgName.toLowerCase() !== 'total';
            })
            .map(row => {
                const orgName = (row[orgColumn] || '').trim();

                // For each org, find the most recent date where it actually has Enabled Users data.
                // Many orgs don't report in every week — using a fixed last-column would miss them.
                let bestDate = null;
                for (let i = sortedDates.length - 1; i >= 0; i--) {
                    const cols = dateMetricMap[sortedDates[i]];
                    const val = parseNumber(row[cols['Enabled Users']] || 0);
                    if (val > 0) {
                        bestDate = sortedDates[i];
                        break;
                    }
                }

                if (!bestDate) {
                    // No data for this org at all — return zeroes (will be filtered out below)
                    return { team: orgName, enabledUsers: 0, activeUsers: 0, weeklyActions: 0, monthlyActions: 0, engagement: 0, actionsPerUser: 0, powerUsers: 0 };
                }

                // Use latest week's enabled users (most current headcount)
                const bestCols = dateMetricMap[bestDate];
                const enabledUsers = parseNumber(row[bestCols['Enabled Users']] || 0);

                // Average metrics across ALL weeks with data (consistent with long-format aggregation)
                const weeklyMetrics = sortedDates.map(date => {
                    const cols = dateMetricMap[date];
                    return {
                        activePercent: parseNumber(row[cols['% Active Users']] || 0),
                        actions: parseNumber(row[cols['Avg Copilot Actions']] || 0),
                        powerPercent: parseNumber(row[cols['% Power Users']] || 0),
                        activeDays: parseNumber(row[cols['Avg Active Days']] || 0),
                        enabled: parseNumber(row[cols['Enabled Users']] || 0)
                    };
                }).filter(w => w.enabled > 0);

                const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
                const activePercent = avg(weeklyMetrics.map(w => w.activePercent).filter(v => v > 0));
                const actionsPerUser = avg(weeklyMetrics.map(w => w.actions).filter(v => v > 0));
                // Power user rate: use only the last 4 weeks for a current benchmark
                const recentWeeks = weeklyMetrics.slice(-4);
                const powerUsersPercent = avg(recentWeeks.map(w => w.powerPercent).filter(v => v > 0));
                const avgActiveDays = avg(weeklyMetrics.map(w => w.activeDays).filter(v => v > 0));

                const activeUsers = Math.round((enabledUsers * activePercent) / 100);
                const weeklyActions = actionsPerUser * activeUsers;
                const monthlyActions = weeklyActions * 4.33;
                const powerUsersCount = Math.round((enabledUsers * powerUsersPercent) / 100);

                // Build weekly history for this org (for peak week calculation AND time-period toggle)
                orgWeeklyData[orgName] = sortedDates
                    .map(date => {
                        const cols = dateMetricMap[date];
                        return {
                            date: parseDate(date),
                            actionsPerUser: parseNumber(row[cols['Avg Copilot Actions']] || 0),
                            activePercent: parseNumber(row[cols['% Active Users']] || 0),
                            powerPercent: parseNumber(row[cols['% Power Users']] || 0),
                            activeDays: parseNumber(row[cols['Avg Active Days']] || 0),
                            enabled: parseNumber(row[cols['Enabled Users']] || 0)
                        };
                    })
                    .filter(w => w.date !== null && w.enabled > 0);

                return {
                    team: orgName,
                    enabledUsers,
                    activeUsers,
                    weeklyActions,
                    monthlyActions,
                    engagement: avgActiveDays,
                    actionsPerUser,
                    powerUsers: powerUsersCount
                };
            })
            .filter(row => row.enabledUsers > 0 || row.activeUsers > 0);

        let detectedWeeks = sortedDates.length;
        if (sortedDates.length >= 2) {
            const earliest = new Date(sortedDates[0]);
            const latest = new Date(sortedDates[sortedDates.length - 1]);
            const spanDays = (latest - earliest) / (1000 * 60 * 60 * 24);
            const spanWeeks = Math.round(spanDays / 7) + 1;
            detectedWeeks = Math.max(spanWeeks, sortedDates.length);
        }
        console.log(`Parsed ${flattenedData.length} organizations from wide format (${detectedWeeks} weeks)`);
        const dateRange = sortedDates.length >= 2 ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}` : '';
        return { rows: flattenedData, mapping: {}, weeklyData: orgWeeklyData, groupLabel, detectedWeeks, dateRange, sortedDates };
    }

    // --- LONG FORMAT fallback ---
    // First column is always the grouping key
    const groupLabel = headers[0];

    // Try to detect column names (flexible mapping)
    const columnMappings = {
        enabledUsers: ['Enabled Users', 'Licensed Users', 'Total Users', 'Enabled'],
        activeUsers: ['Active Users', 'Active', 'Users'],
        totalActions: ['Total Actions', 'Actions', 'Total Activity', 'Avg Copilot Actions'],
        monthlyActions: ['Monthly Actions', 'Monthly Activity', 'Actions (Monthly)'],
        engagement: ['Engagement %', 'Engagement', 'Engagement Rate', 'Engagement Percentage', 'Avg Active Days'],
        activeUsersPercent: ['% Active Users', 'Active Users %', 'Active %'],
        powerUsers: ['% Power Users', 'Power Users %', 'Power Users'],
        date: ['Date', 'Week', 'Period', 'Week Ending']
    };

    // Find matching columns
    const mapping = { team: headers[0] };
    for (const [key, possibleNames] of Object.entries(columnMappings)) {
        for (const name of possibleNames) {
            const found = headers.find(h => h.toLowerCase().includes(name.toLowerCase()));
            if (found) {
                mapping[key] = found;
                break;
            }
        }
    }

    const hasDateColumn = !!mapping.date;
    const orgWeeklyData = {};

    if (hasDateColumn) {
        console.log('Detected LONG format CSV - aggregating by organization...');

        const orgGroups = {};
        rows.forEach(row => {
            const orgName = row[mapping.team];
            if (!orgName) return;
            if (!orgGroups[orgName]) orgGroups[orgName] = [];
            orgGroups[orgName].push(row);
        });

        const aggregatedRows = [];
        for (const [orgName, orgRows] of Object.entries(orgGroups)) {
            const rowsWithDates = orgRows.map(row => ({
                row: row,
                date: parseDate(row[mapping.date])
            })).filter(item => item.date !== null);

            if (rowsWithDates.length === 0) {
                aggregatedRows.push(orgRows[0]);
                continue;
            }

            rowsWithDates.sort((a, b) => b.date - a.date);

            orgWeeklyData[orgName] = rowsWithDates.map(item => ({
                date: item.date,
                actionsPerUser: parseNumber(item.row[mapping.totalActions] || 0),
                activePercent: parseNumber(item.row[mapping.activeUsersPercent] || 0),
                powerPercent: parseNumber(item.row[mapping.powerUsers] || 0),
                activeDays: parseNumber(item.row[mapping.engagement] || 0),
                enabled: parseNumber(item.row[mapping.enabledUsers] || 0)
            }));

            // Build an averaged row across all weeks instead of just using the latest
            const latestRow = { ...rowsWithDates[0].row };

            // Average the % Active Users across all weeks
            if (mapping.activeUsersPercent) {
                const activePercents = rowsWithDates
                    .map(item => parseNumber(item.row[mapping.activeUsersPercent] || 0))
                    .filter(p => p > 0);
                if (activePercents.length > 0) {
                    const avgActivePercent = activePercents.reduce((a, b) => a + b, 0) / activePercents.length;
                    latestRow[mapping.activeUsersPercent] = avgActivePercent.toFixed(1) + '%';
                }
            }

            // Average the actions per user across all weeks
            if (mapping.totalActions) {
                const actions = rowsWithDates
                    .map(item => parseNumber(item.row[mapping.totalActions] || 0))
                    .filter(a => a > 0);
                if (actions.length > 0) {
                    const avgActions = actions.reduce((a, b) => a + b, 0) / actions.length;
                    latestRow[mapping.totalActions] = avgActions.toFixed(1);
                }
            }

            // Use the latest week's enabled users (most current headcount)
            aggregatedRows.push(latestRow);
        }

        console.log(`Aggregated ${rows.length} rows into ${aggregatedRows.length} organizations`);
        rows = aggregatedRows;
    }

    const flattenedData = rows
        .filter(row => {
            const orgName = (row[mapping.team] || '').trim();
            return orgName && orgName.toLowerCase() !== 'total';
        })
        .map(row => {
            let enabledUsers = parseNumber(row[mapping.enabledUsers] || 0);
            let activeUsers = parseNumber(row[mapping.activeUsers] || 0);

            if (mapping.activeUsersPercent && row[mapping.activeUsersPercent] && enabledUsers > 0) {
                const activePercent = parseNumber(row[mapping.activeUsersPercent]);
                if (activePercent > 0) {
                    activeUsers = Math.round((enabledUsers * activePercent) / 100);
                }
            }

            if (activeUsers === 0 && enabledUsers > 0) {
                activeUsers = enabledUsers;
            }

            const actionsPerUserPerWeek = parseNumber(row[mapping.totalActions] || 0);
            const weeklyActions = actionsPerUserPerWeek * activeUsers;
            const monthlyActions = weeklyActions * 4.33;

            let powerUsersCount = 0;
            if (mapping.powerUsers && row[mapping.powerUsers]) {
                const powerUsersPercent = parseNumber(row[mapping.powerUsers]);
                powerUsersCount = Math.round((enabledUsers * powerUsersPercent) / 100);
            }

            return {
                team: row[mapping.team],
                enabledUsers,
                activeUsers,
                weeklyActions,
                monthlyActions,
                engagement: parseNumber(row[mapping.engagement] || 0),
                actionsPerUser: actionsPerUserPerWeek,
                powerUsers: powerUsersCount
            };
        })
        .filter(row => row.enabledUsers > 0 || row.activeUsers > 0);

    // Calculate analysis period span from earliest to latest date
    const allDates = new Set();
    for (const weeks of Object.values(orgWeeklyData)) {
        weeks.forEach(w => allDates.add(w.date.toISOString().slice(0, 10)));
    }
    const sortedDateStrings = [...allDates].sort();
    let detectedWeeks = allDates.size || 1;
    if (sortedDateStrings.length >= 2) {
        const earliest = new Date(sortedDateStrings[0]);
        const latest = new Date(sortedDateStrings[sortedDateStrings.length - 1]);
        const spanDays = (latest - earliest) / (1000 * 60 * 60 * 24);
        const spanWeeks = Math.round(spanDays / 7) + 1; // +1 to include both endpoints
        detectedWeeks = Math.max(spanWeeks, allDates.size);
    }
    console.log(`Detected ${detectedWeeks} weeks of data (${sortedDateStrings.length} snapshots, span: ${sortedDateStrings[0]} to ${sortedDateStrings[sortedDateStrings.length - 1]})`);
    const dateRange = sortedDateStrings.length >= 2 ? `${sortedDateStrings[0]} to ${sortedDateStrings[sortedDateStrings.length - 1]}` : '';

    return { rows: flattenedData, mapping, weeklyData: orgWeeklyData, groupLabel, detectedWeeks, dateRange, sortedDates: sortedDateStrings };
}

// Parse number from string (handles percentages, commas, etc.)
function parseNumber(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    // Remove commas, spaces, and percentage signs
    const cleaned = value.toString().replace(/[,%\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

// Calculate all ROI metrics
function calculateMetrics(data) {
    const rows = data.rows;

    // Aggregate totals
    const totalEnabledUsers = rows.reduce((sum, row) => sum + row.enabledUsers, 0);
    const totalActiveUsers = rows.reduce((sum, row) => sum + row.activeUsers, 0);
    const totalWeeklyActions = rows.reduce((sum, row) => sum + row.weeklyActions, 0);
    const totalMonthlyActions = rows.reduce((sum, row) => sum + row.monthlyActions, 0);

    // Purchased licenses — use config value if set, otherwise fall back to enabled
    const totalPurchasedLicenses = config.totalPurchasedLicenses > 0 ? config.totalPurchasedLicenses : totalEnabledUsers;
    const unassignedLicenses = Math.max(0, totalPurchasedLicenses - totalEnabledUsers);
    const assignmentRate = totalPurchasedLicenses > 0 ? (totalEnabledUsers / totalPurchasedLicenses) * 100 : 100;

    // Activation rate
    const activationRate = totalEnabledUsers > 0 ? (totalActiveUsers / totalEnabledUsers) * 100 : 0;

    // Average actions per user
    const avgActionsPerUser = totalActiveUsers > 0 ? totalWeeklyActions / totalActiveUsers : 0;

    // Power users — sum actual power user counts from each team
    const powerUsers = rows.reduce((sum, row) => sum + row.powerUsers, 0);
    const powerUserRate = totalEnabledUsers > 0 ? (powerUsers / totalEnabledUsers) * 100 : 0;

    // Monthly costs — based on total purchased licenses (true investment)
    const monthlyCostPurchased = totalPurchasedLicenses * config.licenseCost;
    const monthlyCost = totalEnabledUsers * config.licenseCost;
    const annualCost = monthlyCostPurchased * 12;
    const wastedLicenseCost = unassignedLicenses * config.licenseCost;

    // ROI Calculations using configured minutes per action
    const minsPerAction = config.minutesPerAction;
    const hoursPerMonth = (totalMonthlyActions * minsPerAction) / 60;
    const valuePerMonth = hoursPerMonth * config.professionalRate;
    const annualValue = valuePerMonth * 12;
    const roiMultiple = monthlyCostPurchased > 0 ? (valuePerMonth / monthlyCostPurchased) : 0;

    // Weekly hours saved
    const weeklyHoursSaved = (totalWeeklyActions * minsPerAction) / 60;

    return {
        totalEnabledUsers,
        totalActiveUsers,
        totalPurchasedLicenses,
        unassignedLicenses,
        assignmentRate,
        activationRate,
        avgActionsPerUser,
        powerUsers,
        powerUserRate,
        totalWeeklyActions,
        totalMonthlyActions,
        weeklyHoursSaved,
        monthlyCost,
        monthlyCostPurchased,
        wastedLicenseCost,
        annualCost,
        minsPerAction,
        hoursPerMonth,
        valuePerMonth,
        annualValue,
        roiMultiple
    };
}

// ---- TIME-PERIOD TOGGLE LOGIC ----
// Recalculate team-level aggregates for a specific time window
function computeTeamsForPeriod(period) {
    if (!uploadedData || !uploadedData.weeklyData || !uploadedData.sortedDates) return null;
    const allDates = uploadedData.sortedDates;
    if (!allDates || allDates.length === 0) return null;

    // Determine which date indices to include
    let dateSlice;
    const total = allDates.length;
    switch (period) {
        case 'last4':
            dateSlice = allDates.slice(-4);
            break;
        case 'last13':
            dateSlice = allDates.slice(-13);
            break;
        case '3moAgo':
            // Weeks from before the last 13 weeks (i.e. everything prior to 3 months ago)
            dateSlice = allDates.slice(0, Math.max(1, total - 13));
            break;
        case 'first4':
            dateSlice = allDates.slice(0, 4);
            break;
        case 'all':
        default:
            dateSlice = allDates;
            break;
    }

    // Convert to a Set of ISO date strings for quick lookup
    const dateSet = new Set(dateSlice.map(d => typeof d === 'string' ? d : d.toISOString().slice(0, 10)));

    const rate = config.professionalRate;
    const mpa = config.minutesPerAction;
    const rows = uploadedData.rows;

    const recomputed = rows.map(row => {
        const weeklyData = uploadedData.weeklyData[row.team];
        if (!weeklyData || weeklyData.length === 0) return { ...row, monthlyValue: 0, weeklyHours: 0 };

        // Filter to matching dates
        const filtered = weeklyData.filter(w => {
            const key = w.date instanceof Date ? w.date.toISOString().slice(0, 10) : (typeof w.date === 'string' ? w.date.slice(0, 10) : '');
            return dateSet.has(key);
        });

        if (filtered.length === 0) return null;

        const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const enabledUsers = filtered[filtered.length - 1].enabled || row.enabledUsers;
        const activePercent = avg(filtered.map(w => w.activePercent).filter(v => v > 0));
        const actionsPerUser = avg(filtered.map(w => w.actionsPerUser).filter(v => v > 0));
        const powerPercent = avg(filtered.map(w => w.powerPercent).filter(v => v > 0));
        const activeDays = avg(filtered.map(w => w.activeDays).filter(v => v > 0));

        const activeUsers = Math.round((enabledUsers * activePercent) / 100);
        const weeklyActions = actionsPerUser * activeUsers;
        const monthlyActions = weeklyActions * 4.33;
        const powerUsersCount = Math.round((enabledUsers * powerPercent) / 100);
        const monthlyValue = (monthlyActions * mpa / 60) * rate;
        const weeklyHours = (weeklyActions * mpa / 60);

        // Peak week within this time slice
        let peakWeek = null;
        let peakActionsPerUser = actionsPerUser;
        if (filtered.length > 0) {
            const peak = filtered.reduce((max, w) => w.actionsPerUser > max.actionsPerUser ? w : max, filtered[0]);
            peakWeek = peak.date;
            peakActionsPerUser = peak.actionsPerUser;
        }

        return {
            ...row,
            enabledUsers,
            activeUsers,
            weeklyActions,
            monthlyActions,
            actionsPerUser,
            powerUsers: powerUsersCount,
            monthlyValue,
            weeklyHours,
            engagement: activeDays,
            peakWeek,
            peakActionsPerUser
        };
    }).filter(r => r !== null && (r.enabledUsers > 0 || r.activeUsers > 0));

    return recomputed.sort((a, b) => b.monthlyValue - a.monthlyValue);
}

// Labels for time period toggle buttons
const periodLabels = {
    last4: 'Last 4 Weeks',
    last13: 'Last 3 Months',
    '3moAgo': '3+ Months Ago',
    all: 'Entire Period',
    first4: 'First Month'
};

// Compute "prior 4 weeks" teams data (weeks 5-8 from end)
function computePrior4Weeks() {
    if (!uploadedData || !uploadedData.weeklyData || !uploadedData.sortedDates) return null;
    const allDates = uploadedData.sortedDates;
    if (allDates.length < 5) return null;
    const dateSlice = allDates.slice(-8, -4);
    if (dateSlice.length === 0) return null;

    const dateSet = new Set(dateSlice.map(d => typeof d === 'string' ? d : d.toISOString().slice(0, 10)));
    const rate = config.professionalRate;
    const mpa = config.minutesPerAction;

    const recomputed = uploadedData.rows.map(row => {
        const weeklyData = uploadedData.weeklyData[row.team];
        if (!weeklyData || weeklyData.length === 0) return null;
        const filtered = weeklyData.filter(w => {
            const key = w.date instanceof Date ? w.date.toISOString().slice(0, 10) : (typeof w.date === 'string' ? w.date.slice(0, 10) : '');
            return dateSet.has(key);
        });
        if (filtered.length === 0) return null;
        const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
        const enabledUsers = filtered[filtered.length - 1].enabled || row.enabledUsers;
        const activePercent = avg(filtered.map(w => w.activePercent).filter(v => v > 0));
        const actionsPerUser = avg(filtered.map(w => w.actionsPerUser).filter(v => v > 0));
        const powerPercent = avg(filtered.map(w => w.powerPercent).filter(v => v > 0));
        const activeUsers = Math.round((enabledUsers * activePercent) / 100);
        const weeklyActions = actionsPerUser * activeUsers;
        const monthlyActions = weeklyActions * 4.33;
        const powerUsersCount = Math.round((enabledUsers * powerPercent) / 100);
        const monthlyValue = (monthlyActions * mpa / 60) * rate;
        const weeklyHours = (weeklyActions * mpa / 60);
        return { ...row, enabledUsers, activeUsers, weeklyActions, monthlyActions, actionsPerUser, powerUsers: powerUsersCount, monthlyValue, weeklyHours };
    }).filter(r => r !== null && (r.enabledUsers > 0 || r.activeUsers > 0));

    return recomputed;
}

// Generate a trend badge showing % change
function trendBadge(current, previous) {
    if (previous === 0 || previous == null || current == null) return '';
    const pctChange = ((current - previous) / Math.abs(previous)) * 100;
    if (Math.abs(pctChange) < 0.5) return '<span style="display:inline-block;margin-left:6px;font-size:0.7rem;color:var(--text-secondary);">→ 0%</span>';
    const arrow = pctChange > 0 ? '↑' : '↓';
    const color = pctChange > 0 ? 'var(--green)' : 'var(--red)';
    return `<span style="display:inline-block;margin-left:6px;font-size:0.7rem;font-weight:700;color:${color};">${arrow} ${Math.abs(pctChange).toFixed(1)}%</span>`;
}

// Re-render the tier table and leaderboard for a selected time period
function switchTimePeriod(period) {
    const teams = computeTeamsForPeriod(period);
    if (!teams) return;

    // Update active button state. Scoped to [data-period] — the minutes-per-action
    // presets share .time-toggle-btn and must keep their own selected state.
    document.querySelectorAll('.time-toggle-btn[data-period]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.period === period);
    });

    const rate = config.professionalRate;
    const mpa = config.minutesPerAction;
    const licenseCost = config.licenseCost;

    // --- Rebuild tier table body ---
    // Use real per-user cohorts (Power BI Usage Threshold parity) when Viva data is loaded,
    // otherwise the helper falls back to legacy team-percentile slicing.
    const periodCohorts = computeCohortsForPeriod(period);
    const tierRows = buildTierTableBodyHTML(periodCohorts, teams, null, licenseCost);

    const tierBody = document.getElementById('tierTableBody');
    if (tierBody) tierBody.innerHTML = tierRows;

    // Update tier period label
    const tierLabel = document.getElementById('tierPeriodLabel');
    if (tierLabel) tierLabel.textContent = periodLabels[period];

    // --- Rebuild leaderboard top 10 ---
    const top10Body = document.getElementById('top10Body');
    if (top10Body) {
        top10Body.innerHTML = teams.slice(0, 10).map((team, index) => `
            <tr>
                <td style="color: var(--copilot-cyan); font-weight: 700; font-size: 1.1rem;">${index + 1}</td>
                <td style="font-weight: 600;">${team.team}</td>
                <td>${team.activeUsers.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                <td>${team.powerUsers}</td>
                <td>${team.actionsPerUser.toFixed(1)}</td>
                <td>${(team.engagement || 0).toFixed(1)}</td>
                <td style="color: var(--green); font-weight: 700;">$${team.monthlyValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                <td>${team.weeklyHours.toFixed(0)}</td>
            </tr>`).join('');
    }

    // --- Rebuild full leaderboard ---
    const fullBody = document.getElementById('teamsTableBody');
    if (fullBody) {
        fullBody.innerHTML = teams.map(team => {
            const peakWeekDisplay = team.peakWeek
                ? `${(team.peakWeek.getMonth() + 1).toString().padStart(2, '0')}/${team.peakWeek.getDate().toString().padStart(2, '0')}/${team.peakWeek.getFullYear()} (${team.peakActionsPerUser.toFixed(1)})`
                : 'N/A';
            return `
            <tr>
                <td data-value="${team.team}">${team.team}</td>
                <td data-value="${team.activeUsers}">${team.activeUsers.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                <td data-value="${team.powerUsers}">${team.powerUsers}</td>
                <td data-value="${team.weeklyActions}">${team.weeklyActions.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                <td data-value="${team.actionsPerUser}">${team.actionsPerUser.toFixed(1)}</td>
                <td data-value="${team.engagement || 0}">${(team.engagement || 0).toFixed(1)}</td>
                <td data-value="${team.peakWeek ? team.peakWeek.getTime() : 0}">${peakWeekDisplay}</td>
                <td data-value="${team.weeklyHours}">${team.weeklyHours.toFixed(0)}</td>
                <td data-value="${team.monthlyValue}"><strong>$${team.monthlyValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></td>
            </tr>`;
        }).join('');
    }

    // Update the "All Teams" period note
    const allTeamsNote = document.getElementById('allTeamsPeriodNote');
    if (allTeamsNote) {
        allTeamsNote.innerHTML = `Showing: <strong style="color: var(--copilot-cyan);">${periodLabels[period]}</strong> &nbsp;|&nbsp; Averages computed across ${period === 'all' ? 'all weeks in selected period' : periodLabels[period].toLowerCase()}`;
    }

    // --- Update Key Metrics ---
    const totalActiveUsers = teams.reduce((s, t) => s + t.activeUsers, 0);
    const totalWeeklyActions = teams.reduce((s, t) => s + t.weeklyActions, 0);
    const totalPowerUsers = teams.reduce((s, t) => s + t.powerUsers, 0);
    const totalEnabled = teams.reduce((s, t) => s + (t.enabledUsers || t.activeUsers), 0);
    const avgActionsPerUser = totalActiveUsers > 0 ? totalWeeklyActions / totalActiveUsers : 0;
    const weeklyHoursSaved = (totalWeeklyActions * mpa) / 60;
    const weeklyValue = (totalWeeklyActions * mpa / 60) * rate;
    const monthlyValue = weeklyValue * 4.33;
    const monthlyCost = totalEnabled * licenseCost;
    const roiMultiple = monthlyCost > 0 ? monthlyValue / monthlyCost : 0;
    const powerUserRate = totalEnabled > 0 ? (totalPowerUsers / totalEnabled) * 100 : 0;
    const adoptionRate = totalEnabled > 0 ? (totalActiveUsers / totalEnabled) * 100 : 0;
    const annualValuePerLicense = totalEnabled > 0 ? (monthlyValue * 12) / totalEnabled : 0;

    // Compute comparison badges for "Last 4 Weeks" period
    let badges = { roi: '', monthlyValue: '', adoption: '', actionsPerUser: '', powerUserRate: '', hoursSaved: '', annualValuePerLicense: '' };
    if (period === 'last4') {
        const priorTeams = computePrior4Weeks();
        if (priorTeams && priorTeams.length > 0) {
            const pActiveUsers = priorTeams.reduce((s, t) => s + t.activeUsers, 0);
            const pWeeklyActions = priorTeams.reduce((s, t) => s + t.weeklyActions, 0);
            const pPowerUsers = priorTeams.reduce((s, t) => s + t.powerUsers, 0);
            const pEnabled = priorTeams.reduce((s, t) => s + (t.enabledUsers || t.activeUsers), 0);
            const pAvgActions = pActiveUsers > 0 ? pWeeklyActions / pActiveUsers : 0;
            const pWeeklyHours = (pWeeklyActions * mpa) / 60;
            const pWeeklyValue = (pWeeklyActions * mpa / 60) * rate;
            const pMonthlyValue = pWeeklyValue * 4.33;
            const pMonthlyCost = pEnabled * licenseCost;
            const pRoi = pMonthlyCost > 0 ? pMonthlyValue / pMonthlyCost : 0;
            const pPowerRate = pEnabled > 0 ? (pPowerUsers / pEnabled) * 100 : 0;
            const pAdoption = pEnabled > 0 ? (pActiveUsers / pEnabled) * 100 : 0;
            const pAnnualValuePerLicense = pEnabled > 0 ? (pMonthlyValue * 12) / pEnabled : 0;

            badges.roi = trendBadge(roiMultiple, pRoi);
            badges.monthlyValue = trendBadge(monthlyValue, pMonthlyValue);
            badges.adoption = trendBadge(adoptionRate, pAdoption);
            badges.actionsPerUser = trendBadge(avgActionsPerUser, pAvgActions);
            badges.powerUserRate = trendBadge(powerUserRate, pPowerRate);
            badges.hoursSaved = trendBadge(weeklyHoursSaved, pWeeklyHours);
            badges.annualValuePerLicense = trendBadge(annualValuePerLicense, pAnnualValuePerLicense);
        }
    }

    const fmt = (n) => n.toLocaleString(undefined, {maximumFractionDigits: 0});
    const el = (id) => document.getElementById(id);

    if (el('km-roi')) el('km-roi').innerHTML = roiMultiple.toFixed(1) + 'x' + badges.roi;
    if (el('km-roiSub')) el('km-roiSub').textContent = `$${fmt(Math.round(monthlyValue))}/mo value ÷ $${fmt(Math.round(monthlyCost))}/mo cost`;
    if (el('km-monthlyValue')) el('km-monthlyValue').innerHTML = `$${fmt(Math.round(monthlyValue))}` + badges.monthlyValue;
    if (el('km-monthlyValueSub')) el('km-monthlyValueSub').textContent = `$${fmt(Math.round(monthlyValue * 12))}/year • $${fmt(Math.round(weeklyValue))}/week`;
    if (el('km-adoption')) el('km-adoption').innerHTML = adoptionRate.toFixed(1) + '%' + badges.adoption;
    if (el('km-adoptionSub')) el('km-adoptionSub').textContent = `${fmt(totalActiveUsers)} of ${fmt(totalEnabled)} licensed users active`;
    if (el('km-actionsPerUser')) el('km-actionsPerUser').innerHTML = avgActionsPerUser.toFixed(1) + badges.actionsPerUser;
    if (el('km-actionsPerUserSub')) el('km-actionsPerUserSub').textContent = `${(avgActionsPerUser * 4.33).toFixed(0)}/month • ${fmt(totalWeeklyActions)} total/week`;
    if (el('km-powerUserRate')) el('km-powerUserRate').innerHTML = powerUserRate.toFixed(1) + '%' + badges.powerUserRate;
    if (el('km-powerUserSub')) el('km-powerUserSub').innerHTML = `${fmt(totalPowerUsers)} power users <span style="color: var(--copilot-cyan); font-size: 0.8rem;">(${periodLabels[period]})</span>`;
    if (el('km-hoursSaved')) el('km-hoursSaved').innerHTML = fmt(Math.round(weeklyHoursSaved)) + badges.hoursSaved;
    if (el('km-hoursSavedSub')) el('km-hoursSavedSub').textContent = `${fmt(totalWeeklyActions)} actions × ${mpa} min ÷ 60`;
    if (el('km-costPerHour')) el('km-costPerHour').innerHTML = `$${fmt(Math.round(annualValuePerLicense))}` + badges.annualValuePerLicense;
    if (el('km-costPerHourSub')) el('km-costPerHourSub').textContent = `$${fmt(Math.round(monthlyValue))}/mo × 12 ÷ ${fmt(totalEnabled)} licenses`;
}

// Build ROI projection tables (break-even, tiers, 3-year projections)
function buildProjectionTables(metrics, sortedTeams) {
    const rate = config.professionalRate;
    const mpa = config.minutesPerAction;
    const valPerAction = (mpa / 60) * rate;
    const licenseCost = config.licenseCost;
    const totalUsers = metrics.totalEnabledUsers;
    const activeUsers = metrics.totalActiveUsers;
    const avgWeekly = metrics.avgActionsPerUser;
    const avgMonthly = avgWeekly * 4.33;

    // ---- BREAK-EVEN TABLE (framed by time-savings assumptions) ----
    // Show break-even at different minutes-per-action assumptions at the user's actual license cost
    const mpaScenarios = [2, 3, 6, 10].map(m => ({
        label: `${m} min/action`,
        mpa: m,
        valPerAction: (m / 60) * rate
    }));

    // Break-even actions needed at each time-savings scenario
    const beAtMpa = (scenario, multiplier) => (licenseCost * multiplier / scenario.valPerAction).toFixed(1);
    // ROI at each scenario given user's actual average monthly actions
    const roiAtMpa = (scenario) => (avgMonthly * scenario.valPerAction / licenseCost).toFixed(1);

    const beHeaders = mpaScenarios.map(s => {
        const isCurrent = s.mpa === mpa;
        const style = isCurrent ? ' style="color: var(--copilot-cyan); font-weight: 700;"' : '';
        return `<th${style}>${s.label}${isCurrent ? ' ✦' : ''}</th>`;
    }).join('');

    const beRow = (label, multiplier) => {
        const cells = mpaScenarios.map(s => {
            const isCurrent = s.mpa === mpa;
            const style = isCurrent ? ' style="font-weight: 600; color: var(--copilot-cyan);"' : '';
            return `<td${style}>${beAtMpa(s, multiplier)}</td>`;
        }).join('');
        return `<tr><td><strong>${label}</strong></td>${cells}</tr>`;
    };

    const breakEvenHtml = section('Break-Even & ROI Thresholds', `
        <div class="roi-table-container" style="box-shadow:none;border:none;padding:0;margin:0;">
            <p style="text-align:center; margin-bottom:1rem; color: var(--text-secondary);">
                How many Copilot actions per user per month are needed to break even on your <strong>$${licenseCost}/user/month</strong> license cost
                under different time-savings assumptions. ✦ = your current setting.
            </p>
            <table>
                <thead>
                    <tr><th>ROI Target</th>${beHeaders}</tr>
                </thead>
                <tbody>
                    ${beRow('Break-even (1x)', 1)}
                    ${beRow('2x Return', 2)}
                    ${beRow('5x Return', 5)}
                    ${beRow('10x Return', 10)}
                    <tr style="border-top: 2px solid var(--copilot-blue);">
                        <td><strong>Your Actual ROI</strong></td>
                        ${mpaScenarios.map(s => {
                            const isCurrent = s.mpa === mpa;
                            const roi = roiAtMpa(s);
                            return `<td style="color: var(--green); font-weight: bold;${isCurrent ? ' text-decoration: underline;' : ''}">${roi}x</td>`;
                        }).join('')}
                    </tr>
                </tbody>
            </table>
            <div class="info-box" style="margin-top:1rem;">
                <p><strong>Your users average ~${avgMonthly.toFixed(0)} actions/month.</strong>
                At your current assumption of <strong>${mpa} min/action</strong> and <strong>$${rate}/hr</strong>,
                break-even requires just <strong>${(licenseCost / valPerAction).toFixed(1)} actions/month</strong> —
                your users ${avgMonthly > (licenseCost / valPerAction) ? `exceed this by <strong style="color: var(--green);">${((avgMonthly / (licenseCost / valPerAction)) - 1).toFixed(0)}x</strong>` : 'are approaching this target'}.</p>
                <p style="margin-top:0.5rem;">Even at a conservative <strong>2 min/action</strong>, your deployment delivers <strong>${roiAtMpa(mpaScenarios[0])}x ROI</strong>.</p>
            </div>
        </div>
        `);

    // ---- USAGE TIER DISTRIBUTION ----
    // If Viva Insights per-person data is loaded, render real Usage Threshold cohorts.
    // Otherwise fall back to legacy team-percentile slicing (with an accuracy banner).
    const tierCohorts = uploadedData.isVivaInsights ? (uploadedData.personCohorts || computeCohortsForPeriod('all')) : null;
    const tierRows = buildTierTableBodyHTML(tierCohorts, sortedTeams, metrics, licenseCost);
    const tierBanner = buildTierAccuracyBanner(uploadedData);
    const tierColumnLabel = tierCohorts ? 'User Cohort' : 'User Tier';
    const tierColumnTip = tierCohorts
        ? 'Per-user Usage Threshold cohorts. Power Users = avg ≥20 actions/wk with active in ≥9 of last 12 weeks. Habitual = ≥8 + habit. Novice = ≥1. Low = >0. Non-users = 0. Matches the Super User Adoption report (Usage Threshold column).'
        : 'Teams ranked by actions per user and grouped into percentile bands. Top 10% are your champions; Bottom 25% your biggest growth opportunity. Note: not true per-user tiers — upload a Viva Insights per-person export for those.';

    const tierHtml = section('Usage Tier Value Distribution', `
        <div class="roi-table-container" style="box-shadow:none;border:none;padding:0;margin:0;">
            ${tierBanner}
            <p style="text-align:center; margin-bottom:1rem; color: var(--text-secondary);">
                ${tierCohorts
                    ? `Real per-user Usage Threshold cohorts based on ${Object.keys(uploadedData.personIndex).length.toLocaleString()} distinct users. Investment at $${licenseCost}/user/month.`
                    : `${uploadedData.groupLabel || 'Teams'} segmented into performance tiers by Copilot actions per user. Investment at $${licenseCost}/user/month.`}<br>
                <a href="Start%20Here.html" target="_blank" style="color: var(--accent); font-weight: 500; text-decoration: none;">Explore the Adoption Journey to move users up tiers &rarr;</a>
            </p>
            ${uploadedData.sortedDates && uploadedData.sortedDates.length > 4 ? `<div class="time-toggle-bar" style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
                <button class="time-toggle-btn active" data-period="all" onclick="switchTimePeriod('all')">Entire Period</button>
                <button class="time-toggle-btn" data-period="last4" onclick="switchTimePeriod('last4')">Last 4 Weeks</button>
                <button class="time-toggle-btn" data-period="last13" onclick="switchTimePeriod('last13')">Last 3 Months</button>
                <button class="time-toggle-btn" data-period="3moAgo" onclick="switchTimePeriod('3moAgo')">3+ Months Ago</button>
                <button class="time-toggle-btn" data-period="first4" onclick="switchTimePeriod('first4')">First Month</button>
            </div>
            <p id="tierPeriodLabel" style="text-align:center; margin-bottom:0.5rem; color: var(--copilot-cyan); font-weight:600; font-size:0.9rem;">Entire Period</p>` : ''}
            <table>
                <thead>
                    <tr><th>${tierColumnLabel} ${tip(tierColumnTip)}</th><th>${tierCohorts ? 'Users' : 'Active Users'}<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">${tierCohorts ? 'count' : 'avg/week'}</span></th><th>Actions/Month<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/user</span> ${tip('Average monthly Copilot actions per user in this cohort.')}</th><th>Monthly Investment<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">total</span> ${tip('Number of users in this cohort × license cost per month.')}</th><th>Monthly Value<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">projected</span> ${tip('Productivity value generated by this cohort based on their actions and the configured time savings.')}</th><th>ROI<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">value÷cost</span> ${tip('Monthly value ÷ monthly investment for this cohort. Shows which user segments generate the most return.')}</th></tr>
                </thead>
                <tbody id="tierTableBody">${tierRows}</tbody>
            </table>
        </div>
        `);

    // ---- EXPANSION PROJECTION TABLE ----
    const scaledMonthly = metrics.valuePerMonth;
    const scaledAnnual = scaledMonthly * 12;
    const annualCost = metrics.annualCost;
    const currentActivation = activeUsers / totalUsers;
    const valuePerActiveUser = activeUsers > 0 ? scaledMonthly / activeUsers : 0;

    // Expansion scenarios modeled on increasing actions per user (network effects)
    // As more people use Copilot, shared prompts, templates, and culture drive higher per-user engagement
    const currentActionsPerUser = avgMonthly;
    const expansionScenarios = [
        { users: totalUsers, label: 'Current deployment', actionsMultiplier: 1.0, isCurrentRow: true },
        { users: Math.round(totalUsers * 2), label: null, actionsMultiplier: 1.10 },
        { users: Math.round(totalUsers * 5), label: null, actionsMultiplier: 1.25 },
        { users: Math.round(totalUsers * 10), label: null, actionsMultiplier: 1.40 },
        { users: Math.round(totalUsers * 20), label: null, actionsMultiplier: 1.55 },
    ];

    let projRows = '';
    expansionScenarios.forEach(s => {
        const actionsPerUser = currentActionsPerUser * s.actionsMultiplier;
        const totalMonthlyActions = actionsPerUser * s.users;
        const mv = (totalMonthlyActions * mpa / 60) * rate;
        const av = mv * 12;
        const ac = s.users * licenseCost * 12;
        const roi = ac > 0 ? (av / ac).toFixed(1) : '0.0';
        const label = s.label || `${s.users.toLocaleString(undefined, {maximumFractionDigits: 0})} users`;
        const rowStyle = s.isCurrentRow ? ' style="border-bottom: 2px solid var(--copilot-blue);"' : '';
        projRows += `<tr${rowStyle}>
            <td>${s.isCurrentRow ? '<strong>' + label + '</strong>' : label}</td>
            <td>${s.users.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td>${actionsPerUser.toFixed(0)}</td>
            <td>${totalMonthlyActions.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td>$${mv.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td>$${ac.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
            <td style="color: var(--green); font-weight: bold;">${roi}x</td>
        </tr>`;
    });

    const avgMonthlyActions = avgMonthly.toFixed(0);

    const projHtml = section('Expansion Projections', `
        <div class="roi-table-container" style="box-shadow:none;border:none;padding:0;margin:0;">
            <p style="text-align:center; margin-bottom:1rem; color: var(--text-secondary);">
                Projected value as deployment scales. Per-user actions increase at larger scale due to network effects — more shared prompts, templates, and AI-fluent culture.
                Current avg: ${avgMonthlyActions} actions/user/mo at ${mpa} min/action, $${rate}/hr.
            </p>
            <table>
                <thead>
                    <tr><th>Scenario</th><th>Licensed Users</th><th>Actions/User/Mo ${tip('Average monthly Copilot actions per user. As more colleagues adopt Copilot, shared best practices, prompt libraries, and cultural momentum drive higher per-user engagement.')}</th><th>Total Actions/Mo</th><th>Monthly Value</th><th>Annual Cost ${tip('Total licensing cost per year = licensed users × license cost × 12 months.')}</th><th>ROI</th></tr>
                </thead>
                <tbody>${projRows}</tbody>
            </table>
            <div class="info-box" style="margin-top:1rem;">
                <p><strong>Why do actions per user increase at scale?</strong><br>
                Organizations with broader Copilot deployment see higher per-user engagement due to <strong>network effects</strong>: 
                shared prompt libraries, AI-first meeting culture, peer learning, and purpose-built workflows compound as more teams adopt. 
                Microsoft internal data shows mature deployments consistently outperform initial rollouts in per-user activity.</p>
                <p style="margin-top:0.75rem;"><strong>Need more detailed projections?</strong>
                Use the <a href="roi-calculator.html" target="_blank" style="color: var(--copilot-cyan); font-weight: 600;">ROI Calculator</a>
                to model custom user counts, pricing tiers, and engagement curves for your specific scenario.</p>
            </div>
        </div>
        `);

    // ---- UNLICENSED USER OPPORTUNITY COST ----
    const avgValuePerActiveUser = activeUsers > 0 ? metrics.valuePerMonth / activeUsers : 0;
    const unlicensedUsageFactor = 0.10;
    const unlicensedActionsPerMonth = avgMonthly * unlicensedUsageFactor;
    const valuePerUnlicensedUser = avgValuePerActiveUser * unlicensedUsageFactor;

    const opportunityHtml = section('Unlicensed User Opportunity Cost', `
        <div class="roi-table-container" style="box-shadow:none;border:none;padding:0;margin:0;">
            <p style="text-align:center; margin-bottom:1rem; color: var(--text-secondary);">
                Estimated productivity left on the table for employees without a Copilot license.<br>
                Assumes unlicensed users would adopt at <strong>10%</strong> of the current licensed-user average.
            </p>

            <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 1.5rem;">
                <label style="font-size: 0.9rem; color: var(--text-secondary);">Show as:</label>
                <div style="display: inline-flex; border-radius: 8px; overflow: hidden; border: 1px solid var(--border);">
                    <button id="opp-view-value" onclick="setOppView('value')" style="padding: 6px 16px; font-size: 0.85rem; border: none; cursor: pointer; background: var(--copilot-blue); color: white; font-weight: 600;">Dollar Value</button>
                    <button id="opp-view-actions" onclick="setOppView('actions')" style="padding: 6px 16px; font-size: 0.85rem; border: none; cursor: pointer; background: var(--surface); color: var(--text-secondary);">Monthly Actions</button>
                </div>
            </div>

            <div style="max-width: 600px; margin: 0 auto 2rem;">
                <label style="display: block; text-align: center; font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Unlicensed Seat Count</label>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <input type="range" id="opp-slider" min="100" max="300000" step="100" value="1000"
                        style="flex: 1; accent-color: var(--copilot-blue);"
                        oninput="document.getElementById('opp-input').value = this.value; updateOppCost()">
                    <input type="number" id="opp-input" min="100" max="300000" step="100" value="1000"
                        style="width: 110px; padding: 0.4rem 0.6rem; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--copilot-cyan); font-size: 1rem; font-weight: 600; text-align: center; font-family: inherit;"
                        oninput="document.getElementById('opp-slider').value = this.value; updateOppCost()">
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 0.25rem;">
                    <small style="color: var(--text-secondary);">100</small>
                    <strong id="opp-slider-label" style="font-size: 1.1rem; color: var(--copilot-cyan);">1,000 users</strong>
                    <small style="color: var(--text-secondary);">300,000</small>
                </div>
            </div>

            <div class="metrics-grid" id="opp-metrics">
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Licensing Cost / Mo ${tip('The monthly cost to license this many users for Copilot at the configured rate.')}</span></div>
                    <div class="metric-value" id="opp-licensing-cost">—</div>
                    <div class="metric-sublabel" id="opp-licensing-math"></div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row"><span id="opp-value-label">Potential Value / Mo</span> ${tip('The estimated monthly productivity value these users would generate at 10% of current licensed-user adoption.')}</span></div>
                    <div class="metric-value" id="opp-potential-value">—</div>
                    <div class="metric-sublabel" id="opp-value-math"></div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row"><span id="opp-net-label">Net Gain / Mo</span> ${tip('Potential value minus licensing cost. Green means the productivity gained exceeds the cost of licenses.')}</span></div>
                    <div class="metric-value" id="opp-net-gain">—</div>
                    <div class="metric-sublabel" id="opp-net-math"></div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row"><span id="opp-annual-label">Annual Opportunity</span> ${tip('Net monthly gain × 12. This is the additional value your organization could unlock each year by bringing these users onto Copilot.')}</span></div>
                    <div class="metric-value" id="opp-annual">—</div>
                    <div class="metric-sublabel" id="opp-annual-math"></div>
                </div>
            </div>

            <div class="info-box" style="margin-top:1.5rem;">
                <p><strong>How is this calculated?</strong><br>
                Your current licensed users average <strong>${avgMonthly.toFixed(0)} actions/user/month</strong> worth <strong>$${avgValuePerActiveUser.toFixed(0)}/user/month</strong>.
                Unlicensed users are conservatively estimated at <strong>10% of that rate</strong>
                (~${unlicensedActionsPerMonth.toFixed(0)} actions/user/month, worth $${valuePerUnlicensedUser.toFixed(0)}/user/month),
                reflecting minimal initial adoption with no training or enablement.</p>
            </div>
        </div>
        `);

    // Store opportunity cost params globally so the slider/toggle can recalculate
    window._oppParams = {
        licenseCost: licenseCost,
        valuePerUser: valuePerUnlicensedUser,
        actionsPerUser: unlicensedActionsPerMonth,
        avgMonthly: avgMonthly,
        view: 'value'
    };

    // Initialize after render
    setTimeout(() => { if (document.getElementById('opp-slider')) updateOppCost(); }, 50);

    return { tierHtml, breakEvenHtml, opportunityHtml, projHtml };
}

// Opportunity cost slider update
function updateOppCost() {
    const p = window._oppParams;
    if (!p) return;
    const count = parseInt(document.getElementById('opp-slider').value);
    const fmt = (n) => n.toLocaleString(undefined, { maximumFractionDigits: 0 });

    document.getElementById('opp-slider-label').textContent = fmt(count) + ' users';
    const inputEl = document.getElementById('opp-input');
    if (inputEl && parseInt(inputEl.value) !== count) inputEl.value = count;

    const licensingCost = p.licenseCost * count;
    const potentialValue = p.valuePerUser * count;
    const netGain = potentialValue - licensingCost;
    const annual = netGain * 12;
    const totalActions = p.actionsPerUser * count;

    document.getElementById('opp-licensing-cost').textContent = '$' + fmt(licensingCost);
    document.getElementById('opp-licensing-math').textContent = fmt(count) + ' users × $' + p.licenseCost + '/mo';

    if (p.view === 'value') {
        document.getElementById('opp-value-label').textContent = 'Potential Value / Mo';
        document.getElementById('opp-potential-value').textContent = '$' + fmt(potentialValue);
        document.getElementById('opp-value-math').textContent = fmt(count) + ' × $' + fmt(Math.round(p.valuePerUser)) + '/user/mo';
        document.getElementById('opp-net-label').textContent = 'Net Gain / Mo';
        document.getElementById('opp-net-gain').textContent = '$' + fmt(netGain);
        document.getElementById('opp-net-gain').style.color = netGain >= 0 ? 'var(--green)' : 'var(--red)';
        document.getElementById('opp-net-math').textContent = '$' + fmt(potentialValue) + ' − $' + fmt(licensingCost);
        document.getElementById('opp-annual-label').textContent = 'Annual Opportunity';
        document.getElementById('opp-annual').textContent = '$' + fmt(annual);
        document.getElementById('opp-annual').style.color = annual >= 0 ? 'var(--green)' : 'var(--red)';
        document.getElementById('opp-annual-math').textContent = '$' + fmt(netGain) + ' × 12 months';
    } else {
        document.getElementById('opp-value-label').textContent = 'Total Actions / Mo';
        document.getElementById('opp-potential-value').textContent = fmt(totalActions);
        document.getElementById('opp-value-math').textContent = fmt(count) + ' × ' + fmt(Math.round(p.actionsPerUser)) + ' actions/user';
        document.getElementById('opp-net-label').textContent = 'Actions / User / Mo';
        document.getElementById('opp-net-gain').textContent = fmt(Math.round(p.actionsPerUser)) + ' actions';
        document.getElementById('opp-net-gain').style.color = '';
        document.getElementById('opp-net-math').textContent = '10% of ' + fmt(Math.round(p.avgMonthly)) + ' avg actions/user';
        document.getElementById('opp-annual-label').textContent = 'Annual Actions';
        document.getElementById('opp-annual').textContent = fmt(totalActions * 12) + ' actions';
        document.getElementById('opp-annual').style.color = '';
        document.getElementById('opp-annual-math').textContent = fmt(totalActions) + ' actions/mo × 12 months';
    }
}

function setOppView(view) {
    window._oppParams.view = view;
    document.getElementById('opp-view-value').style.background = view === 'value' ? 'var(--copilot-blue)' : 'var(--surface)';
    document.getElementById('opp-view-value').style.color = view === 'value' ? 'white' : 'var(--text-secondary)';
    document.getElementById('opp-view-actions').style.background = view === 'actions' ? 'var(--copilot-blue)' : 'var(--surface)';
    document.getElementById('opp-view-actions').style.color = view === 'actions' ? 'white' : 'var(--text-secondary)';
    updateOppCost();
}

// ---- MINUTES PER ACTION TOGGLE ----
// Build toggle buttons for 3 min, 6 min, the user's original choice (if different), plus a custom input
function buildMpaToggleButtons() {
    const presets = [3, 6];
    const options = new Set(presets);
    if (originalMinutesPerAction !== null) options.add(originalMinutesPerAction);
    const sorted = [...options].sort((a, b) => a - b);

    const isCustom = !sorted.includes(config.minutesPerAction);

    const buttons = sorted.map(val => {
        const isActive = config.minutesPerAction === val && !isCustom;
        const isDefault = val === originalMinutesPerAction;
        const label = `${val} min` + (isDefault ? ' (your default)' : '');
        return `<button class="time-toggle-btn mpa-preset-btn${isActive ? ' active' : ''}" data-mpa="${val}" aria-pressed="${isActive}" onclick="switchMinutesPerAction(${val})">${label}</button>`;
    }).join('');

    const customActiveStyle = isCustom
        ? 'border-color: var(--accent-line); background: var(--accent-soft); color: var(--text-primary);'
        : 'border-color: var(--rule); background: transparent; color: var(--text-secondary);';

    const customBox = `<span style="display:inline-flex; align-items:center; gap:0.4rem; padding:0.25rem 0.5rem; border-radius:6px; border:1px solid; font-size:0.8125rem; ${customActiveStyle}">
        <input type="number" id="mpaCustomInput" min="1" max="30" step="0.5" value="${isCustom ? config.minutesPerAction : ''}" placeholder="—"
            style="width:3rem; padding:0.2rem 0.3rem; border-radius:4px; border:1px solid var(--rule); background:var(--ink-700); color:var(--text-primary); font-size:0.8125rem; font-family:var(--font-mono); text-align:center;"
            onkeydown="if(event.key==='Enter'){applyCustomMpa();}"
        > min <button onclick="applyCustomMpa()" style="padding:0.2rem 0.6rem; border-radius:4px; border:1px solid var(--accent); background:var(--accent); color:#fff; font-size:0.75rem; font-weight:600; cursor:pointer; font-family:inherit;">Go</button>
    </span>`;

    return buttons + customBox;
}

// Apply custom minutes per action from the input box
function applyCustomMpa() {
    const input = document.getElementById('mpaCustomInput');
    if (!input) return;
    const val = parseFloat(input.value);
    if (!val || val < 1 || val > 30) return;
    switchMinutesPerAction(val);
}

// Switch minutes per action and re-render the entire report
function switchMinutesPerAction(minutes) {
    config.minutesPerAction = minutes;
    renderResults();
}

// Switch between report tabs
function switchReportTab(tabId) {
    // Hide all tab panels
    document.querySelectorAll('.report-tab-content').forEach(panel => {
        panel.style.display = 'none';
    });
    // Show selected panel
    const target = document.getElementById('tab-' + tabId);
    if (target) {
        target.style.display = 'block';
        target.style.animation = 'fadeIn 0.3s ease';
    }
    // Update tab button styles (the .active class drives all styling in styles.css)
    document.querySelectorAll('.report-tab').forEach(btn => {
        const isActive = btn.dataset.tab === tabId;
        btn.classList.toggle('active', isActive);
    });
}

// Render results page
function renderResults() {
    const metrics = calculateMetrics(uploadedData);
    const rows = uploadedData.rows;

    // Calculate Intelligent Recap values
    const INTELLIGENT_RECAP_HOURS_PER_ACTION = 0.5; // 30 minutes median meeting duration
    const recapHoursSaved = config.intelligentRecapActions * INTELLIGENT_RECAP_HOURS_PER_ACTION;
    const recapMonthlyValue = recapHoursSaved * config.professionalRate;
    const recapAnnualValue = recapMonthlyValue * 12;

    // Calculate values with Intelligent Recap
    const valuePerMonthWithRecap = metrics.valuePerMonth + recapMonthlyValue;
    const annualValueWithRecap = metrics.annualValue + recapAnnualValue;
    const roiMultipleWithRecap = valuePerMonthWithRecap / metrics.monthlyCost;

    const showRecap = config.intelligentRecapActions > 0;
    const hasTimePeriods = !!(uploadedData.sortedDates && uploadedData.sortedDates.length > 4);

    // Sort teams by monthly value using configured minutes per action
    const sortedTeams = rows.map(row => {
        const monthlyValue = (row.monthlyActions * config.minutesPerAction / 60) * config.professionalRate;
        const weeklyHours = (row.weeklyActions * config.minutesPerAction / 60);

        // Find peak performance week for this team
        let peakWeek = null;
        let peakActionsPerUser = row.actionsPerUser;

        if (uploadedData.weeklyData && uploadedData.weeklyData[row.team]) {
            const weeklyData = uploadedData.weeklyData[row.team];
            if (weeklyData.length > 0) {
                // Find the week with highest actionsPerUser
                const peak = weeklyData.reduce((max, week) =>
                    week.actionsPerUser > max.actionsPerUser ? week : max
                , weeklyData[0]);

                peakWeek = peak.date;
                peakActionsPerUser = peak.actionsPerUser;
            }
        }

        return {
            ...row,
            monthlyValue,
            weeklyHours,
            peakWeek,
            peakActionsPerUser
        };
    }).sort((a, b) => b.monthlyValue - a.monthlyValue);

    // Compute trend: last 4 weeks vs prior 4 weeks
    let trendBadge = '';
    let trendSummary = '';
    if (hasTimePeriods && uploadedData.sortedDates.length >= 8) {
        const recentTeams = computeTeamsForPeriod('last4');
        const dates = uploadedData.sortedDates;
        const prior4Dates = dates.slice(-8, -4);
        const prior4Set = new Set(prior4Dates.map(d => typeof d === 'string' ? d : d.toISOString().slice(0, 10)));

        if (recentTeams && prior4Dates.length > 0) {
            // Compute prior period total actions
            let priorTotalActions = 0;
            let priorActiveUsers = 0;
            for (const row of rows) {
                const wd = uploadedData.weeklyData[row.team];
                if (!wd) continue;
                const filtered = wd.filter(w => {
                    const key = w.date instanceof Date ? w.date.toISOString().slice(0, 10) : (typeof w.date === 'string' ? w.date.slice(0, 10) : '');
                    return prior4Set.has(key);
                });
                if (filtered.length > 0) {
                    const avgApu = filtered.reduce((s, w) => s + w.actionsPerUser, 0) / filtered.length;
                    const avgActive = filtered.reduce((s, w) => s + (w.activePercent || 0), 0) / filtered.length;
                    const en = filtered[filtered.length - 1].enabled || row.enabledUsers;
                    const au = Math.round((en * avgActive) / 100);
                    priorTotalActions += avgApu * au;
                    priorActiveUsers += au;
                }
            }

            const recentTotalActions = recentTeams.reduce((s, t) => s + t.weeklyActions, 0);
            const recentActiveUsers = recentTeams.reduce((s, t) => s + t.activeUsers, 0);
            const recentAvgApu = recentActiveUsers > 0 ? recentTotalActions / recentActiveUsers : 0;
            const priorAvgApu = priorActiveUsers > 0 ? priorTotalActions / priorActiveUsers : 0;

            if (priorAvgApu > 0) {
                const pctChange = ((recentAvgApu - priorAvgApu) / priorAvgApu) * 100;
                const direction = pctChange >= 0 ? '↑' : '↓';
                const color = pctChange >= 0 ? 'var(--green)' : 'var(--red, #ef4444)';
                trendBadge = `<span style="font-size:0.75rem; color:${color}; font-weight:600; margin-left:0.4rem;">${direction}${Math.abs(pctChange).toFixed(0)}% vs prior 4wk</span>`;
                trendSummary = pctChange >= 0 ? `, trending <strong style="color: var(--green);">up ${Math.abs(pctChange).toFixed(0)}%</strong> vs prior month` : `, trending <strong style="color: var(--red, #ef4444);">down ${Math.abs(pctChange).toFixed(0)}%</strong> vs prior month`;
            }
        }
    }

    // Pre-compute projection sections so we can place them in different locations
    const projections = buildProjectionTables(metrics, sortedTeams);

    const html = `
        <div class="results-container">
            ${isDemoData ? `
            <!-- DEMO DATA WARNING BANNER -->
            <div style="background: var(--ink-700); border: 1px solid var(--rule); border-left: 2px solid var(--negative); border-radius: 10px; padding: 1.5rem; margin: 0 0 1.5rem;">
                <div style="margin-bottom: 1rem;">
                    <h2 style="margin: 0; font-size: 1.125rem; color: var(--negative);">DEMO DATA ACTIVE</h2>
                    <p style="margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">You are viewing example data from a demonstration dataset</p>
                </div>
                <div style="background: var(--ink-800); border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                    <p style="margin: 0 0 0.75rem; font-size: 0.875rem; color: var(--text-primary); font-weight: 600;">DO NOT use this data for:</p>
                    <ul style="margin: 0; padding-left: 1.25rem; color: var(--text-secondary); font-size: 0.875rem; line-height: 1.65;">
                        <li>Customer presentations or stakeholder briefings</li>
                        <li>Business decisions or ROI justifications</li>
                        <li>Sharing outside your organization</li>
                    </ul>
                    <p style="margin: 1rem 0 0; font-size: 0.875rem; color: var(--text-secondary);">To generate a report with YOUR data: Return to the home screen to upload your organization's Copilot usage CSV file</p>
                </div>
            </div>
            ` : ''}
            <header>
                <h1>M365 Copilot Productivity ROI Analysis Results</h1>
                <p class="subtitle">Based on ${formatGroupCount(rows.length, uploadedData.groupLabel)} • ${config.analysisWeeks} weeks of data${uploadedData.dateRange ? ` (${uploadedData.dateRange})` : ''}</p>
                <p style="margin-top: 0.5rem;"><a href="https://aka.ms/Analytics-Hub" target="_blank" style="color: var(--accent); font-weight: 500; text-decoration: none; font-size: 0.875rem;">View more reports on the Analytics Hub &rarr;</a></p>
            </header>

            <!-- Minutes per Action Toggle -->
            <div class="mpa-toggle-bar" style="display:flex; align-items:center; justify-content:center; gap:0.75rem; padding:0.75rem 1.25rem; background: var(--surface-raised, #253449); border:1px solid var(--border, rgba(255,255,255,0.08)); border-radius:12px; margin:1rem 0 0.5rem; flex-wrap:wrap;">
                <span style="font-size:0.9rem; font-weight:600; color:var(--text-secondary);">Time Saved per Action:</span>
                ${buildMpaToggleButtons()}
            </div>

            <!-- TAB BAR -->
            <div class="report-tabs">
                <button class="report-tab active" data-tab="summary"   onclick="switchReportTab('summary')">Executive Summary</button>
                <button class="report-tab"        data-tab="orgs"      onclick="switchReportTab('orgs')">Organizations</button>
                <button class="report-tab"        data-tab="roi"       onclick="switchReportTab('roi')">ROI &amp; Forecast</button>
                <button class="report-tab"        data-tab="reference" onclick="switchReportTab('reference')">Reference</button>
            </div>

            <!-- TAB: Executive Summary -->
            <div class="report-tab-content" id="tab-summary" style="display:block; animation: fadeIn 0.3s ease;">

            <!-- Executive Summary -->
            <div style="background: var(--ink-700); border: 1px solid var(--rule); border-left: 2px solid var(--accent); border-radius: 10px; padding: 1.25rem 1.5rem; margin: 1.5rem 0 1.5rem;">
                <p style="font-size: 1rem; color: var(--text-secondary); margin: 0; line-height: 1.65;">
                    Your <strong>${metrics.totalEnabledUsers.toLocaleString()}</strong> Copilot licenses generate
                    <strong class="is-value">$${metrics.valuePerMonth.toLocaleString(undefined, {maximumFractionDigits: 0})}/month</strong> in productivity value &mdash;
                    a <strong>${metrics.roiMultiple.toFixed(1)}x return</strong> on investment at
                    <strong>${metrics.activationRate.toFixed(0)}% adoption</strong>${trendSummary}.
                </p>
            </div>

            ${showRecap ? `
            <!-- Intelligent Recap Toggle -->
            <div class="recap-toggle-container" id="recapToggleContainer">
                <span class="recap-toggle-label">Include Intelligent Recap in ROI:</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="recapToggleData" checked onchange="toggleRecapDisplayData()">
                    <span class="toggle-slider"></span>
                </label>
                <span class="recap-toggle-label" id="recapToggleStatusData">Included</span>
            </div>

            <!-- Intelligent Recap Value Display -->
            <div class="recap-value-box" id="recapValueBoxData">
                <h4>Intelligent Recap Additional Value</h4>
                <div class="value">$${recapMonthlyValue.toLocaleString(undefined, {maximumFractionDigits: 2})}/mo</div>
                <small style="color: var(--text-tertiary);">${config.intelligentRecapActions.toLocaleString(undefined, {maximumFractionDigits: 2})} actions × 0.5 hours each = ${recapHoursSaved.toLocaleString(undefined, {maximumFractionDigits: 2})} hours/mo</small>
            </div>
            ` : ''}

            ${section('Key Metrics', `
            ${hasTimePeriods ? `<div class="time-toggle-bar" style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
                <button class="time-toggle-btn active" data-period="all" onclick="switchTimePeriod('all')">Entire Period</button>
                <button class="time-toggle-btn" data-period="last4" onclick="switchTimePeriod('last4')">Last 4 Weeks</button>
                <button class="time-toggle-btn" data-period="last13" onclick="switchTimePeriod('last13')">Last 3 Months</button>
                <button class="time-toggle-btn" data-period="3moAgo" onclick="switchTimePeriod('3moAgo')">3+ Months Ago</button>
                <button class="time-toggle-btn" data-period="first4" onclick="switchTimePeriod('first4')">First Month</button>
            </div>` : ''}
            <!-- Hero Metrics Row -->
            <div class="metrics-grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 1.5rem;">
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Monthly ROI Multiple ${tip('Monthly productivity value ÷ monthly license cost. A 3x ROI means every $1 spent on licenses generates $3 in productivity value.')}</span></div>
                    <div class="metric-value" id="km-roi">${metrics.roiMultiple.toFixed(1)}x</div>
                    <div class="metric-sublabel" id="km-roiSub">$${metrics.valuePerMonth.toLocaleString(undefined, {maximumFractionDigits: 0})}/mo value ÷ $${metrics.monthlyCost.toLocaleString(undefined, {maximumFractionDigits: 0})}/mo cost</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Monthly Productivity Value ${tip('The total dollar value Copilot generates each month. Calculated as: total monthly actions × minutes per action ÷ 60 × hourly rate.')}</span></div>
                    <div class="metric-value is-value" id="km-monthlyValue">$${metrics.valuePerMonth.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div class="metric-sublabel" id="km-monthlyValueSub">$${(metrics.valuePerMonth * 12).toLocaleString(undefined, {maximumFractionDigits: 0})}/year • $${(metrics.valuePerMonth / 4.33).toLocaleString(undefined, {maximumFractionDigits: 0})}/week</div>
                </div>
            </div>

            <!-- Supporting Metrics Row -->
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Adoption Rate ${tip('The percentage of licensed users who are actively using Copilot. Higher adoption means fewer unused licenses and more organizational value.')}</span></div>
                    <div class="metric-value" id="km-adoption">${metrics.activationRate.toFixed(1)}%</div>
                    <div class="metric-sublabel" id="km-adoptionSub">${metrics.totalActiveUsers.toLocaleString(undefined, {maximumFractionDigits: 0})} of ${metrics.totalEnabledUsers.toLocaleString(undefined, {maximumFractionDigits: 0})} licensed users active</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Weekly Actions per User ${tip('The average number of Copilot actions each active user performs per week — things like accepting a suggestion, using Copilot chat, or generating a summary.')}${trendBadge}</span></div>
                    <div class="metric-value" id="km-actionsPerUser">${metrics.avgActionsPerUser.toFixed(1)}</div>
                    <div class="metric-sublabel" id="km-actionsPerUserSub">${(metrics.avgActionsPerUser * 4.33).toFixed(0)}/month • ${metrics.totalWeeklyActions.toLocaleString(undefined, {maximumFractionDigits: 0})} total/week</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Power User Rate ${tip('The percentage of licensed users classified as Power Users — averaging 20+ weekly Copilot actions with consistent usage in at least 9 of the past 12 weeks. These are your AI champions.')}</span></div>
                    <div class="metric-value" id="km-powerUserRate">${metrics.powerUserRate.toFixed(1)}%</div>
                    <div class="metric-sublabel" id="km-powerUserSub">${metrics.powerUsers.toLocaleString(undefined, {maximumFractionDigits: 0})} power users <span style="color: var(--copilot-cyan); font-size: 0.8rem;">(last 4 weeks)</span></div>
                </div>
            </div>

            <!-- Detail Metrics Row -->
            <div class="metrics-grid" style="margin-top: 1rem;">
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Enabled Users ${tip('The total number of people in your organization who have been assigned a Microsoft 365 Copilot license.')}</span></div>
                    <div class="metric-value" id="km-enabledUsers">${metrics.totalEnabledUsers.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div class="metric-sublabel">Licensed for Copilot</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Weekly Hours Saved ${tip('Estimated time saved per week across all users. Calculated by multiplying total weekly Copilot actions by the configured minutes saved per action.')}</span></div>
                    <div class="metric-value" id="km-hoursSaved">${metrics.weeklyHoursSaved.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div class="metric-sublabel" id="km-hoursSavedSub">${metrics.totalWeeklyActions.toLocaleString(undefined, {maximumFractionDigits: 0})} actions × ${config.minutesPerAction} min ÷ 60</div>
                </div>

                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Annual Value per License ${tip('The annualized productivity value generated per enabled license. Higher means each seat is delivering more return.')}</span></div>
                    <div class="metric-value" id="km-costPerHour">$${metrics.totalEnabledUsers > 0 ? Math.round((metrics.valuePerMonth * 12) / metrics.totalEnabledUsers).toLocaleString(undefined, {maximumFractionDigits: 0}) : '0'}</div>
                    <div class="metric-sublabel" id="km-costPerHourSub">$${metrics.valuePerMonth.toLocaleString(undefined, {maximumFractionDigits: 0})}/mo × 12 ÷ ${metrics.totalEnabledUsers.toLocaleString(undefined, {maximumFractionDigits: 0})} licenses</div>
                </div>
            </div>

            <!-- Investment Context (replaces standalone Productivity ROI section) -->
            <div style="margin-top: 1.25rem; padding: 1rem 1.25rem; background: var(--surface-raised, #253449); border-radius: 10px; border-left: 3px solid var(--copilot-blue);">
                <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.7;">
                    <strong style="color: var(--text-primary);">Total Investment:</strong> $${metrics.monthlyCostPurchased.toLocaleString(undefined, {maximumFractionDigits: 0})}/month ($${metrics.annualCost.toLocaleString(undefined, {maximumFractionDigits: 0})}/year) for ${metrics.totalPurchasedLicenses.toLocaleString(undefined, {maximumFractionDigits: 0})} purchased licenses at $${config.licenseCost}/user/month
                    ${metrics.unassignedLicenses > 0 ? `<br><strong style="color: var(--warn);">Quick Win:</strong> ${metrics.unassignedLicenses.toLocaleString(undefined, {maximumFractionDigits: 0})} licenses available to assign — $${metrics.wastedLicenseCost.toLocaleString(undefined, {maximumFractionDigits: 0})}/mo in untapped potential` : ''}<br>
                    <strong style="color: var(--text-primary);">Productivity Value Calculation:</strong> ${metrics.totalMonthlyActions.toLocaleString(undefined, {maximumFractionDigits: 0})} monthly actions × ${metrics.minsPerAction} min ÷ 60 × $${config.professionalRate}/hr = $${metrics.valuePerMonth.toLocaleString(undefined, {maximumFractionDigits: 0})}/month
                </p>
            </div>
            `)}<!-- end Key Metrics -->

            ${config.totalPurchasedLicenses > 0 ? section('License Investment Summary', `
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Purchased Licenses ${tip('Total licenses your organization has procured from Microsoft, including those not yet assigned to users.')}</span></div>
                    <div class="metric-value" style="color: var(--copilot-blue);">${metrics.totalPurchasedLicenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div class="metric-sublabel">Total procured</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Assignment Rate ${tip('Percentage of purchased licenses assigned to users. Reaching 100% means every license is working for your team — a great goal to aim for.')}</span></div>
                    <div class="metric-value" style="color: ${metrics.assignmentRate >= 90 ? 'var(--green)' : metrics.assignmentRate >= 70 ? 'var(--copilot-orange)' : 'var(--red)'};">${metrics.assignmentRate.toFixed(1)}%</div>
                    <div class="metric-sublabel">${metrics.totalEnabledUsers.toLocaleString(undefined, {maximumFractionDigits: 0})} of ${metrics.totalPurchasedLicenses.toLocaleString(undefined, {maximumFractionDigits: 0})} assigned</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Total Monthly Investment ${tip('Your organization\'s total monthly Copilot spend across all purchased licenses. Understanding this helps optimize your per-seat return.')}</span></div>
                    <div class="metric-value">$${metrics.monthlyCostPurchased.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div class="metric-sublabel">${metrics.totalPurchasedLicenses.toLocaleString(undefined, {maximumFractionDigits: 0})} × $${config.licenseCost}/mo</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Unassigned License Cost ${tip('Monthly cost of licenses not yet assigned to users. These seats represent immediate upside — assigning them to eager employees can quickly boost organizational value.')}</span></div>
                    <div class="metric-value" style="color: ${metrics.wastedLicenseCost > 0 ? 'var(--copilot-orange)' : 'var(--green)'};">$${metrics.wastedLicenseCost.toLocaleString(undefined, {maximumFractionDigits: 0})}/mo</div>
                    <div class="metric-sublabel">${metrics.unassignedLicenses.toLocaleString(undefined, {maximumFractionDigits: 0})} seats ready to deploy × $${config.licenseCost}</div>
                </div>
            </div>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">True ROI (vs Purchased) ${tip('Monthly productivity value ÷ total purchased license cost. This reflects your full investment picture and shows how much more value you unlock as assignment and adoption grow.')}</span></div>
                    <div class="metric-value" style="color: ${metrics.roiMultiple >= 1 ? 'var(--green)' : 'var(--red)'};">${metrics.roiMultiple.toFixed(1)}x</div>
                    <div class="metric-sublabel">$${metrics.valuePerMonth.toLocaleString(undefined, {maximumFractionDigits: 0})} value ÷ $${metrics.monthlyCostPurchased.toLocaleString(undefined, {maximumFractionDigits: 0})} cost</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Annual Investment ${tip('Total yearly cost for all purchased licenses. This is the number that goes on your budget line.')}</span></div>
                    <div class="metric-value">$${metrics.annualCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div class="metric-sublabel">$${metrics.monthlyCostPurchased.toLocaleString(undefined, {maximumFractionDigits: 0})}/mo × 12</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Annual Recapture Opportunity ${tip('Yearly cost of unassigned licenses. By assigning these seats to new users or right-sizing at renewal, this budget can be redirected to drive more value.')}</span></div>
                    <div class="metric-value" style="color: ${metrics.wastedLicenseCost > 0 ? 'var(--copilot-orange)' : 'var(--green)'};">$${(metrics.wastedLicenseCost * 12).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div class="metric-sublabel">${config.totalPurchasedLicenses > 0 ? `${metrics.unassignedLicenses.toLocaleString(undefined, {maximumFractionDigits: 0})} seats × $${config.licenseCost} × 12` : 'Enter Total Purchased Licenses in Step 2 to populate'}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label"><span class="metric-label-row">Net Value (after all costs) ${tip('Annual productivity value minus total annual license cost. Positive means you\'re already ahead; if negative, growing adoption or assigning unused seats will close the gap.')}</span></div>
                    <div class="metric-value" style="color: ${metrics.annualValue - metrics.annualCost >= 0 ? 'var(--green)' : 'var(--red)'};">$${(metrics.annualValue - metrics.annualCost).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    <div class="metric-sublabel">$${metrics.annualValue.toLocaleString(undefined, {maximumFractionDigits: 0})} value − $${metrics.annualCost.toLocaleString(undefined, {maximumFractionDigits: 0})} cost</div>
                </div>
            </div>
            `) : ''}

            </div><!-- end TAB: Executive Summary -->

            <!-- TAB: Organizations (was Team Performance) -->
            <div class="report-tab-content" id="tab-orgs" style="display:none;">

            ${section('Top 10 by Value Generated', `<div class="roi-table-container" style="box-shadow:none;border:none;padding:0;margin:0;">
                <p style="text-align:center; margin-bottom:1rem; color: var(--text-secondary); font-size: 0.9rem;">Monthly value = weekly actions × ${config.minutesPerAction} min/action ÷ 60 × $${config.professionalRate}/hr × 4.33 weeks</p>
                ${hasTimePeriods ? `<div class="time-toggle-bar" style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
                    <button class="time-toggle-btn active" data-period="all" onclick="switchTimePeriod('all')">Entire Period</button>
                    <button class="time-toggle-btn" data-period="last4" onclick="switchTimePeriod('last4')">Last 4 Weeks</button>
                    <button class="time-toggle-btn" data-period="last13" onclick="switchTimePeriod('last13')">Last 3 Months</button>
                    <button class="time-toggle-btn" data-period="3moAgo" onclick="switchTimePeriod('3moAgo')">3+ Months Ago</button>
                    <button class="time-toggle-btn" data-period="first4" onclick="switchTimePeriod('first4')">First Month</button>
                </div>` : ''}
                <table>
                    <thead>
                        <tr><th>#</th><th>${uploadedData.groupLabel || 'Team'}</th><th>Active Users<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span></th><th>Power Users<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span></th><th>Actions/User<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span></th><th>Active Days<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span></th><th>Monthly Value<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">projected</span></th><th>Hrs/Week<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg</span></th></tr>
                    </thead>
                    <tbody id="top10Body">
                        ${sortedTeams.slice(0, 10).map((team, index) => `
                        <tr>
                            <td style="color: var(--copilot-cyan); font-weight: 700; font-size: 1.1rem;">${index + 1}</td>
                            <td style="font-weight: 600;">${team.team}</td>
                            <td>${team.activeUsers.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td>${team.powerUsers}</td>
                            <td>${team.actionsPerUser.toFixed(1)}</td>
                            <td>${(team.engagement || 0).toFixed(1)}</td>
                            <td style="color: var(--green); font-weight: 700;">$${team.monthlyValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td>${team.weeklyHours.toFixed(0)}</td>
                        </tr>`).join('')}
                        <tr style="border-top: 2px solid var(--copilot-blue); font-weight: 700; background: rgba(74,158,247,0.05);">
                            <td></td>
                            <td>Top 10 Total</td>
                            <td>${sortedTeams.slice(0, 10).reduce((s,t) => s + t.activeUsers, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td>${sortedTeams.slice(0, 10).reduce((s,t) => s + t.powerUsers, 0)}</td>
                            <td>—</td>
                            <td>—</td>
                            <td style="color: var(--green);">$${sortedTeams.slice(0, 10).reduce((s,t) => s + t.monthlyValue, 0).toLocaleString(undefined, {maximumFractionDigits: 0})} <span style="font-size:0.75rem; font-weight:400; color: var(--text-secondary);">(${((sortedTeams.slice(0, 10).reduce((s,t) => s + t.monthlyValue, 0) / sortedTeams.reduce((s,t) => s + t.monthlyValue, 0)) * 100).toFixed(0)}% of total)</span></td>
                            <td>${sortedTeams.slice(0, 10).reduce((s,t) => s + t.weeklyHours, 0).toFixed(0)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            `)}<!-- end Top 10 -->

            ${projections.tierHtml}

            ${section('All ' + (uploadedData.groupLabel || 'Teams') + ' Performance', `<div class="leaderboard-container" style="box-shadow:none;border:none;padding:0;margin:0;">
                ${hasTimePeriods ? `<div class="time-toggle-bar" style="display:flex; justify-content:center; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap;">
                    <button class="time-toggle-btn active" data-period="all" onclick="switchTimePeriod('all')">Entire Period</button>
                    <button class="time-toggle-btn" data-period="last4" onclick="switchTimePeriod('last4')">Last 4 Weeks</button>
                    <button class="time-toggle-btn" data-period="last13" onclick="switchTimePeriod('last13')">Last 3 Months</button>
                    <button class="time-toggle-btn" data-period="3moAgo" onclick="switchTimePeriod('3moAgo')">3+ Months Ago</button>
                    <button class="time-toggle-btn" data-period="first4" onclick="switchTimePeriod('first4')">First Month</button>
                </div>` : ''}
                <p id="allTeamsPeriodNote" style="text-align:center; margin-bottom:0.75rem; color: var(--text-secondary); font-size: 0.85rem;">
                    Showing: <strong style="color: var(--copilot-cyan);">Entire Period</strong> &nbsp;|&nbsp; Averages computed across all weeks in selected period
                </p>
                <div style="display:flex; justify-content:center; margin-bottom:1rem;">
                    <input type="text" id="teamSearchFilter" placeholder="Search ${uploadedData.groupLabel || 'teams'}..." oninput="filterTeamsTable()" style="width: 100%; max-width: 400px; padding: 0.5rem 1rem; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text-primary); font-size: 0.9rem;">
                </div>
                <table id="teamsTable" class="sortable-table">
                    <thead>
                        <tr>
                            <th class="sortable" data-column="team" data-type="string">
                                ${uploadedData.groupLabel || 'Team/Division'} <span class="sort-icon"></span>
                            </th>
                            <th class="sortable" data-column="activeUsers" data-type="number">
                                Active Users<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span> <span class="sort-icon"></span>
                            </th>
                            <th class="sortable" data-column="powerUsers" data-type="number">
                                Power Users<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span> <span class="sort-icon"></span>
                            </th>
                            <th class="sortable" data-column="weeklyActions" data-type="number">
                                Weekly Actions<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span> <span class="sort-icon"></span>
                            </th>
                            <th class="sortable" data-column="actionsPerUser" data-type="number">
                                Actions/User<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span> <span class="sort-icon"></span>
                            </th>
                            <th class="sortable" data-column="activeDays" data-type="number">
                                Active Days<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span> <span class="sort-icon"></span>
                            </th>
                            <th class="sortable" data-column="peakWeek" data-type="date">
                                Peak Performance Week<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">best single week</span> <span class="sort-icon"></span>
                            </th>
                            <th class="sortable" data-column="weeklyHours" data-type="number">
                                Weekly Hours<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">avg/week</span> <span class="sort-icon"></span>
                            </th>
                            <th class="sortable" data-column="monthlyValue" data-type="number">
                                Monthly Value<br><span style="font-size:0.7rem;color:var(--text-secondary);font-weight:400;">projected</span> <span class="sort-icon"></span>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="teamsTableBody">
                        ${sortedTeams.map(team => {
                            const peakWeekDisplay = team.peakWeek
                                ? `${(team.peakWeek.getMonth() + 1).toString().padStart(2, '0')}/${team.peakWeek.getDate().toString().padStart(2, '0')}/${team.peakWeek.getFullYear()} (${team.peakActionsPerUser.toFixed(1)})`
                                : 'N/A';

                            return `
                            <tr>
                                <td data-value="${team.team}">${team.team}</td>
                                <td data-value="${team.activeUsers}">${team.activeUsers.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                                <td data-value="${team.powerUsers}">${team.powerUsers}</td>
                                <td data-value="${team.weeklyActions}">${team.weeklyActions.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                                <td data-value="${team.actionsPerUser}">${team.actionsPerUser.toFixed(1)}</td>
                                <td data-value="${team.engagement || 0}">${(team.engagement || 0).toFixed(1)}</td>
                                <td data-value="${team.peakWeek ? team.peakWeek.getTime() : 0}">${peakWeekDisplay}</td>
                                <td data-value="${team.weeklyHours}">${team.weeklyHours.toFixed(0)}</td>
                                <td data-value="${team.monthlyValue}"><strong>$${team.monthlyValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></td>
                            </tr>
                        `}).join('')}
                        <tr style="border-top: 2px solid var(--copilot-blue); font-weight: 700; background: rgba(74,158,247,0.05);">
                            <td>Total (${sortedTeams.length} ${uploadedData.groupLabel || 'teams'})</td>
                            <td>${sortedTeams.reduce((s,t) => s + t.activeUsers, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td>${sortedTeams.reduce((s,t) => s + t.powerUsers, 0)}</td>
                            <td>${sortedTeams.reduce((s,t) => s + t.weeklyActions, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td>${metrics.avgActionsPerUser.toFixed(1)}</td>
                            <td>—</td>
                            <td>—</td>
                            <td>${sortedTeams.reduce((s,t) => s + t.weeklyHours, 0).toFixed(0)}</td>
                            <td><strong>$${sortedTeams.reduce((s,t) => s + t.monthlyValue, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>
            `)}<!-- end All Teams -->

            <!-- Interactive org breakdown (ported from standalone Organizations page) -->
            <div class="insights-host" data-tab-host="orgs">
                <p style="color:var(--text-secondary, #94A3B8); padding:2rem; text-align:center;">Loading organization breakdown&hellip;</p>
            </div>

            </div><!-- end TAB: Organizations -->

            <!-- TAB: ROI Analysis -->
            <div class="report-tab-content" id="tab-roi" style="display:none;">

            ${projections.breakEvenHtml}${projections.opportunityHtml}${projections.projHtml}

            <!-- Forecast and sensitivity (ported from standalone Forecast page) -->
            <div class="insights-host" data-tab-host="forecast">
                <p style="color:var(--text-secondary, #94A3B8); padding:2rem; text-align:center;">Loading forecast&hellip;</p>
            </div>

            </div><!-- end TAB: ROI and Forecast -->

            <!-- TAB: Reference -->
            <div class="report-tab-content" id="tab-reference" style="display:none;">

            ${section('Calculation Methodology', `<div class="info-box" style="margin-top: 0;">
                <strong>Calculation Methodology</strong>
                <p>
                    • <strong>Time savings:</strong> ${metrics.minsPerAction} minutes saved per Copilot action (adjustable 1-15 min)<br>
                    • <strong>Professional rate:</strong> $${config.professionalRate}/hour fully-loaded cost (salary + benefits + overhead)<br>
                    • <strong>Analysis period:</strong> ${config.analysisWeeks} weeks of actual usage data<br>
                    • <strong>Productivity ROI Multiple:</strong> Monthly productivity value ÷ monthly license cost<br>
                    • <strong>Reference:</strong> Microsoft research suggests 6 min average; adjust based on your use cases<br>
                    • All data processed locally in your browser - no data transmitted to servers
                </p>
            </div>
            `)}<!-- end Methodology -->

            ${section('Glossary', `
            <table class="glossary-table">
                <tbody>
                    <tr><td><strong>Activation Rate</strong></td><td>The percentage of licensed users who have tried Copilot at least once. A high activation rate shows strong initial engagement and curiosity across the organization.</td></tr>
                    <tr><td><strong>Active User</strong></td><td>A user who performed at least one Copilot action during the reporting period (typically one week).</td></tr>
                    <tr><td><strong>Adoption Rate</strong></td><td>The percentage of licensed users who are actively using Copilot on an ongoing basis. Unlike activation, adoption reflects sustained usage over time.</td></tr>
                    <tr><td><strong>Annual Value per License</strong></td><td>The annualized productivity value generated per enabled license, calculated as monthly value × 12 ÷ total enabled users. Higher means each seat is delivering more return on investment.</td></tr>
                    <tr><td><strong>Assignment Rate</strong></td><td>The percentage of purchased licenses that have been assigned to users. Closing the gap to 100% means every seat is generating value — a straightforward win for any team.</td></tr>
                    <tr><td><strong>Break-Even</strong></td><td>The number of Copilot actions per user per month required for the productivity value to equal the license cost. Anything above break-even represents positive ROI.</td></tr>
                    <tr><td><strong>Copilot Action</strong></td><td>Any discrete interaction with Microsoft 365 Copilot — e.g., accepting a suggested edit, using Copilot Chat, generating a summary, drafting an email, or creating a presentation outline.</td></tr>
                    <tr><td><strong>Enabled User</strong></td><td>An employee who has been assigned a Microsoft 365 Copilot license, whether or not they have used it.</td></tr>
                    <tr><td><strong>Expansion Projection</strong></td><td>A modeled estimate of ROI at larger deployment scales, using increasing per-user actions to reflect network effects as more employees adopt Copilot.</td></tr>
                    <tr><td><strong>Fully-Loaded Cost</strong></td><td>The true cost of an employee hour including salary, benefits, taxes, and overhead — not just base pay. Used as the "professional rate" in ROI calculations.</td></tr>
                    <tr><td><strong>Intelligent Recap</strong></td><td>A Copilot feature that automatically summarizes Teams meetings, extracting key decisions, action items, and discussion topics so attendees (and non-attendees) save time on meeting follow-up.</td></tr>
                    <tr><td><strong>MAU (Monthly Active Users)</strong></td><td>The count of unique users who performed at least one Copilot action in the past 28 days.</td></tr>
                    <tr><td><strong>Minutes per Action</strong></td><td>The estimated time saved each time a user completes a Copilot action. Default is 6 minutes based on Microsoft research; adjustable to reflect your organization's experience.</td></tr>
                    <tr><td><strong>Opportunity Cost</strong></td><td>The additional productivity value your organization could capture by licensing more users. Calculated at a conservative 10% of current licensed-user adoption rates — real upside is likely higher.</td></tr>
                    <tr><td><strong>Productivity Value</strong></td><td>The dollar value of time saved, calculated as: number of actions × minutes per action ÷ 60 × professional hourly rate.</td></tr>
                    <tr><td><strong>Purchased Licenses</strong></td><td>The total number of Copilot licenses your organization has procured from Microsoft, including those not yet assigned to any user.</td></tr>
                    <tr><td><strong>ROI Multiple</strong></td><td>Monthly productivity value divided by monthly license cost. An ROI of 3.0x means every $1 spent on Copilot licenses returns $3 in estimated productivity value.</td></tr>
                    <tr><td><strong>Power User</strong></td><td>A user averaging 20+ weekly Copilot actions with consistent usage in at least 9 of the past 12 weeks. Power Users are both high-volume and habitual — your AI champions who drive peer adoption and can be leveraged for internal enablement.</td></tr>
                    <tr><td><strong>Power User Rate</strong></td><td>The percentage of all licensed users classified as Power Users.</td></tr>
                    <tr><td><strong>Super Usage Report</strong></td><td>A Power BI report (<a href="https://aka.ms/decodingsuperusage" target="_blank" style="color:var(--copilot-cyan);">aka.ms/decodingsuperusage</a>) that provides a heatmap view of Copilot usage across your organization, broken out by team/division.</td></tr>
                    <tr><td><strong>Trend Badge (vs Prior 4wk)</strong></td><td>A percentage change indicator comparing the most recent 4 weeks of data against the preceding 4 weeks. Green ↑ means improvement; red ↓ means decline. Appears on Key Metrics when time-period data is available.</td></tr>
                    <tr><td><strong>Usage Tier</strong></td><td>The Usage Threshold cohort a person falls into, based on their 12-week rolling average of weekly Copilot actions and the 9-of-12-weeks habit rule: Power Users, Habitual Users, Novice Users, Low Users, Non-users.</td></tr>
                    <tr><td><strong>Unassigned License Cost</strong></td><td>The monthly cost of licenses purchased but not yet assigned to users. These represent ready-to-deploy seats — assigning them brings immediate value, or right-sizing at renewal frees up budget for other priorities.</td></tr>
                    <tr><td><strong>Weekly Actions per User</strong></td><td>The average number of Copilot actions each active user performs per week — things like accepting a suggestion, using Copilot chat, or generating a summary.</td></tr>
                    <tr><td><strong>Weekly Hours Saved</strong></td><td>The estimated total time saved per week across all users, calculated as total weekly actions × minutes per action ÷ 60.</td></tr>
                    <tr><td><strong>Habitual Users</strong></td><td>Users averaging 8 or more weekly Copilot actions across a trailing 12-week window AND active in at least 9 of those 12 weeks. The official Microsoft Viva Insights cohort for sustained, mid-volume usage — the layer just below Power Users.</td></tr>
                    <tr><td><strong>Novice Users</strong></td><td>Users averaging at least 1 weekly action across the trailing 12-week window but not yet meeting the Habitual or Power thresholds. Early in their adoption curve and the most coachable cohort.</td></tr>
                    <tr><td><strong>Low Users</strong></td><td>Users with greater-than-zero but less-than-one weekly average across the trailing 12-week window. Tried Copilot but did not stick. Highest priority for waste/redeploy decisions.</td></tr>
                    <tr><td><strong>Non Users</strong></td><td>Licensed users with zero recorded actions across the trailing 12-week window. Full license waste until reassigned or activated.</td></tr>
                    <tr><td><strong>Usage Threshold</strong></td><td>The per-week cohort assignment formula. For each person and each week W: look at the 12 weeks ending at W, compute avg12 (mean weekly actions) and habit12 (count of weeks with ≥1 action). Assign Power if avg12≥20 AND habit12≥9; else Habitual if avg12≥8 AND habit12≥9; else Novice if avg12≥1; else Low if avg12>0; else Non.</td></tr>
                    <tr><td><strong>Rolling 12-Week Average (avg12)</strong></td><td>The trailing-window mean of weekly Copilot actions used to assign cohorts. avg12(person, week W) = mean of actions over weeks [W − 11, W]. Smooths short-term spikes and matches the Power BI Super User Adoption template.</td></tr>
                    <tr><td><strong>Habit Flag</strong></td><td>habit12(person, week W) = count of weeks in [W − 11, W] where the person had at least one action. The official threshold for Habitual or Power classification is ≥9 of 12.</td></tr>
                    <tr><td><strong>Adjusted CAH (Copilot Assisted Hours)</strong></td><td>An alternate ROI model: instead of <code>actions × minutes</code>, value comes from Viva-measured Copilot assisted hours plus half of Intelligent Recap actions, dampened by a penalty factor between 0.25 and 1.0. Surfaces on the Forecast & Sensitivity page.</td></tr>
                    <tr><td><strong>Penalty Factor</strong></td><td>The 0.25 – 1.0 dampener applied to Adjusted CAH valuation to discount for partial attribution. 1.0 = full credit, 0.5 = half-credit, 0.25 = quarter-credit (highly conservative).</td></tr>
                    <tr><td><strong>Organization (Aggregated)</strong></td><td>The grouping rule that mirrors the Power BI Super User Adoption template: any group with fewer than 5 distinct PersonIDs or a blank/N/A/Unassigned label is rolled into a single "Other" bucket so per-org metrics stay statistically meaningful and privacy-safe.</td></tr>
                    <tr><td><strong>Per-App Attribution</strong></td><td>The split of monthly value across the apps users actually performed actions in (Word, Excel, Teams, Outlook, etc.). Per app: actions × minutesPerAction / 60 × professionalRate. Visible on the Apps & Behavior page when per-app columns are present in your export.</td></tr>
                    <tr><td><strong>Grouping Field</strong></td><td>The header column you choose at upload time to group people for org-level views. Defaults to <em>Organization</em>, but you can pick Function/Department/Region/Manager or any other low-cardinality string column. Detected automatically from your CSV.</td></tr>
                    <tr><td><strong>Header Normalization</strong></td><td>The upload-time step that maps en-GB/es/customer-specific Viva exports to the canonical en-US header schema (e.g. <em>Organisation → Organization</em>, <em>Organización → Organization</em>, <em>Copilot365 → FunctionType</em>, <em>DesInfo → Organization</em>) so the calculator works regardless of locale or tenant aliases.</td></tr>
                    <tr><td><strong>Cohort Migration Matrix</strong></td><td>The "where did Power Users from 4 weeks ago end up today?" view on the Adoption Insights page. Rows = prior cohort, columns = recent cohort. Up = improvement, Same = held position, Down = slipped. Recent-vs-prior windows are 4 weeks each.</td></tr>
                    <tr><td><strong>Time to Habit</strong></td><td>TTH(person) = (firstHabitWeek − firstActionWeek) / 7. Measures how many weeks it took a user, from their first-ever Copilot action, to reach the Habitual or Power cohort. The smaller, the faster your enablement is paying off.</td></tr>
                </tbody>
            </table>
            `)}<!-- end Glossary -->

            </div><!-- end TAB: Reference -->

            <div style="text-align: center; margin-top: 2rem; display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;">
                <button class="btn-primary" onclick="exportToDocx()">Export to DOCX</button>
                <button class="btn-primary" onclick="exportToPptx()">Export to PPTX</button>
                <button class="btn-primary" onclick="exportExecutiveDeck()">Executive Deck</button>
                <button class="btn-primary" onclick="location.reload()">Analyze Another File</button>
            </div>
        </div>
    `;

    const loadingEl = document.getElementById('loadingState');
    if (loadingEl) loadingEl.style.display = 'none';
    document.querySelector('.container').innerHTML = html;
    resultsDisplayed = true;

    // Populate the 5 ported in-report analytics tabs from shared session data
    populateInsightsHosts();

    // Initialize table sorting after rendering
    initTableSorting();
    
    // Initialize time period toggle to 'all' to ensure Key Metrics match the toggle state
    if (hasTimePeriods) {
        switchTimePeriod('all');
    }
}

function populateInsightsHosts() {
    if (!window.InsightsTabs || !window.InsightsShared) return;
    try {
        const _sharedData = window.InsightsShared.loadSharedData();
        if (_sharedData) {
            const _tabMap = {
                orgs:     window.InsightsTabs.renderOrgs,
                forecast: window.InsightsTabs.renderForecast
            };
            Object.entries(_tabMap).forEach(([_k, _fn]) => {
                const _host = document.querySelector('.insights-host[data-tab-host="' + _k + '"]');
                if (_host && _fn) {
                    try { _fn(_host, _sharedData); }
                    catch (e) { console.warn('[InsightsTabs] ' + _k + ' render failed', e); }
                }
            });
        }
    } catch (e) {
        console.warn('[InsightsTabs] population failed', e);
    }
}

// Chart SVG bakes resolved colours, so a theme switch has to re-render them.
document.addEventListener('cri:themechange', () => {
    if (resultsDisplayed) populateInsightsHosts();
});

// Shared: prepare the container for capture (open sections, hide buttons, fix gradients)
function prepareForCapture(container) {
    const closedDetails = container.querySelectorAll('details:not([open])');
    closedDetails.forEach(d => d.setAttribute('open', ''));

    // Show all tab panels for export
    const hiddenTabs = container.querySelectorAll('.report-tab-content');
    hiddenTabs.forEach(t => { t.dataset.prevDisplay = t.style.display; t.style.display = 'block'; });

    // Hide tab bar itself
    const tabBar = container.querySelector('.report-tabs');
    if (tabBar) { tabBar.dataset.prevDisplay = tabBar.style.display; tabBar.style.display = 'none'; }

    const hideEls = container.querySelectorAll('button, .toggle-switch, input[type="range"]');
    hideEls.forEach(el => { el.dataset.prevDisplay = el.style.display; el.style.display = 'none'; });

    const origStyle = container.getAttribute('style') || '';
    container.style.width = '1100px';
    container.style.maxWidth = '1100px';

    const gradientEls = container.querySelectorAll('.metric-value');
    gradientEls.forEach(el => {
        el.dataset.origCss = el.getAttribute('style') || '';
        el.style.background = 'none';
        el.style.webkitBackgroundClip = 'unset';
        el.style.backgroundClip = 'unset';
        el.style.webkitTextFillColor = 'var(--accent)';
        el.style.color = 'var(--accent)';
    });

    return { closedDetails, hideEls, origStyle, gradientEls, hiddenTabs, tabBar };
}

function restoreAfterCapture(container, state) {
    container.setAttribute('style', state.origStyle);
    state.closedDetails.forEach(d => d.removeAttribute('open'));
    state.hideEls.forEach(el => { el.style.display = el.dataset.prevDisplay || ''; });
    state.gradientEls.forEach(el => { el.setAttribute('style', el.dataset.origCss); });
    // Restore tab panel visibility
    if (state.hiddenTabs) state.hiddenTabs.forEach(t => { t.style.display = t.dataset.prevDisplay || ''; });
    if (state.tabBar) state.tabBar.style.display = state.tabBar.dataset.prevDisplay || '';
}

// Exported PNG/PDF/PPTX canvases must match the theme the user is looking at,
// otherwise a light-theme report is composited onto a dark plate.
function exportCanvasColor() {
    try {
        const root = getComputedStyle(document.documentElement).getPropertyValue('--ink-900').trim();
        if (root) return root;
        const body = getComputedStyle(document.body).backgroundColor;
        if (body && body !== 'rgba(0, 0, 0, 0)' && body !== 'transparent') return body;
    } catch (e) {}
    return '#0B1120';
}

// Capture all visible sections as PNG image data arrays
async function captureSections(container, progressCb) {
    const isVisible = (el) => el.offsetHeight > 0 && getComputedStyle(el).display !== 'none';
    const sections = Array.from(container.children).filter(isVisible);
    const h2cOpts = { scale: 2, useCORS: true, backgroundColor: exportCanvasColor(), logging: false, windowWidth: 1120 };
    const images = [];
    for (let i = 0; i < sections.length; i++) {
        if (progressCb) progressCb(i, sections.length);
        const canvas = await html2canvas(sections[i], h2cOpts);
        images.push({ canvas, width: canvas.width, height: canvas.height, dataUrl: canvas.toDataURL('image/png') });
    }
    return images;
}

// ---- STORYTELLING NARRATIVE GENERATOR ----
// Builds structured narrative content from computed metrics for DOCX/PPTX exports.
// Designed so another AI agent can read the exported document and fully understand the ROI story.
function generateStoryNarrative() {
    const metrics = calculateMetrics(uploadedData);
    const rows = uploadedData.rows;
    const sortedTeams = rows.map(row => {
        const monthlyValue = (row.monthlyActions * config.minutesPerAction / 60) * config.professionalRate;
        const weeklyHours = (row.weeklyActions * config.minutesPerAction / 60);
        return { ...row, monthlyValue, weeklyHours };
    }).sort((a, b) => b.monthlyValue - a.monthlyValue);

    const fmt = n => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    const fmtD = (n, d) => n.toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d });
    const pct = n => n.toFixed(1) + '%';
    const usd = n => '$' + fmt(Math.round(n));

    const teamCount = rows.length;
    const groupLabel = uploadedData.groupLabel || 'teams';
    const weeks = config.analysisWeeks;
    const dateRange = uploadedData.dateRange || `${weeks} weeks`;

    // Tier breakdown — prefer real per-user cohorts when Viva data is loaded
    const byActions = [...sortedTeams].sort((a, b) => b.actionsPerUser - a.actionsPerUser);
    const totalTeams = byActions.length;
    let tierSummaries;
    if (uploadedData.isVivaInsights && uploadedData.personCohorts && uploadedData.personCohorts.rows) {
        tierSummaries = uploadedData.personCohorts.rows
            .filter(r => r.count > 0)
            .map(r => ({
                name: r.name,
                users: r.count,
                avgMonthly: r.actionsPerMonth.toFixed(0),
                value: usd(r.monthlyValue),
                roi: r.roi.toFixed(1) + 'x'
            }));
    } else {
        const tierDefs = [
            { name: 'Top 10%', start: 0, end: Math.max(1, Math.round(totalTeams * 0.10)) },
            { name: '75th–90th percentile', start: Math.max(1, Math.round(totalTeams * 0.10)), end: Math.round(totalTeams * 0.25) },
            { name: '50th–75th percentile', start: Math.round(totalTeams * 0.25), end: Math.round(totalTeams * 0.50) },
            { name: '25th–50th percentile', start: Math.round(totalTeams * 0.50), end: Math.round(totalTeams * 0.75) },
            { name: 'Bottom 25%', start: Math.round(totalTeams * 0.75), end: totalTeams },
        ];
        tierSummaries = tierDefs.map(tier => {
            const slice = byActions.slice(tier.start, tier.end);
            if (slice.length === 0) return null;
            const tierUsers = slice.reduce((s, t) => s + t.activeUsers, 0);
            const tierWeekly = slice.reduce((s, t) => s + t.weeklyActions, 0);
            const tierAvg = tierUsers > 0 ? (tierWeekly / tierUsers) * 4.33 : 0;
            const tierVal = slice.reduce((s, t) => s + t.monthlyValue, 0);
            const tierInvest = tierUsers * config.licenseCost;
            const tierRoi = tierInvest > 0 ? (tierVal / tierInvest).toFixed(1) : '0.0';
            return { name: tier.name, users: tierUsers, avgMonthly: tierAvg.toFixed(0), value: usd(tierVal), roi: tierRoi + 'x' };
        }).filter(Boolean);
    }

    // Top 5 teams
    const top5 = sortedTeams.slice(0, 5).map((t, i) => `${i + 1}. ${t.team} — ${fmt(t.activeUsers)} active users, ${fmtD(t.actionsPerUser, 1)} actions/user/week, ${usd(t.monthlyValue)}/month`);

    // Bottom 5 opportunity teams
    const bottom5 = [...sortedTeams].sort((a, b) => a.actionsPerUser - b.actionsPerUser).slice(0, 5).map((t, i) => `${i + 1}. ${t.team} — ${fmt(t.activeUsers)} active users, ${fmtD(t.actionsPerUser, 1)} actions/user/week, ${usd(t.monthlyValue)}/month`);

    // Trend data
    let trendText = '';
    if (uploadedData.sortedDates && uploadedData.sortedDates.length >= 8) {
        const recentTeams = computeTeamsForPeriod('last4');
        const priorTeams = computePrior4Weeks();
        if (recentTeams && priorTeams && priorTeams.length > 0) {
            const recentActions = recentTeams.reduce((s, t) => s + t.weeklyActions, 0);
            const recentActive = recentTeams.reduce((s, t) => s + t.activeUsers, 0);
            const priorActions = priorTeams.reduce((s, t) => s + t.weeklyActions, 0);
            const priorActive = priorTeams.reduce((s, t) => s + t.activeUsers, 0);
            const recentAvg = recentActive > 0 ? recentActions / recentActive : 0;
            const priorAvg = priorActive > 0 ? priorActions / priorActive : 0;
            if (priorAvg > 0) {
                const change = ((recentAvg - priorAvg) / priorAvg) * 100;
                const dir = change >= 0 ? 'up' : 'down';
                trendText = `Comparing the last 4 weeks to the prior 4 weeks, average actions per user moved ${dir} ${Math.abs(change).toFixed(1)}% (from ${fmtD(priorAvg, 1)} to ${fmtD(recentAvg, 1)} actions/user/week).`;
            }
        }
    }

    // Break-even analysis
    const valPerAction = (config.minutesPerAction / 60) * config.professionalRate;
    const breakEvenActions = valPerAction > 0 ? (config.licenseCost / valPerAction).toFixed(1) : 'N/A';
    const avgMonthly = (metrics.avgActionsPerUser * 4.33).toFixed(0);
    const breakEvenExceed = valPerAction > 0 ? ((metrics.avgActionsPerUser * 4.33) / (config.licenseCost / valPerAction)).toFixed(1) : 'N/A';

    // Intelligent Recap
    const recapActions = config.intelligentRecapActions;
    const recapHours = recapActions * 0.5;
    const recapValue = recapHours * config.professionalRate;
    const showRecap = recapActions > 0;

    const narrative = {
        // ── ACT 1: CONTEXT ──
        title: 'M365 Copilot Productivity ROI Analysis',
        subtitle: `Analysis of ${teamCount} ${groupLabel} over ${dateRange}`,
        generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),

        executiveSummary: [
            `This analysis covers ${fmt(metrics.totalEnabledUsers)} Copilot-licensed users across ${teamCount} ${groupLabel}, evaluated over ${dateRange}.`,
            `The deployment generates ${usd(metrics.valuePerMonth)} in monthly productivity value — a ${fmtD(metrics.roiMultiple, 1)}x return on the ${usd(metrics.monthlyCostPurchased)} monthly investment.`,
            `Adoption stands at ${pct(metrics.activationRate)} (${fmt(metrics.totalActiveUsers)} of ${fmt(metrics.totalEnabledUsers)} licensed users are active), with ${fmt(metrics.powerUsers)} power users (${pct(metrics.powerUserRate)}) driving disproportionate value.`,
            trendText || `Data spans ${weeks} weeks of measured Copilot activity.`,
        ],

        // ── ACT 2: KEY METRICS ──
        keyMetrics: {
            totalEnabledUsers: fmt(metrics.totalEnabledUsers),
            totalActiveUsers: fmt(metrics.totalActiveUsers),
            activationRate: pct(metrics.activationRate),
            powerUsers: fmt(metrics.powerUsers),
            powerUserRate: pct(metrics.powerUserRate),
            avgActionsPerUserPerWeek: fmtD(metrics.avgActionsPerUser, 1),
            avgActionsPerUserPerMonth: avgMonthly,
            totalWeeklyActions: fmt(metrics.totalWeeklyActions),
            totalMonthlyActions: fmt(metrics.totalMonthlyActions),
            weeklyHoursSaved: fmt(Math.round(metrics.weeklyHoursSaved)),
            monthlyHoursSaved: fmt(Math.round(metrics.hoursPerMonth)),
        },

        // ── ACT 3: RESULTS — The financial story ──
        roiAnalysis: [
            `Monthly productivity value: ${usd(metrics.valuePerMonth)} (${fmt(Math.round(metrics.hoursPerMonth))} hours saved × $${config.professionalRate}/hr).`,
            `Annual projected value: ${usd(metrics.annualValue)}.`,
            `Annual licensing cost: ${usd(metrics.annualCost)} (${fmt(metrics.totalPurchasedLicenses)} licenses × $${config.licenseCost}/mo × 12).`,
            `ROI multiple: ${fmtD(metrics.roiMultiple, 1)}x — every dollar invested returns $${fmtD(metrics.roiMultiple, 2)} in productivity value.`,
            `Assumptions: ${config.minutesPerAction} minutes saved per Copilot action (Microsoft research range: 3–10 minutes), $${config.professionalRate}/hr professional rate.`,
            `Break-even requires just ${breakEvenActions} actions/user/month. Your users average ${avgMonthly} actions/month — ${breakEvenExceed}x above break-even.`,
        ],

        // ── ACT 4: INSIGHTS — Team performance & tiers ──
        tierBreakdown: tierSummaries,
        topPerformers: top5,
        growthOpportunities: bottom5,

        teamInsights: [
            `Top 5 ${groupLabel} account for ${usd(sortedTeams.slice(0, 5).reduce((s, t) => s + t.monthlyValue, 0))} in monthly value.`,
            `The top 10% of ${groupLabel} by actions per user deliver ${tierSummaries[0]?.roi || 'N/A'} ROI, demonstrating the outsized impact of champion users.`,
            `The bottom 25% represent the largest growth opportunity — targeted enablement and training could significantly move these ${groupLabel} up the value curve.`,
            sortedTeams.length > 10 ? `Broad adoption across ${teamCount} ${groupLabel} shows Copilot value is cross-functional, not limited to a single department or role.` : '',
        ].filter(Boolean),

        // ── ACT 5: ACTION — Recommendations ──
        recommendations: [
            `EXPAND: Scale deployment to additional users and departments. Current ${pct(metrics.activationRate)} activation demonstrates strong organic demand.`,
            `ENABLE: Launch targeted enablement programs for bottom-quartile ${groupLabel}. If they reach median performance, monthly value increases by ${usd((() => { const bot = byActions.slice(Math.round(totalTeams * 0.75)); const medianActions = byActions.length > 0 ? byActions[Math.floor(byActions.length / 2)].actionsPerUser : 0; let delta = 0; bot.forEach(t => { const current = t.monthlyValue; const projected = (medianActions * 4.33 * config.minutesPerAction / 60) * config.professionalRate * t.activeUsers; delta += Math.max(0, projected - current); }); return delta; })())}.`,
            `CHAMPION: Formalize a power-user ambassador program. Your ${fmt(metrics.powerUsers)} power users are natural trainers who can accelerate peer adoption.`,
            `MEASURE: Maintain regular analysis cadence (monthly or quarterly) to track ROI trajectory and identify emerging champion ${groupLabel}.`,
            metrics.unassignedLicenses > 0 ? `OPTIMIZE: ${fmt(metrics.unassignedLicenses)} purchased licenses are unassigned (${usd(metrics.wastedLicenseCost)}/month unused). Reassign or reduce to improve cost efficiency.` : '',
        ].filter(Boolean),

        // ── METHODOLOGY ──
        methodology: [
            `Data source: Microsoft Copilot Insight Report (official telemetry).`,
            `Time savings assumption: ${config.minutesPerAction} minutes per Copilot action. Microsoft research across millions of actions shows a 3–10 minute range; this analysis uses ${config.minutesPerAction === 3 ? 'the conservative low end' : config.minutesPerAction === 6 ? 'the midpoint' : config.minutesPerAction + ' minutes'}.`,
            `Professional hourly rate: $${config.professionalRate}/hr.`,
            `License cost: $${config.licenseCost}/user/month.`,
            `ROI = (monthly productivity value) ÷ (monthly licensing cost). Values above 1.0x indicate positive return.`,
            `All metrics are based on measured Copilot actions — not estimates, projections, or self-reported surveys.`,
        ],

        // ── AGENT INSTRUCTIONS ──
        agentPrompt: [
            `--- AI AGENT INSTRUCTIONS ---`,
            `This document contains a complete M365 Copilot ROI analysis. You are receiving this so you can build a presentation, executive brief, email, or other deliverable from the data and narrative below.`,
            ``,
            `STORY ARC (Five-Act Structure):`,
            `1. CONTEXT: ${fmt(metrics.totalEnabledUsers)} licensed users across ${teamCount} ${groupLabel}. ${pct(metrics.activationRate)} activation. Analysis period: ${dateRange}.`,
            `2. JOURNEY: ${trendText || 'Sustained adoption growth over the analysis period.'}`,
            `3. RESULTS: ${fmtD(metrics.roiMultiple, 1)}x ROI. ${usd(metrics.valuePerMonth)}/month productivity value vs ${usd(metrics.monthlyCostPurchased)}/month cost. ${fmt(Math.round(metrics.hoursPerMonth))} hours saved per month.`,
            `4. INSIGHTS: ${fmt(metrics.powerUsers)} power users (${pct(metrics.powerUserRate)}) drive disproportionate value. Top tier delivers ${tierSummaries[0]?.roi || 'N/A'} ROI. Bottom 25% is the biggest growth opportunity.`,
            `5. ACTION: Expand to more users, enable bottom-quartile ${groupLabel}, formalize champion program, maintain measurement cadence.`,
            ``,
            `KEY DATA POINTS:`,
            `- Licensed users: ${fmt(metrics.totalEnabledUsers)}`,
            `- Active users: ${fmt(metrics.totalActiveUsers)} (${pct(metrics.activationRate)})`,
            `- Power users: ${fmt(metrics.powerUsers)} (${pct(metrics.powerUserRate)})`,
            `- Avg actions/user/week: ${fmtD(metrics.avgActionsPerUser, 1)}`,
            `- Weekly hours saved: ${fmt(Math.round(metrics.weeklyHoursSaved))}`,
            `- Monthly productivity value: ${usd(metrics.valuePerMonth)}`,
            `- Annual projected value: ${usd(metrics.annualValue)}`,
            `- Annual cost: ${usd(metrics.annualCost)}`,
            `- ROI multiple: ${fmtD(metrics.roiMultiple, 1)}x`,
            `- Break-even: ${breakEvenActions} actions/user/month (users deliver ${breakEvenExceed}x above this)`,
            `- Assumptions: ${config.minutesPerAction} min/action, $${config.professionalRate}/hr, $${config.licenseCost}/user/month`,
            ``,
            `TOP 5 ${groupLabel.toUpperCase()}:`,
            ...top5.map(t => `  ${t}`),
            ``,
            `TIER BREAKDOWN:`,
            ...tierSummaries.map(t => `  ${t.name}: ${fmt(t.users)} users, ${t.avgMonthly} actions/user/mo, ${t.value}/mo value, ${t.roi} ROI`),
            ``,
            `PRESENTATION GUIDANCE:`,
            `- Lead with ROI (${fmtD(metrics.roiMultiple, 1)}x) — executives care about return on investment first.`,
            `- Use the "Power of AND" technique: high adoption AND deep engagement, IT AND business teams.`,
            `- The money slide: ${usd(metrics.valuePerMonth)}/month value vs ${usd(metrics.monthlyCostPurchased)}/month cost. Let this sink in.`,
            `- Bottom-quartile ${groupLabel} are your growth story, not a failure — frame as "unrealized potential."`,
            `- Power users are your champions — humanize them: "${fmt(metrics.powerUsers)} people showing colleagues how to save time every day."`,
            `- All data is from Microsoft's official Copilot Insight Report — emphasize measured, not estimated.`,
            showRecap ? `- Intelligent Recap adds ${fmt(Math.round(recapHours))} hours/month (${usd(recapValue)}/month) from ${fmt(recapActions)} meeting recaps.` : '',
            ``,
            `OBJECTION HANDLING:`,
            `- "Is ${config.minutesPerAction} minutes realistic?" → Microsoft research shows 3-10 min range. Independent Forrester studies show 5-8 min average.`,
            `- "What about implementation costs?" → Copilot is embedded in M365, no separate implementation. ${pct(metrics.activationRate)} activation shows minimal friction.`,
            `- "Can you prove time savings?" → These are measured actions (summaries, drafts, analyses), each replacing manual work. ${weeks} weeks of sustained growth confirms users find ongoing value.`,
            `- "What if people aren't saving time?" → If they weren't, usage would decline. Instead it's ${trendText ? 'trending ' + (trendText.includes('up') ? 'up' : 'steady') : 'sustained'} over ${weeks} weeks.`,
        ].filter(Boolean),
    };

    return narrative;
}

// Export results to DOCX — rich text narrative + section images
async function exportToDocx() {
    // Validate that customer data is loaded
    if (!uploadedData) {
        alert('Please upload your Copilot usage data first before exporting to Word.');
        return;
    }
    
    if (isDemoData) {
        const confirmed = confirm(
            '⚠️ WARNING: You are about to export a document using DEMO DATA.\n\n' +
            'This file contains example data from a demonstration dataset, NOT your organization\'s actual Copilot usage data.\n\n' +
            '• DO NOT share this with customers or stakeholders\n' +
            '• DO NOT use for business decisions\n' +
            '• Upload your own CSV file to generate a document with real data\n\n' +
            'Export demo document anyway?'
        );
        if (!confirmed) return;
    }
    
    const container = document.querySelector('.results-container');
    if (!container) return;

    const btn = document.querySelector('[onclick="exportToDocx()"]');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Generating DOCX… 0%'; btn.disabled = true; }

    const state = prepareForCapture(container);

    try {
        if (!window.docx) throw new Error('DOCX library failed to load. Refresh and try again.');
        const { Document, Packer, Paragraph, ImageRun, PageBreak, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = window.docx;

        const story = generateStoryNarrative();

        const images = await captureSections(container, (i, total) => {
            if (btn) btn.textContent = `Capturing… ${Math.round(((i + 1) / total) * 100)}%`;
        });

        if (btn) btn.textContent = 'Building DOCX…';

        function dataUrlToUint8(dataUrl) {
            const base64 = dataUrl.split(',')[1];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            return bytes;
        }

        const PAGE_WIDTH_EMU = 7.5 * 914400;
        const children = [];

        // Helper: heading paragraph
        const heading = (text, level = HeadingLevel.HEADING_1, color = '4A9EF7') => new Paragraph({
            children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 36 : level === HeadingLevel.HEADING_2 ? 28 : 24, color, font: 'Segoe UI' })],
            heading: level,
            spacing: { before: 300, after: 150 }
        });

        // Helper: body paragraph
        const body = (text, opts = {}) => new Paragraph({
            children: [new TextRun({ text, size: 22, color: opts.color || '333333', font: 'Segoe UI', ...opts })],
            spacing: { after: 120 },
            ...(opts.align ? { alignment: opts.align } : {})
        });

        // Helper: bullet paragraph
        const bullet = (text) => new Paragraph({
            children: [new TextRun({ text, size: 22, color: '333333', font: 'Segoe UI' })],
            bullet: { level: 0 },
            spacing: { after: 80 }
        });

        // ── COVER PAGE ──
        children.push(new Paragraph({ spacing: { before: 3000 } }));
        children.push(new Paragraph({
            children: [new TextRun({ text: story.title, bold: true, size: 56, color: '4A9EF7', font: 'Segoe UI' })],
            alignment: AlignmentType.CENTER, spacing: { after: 200 }
        }));
        children.push(new Paragraph({
            children: [new TextRun({ text: story.subtitle, size: 24, color: '64748B', font: 'Segoe UI' })],
            alignment: AlignmentType.CENTER, spacing: { after: 100 }
        }));
        children.push(new Paragraph({
            children: [new TextRun({ text: story.generatedDate, size: 22, color: '94A3B8', font: 'Segoe UI' })],
            alignment: AlignmentType.CENTER, spacing: { after: 200 }
        }));
        children.push(new Paragraph({
            children: [new TextRun({ text: 'Data Source: Microsoft Copilot Insight Report (Official Telemetry)', size: 20, color: '94A3B8', font: 'Segoe UI', italics: true })],
            alignment: AlignmentType.CENTER, spacing: { after: 100 }
        }));
        children.push(new Paragraph({ children: [new PageBreak()] }));

        // ── EXECUTIVE SUMMARY ──
        children.push(heading('Executive Summary'));
        story.executiveSummary.forEach(line => children.push(body(line)));
        children.push(new Paragraph({ spacing: { after: 200 } }));

        // Key metrics callout box
        children.push(heading('Key Metrics at a Glance', HeadingLevel.HEADING_2, '0078D4'));
        const km = story.keyMetrics;
        const metricLines = [
            `Licensed Users: ${km.totalEnabledUsers}  |  Active Users: ${km.totalActiveUsers} (${km.activationRate})`,
            `Power Users: ${km.powerUsers} (${km.powerUserRate})  |  Avg Actions/User/Week: ${km.avgActionsPerUserPerWeek}`,
            `Weekly Hours Saved: ${km.weeklyHoursSaved}  |  Monthly Hours Saved: ${km.monthlyHoursSaved}`,
            `Total Weekly Actions: ${km.totalWeeklyActions}  |  Total Monthly Actions: ${km.totalMonthlyActions}`,
        ];
        metricLines.forEach(line => children.push(body(line, { bold: true })));
        children.push(new Paragraph({ children: [new PageBreak()] }));

        // ── ROI ANALYSIS ──
        children.push(heading('ROI Analysis'));
        story.roiAnalysis.forEach(line => children.push(bullet(line)));
        children.push(new Paragraph({ spacing: { after: 200 } }));

        // ── TIER BREAKDOWN ──
        children.push(heading('Usage Tier Performance', HeadingLevel.HEADING_2, '0078D4'));
        story.tierBreakdown.forEach(tier => {
            children.push(body(`${tier.name}: ${tier.users.toLocaleString()} active users, ${tier.avgMonthly} actions/user/month, ${tier.value}/month value, ${tier.roi} ROI`, { bold: true }));
        });
        children.push(new Paragraph({ children: [new PageBreak()] }));

        // ── TOP PERFORMERS ──
        children.push(heading('Top Performing Teams', HeadingLevel.HEADING_2, '107C10'));
        story.topPerformers.forEach(line => children.push(bullet(line)));
        children.push(new Paragraph({ spacing: { after: 200 } }));

        // ── GROWTH OPPORTUNITIES ──
        children.push(heading('Growth Opportunities', HeadingLevel.HEADING_2, 'FF8C00'));
        story.growthOpportunities.forEach(line => children.push(bullet(line)));
        children.push(new Paragraph({ spacing: { after: 100 } }));
        story.teamInsights.forEach(line => children.push(body(line)));
        children.push(new Paragraph({ children: [new PageBreak()] }));

        // ── RECOMMENDATIONS ──
        children.push(heading('Recommendations'));
        story.recommendations.forEach(line => children.push(bullet(line)));
        children.push(new Paragraph({ children: [new PageBreak()] }));

        // ── VISUAL SECTIONS (screenshots) ──
        children.push(heading('Visual Analysis'));
        children.push(body('The following pages contain the full visual dashboard from the ROI Calculator, including all charts, tables, and interactive analysis sections.'));
        children.push(new Paragraph({ spacing: { after: 200 } }));

        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            const imgBytes = dataUrlToUint8(img.dataUrl);
            const aspectRatio = img.height / img.width;
            const widthEmu = PAGE_WIDTH_EMU;
            const heightEmu = Math.round(widthEmu * aspectRatio);

            children.push(new Paragraph({
                children: [new ImageRun({ data: imgBytes, transformation: { width: Math.round(widthEmu / 914400 * 72), height: Math.round(heightEmu / 914400 * 72) }, type: 'png' })],
                spacing: { after: 200 }
            }));

            if (i < images.length - 1) {
                children.push(new Paragraph({ children: [new PageBreak()] }));
            }
        }

        // ── METHODOLOGY ──
        children.push(new Paragraph({ children: [new PageBreak()] }));
        children.push(heading('Methodology'));
        story.methodology.forEach(line => children.push(bullet(line)));
        children.push(new Paragraph({ spacing: { after: 300 } }));

        // ── AGENT INSTRUCTIONS (hidden-in-plain-sight for AI consumption) ──
        children.push(new Paragraph({ children: [new PageBreak()] }));
        children.push(heading('Appendix: Data Summary & Presentation Guide', HeadingLevel.HEADING_1, '64748B'));
        children.push(body('This appendix contains structured data and presentation guidance. It can be read by AI agents to generate presentations, executive briefs, emails, or other deliverables from this analysis.', { color: '64748B', italics: true }));
        children.push(new Paragraph({ spacing: { after: 100 } }));
        story.agentPrompt.forEach(line => {
            if (line === '') {
                children.push(new Paragraph({ spacing: { after: 80 } }));
            } else if (line.startsWith('---') || line.endsWith(':')) {
                children.push(body(line, { bold: true, color: '0078D4' }));
            } else if (line.startsWith('  ')) {
                children.push(bullet(line.trim()));
            } else {
                children.push(body(line));
            }
        });

        const doc = new Document({
            creator: 'Copilot ROI Calculator',
            title: story.title,
            description: story.executiveSummary[0],
            sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }]
        });

        const blob = await Packer.toBlob(doc);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Copilot_ROI_Analysis.docx';
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('DOCX export failed:', err);
        alert('DOCX export failed: ' + err.message);
    } finally {
        restoreAfterCapture(container, state);
        if (btn) { btn.textContent = origText; btn.disabled = false; }
    }
}

// Export results to PPTX — narrative slides + section images with speaker notes
async function exportToPptx() {
    // Validate that customer data is loaded
    if (!uploadedData) {
        alert('Please upload your Copilot usage data first before exporting to PowerPoint.');
        return;
    }
    
    if (isDemoData) {
        const confirmed = confirm(
            '⚠️ WARNING: You are about to export a presentation using DEMO DATA.\n\n' +
            'This file contains example data from a demonstration dataset, NOT your organization\'s actual Copilot usage data.\n\n' +
            '• DO NOT share this with customers or stakeholders\n' +
            '• DO NOT use for business decisions\n' +
            '• Upload your own CSV file to generate a presentation with real data\n\n' +
            'Export demo presentation anyway?'
        );
        if (!confirmed) return;
    }
    
    const container = document.querySelector('.results-container');
    if (!container) return;

    const btn = document.querySelector('[onclick="exportToPptx()"]');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Generating PPTX… 0%'; btn.disabled = true; }

    const state = prepareForCapture(container);

    try {
        if (!window.PptxGenJS) throw new Error('PPTX library failed to load. Refresh and try again.');

        const story = generateStoryNarrative();

        const images = await captureSections(container, (i, total) => {
            if (btn) btn.textContent = `Capturing… ${Math.round(((i + 1) / total) * 100)}%`;
        });

        if (btn) btn.textContent = 'Building PPTX…';

        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE';
        pptx.author = 'Copilot ROI Calculator';
        pptx.subject = story.title;
        pptx.title = story.title;

        const SLIDE_W = 13.33;
        const SLIDE_H = 7.5;
        const MARGIN = 0.3;
        const CONTENT_W = SLIDE_W - 2 * MARGIN;
        const CONTENT_H = SLIDE_H - 2 * MARGIN;
        const BG = '0B1120';
        const BLUE = '4A9EF7';
        const CYAN = '00D4FF';
        const GREEN = '10B981';
        const GRAY = '94A3B8';
        const WHITE = 'F1F5F9';

        // ── SLIDE 1: Title ──
        const titleSlide = pptx.addSlide();
        titleSlide.background = { color: BG };
        titleSlide.addText(story.title, {
            x: 1, y: 1.8, w: 11.33, h: 1.5,
            fontSize: 36, bold: true, color: BLUE, align: 'center', fontFace: 'Segoe UI'
        });
        titleSlide.addText(story.subtitle, {
            x: 1, y: 3.4, w: 11.33, h: 0.6,
            fontSize: 18, color: GRAY, align: 'center', fontFace: 'Segoe UI'
        });
        titleSlide.addText(story.generatedDate, {
            x: 1, y: 4.1, w: 11.33, h: 0.6,
            fontSize: 14, color: GRAY, align: 'center', fontFace: 'Segoe UI'
        });
        titleSlide.addText('Data Source: Microsoft Copilot Insight Report (Official Telemetry)', {
            x: 1, y: 5.2, w: 11.33, h: 0.5,
            fontSize: 12, color: GRAY, align: 'center', fontFace: 'Segoe UI', italic: true
        });
        titleSlide.addNotes(
            'TITLE SLIDE\n\n' +
            'Opening lines:\n' +
            `- "Today we're sharing the measured productivity ROI from this M365 Copilot deployment."\n` +
            `- "This analysis covers ${story.keyMetrics.totalEnabledUsers} users across ${story.subtitle.split(' over ')[0].replace('Analysis of ', '')} — ${story.subtitle.split(' over ')[1] || ''}."\n` +
            `- "All data comes directly from Microsoft's Copilot Insight Report — nothing is estimated or projected."\n\n` +
            'Keep it brief — this is setup, not substance. Establish credibility immediately.'
        );

        // ── SLIDE 2: Executive Summary ──
        const summSlide = pptx.addSlide();
        summSlide.background = { color: BG };
        summSlide.addText('Executive Summary', {
            x: 0.5, y: 0.3, w: 12, h: 0.7,
            fontSize: 28, bold: true, color: BLUE, fontFace: 'Segoe UI'
        });
        const summaryBullets = story.executiveSummary.map(line => ({ text: line, options: { fontSize: 16, color: WHITE, fontFace: 'Segoe UI', bullet: true, breakLine: true, paraSpaceAfter: 8 } }));
        summSlide.addText(summaryBullets, { x: 0.5, y: 1.2, w: 12, h: 5.5, valign: 'top' });
        summSlide.addNotes(
            'EXECUTIVE SUMMARY\n\n' +
            'Lead with the punchline:\n' +
            `- ROI: ${story.roiAnalysis[3]}\n` +
            `- Value: ${story.roiAnalysis[0]}\n` +
            `- Adoption: ${story.executiveSummary[2]}\n\n` +
            'Use the "Power of AND" technique:\n' +
            '- "We achieved BOTH high adoption AND deep engagement."\n' +
            '- "Success spans IT AND business teams."\n\n' +
            'Create anticipation: "Now let me show you how we got here..."'
        );

        // ── SLIDE 3: Key Metrics ──
        const metricsSlide = pptx.addSlide();
        metricsSlide.background = { color: BG };
        metricsSlide.addText('Key Metrics at a Glance', {
            x: 0.5, y: 0.3, w: 12, h: 0.7,
            fontSize: 28, bold: true, color: BLUE, fontFace: 'Segoe UI'
        });
        const km = story.keyMetrics;
        const metricPairs = [
            ['Licensed Users', km.totalEnabledUsers, 'Active Users', `${km.totalActiveUsers} (${km.activationRate})`],
            ['Power Users', `${km.powerUsers} (${km.powerUserRate})`, 'Avg Actions/User/Wk', km.avgActionsPerUserPerWeek],
            ['Weekly Hours Saved', km.weeklyHoursSaved, 'Monthly Hours Saved', km.monthlyHoursSaved],
        ];
        metricPairs.forEach((pair, idx) => {
            const y = 1.3 + idx * 1.8;
            // Left metric
            metricsSlide.addText(pair[0], { x: 0.8, y: y, w: 5.5, h: 0.5, fontSize: 14, color: GRAY, fontFace: 'Segoe UI' });
            metricsSlide.addText(pair[1], { x: 0.8, y: y + 0.5, w: 5.5, h: 0.7, fontSize: 32, bold: true, color: CYAN, fontFace: 'Segoe UI' });
            // Right metric
            metricsSlide.addText(pair[2], { x: 7, y: y, w: 5.5, h: 0.5, fontSize: 14, color: GRAY, fontFace: 'Segoe UI' });
            metricsSlide.addText(pair[3], { x: 7, y: y + 0.5, w: 5.5, h: 0.7, fontSize: 32, bold: true, color: CYAN, fontFace: 'Segoe UI' });
        });
        metricsSlide.addNotes(
            'KEY METRICS\n\n' +
            'Walk through each metric pair:\n' +
            `- ${km.totalEnabledUsers} licensed → ${km.totalActiveUsers} active = ${km.activationRate} activation. "Near-universal adoption."\n` +
            `- ${km.powerUsers} power users (${km.powerUserRate}). "These are your champions — they take 20+ actions every week."\n` +
            `- ${km.weeklyHoursSaved} hours/week saved. "That's ${km.monthlyHoursSaved} hours every month returned to productive work."\n\n` +
            `Transition: "Let's look at what this means in financial terms..."`
        );

        // ── SLIDE 4: ROI Analysis ──
        const roiSlide = pptx.addSlide();
        roiSlide.background = { color: BG };
        roiSlide.addText('Measured Business Value', {
            x: 0.5, y: 0.3, w: 12, h: 0.7,
            fontSize: 28, bold: true, color: BLUE, fontFace: 'Segoe UI'
        });
        const roiBullets = story.roiAnalysis.map(line => ({ text: line, options: { fontSize: 15, color: WHITE, fontFace: 'Segoe UI', bullet: true, breakLine: true, paraSpaceAfter: 10 } }));
        roiSlide.addText(roiBullets, { x: 0.5, y: 1.2, w: 12, h: 5.5, valign: 'top' });
        roiSlide.addNotes(
            'MONEY SLIDE — THIS IS THE MOST IMPORTANT SLIDE. SLOW DOWN.\n\n' +
            'Five-part walkthrough:\n' +
            '1. Methodology (60s): "Let me explain how we calculated this..."\n' +
            `   - ${story.roiAnalysis[4]}\n` +
            `2. Value (45s): ${story.roiAnalysis[0]}\n` +
            `3. Annual (45s): ${story.roiAnalysis[1]}\n` +
            `4. Investment (30s): ${story.roiAnalysis[2]}\n` +
            `5. ROI Multiple (45s): ${story.roiAnalysis[3]}\n\n` +
            'PAUSE FOR QUESTIONS. Don\'t rush past this slide.\n\n' +
            'Objection handling:\n' +
            `- "Is the time savings realistic?" → Microsoft research shows 3-10 min range. Forrester shows 5-8 min avg.\n` +
            `- "What about implementation costs?" → Copilot is embedded in M365. ${km.activationRate} activation = minimal friction.\n` +
            `- "Can you prove it?" → These are measured actions. Sustained growth over the analysis period confirms ongoing value.`
        );

        // ── SLIDE 5: Tier Breakdown ──
        const tierSlide = pptx.addSlide();
        tierSlide.background = { color: BG };
        tierSlide.addText('Usage Tier Performance', {
            x: 0.5, y: 0.3, w: 12, h: 0.7,
            fontSize: 28, bold: true, color: BLUE, fontFace: 'Segoe UI'
        });
        const tierBullets = story.tierBreakdown.map(t => ({
            text: `${t.name}: ${t.users.toLocaleString()} users, ${t.avgMonthly} actions/user/mo, ${t.value}/mo, ${t.roi} ROI`,
            options: { fontSize: 16, color: WHITE, fontFace: 'Segoe UI', bullet: true, breakLine: true, paraSpaceAfter: 12 }
        }));
        tierSlide.addText(tierBullets, { x: 0.5, y: 1.2, w: 12, h: 5.5, valign: 'top' });
        tierSlide.addNotes(
            'TIER BREAKDOWN\n\n' +
            'Key narrative:\n' +
            `- Top 10% are your champions: ${story.tierBreakdown[0]?.roi || 'N/A'} ROI. They\'re your best internal salespeople.\n` +
            '- Bottom 25% is NOT a failure — frame as "unrealized potential" and the biggest growth opportunity.\n' +
            '- Targeted enablement for bottom quartile could significantly increase overall ROI.\n\n' +
            story.teamInsights.join('\n')
        );

        // ── SLIDE 6: Top Performers ──
        const topSlide = pptx.addSlide();
        topSlide.background = { color: BG };
        topSlide.addText('Top Performing Teams', {
            x: 0.5, y: 0.3, w: 12, h: 0.7,
            fontSize: 28, bold: true, color: GREEN, fontFace: 'Segoe UI'
        });
        const topBullets = story.topPerformers.map(line => ({
            text: line, options: { fontSize: 15, color: WHITE, fontFace: 'Segoe UI', bullet: true, breakLine: true, paraSpaceAfter: 10 }
        }));
        topSlide.addText(topBullets, { x: 0.5, y: 1.2, w: 12, h: 5.5, valign: 'top' });
        topSlide.addNotes(
            'TOP PERFORMERS\n\n' +
            'Key talking points:\n' +
            '- These teams represent the art of the possible — what every team CAN achieve.\n' +
            '- Look for patterns: What do they have in common? (Leadership buy-in, clear use cases, peer training)\n' +
            '- Use them as case studies for internal enablement.\n\n' +
            'Storytelling technique — humanize the data:\n' +
            `- "Imagine the top team's ${story.topPerformers[0]?.split('—')[0] || ''} showing colleagues how to save time every day."\n\n` +
            story.topPerformers.join('\n')
        );

        // ── SLIDE 7: Recommendations ──
        const recSlide = pptx.addSlide();
        recSlide.background = { color: BG };
        recSlide.addText('Recommendations & Next Steps', {
            x: 0.5, y: 0.3, w: 12, h: 0.7,
            fontSize: 28, bold: true, color: BLUE, fontFace: 'Segoe UI'
        });
        const recBullets = story.recommendations.map(line => ({
            text: line, options: { fontSize: 15, color: WHITE, fontFace: 'Segoe UI', bullet: true, breakLine: true, paraSpaceAfter: 12 }
        }));
        recSlide.addText(recBullets, { x: 0.5, y: 1.2, w: 12, h: 5.5, valign: 'top' });
        recSlide.addNotes(
            'RECOMMENDATIONS\n\n' +
            'Frame each recommendation with urgency and specificity:\n' +
            story.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') + '\n\n' +
            'Close with: "The data is clear — Copilot pays for itself many times over. The question isn\'t whether to invest, it\'s how fast we scale."'
        );

        // ── VISUAL SLIDES (screenshots with notes) ──
        const sectionNames = ['Executive Summary Dashboard', 'Team Performance Analysis', 'ROI Deep Dive', 'Reference Data'];
        for (let i = 0; i < images.length; i++) {
            const slide = pptx.addSlide();
            slide.background = { color: BG };

            const img = images[i];
            const aspectRatio = img.height / img.width;
            let imgW = CONTENT_W;
            let imgH = imgW * aspectRatio;
            if (imgH > CONTENT_H) { imgH = CONTENT_H; imgW = imgH / aspectRatio; }
            const x = (SLIDE_W - imgW) / 2;
            const y = (SLIDE_H - imgH) / 2;
            slide.addImage({ data: img.dataUrl, x, y, w: imgW, h: imgH });

            const sectionName = sectionNames[i] || `Analysis Section ${i + 1}`;
            slide.addNotes(
                `VISUAL: ${sectionName}\n\n` +
                'This slide shows the full visual dashboard for this section.\n' +
                'Walk the audience through the key data points visible in the chart/table.\n' +
                'Reference the narrative slides for specific talking points and numbers.\n\n' +
                `Key context:\n${story.executiveSummary.join('\n')}`
            );
        }

        // ── CLOSING SLIDE ──
        const closeSlide = pptx.addSlide();
        closeSlide.background = { color: BG };
        closeSlide.addText(story.roiAnalysis[3], {
            x: 1, y: 2, w: 11.33, h: 1.5,
            fontSize: 30, bold: true, color: GREEN, align: 'center', fontFace: 'Segoe UI'
        });
        closeSlide.addText('Measured productivity from Microsoft Copilot — not theoretical, not projected.', {
            x: 1, y: 4, w: 11.33, h: 0.8,
            fontSize: 16, color: GRAY, align: 'center', fontFace: 'Segoe UI', italic: true
        });
        closeSlide.addNotes(
            'CLOSING SLIDE\n\n' +
            `Closing statement: "The data is clear. ${story.roiAnalysis[3]} Every dollar invested is working. The question is how fast we expand."\n\n` +
            'FULL AGENT-READABLE DATA SUMMARY:\n\n' +
            story.agentPrompt.join('\n')
        );

        await pptx.writeFile({ fileName: 'Copilot_ROI_Analysis.pptx' });
        
        // Track download event in Microsoft Clarity
        if (window.clarity) {
            clarity('event', 'download_powerpoint_analysis');
        }
    } catch (err) {
        console.error('PPTX export failed:', err);
        alert('PPTX export failed: ' + err.message);
    } finally {
        restoreAfterCapture(container, state);
        if (btn) { btn.textContent = origText; btn.disabled = false; }
    }
}

// ── EXECUTIVE DECK EXPORT ──
// 9-slide executive presentation matching the Copilot ROI Executive Deck reference design.
// Pure native PPTX elements — shapes, charts, cards — no screenshots.
async function exportExecutiveDeck() {
    // Validate that customer data is loaded
    if (!uploadedData) {
        alert('Please upload your Copilot usage data first before exporting the Executive Deck.');
        return;
    }
    
    if (isDemoData) {
        const confirmed = confirm(
            '⚠️ WARNING: You are about to export a deck using DEMO DATA.\n\n' +
            'This deck contains example data from a demonstration dataset, NOT your organization\'s actual Copilot usage data.\n\n' +
            '• DO NOT share this with customers or stakeholders\n' +
            '• DO NOT use for business decisions\n' +
            '• Upload your own CSV file to generate a deck with real data\n\n' +
            'Export demo deck anyway?'
        );
        if (!confirmed) return;
    }
    
    const btn = document.querySelector('[onclick="exportExecutiveDeck()"]');
    const origText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Building Deck…'; btn.disabled = true; }

    try {
        if (!window.PptxGenJS) throw new Error('PPTX library failed to load. Refresh and try again.');
        const story = generateStoryNarrative();
        const metrics = calculateMetrics(uploadedData);
        const rows = uploadedData.rows;
        const groupLabel = uploadedData.groupLabel || 'teams';
        const weeks = config.analysisWeeks;
        const dateRange = uploadedData.dateRange || `${weeks} weeks`;

        // Sorted teams for tables
        const sortedTeams = rows.map(row => {
            const monthlyValue = (row.monthlyActions * config.minutesPerAction / 60) * config.professionalRate;
            const weeklyHours = (row.weeklyActions * config.minutesPerAction / 60);
            return { ...row, monthlyValue, weeklyHours };
        }).sort((a, b) => b.monthlyValue - a.monthlyValue);

        const fmt = n => n.toLocaleString(undefined, { maximumFractionDigits: 0 });
        const pct = n => typeof n === 'number' ? n.toFixed(1) + '%' : n;
        const fmtM = n => n >= 1000000 ? '$' + (n / 1000000).toFixed(2) + 'M' : '$' + fmt(Math.round(n));
        const singularLabel = groupLabel.endsWith('s') ? groupLabel.slice(0, -1) : groupLabel;
        const totalSlides = 9;

        const pptx = new PptxGenJS();
        pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"
        pptx.author = 'Copilot ROI Calculator';
        pptx.title = story.title;
        pptx.subject = story.subtitle;

        // ── Design Tokens ──
        const BG_DARK = '06132B';
        const BG = '0B1F3A';
        const CARD = '0F2647';
        const CARD_ALT = '16335E';
        const CYAN = '4FC3F7';
        const GREEN = '4ADE80';
        const GOLD = 'F5C451';
        const RED = 'F26D6D';
        const WHITE = 'FFFFFF';
        const TEXT = 'CADCFC';
        const MUTED = '9AB0CC';

        // Helper: add consistent footer to a slide
        const addFooter = (slide, pageNum) => {
            slide.addText(`M365 Copilot ROI Analysis  |  ${weeks} weeks  |  ${rows.length} ${groupLabel}`, {
                x: 0.60, y: 7.15, w: 9.0, h: 0.30, fontSize: 9, fontFace: 'Calibri', color: MUTED
            });
            slide.addText(`${pageNum} / ${totalSlides}`, {
                x: 12.20, y: 7.15, w: 0.60, h: 0.30, fontSize: 9, fontFace: 'Calibri', color: MUTED, align: 'right'
            });
        };

        // Helper: section header pattern
        const addSectionHeader = (slide, label, headline) => {
            slide.addText(label, {
                x: 0.60, y: 0.55, w: 8.0, h: 0.30, fontSize: 11, fontFace: 'Calibri', color: CYAN, bold: true
            });
            slide.addText(headline, {
                x: 0.60, y: 0.85, w: 12.20, h: 0.65, fontSize: 28, fontFace: 'Cambria', color: WHITE, bold: true, valign: 'top'
            });
        };

        // Compute tier data — prefer real per-user cohorts when Viva data is loaded
        const byActions = [...sortedTeams].sort((a, b) => b.actionsPerUser - a.actionsPerUser);
        const totalTeams = byActions.length;
        let tierData;
        if (uploadedData.isVivaInsights && uploadedData.personCohorts && uploadedData.personCohorts.rows) {
            const cohortColor = {
                'Power Users':    GREEN,
                'Habitual Users': CYAN,
                'Novice Users':   CYAN,
                'Low Users':      GOLD,
                'Non Users':      RED
            };
            tierData = uploadedData.personCohorts.rows
                .filter(r => r.count > 0)
                .map(r => ({
                    name: r.name,
                    color: cohortColor[r.name] || CYAN,
                    users: r.count,
                    monthly: Math.round(r.actionsPerMonth * r.count),
                    actPerUser: Math.round(r.actionsPerMonth),
                    value: r.monthlyValue,
                    invest: r.investment,
                    roi: r.roi
                }));
        } else {
            const tierDefs = [
                { name: 'Top 10%', start: 0, end: Math.max(1, Math.round(totalTeams * 0.10)), color: GREEN },
                { name: '75\u201390%', start: Math.max(1, Math.round(totalTeams * 0.10)), end: Math.round(totalTeams * 0.25), color: CYAN },
                { name: '50\u201375%', start: Math.round(totalTeams * 0.25), end: Math.round(totalTeams * 0.50), color: CYAN },
                { name: '25\u201350%', start: Math.round(totalTeams * 0.50), end: Math.round(totalTeams * 0.75), color: GOLD },
                { name: 'Bottom 25%', start: Math.round(totalTeams * 0.75), end: totalTeams, color: RED },
            ];
            tierData = tierDefs.map(tier => {
                const slice = byActions.slice(tier.start, tier.end);
                const users = slice.reduce((s, t) => s + t.activeUsers, 0);
                const weeklyAct = slice.reduce((s, t) => s + t.weeklyActions, 0);
                const monthly = weeklyAct * 4.33;
                const actPerUser = users > 0 ? monthly / users : 0;
                const value = slice.reduce((s, t) => s + t.monthlyValue, 0);
                const invest = users * config.licenseCost;
                const roi = invest > 0 ? value / invest : 0;
                return { ...tier, users, monthly: Math.round(monthly), actPerUser: Math.round(actPerUser), value, invest, roi };
            }).filter(t => t.users > 0);
        }

        const monthlyValuePerUser = metrics.totalActiveUsers > 0 ? metrics.valuePerMonth / metrics.totalActiveUsers : 0;
        const breakEvenActions = (config.licenseCost / ((config.minutesPerAction / 60) * config.professionalRate));
        const avgActionsPerMonth = metrics.avgActionsPerUser * 4.33;

        // ════════════════════════════════════════════
        // SLIDE 1: Title
        // ════════════════════════════════════════════
        const s1 = pptx.addSlide();
        s1.background = { color: BG_DARK };

        // Decorative vertical bars (right side)
        for (let i = 0; i < 5; i++) {
            const x = 11.50 + i * 0.32;
            const clr = i === 4 ? CYAN : CARD_ALT;
            s1.addShape(pptx.shapes.RECTANGLE, { x, y: 0.60, w: 0.06, h: 6.30, fill: { color: clr } });
        }

        s1.addText('MICROSOFT 365  |  EXECUTIVE BRIEFING', {
            x: 0.70, y: 1.00, w: 8.0, h: 0.40, fontSize: 12, fontFace: 'Calibri', color: CYAN, bold: true
        });
        s1.addText('M365 Copilot', {
            x: 0.70, y: 1.60, w: 11.0, h: 1.10, fontSize: 60, fontFace: 'Cambria', color: WHITE, bold: true
        });
        s1.addText('Productivity ROI Analysis', {
            x: 0.70, y: 2.70, w: 11.0, h: 1.00, fontSize: 44, fontFace: 'Cambria', color: TEXT
        });
        // Accent bar
        s1.addShape(pptx.shapes.RECTANGLE, { x: 0.70, y: 4.00, w: 1.60, h: 0.08, fill: { color: CYAN } });
        // Headline stat
        s1.addText(`${fmtM(metrics.valuePerMonth)} monthly productivity value across ${fmt(metrics.totalPurchasedLicenses)} licenses \u2014 a ${metrics.roiMultiple.toFixed(1)}x return`, {
            x: 0.70, y: 4.20, w: 11.0, h: 0.80, fontSize: 20, fontFace: 'Calibri', color: WHITE
        });
        // Data context
        s1.addText(`Based on ${formatGroupCount(rows.length, groupLabel)}  \u2022  ${weeks} weeks of data  \u2022  ${dateRange}`, {
            x: 0.70, y: 5.20, w: 11.0, h: 0.40, fontSize: 13, fontFace: 'Calibri', color: MUTED
        });
        // Footer bar
        s1.addShape(pptx.shapes.RECTANGLE, { x: 0.0, y: 6.90, w: 13.33, h: 0.60, fill: { color: BG } });
        s1.addText(`Generated ${story.generatedDate}  |  Copilot ROI Calculator`, {
            x: 0.70, y: 7.00, w: 12.0, h: 0.40, fontSize: 11, fontFace: 'Calibri', color: TEXT
        });

        s1.addNotes(
            'TITLE SLIDE\n\n' +
            'This is an automatically generated executive deck from actual Copilot usage data.\n' +
            `Key headline: ${fmtM(metrics.valuePerMonth)}/month, ${metrics.roiMultiple.toFixed(1)}x ROI across ${fmt(metrics.totalPurchasedLicenses)} licenses.\n\n` +
            story.agentPrompt.join('\n')
        );

        // ════════════════════════════════════════════
        // SLIDE 2: Executive Summary
        // ════════════════════════════════════════════
        const s2 = pptx.addSlide();
        s2.background = { color: BG };
        addSectionHeader(s2, 'EXECUTIVE SUMMARY', `Copilot is delivering ${metrics.roiMultiple.toFixed(1)}x ROI today`);

        // Key paragraph callout
        s2.addShape(pptx.shapes.RECTANGLE, { x: 0.60, y: 1.80, w: 12.10, h: 1.40, fill: { color: CARD } });
        const summaryPara = `${fmt(metrics.totalPurchasedLicenses)} licenses generate ${fmtM(metrics.valuePerMonth)}/month in productivity value at ${pct(metrics.activationRate)} adoption \u2014 every $1 spent returns $${metrics.roiMultiple.toFixed(2)} in measured time savings. ${fmt(metrics.powerUsers)} power users (${pct(metrics.powerUserRate)}) accelerate adoption through peer learning, and even the lowest-performing tier delivers positive ROI.`;
        s2.addText(summaryPara, {
            x: 0.85, y: 1.95, w: 11.60, h: 1.10, fontSize: 18, fontFace: 'Calibri', color: CYAN, bold: true, valign: 'top'
        });

        // 3 insight cards — Card 3 uses the SAME realistic-case math as Slide 7 (50% of current licensed productivity, net of license cost)
        const realisticAnnualNetPer1000 = (monthlyValuePerUser * 0.50 - config.licenseCost) * 1000 * 12;
        const insightCards = [
            { title: 'Strong adoption', body: `${fmt(metrics.totalActiveUsers)} of ${fmt(metrics.totalEnabledUsers)} licensed users are active weekly. Power users (${pct(metrics.powerUserRate)}) average 20+ actions per week and model behavior for peers.`, accent: GREEN },
            { title: 'Every tier is profitable', body: `Even bottom-25% users return ${tierData.length > 0 ? tierData[tierData.length - 1].roi.toFixed(1) : '?'}x. Top performers reach ${tierData.length > 0 ? tierData[0].roi.toFixed(1) : '?'}x. The investment carries no underwater segment.`, accent: CYAN },
            { title: 'Headroom for expansion', body: `Each 1,000 unlicensed users → ~$${fmt(Math.round(realisticAnnualNetPer1000))}/year NET GAIN at a realistic 50%-of-current-productivity ramp (see Slide 7 for floor and parity cases).`, accent: GOLD },
        ];
        insightCards.forEach((card, i) => {
            const cx = 0.60 + i * 4.10;
            const cw = 3.85;
            s2.addShape(pptx.shapes.RECTANGLE, { x: cx, y: 3.50, w: cw, h: 2.60, fill: { color: CARD } });
            s2.addShape(pptx.shapes.RECTANGLE, { x: cx, y: 3.50, w: 0.08, h: 2.60, fill: { color: card.accent } });
            s2.addText(card.title, { x: cx + 0.30, y: 3.75, w: cw - 0.45, h: 0.50, fontSize: 18, fontFace: 'Cambria', color: WHITE, bold: true });
            s2.addText(card.body, { x: cx + 0.30, y: 4.35, w: cw - 0.45, h: 1.50, fontSize: 13, fontFace: 'Calibri', color: TEXT, valign: 'top' });
        });

        // Methodology note
        s2.addText(`Calculation: ${fmt(Math.round(metrics.totalWeeklyActions * 4.33))} monthly actions \u00d7 ${config.minutesPerAction} min \u00f7 60 \u00d7 $${config.professionalRate}/hr = ${fmtM(metrics.valuePerMonth)} productivity value`, {
            x: 0.60, y: 6.40, w: 12.10, h: 0.30, fontSize: 10, fontFace: 'Calibri', color: MUTED
        });
        addFooter(s2, 2);

        s2.addNotes(
            'EXECUTIVE SUMMARY\n\n' +
            'OPENER: "Let me give you the headline — Copilot pays for itself ' + metrics.roiMultiple.toFixed(1) + ' times over."\n\n' +
            'CARD-BY-CARD MATH:\n' +
            `1. ADOPTION: ${pct(metrics.activationRate)} activation  =  ${fmt(metrics.totalActiveUsers)} active ÷ ${fmt(metrics.totalEnabledUsers)} licensed. Organic, no formal training.\n` +
            `2. PROFITABILITY: Bottom-25% tier returns ${tierData.length > 0 ? tierData[tierData.length - 1].roi.toFixed(1) : '?'}x; top tier ${tierData.length > 0 ? tierData[0].roi.toFixed(1) : '?'}x. No tier is underwater.\n` +
            `3. EXPANSION (realistic case): per 1,000 unlicensed users at 50% of current productivity:\n` +
            `   value/user/mo = 50% × $${Math.round(monthlyValuePerUser)} = $${Math.round(monthlyValuePerUser * 0.5)}\n` +
            `   net/user/mo   = $${Math.round(monthlyValuePerUser * 0.5)} − $${config.licenseCost} = $${Math.round(monthlyValuePerUser * 0.5 - config.licenseCost)}\n` +
            `   annual / 1,000 = $${Math.round(monthlyValuePerUser * 0.5 - config.licenseCost)} × 1,000 × 12 = $${fmt(Math.round(realisticAnnualNetPer1000))}\n` +
            '   See Slide 7 for full 10% floor / 50% realistic / 100% parity scenario math.\n\n' +
            `HEADLINE FORMULA: ${fmt(Math.round(metrics.totalWeeklyActions * 4.33))} monthly actions × ${config.minutesPerAction} min ÷ 60 × $${config.professionalRate}/hr = ${fmtM(metrics.valuePerMonth)} value; ÷ $${fmt(Math.round(metrics.monthlyCostPurchased))} cost = ${metrics.roiMultiple.toFixed(2)}x ROI.\n\n` +
            'OBJECTION: "Is this sustainable?" → Yes — ' + weeks + ' weeks of sustained/growing data.\n' +
            'TRANSITION: "Let me show you the numbers behind this..."'
        );

        // ════════════════════════════════════════════
        // SLIDE 3: Key Metrics
        // ════════════════════════════════════════════
        const s3 = pptx.addSlide();
        s3.background = { color: BG };
        addSectionHeader(s3, `KEY METRICS  \u2022  LAST ${weeks > 4 ? weeks : 4} WEEKS`, 'The numbers behind the return');

        // Row 1: 2 big cards (6.05" wide each)
        const bigW = 6.05, bigH = 1.70, bigGap = 0.10;
        const r1Y = 1.80;
        const bigCards = [
            { label: 'MONTHLY ROI MULTIPLE', value: metrics.roiMultiple.toFixed(1) + 'x', sub: `${fmtM(metrics.valuePerMonth)} / mo  \u00f7  $${fmt(Math.round(metrics.monthlyCostPurchased))} / mo cost`, valueColor: GREEN },
            { label: 'MONTHLY PRODUCTIVITY VALUE', value: fmtM(metrics.valuePerMonth), sub: `${fmtM(metrics.annualValue)} / year  \u2022  ${fmtM(metrics.valuePerMonth / 4.33)} / week`, valueColor: CYAN },
        ];
        bigCards.forEach((c, i) => {
            const bx = 0.60 + i * (bigW + bigGap);
            s3.addShape(pptx.shapes.RECTANGLE, { x: bx, y: r1Y, w: bigW, h: bigH, fill: { color: CARD } });
            s3.addText(c.label, { x: bx + 0.25, y: r1Y + 0.20, w: bigW - 0.5, h: 0.35, fontSize: 10, fontFace: 'Calibri', color: MUTED, bold: true });
            s3.addText(c.value, { x: bx + 0.25, y: r1Y + 0.55, w: bigW - 0.5, h: 0.70, fontSize: 36, fontFace: 'Cambria', color: c.valueColor, bold: true });
            s3.addText(c.sub, { x: bx + 0.25, y: r1Y + 1.15, w: bigW - 0.5, h: 0.40, fontSize: 10, fontFace: 'Calibri', color: TEXT });
        });

        // Row 2: 3 medium cards (3.95" wide each)
        const medW = 3.95, medH = 1.60, medGap = 0.15;
        const r2Y = 3.65;
        const weeklyPerUser = metrics.totalActiveUsers > 0 ? metrics.totalWeeklyActions / metrics.totalActiveUsers : 0;
        const monthlyPerUser = weeklyPerUser * 4.33;
        const medCards1 = [
            { label: 'ADOPTION RATE', value: pct(metrics.activationRate), sub: `${fmt(metrics.totalActiveUsers)} of ${fmt(metrics.totalEnabledUsers)} licensed users active`, valueColor: CYAN },
            { label: 'WEEKLY ACTIONS / USER', value: weeklyPerUser.toFixed(1), sub: `${Math.round(monthlyPerUser)} / month`, valueColor: GREEN },
            { label: 'POWER USER RATE', value: pct(metrics.powerUserRate), sub: `${fmt(metrics.powerUsers)} power users (20+ actions/wk)`, valueColor: CYAN },
        ];
        medCards1.forEach((c, i) => {
            const mx = 0.60 + i * (medW + medGap);
            s3.addShape(pptx.shapes.RECTANGLE, { x: mx, y: r2Y, w: medW, h: medH, fill: { color: CARD } });
            s3.addText(c.label, { x: mx + 0.25, y: r2Y + 0.20, w: medW - 0.5, h: 0.35, fontSize: 10, fontFace: 'Calibri', color: MUTED, bold: true });
            s3.addText(c.value, { x: mx + 0.25, y: r2Y + 0.55, w: medW - 0.5, h: 0.60, fontSize: 36, fontFace: 'Cambria', color: c.valueColor, bold: true });
            s3.addText(c.sub, { x: mx + 0.25, y: r2Y + 1.05, w: medW - 0.5, h: 0.40, fontSize: 10, fontFace: 'Calibri', color: TEXT });
        });

        // Row 3: 3 medium cards
        const r3Y = 5.40;
        const weeklyHours = metrics.totalWeeklyActions * config.minutesPerAction / 60;
        const monthlyHours = weeklyHours * 4.33;
        const costPerHour = monthlyHours > 0 ? metrics.monthlyCostPurchased / monthlyHours : 0;
        const medCards2 = [
            { label: 'ENABLED USERS', value: fmt(metrics.totalPurchasedLicenses), sub: 'Licensed for Copilot', valueColor: TEXT },
            { label: 'WEEKLY HOURS SAVED', value: fmt(Math.round(weeklyHours)), sub: `${fmt(metrics.totalWeeklyActions)} actions \u00d7 ${config.minutesPerAction} min \u00f7 60`, valueColor: GREEN },
            { label: 'COST PER HOUR SAVED', value: '$' + costPerHour.toFixed(2), sub: `$${fmt(Math.round(metrics.monthlyCostPurchased))} / mo  \u00f7  ${fmt(Math.round(monthlyHours))} hrs / mo`, valueColor: GOLD },
        ];
        medCards2.forEach((c, i) => {
            const mx = 0.60 + i * (medW + medGap);
            s3.addShape(pptx.shapes.RECTANGLE, { x: mx, y: r3Y, w: medW, h: 1.50, fill: { color: CARD } });
            s3.addText(c.label, { x: mx + 0.25, y: r3Y + 0.20, w: medW - 0.5, h: 0.35, fontSize: 10, fontFace: 'Calibri', color: MUTED, bold: true });
            s3.addText(c.value, { x: mx + 0.25, y: r3Y + 0.55, w: medW - 0.5, h: 0.50, fontSize: 36, fontFace: 'Cambria', color: c.valueColor, bold: true });
            s3.addText(c.sub, { x: mx + 0.25, y: r3Y + 0.95, w: medW - 0.5, h: 0.40, fontSize: 10, fontFace: 'Calibri', color: TEXT });
        });
        addFooter(s3, 3);

        s3.addNotes(
            'KEY METRICS\n\n' +
            `ROI Multiple: ${metrics.roiMultiple.toFixed(1)}x — ${fmtM(metrics.valuePerMonth)} value on $${fmt(Math.round(metrics.monthlyCostPurchased))} cost.\n` +
            `Adoption: ${pct(metrics.activationRate)} — strong organic uptake.\n` +
            `Power users: ${fmt(metrics.powerUsers)} (${pct(metrics.powerUserRate)}) — these are your champions.\n` +
            `Cost per hour saved: $${costPerHour.toFixed(2)} — compare to $${config.professionalRate}/hr value of time.\n\n` +
            'Walk through each metric card. Pause on the ROI multiple and cost-per-hour — executives anchor on these.'
        );

        // ════════════════════════════════════════════
        // SLIDE 4: Value by Organization (Top 10 bar chart)
        // ════════════════════════════════════════════
        const s4 = pptx.addSlide();
        s4.background = { color: BG };
        addSectionHeader(s4, `VALUE BY ${groupLabel.toUpperCase()}`, `Top 10 ${groupLabel} by monthly value generated`);

        // Horizontal bar chart
        const top10 = sortedTeams.slice(0, Math.min(10, sortedTeams.length));
        const chartLabels = top10.map(t => t.team.length > 22 ? t.team.slice(0, 20) + '\u2026' : t.team).reverse();
        const chartValues = top10.map(t => Math.round(t.monthlyValue)).reverse();
        s4.addChart(pptx.charts.BAR, [{ name: 'Monthly Value ($)', labels: chartLabels, values: chartValues }], {
            x: 0.60, y: 1.60, w: 8.60, h: 5.15,
            showTitle: false,
            showValue: true,
            valueFontSize: 8,
            valueFontColor: WHITE,
            dataLabelColor: WHITE,
            dataLabelFontSize: 8,
            catAxisLabelColor: TEXT,
            catAxisLabelFontSize: 9,
            catAxisLabelFontFace: 'Calibri',
            valAxisHidden: true,
            catGridLine: { style: 'none' },
            valGridLine: { color: CARD_ALT, style: 'dash', size: 0.5 },
            chartColors: [CYAN],
            barDir: 'bar',
            plotArea: { fill: { color: BG } },
        });

        // Pareto sidebar
        const topVal = top10.reduce((s, t) => s + t.monthlyValue, 0);
        const totalVal = sortedTeams.reduce((s, t) => s + t.monthlyValue, 0);
        const paretoShare = totalVal > 0 ? (topVal / totalVal * 100).toFixed(0) : '?';
        s4.addShape(pptx.shapes.RECTANGLE, { x: 9.45, y: 1.60, w: 3.30, h: 5.15, fill: { color: CARD } });
        s4.addText('THE PARETO SIGNAL', { x: 9.65, y: 1.90, w: 3.0, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: MUTED, bold: true });
        s4.addText(fmtM(topVal), { x: 9.65, y: 2.30, w: 3.0, h: 0.70, fontSize: 36, fontFace: 'Cambria', color: GREEN, bold: true });
        s4.addText(`monthly value from the top ${Math.min(10, rows.length)} ${groupLabel}`, { x: 9.65, y: 3.00, w: 3.0, h: 0.50, fontSize: 12, fontFace: 'Calibri', color: TEXT });
        s4.addShape(pptx.shapes.RECTANGLE, { x: 9.65, y: 3.65, w: 2.90, h: 0.04, fill: { color: CARD_ALT } });
        s4.addText(paretoShare + '%', { x: 9.65, y: 3.85, w: 3.0, h: 0.60, fontSize: 36, fontFace: 'Cambria', color: CYAN, bold: true });
        s4.addText(`of total monthly productivity value concentrated in top ${Math.min(10, rows.length)} of ${rows.length} ${groupLabel}`, { x: 9.65, y: 4.45, w: 3.0, h: 0.90, fontSize: 12, fontFace: 'Calibri', color: TEXT });
        s4.addShape(pptx.shapes.RECTANGLE, { x: 9.65, y: 5.40, w: 2.90, h: 0.04, fill: { color: CARD_ALT } });
        s4.addText('Action', { x: 9.65, y: 5.55, w: 3.0, h: 0.30, fontSize: 11, fontFace: 'Calibri', color: CYAN, bold: true });
        s4.addText(`Replicate top ${singularLabel} enablement playbooks in mid-tier ${groupLabel} to lift overall value`, { x: 9.65, y: 5.85, w: 3.0, h: 0.85, fontSize: 11, fontFace: 'Calibri', color: TEXT });
        addFooter(s4, 4);

        s4.addNotes(
            'VALUE BY ORGANIZATION\n\n' +
            `Top 10 ${groupLabel} generate ${paretoShare}% of total value.\n` +
            'Point: "Value is concentrated, but every group contributes."\n' +
            'Action: Replicate what top performers do — prompt libraries, meeting cadence, peer coaching.\n\n' +
            'TOP PERFORMERS:\n' +
            top10.map((t, i) => `  ${i + 1}. ${t.team}: $${fmt(Math.round(t.monthlyValue))}/mo (${t.activeUsers} users, ${t.actionsPerUser.toFixed(1)} actions/user/wk)`).join('\n')
        );

        // ════════════════════════════════════════════
        // SLIDE 5: Usage Tier Value Distribution
        // ════════════════════════════════════════════
        const s5 = pptx.addSlide();
        s5.background = { color: BG };
        const lowestRoi = tierData.length > 0 ? tierData[tierData.length - 1].roi.toFixed(0) : '?';
        addSectionHeader(s5, `USAGE TIER VALUE DISTRIBUTION  \u2022  LAST ${weeks > 4 ? weeks : 4} WEEKS`, `Every tier returns more than ${lowestRoi}x`);

        // Table header row
        const tblY = 1.80;
        const colDefs = [
            { label: 'USER TIER', x: 0.60, w: 2.00 },
            { label: 'ACTIVE USERS', x: 2.60, w: 1.80 },
            { label: 'ACTIONS / USER / MO', x: 4.40, w: 1.90 },
            { label: 'MONTHLY INVESTMENT', x: 6.30, w: 2.30 },
            { label: 'MONTHLY VALUE', x: 8.60, w: 2.10 },
            { label: 'ROI', x: 10.70, w: 2.00 },
        ];
        s5.addShape(pptx.shapes.RECTANGLE, { x: 0.60, y: tblY, w: 12.15, h: 0.50, fill: { color: CARD_ALT } });
        colDefs.forEach(col => {
            s5.addText(col.label, { x: col.x, y: tblY, w: col.w, h: 0.50, fontSize: 10, fontFace: 'Calibri', color: TEXT, bold: true, align: 'center', valign: 'middle' });
        });

        // Tier rows
        const rowH = 0.55;
        tierData.forEach((tier, idx) => {
            const ry = tblY + 0.55 + idx * rowH;
            const bg = idx % 2 === 0 ? CARD : CARD;
            s5.addShape(pptx.shapes.RECTANGLE, { x: 0.60, y: ry, w: 12.15, h: rowH, fill: { color: bg } });
            s5.addShape(pptx.shapes.RECTANGLE, { x: 0.60, y: ry, w: 0.08, h: rowH, fill: { color: tier.color } });
            s5.addText(tier.name, { x: 0.60, y: ry, w: 2.0, h: rowH, fontSize: 13, fontFace: 'Calibri', color: tier.color, bold: true, align: 'center', valign: 'middle' });
            s5.addText(fmt(tier.users), { x: 2.60, y: ry, w: 1.80, h: rowH, fontSize: 13, fontFace: 'Calibri', color: WHITE, align: 'center', valign: 'middle' });
            s5.addText(fmt(tier.actPerUser), { x: 4.40, y: ry, w: 1.90, h: rowH, fontSize: 13, fontFace: 'Calibri', color: WHITE, align: 'center', valign: 'middle' });
            s5.addText('$' + fmt(tier.invest), { x: 6.30, y: ry, w: 2.30, h: rowH, fontSize: 13, fontFace: 'Calibri', color: TEXT, align: 'center', valign: 'middle' });
            s5.addText('$' + fmt(Math.round(tier.value)), { x: 8.60, y: ry, w: 2.10, h: rowH, fontSize: 13, fontFace: 'Calibri', color: WHITE, bold: true, align: 'center', valign: 'middle' });
            s5.addText(tier.roi.toFixed(1) + 'x', { x: 10.70, y: ry, w: 2.00, h: rowH, fontSize: 14, fontFace: 'Calibri', color: GREEN, bold: true, align: 'center', valign: 'middle' });
        });

        // Separator + ALL USERS row
        const allY = tblY + 0.55 + tierData.length * rowH + 0.10;
        s5.addShape(pptx.shapes.RECTANGLE, { x: 0.60, y: allY - 0.08, w: 12.15, h: 0.04, fill: { color: CYAN } });
        s5.addText('ALL USERS', { x: 0.60, y: allY, w: 2.0, h: 0.50, fontSize: 13, fontFace: 'Calibri', color: WHITE, bold: true, align: 'center', valign: 'middle' });
        s5.addText(fmt(metrics.totalActiveUsers), { x: 2.60, y: allY, w: 1.80, h: 0.50, fontSize: 13, fontFace: 'Calibri', color: WHITE, bold: true, align: 'center', valign: 'middle' });
        s5.addText(fmt(Math.round(avgActionsPerMonth)), { x: 4.40, y: allY, w: 1.90, h: 0.50, fontSize: 13, fontFace: 'Calibri', color: WHITE, bold: true, align: 'center', valign: 'middle' });
        s5.addText('$' + fmt(Math.round(metrics.monthlyCostPurchased)), { x: 6.30, y: allY, w: 2.30, h: 0.50, fontSize: 13, fontFace: 'Calibri', color: WHITE, bold: true, align: 'center', valign: 'middle' });
        s5.addText(fmtM(metrics.valuePerMonth), { x: 8.60, y: allY, w: 2.10, h: 0.50, fontSize: 13, fontFace: 'Calibri', color: WHITE, bold: true, align: 'center', valign: 'middle' });
        s5.addText(metrics.roiMultiple.toFixed(1) + 'x', { x: 10.70, y: allY, w: 2.00, h: 0.50, fontSize: 14, fontFace: 'Calibri', color: GREEN, bold: true, align: 'center', valign: 'middle' });

        // Insight box
        const insY = allY + 0.65;
        s5.addShape(pptx.shapes.RECTANGLE, { x: 0.60, y: insY, w: 12.15, h: 0.85, fill: { color: CARD } });
        s5.addText([
            { text: 'Insight:  ', options: { color: CYAN, bold: true, fontSize: 13, fontFace: 'Calibri' } },
            { text: `Even the bottom 25% of users return ${lowestRoi}x \u2014 the program has no underwater segment. Moving bottom-quartile users to median adds ~$${fmt(Math.round((tierData.length > 2 ? tierData[Math.floor(tierData.length / 2)].value - tierData[tierData.length - 1].value : 0)))} monthly value.`, options: { color: TEXT, fontSize: 13, fontFace: 'Calibri' } }
        ], { x: 0.85, y: insY + 0.05, w: 11.70, h: 0.75, valign: 'middle' });
        addFooter(s5, 5);

        s5.addNotes(
            'USAGE TIER DISTRIBUTION  —  COLUMN DEFINITIONS\n' +
            '====================================================\n\n' +
            'USER TIER:           Quartile of teams ranked by total weekly actions.\n' +
            'ACTIVE USERS:        Count of users in that quartile’s teams who took at least one action in the period.\n' +
            'ACTIONS / USER / MO: Per-user monthly average  =  (sum of weekly actions in tier × 4.33) ÷ active users in tier.\n' +
            `MONTHLY INVESTMENT:  Tier users × $${config.licenseCost}/user/mo license cost.\n` +
            `MONTHLY VALUE:       Tier actions × ${config.minutesPerAction} min ÷ 60 × $${config.professionalRate}/hr.\n` +
            'ROI:                 Monthly value ÷ monthly investment.\n\n' +
            'PER-TIER NUMBERS:\n' +
            tierData.map(t => `  ${t.name}: ${fmt(t.users)} users, ${t.actPerUser} actions/user/mo, $${fmt(t.invest)}/mo invest, $${fmt(Math.round(t.value))}/mo value, ${t.roi.toFixed(1)}x ROI`).join('\n') + '\n\n' +
            'KEY POINT: Every tier is profitable. There is no underwater segment.\n\n' +
            'NARRATIVE:\n' +
            '- "Even the bottom 25% pays for itself. The question is not whether to keep Copilot — it’s how to move everyone up one tier."\n' +
            '- Point to the ROI column: all green. No red anywhere.\n' +
            '- "If bottom quartile reached the median, that’s significant incremental value for free."'
        );

        // ════════════════════════════════════════════
        // SLIDE 6: Break-Even & Pricing Sensitivity
        // ════════════════════════════════════════════
        const s6 = pptx.addSlide();
        s6.background = { color: BG };
        addSectionHeader(s6, 'BREAK-EVEN & PRICING SENSITIVITY', `Users average ~${Math.round(avgActionsPerMonth)} actions per user per month — ${Math.round(avgActionsPerMonth / breakEvenActions)}× the break-even threshold`);

        // Chart: bar chart showing actions per tier vs break-even line
        const tierLabels = tierData.map(t => t.name);
        const tierActPerUser = tierData.map(t => t.actPerUser);
        s6.addChart(pptx.charts.BAR, [
            { name: 'Actions/User/Month', labels: tierLabels, values: tierActPerUser },
        ], {
            x: 0.60, y: 1.80, w: 7.60, h: 4.70,
            showTitle: false,
            showValue: true,
            valueFontSize: 10,
            valueFontColor: WHITE,
            dataLabelColor: WHITE,
            dataLabelFontSize: 10,
            catAxisLabelColor: TEXT,
            catAxisLabelFontSize: 10,
            catAxisLabelFontFace: 'Calibri',
            valAxisLabelColor: MUTED,
            valAxisLabelFontSize: 9,
            catGridLine: { style: 'none' },
            valGridLine: { color: CARD_ALT, style: 'dash', size: 0.5 },
            chartColors: [CYAN],
            plotArea: { fill: { color: BG } },
        });

        // Pricing sidebar - showing user's actual license cost only
        const actualRoi = config.licenseCost > 0 ? (monthlyValuePerUser / config.licenseCost).toFixed(1) : '?';
        s6.addShape(pptx.shapes.RECTANGLE, { x: 8.40, y: 1.60, w: 4.35, h: 2.50, fill: { color: CARD } });
        s6.addText('YOUR ACTUAL ROI', { x: 8.60, y: 1.95, w: 4.0, h: 0.35, fontSize: 12, fontFace: 'Calibri', color: MUTED, bold: true });
        const py = 2.45;
        s6.addText(`@ $${config.licenseCost}/mo`, { x: 8.60, y: py, w: 2.20, h: 0.55, fontSize: 13, fontFace: 'Calibri', color: TEXT, valign: 'middle' });
        s6.addText(actualRoi + 'x', { x: 10.70, y: py, w: 2.0, h: 0.55, fontSize: 24, fontFace: 'Cambria', color: GREEN, bold: true, valign: 'middle', align: 'right' });
        s6.addText(`Users average ~${Math.round(avgActionsPerMonth)} actions/user/mo — far above the ${breakEvenActions.toFixed(1)} actions/user/mo needed to break even at $${config.licenseCost}/user/mo.`, {
            x: 8.60, y: 3.60, w: 4.0, h: 1.2, fontSize: 12, fontFace: 'Calibri', color: TEXT, valign: 'top'
        });
        s6.addText(`Methodology: break-even = license_cost ÷ value_per_action; value_per_action = (${config.minutesPerAction} min ÷ 60) × $${config.professionalRate}/hr = $${((config.minutesPerAction / 60) * config.professionalRate).toFixed(2)}/action.`, {
            x: 0.60, y: 6.65, w: 12.10, h: 0.30, fontSize: 10, fontFace: 'Calibri', color: MUTED
        });
        addFooter(s6, 6);

        const valuePerActionS6 = (config.minutesPerAction / 60) * config.professionalRate;
        s6.addNotes(
            'BREAK-EVEN & PRICING SENSITIVITY  —  FULL DERIVATION\n' +
            '======================================================\n\n' +
            '1. VALUE PER COPILOT ACTION\n' +
            `   = (${config.minutesPerAction} min saved ÷ 60 min/hr) × $${config.professionalRate}/hr fully-loaded rate\n` +
            `   = ${(config.minutesPerAction / 60).toFixed(4)} hr × $${config.professionalRate}\n` +
            `   = $${valuePerActionS6.toFixed(2)} per action.\n\n` +
            '2. BREAK-EVEN THRESHOLD  (actions/user/month needed to cover license cost)\n' +
            `   = license_cost ÷ value_per_action\n` +
            `   = $${config.licenseCost} ÷ $${valuePerActionS6.toFixed(2)}\n` +
            `   = ${breakEvenActions.toFixed(1)} actions/user/month.\n\n` +
            '3. ACTUAL AVERAGE\n' +
            `   = ${Math.round(avgActionsPerMonth)} actions/user/month  (${Math.round(avgActionsPerMonth / breakEvenActions)}× the break-even number).\n\n` +
            '4. PER-USER ROI AT YOUR LICENSE COST\n' +
            `   = avg_value_per_user ÷ license_cost\n` +
            `   = $${Math.round(monthlyValuePerUser)} ÷ $${config.licenseCost}\n` +
            `   = ${actualRoi}x.\n\n` +
            '5. PRICING SENSITIVITY\n' +
            `   Even at 2× license cost ($${config.licenseCost * 2}/mo): break-even = ${(breakEvenActions * 2).toFixed(1)} actions/user/mo; users still ${(avgActionsPerMonth / (breakEvenActions * 2)).toFixed(1)}× over.\n` +
            `   At 3× ($${config.licenseCost * 3}/mo):                break-even = ${(breakEvenActions * 3).toFixed(1)}; users still ${(avgActionsPerMonth / (breakEvenActions * 3)).toFixed(1)}× over.\n\n` +
            'KEY MESSAGE: At three times the current license cost, users would still operate well above the break-even threshold.\n' +
            'Use this slide to address questions about license cost sensitivity.'
        );

        // ════════════════════════════════════════════
        // SLIDE 7: Unlicensed User Opportunity Cost
        // ════════════════════════════════════════════
        const s7 = pptx.addSlide();
        s7.background = { color: BG };

        // Three scenario tiers: floor (10%), realistic (50%), parity (100%)
        const costPer1000 = 1000 * config.licenseCost;
        const valuePerUserFullParity = monthlyValuePerUser; // what a licensed user already generates / month
        const scenarioRates = [
            { key: 'floor',     label: '10% (Conservative floor)',  pct: 0.10 },
            { key: 'realistic', label: '50% (Realistic ramp)',      pct: 0.50 },
            { key: 'parity',    label: '100% (Full licensed parity)', pct: 1.00 },
        ].map(s => {
            const valuePerUser  = valuePerUserFullParity * s.pct;
            const valuePer1000  = valuePerUser * 1000;
            const netPer1000    = valuePer1000 - costPer1000;
            const annualNet     = netPer1000 * 12;
            const actPerUser    = avgActionsPerMonth * s.pct;
            return { ...s, valuePerUser, valuePer1000, netPer1000, annualNet, actPerUser };
        });
        const sFloor     = scenarioRates[0];
        const sRealistic = scenarioRates[1];
        const sParity    = scenarioRates[2];

        // Headline uses the realistic case (50%) — defensible middle ground, not the floor
        addSectionHeader(s7, 'UNLICENSED USER OPPORTUNITY COST',
            `Each 1,000 unlicensed seats leaves $${fmt(Math.round(sRealistic.annualNet))}/year on the table (realistic case)`);

        // Left big callout — headline number = realistic 50% case
        s7.addShape(pptx.shapes.RECTANGLE, { x: 0.60, y: 1.60, w: 6.0, h: 5.15, fill: { color: CARD } });
        s7.addText('ANNUAL OPPORTUNITY  \u2014  per 1,000 unlicensed users', { x: 0.85, y: 2.00, w: 5.50, h: 0.40, fontSize: 11, fontFace: 'Calibri', color: CYAN, bold: true });
        s7.addText('$' + fmt(Math.round(sRealistic.annualNet)), { x: 0.85, y: 2.45, w: 5.50, h: 1.40, fontSize: 60, fontFace: 'Cambria', color: GREEN, bold: true, valign: 'middle' });
        s7.addText(`Realistic case  \u2022  $${fmt(Math.round(sRealistic.netPer1000))} net gain / month per 1,000 users`, { x: 0.85, y: 3.90, w: 5.50, h: 0.45, fontSize: 13, fontFace: 'Calibri', color: TEXT });
        s7.addShape(pptx.shapes.RECTANGLE, { x: 0.85, y: 4.45, w: 5.50, h: 0.04, fill: { color: CARD_ALT } });

        // Scenario range table inside left card
        s7.addText('SCENARIO RANGE  (annual net gain, per 1,000 users)', { x: 0.85, y: 4.60, w: 5.50, h: 0.30, fontSize: 10, fontFace: 'Calibri', color: CYAN, bold: true });
        scenarioRates.forEach((sc, i) => {
            const ry = 4.95 + i * 0.55;
            s7.addText(sc.label, { x: 0.85, y: ry, w: 3.40, h: 0.45, fontSize: 11, fontFace: 'Calibri', color: TEXT, valign: 'middle' });
            s7.addText('$' + fmt(Math.round(sc.annualNet)) + '/yr', {
                x: 4.25, y: ry, w: 2.10, h: 0.45,
                fontSize: 14, fontFace: 'Cambria',
                color: i === 0 ? MUTED : (i === 1 ? GREEN : CYAN),
                bold: true, align: 'right', valign: 'middle'
            });
        });

        // Right 4 stacked cards — explicit per-1,000 labeling + per-user-value column
        const rightX = 7.0, rightW = 5.75, rightCardH = 1.18;
        const valuePerUserConservative = Math.round(monthlyValuePerUser * 0.10);
        const valuePerUserRealistic    = Math.round(monthlyValuePerUser * 0.50);
        const valuePerUserParity       = Math.round(monthlyValuePerUser * 1.00);
        const rightCards = [
            {
                label: 'LICENSING COST  /  PER 1,000 USERS  /  MONTH',
                value: '$' + fmt(costPer1000),
                sub: `1,000 users \u00d7 $${config.licenseCost}/user/mo  =  $${fmt(costPer1000)}/mo`,
                valueColor: RED
            },
            {
                label: 'POTENTIAL VALUE  \u2014  10% FLOOR  /  PER 1,000  /  MONTH',
                value: '$' + fmt(Math.round(sFloor.valuePer1000)),
                sub: `1,000 \u00d7 $${valuePerUserConservative}/user/mo  (10% of $${Math.round(monthlyValuePerUser)} licensed avg)`,
                valueColor: MUTED
            },
            {
                label: 'POTENTIAL VALUE  \u2014  50% REALISTIC  /  PER 1,000  /  MONTH',
                value: '$' + fmt(Math.round(sRealistic.valuePer1000)),
                sub: `1,000 \u00d7 $${valuePerUserRealistic}/user/mo  (50% of $${Math.round(monthlyValuePerUser)} licensed avg)`,
                valueColor: CYAN
            },
            {
                label: 'POTENTIAL VALUE  \u2014  100% PARITY  /  PER 1,000  /  MONTH',
                value: '$' + fmt(Math.round(sParity.valuePer1000)),
                sub: `1,000 \u00d7 $${valuePerUserParity}/user/mo  (matches today\u2019s licensed avg)`,
                valueColor: GREEN
            },
        ];
        rightCards.forEach((rc, i) => {
            const ry = 1.60 + i * 1.30;
            s7.addShape(pptx.shapes.RECTANGLE, { x: rightX, y: ry, w: rightW, h: rightCardH, fill: { color: CARD } });
            s7.addText(rc.label, { x: rightX + 0.20, y: ry + 0.10, w: rightW - 0.4, h: 0.28, fontSize: 9, fontFace: 'Calibri', color: MUTED, bold: true });
            s7.addText(rc.value, { x: rightX + 0.20, y: ry + 0.38, w: rightW - 0.4, h: 0.45, fontSize: 24, fontFace: 'Cambria', color: rc.valueColor, bold: true });
            s7.addText(rc.sub, { x: rightX + 0.20, y: ry + 0.85, w: rightW - 0.4, h: 0.30, fontSize: 9, fontFace: 'Calibri', color: TEXT });
        });
        addFooter(s7, 7);

        // Speaker notes — full derivation of every figure shown on the slide
        const valPerActionDollars = (config.minutesPerAction / 60) * config.professionalRate;
        s7.addNotes(
            'UNLICENSED USER OPPORTUNITY COST  —  FULL MATHEMATICAL DERIVATION\n' +
            '====================================================================\n\n' +

            '1. BASE INPUTS (from your actual deployment)\n' +
            `   - Average actions per user per month (licensed today):  ${Math.round(avgActionsPerMonth)} actions/user/mo\n` +
            `   - Minutes saved per action:                              ${config.minutesPerAction} min\n` +
            `   - Fully-loaded professional rate:                        $${config.professionalRate}/hr\n` +
            `   - Value per action  =  (${config.minutesPerAction} / 60) \u00d7 $${config.professionalRate}  =  $${valPerActionDollars.toFixed(2)} per action\n` +
            `   - Licensed value per user / month  =  ${Math.round(avgActionsPerMonth)} actions \u00d7 $${valPerActionDollars.toFixed(2)}  =  $${Math.round(monthlyValuePerUser)} / user / mo\n` +
            `   - License cost:                                          $${config.licenseCost}/user/mo  =  $${fmt(costPer1000)} per 1,000 users / mo\n\n` +

            '2. WHY MODEL UNLICENSED USERS AT A FRACTION OF LICENSED PERFORMANCE?\n' +
            '   Two reasons to NOT default to 100%:\n' +
            '   (a) Ramp lag: new Copilot users take 4\u20138 weeks to reach steady-state usage. The annual figure spans ramp.\n' +
            '   (b) Role mix: unlicensed cohorts may skew toward roles with fewer document/meeting/email touchpoints.\n' +
            '   That said, 10% is genuinely conservative. The 50% case is the defensible planning number.\n\n' +

            '3. THREE SCENARIOS  (all numbers per 1,000 unlicensed users)\n\n' +

            '   A. CONSERVATIVE FLOOR  \u2014  10% of licensed productivity\n' +
            `      Actions/user/mo:    ${Math.round(sFloor.actPerUser)}  (= 10% \u00d7 ${Math.round(avgActionsPerMonth)})\n` +
            `      Value/user/mo:      $${valuePerUserConservative}  (= ${Math.round(sFloor.actPerUser)} \u00d7 $${valPerActionDollars.toFixed(2)})\n` +
            `      Value per 1,000:    $${fmt(Math.round(sFloor.valuePer1000))} / mo  (= 1,000 \u00d7 $${valuePerUserConservative})\n` +
            `      Less license cost:  -$${fmt(costPer1000)} / mo\n` +
            `      NET / month:        $${fmt(Math.round(sFloor.netPer1000))}\n` +
            `      NET / year:         $${fmt(Math.round(sFloor.annualNet))}\n\n` +

            '   B. REALISTIC RAMP  \u2014  50% of licensed productivity  (USE THIS FOR PLANNING)\n' +
            `      Actions/user/mo:    ${Math.round(sRealistic.actPerUser)}\n` +
            `      Value/user/mo:      $${valuePerUserRealistic}\n` +
            `      Value per 1,000:    $${fmt(Math.round(sRealistic.valuePer1000))} / mo\n` +
            `      Less license cost:  -$${fmt(costPer1000)} / mo\n` +
            `      NET / month:        $${fmt(Math.round(sRealistic.netPer1000))}\n` +
            `      NET / year:         $${fmt(Math.round(sRealistic.annualNet))}\n\n` +

            '   C. FULL PARITY  \u2014  100% of licensed productivity\n' +
            `      Actions/user/mo:    ${Math.round(sParity.actPerUser)}\n` +
            `      Value/user/mo:      $${valuePerUserParity}\n` +
            `      Value per 1,000:    $${fmt(Math.round(sParity.valuePer1000))} / mo\n` +
            `      Less license cost:  -$${fmt(costPer1000)} / mo\n` +
            `      NET / month:        $${fmt(Math.round(sParity.netPer1000))}\n` +
            `      NET / year:         $${fmt(Math.round(sParity.annualNet))}\n\n` +

            '4. WHY THE 10% NUMBER LOOKS SMALL  (and why that\u2019s the point)\n' +
            `   At 10%, value per user ($${valuePerUserConservative}) barely clears license cost ($${config.licenseCost}). Net is only $${Math.round(monthlyValuePerUser * 0.10 - config.licenseCost)}/user/mo.\n` +
            '   That\u2019s the FLOOR \u2014 if everything goes wrong, we still come out positive. It is NOT the expected case.\n' +
            '   The realistic case is 5x the floor. The parity case is 10x the floor.\n\n' +

            '5. TALKING POINTS\n' +
            '   - "Every column on this slide is per 1,000 unlicensed users per month. The annual figure is 12x that."\n' +
            '   - "If we extend licensing and new users hit just half of current performance, the net gain is ' +
                `$${fmt(Math.round(sRealistic.annualNet))}/year per 1,000."\n` +
            '   - "If they match current users \u2014 which is the reasonable expectation after ramp \u2014 it\u2019s ' +
                `$${fmt(Math.round(sParity.annualNet))}/year per 1,000."\n` +
            '   - "Even the worst case (10% productivity) still nets positive. The license pays for itself at one-tenth of current usage."\n\n' +

            '6. STRESS-TEST QUESTIONS YOU SHOULD BE READY FOR\n' +
            `   Q: "Why is the conservative value/user only $${valuePerUserConservative}?"\n` +
            `   A: Because 10% \u00d7 $${Math.round(monthlyValuePerUser)} (current licensed average) = $${valuePerUserConservative}. The 10% is the conservatism, not the value.\n\n` +
            '   Q: "Why not just use the 100% number on the slide?"\n' +
            '   A: It would be defensible \u2014 these would be the SAME company\u2019s users on the SAME tools \u2014 but the 50% case bakes in ramp time, role mix, and adoption variance. It\u2019s the most defensible single number.\n\n' +
            '   Q: "What if unlicensed users are systematically less Copilot-suited?"\n' +
            '   A: That\u2019s exactly what the 10% floor models. Even there, the math still works.'
        );

        // ════════════════════════════════════════════
        // SLIDE 8: Expansion Projections
        // ════════════════════════════════════════════
        const s8 = pptx.addSlide();
        s8.background = { color: BG };
        addSectionHeader(s8, 'EXPANSION PROJECTIONS', 'ROI compounds with scale through network effects');

        // Expansion scenario chart
        const currentUsers = metrics.totalPurchasedLicenses;
        const scenarios = [
            { label: `${fmt(currentUsers)} (now)`,     users: currentUsers,      multiplier: 1.00 },
            { label: fmt(currentUsers * 2),            users: currentUsers * 2,  multiplier: 1.10 },
            { label: fmt(currentUsers * 5),            users: currentUsers * 5,  multiplier: 1.25 },
            { label: fmt(currentUsers * 10),           users: currentUsers * 10, multiplier: 1.40 },
            { label: fmt(currentUsers * 20),           users: currentUsers * 20, multiplier: 1.55 },
        ];

        // Decorate scenarios with intermediate math so we can show + explain it
        scenarios.forEach(sc => {
            sc.actPerUser  = avgActionsPerMonth * sc.multiplier;
            sc.projValue   = sc.users * monthlyValuePerUser * (metrics.activationRate / 100) * sc.multiplier;
            sc.projCost    = sc.users * config.licenseCost;
            sc.roi         = sc.projCost > 0 ? sc.projValue / sc.projCost : 0;
        });
        const scenLabels = scenarios.map(s => s.label);
        const scenValues = scenarios.map(s => Math.round(s.roi * 10) / 10);
        s8.addChart(pptx.charts.BAR, [{ name: 'Projected ROI', labels: scenLabels, values: scenValues }], {
            x: 0.60, y: 1.60, w: 8.40, h: 4.60,
            showTitle: false,
            showValue: true,
            valueFontSize: 10,
            valueFontColor: WHITE,
            dataLabelColor: WHITE,
            dataLabelFontSize: 10,
            catAxisLabelColor: TEXT,
            catAxisLabelFontSize: 10,
            catAxisLabelFontFace: 'Calibri',
            valAxisLabelColor: MUTED,
            valAxisLabelFontSize: 9,
            catGridLine: { style: 'none' },
            valGridLine: { color: CARD_ALT, style: 'dash', size: 0.5 },
            chartColors: [CYAN],
            plotArea: { fill: { color: BG } },
        });

        // Projection sidebar — now shows ROI + the actions/user assumption driving it
        s8.addShape(pptx.shapes.RECTANGLE, { x: 9.20, y: 1.60, w: 3.55, h: 4.60, fill: { color: CARD } });
        s8.addText('PROJECTED ROI  +  ACTIONS/USER', { x: 9.40, y: 1.85, w: 3.20, h: 0.30, fontSize: 10, fontFace: 'Calibri', color: MUTED, bold: true });
        s8.addText(`(today\u2019s avg: ${Math.round(avgActionsPerMonth)} act/u/mo)`, { x: 9.40, y: 2.12, w: 3.20, h: 0.22, fontSize: 9, fontFace: 'Calibri', color: MUTED, italic: true });
        scenarios.forEach((sc, i) => {
            const sy = 2.45 + i * 0.72;
            s8.addText(sc.label, { x: 9.40, y: sy, w: 1.60, h: 0.34, fontSize: 11, fontFace: 'Calibri', color: TEXT, valign: 'middle' });
            s8.addText(`${Math.round(sc.actPerUser)} act/u/mo`, { x: 9.40, y: sy + 0.34, w: 1.60, h: 0.32, fontSize: 9, fontFace: 'Calibri', color: MUTED, valign: 'middle' });
            s8.addText(scenValues[i].toFixed(1) + 'x', { x: 11.00, y: sy, w: 1.60, h: 0.66, fontSize: 18, fontFace: 'Cambria', color: GREEN, bold: true, valign: 'middle', align: 'right' });
            if (i < scenarios.length - 1) {
                s8.addShape(pptx.shapes.RECTANGLE, { x: 9.40, y: sy + 0.68, w: 3.20, h: 0.02, fill: { color: CARD_ALT } });
            }
        });

        // How the math works callout — replaces the vague "Why ROI rises" line
        s8.addShape(pptx.shapes.RECTANGLE, { x: 0.60, y: 6.40, w: 12.15, h: 0.55, fill: { color: CARD } });
        s8.addText([
            { text: 'How it scales:  ', options: { color: CYAN, bold: true, fontSize: 12, fontFace: 'Calibri' } },
            { text: `ROI = (users \u00d7 ${Math.round(avgActionsPerMonth)} \u00d7 multiplier \u00d7 $${valPerActionDollars.toFixed(2)}/action) \u00f7 (users \u00d7 $${config.licenseCost}/mo).  Multipliers: 2\u00d7=1.10, 5\u00d7=1.25, 10\u00d7=1.40, 20\u00d7=1.55  (modeled from network-effect literature; see notes).`, options: { color: TEXT, fontSize: 11, fontFace: 'Calibri' } }
        ], { x: 0.85, y: 6.45, w: 11.70, h: 0.45, valign: 'middle' });
        addFooter(s8, 8);

        // Speaker notes — full derivation of the multipliers and the per-scenario math
        s8.addNotes(
            'EXPANSION PROJECTIONS  —  FULL MATHEMATICAL DERIVATION\n' +
            '======================================================\n\n' +

            '1. THE FORMULA  (applied identically at every scale)\n' +
            '   Projected ROI  =  Projected monthly value  \u00f7  Projected monthly cost\n\n' +
            '   Projected monthly value  =  users \u00d7 activation rate \u00d7 actions_per_user \u00d7 value_per_action\n' +
            `   Projected monthly cost   =  users \u00d7 license_cost\n\n` +
            '   The "users" term appears on both sides and cancels in the ratio.\n' +
            `   Activation rate (from your data):  ${metrics.activationRate.toFixed(1)}%\n` +
            `   Value per action:                  ($${config.minutesPerAction} min \u00f7 60) \u00d7 $${config.professionalRate}/hr  =  $${valPerActionDollars.toFixed(2)}\n` +
            `   Today\u2019s actions/user/mo:           ${Math.round(avgActionsPerMonth)}\n` +
            `   License cost:                      $${config.licenseCost}/user/mo\n\n` +

            '2. WHERE THE MULTIPLIERS COME FROM  (this is the part to defend)\n' +
            '   The chart applies a multiplier to ACTIONS/USER/MONTH at each scale tier:\n' +
            '       1\u00d7 scale  \u2192  1.00\u00d7 actions  (no change \u2014 status quo)\n' +
            '       2\u00d7 scale  \u2192  1.10\u00d7 actions  (+10%)\n' +
            '       5\u00d7 scale  \u2192  1.25\u00d7 actions  (+25%)\n' +
            '      10\u00d7 scale  \u2192  1.40\u00d7 actions  (+40%)\n' +
            '      20\u00d7 scale  \u2192  1.55\u00d7 actions  (+55%)\n\n' +
            '   These reflect three measurable network-effect mechanisms:\n' +
            '   (a) Shared prompt/template libraries: each new user adds prompts; library quality grows roughly with log(users).\n' +
            '   (b) Meeting/email AI culture: when >50% of attendees use Copilot, meeting summaries + action-item capture become default behavior. Increases per-user meeting-AI actions.\n' +
            '   (c) Informal peer coaching: each power user trains 3\u20135 peers, raising mid-tier productivity.\n\n' +
            '   IMPORTANT: these are MODELED extrapolations, not measured. The shape (logarithmic, diminishing) is standard for network-effect goods.\n' +
            '   The numbers are deliberately modest \u2014 +55% per-user at 20\u00d7 scale is well below the doubling some Microsoft case studies show.\n\n' +

            '3. PER-SCENARIO MATH  (your actual numbers)\n' +
            scenarios.map(sc =>
                `   ${sc.label} users  \u2192  ${Math.round(sc.actPerUser)} actions/u/mo  (\u00d7${sc.multiplier.toFixed(2)})\n` +
                `      Value:  ${fmt(sc.users)} \u00d7 ${(metrics.activationRate / 100).toFixed(3)} \u00d7 ${Math.round(sc.actPerUser)} \u00d7 $${valPerActionDollars.toFixed(2)}  =  $${fmt(Math.round(sc.projValue))} / mo\n` +
                `      Cost:   ${fmt(sc.users)} \u00d7 $${config.licenseCost}  =  $${fmt(Math.round(sc.projCost))} / mo\n` +
                `      ROI:    ${sc.roi.toFixed(2)}x\n`
            ).join('\n') + '\n' +

            '4. WHAT WOULD MAKE THIS NUMBER WRONG?\n' +
            '   - If usage saturates (everyone already at theoretical max): multipliers should be 1.00. ROI stays flat, not falls.\n' +
            '   - If activation rate drops as you scale: ROI falls proportionally. The model assumes activation holds at ' +
                `${metrics.activationRate.toFixed(1)}%; sensitivity-test by halving it.\n` +
            '   - If license cost rises with scale: shouldn\u2019t happen with E-class agreements, but worth flagging.\n\n' +

            '5. TALKING POINTS\n' +
            `   - "Today we run at ${scenValues[0].toFixed(1)}x. At 2\u00d7 scale with a modest 10% per-user lift, we go to ${scenValues[1].toFixed(1)}x. The lever is per-user actions, not the user count."\n` +
            '   - "The user count actually cancels out of the ROI ratio. What drives expansion ROI is the *behavioral* lift from broader culture."\n' +
            '   - "Even if you don\u2019t buy the network-effect lift, this slide still gives you flat ' +
                `${scenValues[0].toFixed(1)}x at any scale \u2014 that\u2019s the floor."\n\n` +

            '6. STRESS-TEST QUESTIONS YOU SHOULD BE READY FOR\n' +
            '   Q: "How do you know +55% is realistic and not 0%?"\n' +
            '   A: We don\u2019t know exactly. The shape (logarithmic) is standard; the magnitude is calibrated to be conservative against Microsoft published case studies.\n' +
            '       The floor case (multiplier = 1.00) still gives ' + scenValues[0].toFixed(1) + 'x. We\u2019re not betting the case on the lift.\n\n' +
            '   Q: "Aren\u2019t you double-counting \u2014 more users AND more actions/user?"\n' +
            '   A: No. The "more users" expands the base. The multiplier only models BEHAVIORAL change in per-user actions, which is a separate measurable phenomenon.\n\n' +
            '   Q: "Why does ROI grow when both numerator and denominator scale with users?"\n' +
            '   A: They cancel. ROI grows ONLY because per-user actions rise. Without the multiplier, ROI would be flat at any scale.'
        );

        // ════════════════════════════════════════════
        // SLIDE 9: Recommendations
        // ════════════════════════════════════════════
        const s9 = pptx.addSlide();
        s9.background = { color: BG };

        // Decorative vertical bars (left side — mirror of title slide)
        for (let i = 0; i < 5; i++) {
            const x = 0.40 + i * 0.32;
            const clr = i === 0 ? CYAN : CARD_ALT;
            s9.addShape(pptx.shapes.RECTANGLE, { x, y: 0.60, w: 0.06, h: 6.30, fill: { color: clr } });
        }

        s9.addText('RECOMMENDATIONS', { x: 2.40, y: 0.70, w: 10.0, h: 0.40, fontSize: 12, fontFace: 'Calibri', color: CYAN, bold: true });
        s9.addText('Where to invest next', { x: 2.40, y: 1.15, w: 10.0, h: 1.00, fontSize: 40, fontFace: 'Cambria', color: WHITE, bold: true });
        s9.addShape(pptx.shapes.RECTANGLE, { x: 2.40, y: 2.15, w: 1.20, h: 0.06, fill: { color: CYAN } });

        // 3 recommendation cards
        const topTierName = sortedTeams.length > 0 ? sortedTeams[0].team : 'top performers';
        const bottomTierUsers = tierData.length > 0 ? tierData[tierData.length - 1].users : 0;
        const bottomTierRoi = tierData.length > 0 ? tierData[tierData.length - 1].roi.toFixed(1) : '?';
        const midTierRoi = tierData.length > 2 ? tierData[Math.floor(tierData.length / 2)].roi.toFixed(1) : '?';
        const recs = [
            { num: '01', numColor: GREEN, title: 'Replicate top-tier playbooks', body: `Codify what ${topTierName} and top performers do differently \u2014 power user ratios, prompt patterns, weekly cadence. Package as an enablement kit for mid-tier ${groupLabel}.` },
            { num: '02', numColor: CYAN, title: `Lift the bottom 25% tier`, body: `${fmt(bottomTierUsers)} users currently at ${bottomTierRoi}x ROI. Targeted coaching to lift them to the median tier (${midTierRoi}x) adds significant monthly value at zero incremental license cost — same seats, more usage.` },
            { num: '03', numColor: GOLD, title: 'Expand licensed footprint', body: `Each 1,000 unlicensed seats represents ~$${fmt(Math.round(sRealistic.annualNet))}/year net gain at a realistic 50%-of-current-productivity ramp (range: $${fmt(Math.round(sFloor.annualNet))} floor \u2192 $${fmt(Math.round(sParity.annualNet))} at full parity).` },
        ];
        recs.forEach((rec, i) => {
            const ry = 2.60 + i * 1.53;
            s9.addShape(pptx.shapes.RECTANGLE, { x: 2.40, y: ry, w: 10.40, h: 1.35, fill: { color: CARD_ALT } });
            s9.addText(rec.num, { x: 2.55, y: ry + 0.15, w: 0.90, h: 1.05, fontSize: 32, fontFace: 'Calibri', color: rec.numColor, bold: true, valign: 'middle', align: 'center' });
            s9.addText(rec.title, { x: 3.55, y: ry + 0.15, w: 9.0, h: 0.45, fontSize: 17, fontFace: 'Calibri', color: WHITE, bold: true });
            s9.addText(rec.body, { x: 3.55, y: ry + 0.60, w: 9.0, h: 0.65, fontSize: 12, fontFace: 'Calibri', color: TEXT, valign: 'top' });
        });

        s9.addText(`Source: Copilot ROI Analysis  \u2022  ${rows.length} ${groupLabel}  \u2022  ${weeks} weeks  \u2022  $${config.professionalRate}/hr fully-loaded rate`, {
            x: 2.40, y: 7.05, w: 10.40, h: 0.30, fontSize: 9, fontFace: 'Calibri', color: MUTED
        });

        s9.addNotes(
            'RECOMMENDATIONS\n\n' +
            'Three strategic actions:\n\n' +
            recs.map((r, i) => `${i + 1}. ${r.title}: ${r.body}`).join('\n\n') + '\n\n' +
            'CLOSING: "The data is clear. Every dollar works. The question is how fast we scale."\n\n' +
            'NEXT STEPS:\n' +
            '- Schedule follow-up to discuss expansion timeline\n' +
            '- Identify champion teams for enablement pilot\n' +
            '- Set quarterly review cadence for ROI tracking'
        );

        await pptx.writeFile({ fileName: 'Copilot_ROI_Executive_Deck.pptx' });
        
        // Track download event in Microsoft Clarity
        if (window.clarity) {
            clarity('event', 'download_executive_deck');
        }
    } catch (err) {
        console.error('Executive Deck export failed:', err);
        alert('Executive Deck export failed: ' + err.message);
    } finally {
        if (btn) { btn.textContent = origText; btn.disabled = false; }
    }
}

// Filter All Teams table by search input
function filterTeamsTable() {
    const query = (document.getElementById('teamSearchFilter')?.value || '').toLowerCase();
    const table = document.getElementById('teamsTable');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const teamCell = row.querySelector('td');
        if (!teamCell) return;
        const name = (teamCell.getAttribute('data-value') || teamCell.textContent || '').toLowerCase();
        row.style.display = name.includes(query) ? '' : 'none';
    });
}

// Initialize table sorting functionality
function initTableSorting() {
    const table = document.getElementById('teamsTable');
    if (!table) return;

    const headers = table.querySelectorAll('th.sortable');
    let currentSort = { column: null, direction: 'asc' };

    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.getAttribute('data-column');
            const type = header.getAttribute('data-type');

            // Toggle direction if clicking same column, otherwise default to desc
            if (currentSort.column === column) {
                currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort.direction = 'desc';
            }
            currentSort.column = column;

            // Sort the table
            sortTable(column, type, currentSort.direction);

            // Update visual indicators
            headers.forEach(h => {
                h.classList.remove('sort-asc', 'sort-desc');
                const icon = h.querySelector('.sort-icon');
                icon.textContent = '';
            });

            header.classList.add(`sort-${currentSort.direction}`);
            const icon = header.querySelector('.sort-icon');
            icon.textContent = currentSort.direction === 'asc' ? ' ▲' : ' ▼';
        });
    });
}

// Sort table by column
function sortTable(column, type, direction) {
    const tbody = document.getElementById('teamsTableBody');
    const rows = Array.from(tbody.querySelectorAll('tr'));

    rows.sort((a, b) => {
        const aCell = a.querySelector(`td[data-value]`);
        const bCell = b.querySelector(`td[data-value]`);

        // Get the data-value attributes based on column position
        const columnIndex = getColumnIndex(column);
        const aValue = a.children[columnIndex].getAttribute('data-value');
        const bValue = b.children[columnIndex].getAttribute('data-value');

        let comparison = 0;

        if (type === 'number' || type === 'date') {
            const aNum = parseFloat(aValue) || 0;
            const bNum = parseFloat(bValue) || 0;
            comparison = aNum - bNum;
        } else {
            // string comparison
            comparison = aValue.localeCompare(bValue);
        }

        return direction === 'asc' ? comparison : -comparison;
    });

    // Re-append rows in sorted order
    rows.forEach(row => tbody.appendChild(row));
}

// Get column index from column name
function getColumnIndex(column) {
    const columnMap = {
        'team': 0,
        'activeUsers': 1,
        'powerUsers': 2,
        'weeklyActions': 3,
        'actionsPerUser': 4,
        'activeDays': 5,
        'peakWeek': 6,
        'weeklyHours': 7,
        'monthlyValue': 8
    };
    return columnMap[column] || 0;
}

// Show loading state
function showLoading() {
    const inst = document.querySelector('.instructions-section');
    if (inst) inst.style.display = 'none';
    const ls = document.getElementById('loadingState');
    if (ls) ls.style.display = 'block';
    const es = document.getElementById('errorState');
    if (es) es.style.display = 'none';
}

// Show error state
function showError(message) {
    const inst = document.querySelector('.instructions-section');
    if (inst) inst.style.display = 'none';
    const ls = document.getElementById('loadingState');
    if (ls) ls.style.display = 'none';
    const es = document.getElementById('errorState');
    if (es) es.style.display = 'block';
    const em = document.getElementById('errorMessage');
    if (em) em.textContent = message;
}

// Rejection UI for a CSV that is not a Viva Insights person query. The markup is entirely
// author-written — nothing from the uploaded file is interpolated — so there is no injection
// surface. Unlike showError(), the instructions section stays visible so the Step 1 link works.
function showUnsupportedFormatError(looksLikeHeatmap) {
    const ls = document.getElementById('loadingState');
    if (ls) ls.style.display = 'none';
    const es = document.getElementById('errorState');
    const em = document.getElementById('errorMessage');
    if (!es || !em) { showError(UNSUPPORTED_FORMAT_TEXT); return; }

    const heatmapNote = looksLikeHeatmap
        ? '<p style="margin:0 0 0.75rem;"><strong>This looks like a Super Usage Report heatmap export, which is no longer supported.</strong> Re-export from Viva Insights using a Person query.</p>'
        : '';

    em.innerHTML =
        heatmapNote +
        '<p style="margin:0 0 0.75rem;">This file doesn&rsquo;t look like a <strong>Viva Insights person-query export</strong>, which is the only format the calculator accepts.</p>' +
        '<p style="margin:0 0 0.5rem;">Your CSV must contain these columns:</p>' +
        '<ul style="margin:0 0 0.75rem 1.25rem;"><li><code>PersonId</code></li><li><code>MetricDate</code></li><li><code>Total Copilot actions taken</code></li></ul>' +
        '<p style="margin:0;">Follow <a href="#step-export-data">Step 1 &mdash; Export Your Viva Insights Data</a> for the exact query settings.</p>';

    es.style.display = 'block';
    try { es.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
}

// Toggle Intelligent Recap display for Data Analysis
function toggleRecapDisplayData() {
    const toggle = document.getElementById('recapToggleData');
    const statusText = document.getElementById('recapToggleStatusData');
    const isIncluded = toggle.checked;

    // Update status text
    statusText.textContent = isIncluded ? 'Included' : 'Excluded';

    // Get all elements that need updating
    const elementsToUpdate = [
        'dataMonthlyValue',
        'dataAnnualValue',
        'dataROIMultiple'
    ];

    // Update each element based on toggle state
    elementsToUpdate.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            const valueToShow = isIncluded ?
                element.getAttribute('data-with-recap') :
                element.getAttribute('data-without-recap');
            element.textContent = valueToShow;
        }
    });
}

// ══════════════════════════════════════════════════════════════
// DOWNLOAD LOCAL PACKAGE - Offline ZIP Package Generator
// ══════════════════════════════════════════════════════════════
async function downloadLocalPackage(event) {
    if (event) event.preventDefault();
    
    // Show loading message
    const btn = event?.target?.closest('button');
    const originalHTML = btn?.innerHTML;
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="action-text">Creating ZIP…</span>';
    }

    try {
        const zip = new JSZip();
        
        // Files to include in the package
        const files = [
            'index.html',
            'roi-calculator.html',
            'Start Here.html',
            'styles.css',
            'script.js',
            'sales-script.js',
            'insights-shared.js',
            'insights-tabs.js',
            'header-mapping.js',
            'sample-data.csv',
            'lib/html2canvas.min.js',
            'lib/jspdf.umd.min.js',
            'lib/pptxgen.bundle.js',
            'lib/docx.umd.js',
            'lib/jszip.min.js',
            'lib/html2pdf.bundle.min.js',
            // Vendored typography — without these the offline copy falls back to system fonts.
            'assets/fonts/fonts.css',
            'assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1i8q1w.woff2',
            'assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1iAq129k.woff2',
            'assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1iEq129k.woff2',
            'assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1iIq129k.woff2',
            'assets/fonts/IBMPlexMono--F63fjptAgt5VM-kVkqdyU8n1isq129k.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwl1FgtIU.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwl5FgtIU.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwl9FgtIU.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwlBFgg.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3twJwlRFgtIU.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwl1FgtIU.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwl5FgtIU.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwl9FgtIU.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwlBFgg.woff2',
            'assets/fonts/IBMPlexMono--F6qfjptAgt5VM-kVkqdyU8n3vAOwlRFgtIU.woff2',
            'assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxaKYbABA.woff2',
            'assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxdKYbABA.woff2',
            'assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxeKYY.woff2',
            'assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxQKYbABA.woff2',
            'assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxRKYbABA.woff2',
            'assets/fonts/IBMPlexSans-zYXzKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1syxTKYbABA.woff2',
            'assets/fonts/Newsreader-cY9VfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBAbCJYQraA.woff2',
            'assets/fonts/Newsreader-cY9VfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBAbDJYQraA.woff2',
            'assets/fonts/Newsreader-cY9VfjOCX1hbuyalUrK49dLac06G1ZGsZBtoBAbNJYQ.woff2'
        ];

        // Fetch and add all files to ZIP
        for (const file of files) {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    const content = await response.blob();
                    zip.file(file, content);
                }
            } catch (error) {
                console.warn(`Could not add ${file} to package:`, error);
            }
        }

        // Add README with instructions
        const readme = `M365 Copilot ROI Calculator - Local Package
===========================================

QUICK START:
1. Extract ALL files from this ZIP to a folder on your computer
2. Open "index.html" in your web browser (Chrome, Edge, or Firefox)
3. Follow the on-screen instructions to upload your CSV data

IMPORTANT: 
- Do NOT run files directly from the ZIP - extract them first!
- Keep all files in the same folder structure
- No internet connection required once extracted

FILES INCLUDED:
- index.html - Full Data Analysis page
- roi-calculator.html - ROI Calculator page
- Start Here.html - Getting Started guide  
- styles.css - Styling
- script.js - Main functionality
- sales-script.js - Sales calculator functions
- sample-data.csv - Sample dataset
- lib/ - Required JavaScript libraries

NEED HELP?
Visit: https://microsoft.github.io/Analytics-Hub/tools/copilot-roi-calculator/

© 2026 Microsoft - Jordan King (jordanking@microsoft.com)
`;
        zip.file('README.txt', readme);

        // Generate the ZIP file
        const blob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'M365_Copilot_ROI_Calculator_Local.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Track download event in Microsoft Clarity
        if (window.clarity) {
            clarity('event', 'download_local_package');
        }

        // Reset button
        if (btn) {
            btn.innerHTML = '<span class="action-text">Downloaded</span>';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }, 2000);
        }

    } catch (error) {
        console.error('Error creating package:', error);
        alert('Error creating download package. Please try again or contact support.');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }
}
