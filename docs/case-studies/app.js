// Analytics Hub · Case Studies
// =====================================================================
// To add a story: push into STORIES with the shape below.
// =====================================================================

const STORIES = [
  {
    id: "epam",
    org: "EPAM",
    industry: "staffing",
    industryLabel: "Staffing & services",
    employees: "2,000+",
    region: "Global",
    accent: "#0078d4",
    accent2: "#00B294",
    initials: "EP",
    summary: "Deployed Microsoft 365 Copilot to 2,000+ employees and rebuilt their measurement stack around custom analytics + proactive license optimization.",
    pull: "20% reduction in external collaboration hours in 6 months.",
    metrics: [
      { value: "2,000+", label: "Copilot users" },
      { value: "−20%", label: "External collaboration hrs" },
      { value: "6 mo",  label: "To measurable impact" },
    ],
    tags: ["Data-driven adoption", "License optimization", "Custom analytics"],
    link: "https://techcommunity.microsoft.com/blog/microsoft365copilotblog/customer-story-epams-data-driven-copilot-adoption-journey/4483556",
  },
  {
    id: "wipro",
    org: "Wipro",
    industry: "staffing",
    industryLabel: "Staffing & services",
    employees: "234,000+",
    region: "Global",
    accent: "#8661c5",
    accent2: "#0078d4",
    initials: "WI",
    summary: "Microsoft research featuring Wipro's outcome-driven approach to AI agents. Teams that aligned on desired outcomes were 1.9× more likely to become high-frequency agentic AI users.",
    pull: "1.9× higher chance of high-frequency agent use when outcomes are aligned.",
    metrics: [
      { value: "1.9×", label: "More high-frequency agent users" },
      { value: "Research drop", label: "MS Viva Insights study" },
      { value: "Agentic AI", label: "Focus area" },
    ],
    tags: ["Agentic AI", "Outcome alignment", "Microsoft research"],
    link: "https://techcommunity.microsoft.com/blog/microsoftvivablog/research-drop-amplifying-clarity-and-impact-of-ai-agents-by-aligning-on-desired-/4462903",
  },
  {
    id: "nhs",
    org: "NHS",
    industry: "public",
    industryLabel: "Public sector",
    employees: "1.4M",
    region: "United Kingdom",
    accent: "#005EB8",
    accent2: "#00B294",
    initials: "NHS",
    summary: "A Microsoft 365 Copilot pilot across 90 NHS organizations found AI-powered administrative support could save staff approximately 43 minutes per day, with significant system-wide potential if scaled.",
    pull: "~43 minutes of admin time saved per staffer, per day.",
    metrics: [
      { value: "90", label: "NHS organizations" },
      { value: "43 min", label: "Saved per day, per staffer" },
      { value: "System-wide", label: "Scaling opportunity" },
    ],
    tags: ["Healthcare", "Admin burden", "Public sector"],
    link: "https://ukstories.microsoft.com/features/why-ai-could-be-the-best-medicine-for-the-nhs/",
  },
  {
    id: "allegis-1",
    org: "Allegis Group",
    industry: "staffing",
    industryLabel: "Staffing & services",
    employees: "18,000+",
    region: "Global",
    accent: "#e3008c",
    accent2: "#FFB900",
    initials: "AG",
    summary: "18,000+ employees saved 150,000 hours and achieved $1.5M in translation cost savings after deploying Microsoft 365 Copilot and Azure AI Services across the organization.",
    pull: "150,000 hours saved · $1.5M translation savings.",
    metrics: [
      { value: "18,000+", label: "Employees" },
      { value: "150K hrs", label: "Saved" },
      { value: "$1.5M",   label: "Translation savings" },
    ],
    tags: ["M365 Copilot", "Azure AI Services", "Translation"],
    link: "https://www.microsoft.com/en/customers/story/25451-allegis-group-azure-ai-services",
  },
  {
    id: "allegis-2",
    org: "Allegis Group",
    industry: "staffing",
    industryLabel: "Staffing & services",
    employees: "18,000+",
    region: "Global",
    accent: "#FFB900",
    accent2: "#e3008c",
    initials: "AG",
    summary: "Leadership blueprint for how Allegis Group structured their AI rollout — including reducing PTO processing time from 31 hours to 13 hours and building repeatable frameworks for AI-driven innovation.",
    pull: "PTO processing: 31 hrs → 13 hrs.",
    metrics: [
      { value: "31 → 13 hrs", label: "PTO processing" },
      { value: "Blueprint",   label: "Repeatable framework" },
      { value: "Leadership",  label: "Top-down rollout" },
    ],
    tags: ["Leadership blueprint", "Process redesign", "Frameworks"],
    link: "https://www.microsoft.com/en-us/industry/microsoft-in-business/customer-experience/2025/10/20/a-blueprint-for-leaders-how-allegis-group-unlocks-sparks-and-drives-ai-innovation/",
  },
  {
    id: "lloyds",
    org: "Lloyds Banking Group",
    industry: "financial",
    industryLabel: "Financial services",
    employees: "60,000+",
    region: "United Kingdom",
    accent: "#006A4D",
    accent2: "#0078d4",
    initials: "LBG",
    summary: "Rolled out 30,000 Microsoft 365 Copilot licenses with 93% daily usage rates, measurable productivity gains across routine tasks, and a 50% improvement in software development cycle times.",
    pull: "30,000 licenses · 93% daily usage · 50% faster dev cycles.",
    metrics: [
      { value: "30,000", label: "Copilot licenses" },
      { value: "93%",    label: "Daily usage rate" },
      { value: "−50%",   label: "Dev cycle time" },
    ],
    tags: ["Banking", "Developer productivity", "At-scale rollout"],
    link: "https://ukstories.microsoft.com/features/lloyds-banking-group-using-ai-at-scale-to-transform-operations-and-employee-experience/",
  },
];

