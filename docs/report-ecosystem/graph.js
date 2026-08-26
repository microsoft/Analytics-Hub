// Analytics Hub · Report Ecosystem
// =====================================================================
// To add a new node:
//   1. push into NODES with { id, kind, label, sub?, icon, color, col }
//      (row position is computed automatically — lanes self-distribute)
//   2. push edge(s) into EDGES with { from, to, style? ('solid'|'dashed') }
// The diagram, connector lines, filter chips, search and the detail-card
// grid all pick it up automatically.
// =====================================================================

// kind: 'source' | 'pipe' | 'report' | 'addon'
const NODES = [
  // ---- column 0 : SOURCES ----
  { id: "purview",     kind: "source", label: "Microsoft Purview",     sub: "Audit Logs (Graph API / Portal)",   icon: "🛡️", color: "#8661c5", col: 0,
    detail: "Unified Audit Log records covering Copilot interactions, file activity, Teams events, and Agent invocations.",
    role:   "Audit Reader or above" },
  { id: "viva",        kind: "source", label: "Viva Insights",         sub: "Person Query (Behavioral Data)",     icon: "📊", color: "#00B294", col: 0,
    detail: "Person-level work-pattern metrics — collaboration, focus, meeting load, and Copilot interactions.",
    role:   "Viva Insights license + Analyst role" },
  { id: "viva-consumption", kind: "source", label: "Viva Consumption Dashboard", sub: "Cowork · Work IQ credits", icon: "🧾", color: "#00B294", col: 0, isNew: true,
    detail: "Per-person, per-week credit consumption for the usage-billed Copilot services — Cowork and the Work IQ API. Exports de-identified by default; identified export is admin-gated.",
    role:   "Viva Insights admin (identified export needs a feature-access policy)" },
  { id: "github",      kind: "source", label: "GitHub Enterprise",     sub: "Usage API + Members",                icon: "⚡", color: "#0078d4", col: 0,
    detail: "Per-team and per-user GitHub Copilot usage — chat vs agent, language, model, acceptance rates.",
    role:   "GitHub Enterprise admin" },
  { id: "entra",       kind: "source", label: "Microsoft Entra ID",    sub: "Users · Groups · Licenses",          icon: "👤", color: "#0078d4", col: 0,
    detail: "User profiles, department, license status. Used to enrich audit, credit and transcript data with org context.",
    role:   "User Administrator or Global Reader" },
  { id: "m365admin",   kind: "source", label: "M365 Admin + Surveys",  sub: "Usage · Cost Mgmt · Sentiment",      icon: "📥", color: "#FFB900", col: 0,
    detail: "M365 admin center exports — usage reports, licensed-user lists, and the Copilot Cost Management credit-consumption export — plus employee sentiment survey data.",
    role:   "Any tenant admin" },
  { id: "ppac",        kind: "source", label: "Power Platform Admin",  sub: "Copilot Studio message credits",     icon: "🔷", color: "#8661c5", col: 0, isNew: true,
    detail: "Per-agent, per-user and per-environment Copilot Studio message-credit consumption reports exported from the Power Platform admin center.",
    role:   "Power Platform administrator" },
  { id: "dataverse",   kind: "source", label: "Microsoft Dataverse",   sub: "Copilot Studio transcripts",         icon: "🗂️", color: "#8661c5", col: 0, isNew: true,
    detail: "The Copilot Studio ConversationTranscript table — every agent session, turn, hand-off and error. Roughly 30 days of retention, so history is accumulated downstream.",
    role:   "Dataverse environment read access" },
  { id: "defender",    kind: "source", label: "Microsoft Defender",    sub: "Advanced Hunting (KQL) · MDA",       icon: "🔎", color: "#e3008c", col: 0, isNew: true,
    detail: "Advanced Hunting threat tables queried with KQL, plus optional Defender for Cloud Apps exports. Used to spot unsanctioned AI tools, OAuth consent risk and behavioural anomalies.",
    role:   "Security Reader (MDA pages need Defender for Cloud Apps)" },
  { id: "onedrive-cowork", kind: "source", label: "OneDrive Cowork Sessions", sub: "Your own Documents/Cowork",   icon: "☁️", color: "#e3008c", col: 0, isNew: true,
    detail: "Your personal Cowork session artifacts — the inputs you gave it and the outputs it produced. Scoped to your own OneDrive; no tenant-level audit data is touched.",
    role:   "Just you — no admin needed" },
  { id: "local-vscode", kind: "source", label: "Local Copilot Sessions", sub: "VS Code · your machine only",      icon: "💻", color: "#e3008c", col: 0,
    detail: "Your own GitHub Copilot and Claude chat-session files on your local machine. Nothing leaves your laptop.",
    role:   "Just you — no admin needed" },

  // ---- column 1 : PIPES / EXTRACTORS ----
  { id: "scripts",     kind: "pipe",   label: "Per-Report Scripts",    sub: "Bundled w/ each template",           icon: "📜", color: "#0078d4", col: 1,
    detail: "PowerShell + Azure Automation runbooks that pull just what one report needs. No infra to stand up." },
  { id: "pax",         kind: "pipe",   label: "PAX (Standalone)",      sub: "Purview + Entra exporter",          icon: "🔌", color: "#8661c5", col: 1,
    detail: "Pulls from Purview Audit Logs and/or Microsoft Entra (supports Entra-only mode — no Purview required). No row limits · schedulable · pushes to Data Lake, Warehouse, Fabric, SIEM, or any tool. Optional Power BI feed.",
    repo:   "https://github.com/microsoft/pax" },
  { id: "fabric",      kind: "pipe",   label: "Fabric / Lakehouse",    sub: "Notebooks · Dataflow Gen2",          icon: "🏗️", color: "#00B294", col: 1, isNew: true,
    detail: "The scale path several templates offer — PySpark notebooks and Dataflow Gen2 land data in a Lakehouse, accumulate history beyond short source retention windows, and drive scheduled refresh." },

  // ---- column 2 : REPORTS / TEMPLATES ----
  { id: "valuelens",        kind: "report", label: "ValueLens",                sub: "Copilot value · maturity · ROI",  icon: "🔬", color: "#FFB900", col: 2, isNew: true,
    topics: ["adoption","engagement","impact","roi","productivity"],
    detail: "Turns Copilot audit logs into a defensible business case — hours saved, assisted value, user-maturity progression (Beginner to Power) and licence ROI. Ships Local CSV, SharePoint and Fabric paths.",
    repo: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot" },
  { id: "consumption-central", kind: "report", label: "Consumption Central",   sub: "Credits & cost, 4 products",      icon: "💳", color: "#FFB900", col: 2, isNew: true,
    topics: ["cost","billing","agents","developer"],
    detail: "Unified credit and cost visibility across Cowork/Work IQ, Copilot Studio, GitHub Copilot and Azure AI Foundry. Fifteen pages of spend, optimisation, forecast and department breakdowns — pages blank out gracefully if a product's data is absent.",
    repo: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot" },
  { id: "agent-evaluator",  kind: "report", label: "Agent Evaluator",          sub: "Copilot Studio agent quality",    icon: "🤖", color: "#FFB900", col: 2, isNew: true,
    topics: ["agents","quality","cost","engagement"],
    detail: "Nine pages on how your Copilot Studio agents actually perform — resolution and escalation rates, sub-agent hand-offs, grounding and citation quality, topic themes, CSAT, and optional per-agent message-credit spend.",
    repo: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio" },
  { id: "credit-usage",     kind: "report", label: "Credit Usage & Chargeback", sub: "Per-department cost attribution", icon: "🧮", color: "#FFB900", col: 2, isNew: true,
    topics: ["billing","cost","license"],
    detail: "Per-user and per-department Copilot credit consumption with chargeback rollup at $0.01/credit — utilisation %, over-limit status and cost-centre attribution for internal billing.",
    repo: "https://github.com/microsoft/CreditUsage" },
  { id: "ai-solutions",     kind: "report", label: "AI Solutions Intelligence", sub: "Shadow AI · OAuth · anomalies",  icon: "🛰️", color: "#FFB900", col: 2, isNew: true,
    topics: ["adoption","risk","engagement","unlicensed"],
    detail: "Ten pages of tenant-wide AI visibility — Copilot adoption alongside unsanctioned 'shadow AI' tool detection, OAuth consent risk scoring, and off-hours/geo behavioural anomalies.",
    repo: "https://github.com/microsoft/AI-Solutions-Intelligence-Dashboard" },
  { id: "ai-in-one",        kind: "report", label: "AI-in-One Dashboard",      sub: "All Copilot surfaces + Agents",  icon: "🌐", color: "#FFB900", col: 2,
    topics: ["adoption","chat","agents","license","engagement"],
    detail: "The broad single-pane view across every Copilot surface and agent activity.",
    repo: "https://github.com/microsoft/AI-in-One-Dashboard" },
  { id: "chat-agent",       kind: "report", label: "Copilot Chat & Agent Intel", sub: "Deep-dive activity analytics", icon: "💬", color: "#FFB900", col: 2,
    topics: ["chat","agents","engagement"],
    repo: "https://github.com/microsoft/CopilotChatAnalytics" },
  { id: "m365-readiness",   kind: "report", label: "M365 Copilot Readiness",   sub: "License readiness · adoption gaps", icon: "✅", color: "#FFB900", col: 2,
    topics: ["license","adoption","unlicensed"],
    repo: "https://github.com/microsoft/M365UsageAnalytics" },
  { id: "super-usage",      kind: "report", label: "Super Usage Analysis",     sub: "Super user identification",      icon: "🦸", color: "#00B294", col: 2,
    topics: ["adoption","productivity","engagement"],
    repo: "https://github.com/microsoft/DecodingSuperUsage" },
  { id: "super-impact",     kind: "report", label: "Super User Impact",        sub: "Work-behavior impact metrics",   icon: "📈", color: "#00B294", col: 2,
    topics: ["impact","productivity","roi"],
    repo: "https://github.com/microsoft/superuserimpact" },
  { id: "ghcp-impact",      kind: "report", label: "GitHub Copilot Impact",    sub: "Dev productivity analytics",     icon: "⚙️", color: "#0078d4", col: 2,
    topics: ["developer","productivity","impact"],
    repo: "https://github.com/microsoft/GitHubCopilotImpact" },
  { id: "adoption-sent",    kind: "report", label: "Adoption & Sentiment",     sub: "Usage trends + survey data",     icon: "💚", color: "#FFB900", col: 2,
    topics: ["adoption","sentiment","engagement"],
    repo: "https://github.com/olivierpecheux/copilot-adoption-sentiment-report" },

  // ---- column 3 : ADD-ONS (spawn off reports / personal tools) ----
  { id: "roi-calc",         kind: "addon",  label: "ROI Calculator",           sub: "Spawns from Super Usage Heatmap", icon: "💰", color: "#e3008c", col: 3,
    topics: ["roi","impact"],
    detail: "Add-on that turns the Super Usage Heatmap CSV into a dollarised ROI summary for execs." },
  { id: "customize",        kind: "addon",  label: "CustomizeCopilot",         sub: "Champion-ID add-on",              icon: "🎨", color: "#e3008c", col: 3,
    topics: ["customization"],
    detail: "Pages and visuals you can graft onto Super User Impact to identify and recognise champions.",
    repo: "https://github.com/microsoft/customizecopilot" },
  { id: "what-i-did",       kind: "addon",  label: "What I Did (Copilot)",     sub: "Personal VS Code activity digest", icon: "📝", color: "#e3008c", col: 3,
    topics: ["productivity","impact"],
    detail: "Runs locally in VS Code, scans your own Copilot/Claude session files, and produces a daily digest of what you built. Doesn't touch any tenant data.",
    repo: "https://github.com/microsoft/What-I-Did-Copilot" },
  // ---- browser web apps : run entirely client-side on CSV exports ----
  { id: "cowork-chargeback",  kind: "app", label: "Cowork Chargeback",        sub: "Who owes what, in dollars",       icon: "🧾", color: "#00B294", col: 3, isNew: true,
    topics: ["billing","cost"],
    detail: "Browser app. Feed it your Copilot credit export plus an Entra user export and get a finance-ready, invoice-reconciled bill per cost centre and per person. Full-consumption or overage basis, dynamic cut-by, CSV export. Nothing is uploaded — it all parses locally.",
    app: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-chargeback/app/" },
  { id: "multi-budget",       kind: "app", label: "Multi-Budget Chargeback",  sub: "Shared tenant, separate budgets", icon: "🏦", color: "#00B294", col: 3, isNew: true,
    topics: ["billing","cost"],
    detail: "For divisions, subsidiaries, agencies or districts that share one tenant but hold separate budgets. Set each entity's entitlement — its share of the prepaid pool — and every bill is rebuilt against it, so whoever consumed earliest doesn't keep the discount.",
    app: "https://microsoft.github.io/Analytics-Hub/cowork-billing/multi-budget-chargeback/app/" },
  { id: "finops-cowork",      kind: "app", label: "FinOps & FOCUS Cost Report", sub: "Same numbers, FinOps language", icon: "📉", color: "#00B294", col: 3, isNew: true,
    topics: ["billing","cost"],
    detail: "Recasts the same Cowork credit consumption into a FinOps Framework and FOCUS-aligned cost view — List / Contracted / Effective / Billed cost, showback and chargeback allocation, and rate optimisation.",
    app: "https://microsoft.github.io/Analytics-Hub/FinOps-Cowork/app/finops.html" },
  { id: "policy-helper",      kind: "app", label: "Cowork Policy Helper",      sub: "Set limits before the bill",     icon: "🎛", color: "#00B294", col: 3, isNew: true,
    topics: ["billing","cost","license"],
    detail: "Assign users to spend-tier billing policies by attribute, review the exception queue, and export a point-in-time record of who is on which policy. Chargeback tells you what already happened; Policy Helper stops it happening again.",
    app: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-policy-helper/app/" },
  { id: "cowork-roi-model",   kind: "app", label: "Cowork ROI Model",          sub: "No tenant data — assumptions only", icon: "📐", color: "#00B294", col: 3, isNew: true,
    topics: ["roi","impact"],
    detail: "Interactive value model with no tenant payload at all. You enter your own task counts and assumptions; only research-based minutes-per-task defaults come preloaded by category. Nothing to export, nothing to upload.",
    app: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-roi-model/app/" },  { id: "what-cowork",      kind: "addon",  label: "What Cowork Did For Me",   sub: "Personal Cowork impact report",   icon: "🪄", color: "#e3008c", col: 3, isNew: true,
    topics: ["productivity","impact","roi"],
    detail: "A Cowork skill you attach to a session. It reads your own Cowork history from OneDrive and renders an HTML report — research-anchored time saved, professional-services-equivalent value, and a 'did this really need Cowork?' fit grade per project.",
    repo: "https://github.com/microsoft/What-I-did-with-Cowork" },
];

// from → to. style: 'solid' (default) or 'dashed' (optional path)
const EDGES = [
  // Purview → both extractors
  { from: "purview", to: "scripts" },
  { from: "purview", to: "pax" },
  // Entra also feeds PAX directly (Entra-only mode is supported)
  { from: "entra",   to: "pax" },
  // Fabric is the scale path fed by the credit/transcript sources
  { from: "dataverse",        to: "fabric", style: "dashed" },
  { from: "ppac",             to: "fabric", style: "dashed" },
  { from: "viva-consumption", to: "fabric", style: "dashed" },
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

  // ---- ValueLens : Purview audit + licensed users, Entra for org context ----
  { from: "purview",   to: "valuelens" },
  { from: "m365admin", to: "valuelens" },
  { from: "entra",     to: "valuelens", style: "dashed" },
  { from: "pax",       to: "valuelens", style: "dashed" },

  // ---- Consumption Central : Cowork credits + Studio credits + GitHub ----
  { from: "viva-consumption", to: "consumption-central" },
  { from: "ppac",             to: "consumption-central" },
  { from: "github",           to: "consumption-central" },
  { from: "entra",            to: "consumption-central", style: "dashed" },
  { from: "fabric",           to: "consumption-central", style: "dashed" },

  // ---- Agent Evaluator : Dataverse transcripts, optional Studio credits ----
  { from: "dataverse", to: "agent-evaluator" },
  { from: "ppac",      to: "agent-evaluator", style: "dashed" },
  { from: "entra",     to: "agent-evaluator", style: "dashed" },
  { from: "fabric",    to: "agent-evaluator", style: "dashed" },

  // ---- Credit Usage & Chargeback : M365 credit export + Entra org data ----
  { from: "m365admin", to: "credit-usage" },
  { from: "entra",     to: "credit-usage" },

  // ---- AI Solutions Intelligence : Defender hunting + Graph + Copilot audit ----
  { from: "defender", to: "ai-solutions" },
  { from: "entra",    to: "ai-solutions" },
  { from: "purview",  to: "ai-solutions", style: "dashed" },
  { from: "pax",      to: "ai-solutions", style: "dashed" },

  // PAX can land straight into Fabric as well as feeding reports directly
  { from: "pax", to: "fabric" },

  // Browser apps run on the same two CSV exports: M365 credit export + Entra
  { from: "m365admin", to: "cowork-chargeback" },
  { from: "entra",     to: "cowork-chargeback" },
  { from: "m365admin", to: "multi-budget" },
  { from: "entra",     to: "multi-budget" },
  { from: "m365admin", to: "finops-cowork" },
  { from: "entra",     to: "finops-cowork" },
  { from: "entra",     to: "policy-helper" },
  { from: "m365admin", to: "policy-helper", style: "dashed" },
  // Add-ons spawn off reports
  { from: "super-usage",   to: "roi-calc" },
  { from: "super-usage",   to: "customize" },
  { from: "super-impact",  to: "customize" },
  // Personal/local tools — not from any tenant report
  { from: "local-vscode",    to: "what-i-did" },
  { from: "onedrive-cowork", to: "what-cowork" },
];

// Lane headers — one per column, rendered into grid row 1
const LANES = [
  { col: 0, title: "Data sources",  desc: "Where it comes from" },
  { col: 1, title: "Extractors",    desc: "How it gets pulled" },
  { col: 2, title: "Reports",       desc: "What you deploy" },
  { col: 3, title: "Add-ons & apps", desc: "Bolt-ons and browser tools" },
];

// =====================================================================
// Render
// =====================================================================

// Tracks which node (if any) has been click-locked. Hovering temporarily
// overrides the lock for preview, but mouseleave snaps back to the lock.
let lockedId = null;

function setLocked(id) {
  lockedId = id;
  highlight(id);
  document.querySelectorAll(".ds-node").forEach(n => {
    n.classList.toggle("is-locked", n.getAttribute("data-id") === id);
  });
}

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

  const lanes = LANES.map(l => NODES.filter(n => n.col === l.col));
  const rows  = Math.max(...lanes.map(l => l.length));
  host.style.setProperty("--ds-cols", LANES.length);
  host.style.setProperty("--ds-rows", rows + 1);

  for (const l of LANES) {
    host.append(el("div", { class: "ds-lane-head", style: `grid-column:${l.col + 1}; grid-row:1;` },
      el("span", { class: "ds-lane-title" }, l.title),
      el("span", { class: "ds-lane-desc" }, l.desc)
    ));
  }

  lanes.forEach((laneNodes, li) => {
    const k = laneNodes.length;
    laneNodes.forEach((n, i) => {
      // Distribute each lane evenly down the canvas so short lanes (pipes,
      // add-ons) sit centred against long ones instead of bunching at the top.
      const row = Math.round(((i + 0.5) * rows) / k) + 1;
      const node = el("button", {
        class: `ds-node ds-${n.kind}${n.isNew ? " is-new" : ""}`,
        "data-id": n.id,
        "data-kind": n.kind,
        style: `--c:${n.color}; grid-column:${LANES[li].col + 1}; grid-row:${row};`,
        onclick: (ev) => {
          ev.stopPropagation();
          // Toggle: clicking the locked node again unlocks; otherwise lock to this node.
          if (lockedId === n.id) {
            setLocked(null);
            closeDrawer();
          } else {
            setLocked(n.id);
            openDrawer(n.id);
          }
        },
        onmouseenter: () => { if (!lockedId) highlight(n.id); },
        onmouseleave: () => { if (!lockedId) highlight(null); },
      });
      const parts = [
        el("span", { class: "ds-node-icon", "aria-hidden": "true" }, n.icon),
        el("span", { class: "ds-node-body" },
          el("span", { class: "ds-node-label" }, n.label),
          n.sub ? el("span", { class: "ds-node-sub" }, n.sub) : null
        ),
      ];
      if (n.isNew) parts.push(el("span", { class: "ds-new-badge", "aria-label": "New" }, "NEW"));
      node.append(...parts);
      host.append(node);
    });
  });
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
  // When a category filter is active, hover effects are suppressed
  if (typeof activeTopic !== "undefined" && activeTopic) return;
  if (typeof activeRole !== "undefined" && activeRole) return;
  const svg = document.getElementById("dsLines");
  document.querySelectorAll(".ds-node").forEach(n => n.classList.remove("is-related", "is-faded"));
  svg.querySelectorAll(".ds-edge").forEach(p => p.classList.remove("is-active", "is-faded"));
  if (!id) return;
  // Transitive trace: walk all upstream feeders and all downstream consumers
  // so hovering a report lights up the full source chain (e.g. AI-in-One →
  // Per-Report Scripts / PAX → Purview / Entra), not just direct neighbours.
  const related = new Set([id]);
  const activeEdges = new Set();
  const key = (f, t) => `${f}|${t}`;
  const walkUp = (cur) => {
    EDGES.forEach((e) => {
      if (e.to === cur && !activeEdges.has(key(e.from, e.to))) {
        activeEdges.add(key(e.from, e.to));
        if (!related.has(e.from)) { related.add(e.from); walkUp(e.from); }
      }
    });
  };
  const walkDown = (cur) => {
    EDGES.forEach((e) => {
      if (e.from === cur && !activeEdges.has(key(e.from, e.to))) {
        activeEdges.add(key(e.from, e.to));
        if (!related.has(e.to)) { related.add(e.to); walkDown(e.to); }
      }
    });
  };
  walkUp(id);
  walkDown(id);
  document.querySelectorAll(".ds-node").forEach(n => {
    const nid = n.getAttribute("data-id");
    if (related.has(nid)) n.classList.add("is-related"); else n.classList.add("is-faded");
  });
  svg.querySelectorAll(".ds-edge").forEach(p => {
    const f = p.getAttribute("data-from"), t = p.getAttribute("data-to");
    if (activeEdges.has(key(f, t))) p.classList.add("is-active"); else p.classList.add("is-faded");
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
        <div class="ds-drawer-kind">${n.kind}${n.isNew ? ' · <span class="ds-drawer-new">NEW</span>' : ""}</div>
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

    ${n.app ? `
      <div class="ds-drawer-actions">
        <a class="btn btn-primary ds-drawer-cta" href="${n.app}" target="_blank" rel="noopener">Open the app &#8599;</a>
        <a class="btn btn-ghost ds-drawer-home" href="../">&#8592; Home</a>
      </div>
    ` : n.repo ? `
      <div class="ds-drawer-actions">
        <a class="btn btn-primary ds-drawer-cta" href="${n.repo}" target="_blank" rel="noopener">Open repository ↗</a>
        <a class="btn btn-secondary ds-drawer-star" href="${n.repo}" target="_blank" rel="noopener" aria-label="Star ${n.label} on GitHub to follow updates">⭐ Star repo to follow for updates</a>
        <a class="btn btn-ghost ds-drawer-home" href="../">← Home</a>
      </div>
    ` : `
      <div class="ds-drawer-actions">
        <a class="btn btn-ghost ds-drawer-home" href="../">← Home</a>
      </div>
    `}
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
  setLocked(null);
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
        <h3>${n.label}${n.isNew ? ' <span class="ds-new-badge">NEW</span>' : ""}</h3>
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
// Category filter — chip row above the canvas highlights matching nodes
// =====================================================================
const TOPICS = [
  { id: "adoption",       label: "Adoption",          icon: "📈", color: "#0078d4" },
  { id: "engagement",     label: "Engagement",        icon: "⚡", color: "#e3008c" },
  { id: "agents",         label: "Agents",            icon: "🤖", color: "#e3008c" },
  { id: "chat",           label: "Chat",              icon: "💬", color: "#00B294" },
  { id: "cost",           label: "Cost & credits",    icon: "💳", color: "#8661c5" },
  { id: "billing",        label: "Chargeback",        icon: "🧾", color: "#00B294" },
  { id: "quality",        label: "Agent quality",     icon: "🎯", color: "#FFB900" },
  { id: "risk",           label: "Shadow AI & risk",  icon: "🛰️", color: "#e3008c" },
  { id: "license",        label: "Licensed users",    icon: "🎫", color: "#0078d4" },
  { id: "unlicensed",     label: "Unlicensed users",  icon: "👥", color: "#8661c5" },
  { id: "impact",         label: "Impact",            icon: "💰", color: "#8661c5" },
  { id: "roi",            label: "ROI",               icon: "🧮", color: "#00B294" },
  { id: "productivity",   label: "Productivity",      icon: "⚡", color: "#FFB900" },
  { id: "developer",      label: "Developer",         icon: "💻", color: "#24292f" },
  { id: "sentiment",      label: "Sentiment",         icon: "❤️", color: "#ffaa44" },
  { id: "customization",  label: "Customization",     icon: "🎨", color: "#0078d4" },
];

let activeTopic = null;

function renderFilterChips() {
  const host = document.getElementById("dsFilterChips");
  if (!host) return;
  host.innerHTML = TOPICS.map(t => {
    const count = NODES.filter(n => (n.topics || []).includes(t.id)).length;
    if (count === 0) return "";
    return `<button class="ds-filter-chip" data-topic="${t.id}" style="--c:${t.color}" type="button">
      <span class="ds-filter-icon" aria-hidden="true">${t.icon}</span>
      <span class="ds-filter-text">${t.label}</span>
      <span class="ds-filter-count">${count}</span>
    </button>`;
  }).join("") + `<button class="ds-filter-chip ds-filter-clear" data-topic="" type="button" hidden>
      <span class="ds-filter-text">✕ Clear filter</span>
    </button>`;
  host.querySelectorAll(".ds-filter-chip").forEach(b => {
    b.addEventListener("click", () => setTopic(b.getAttribute("data-topic") || null));
  });
}

function setTopic(topic) {
  if (activeRole) clearRole();
  activeTopic = (activeTopic === topic) ? null : topic;
  const chips = document.querySelectorAll(".ds-filter-chip");
  chips.forEach(c => {
    const t = c.getAttribute("data-topic");
    c.classList.toggle("is-active", t === activeTopic);
  });
  const clearBtn = document.querySelector(".ds-filter-clear");
  if (clearBtn) clearBtn.hidden = !activeTopic;
  applyTopicHighlight();
}

function applyTopicHighlight() {
  const svg = document.getElementById("dsLines");
  document.querySelectorAll(".ds-node").forEach(n => n.classList.remove("is-related", "is-faded", "is-match"));
  svg.querySelectorAll(".ds-edge").forEach(p => p.classList.remove("is-active", "is-faded"));
  if (!activeTopic) return;
  // matched reports/addons
  const matched = new Set(NODES.filter(n => (n.topics || []).includes(activeTopic)).map(n => n.id));
  if (matched.size === 0) return;
  // also include their upstream feeders (sources + pipes) so the path is visible
  const related = new Set(matched);
  let frontier = [...matched];
  for (let hop = 0; hop < 3; hop++) {
    const next = [];
    for (const id of frontier) {
      EDGES.filter(e => e.to === id).forEach(e => { if (!related.has(e.from)) { related.add(e.from); next.push(e.from); } });
    }
    frontier = next;
  }
  document.querySelectorAll(".ds-node").forEach(n => {
    const nid = n.getAttribute("data-id");
    if (related.has(nid)) {
      n.classList.add("is-related");
      if (matched.has(nid)) n.classList.add("is-match");
    } else {
      n.classList.add("is-faded");
    }
  });
  svg.querySelectorAll(".ds-edge").forEach(p => {
    const f = p.getAttribute("data-from"), t = p.getAttribute("data-to");
    if (related.has(f) && related.has(t)) p.classList.add("is-active");
    else p.classList.add("is-faded");
  });
}

// =====================================================================
// Search — the estate is too big to scan by eye, so let people jump
// =====================================================================
function renderSearch() {
  const band = document.querySelector(".ds-filter-band .wrap");
  if (!band) return;

  const wrap    = el("div", { class: "ds-search" });
  const input   = el("input", {
    type: "search",
    id: "dsSearch",
    class: "ds-search-input",
    autocomplete: "off",
    placeholder: `Search ${NODES.length} nodes — try “agent”, “credits”, “Purview”…`,
    "aria-label": "Search the report ecosystem",
  });
  const results = el("div", { class: "ds-search-results", id: "dsSearchResults", role: "listbox", hidden: "hidden" });
  wrap.append(input, results);
  band.prepend(wrap);

  const close = () => { results.hidden = true; results.innerHTML = ""; };

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) return close();
    const hits = NODES.filter(n =>
      n.label.toLowerCase().includes(q) ||
      (n.sub || "").toLowerCase().includes(q) ||
      (n.detail || "").toLowerCase().includes(q) ||
      (n.topics || []).some(t => t.includes(q))
    ).slice(0, 8);
    if (!hits.length) {
      results.innerHTML = `<p class="ds-search-empty">No match for “${input.value.trim()}”</p>`;
      results.hidden = false;
      return;
    }
    results.innerHTML = hits.map(n => `
      <button class="ds-search-hit" data-jump="${n.id}" style="--c:${n.color}" role="option">
        <span class="ds-search-hit-icon" aria-hidden="true">${n.icon}</span>
        <span class="ds-search-hit-body">
          <span class="ds-search-hit-label">${n.label}</span>
          <span class="ds-search-hit-kind">${n.kind}${n.sub ? " · " + n.sub : ""}</span>
        </span>
      </button>`).join("");
    results.hidden = false;
    results.querySelectorAll(".ds-search-hit").forEach(b => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-jump");
        close();
        input.value = "";
        document.getElementById("dsCanvas").scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => { setLocked(id); openDrawer(id); }, 300);
      });
    });
  });

  input.addEventListener("keydown", e => { if (e.key === "Escape") { input.value = ""; close(); } });
  document.addEventListener("click", e => { if (!wrap.contains(e.target)) close(); });
}

