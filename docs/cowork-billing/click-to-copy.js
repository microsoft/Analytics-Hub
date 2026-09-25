/* ============================================================
   Shared "click any figure to copy" microinteraction for the
   Cowork web apps (FinOps, chargeback, usage tracker, policy helper).

   Why this exists: Microsoft Clarity flagged high dead-click rates on
   these tools (14-66% of sessions). The audit found the clicks land on
   INFORMATIONAL elements users instinctively click - the big KPI/metric
   numbers and numeric table cells - which had no click behaviour, so
   Clarity counted them as "dead" (a click that produces no response).

   This turns those clicks into a useful, responsive action: click a
   figure to copy it, with a small toast. The toast is a visible DOM
   change, so Clarity no longer classifies the click as dead, and it is
   genuinely handy for anyone lifting numbers into a report or email.

   Real controls (buttons, links, inputs, sortable headers, filters,
   the metric info icon) are never hijacked. Vanilla JS, no deps.
   ============================================================ */
(function () {
  "use strict";
  if (window.__cwkCopyInit) return;
  window.__cwkCopyInit = true;

  // Elements that already do something on click - leave their clicks alone.
  var INTERACTIVE = 'a,button,input,select,textarea,label,summary,' +
    '[role="button"],[onclick],[contenteditable],' +
    '.dim-btn,.sortable,.btn,.btn-primary,.btn-secondary,.action-btn,.tab-btn,' +
    '.cohort-chip,.metric-info,.metric-tip,.metric-label,' +
    '[data-sort],[data-dim],[data-basis],[data-entity]';

  function showToast(x, y, text) {
    var t = document.createElement("div");
    t.className = "cwk-copy-toast";
    t.textContent = text;
    t.style.cssText = "position:fixed;z-index:99999;left:" + Math.round(x) + "px;top:" +
      Math.round(y - 34) + "px;transform:translateX(-50%);background:#1b1b28;color:#fff;" +
      "font:600 12px/1 system-ui,'Segoe UI',sans-serif;padding:7px 11px;border-radius:8px;" +
      "box-shadow:0 6px 20px rgba(0,0,0,.28);pointer-events:none;opacity:0;" +
      "transition:opacity .12s ease,top .22s ease;white-space:nowrap";
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = "1"; t.style.top = Math.round(y - 44) + "px"; });
    setTimeout(function () { t.style.opacity = "0"; setTimeout(function () { if (t.parentNode) t.remove(); }, 220); }, 1000);
  }

  function copyText(text) {
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.top = "-9999px"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
      } catch (e) { /* clipboard unavailable - the toast still gives feedback */ }
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(fallback);
      } else { fallback(); }
    } catch (e) { fallback(); }
  }

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || !target.closest) return;
    // Respect real interactive elements and their tooltips/labels.
    if (target.closest(INTERACTIVE)) return;
    // Don't fight a user who is selecting text.
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).trim().length) return;

    var el = target.closest(".metric-value, td.num, .kpi-value, .metric-card, .dm-kpi");
    if (!el) return;
    // On a card, copy the value it holds rather than the label/whitespace.
    var valEl = el;
    if (el.classList.contains("metric-card")) valEl = el.querySelector(".metric-value") || el;
    else if (el.classList.contains("dm-kpi")) valEl = el.querySelector(".v") || el;
    var text = (valEl && valEl.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return;
    copyText(text);
    showToast(e.clientX, e.clientY, "Copied \u2713");
  }, true);

  // Honest affordance: a "copy" cursor on the figures so the click is invited.
  var style = document.createElement("style");
  style.textContent = ".metric-value,td.num,.kpi-value,.dm-kpi{cursor:copy}" +
    ".metric-card{cursor:copy}.metric-card .metric-label,.metric-card .metric-info{cursor:default}";
  document.head.appendChild(style);
})();
