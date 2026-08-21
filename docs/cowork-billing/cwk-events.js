/* Cowork Billing — lightweight event instrumentation.
 *
 * Fires Microsoft Clarity custom events so we can measure real usage of the
 * browser tools rather than inferring it from session duration. Clarity is
 * already loaded on every app page; this only adds named events.
 *
 * Deliberately minimal:
 *   - No customer data is ever sent. Event names are fixed strings chosen
 *     from this file; row counts and file contents are never included.
 *   - Fails silent. If Clarity is blocked, absent or slow to load, cwkTrack
 *     is a no-op and the app is unaffected.
 *   - Never throws. Every call is wrapped.
 *
 * Signals captured:
 *   data_loaded        — real CSVs uploaded (the moment the tool does real work)
 *   demo_opened        — demo mode (evaluation intent, not real usage)
 *   report_generated   — the report was actually produced. The middle of the funnel:
 *                        without it we can see data go in and exports come out, but
 *                        not whether anyone got a report in between.
 *   export_*           — an artifact left the tool. Strongest adoption signal.
 *   view_*             — which grain the user works in (individual / department / team)
 *   policy_*           — real editing in the Policy Helper, not just browsing
 *   filter_cleared     — entity filter reset
 *   session_reset      — user reloaded with different data, i.e. iterating
 *   share_opened       — share sheet opened from the banner
 *   share_email        — "Open in email" clicked
 *   share_copied       — "Copy for email" clicked
 *   feedback_opened    — feedback form opened
 *   feedback_submitted — feedback actually sent or copied, which is the one that counts
 *
 * `once` semantics are deliberately asymmetric: funnel steps (data_loaded,
 * report_generated) fire once per page load so they count sessions, while exports
 * and edits fire every time so they count volume.
 */
