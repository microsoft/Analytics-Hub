/* ============================================================
   Analytics Hub · Copilot widget  (vanilla JS, no build step)
   ============================================================

   Phase 1 (now) — staging on jordankingisalive fork:
     BYO Azure OpenAI key, stored in localStorage. Visitor opens
     the widget, clicks the gear, pastes endpoint + deployment +
     key. Key never leaves their browser.

   Phase 2 (production) — when ready to point microsoft/* at this:
     Stand up an Azure Function with a single POST /chat endpoint
     that proxies to Azure OpenAI with a server-side key. Set
     window.AH_COPILOT_PROXY = "https://<func>.azurewebsites.net/api/chat"
     in a small inline <script> before this file loads. The
     `callLLM` function below will detect it and route there instead
     of calling Azure OpenAI directly. Settings panel will hide the
     credential fields automatically.
   ============================================================ */

(function () {
  "use strict";
  if (window.__ahCopilotLoaded) return;
  window.__ahCopilotLoaded = true;

  // -------------------------------------------------- 0. Asset base
  // Derive the directory this script lives in so relative fetches work
  // from any page depth.
  function findBase() {
    const scripts = document.getElementsByTagName("script");
    for (const s of scripts) {
      const src = s.getAttribute("src") || "";
      const m = src.match(/^(.*\/copilot\/)widget\.js(\?.*)?$/);
      if (m) return new URL(m[1], window.location.href).href;
    }
    // Fallback — assume same directory as the current page + /copilot/
    return new URL("copilot/", window.location.href).href;
  }
  const BASE = findBase();

  // -------------------------------------------------- 0a. Load runtime config
  // /copilot/config.json may set the proxy URL so we don't have to hard-code it
  // on every page. If present and non-empty, switches the widget to proxy mode
  // automatically (hides BYO-key UI).
  async function loadProxyConfig() {
    if (window.AH_COPILOT_PROXY) return;        // already set by inline script
    try {
      const r = await fetch(BASE + "config.json", { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json();
      if (j && typeof j.proxyUrl === "string" && j.proxyUrl.trim()) {
        window.AH_COPILOT_PROXY = j.proxyUrl.trim();
      }
    } catch (_) { /* ignore — fall back to BYO-key mode */ }
  }

  // -------------------------------------------------- 1. Inject CSS
  if (!document.querySelector('link[data-cp-style]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = BASE + "widget.css";
    link.setAttribute("data-cp-style", "1");
    document.head.appendChild(link);
  }

  // -------------------------------------------------- 2. Settings store
  const SETTINGS_KEY = "ah-copilot-settings-v1";
  const HISTORY_KEY  = "ah-copilot-history-v1";

  function getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return defaultSettings();
      return { ...defaultSettings(), ...JSON.parse(raw) };
    } catch (_) { return defaultSettings(); }
  }
  function saveSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (_) {}
  }
  function defaultSettings() {
    return {
      endpoint: "",        // e.g. https://my-aoai.openai.azure.com
      deployment: "",      // e.g. gpt-4o-mini
      apiVersion: "2024-08-01-preview",
      apiKey: "",
    };
  }
  function isConfigured(s = getSettings()) {
    if (window.AH_COPILOT_PROXY) return true;
    return !!(s.endpoint && s.deployment && s.apiKey);
  }

  function getHistory() {
    try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY)) || []; }
    catch (_) { return []; }
  }
  function saveHistory(h) {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-20))); } catch (_) {}
  }

  // -------------------------------------------------- 3. Corpus + retrieval
  let CORPUS = null;
  let CORPUS_LOADING = null;

  async function loadCorpus() {
    if (CORPUS) return CORPUS;
    if (CORPUS_LOADING) return CORPUS_LOADING;
    CORPUS_LOADING = fetch(BASE + "corpus.json")
      .then(r => r.json())
      .then(j => {
        // Pre-tokenize once
        for (const d of j.docs) d.__tokens = tokenize(d.title + " " + d.text);
        CORPUS = j;
        return j;
      })
      .catch(e => { console.warn("[ah-copilot] corpus load failed", e); CORPUS = { docs: [] }; return CORPUS; });
    return CORPUS_LOADING;
  }

  const STOP = new Set("a,an,and,are,as,at,be,by,for,from,has,have,how,i,in,is,it,of,on,or,that,the,to,was,what,when,where,which,who,why,will,with,you,your,this,these,those,can,do,does,if,my,me,we,us,our".split(","));
  function tokenize(s) {
    return (s || "").toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOP.has(t));
  }

  function retrieve(query, k = 5) {
    if (!CORPUS || !CORPUS.docs.length) return [];
    const qTokens = tokenize(query);
    if (!qTokens.length) return [];
    const qSet = new Set(qTokens);
    // Score = overlap count + tiny title boost
    const scored = CORPUS.docs.map(d => {
      let score = 0;
      for (const t of d.__tokens) if (qSet.has(t)) score++;
      const titleTokens = tokenize(d.title);
      for (const t of titleTokens) if (qSet.has(t)) score += 2;
      return { d, score };
    }).filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
    return scored.map(x => x.d);
  }

  function trimChunk(text, maxChars = 2200) {
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars) + "…";
  }

  // -------------------------------------------------- 4. LLM call
  const SYSTEM_PROMPT = `You are the Analytics Hub assistant — a helpful, concise guide to Microsoft's open-source Copilot adoption analytics toolkit hosted at https://microsoft.github.io/Analytics-Hub/.

Use the provided CONTEXT to answer questions about the reports (AI-in-One Dashboard, Copilot Chat & Agent Intelligence, Super Usage Adoption, Super User Impact, GitHub Copilot Impact, M365 Copilot Readiness, Adoption & Sentiment, PAX, ROI Calculator, CustomizeCopilot, What I Did), their setup, prerequisites, data sources, and licensing requirements.

Rules:
- Ground every factual claim in the CONTEXT. If the answer is not there, say so plainly and suggest where on the site to look (e.g. "find-a-tool" or the report's README).
- Be concise: 2–4 short paragraphs or a tight bulleted list. No filler.
- When you reference a specific report, mention it by name.
- Never invent repository URLs, license types, time estimates, or commands. If unsure, say "check the README".
- Format with simple markdown: short bullets, bold for tool names, inline code for filenames or commands.`;

  async function callLLM(userMessage, history) {
    const ctx = retrieve(userMessage, 5);
    const contextBlock = ctx.length
      ? ctx.map((d, i) => `[${i+1}] ${d.title} (${d.source})\n${trimChunk(d.text)}`).join("\n\n---\n\n")
      : "(no matching content found in the site corpus)";

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `CONTEXT:\n\n${contextBlock}` },
      ...history.slice(-8).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    let url, headers, body;
    if (window.AH_COPILOT_PROXY) {
      // Phase 2 — Function App proxy
      url = window.AH_COPILOT_PROXY;
      headers = { "content-type": "application/json" };
      body = JSON.stringify({ messages });
    } else {
      // Phase 1 — direct Azure OpenAI with BYO key
      const s = getSettings();
      const ep = s.endpoint.replace(/\/+$/, "");
      url = `${ep}/openai/deployments/${encodeURIComponent(s.deployment)}/chat/completions?api-version=${encodeURIComponent(s.apiVersion)}`;
      headers = { "content-type": "application/json", "api-key": s.apiKey };
      body = JSON.stringify({ messages, temperature: 0.3, max_tokens: 800 });
    }

    const resp = await fetch(url, { method: "POST", headers, body });
    if (!resp.ok) {
      let detail = "";
      try { detail = (await resp.text()).slice(0, 240); } catch (_) {}
      throw new Error(`${resp.status} ${resp.statusText}${detail ? " — " + detail : ""}`);
    }
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content?.trim() || "(no response)";
    return { content, sources: ctx.map(d => ({ title: d.title, url: d.url, source: d.source })) };
  }

  // -------------------------------------------------- 5. Markdown (tiny, safe)
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function renderMarkdown(md) {
    // Code fences first
    let html = escapeHtml(md);
    html = html.replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Bold + italic
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    // Links [text](url) — only allow http/https
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Lists
    html = html.replace(/(?:^|\n)((?:- [^\n]+\n?)+)/g, (_, block) => {
      const items = block.trim().split(/\n/).map(l => `<li>${l.replace(/^- /, "")}</li>`).join("");
      return `\n<ul>${items}</ul>`;
    });
    return html;
  }

  // -------------------------------------------------- 6. UI
  const SUGGESTIONS = [
    "Which report should I start with for measuring adoption?",
    "What's the difference between AI-in-One and Chat & Agent Intelligence?",
    "How do I set up PAX to export audit logs?",
    "Which reports run on Viva Insights vs Purview audit logs?",
  ];

  const ICON_SPARK = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/></svg>';
  const ICON_GEAR  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  const ICON_SEND  = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>';

  function buildUI() {
    // Launcher
    const launcher = document.createElement("button");
    launcher.className = "cp-launcher";
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Open Analytics Hub assistant");
    launcher.setAttribute("aria-expanded", "false");
    launcher.innerHTML = ICON_SPARK + '<span class="cp-launcher-label">Ask the Analytics Hub assistant</span>';
    document.body.appendChild(launcher);

    // Backdrop
    const backdrop = document.createElement("div");
    backdrop.className = "cp-backdrop";
    document.body.appendChild(backdrop);

    // Drawer
    const drawer = document.createElement("aside");
    drawer.className = "cp-drawer";
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-label", "Analytics Hub assistant");
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <header class="cp-head">
        <div class="cp-head-title">
          Analytics Hub Assistant
          <span class="cp-head-sub">Grounded in the site, READMEs, and email templates</span>
        </div>
        <button class="cp-icon-btn cp-btn-settings" type="button" aria-label="Settings">${ICON_GEAR}</button>
        <button class="cp-icon-btn cp-btn-close"    type="button" aria-label="Close">${ICON_CLOSE}</button>
      </header>
      <div class="cp-body" role="log" aria-live="polite"></div>
      <footer class="cp-foot">
        <form class="cp-compose" autocomplete="off">
          <textarea class="cp-input" rows="1" placeholder="Ask about any report, setup step, or data source…" aria-label="Message"></textarea>
          <button class="cp-send" type="submit" disabled aria-label="Send">${ICON_SEND}</button>
        </form>
        <div class="cp-foot-meta">
          <span class="cp-status">${window.AH_COPILOT_PROXY ? "Live \u00b7 Azure OpenAI via Function proxy" : "Demo \u00b7 BYO Azure OpenAI key"}</span>
          <button type="button" class="cp-clear">Clear chat</button>
        </div>
      </footer>
      <div class="cp-settings" role="region" aria-label="Assistant settings">
        <h3>Connect Azure OpenAI</h3>
        <p class="cp-settings-help">This staging demo calls Azure OpenAI directly from your browser using a key you paste here. It is stored in <code>localStorage</code> on this device only. For production we will route through an Azure Function proxy.</p>
        <label for="cp-set-endpoint">Endpoint</label>
        <input id="cp-set-endpoint"   type="url"      placeholder="https://my-resource.openai.azure.com" />
        <label for="cp-set-deployment">Deployment name</label>
        <input id="cp-set-deployment" type="text"     placeholder="gpt-4o-mini" />
        <label for="cp-set-apiver">API version</label>
        <input id="cp-set-apiver"     type="text"     placeholder="2024-08-01-preview" />
        <label for="cp-set-key">API key</label>
        <input id="cp-set-key"        type="password" placeholder="paste key" autocomplete="off" />
        <div class="cp-settings-actions">
          <button type="button" class="cp-settings-cancel">Cancel</button>
          <button type="button" class="cp-settings-save">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);

    return { launcher, backdrop, drawer };
  }

  // -------------------------------------------------- 7. Wire it up
  function init() {
    const { launcher, backdrop, drawer } = buildUI();
    const body     = drawer.querySelector(".cp-body");
    const form     = drawer.querySelector(".cp-compose");
    const input    = drawer.querySelector(".cp-input");
    const sendBtn  = drawer.querySelector(".cp-send");
    const closeBtn = drawer.querySelector(".cp-btn-close");
    const gearBtn  = drawer.querySelector(".cp-btn-settings");
    const clearBtn = drawer.querySelector(".cp-clear");
    const settings = drawer.querySelector(".cp-settings");
    const setCancel= drawer.querySelector(".cp-settings-cancel");
    const setSave  = drawer.querySelector(".cp-settings-save");
    const setEp    = drawer.querySelector("#cp-set-endpoint");
    const setDep   = drawer.querySelector("#cp-set-deployment");
    const setVer   = drawer.querySelector("#cp-set-apiver");
    const setKey   = drawer.querySelector("#cp-set-key");

    let history = getHistory();
    let busy = false;

    function clarity(name, value) {
      try { window.clarity && window.clarity("event", name, value); } catch (_) {}
    }

    function openDrawer() {
      drawer.classList.add("cp-open");
      backdrop.classList.add("cp-open");
      drawer.setAttribute("aria-hidden", "false");
      launcher.setAttribute("aria-expanded", "true");
      input.focus();
      loadCorpus();
      clarity("Copilot widget opened", window.location.pathname);
    }
    function closeDrawer() {
      drawer.classList.remove("cp-open");
      backdrop.classList.remove("cp-open");
      drawer.setAttribute("aria-hidden", "true");
      launcher.setAttribute("aria-expanded", "false");
      settings.classList.remove("cp-open");
    }
    launcher.addEventListener("click", () => {
      drawer.classList.contains("cp-open") ? closeDrawer() : openDrawer();
    });
    closeBtn.addEventListener("click", closeDrawer);
    backdrop.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && drawer.classList.contains("cp-open")) closeDrawer();
    });

    // Settings panel
    function openSettings() {
      const s = getSettings();
      setEp.value  = s.endpoint;
      setDep.value = s.deployment;
      setVer.value = s.apiVersion;
      setKey.value = s.apiKey;
      settings.classList.add("cp-open");
    }
    gearBtn.addEventListener("click", openSettings);
    setCancel.addEventListener("click", () => settings.classList.remove("cp-open"));
    setSave.addEventListener("click", () => {
      saveSettings({
        endpoint:   setEp.value.trim(),
        deployment: setDep.value.trim(),
        apiVersion: setVer.value.trim() || "2024-08-01-preview",
        apiKey:     setKey.value.trim(),
      });
      settings.classList.remove("cp-open");
      render();
      clarity("Copilot settings saved", "");
    });

    // Clear chat
    clearBtn.addEventListener("click", () => {
      history = [];
      saveHistory(history);
      render();
    });

    // Composer
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(140, input.scrollHeight) + "px";
      sendBtn.disabled = !input.value.trim() || busy;
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.requestSubmit();
      }
    });
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text || busy) return;
      if (!isConfigured()) { openSettings(); return; }

      input.value = "";
      input.style.height = "auto";
      sendBtn.disabled = true;
      busy = true;

      history.push({ role: "user", content: text });
      render();
      addTyping();

      clarity("Copilot question asked", text.slice(0, 80));

      try {
        const { content, sources } = await callLLM(text, history.slice(0, -1));
        history.push({ role: "assistant", content, sources });
        saveHistory(history);
        removeTyping();
        render();
      } catch (err) {
        removeTyping();
        history.push({
          role: "assistant",
          content: `**Couldn't reach Azure OpenAI.**\n\n\`${err.message}\`\n\nDouble-check your endpoint, deployment name, and key in settings (gear icon).`,
          sources: [],
        });
        saveHistory(history);
        render();
        clarity("Copilot error", err.message.slice(0, 80));
      } finally {
        busy = false;
        sendBtn.disabled = !input.value.trim();
        input.focus();
      }
    });

    function addTyping() {
      const el = document.createElement("div");
      el.className = "cp-msg cp-asst cp-typing-msg";
      el.innerHTML = `<div class="cp-msg-role">Assistant</div><div class="cp-typing"><span></span><span></span><span></span></div>`;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
    }
    function removeTyping() {
      const t = body.querySelector(".cp-typing-msg");
      if (t) t.remove();
    }

    function render() {
      body.innerHTML = "";

      if (!isConfigured()) {
        const n = document.createElement("div");
        n.className = "cp-notice";
        n.innerHTML = `<strong>Connect Azure OpenAI to start chatting.</strong><br>Demo mode stores your key in this browser only. <button type="button">Open settings</button>`;
        n.querySelector("button").addEventListener("click", openSettings);
        body.appendChild(n);
      }

      if (history.length === 0) {
        const w = document.createElement("div");
        w.className = "cp-welcome";
        w.innerHTML = `
          <h3>Ask anything about the Analytics Hub</h3>
          <p>Grounded in every page on the site, all 11 report READMEs, and the admin email templates. Try one of these:</p>
          <div class="cp-suggestions"></div>`;
        const sug = w.querySelector(".cp-suggestions");
        SUGGESTIONS.forEach(s => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "cp-suggestion";
          b.textContent = s;
          b.addEventListener("click", () => {
            input.value = s;
            input.dispatchEvent(new Event("input"));
            form.requestSubmit();
          });
          sug.appendChild(b);
        });
        body.appendChild(w);
      }

      for (const m of history) {
        const el = document.createElement("div");
        el.className = "cp-msg " + (m.role === "user" ? "cp-user" : "cp-asst");
        el.innerHTML = `<div class="cp-msg-role">${m.role === "user" ? "You" : "Assistant"}</div>` +
                       `<div class="cp-msg-content">${m.role === "user" ? escapeHtml(m.content) : renderMarkdown(m.content)}</div>`;
        if (m.role === "assistant" && m.sources && m.sources.length) {
          const cites = document.createElement("div");
          cites.className = "cp-cites";
          for (const src of m.sources) {
            const a = src.url
              ? document.createElement("a")
              : document.createElement("span");
            a.className = "cp-cite";
            if (src.url) { a.href = src.url; a.target = "_blank"; a.rel = "noopener"; }
            a.textContent = src.title;
            cites.appendChild(a);
          }
          el.appendChild(cites);
        }
        body.appendChild(el);
      }
      body.scrollTop = body.scrollHeight;
    }

    render();
  }

  // Defer to avoid layout shift on slow connections.
  // Resolve runtime config BEFORE building UI so the BYO-key prompt
  // never flashes on top of a proxy-mode deployment.
  function boot() {
    loadProxyConfig().finally(init);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
