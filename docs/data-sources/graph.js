// Analytics Hub · Data-Sources ecosystem
// =====================================================================
// To add a new node:
//   1. push into NODES with { id, kind, label, sub?, icon, color, col, row }
//   2. push edge(s) into EDGES with { from, to, style? ('solid'|'dashed') }
// The diagram, the connector lines, and the detail-card grid will all
// pick it up automatically.
// =====================================================================

// kind: 'source' | 'pipe' | 'report' | 'addon'
const NODES = [
  // ---- column 0 : SOURCES ----
  { id: "purview",     kind: "source", label: "Microsoft Purview",     sub: "Audit Logs (Graph API / Portal)",   icon: "🛡️", color: "#8661c5", col: 0, row: 0,
    detail: "Unified Audit Log records covering Copilot interactions, file activity, Teams events, and Agent invocations.",
    role:   "Audit Reader or above" },
  { id: "viva",        kind: "source", label: "Viva Insights",         sub: "Person Query (Behavioral Data)",     icon: "📊", color: "#00B294", col: 0, row: 1,
    detail: "Person-level work-pattern metrics — collaboration, focus, meeting load, and Copilot interactions.",
    role:   "Viva Insights license + Analyst role" },
  { id: "github",      kind: "source", label: "GitHub Enterprise",     sub: "Usage API + Members",                icon: "⚡", color: "#0078d4", col: 0, row: 2,
    detail: "Per-team and per-user GitHub Copilot usage — chat vs agent, language, model, acceptance rates.",
    role:   "GitHub Enterprise admin" },
  { id: "entra",       kind: "source", label: "Microsoft Entra ID",    sub: "Users · Groups · Licenses",          icon: "👤", color: "#0078d4", col: 0, row: 3,
    detail: "User profiles, department, license status. Used to enrich audit data with org context.",
    role:   "User Administrator or Global Reader" },
  { id: "m365admin",   kind: "source", label: "M365 Admin + Surveys",  sub: "Usage exports · Sentiment",          icon: "📥", color: "#FFB900", col: 0, row: 4,
    detail: "Public M365 usage exports plus employee sentiment data. Works for any tenant admin.",
    role:   "Any tenant admin" },
  { id: "local-vscode", kind: "source", label: "Local Copilot Sessions", sub: "VS Code · your machine only",       icon: "💻", color: "#e3008c", col: 0, row: 5,
    detail: "Your own GitHub Copilot and Claude chat-session files on your local machine. Nothing leaves your laptop.",
    role:   "Just you — no admin needed" },

  // ---- column 1 : PIPES / EXTRACTORS ----
  { id: "scripts",     kind: "pipe",   label: "Per-Report Scripts",    sub: "Bundled w/ each template",           icon: "📜", color: "#0078d4", col: 1, row: 0,
    detail: "PowerShell + Azure Automation runbooks that pull just what one report needs. No infra to stand up." },
  { id: "pax",         kind: "pipe",   label: "PAX (Standalone)",      sub: "Enterprise audit exporter",          icon: "🔌", color: "#8661c5", col: 1, row: 1,
    detail: "No row limits · schedulable · pushes to Data Lake, Warehouse, Fabric, SIEM, or any tool. Optional Power BI feed.",
    repo:   "https://github.com/microsoft/pax" },

  // ---- column 2 : REPORTS / TEMPLATES ----
  { id: "ai-in-one",        kind: "report", label: "AI-in-One Dashboard",      sub: "All Copilot surfaces + Agents",  icon: "🌐", color: "#FFB900", col: 2, row: 0,
    repo: "https://github.com/microsoft/AI-in-One-Dashboard" },
  { id: "chat-agent",       kind: "report", label: "Copilot Chat & Agent Intel", sub: "Deep-dive activity analytics", icon: "💬", color: "#FFB900", col: 2, row: 1,
    repo: "https://github.com/microsoft/CopilotChatAnalytics" },
  { id: "m365-readiness",   kind: "report", label: "M365 Copilot Readiness",   sub: "License readiness · adoption gaps", icon: "✅", color: "#FFB900", col: 2, row: 2,
    repo: "https://github.com/microsoft/M365UsageAnalytics" },
  { id: "super-usage",      kind: "report", label: "Super Usage Analysis",     sub: "Super user identification",      icon: "🦸", color: "#00B294", col: 2, row: 3,
    repo: "https://github.com/microsoft/DecodingSuperUsage" },
  { id: "super-impact",     kind: "report", label: "Super User Impact",        sub: "Work-behavior impact metrics",   icon: "📈", color: "#00B294", col: 2, row: 4,
    repo: "https://github.com/microsoft/superuserimpact" },
  { id: "ghcp-impact",      kind: "report", label: "GitHub Copilot Impact",    sub: "Dev productivity analytics",     icon: "⚙️", color: "#0078d4", col: 2, row: 5,
    repo: "https://github.com/microsoft/GitHubCopilotImpact" },
  { id: "adoption-sent",    kind: "report", label: "Adoption & Sentiment",     sub: "Usage trends + survey data",     icon: "💚", color: "#FFB900", col: 2, row: 6,
    repo: "https://github.com/olivierpecheux/copilot-adoption-sentiment-report" },

  // ---- column 3 : ADD-ONS (spawn off reports) ----
  { id: "roi-calc",         kind: "addon",  label: "ROI Calculator",           sub: "Spawns from Super Usage Heatmap", icon: "🧮", color: "#e3008c", col: 3, row: 3,
    detail: "Add-on that turns the Super Usage Heatmap CSV into a dollarised ROI summary for execs." },
  { id: "customize",        kind: "addon",  label: "CustomizeCopilot",         sub: "Champion-ID add-on",              icon: "🎨", color: "#e3008c", col: 3, row: 4,
    detail: "Pages and visuals you can graft onto Super User Impact to identify and recognise champions.",
    repo: "https://github.com/microsoft/customizecopilot" },
  { id: "what-i-did",       kind: "addon",  label: "What I Did (Copilot)",     sub: "Personal VS Code activity digest", icon: "📝", color: "#e3008c", col: 3, row: 5,
    detail: "Runs locally in VS Code, scans your own Copilot/Claude session files, and produces a daily digest of what you built. Doesn't touch any tenant data.",
    repo: "https://github.com/microsoft/What-I-Did-Copilot" },
];

