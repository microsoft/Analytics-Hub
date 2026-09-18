/* ============================================================
   Analytics Hub — cookie consent for Microsoft Clarity
   ------------------------------------------------------------
   Loaded on every page, right after the Clarity loader + clarity-events.js.

   What it does
   ------------
   • Passes the visitor's choice to Clarity via the Consent API v2
       clarity('consentv2', { ad_Storage, analytics_Storage })
     Clarity only sets its cookies when analytics_Storage is "granted";
     when denied it runs cookieless (a fresh pseudonymous id per page view).
   • ad_Storage is ALWAYS denied — the Hub runs no advertising, so the
     third-party MUID/ad cookies are never needed. Only first-party
     analytics (_clck / _clsk) power the pages-analytics metrics.
   • No auto-prompt. Per manager request (the old banner/notice was too
     intrusive), the privacy/cookie choice lives ONLY in a persistent
     "Privacy notice" link in the site footer — nothing pops up on load.
     Regional defaults for Clarity are still honored:
       – Consent-required region (EEA/UK/CH) → Clarity denied until the visitor
         opts in through the footer link.
       – Everywhere else → analytics on by default; opt out via the footer link.
   • Choice is remembered in localStorage and applied silently on return.

   Design rules
   ------------
   • The category is labelled "Analytics" (neutral) — never "session
     recording". The plain-language list describes exactly what is gathered.
   • Fails silent. A bug here must never break the page or block content.
   • No dependencies, no external calls, themes off the site's CSS variables.
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY   = "ah_cookie_consent_v2"; // {analytics:"granted"|"denied", ts:<ms>}
  var CLARITY_ID  = "wxb0r23ozh";           // for reference / debugging only

  // ---------------------------------------------------- storage helpers
  function readDecision() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (o && (o.analytics === "granted" || o.analytics === "denied")) return o;
    } catch (e) {}
    return null;
  }
  function writeDecision(analytics) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ analytics: analytics, ts: Date.now() })); } catch (e) {}
  }

  // ---------------------------------------------------- Clarity signal
  // Queue-safe: the inline loader defines window.clarity synchronously, so the
  // call is buffered even if the async tag hasn't finished loading yet.
  function signalClarity(analyticsGranted) {
    var tries = 0;
    (function push() {
      try {
        if (typeof window.clarity === "function") {
          window.clarity("consentv2", {
            ad_Storage: "denied",
            analytics_Storage: analyticsGranted ? "granted" : "denied"
          });
          return;
        }
      } catch (e) { return; }
      if (tries++ < 40) setTimeout(push, 150); // ~6s grace, then give up quietly
    })();
  }

  // ---------------------------------------------------- region heuristic
  // Timezone is a dependency-free hint for which UX to show. It is NOT the
  // authority on cookie-setting: Clarity's own IP-based Consent Mode still
  // withholds cookies for real EEA/UK/CH visitors until we signal granted, so
  // a mis-detected traveler never leaks cookies they didn't consent to.
  function isConsentRequiredRegion() {
    try {
      var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || "");
      if (/^Europe\//.test(tz)) return true;                 // EEA/EU/UK/CH/EFTA
      if (/^Atlantic\/(Canary|Madeira|Azores|Faroe|Reykjavik)/.test(tz)) return true;
      return false;
    } catch (e) {
      return true; // unknown → safer to ask
    }
  }

  // ---------------------------------------------------- styles
  function injectStyles() {
    if (document.getElementById("ahc-styles")) return;
    var css = ''
    + '.ahc-collects{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:6px}'
    + '.ahc-collects li{font-size:13px;color:var(--text-soft,#5a5a72);padding-left:22px;position:relative;line-height:1.45}'
    + '.ahc-collects li::before{content:"\\2713";position:absolute;left:0;top:0;color:var(--accent-3,#00B294);font-weight:800}'
    + '.ahc-collects li.no::before{content:"\\2715";color:var(--bad,#c50f1f)}'
    + '.ahc-collects li b{color:var(--text,#1a1a25);font-weight:600}'
    + '.ahc-code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.92em}'
    /* banner */
    + '.ahc-banner{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(14px);z-index:2147483000;'
    + 'width:min(760px,calc(100% - 32px));background:var(--surface,#fff);color:var(--text,#1a1a25);'
    + 'border:1px solid var(--border-strong,#d0d0dc);border-radius:16px;box-shadow:0 24px 48px rgba(20,20,40,.18),0 8px 16px rgba(20,20,40,.10);'
    + 'padding:22px 24px;opacity:0;pointer-events:none;transition:opacity .28s ease,transform .28s ease;font-family:var(--font,"Segoe UI",system-ui,sans-serif)}'
    + '.ahc-banner.ahc-show{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}'
    + '.ahc-banner h2{margin:0 0 6px;font-size:17px;display:flex;align-items:center;gap:9px}'
    + '.ahc-banner p{margin:0;font-size:13.5px;color:var(--text-soft,#5a5a72)}'
    + '.ahc-banner p b{color:var(--text,#1a1a25)}'
    + '.ahc-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;align-items:center}'
    + '.ahc-spacer{flex:1}'
    /* notice bar */
    + '.ahc-notice{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:var(--surface,#fff);color:var(--text,#1a1a25);'
    + 'border-top:1px solid var(--border-strong,#d0d0dc);box-shadow:0 -6px 20px -10px rgba(0,0,0,.25);padding:12px 20px;'
    + 'display:flex;align-items:center;gap:14px;flex-wrap:wrap;transform:translateY(110%);transition:transform .3s ease;'
    + 'font-family:var(--font,"Segoe UI",system-ui,sans-serif)}'
    + '.ahc-notice.ahc-show{transform:translateY(0)}'
    + '.ahc-notice p{margin:0;font-size:13px;color:var(--text-soft,#5a5a72);flex:1;min-width:260px}'
    + '.ahc-notice p b{color:var(--text,#1a1a25)}'
    /* buttons */
    + '.ahc-btn{appearance:none;border:0;font:inherit;font-weight:600;font-size:14px;padding:10px 18px;border-radius:10px;cursor:pointer}'
    + '.ahc-btn-primary{background:var(--accent,#0078d4);color:#fff}'
    + '.ahc-btn-primary:hover{filter:brightness(1.06)}'
    + '.ahc-btn-ghost{background:var(--surface-2,#f3f3f7);color:var(--text,#1a1a25);border:1px solid var(--border,#e6e6ee)}'
    + '.ahc-btn-ghost:hover{border-color:var(--border-strong,#d0d0dc)}'
    + '.ahc-btn-link{background:none;color:var(--accent,#0078d4);padding:10px 6px;border:0;font:inherit;font-weight:600;cursor:pointer}'
    + '.ahc-btn-link:hover{text-decoration:underline}'
    + '.ahc-x{background:var(--surface-2,#f3f3f7);border:1px solid var(--border,#e6e6ee);border-radius:8px;width:32px;height:32px;cursor:pointer;color:var(--text-soft,#5a5a72);font-size:16px;line-height:1}'
    /* modal */
    + '.ahc-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(10,10,20,.5);display:none;align-items:center;justify-content:center;padding:20px}'
    + '.ahc-overlay.ahc-show{display:flex}'
    + '.ahc-modal{background:var(--surface,#fff);color:var(--text,#1a1a25);border:1px solid var(--border,#e6e6ee);border-radius:18px;'
    + 'box-shadow:0 24px 48px rgba(20,20,40,.2);width:min(560px,100%);max-height:88vh;overflow:auto;font-family:var(--font,"Segoe UI",system-ui,sans-serif)}'
    + '.ahc-mhead{padding:22px 24px 12px;border-bottom:1px solid var(--border,#e6e6ee);position:sticky;top:0;background:var(--surface,#fff)}'
    + '.ahc-mhead h2{margin:0;font-size:19px}'
    + '.ahc-mhead p{margin:6px 0 0;font-size:13px;color:var(--text-muted,#6b6b85)}'
    + '.ahc-mbody{padding:8px 24px 20px}'
    + '.ahc-pref{display:flex;gap:14px;align-items:flex-start;padding:16px 0;border-bottom:1px solid var(--border,#e6e6ee)}'
    + '.ahc-pref:last-child{border-bottom:0}'
    + '.ahc-pref .ahc-txt{flex:1}'
    + '.ahc-pref h4{margin:0 0 3px;font-size:14.5px}'
    + '.ahc-pref .ahc-desc{margin:0;font-size:12.5px;color:var(--text-soft,#5a5a72)}'
    + '.ahc-meta{margin-top:8px;font-size:11.5px;color:var(--text-muted,#6b6b85);font-family:ui-monospace,Menlo,Consolas,monospace}'
    + '.ahc-req{font-size:11px;font-weight:700;color:var(--text-muted,#6b6b85);padding-top:3px}'
    + '.ahc-tog{position:relative;width:44px;height:26px;flex:none;margin-top:1px}'
    + '.ahc-tog input{opacity:0;width:0;height:0;position:absolute}'
    + '.ahc-track{position:absolute;inset:0;background:var(--border-strong,#d0d0dc);border-radius:999px;transition:.2s;cursor:pointer}'
    + '.ahc-track::before{content:"";position:absolute;width:20px;height:20px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 2px rgba(0,0,0,.3)}'
    + '.ahc-tog input:checked + .ahc-track{background:var(--accent,#0078d4)}'
    + '.ahc-tog input:checked + .ahc-track::before{transform:translateX(18px)}'
    + '.ahc-mfoot{padding:16px 24px;border-top:1px solid var(--border,#e6e6ee);display:flex;gap:10px;justify-content:flex-end;position:sticky;bottom:0;background:var(--surface,#fff)}'
    /* toast + footer link */
    + '.ahc-toast{position:fixed;bottom:22px;left:22px;z-index:2147483002;background:var(--text,#1a1a25);color:var(--bg,#fff);'
    + 'font-size:13px;font-weight:600;padding:11px 16px;border-radius:10px;box-shadow:0 24px 48px rgba(20,20,40,.2);'
    + 'opacity:0;transform:translateY(10px);transition:.25s;pointer-events:none;font-family:var(--font,"Segoe UI",system-ui,sans-serif)}'
    + '.ahc-toast.ahc-show{opacity:1;transform:translateY(0)}'
    + '.ahc-foot-link{cursor:pointer;background:none;border:0;padding:0;font:inherit;color:inherit;text-decoration:none}';
    var s = document.createElement("style");
    s.id = "ahc-styles";
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ---------------------------------------------------- shared markup
  var COLLECTS = ''
    + '<ul class="ahc-collects">'
    +   '<li>Which pages you view and in what order</li>'
    +   '<li>How far you scroll and how long you stay on a page</li>'
    +   '<li>Where you click and move your mouse, to spot confusing areas</li>'
    +   '<li>Your approximate country and device / browser type</li>'
    +   '<li class="no"><b>We never capture what you type</b> \u2014 text and form fields are masked</li>'
    + '</ul>';

  var els = {};

  function buildUI() {
    injectStyles();

    // Banner (opt-in)
    var banner = document.createElement("div");
    banner.className = "ahc-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML = ''
      + '<h2><span aria-hidden="true">\uD83C\uDF6A</span> We value your privacy</h2>'
      + '<p>To improve this site, the Analytics Hub uses <b>Microsoft Clarity</b> for product analytics. Here\u2019s exactly what that gathers:</p>'
      + COLLECTS
      + '<p style="margin-top:10px">This sets two first-party cookies (<span class="ahc-code">_clck</span>, <span class="ahc-code">_clsk</span>). '
      + 'It <b>won\u2019t run until you agree</b>, and you can change your choice anytime via \u201CCookie preferences.\u201D</p>'
      + '<div class="ahc-row">'
      +   '<button class="ahc-btn ahc-btn-primary" data-ahc="accept">Accept analytics</button>'
      +   '<button class="ahc-btn ahc-btn-ghost" data-ahc="reject">Reject</button>'
      +   '<span class="ahc-spacer"></span>'
      +   '<button class="ahc-btn-link" data-ahc="manage">Manage preferences</button>'
      + '</div>';

    // Notice bar (opt-out)
    var notice = document.createElement("div");
    notice.className = "ahc-notice";
    notice.setAttribute("role", "region");
    notice.setAttribute("aria-label", "Privacy notice");
    notice.innerHTML = ''
      + '<p><b>Notice:</b> We use privacy-friendly product analytics (Microsoft Clarity) to see which pages are useful '
      + '\u2014 pages viewed, scroll depth, time on page, and clicks. We never capture what you type. '
      + '<button class="ahc-btn-link" data-ahc="manage" style="padding:0;font-size:13px">Privacy &amp; cookies</button>.</p>'
      + '<div style="display:flex;gap:8px;align-items:center">'
      +   '<button class="ahc-btn-link" data-ahc="reject" style="font-size:13px">Opt out</button>'
      +   '<button class="ahc-x" data-ahc="dismiss" aria-label="Dismiss">\u00D7</button>'
      + '</div>';

    // Preferences modal
    var overlay = document.createElement("div");
    overlay.className = "ahc-overlay";
    overlay.innerHTML = ''
      + '<div class="ahc-modal" role="dialog" aria-modal="true" aria-label="Privacy and cookie preferences">'
      +   '<div class="ahc-mhead"><h2>Privacy &amp; cookie preferences</h2>'
      +     '<p>Control what the Analytics Hub is allowed to collect. Changes take effect immediately.</p></div>'
      +   '<div class="ahc-mbody">'
      +     '<div class="ahc-pref"><div class="ahc-txt"><h4>Strictly necessary</h4>'
      +       '<p class="ahc-desc">Remembers your preferences (dismissed banners, votes, theme). Never used for tracking and can\u2019t be turned off.</p>'
      +       '<div class="ahc-meta">localStorage \u00B7 first-party only</div></div>'
      +       '<span class="ahc-req">Always on</span></div>'
      +     '<div class="ahc-pref"><div class="ahc-txt"><h4>Product analytics \u2014 Microsoft Clarity</h4>'
      +       '<p class="ahc-desc">Helps us see which pages are useful and where people get stuck. Specifically, we gather:</p>'
      +       COLLECTS
      +       '<div class="ahc-meta">Cookies: _clck, _clsk \u00B7 clarity.ms \u00B7 <a href="https://privacy.microsoft.com/" target="_blank" rel="noopener">Microsoft Privacy Statement</a></div></div>'
      +       '<label class="ahc-tog"><input type="checkbox" data-ahc="toggle"><span class="ahc-track"></span></label></div>'
      +   '</div>'
      +   '<div class="ahc-mfoot">'
      +     '<button class="ahc-btn ahc-btn-ghost" data-ahc="cancel">Cancel</button>'
      +     '<button class="ahc-btn ahc-btn-primary" data-ahc="save">Save choices</button>'
      +   '</div>'
      + '</div>';

    var toast = document.createElement("div");
    toast.className = "ahc-toast";
    toast.setAttribute("role", "status");

    document.body.appendChild(banner);
    document.body.appendChild(notice);
    document.body.appendChild(overlay);
    document.body.appendChild(toast);

    els = { banner: banner, notice: notice, overlay: overlay, toast: toast,
            toggle: overlay.querySelector('[data-ahc="toggle"]') };

    // Delegated clicks
    document.addEventListener("click", function (e) {
      var t = e.target.closest && e.target.closest("[data-ahc]");
      if (!t) return;
      var action = t.getAttribute("data-ahc");
      if (action === "accept")      { decide(true,  "Analytics enabled \u2014 thanks for helping us improve."); }
      else if (action === "reject") { decide(false, "Opted out \u2014 no analytics cookies are set."); }
      else if (action === "manage") { e.preventDefault(); openPrefs(); }
      else if (action === "dismiss"){ hide(els.notice); } // dismiss != opt out (analytics stays on where allowed)
      else if (action === "cancel") { closePrefs(); }
      else if (action === "save")   { decide(!!els.toggle.checked, els.toggle.checked ? "Preferences saved \u2014 analytics on." : "Preferences saved \u2014 analytics off."); closePrefs(); }
    });
    els.overlay.addEventListener("click", function (e) { if (e.target === els.overlay) closePrefs(); });

    injectFooterLink();
  }

  // ---------------------------------------------------- show/hide
  function show(node) { node.classList.add("ahc-show"); }
  function hide(node) { node.classList.remove("ahc-show"); }
  function toast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg; show(els.toast);
    clearTimeout(toast._t); toast._t = setTimeout(function () { hide(els.toast); }, 2400);
  }
  function openPrefs()  { if (els.toggle) els.toggle.checked = (currentAnalytics() === true); show(els.overlay); }
  function closePrefs() { hide(els.overlay); }

  function currentAnalytics() {
    var d = readDecision();
    if (d) return d.analytics === "granted";
    return !isConsentRequiredRegion(); // undecided default: on outside consent regions
  }

  // Apply a decision: persist, signal Clarity, hide surfaces, toast.
  function decide(granted, msg) {
    writeDecision(granted ? "granted" : "denied");
    signalClarity(granted);
    if (els.banner) hide(els.banner);
    if (els.notice) hide(els.notice);
    if (msg) toast(msg);
  }

  // ---------------------------------------------------- footer link
  // Only ever targets the real page footer. Dialogs, flyouts and modals have
  // their own <footer> (e.g. the report flyout's footer.mk-dlg-foot), and an
  // unscoped querySelector("footer") grabs whichever comes first in the DOM —
  // which on pages with no site footer is the dialog's, dropping a "Cookie
  // preferences" link inside the modal. Skip any footer inside an overlay.
  function isInOverlay(el) {
    return !!(el.closest && el.closest(
      'dialog, [role="dialog"], [aria-modal="true"], .mk-dlg, .ahc-overlay, .ahc-banner, .ahc-notice'
    ));
  }

  function findSiteFooter() {
    var preferred = document.querySelector("footer.site-footer");
    if (preferred && !isInOverlay(preferred)) return preferred;
    var all = document.querySelectorAll("footer");
    for (var i = 0; i < all.length; i++) {
      if (!isInOverlay(all[i])) return all[i];
    }
    return null;
  }

  function injectFooterLink() {
    try {
      var foot = findSiteFooter();
      if (!foot) return; // no site footer (e.g. app/flyout-only pages) — add nothing

      var link = document.createElement("a");
      link.href = "#";
      link.className = "ahc-foot-link";
      link.textContent = "Privacy notice";
      link.addEventListener("click", function (e) { e.preventDefault(); openPrefs(); });

      // Prefer an existing inline footer row so it sits with the other links.
      var row = foot.querySelector(".footer-fine") || foot.querySelector(".footer-links");
      if (row) {
        row.appendChild(document.createTextNode("  \u00B7  "));
        row.appendChild(link);
        return;
      }

      var wrap = document.createElement("div");
      wrap.style.cssText = "text-align:center;font-size:12px;margin-top:8px";
      wrap.appendChild(link);
      foot.appendChild(wrap);
    } catch (e) {}
  }

  // ---------------------------------------------------- boot
  function boot() {
    buildUI();
    var d = readDecision();
    if (d) {                                   // returning visitor — apply silently
      signalClarity(d.analytics === "granted");
      return;
    }
    // No auto-prompt: the privacy/cookie choice is reachable only through the
    // footer "Privacy notice" link. Nothing is shown on load. We still apply
    // the regional default for Clarity — denied until opt-in in consent-required
    // regions (EEA/UK/CH), on by default elsewhere — so a first-time visitor in
    // a consent region never gets analytics cookies before choosing.
    signalClarity(!isConsentRequiredRegion());
  }

  // Expose a global so any page element can reopen preferences if needed.
  window.ahCookiePreferences = function () { if (!els.overlay) buildUI(); openPrefs(); };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
