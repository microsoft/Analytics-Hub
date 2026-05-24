/* ============================================================
   Microsoft Clarity — shared event + identity helper
   ------------------------------------------------------------
   Loaded after the Clarity tag on every Analytics Hub subpage.
   Provides:
     1. Friendly page identity   → window.clarity("set", "page", <pageName>)
        Source order:
          a) <meta name="clarity-page" content="...">
          b) <title> with the trailing " · Analytics Hub" stripped
     2. Outbound click tracking  → clarity event "Outbound click"
        (anything pointing to a different origin than the current page)
     3. Download tracking        → clarity event "Download"
        (anchors whose href ends in .pdf .pbit .zip .pptx .docx .xlsx .csv)
     4. Tool card click tracking → clarity event "Tool card clicked"
        (anchors marked with [data-tool-card] inside Find a Tool / home grid)
   These mirror the custom events already wired into the Copilot ROI
   Calculator (download_executive_deck, Outbound click, etc.) so the
   two Clarity projects produce comparable engagement signals.
   ============================================================ */

(function () {
  "use strict";

  // ---------------------------------------------------- 1. Page identity
  function resolvePageName() {
    const meta = document.querySelector('meta[name="clarity-page"]');
    if (meta && meta.content) return meta.content.trim();
    const t = (document.title || "").split("·")[0].trim();
    return t || document.location.pathname || "(unknown)";
  }

  function clarityReady(cb) {
    // Clarity queues calls before the tag loads, but only after the global
    // is registered. If it's not present yet, retry briefly.
    if (typeof window.clarity === "function") return cb();
    let tries = 0;
    const tick = setInterval(() => {
      if (typeof window.clarity === "function" || ++tries > 50) {
        clearInterval(tick);
        if (typeof window.clarity === "function") cb();
      }
    }, 100);
  }

  clarityReady(() => {
    try {
      window.clarity("set", "page", resolvePageName());
    } catch (e) { /* swallow — never break the page */ }
  });

  // ---------------------------------------------------- 2/3/4. Click events
  const DOWNLOAD_RE = /\.(pdf|pbit|pbix|zip|pptx|docx|xlsx|csv|md)(\?|#|$)/i;

  function originOf(href) {
    try { return new URL(href, window.location.href).origin; }
    catch (e) { return null; }
  }

  function safeEvent(name) {
    try { window.clarity && window.clarity("event", name); } catch (e) {}
  }

  document.addEventListener("click", (ev) => {
    const a = ev.target && ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    const href = a.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    // Download
    if (DOWNLOAD_RE.test(href)) {
      safeEvent("Download");
      return; // a download is by definition a single intent — don't double count
    }

    // Tool card
    if (a.matches("[data-tool-card]") || (a.closest && a.closest("[data-tool-card]"))) {
      safeEvent("Tool card clicked");
    }

    // Outbound (different origin)
    const target = originOf(href);
    if (target && target !== window.location.origin) {
      safeEvent("Outbound click");
    }
  }, { passive: true });
})();