// from → to. style: 'solid' (default) or 'dashed' (optional path)
const EDGES = [
  // Purview → both extractors
  { from: "purview", to: "scripts" },
  { from: "purview", to: "pax" },
  // Scripts feeds the Purview-based reports
  { from: "scripts", to: "ai-in-one" },
  { from: "scripts", to: "chat-agent" },
  { from: "scripts", to: "m365-readiness" },
  // PAX optionally feeds the same reports
  { from: "pax", to: "ai-in-one",      style: "dashed" },
  { from: "pax", to: "chat-agent",     style: "dashed" },
  { from: "pax", to: "m365-readiness", style: "dashed" },
  // Entra enriches the Purview reports
  { from: "entra", to: "ai-in-one",      style: "dashed" },
  { from: "entra", to: "chat-agent",     style: "dashed" },
  { from: "entra", to: "m365-readiness", style: "dashed" },
  // Viva straight into its reports
  { from: "viva", to: "super-usage" },
  { from: "viva", to: "super-impact" },
  // GitHub straight into ghcp impact
  { from: "github", to: "ghcp-impact" },
  // M365 admin & surveys into adoption
  { from: "m365admin", to: "adoption-sent" },
  // Add-ons spawn off reports
  { from: "super-usage",   to: "roi-calc" },
  { from: "super-impact",  to: "customize" },
  { from: "adoption-sent", to: "customize" },
  // What I Did is personal/local, not from any tenant report
  { from: "local-vscode",  to: "what-i-did" },
];

