/* ============================================================
   Analytics Hub · global UX layer
   ------------------------------------------------------------
   Provides on every page:
     1. ⌘K / Ctrl+K command palette  (search across pages + reports)
     2. Recently viewed tracking      (localStorage, FIFO 6, rendered on home)
     3. "What's new" ribbon           (latest commit, GitHub API, 1h cache)
     4. Mobile hamburger nav          (<760px breakpoint)
     5. Skip-to-content keyboard a11y (handled in HTML, styled here)
     6. Live prefers-color-scheme     (updates theme when system flips,
                                       unless the user set an explicit override)
   ============================================================ */

(function () {
  "use strict";

  // ---------------------------------------------------------- index
  // base = "" for the home page, "../" for any subpage. Derived from the
  // script's own src so it stays relative whatever folder it's in.
  const SCRIPT_BASE = (function () {
    const s = document.currentScript;
    if (!s) return "";
    const href = s.getAttribute("src") || "";
    // "./palette.js" -> "", "../palette.js" -> "../"
    const m = href.match(/^(.*?)palette\.js(\?.*)?$/);
    return m ? m[1] : "";
  })();
  const url = (p) => SCRIPT_BASE + p;

  const PAGES = [
    { kind: "page",   title: "Home",            href: url(""),                  hint: "Landing page" },
    { kind: "page",   title: "Find a Report",   href: url("find-a-tool/"),      hint: "Picker · search reports by question" },
    { kind: "page",   title: "Native Reports",  href: url("out-of-the-box/"),   hint: "What ships in Microsoft 365 + Viva by default" },
    { kind: "page",   title: "Data Sources",    href: url("data-sources/"),     hint: "Purview, Entra, Viva, GitHub" },
    { kind: "page",   title: "Case Studies",    href: url("case-studies/"),     hint: "Customer stories + measurable wins" },
    { kind: "page",   title: "Team",            href: url("team/"),             hint: "Who builds the Hub" },
    { kind: "page",   title: "Pages Analytics", href: url("pages-analytics/"),  hint: "GitHub + Clarity traffic for the Hub" },
  ];

  const REPORTS = [
    { kind: "report", title: "AI-in-One Dashboard",            href: url("find-a-tool/?q=ai-in-one"),       hint: "Unified Copilot + Agent + 3P AI" },
    { kind: "report", title: "Copilot Chat & Agent Intelligence", href: url("find-a-tool/?q=chat"),         hint: "Chat + Agent telemetry from Purview" },
    { kind: "report", title: "Super Usage Adoption",           href: url("find-a-tool/?q=super"),           hint: "Viva Insights · super-user profiling" },
    { kind: "report", title: "Super User Impact",              href: url("find-a-tool/?q=super+impact"),    hint: "Work-pattern delta vs peers" },
    { kind: "report", title: "GitHub Copilot Impact",          href: url("find-a-tool/?q=github"),          hint: "Dev adoption · GHE Copilot API" },
    { kind: "report", title: "M365 Copilot Readiness",         href: url("find-a-tool/?q=readiness"),       hint: "Who to license next" },
    { kind: "report", title: "Adoption & Sentiment",           href: url("find-a-tool/?q=sentiment"),       hint: "Survey + usage cross-tab" },
    { kind: "report", title: "Copilot ROI Calculator",         href: "https://jordankingisalive.github.io/CopilotROICalculator/", hint: "External · payback model", external: true },
    { kind: "report", title: "What I Did: Copilot Impact",     href: url("find-a-tool/?q=what-i-did"),      hint: "Personal-leverage report" },
  ];

  const INDEX = [...PAGES, ...REPORTS];

  // ---------------------------------------------------------- 1. Palette
  function buildPalette() {
    const root = document.createElement("div");
    root.className = "ah-palette";
    root.setAttribute("hidden", "");
    root.innerHTML = `
      <div class="ah-palette__backdrop" data-palette-close></div>
      <div class="ah-palette__box" role="dialog" aria-modal="true" aria-label="Search Analytics Hub">
        <input class="ah-palette__input" type="search" placeholder="Search pages and reports · type to filter" autocomplete="off" spellcheck="false" />
        <ul class="ah-palette__results" role="listbox"></ul>
        <div class="ah-palette__footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    const input   = root.querySelector(".ah-palette__input");
    const results = root.querySelector(".ah-palette__results");
    let active = 0;
    let visible = INDEX.slice();

    const render = () => {
      results.innerHTML = visible.map((item, i) => `
        <li class="ah-palette__item ${i === active ? "is-active" : ""}" data-i="${i}" role="option" aria-selected="${i === active}">
          <span class="ah-palette__kind ah-palette__kind--${item.kind}">${item.kind}</span>
          <span class="ah-palette__title">${item.title}${item.external ? ' <span class="ah-palette__ext">↗</span>' : ""}</span>
          <span class="ah-palette__hint">${item.hint || ""}</span>
        </li>
      `).join("") || `<li class="ah-palette__empty">No matches</li>`;
    };

    const filter = (q) => {
      const needle = (q || "").trim().toLowerCase();
      visible = needle
        ? INDEX.filter(x => (x.title + " " + (x.hint || "")).toLowerCase().includes(needle))
        : INDEX.slice();
      active = 0;
      render();
    };

    const open = () => {
      root.removeAttribute("hidden");
      requestAnimationFrame(() => input.focus());
      filter("");
    };
    const close = () => {
      root.setAttribute("hidden", "");
      input.value = "";
    };
    const go = (item) => {
      if (!item) return;
      try { window.clarity && window.clarity("event", "Palette open: " + item.title); } catch (e) {}
      close();
      if (item.external) window.open(item.href, "_blank", "noopener");
      else window.location.href = item.href;
    };

    input.addEventListener("input", () => filter(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); active = Math.min(active + 1, visible.length - 1); render(); }
      else if (e.key === "ArrowUp")   { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
      else if (e.key === "Enter")     { e.preventDefault(); go(visible[active]); }
      else if (e.key === "Escape")    { close(); }
    });
    results.addEventListener("click", (e) => {
      const li = e.target.closest("li.ah-palette__item");
      if (!li) return;
      go(visible[parseInt(li.dataset.i, 10)]);
    });
    root.addEventListener("click", (e) => {
      if (e.target.matches("[data-palette-close]")) close();
    });

    // Global hotkey
    document.addEventListener("keydown", (e) => {
      const isK = (e.key === "k" || e.key === "K");
      if (isK && (e.metaKey || e.ctrlKey) && !e.altKey) {
        e.preventDefault();
        root.hasAttribute("hidden") ? open() : close();
      }
    });

    return { open, close };
  }

  // ---------------------------------------------------------- Palette trigger pill in header
  function addPaletteTrigger(open) {
    const header = document.querySelector(".site-header .wrap");
    if (!header) return;
    const isMac = /Mac|iPhone|iPod|iPad/i.test(navigator.platform || "");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ah-palette-trigger";
    btn.title = "Search the Hub (" + (isMac ? "⌘K" : "Ctrl+K") + ")";
    btn.setAttribute("aria-label", btn.title);
    btn.innerHTML = `🔍 <span>Search</span> <kbd>${isMac ? "⌘K" : "Ctrl K"}</kbd>`;
    btn.addEventListener("click", open);
    // Insert before .theme-toggle if present, else append
    const tt = header.querySelector(".theme-toggle");
    if (tt) header.insertBefore(btn, tt);
    else header.appendChild(btn);
  }

  // ---------------------------------------------------------- Hamburger
  function addHamburger() {
    const header = document.querySelector(".site-header .wrap");
    const nav = header && header.querySelector(".primary-nav");
    if (!header || !nav) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ah-hamburger";
    btn.setAttribute("aria-label", "Open navigation menu");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", "primary-nav");
    btn.innerHTML = "☰";
    nav.id = nav.id || "primary-nav";
    header.insertBefore(btn, nav);
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
      btn.innerHTML = open ? "✕" : "☰";
    });
    // Close on nav link click
    nav.addEventListener("click", (e) => {
      if (e.target.tagName === "A" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        btn.innerHTML = "☰";
      }
    });
  }

  // ---------------------------------------------------------- 2. Recently viewed
  const RECENT_KEY = "ah:recent";
  const RECENT_MAX = 6;

  function trackCurrentPage() {
    // Friendly name from <meta name="clarity-page"> or title
    const meta = document.querySelector('meta[name="clarity-page"]');
    const name = meta ? meta.content.trim() : (document.title || "").split("·")[0].trim();
    if (!name || name === "Home") return; // home doesn't need to track itself
    const entry = { title: name, href: window.location.pathname + window.location.search, at: Date.now() };
    let list = [];
    try { list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch (e) {}
    list = [entry, ...list.filter(x => x.title !== entry.title)].slice(0, RECENT_MAX);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function renderRecentlyViewed() {
    const slot = document.getElementById("ah-recent");
    if (!slot) return;
    let list = [];
    try { list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch (e) {}
    if (!list.length) { slot.hidden = true; return; }
    slot.hidden = false;
    slot.innerHTML = `
      <p class="ah-recent__label">Recently viewed</p>
      <div class="ah-recent__row">
        ${list.map(x => `<a class="ah-recent__chip" href="${x.href}">${x.title}</a>`).join("")}
      </div>
    `;
  }

  // ---------------------------------------------------------- 3. What's new ribbon
  const RIBBON_KEY = "ah:lastCommit";
  const RIBBON_TTL = 60 * 60 * 1000; // 1h
  const RIBBON_DISMISS_KEY = "ah:ribbonDismissedSha";

  async function fetchLatestCommit() {
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(RIBBON_KEY) || "null"); } catch (e) {}
    if (cached && cached.cachedAt && (Date.now() - cached.cachedAt) < RIBBON_TTL) return cached;
    try {
      const r = await fetch("https://api.github.com/repos/microsoft/Analytics-Hub/commits?per_page=1", { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const arr = await r.json();
      const c = arr[0];
      const payload = {
        cachedAt: Date.now(),
        sha:      c.sha,
        shortSha: c.sha.slice(0, 7),
        message:  (c.commit.message || "").split("\n")[0],
        author:   c.commit.author && c.commit.author.name,
        when:     c.commit.author && c.commit.author.date,
        url:      c.html_url,
      };
      try { sessionStorage.setItem(RIBBON_KEY, JSON.stringify(payload)); } catch (e) {}
      return payload;
    } catch (e) { return null; }
  }

  function relativeTime(iso) {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.round(m / 60);
    if (h < 24) return h + "h ago";
    const d = Math.round(h / 24);
    return d + "d ago";
  }

  async function renderRibbon() {
    const slot = document.getElementById("ah-ribbon");
    if (!slot) return;
    const payload = await fetchLatestCommit();
    if (!payload) return;
    let dismissed = "";
    try { dismissed = localStorage.getItem(RIBBON_DISMISS_KEY) || ""; } catch (e) {}
    if (dismissed === payload.sha) return;
    slot.innerHTML = `
      <div class="ah-ribbon__inner">
        <span class="ah-ribbon__tag">What's new</span>
        <a class="ah-ribbon__msg" href="${payload.url}" target="_blank" rel="noopener" title="${payload.message.replace(/"/g, "&quot;")}">${payload.message}</a>
        <span class="ah-ribbon__meta">· ${payload.shortSha} · ${relativeTime(payload.when)}</span>
        <button class="ah-ribbon__close" type="button" aria-label="Dismiss">×</button>
      </div>
    `;
    slot.hidden = false;
    slot.querySelector(".ah-ribbon__close").addEventListener("click", () => {
      slot.hidden = true;
      try { localStorage.setItem(RIBBON_DISMISS_KEY, payload.sha); } catch (e) {}
    });
  }

  // ---------------------------------------------------------- Star CTA in header
  // Lightweight, no external buttons.js dependency. Fetches star count from
  // the GitHub API once per session and caches it.
  async function addStarCta() {
    const header = document.querySelector(".site-header .wrap");
    if (!header) return;
    const navCta = header.querySelector(".nav-cta");
    const a = document.createElement("a");
    a.className = "ah-star";
    a.href = "https://github.com/microsoft/Analytics-Hub";
    a.target = "_blank";
    a.rel = "noopener";
    a.title = "Star microsoft/Analytics-Hub on GitHub";
    a.innerHTML = `<span class="ah-star__icon">★</span><span class="ah-star__label">Star</span><span class="ah-star__count" aria-hidden="true">—</span>`;
    a.addEventListener("click", () => {
      try { window.clarity && window.clarity("event", "Star CTA clicked"); } catch (e) {}
    });
    // Insert just before the nav-cta if present (so order is: nav links · Star · View on GitHub)
    if (navCta) navCta.parentNode.insertBefore(a, navCta);
    else header.appendChild(a);

    // Fill count from sessionStorage or fetch
    const KEY = "ah:starCount";
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
    if (cached && cached.cachedAt && (Date.now() - cached.cachedAt) < RIBBON_TTL) {
      a.querySelector(".ah-star__count").textContent = cached.count.toLocaleString();
      return;
    }
    try {
      const r = await fetch("https://api.github.com/repos/microsoft/Analytics-Hub");
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const count = j.stargazers_count || 0;
      a.querySelector(".ah-star__count").textContent = count.toLocaleString();
      try { sessionStorage.setItem(KEY, JSON.stringify({ cachedAt: Date.now(), count })); } catch (e) {}
    } catch (e) {
      a.querySelector(".ah-star__count").style.display = "none";
    }
  }

  // ---------------------------------------------------------- 6. Live prefers-color-scheme
  function watchSystemTheme() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      let stored = null;
      try { stored = localStorage.getItem("theme"); } catch (e) {}
      if (stored) return; // user has an explicit override; respect it
      const next = mq.matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      const tt = document.getElementById("themeToggle");
      if (tt) tt.textContent = next === "dark" ? "☀" : "◐";
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  // Add a hover tooltip to the existing theme toggle.
  function tooltipThemeToggle() {
    const tt = document.getElementById("themeToggle");
    if (!tt) return;
    tt.title = tt.title || "Toggle light / dark theme (auto-follows your system unless overridden)";
    tt.setAttribute("aria-label", tt.title);
  }

  // ---------------------------------------------------------- boot
  document.addEventListener("DOMContentLoaded", () => {
    const palette = buildPalette();
    addPaletteTrigger(palette.open);
    addHamburger();
    addStarCta();
    tooltipThemeToggle();
    watchSystemTheme();
    trackCurrentPage();
    renderRecentlyViewed(); // no-op if #ah-recent isn't on the page
    renderRibbon();         // no-op if #ah-ribbon isn't on the page
  });
})();