// Aggregate KPIs across all stories — show on the hero strip
const KPIS = [
  { value: STORIES.length,         label: "Published case studies" },
  { value: "6",                    label: "Industries represented" },
  { value: "180,000+",             label: "Hours saved (documented)" },
  { value: "$1.5M+",               label: "Cost savings (documented)" },
];

// =====================================================================
function renderKpis() {
  const host = document.getElementById("csKpis");
  host.innerHTML = KPIS.map(k => `
    <div class="cs-kpi">
      <div class="cs-kpi-value">${k.value}</div>
      <div class="cs-kpi-label">${k.label}</div>
    </div>`).join("");
}

function cardHtml(s, i) {
  const grad = `linear-gradient(135deg, ${s.accent} 0%, ${s.accent2} 100%)`;
  const tags = s.tags.map(t => `<span class="cs-tag">${t}</span>`).join("");
  const metrics = s.metrics.map(m => `
    <div class="cs-metric">
      <div class="cs-metric-value">${m.value}</div>
      <div class="cs-metric-label">${m.label}</div>
    </div>`).join("");
  return `
    <article class="cs-card" data-industry="${s.industry}" style="--accent:${s.accent}; --accent2:${s.accent2}; animation-delay:${i * 50}ms">
      <div class="cs-card-header" style="background:${grad}">
        <div class="cs-card-mark">${s.initials}</div>
        <div class="cs-card-meta">
          <div class="cs-industry">${s.industryLabel}</div>
          <h2 class="cs-org">${s.org}</h2>
          <div class="cs-meta-row">
            <span>👥 ${s.employees}</span>
            <span>🌍 ${s.region}</span>
          </div>
        </div>
      </div>

      <div class="cs-card-body">
        <blockquote class="cs-pull">${s.pull}</blockquote>
        <p class="cs-summary">${s.summary}</p>

        <div class="cs-metrics">${metrics}</div>

        <div class="cs-tags">${tags}</div>

        <a class="cs-cta-link" href="${s.link}" target="_blank" rel="noopener">
          Read the full case study <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>`;
}

function renderGrid(filter = "all") {
  const host = document.getElementById("csGrid");
  const list = filter === "all" ? STORIES : STORIES.filter(s => s.industry === filter);
  host.innerHTML = list.map((s, i) => cardHtml(s, i)).join("");
  // Re-trigger the entry animation
  host.querySelectorAll(".cs-card").forEach(el => {
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  });
}

function wireFilters() {
  document.querySelectorAll(".cs-filters .pill").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".cs-filters .pill").forEach(p => p.classList.remove("active"));
      b.classList.add("active");
      renderGrid(b.dataset.filter);
    });
  });
}

function init() {
  renderKpis();
  renderGrid("all");
  wireFilters();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
