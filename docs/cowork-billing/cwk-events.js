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
 *   data_loaded      — real CSVs uploaded (the moment the tool does real work)
 *   demo_opened      — demo mode (evaluation intent, not real usage)
 *   export_*         — an artifact left the tool. Strongest adoption signal.
 *   share_opened     — share sheet opened from the banner
 *   share_email      — "Open in email" clicked
 *   share_copied     — "Copy for email" clicked
 *   feedback_opened  — feedback form opened
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

    // ---- feedback
    onClick('btnFeedback',  'feedback_opened', true);
    onClick('btnFeedback2', 'feedback_opened', true);

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
