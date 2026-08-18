/* ============================================================
   Microsoft Clarity — shared event + identity helper
   ------------------------------------------------------------
   Loaded after the Clarity tag on every Analytics Hub page.

   Provides:
     1. Friendly page identity   → clarity("set", "page", <pageName>)
     2. Navigation tracking      → "nav: <destination>"
     3. Download tracking        → "download: <filename>"
     4. Outbound click tracking  → "outbound: <host>"
     5. CTA / button tracking    → "cta: <label>"
     6. Search usage             → "search used"
     7. Engaged dwell            → "engaged 30s"

   Design rules:
     - Event names carry WHAT was clicked, not just that something was.
       An unnamed "Download" count cannot tell us whether the field is
       taking the PBIT or a one-pager, which is the actual question.
     - Cardinality is bounded. Names come from path slugs, file names and
       short trimmed labels, never from free text or query strings.
     - No customer data. Search terms are never sent, only the fact that
       search was used. Labels are truncated and stripped of digits-heavy
       strings so a pasted tenant name cannot leak through.
     - Fails silent and never throws.
   ============================================================ */

(function () {
  "use strict";

  // ---------------------------------------------------- helpers
  function safeEvent(name) {
    try {
      if (!name) return;
      if (typeof window.clarity === "function") window.clarity("event", name);
    } catch (e) { /* never break the page */ }
  }

  function clarityReady(cb) {
    if (typeof window.clarity === "function") return cb();
    var tries = 0;
    var tick = setInterval(function () {
      if (typeof window.clarity === "function" || ++tries > 50) {
        clearInterval(tick);
        if (typeof window.clarity === "function") cb();
      }
    }, 100);
  }

  /* Short, bounded, safe-to-send label. Rejects anything that looks like
   * free text a user typed or pasted. */
  function cleanLabel(s) {
    if (!s) return "";
    s = String(s).replace(/\s+/g, " ").trim();
    if (s.length > 40) s = s.slice(0, 40);
    // drop anything with an @ or a long digit run: never a UI label
    if (/@/.test(s) || /\d{5,}/.test(s)) return "";
    return s;
  }

  // ---------------------------------------------------- 1. Page identity
  function resolvePageName() {
    var meta = document.querySelector('meta[name="clarity-page"]');
    if (meta && meta.content) return meta.content.trim();
    var t = (document.title || "").split("\u00b7")[0].trim();
    return t || document.location.pathname || "(unknown)";
  }

  clarityReady(function () {
    try { window.clarity("set", "page", resolvePageName()); } catch (e) {}
  });

  // ---------------------------------------------------- click routing
  var DOWNLOAD_RE = /\.(pdf|pbit|pbix|zip|pptx|docx|xlsx|csv|md)(\?|#|$)/i;

  var CARD_SEL = [
    "[data-tool-card]",
    ".hub-card", ".rf-card", ".cb-download-card", ".flagship-card",
    ".cmp-card", ".cc-feature-card", ".member-card"
  ].join(",");

  var CTA_SEL = [
    ".rf-cta", ".nav-cta", ".cta",
    ".btn-primary", ".btn-ghost",
    ".cb-btn-primary", ".cb-btn-ghost"
  ].join(",");

  function originOf(href) {
    try { return new URL(href, window.location.href).origin; }
    catch (e) { return null; }
  }

  /* Turn an internal href into a stable, low-cardinality slug.
   * "./cowork-billing/cowork-chargeback/app/index.html" -> "cowork-billing/cowork-chargeback" */
  function destSlug(href) {
    try {
      var u = new URL(href, window.location.href);
      var p = u.pathname
        .replace(/\/index\.html?$/i, "/")
        .replace(/^\/Analytics-Hub\//i, "/")
        .replace(/^\/+|\/+$/g, "");
      if (!p) return "home";
      var parts = p.split("/").filter(Boolean);
      // app pages sit two or three deep; keep at most two segments
      if (parts.length > 2) parts = parts.slice(0, 2);
      return parts.join("/");
    } catch (e) { return ""; }
  }

  function fileOf(href) {
    try {
      var u = new URL(href, window.location.href);
      var last = u.pathname.split("/").pop() || "";
      return decodeURIComponent(last).slice(0, 60);
    } catch (e) { return ""; }
  }

  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest("a[href]");

    // ---- buttons that are not links (exports etc. are handled per-app)
    if (!a) {
      var btn = ev.target && ev.target.closest && ev.target.closest("button");
      if (btn && btn.matches && btn.matches(CTA_SEL)) {
        var bl = cleanLabel(btn.textContent);
        if (bl) safeEvent("cta: " + bl);
      }
      return;
    }

    var href = a.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" ||
        href.indexOf("mailto:") === 0 || href.indexOf("tel:") === 0) return;

    // ---- download: name the artifact
    if (DOWNLOAD_RE.test(href)) {
      var f = fileOf(href);
      safeEvent(f ? "download: " + f : "download");
      return; // a download is one intent; do not double count
    }

    var target = originOf(href);
    var isOutbound = target && target !== window.location.origin;

    // ---- outbound: name the destination, and the repo when it is GitHub
    if (isOutbound) {
      var label2 = "";
      try {
        var ou = new URL(href, window.location.href);
        var oh = ou.hostname.replace(/^www\./, "");
        label2 = oh;
        // For code hosts the repo is the useful unit, not the domain: it tells
        // us which report the field actually went after.
        if (/(^|\.)github\.(com|io)$/.test(oh)) {
          var seg = ou.pathname.split("/").filter(Boolean).slice(0, 2);
          if (seg.length) label2 = oh + "/" + seg.join("/");
        }
      } catch (e) {}
      safeEvent(label2 ? "outbound: " + label2 : "outbound");
      return;
    }

    // ---- internal navigation: which tool did they actually open
    var slug = destSlug(href);

    if (a.matches(CARD_SEL) || (a.closest && a.closest(CARD_SEL))) {
      safeEvent(slug ? "card: " + slug : "card clicked");
      return;
    }

    if (a.matches(CTA_SEL) || (a.closest && a.closest(CTA_SEL))) {
      var label = cleanLabel(a.textContent);
      safeEvent(label ? "cta: " + label : (slug ? "cta: " + slug : "cta"));
      return;
    }

    if (slug) safeEvent("nav: " + slug);
  }, { passive: true });

  // ---------------------------------------------------- search usage
  /* Fires once per page load. The term itself is never sent: it can contain
   * a customer or tenant name. We only need to know search is being used. */
  (function () {
    var fired = false;
    document.addEventListener("input", function (ev) {
      if (fired) return;
      var el = ev.target;
      if (!el || !el.tagName || el.tagName !== "INPUT") return;
      var type = (el.getAttribute("type") || "").toLowerCase();
      var id = (el.id || "").toLowerCase();
      var ph = (el.getAttribute("placeholder") || "").toLowerCase();
      var isSearch = type === "search" ||
                     id.indexOf("search") > -1 ||
                     id.indexOf("filter") > -1 ||
                     ph.indexOf("search") > -1;
      if (!isSearch) return;
      if (!el.value || el.value.length < 3) return;
      fired = true;
      safeEvent("search used");
    }, { passive: true });
  })();

  // ---------------------------------------------------- engaged dwell
  /* Separates a real read from a bounce, without relying on session length,
   * which is inflated by idle tabs. Only fires if the tab is still visible. */
  (function () {
    var t = setTimeout(function () {
      try {
        if (document.visibilityState === "visible") safeEvent("engaged 30s");
      } catch (e) {}
    }, 30000);
    window.addEventListener("pagehide", function () { clearTimeout(t); });
  })();
})();