(function () {
  'use strict';

  // App identity, so events can be split per tool in Clarity.
  // Order matters: the more specific paths must be tested before the
  // cowork-billing catch-all, since every app lives underneath it. The
  // multi-budget app was previously reporting as 'hub' for exactly that
  // reason, so every one of its events was attributed to the wrong tool.
  function appName() {
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('multi-budget-chargeback') > -1) return 'multi-budget';
    if (p.indexOf('healthcare-chargeback') > -1) return 'multi-budget';
    if (p.indexOf('cowork-chargeback') > -1) return 'chargeback';
    if (p.indexOf('cowork-policy-helper') > -1) return 'policy-helper';
    if (p.indexOf('finops-cowork') > -1) return 'finops';
    if (p.indexOf('cowork-usage-tracker') > -1) return 'usage-tracker';
    if (p.indexOf('cowork-roi-model') > -1) return 'roi-model';
    if (p.indexOf('cowork-billing') > -1) return 'hub';
    return 'unknown';
  }

  /* Demo or real data.
   *
   * An export taken from the sample dataset is an evaluation; the same export
   * taken from a customer's own upload is adoption. Counting them together
   * makes the strongest signal we have unreadable, so every export carries the
   * mode it was produced in.
   *
   * Read from the DOM rather than app state so this stays a single shared file
   * with no per-app wiring: each tool shows a demo banner while sample data is
   * loaded. Apps can override by setting window.__cwkMode. */
  function mode() {
    try {
      if (window.__cwkMode === 'demo' || window.__cwkMode === 'real') return window.__cwkMode;
      var ids = ['cbDemoBanner', 'demoBanner', 'fnDemoBanner', 'phDemoBanner'];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById(ids[i]);
        if (el && !el.hidden && el.offsetParent !== null) return 'demo';
      }
      return 'real';
    } catch (e) { return 'real'; }
  }
  window.cwkMode = mode;

  /* ---- data mode in the URL -------------------------------------------
   *
   * Clarity's Data Export API returns a URL dimension but will not return
   * custom events. clarity('event', ...) is visible in Clarity's own dashboard
   * and nowhere else, so anything encoded only as an event is invisible to the
   * nightly snapshot that builds the analytics page. The URL is the one channel
   * that is both queryable and free, so the split that matters most, evaluation
   * on sample data versus real work on a customer's own upload, is written into
   * the URL as well as being fired as an event.
   *
   * These tools never navigate once data is loaded, so the state has to be
   * pushed into the URL of the page already open. Clarity proxies
   * history.pushState and history.replaceState and re-registers a page view
   * when the URL changes, so replaceState is enough. No reload is needed and
   * the customer's upload is never at risk.
   *
   * The state is carried in the QUERY STRING, not a fragment. Clarity compares
   * URLs with the hash stripped:
   *
   *     // clarity-js/src/core/history.ts
   *     function getCurrentUrl(): string {
   *         return location.href.replace(location.hash, Constant.Empty);
   *     }
   *
   * so a hash-only change is deliberately ignored and would have recorded
   * nothing. It also never binds hashchange. The full href including the query
   * string is what gets logged as the URL dimension, so a query parameter is
   * both detected and reported. Anchor URLs such as /#explore do appear in the
   * data, but only because someone landed on them directly.
   *
   * ?demo=1 doubles as the flag every app already honours on load, so the URL
   * in the address bar stays a working shareable demo link. */
  var MODE_PARAMS = { demo: 'demo=1', real: 'report=1' };

  function isDemoUrl() {
    try { return /[?&]demo=1\b/.test(location.search); } catch (e) { return false; }
  }
  window.cwkIsDemoUrl = isDemoUrl;

  /* Current query string as parts, with any existing mode flag removed. */
  function paramsWithoutMode() {
    var s = location.search.replace(/^\?/, '');
    return (s ? s.split('&') : []).filter(function (p) {
      var k = p.split('=')[0];
      return k !== 'demo' && k !== 'report';
    });
  }

  function writeParams(parts) {
    var next = location.pathname + (parts.length ? '?' + parts.join('&') : '') + location.hash;
    if (next !== location.pathname + location.search + location.hash) {
      history.replaceState(null, '', next);
    }
  }

  /* Record in the URL that a report was produced, and in which mode. Exactly
   * one flag is ever present, so demo, real and landing are three distinct
   * URLs per app. Writing demo=1 also clears report=1 and vice versa, which
   * matters because a user can view the demo and then load their own data:
   * leaving demo=1 on would mean a refresh silently discarded their upload. */
  function markMode(kind) {
    try {
      var want = MODE_PARAMS[kind === 'demo' ? 'demo' : 'real'];
      var parts = paramsWithoutMode();
      parts.push(want);
      writeParams(parts);
    } catch (e) {}
  }
  window.cwkMarkMode = markMode;

  /* Return the URL to its landing state when the user resets the app. */
  function clearMode() {
    try { writeParams(paramsWithoutMode()); } catch (e) {}
  }
  window.cwkClearMode = clearMode;

  var APP = appName();
  var fired = {};

  /* Fire a named Clarity event. `once` de-duplicates per page load, which
   * matters for signals like data_loaded where a repeat is not new evidence. */
  function cwkTrack(action, once) {
    try {
      if (!action) return;
      var name = APP + ':' + action;
      if (once) {
        if (fired[name]) return;
        fired[name] = 1;
      }
      if (typeof window.clarity === 'function') {
        window.clarity('event', name);
      }
    } catch (e) { /* never let telemetry break the app */ }
  }

  window.cwkTrack = cwkTrack;

  /* Same as cwkTrack, but stamps the data mode onto the name so demo and real
   * usage can be told apart. Used for exports and for report generation. */
  function cwkTrackMode(action, once) {
    cwkTrack(action + ':' + mode(), once);
  }
  window.cwkTrackMode = cwkTrackMode;

  /* Bind a click handler by element id, tolerating elements that do not exist
   * in a given app. Safe to call with ids that are absent. */
  function onClick(id, action, once) {
    try {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function () { cwkTrack(action, once); });
    } catch (e) {}
  }
  window.cwkOnClick = onClick;

  /* Mode-stamped variant. The mode is read at click time, not bind time,
   * because a user can load the demo and then load real data in one session. */
  function onClickMode(id, action, once) {
    try {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function () { cwkTrackMode(action, once); });
    } catch (e) {}
  }

  function bind() {
    // ---- exports: the strongest signal that the tool produced something usable.
    // Every export is mode-stamped, because an export off the sample data is an
    // evaluation and an export off a customer upload is adoption.
    // Chargeback / Multi-Budget
    onClickMode('btnExportGl',      'export_post_to_gl');
    onClickMode('btnExportJournal', 'export_journal_csv');
    onClickMode('btnExportLines',   'export_line_items_csv');
    onClickMode('btnExportXlsx',    'export_xlsx');
    onClickMode('stExport',         'export_settlement_csv');
    onClickMode('stTemplate',       'export_entitlement_template');
    // Policy Helper
    onClickMode('btnExport',         'export_csv');
    onClickMode('btnExportPolicy',   'export_by_policy');
    onClickMode('btnExportDept',     'export_by_department');
    onClickMode('btnExportAdjusted', 'export_adjusted_overages');
    onClickMode('btnExportDeck',     'export_deck');
    onClickMode('btnExportPdf',      'export_pdf');
    // FinOps
    onClickMode('btnExportUnitF',    'export_unit_csv');
    onClickMode('btnExportUserF',    'export_user_csv');
    onClickMode('btnExportDeckF',    'export_deck');
    onClickMode('btnExportPdfF',     'export_pdf');
    // Usage Tracker (retired, retained for continuity)
    onClickMode('btnExportBundle',   'export_bundle');
    onClickMode('btnTrendXlsx',      'export_trend_xlsx');
    onClickMode('btnTrendDeck',      'export_trend_deck');

    // ---- entitlements: the one manual input in the settlement flow
    onClick('stLoad', 'entitlement_loaded');

    // ---- evaluation vs real use
    onClick('btnDemo',  'demo_opened', true);
    onClick('btnDemoF', 'demo_opened', true);

    // ---- the middle of the funnel: a report was actually produced.
    // btnGenerate exists in both Chargeback and Policy Helper; the APP prefix
    // separates them, so one binding covers both.
    onClickMode('btnGenerate',  'report_generated', true);
    onClickMode('btnGenerateF', 'report_generated', true);

    // ---- working grain: how the customer actually slices the result
    onClick('viewIndividual', 'view_individual');
    onClick('viewDepartment', 'view_department');
    onClick('viewTeam',       'view_team');

    // ---- Policy Helper: real editing, not browsing
    onClick('btnBulkAssign',    'policy_bulk_assign');
    onClick('btnApplyRecs',     'policy_auto_adjust');
    onClick('btnResetPolicies', 'policy_reset');

    // ---- friction and iteration
    onClick('cbEntityClear',     'filter_cleared');
    onClick('finopsEntityClear', 'filter_cleared');
    onClick('btnClearEntra',     'files_cleared');
    onClick('btnClearEntraF',    'files_cleared');
    onClick('btnReset',          'session_reset');
    onClick('btnResetF',         'session_reset');

    // ---- feedback
    onClick('btnFeedback',  'feedback_opened', true);
    onClick('fbBack',       'feedback_abandoned');
    onClick('btnFeedback2', 'feedback_opened', true);
    // Opening the form is intent; these two are the actual submission.
    onClick('fbCopy',       'feedback_submitted');
    onClick('fbEmailBtn',   'feedback_submitted');

    // ---- share bar (injected after load, so watch for it)
    var shareTries = 0;
    var shareTimer = setInterval(function () {
      var b = document.getElementById('cwkShareBtn');
      if (b) {
        clearInterval(shareTimer);
        b.addEventListener('click', function () { cwkTrack('share_opened'); });
      } else if (++shareTries > 40) {
        clearInterval(shareTimer);
      }
    }, 250);

    // The share sheet opens in a child window and posts back on interaction.
    window.addEventListener('message', function (ev) {
      try {
        var d = ev && ev.data;
        if (d && d.cwkShare === 'email') cwkTrack('share_email');
        else if (d && d.cwkShare === 'copy') cwkTrack('share_copied');
      } catch (e) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