// =====================================================================
// Render
// =====================================================================
const ICON_BY_KIND = { source: "src", pipe: "pipe", report: "rpt", addon: "addon" };

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const c of children) if (c != null) n.append(c.nodeType ? c : document.createTextNode(c));
  return n;
}

function renderNodes() {
  const host = document.getElementById("dsNodes");
  host.innerHTML = "";

  // size per column / row
  const cols = Math.max(...NODES.map(n => n.col)) + 1;
  const rows = Math.max(...NODES.map(n => n.row)) + 1;
  host.style.setProperty("--ds-cols", cols);
  host.style.setProperty("--ds-rows", rows);

  for (const n of NODES) {
    const node = el("button", {
      class: `ds-node ds-${n.kind}`,
      "data-id": n.id,
      "data-kind": n.kind,
      style: `--c:${n.color}; grid-column:${n.col + 1}; grid-row:${n.row + 1};`,
      onclick: () => openDrawer(n.id),
      onmouseenter: () => highlight(n.id),
      onmouseleave: () => highlight(null),
    });
    node.append(
      el("span", { class: "ds-node-icon", "aria-hidden": "true" }, n.icon),
      el("span", { class: "ds-node-body" },
        el("span", { class: "ds-node-label" }, n.label),
        n.sub ? el("span", { class: "ds-node-sub" }, n.sub) : null
      )
    );
    host.append(node);
  }
}

// Pre-compute edges, then redraw on every resize / scroll-into-view
function drawLines() {
  const svg = document.getElementById("dsLines");
  const canvas = document.getElementById("dsCanvas");
  const rect = canvas.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
  svg.setAttribute("width", rect.width);
  svg.setAttribute("height", rect.height);
  svg.innerHTML = "";

  // gradient defs so each line tints toward its source color
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.append(defs);

  EDGES.forEach((e, i) => {
    const a = document.querySelector(`.ds-node[data-id="${e.from}"]`);
    const b = document.querySelector(`.ds-node[data-id="${e.to}"]`);
    if (!a || !b) return;
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const x1 = ra.right - rect.left;
    const y1 = ra.top + ra.height / 2 - rect.top;
    const x2 = rb.left - rect.left;
    const y2 = rb.top + rb.height / 2 - rect.top;
    const dx = Math.max(40, (x2 - x1) * 0.45);

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
    path.setAttribute("fill", "none");
    path.setAttribute("class", `ds-edge ds-edge-${e.style || "solid"}`);
    path.setAttribute("data-from", e.from);
    path.setAttribute("data-to", e.to);
    const colorA = NODES.find(n => n.id === e.from)?.color || "#0078d4";
    path.setAttribute("stroke", colorA);
    svg.append(path);
  });
}

function highlight(id) {
  const svg = document.getElementById("dsLines");
  document.querySelectorAll(".ds-node").forEach(n => n.classList.remove("is-related", "is-faded"));
  svg.querySelectorAll(".ds-edge").forEach(p => p.classList.remove("is-active", "is-faded"));
  if (!id) return;
  const related = new Set([id]);
  EDGES.forEach(e => {
    if (e.from === id) related.add(e.to);
    if (e.to === id) related.add(e.from);
  });
  document.querySelectorAll(".ds-node").forEach(n => {
    const nid = n.getAttribute("data-id");
    if (related.has(nid)) n.classList.add("is-related"); else n.classList.add("is-faded");
  });
  svg.querySelectorAll(".ds-edge").forEach(p => {
    const f = p.getAttribute("data-from"), t = p.getAttribute("data-to");
    if (f === id || t === id) p.classList.add("is-active"); else p.classList.add("is-faded");
  });
}