// =====================================================================
// =====================================================================
// Role filter — "what can I actually build with the access I have?"
// A report lights up only when every REQUIRED (solid) upstream source is
// reachable from the selected role. Dashed edges are optional enrichment
// and never gate a report.
// =====================================================================
const ROLES = [
  { id: "audit-reader",    label: "Audit Reader",            icon: "🛡", color: "#8661c5", sources: ["purview"],
    note: "Read the Purview unified audit log — Copilot interactions, file and Teams activity, agent invocations." },
  { id: "insights-analyst", label: "Insights Analyst",       icon: "📊",  color: "#00B294", sources: ["viva", "viva-consumption"],
    note: "Viva Insights analyst — person query behavioural data plus the Consumption Dashboard (Cowork and Work IQ credits)." },
  { id: "tenant-admin",    label: "M365 Tenant Admin",       icon: "📥",  color: "#FFB900", sources: ["m365admin"],
    note: "M365 admin center — usage exports, licensed-user lists and the Copilot Cost Management credit export." },
  { id: "user-admin",      label: "User Admin / Global Reader", icon: "👤", color: "#0078d4", sources: ["entra"],
    note: "Microsoft Entra ID — users, groups, licences and the org attributes every report uses for department slicing." },
  { id: "ppac-admin",      label: "Power Platform Admin",    icon: "🔷", color: "#8661c5", sources: ["ppac", "dataverse"],
    note: "Copilot Studio message-credit reports plus the Dataverse conversation transcripts behind agent analytics." },
  { id: "security-reader", label: "Security Reader",         icon: "🔎",    color: "#e3008c", sources: ["defender"],
    note: "Defender Advanced Hunting and Cloud Apps — shadow-AI discovery, OAuth consent risk and behavioural anomalies." },
  { id: "github-admin",    label: "GitHub Enterprise Admin", icon: "⚡",   color: "#24292f", sources: ["github"],
    note: "GitHub Copilot usage across the enterprise — chat vs agent, language, model and acceptance rates." },
  { id: "global-admin",    label: "Global Administrator",    icon: "👑",  color: "#0078d4",
    sources: ["purview", "viva", "viva-consumption", "entra", "m365admin", "ppac", "dataverse", "defender"],
    note: "Full tenant reach. Everything except the personal, machine-local tools — nobody can see those but their owner." },
  { id: "no-admin",        label: "No admin rights",         icon: "🙋",   color: "#e3008c", sources: ["onedrive-cowork", "local-vscode"],
    note: "You still get the personal tools. They read only your own session history and never touch tenant data." },
];

