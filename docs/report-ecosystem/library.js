// Analytics Hub · Report Ecosystem — Report Library
// =====================================================================
// The "everything in one place" onboarding surface. Reads NODES/EDGES
// from graph.js (same global lexical scope, loaded first) so the data
// connections and tags never drift from the diagram.
//
// To add resources for a node: add an entry to RESOURCES keyed by node id.
//   kind: doc | download | video | app | email | demo
// =====================================================================

const RESOURCE_ICON = {
  doc: "📄", download: "⬇️", video: "🎬", app: "🖥️", email: "✉️", demo: "▶️",
};

// Every link here was harvested from docs/demos/embeds.json or verified
// directly in the cloned repo — none are constructed speculatively.
const RESOURCES = {
  valuelens: [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot#readme" },
    { kind: "video",    label: "Watch the 2-minute demo", url: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot/raw/main/media/ValueLens-Demo.mp4" },
    { kind: "download", label: "Sample data — run it with no tenant setup", url: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot/tree/main/sample-data" },
    { kind: "download", label: "Download the templates (.zip)", url: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot/archive/refs/heads/main.zip" },
  ],
  "consumption-central": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot#readme" },
    { kind: "video",    label: "Watch the 2-minute demo", url: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot/raw/main/media/ConsumptionCentral-Demo.mp4" },
    { kind: "doc",      label: "Where each export comes from (DATA-SOURCES)", url: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot/blob/main/docs/DATA-SOURCES.md" },
    { kind: "doc",      label: "Measure reference", url: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot/blob/main/docs/MEASURES.md" },
    { kind: "download", label: "Sample data — run it with no tenant setup", url: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot/tree/main/1.%20Local%20CSV/sample-data" },
    { kind: "download", label: "Download the templates (.zip)", url: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot/archive/refs/heads/main.zip" },
  ],
  "agent-evaluator": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio#readme" },
    { kind: "doc",      label: "Setup path — Dataverse direct", url: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio/blob/main/docs/dataverse.md" },
    { kind: "doc",      label: "Setup path — Fabric notebooks", url: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio/blob/main/docs/fabric.md" },
    { kind: "doc",      label: "Setup path — Local CSV demo (no tenant)", url: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio/blob/main/docs/local-csv.md" },
    { kind: "doc",      label: "Credit-consumption pages", url: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio/blob/main/docs/credit-consumption.md" },
    { kind: "download", label: "Download .pbit template", url: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio/raw/main/Agent%20Evaluator.pbit" },
  ],
  "credit-usage": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/CreditUsage#readme" },
    { kind: "app",      label: "Live web app (client-side)", url: "https://microsoft.github.io/CreditUsage/CoworkBilling/" },
    { kind: "doc",      label: "Methodology deck + customer guide", url: "https://microsoft.github.io/Analytics-Hub/cowork-billing/" },
    { kind: "download", label: "Download .pbit template", url: "https://github.com/microsoft/CreditUsage/raw/main/Cowork%20Chargeback.pbit" },
    { kind: "download", label: "Interpretation Guide (.pptx)", url: "https://github.com/microsoft/CreditUsage/raw/main/Chargebacks%20Interpretation%20Guide.pptx" },
  ],
  "ai-solutions": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/AI-Solutions-Intelligence-Dashboard#readme" },
    { kind: "doc",      label: "Data setup — start here", url: "https://github.com/microsoft/AI-Solutions-Intelligence-Dashboard/blob/main/DATA_SETUP_START_HERE.md" },
    { kind: "doc",      label: "Full instructions (v26)", url: "https://github.com/microsoft/AI-Solutions-Intelligence-Dashboard/blob/main/INSTRUCTIONS_v26.md" },
    { kind: "doc",      label: "PAX exporter scripts", url: "https://github.com/microsoft/AI-Solutions-Intelligence-Dashboard/tree/main/PAX_Exporter" },
    { kind: "download", label: "Download the repo (.zip)", url: "https://github.com/microsoft/AI-Solutions-Intelligence-Dashboard/archive/refs/heads/main.zip" },
  ],
  "ai-in-one": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/AI-in-One-Dashboard#readme" },
    { kind: "download", label: "Interpretation Guide (PDF)", url: "https://github.com/microsoft/AI-in-One-Dashboard/raw/main/AI-in-One%20-%20Interpretation%20Guide.pdf" },
    { kind: "download", label: "Storyboard (.pptx)", url: "https://github.com/microsoft/AI-in-One-Dashboard/raw/main/AIinOne_Storyboard_2601.pptx" },
    { kind: "download", label: "Download .pbit (SharePoint refresh)", url: "https://github.com/microsoft/AI-in-One-Dashboard/raw/main/AI-in-One%20Dashboard%20-%2028%2004%20-%20Sharepoint%20Refresh.pbit" },
    { kind: "download", label: "Download .pbit (CSV only)", url: "https://github.com/microsoft/AI-in-One-Dashboard/raw/main/AI-in-One%20Dashboard%20-%2027%2004%20-%20csv%20only.pbit" },
    { kind: "email",    label: "Admin email template", url: "https://github.com/microsoft/Analytics-Hub/blob/main/Email%20Templates/01_AI_in_One_Dashboard_Admin_Email.md" },
  ],
  "chat-agent": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/CopilotChatAnalytics#readme" },
    { kind: "download", label: "Download .pbit — Chat Intelligence", url: "https://github.com/microsoft/CopilotChatAnalytics/raw/main/Template%20-%20Chat%20Intelligence%20Report.pbit" },
    { kind: "download", label: "Download .pbit — Agent Intelligence", url: "https://github.com/microsoft/CopilotChatAnalytics/raw/main/Template%20Agent%20Intelligence%20v4.pbit" },
    { kind: "email",    label: "Admin email template — Chat", url: "https://github.com/microsoft/Analytics-Hub/blob/main/Email%20Templates/02_Chat_Intelligence_Admin_Email.md" },
    { kind: "email",    label: "Admin email template — Agent", url: "https://github.com/microsoft/Analytics-Hub/blob/main/Email%20Templates/03_Agent_Intelligence_Admin_Email.md" },
    { kind: "doc",      label: "Compare: Chat vs Agent Intelligence", url: "https://microsoft.github.io/Analytics-Hub/compare/chat-intelligence-vs-agent-intelligence/" },
  ],
  "m365-readiness": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/M365UsageAnalytics#readme" },
    { kind: "download", label: "Interpretation Guide (PDF)", url: "https://github.com/microsoft/M365UsageAnalytics/raw/main/M365%20Usage%20Dashboard%20-%20Interpretation%20Guide.pdf" },
    { kind: "email",    label: "Admin email template", url: "https://github.com/microsoft/Analytics-Hub/blob/main/Email%20Templates/07_M365_Copilot_Readiness_Admin_Email.md" },
  ],
  "super-usage": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/DecodingSuperUsage#readme" },
    { kind: "download", label: "Interpretation Guide (PDF)", url: "https://github.com/microsoft/DecodingSuperUsage/raw/DecodingSuperUsage/Interpretation%20Guide%20Super%20Usage%20Adoption.pdf" },
    { kind: "download", label: "Storyboard (.pptx)", url: "https://github.com/microsoft/DecodingSuperUsage/raw/DecodingSuperUsage/Storyboard%20PPTX%20-%20Super%20User%20Adoption.pptx" },
    { kind: "doc",      label: "DirectQuery troubleshooting", url: "https://github.com/microsoft/DecodingSuperUsage/blob/main/TROUBLESHOOTING_DIRECTQUERY_AUTH.md" },
    { kind: "download", label: "Download the repo (.zip)", url: "https://github.com/microsoft/DecodingSuperUsage/archive/refs/heads/main.zip" },
  ],
  "super-impact": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/superuserimpact#readme" },
    { kind: "download", label: "Interpretation Guide — Copilot Assisted Hours formulas (PDF)", url: "https://github.com/microsoft/superuserimpact/raw/main/PDF%20Guides/Copilot%20Assisted%20Hours%20PBI%20Formulas.pdf" },
    { kind: "download", label: "Interpretation Guide — Copilot Studio agents (PDF)", url: "https://github.com/microsoft/superuserimpact/raw/main/PDF%20Guides/Copilot%20Studio%20agents%20report%20-%20Interpretation%20Guide.pdf" },
    { kind: "download", label: "Storyboard (.pptx)", url: "https://github.com/microsoft/superuserimpact/raw/main/Superuser%20Impact%20-%20Storyboard%20v4.pptx" },
    { kind: "download", label: "Download .pbit (CSV)", url: "https://github.com/microsoft/superuserimpact/raw/main/Template%20-%20Super%20User%20Impact%20CSV%20-v8.pbit" },
    { kind: "download", label: "Download .pbit (DirectQuery)", url: "https://github.com/microsoft/superuserimpact/raw/main/Template%20-%20Super%20User%20Impact%20Direct%20Query%20-v8.pbit" },
  ],
  "ghcp-impact": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/GitHubCopilotImpact#readme" },
    { kind: "download", label: "Download the repo (.zip)", url: "https://github.com/microsoft/GitHubCopilotImpact/archive/refs/heads/main.zip" },
  ],
  "adoption-sent": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/olivierpecheux/copilot-adoption-sentiment-report#readme" },
    { kind: "download", label: "Download .pbit template", url: "https://github.com/olivierpecheux/copilot-adoption-sentiment-report/raw/main/M365%20Copilot%20-%20Adoption%20%26%20Sentiment.pbit" },
    { kind: "doc",      label: "Recommended survey questions (12)", url: "https://github.com/olivierpecheux/copilot-adoption-sentiment-report#-recommended-survey-questions" },
    { kind: "email",    label: "Contact the author (opecheux@microsoft.com)", url: "mailto:opecheux@microsoft.com?subject=Copilot%20Adoption%20%26%20Sentiment%20Report" },
  ],
  "roi-calc": [
    { kind: "app",      label: "Open the ROI Calculator", url: "https://jordankingisalive.github.io/CopilotROICalculator/" },
    { kind: "doc",      label: "Pairs with: Decoding Super Usage", url: "https://github.com/microsoft/DecodingSuperUsage" },
  ],
  customize: [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/customizecopilot#readme" },
    { kind: "doc",      label: "Champion-ID source folder", url: "https://github.com/microsoft/customizecopilot/tree/main/Champion-ID" },
  ],
  "what-i-did": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/What-I-Did-Copilot#readme" },
    { kind: "download", label: "Download the repo (.zip)", url: "https://github.com/microsoft/What-I-Did-Copilot/archive/refs/heads/main.zip" },
  ],
  "what-cowork": [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/What-I-did-with-Cowork#readme" },
    { kind: "doc",      label: "Classification methodology", url: "https://github.com/microsoft/What-I-did-with-Cowork/blob/main/classification-methodology.md" },
  ],
  pax: [
    { kind: "doc",      label: "README & setup guide", url: "https://github.com/microsoft/pax#readme" },
  ],
  "cowork-chargeback": [
    { kind: "app",      label: "Open Cowork Chargeback", url: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-chargeback/app/" },
    { kind: "doc",      label: "Consumption & Cost page (methodology deck)", url: "https://microsoft.github.io/Analytics-Hub/cowork-billing/" },
  ],
  "multi-budget": [
    { kind: "app",      label: "Open Multi-Budget Chargeback", url: "https://microsoft.github.io/Analytics-Hub/cowork-billing/multi-budget-chargeback/app/" },
  ],
  "finops-cowork": [
    { kind: "app",      label: "Open FinOps & FOCUS cost report", url: "https://microsoft.github.io/Analytics-Hub/FinOps-Cowork/app/finops.html" },
  ],
  "policy-helper": [
    { kind: "app",      label: "Open Cowork Policy Helper", url: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-policy-helper/app/" },
  ],
  "cowork-roi-model": [
    { kind: "app",      label: "Open Cowork ROI Model", url: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-roi-model/app/" },
  ],
};

// Cross-cutting links that aren't tied to one report.
const HUB_LINKS = [
  { kind: "demo", label: "Internal Demos — live Power BI walkthroughs", url: "https://microsoft.github.io/Analytics-Hub/demos/" },
  { kind: "doc",  label: "Explore Reports — match a business question to a report", url: "https://microsoft.github.io/Analytics-Hub/explore-reports/" },
  { kind: "doc",  label: "Native Reports — what Microsoft already ships", url: "https://microsoft.github.io/Analytics-Hub/out-of-the-box/" },
  { kind: "doc",  label: "Glossary — Copilot reporting terms", url: "https://microsoft.github.io/Analytics-Hub/glossary/" },
  { kind: "doc",  label: "FAQ", url: "https://microsoft.github.io/Analytics-Hub/faq/" },
  { kind: "doc",  label: "Compare reports side by side", url: "https://microsoft.github.io/Analytics-Hub/compare/" },
  { kind: "doc",  label: "Case studies", url: "https://microsoft.github.io/Analytics-Hub/case-studies/" },
  { kind: "doc",  label: "Consumption & Cost (Cowork billing)", url: "https://microsoft.github.io/Analytics-Hub/cowork-billing/" },
];

const KIND_LABEL = { report: "Report", addon: "Add-on", app: "Browser app", pipe: "Extractor", source: "Data source" };
const GROUPS = [
  { kind: "report", title: "Power BI reports & templates" },
  { kind: "app",    title: "Browser apps — no install, run on your own exports" },
  { kind: "addon",  title: "Add-ons & personal tools" },
  { kind: "pipe",   title: "Extractors & pipelines" },
];

let rlQuery = "";
let rlTag = null;

function rlUpstream(id) {
  return EDGES.filter(e => e.to === id)
    .map(e => NODES.find(n => n.id === e.from))
    .filter(Boolean);
}

function rlMatches(n) {
  if (rlTag && !(n.topics || []).includes(rlTag)) return false;
  if (!rlQuery) return true;
  const q = rlQuery;
  const hay = [
    n.label, n.sub, n.detail,
    ...(n.topics || []),
    ...rlUpstream(n.id).map(u => u.label),
    ...(RESOURCES[n.id] || []).map(r => r.label),
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function rlCardHTML(n) {
  const ups = rlUpstream(n.id);
  const res = RESOURCES[n.id] || [];
  const tags = (n.topics || [])
    .map(t => TOPICS.find(x => x.id === t))
    .filter(Boolean);

  return `
  <article class="rl-card" data-id="${n.id}" style="--c:${n.color}">
    <button class="rl-card-head" type="button" aria-expanded="false">
      <span class="rl-card-icon" aria-hidden="true">${n.icon}</span>
      <span class="rl-card-main">
        <span class="rl-card-title">
          ${n.label}
          <span class="rl-kind-pill">${KIND_LABEL[n.kind] || n.kind}</span>
          ${n.isNew ? '<span class="ds-new-badge" style="position:static">NEW</span>' : ""}
        </span>
        ${n.sub ? `<span class="rl-card-sub">${n.sub}</span>` : ""}
      </span>
      <span class="rl-caret" aria-hidden="true">▾</span>
    </button>
    <div class="rl-card-body">
      ${n.detail ? `<p class="rl-detail">${n.detail}</p>` : ""}

      ${ups.length ? `
      <div class="rl-block">
        <p class="rl-block-label">Reads from — click to trace on the diagram</p>
        <div class="rl-chips">
          ${ups.map(u => `<button class="rl-chip" data-jump="${u.id}" style="--cc:${u.color}" type="button">${u.icon} ${u.label}</button>`).join("")}
        </div>
      </div>` : ""}

      ${tags.length ? `
      <div class="rl-block">
        <p class="rl-block-label">Tags</p>
        <div class="rl-chips">
          ${tags.map(t => `<span class="rl-chip rl-chip-static" style="--cc:${t.color}">${t.icon} ${t.label}</span>`).join("")}
        </div>
      </div>` : ""}

      <div class="rl-block">
        <p class="rl-block-label">Resources</p>
        ${res.length ? `<div class="rl-links">
          ${res.map(r => `<a class="rl-link" href="${r.url}" target="_blank" rel="noopener">
            <span class="rl-link-kind" aria-hidden="true">${RESOURCE_ICON[r.kind] || "🔗"}</span>
            <span class="rl-link-label">${r.label}</span>
            <span class="rl-link-ext" aria-hidden="true">↗</span>
          </a>`).join("")}
        </div>` : `<p class="rl-detail" style="margin:0">No extra resources catalogued yet.</p>`}
        ${n.repo ? `<div class="rl-links" style="margin-top:.3rem">
          <a class="rl-link" href="${n.repo}" target="_blank" rel="noopener">
            <span class="rl-link-kind" aria-hidden="true">📦</span>
            <span class="rl-link-label">Open the repository</span>
            <span class="rl-link-ext" aria-hidden="true">↗</span>
          </a></div>` : ""}
        ${n.app ? `<div class="rl-links" style="margin-top:.3rem">
          <a class="rl-link" href="${n.app}" target="_blank" rel="noopener">
            <span class="rl-link-kind" aria-hidden="true">🖥️</span>
            <span class="rl-link-label">Launch the app</span>
            <span class="rl-link-ext" aria-hidden="true">↗</span>
          </a></div>` : ""}
      </div>
    </div>
  </article>`;
}

function renderLibrary() {
  const host = document.getElementById("rlGrids");
  if (!host) return;

  const visible = NODES.filter(n => n.kind !== "source" && rlMatches(n));
  host.innerHTML = GROUPS.map(g => {
    const items = visible.filter(n => n.kind === g.kind);
    if (!items.length) return "";
    return `<h3 class="rl-group-title">${g.title} (${items.length})</h3>
            <div class="rl-grid">${items.map(rlCardHTML).join("")}</div>`;
  }).join("") || `<p class="rl-empty">Nothing matches that filter. Try clearing the search or tag.</p>`;

  const countEl = document.getElementById("rlCount");
  if (countEl) {
    const total = NODES.filter(n => n.kind !== "source").length;
    countEl.textContent = visible.length === total
      ? `${total} items`
      : `${visible.length} of ${total} items`;
  }

  host.querySelectorAll(".rl-card-head").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".rl-card");
      const open = card.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  // Source chips jump to the diagram and open that node's drawer.
  host.querySelectorAll(".rl-chip[data-jump]").forEach(chip => {
    chip.addEventListener("click", () => {
      const id = chip.getAttribute("data-jump");
      document.getElementById("dsCanvas").scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => { setLocked(id); openDrawer(id); }, 320);
    });
  });
}

function renderLibraryTags() {
  const host = document.getElementById("rlTags");
  if (!host) return;
  const pool = NODES.filter(n => n.kind !== "source");
  host.innerHTML = TOPICS.map(t => {
    const count = pool.filter(n => (n.topics || []).includes(t.id)).length;
    if (!count) return "";
    return `<button class="rl-tag" data-tag="${t.id}" style="--c:${t.color}" type="button">
      <span aria-hidden="true">${t.icon}</span>${t.label}<span class="rl-tag-count">${count}</span>
    </button>`;
  }).join("");

  host.querySelectorAll(".rl-tag").forEach(b => {
    b.addEventListener("click", () => {
      const tag = b.getAttribute("data-tag");
      rlTag = rlTag === tag ? null : tag;
      host.querySelectorAll(".rl-tag").forEach(x =>
        x.classList.toggle("is-active", x.getAttribute("data-tag") === rlTag));
      renderLibrary();
    });
  });
}

function renderHubLinks() {
  const host = document.getElementById("rlHubLinks");
  if (!host) return;
  host.innerHTML = HUB_LINKS.map(r => `
    <a class="rl-link" href="${r.url}" target="_blank" rel="noopener">
      <span class="rl-link-kind" aria-hidden="true">${RESOURCE_ICON[r.kind] || "🔗"}</span>
      <span class="rl-link-label">${r.label}</span>
      <span class="rl-link-ext" aria-hidden="true">↗</span>
    </a>`).join("");
}

function initLibrary() {
  renderLibraryTags();
  renderHubLinks();
  renderLibrary();

  const search = document.getElementById("rlSearch");
  if (search) {
    search.addEventListener("input", () => {
      rlQuery = search.value.trim().toLowerCase();
      renderLibrary();
    });
  }

  const expand = document.getElementById("rlExpandAll");
  if (expand) {
    expand.addEventListener("click", () => {
      const cards = [...document.querySelectorAll("#rlGrids .rl-card")];
      const anyClosed = cards.some(c => !c.classList.contains("is-open"));
      cards.forEach(c => {
        c.classList.toggle("is-open", anyClosed);
        const b = c.querySelector(".rl-card-head");
        if (b) b.setAttribute("aria-expanded", String(anyClosed));
      });
      expand.textContent = anyClosed ? "Collapse all" : "Expand all";
    });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLibrary);
} else {
  initLibrary();
}