function openDrawer(id) {
  const n = NODES.find(x => x.id === id);
  if (!n) return;
  const drawer = document.getElementById("dsDrawer");
  const body = document.getElementById("dsDrawerBody");

  const upstream = EDGES.filter(e => e.to === id).map(e => NODES.find(x => x.id === e.from)).filter(Boolean);
  const downstream = EDGES.filter(e => e.from === id).map(e => NODES.find(x => x.id === e.to)).filter(Boolean);

  const chips = arr => arr.length
    ? `<div class="ds-chips">${arr.map(x => `<button class="ds-chip" data-jump="${x.id}" style="--c:${x.color}">${x.icon} ${x.label}</button>`).join("")}</div>`
    : `<p class="ds-empty">—</p>`;

  body.innerHTML = `
    <div class="ds-drawer-head" style="--c:${n.color}">
      <div class="ds-drawer-icon">${n.icon}</div>
      <div>
        <div class="ds-drawer-kind">${n.kind}</div>
        <h3>${n.label}</h3>
        ${n.sub ? `<p class="ds-drawer-sub">${n.sub}</p>` : ""}
      </div>
    </div>
    ${n.detail ? `<p class="ds-drawer-detail">${n.detail}</p>` : ""}
    ${n.role ? `<p class="ds-drawer-role"><strong>Access required:</strong> ${n.role}</p>` : ""}

    <h4>Feeds from</h4>
    ${chips(upstream)}

    <h4>Powers</h4>
    ${chips(downstream)}

    ${n.repo ? `<a class="btn btn-primary ds-drawer-cta" href="${n.repo}" target="_blank" rel="noopener">Open repository ↗</a>` : ""}
  `;
  drawer.hidden = false;
  drawer.classList.add("is-open");
  // wire jump chips
  body.querySelectorAll(".ds-chip").forEach(b => {
    b.addEventListener("click", () => openDrawer(b.getAttribute("data-jump")));
  });
  highlight(id);
}

function closeDrawer() {
  const drawer = document.getElementById("dsDrawer");
  drawer.classList.remove("is-open");
  setTimeout(() => { drawer.hidden = true; }, 200);
  highlight(null);
}

function renderGrid() {
  const grid = document.getElementById("dsGrid");
  const sources = NODES.filter(n => n.kind === "source");
  grid.innerHTML = sources.map(n => {
    const powers = new Set();
    // walk forward up to 3 hops so source → pipe → report shows up
    let frontier = [n.id];
    for (let hop = 0; hop < 3; hop++) {
      const next = [];
      for (const id of frontier) {
        EDGES.filter(e => e.from === id).forEach(e => {
          const tgt = NODES.find(x => x.id === e.to);
          if (!tgt) return;
          if (tgt.kind === "report" || tgt.kind === "addon") powers.add(tgt.id);
          else next.push(tgt.id);
        });
      }
      frontier = next;
    }
    const tags = [...powers].map(pid => {
      const p = NODES.find(x => x.id === pid);
      return `<span class="tool-tag">${p.label}</span>`;
    }).join("");
    return `
      <article class="ds-card" style="--ic:${n.color}">
        <div class="ds-card-icon">${n.icon}</div>
        <h3>${n.label}</h3>
        <p>${n.detail || n.sub || ""}</p>
        ${n.role ? `<p class="ds-card-role">${n.role}</p>` : ""}
        <div class="data-tools">${tags}</div>
        <button class="ds-card-link" data-jump="${n.id}">Show on diagram →</button>
      </article>`;
  }).join("");

  grid.querySelectorAll(".ds-card-link").forEach(b => {
    b.addEventListener("click", () => {
      document.getElementById("dsCanvas").scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => openDrawer(b.getAttribute("data-jump")), 300);
    });
  });
}

// =====================================================================
function init() {
  renderNodes();
  renderGrid();
  // wait one frame so layout settles before measuring
  requestAnimationFrame(drawLines);
  window.addEventListener("resize", () => requestAnimationFrame(drawLines));
  document.getElementById("dsDrawerClose").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