let activeRole = null;

// Walk to a fixed point: something is buildable once all of its required
// upstream feeders are themselves reachable.
function buildableFrom(sourceIds) {
  const ok = new Set(sourceIds);
  const candidates = NODES.filter(n => n.kind !== "source");
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of candidates) {
      if (ok.has(n.id)) continue;
      const required = EDGES.filter(e => e.to === n.id && e.style !== "dashed");
      if (required.length === 0 || required.every(e => ok.has(e.from))) {
        ok.add(n.id);
        changed = true;
      }
    }
  }
  return ok;
}

function renderRoleChips() {
  const band = document.querySelector(".ds-filter-band .wrap");
  if (!band) return;

  const wrap = el("div", { class: "ds-role-band" });
  wrap.append(el("p", { class: "ds-filter-label" },
    el("span", { "aria-hidden": "true" }, "\u{1F511}"),
    " What can I build with my access?"));

  const row = el("div", { class: "ds-role-chips", role: "toolbar", "aria-label": "Filter by role" });
  ROLES.forEach(r => {
    const b = el("button", {
      class: "ds-role-chip",
      type: "button",
      "data-role": r.id,
      style: `--c:${r.color}`,
      onclick: () => setRole(r.id),
    },
      el("span", { class: "ds-role-icon", "aria-hidden": "true" }, r.icon),
      el("span", { class: "ds-role-text" }, r.label)
    );
    row.append(b);
  });
  wrap.append(row);
  wrap.append(el("div", { class: "ds-role-result", id: "dsRoleResult", hidden: "hidden" }));
  band.append(wrap);
}

