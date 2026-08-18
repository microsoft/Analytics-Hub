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
  function appName() {
    var p = (location.pathname || '').toLowerCase();
    if (p.indexOf('cowork-chargeback') > -1) return 'chargeback';
    if (p.indexOf('cowork-policy-helper') > -1) return 'policy-helper';
    if (p.indexOf('finops-cowork') > -1) return 'finops';
    if (p.indexOf('cowork-usage-tracker') > -1) return 'usage-tracker';
    if (p.indexOf('cowork-roi-model') > -1) return 'roi-model';
    if (p.indexOf('cowork-billing') > -1) return 'hub';
    return 'unknown';
  }

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

  /* Bind a click handler by element id, tolerating elements that do not exist
   * in a given app. Safe to call with ids that are absent. */
  function onClick(id, action, once) {
    try {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function () { cwkTrack(action, once); });
    } catch (e) {}
  }
  window.cwkOnClick = onClick;

  function bind() {
    // ---- exports: the strongest signal that the tool produced something usable
    // Chargeback
    onClick('btnExportJournal',  'export_journal_csv');
    onClick('btnExportLines',    'export_line_items_csv');
    onClick('btnExportXlsx',     'export_xlsx');
    // Policy Helper
    onClick('btnExport',         'export_csv');
    onClick('btnExportPolicy',   'export_by_policy');
    onClick('btnExportDept',     'export_by_department');
    onClick('btnExportAdjusted', 'export_adjusted_overages');
    onClick('btnExportDeck',     'export_deck');
    onClick('btnExportPdf',      'export_pdf');
    // FinOps
    onClick('btnExportUnitF',    'export_unit_csv');
    onClick('btnExportUserF',    'export_user_csv');
    onClick('btnExportDeckF',    'export_deck');
    onClick('btnExportPdfF',     'export_pdf');
    // Usage Tracker (retired, retained for continuity)
    onClick('btnExportBundle',   'export_bundle');
    onClick('btnTrendXlsx',      'export_trend_xlsx');
    onClick('btnTrendDeck',      'export_trend_deck');

    // ---- evaluation vs real use
    onClick('btnDemo',  'demo_opened', true);
    onClick('btnDemoF', 'demo_opened', true);

    // ---- the middle of the funnel: a report was actually produced.
    // btnGenerate exists in both Chargeback and Policy Helper; the APP prefix
    // separates them, so one binding covers both.
    onClick('btnGenerate',  'report_generated', true);
    onClick('btnGenerateF', 'report_generated', true);

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
