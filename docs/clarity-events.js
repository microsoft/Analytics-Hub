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
     8. Video plays              → "video play: <file>"
      9. Video watch-time          → collector beacon (plays + seconds)
     10. Feed filter chips         → "filter: <status>"      (bounded set)
     11. Feed timeframe menu       → "timeframe: <value>"    (bounded set)
     12. Email-a-change intent     → "share: email"          (no content sent)
     13. Tracked item opened       → "item: <feed>/<id>"     (bounded to tracked set)

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

  /* The current feed page's own slug, used to attribute item/filter events to a
   * feed. "/Analytics-Hub/community/message-center-watch/" -> "message-center-watch". */
  function feedSlug() {
    try {
      var parts = window.location.pathname
        .replace(/\/index\.html?$/i, "/")
        .split("/").filter(Boolean);
      return parts.length ? parts[parts.length - 1] : "";
    } catch (e) { return ""; }
  }

  /* A bounded, safe identifier for a tracked row: the visible #ID / MC-ID badge
   * when present (a page-controlled identifier, not user input), else the
   * destination file slug. Never free text; capped and character-filtered. */
  function itemToken(a, row) {
    try {
      var tier = row.querySelector(".dm-tier");
      var t = tier ? String(tier.textContent || "").replace(/[^A-Za-z0-9#_-]/g, "").replace(/^#/, "").slice(0, 24) : "";
      if (t) return t;
      var f = fileOf(a.getAttribute("href") || "");
      return f ? f.replace(/\.[a-z0-9]+$/i, "").slice(0, 32) : "";
    } catch (e) { return ""; }
  }

  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest && ev.target.closest("a[href]");

    // ---- buttons that are not links (exports etc. are handled per-app)
    if (!a) {
      var btn = ev.target && ev.target.closest && ev.target.closest("button");
      if (btn && btn.matches) {
        // Learning Feed status / category filter chips: which facets get used.
        if (btn.matches(".rm-chip")) {
          var st = String(btn.getAttribute("data-status") || "")
            .replace("__all__", "all").replace(/[^A-Za-z0-9 -]/g, "").slice(0, 24);
          if (st) safeEvent("filter: " + st);
        } else if (btn.matches(CTA_SEL)) {
          var bl = cleanLabel(btn.textContent);
          if (bl) safeEvent("cta: " + bl);
        }
      }
      return;
    }

    // ---- share intent: the "Email this change" / banner email buttons build a
    //      mailto: link. Record only that a share was started — never its content.
    if (a.classList && (a.classList.contains("dm-emailbtn") || a.id === "dmBannerEmail")) {
      safeEvent("share: email");
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

    // ---- tracked item opened: name it feed/id so we know WHICH row drew the
    //      click. Takes precedence over the generic outbound host below (every
    //      MC post is mc.merill.net, every roadmap item is microsoft.com, so the
    //      host alone can't tell them apart). One event, no double count.
    var itemRow = a.closest && a.closest("table.dm-log tbody tr");
    if (itemRow && a.closest(".dm-page")) {
      var tok = itemToken(a, itemRow);
      var fs = feedSlug();
      safeEvent("item: " + (fs ? fs + "/" : "") + (tok || "item"));
      return;
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

  // ---------------------------------------------------- timeframe menu
  /* The Learning Feed timeframe dropdown (Last 30 days / Since window / etc.).
   * Values are a fixed, bounded set, so it is safe to name which one is chosen. */
  document.addEventListener("change", function (ev) {
    var el = ev.target;
    if (!el || el.id !== "rmRange") return;
    var v = String(el.value || "").replace(/[^a-z0-9]/gi, "").slice(0, 8);
    if (v) safeEvent("timeframe: " + v);
  }, { passive: true });

  // ---------------------------------------------------- video plays
  /* Native <video> play buttons live INSIDE the element, so they never reach
   * the click handler above. Listen for the first "play" of each video and
   * name it by its source file, so the count answers "how many times was the
   * ValueLens demo actually started" rather than an anonymous tally.
   *
   *   - Capture phase: the "play" event does not bubble.
   *   - Fires once per <video> per page load (a scrub/pause/resume is the same
   *     view, not a new one), so the number is "video starts", not "play events".
   *   - Name is the source file with its extension dropped, bounded and safe. */
  function videoName(el) {
    if (!el) return "";
    var src = el.currentSrc || el.getAttribute("src") || "";
    if (!src) {
      var s = el.querySelector && el.querySelector("source[src]");
      if (s) src = s.getAttribute("src") || "";
    }
    if (!src) {
      var lbl = el.getAttribute("aria-label") || el.getAttribute("title") || "";
      return cleanLabel(lbl);
    }
    var name = fileOf(src).replace(/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i, "");
    return name.slice(0, 60);
  }

  /* Collector endpoint for the private Video Analytics dashboard. This is the
   * ONLY place that needs the deployed Worker URL. Blank = disabled: play
   * counts still go to Clarity, we just don't also send them to the counter.
   * The endpoint stores anonymous per-video tallies only (no viewer identity). */
  var VIDEO_COLLECT_URL = "https://analytics-hub-video-stats.stephansmith-msft.workers.dev/collect";

  function beaconEnabled() {
    return VIDEO_COLLECT_URL && VIDEO_COLLECT_URL.indexOf("http") === 0;
  }

  /* One visitor's play + watched-seconds for a given video are coalesced into a
   * SINGLE request. The collector does read-modify-write on one small per-day
   * doc, so sending play and watch as two near-simultaneous requests can race
   * and drop an update. Coalescing (debounced, flushed on unload) makes each
   * visitor's contribution one write, so the play count is never lost. */
  var pending = {};        // video -> { plays, seconds }
  var flushTimer = null;

  function queue(video, field, amount) {
    if (!beaconEnabled() || !video || amount <= 0) return;
    var p = pending[video] || (pending[video] = { plays: 0, seconds: 0 });
    p[field] += amount;
    if (!flushTimer) flushTimer = setTimeout(flushPending, 1500);
  }

  function sendCombined(items) {
    try {
      var body = JSON.stringify({ v: items });
      // fetch(keepalive) delivers reliably during events and unload alike;
      // text/plain keeps it CORS-simple (no preflight to the cross-origin Worker).
      if (typeof fetch === "function") {
        fetch(VIDEO_COLLECT_URL, { method: "POST", body: body, keepalive: true,
          headers: { "Content-Type": "text/plain" } })["catch"](function () {});
      } else if (navigator.sendBeacon) {
        navigator.sendBeacon(VIDEO_COLLECT_URL, new Blob([body], { type: "text/plain" }));
      }
    } catch (e) { /* never break the page */ }
  }

  function flushPending() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    var items = {}, any = false;
    for (var v in pending) {
      if (!pending.hasOwnProperty(v)) continue;
      var d = pending[v];
      if (d.plays > 0 || d.seconds > 0) { items[v] = d; any = true; }
      delete pending[v];
    }
    // one request for the whole visitor -> a single read-modify-write, no race
    if (any) sendCombined(items);
  }

  (function () {
    var played = (typeof WeakSet === "function") ? new WeakSet() : null;
    /* per-video watch state: { last, watched, sent } */
    var state = (typeof WeakMap === "function") ? new WeakMap() : null;

    function st(v) {
      if (!state) return null;
      var s = state.get(v);
      if (!s) { s = { last: 0, watched: 0, sent: 0 }; state.set(v, s); }
      return s;
    }

    // ---- first play of each video -> count a "start" (Clarity + collector)
    document.addEventListener("play", function (ev) {
      try {
        var v = ev.target;
        if (!v || v.tagName !== "VIDEO") return;
        var name = videoName(v);
        var s = st(v); if (s) s.last = v.currentTime || 0;
        if (played && played.has(v)) return;
        if (played) played.add(v);
        safeEvent(name ? "video play: " + name : "video play");
        queue(name || "(unknown)", "plays", 1);
      } catch (e) {}
    }, true);

    // ---- accumulate REAL watched seconds, immune to seeks/scrubs
    document.addEventListener("timeupdate", function (ev) {
      try {
        var v = ev.target; if (!v || v.tagName !== "VIDEO") return;
        var s = st(v); if (!s) return;
        var t = v.currentTime || 0, dt = t - s.last;
        if (dt > 0 && dt < 2) s.watched += dt; // normal tick, not a jump
        s.last = t;
      } catch (e) {}
    }, true);
    document.addEventListener("seeking", function (ev) {
      var v = ev.target; if (v && v.tagName === "VIDEO") { var s = st(v); if (s) s.last = v.currentTime || 0; }
    }, true);

    // ---- queue watched-time delta to the collector (dedup via s.sent)
    function flush(v) {
      var s = st(v); if (!s) return;
      var whole = Math.floor(s.watched), delta = whole - s.sent;
      if (delta >= 1) { s.sent = whole; queue(videoName(v) || "(unknown)", "seconds", delta); }
    }
    document.addEventListener("pause", function (ev) {
      if (ev.target && ev.target.tagName === "VIDEO") flush(ev.target);
    }, true);
    document.addEventListener("ended", function (ev) {
      if (ev.target && ev.target.tagName === "VIDEO") flush(ev.target);
    }, true);
    // page hide / tab switch: queue every video's watched time, then send now
    function flushAll() {
      try {
        var vids = document.getElementsByTagName("video");
        for (var i = 0; i < vids.length; i++) flush(vids[i]);
        flushPending();
      } catch (e) {}
    }
    window.addEventListener("pagehide", flushAll);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flushAll();
    });
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