function clearRole() {
  activeRole = null;
  document.querySelectorAll(".ds-role-chip").forEach(c => c.classList.remove("is-active"));
  const res = document.getElementById("dsRoleResult");
  if (res) { res.hidden = true; res.innerHTML = ""; }
}

function setRole(id) {
  if (activeTopic) setTopic(null);
  if (activeRole === id) {
    clearRole();
    applyRoleHighlight();
    return;
  }
  activeRole = id;
  document.querySelectorAll(".ds-role-chip").forEach(c =>
    c.classList.toggle("is-active", c.getAttribute("data-role") === id));
  applyRoleHighlight();
}

function applyRoleHighlight() {
  const svg = document.getElementById("dsLines");
  document.querySelectorAll(".ds-node").forEach(n => n.classList.remove("is-related", "is-faded", "is-match"));
  svg.querySelectorAll(".ds-edge").forEach(p => p.classList.remove("is-active", "is-faded"));

  const res = document.getElementById("dsRoleResult");
  if (!activeRole) { if (res) { res.hidden = true; res.innerHTML = ""; } return; }

  const role = ROLES.find(r => r.id === activeRole);
  if (!role) return;

  const reach = buildableFrom(role.sources);
  const owned = new Set(role.sources);

  document.querySelectorAll(".ds-node").forEach(n => {
    const id = n.getAttribute("data-id");
    if (owned.has(id)) n.classList.add("is-related", "is-match");
    else if (reach.has(id)) n.classList.add("is-related");
    else n.classList.add("is-faded");
  });
  svg.querySelectorAll(".ds-edge").forEach(p => {
    const f = p.getAttribute("data-from"), t = p.getAttribute("data-to");
    if (reach.has(f) && reach.has(t)) p.classList.add("is-active"); else p.classList.add("is-faded");
  });

  const unlocked = NODES.filter(n => n.kind !== "source" && n.kind !== "pipe" && reach.has(n.id));
  const blocked  = NODES.filter(n => n.kind !== "source" && n.kind !== "pipe" && !reach.has(n.id));
  const total = unlocked.length + blocked.length;

  if (res) {
    res.hidden = false;
    res.innerHTML = `
      <p class="ds-role-note">${role.note}</p>
      <p class="ds-role-score">
        <strong>${unlocked.length} of ${total}</strong> reports, apps and add-ons are available with
        <strong>${role.label}</strong> access alone.
      </p>
      <div class="ds-chips ds-role-unlocked">
        ${unlocked.map(n => `<button class="ds-chip" data-jump="${n.id}" style="--c:${n.color}">${n.icon} ${n.label}</button>`).join("")}
      </div>
      ${blocked.length ? `<details class="ds-role-blocked">
        <summary>${blocked.length} still out of reach &mdash; and what you'd need</summary>
        <ul>
          ${blocked.map(n => {
            const missing = EDGES.filter(e => e.to === n.id && e.style !== "dashed" && !reach.has(e.from))
              .map(e => NODES.find(x => x.id === e.from))
              .filter(Boolean)
              .map(x => x.label);
            return `<li><strong>${n.label}</strong> &mdash; needs ${missing.length ? missing.join(" + ") : "an upstream feed"}</li>`;
          }).join("")}
        </ul>
      </details>` : ""}`;
    res.querySelectorAll(".ds-chip[data-jump]").forEach(b => {
      b.addEventListener("click", () => openDrawer(b.getAttribute("data-jump")));
    });
  }
}
// The site header is sticky and paints above the drawer, so publish its real
// height as a CSS var and start the drawer below it.
function syncDrawerOffset() {
  const header = document.querySelector(".site-header");
  const h = header ? Math.round(header.getBoundingClientRect().height) : 64;
  document.documentElement.style.setProperty("--ah-header-h", h + "px");
}

function init() {
  syncDrawerOffset();
  renderNodes();
  renderGrid();
  renderFilterChips();
  renderRoleChips();
  renderSearch();
  // wait one frame so layout settles before measuring
  requestAnimationFrame(drawLines);
  window.addEventListener("resize", () => { syncDrawerOffset(); requestAnimationFrame(drawLines); });
  document.getElementById("dsDrawerClose").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { setLocked(null); closeDrawer(); } });
  // Clicking anywhere on the canvas background (not on a node) clears the lock
  const canvas = document.getElementById("dsCanvas");
  if (canvas) {
    canvas.addEventListener("click", (ev) => {
      if (!ev.target.closest(".ds-node")) {
        setLocked(null);
      }
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
