/* ============================================================
   Find a Tool · picker page
   ============================================================ */

const TOOLS = [
  {
    id: 'super-usage',
    question: "Who are our Copilot super users, and how did they get there?",
    title: "Super Usage Adoption",
    icon: "⚡",
    accent: "#0078d4",
    category: "adoption-behavior",
    tier: "core",
    measures: ["adoption","productivity"],
    source: "Viva Insights",
    sourceKey: "Viva Insights",
    repo: "https://github.com/microsoft/DecodingSuperUsage",
    download: "https://github.com/microsoft/DecodingSuperUsage/archive/refs/heads/main.zip",
    emailFile: "04_Super_User_Adoption_Admin_Email.txt",
    preview: "https://raw.githubusercontent.com/microsoft/DecodingSuperUsage/refs/heads/DecodingSuperUsage/images/SuperUser.gif",
    blurb: "Power BI template on Viva Insights person-query data. Profiles your super users — what they use, how habits form, where they cluster — so you can replicate the pattern.",
    meta: { audience: "CCMs, enablement leads, execs", license: "Viva Insights", time: "30 min once query is staged" },
    requirements: {
      roles: [
        { label: "Viva Insights Analyst", url: "https://learn.microsoft.com/viva/insights/advanced/admin/add-users-ap" },
        { label: "Power BI workspace Member" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Viva Insights advanced person query" }
      ]
    },
  },
  {
    id: 'super-user-impact',
    question: "What's the measurable impact of super users on work patterns?",
    title: "Super User Impact",
    icon: "🏆",
    accent: "#00B294",
    category: "adoption-behavior",
    tier: "specialty",
    measures: ["impact","productivity"],
    source: "Viva Insights",
    sourceKey: "Viva Insights",
    repo: "https://github.com/microsoft/superuserimpact",
    download: "https://github.com/microsoft/superuserimpact/archive/refs/heads/main.zip",
    emailFile: "05_Super_User_Impact_Admin_Email.txt",
    preview: "https://raw.githubusercontent.com/microsoft/superuserimpact/main/images/report-preview.gif",
    blurb: "Companion to Super Usage Adoption. Quantifies the work-pattern delta super users produce — collaboration, focus time, meeting load — vs comparable peers. Same Viva query feeds both.",
    meta: { audience: "Execs, change leads, HR analytics", license: "Viva Insights", time: "Re-uses the Super Usage query" },
    requirements: {
      roles: [
        { label: "Viva Insights Analyst", url: "https://learn.microsoft.com/viva/insights/advanced/admin/add-users-ap" },
        { label: "Power BI workspace Member" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Super Usage Adoption query output" }
      ]
    },
  },
  {
    id: 'ai-in-one',
    question: "I want a single dashboard showing all Copilot and Agent activity.",
    title: "AI-in-One Dashboard",
    icon: "🤖",
    accent: "#e3008c",
    category: "usage-intelligence",
    tier: "core",
    measures: ["adoption","chat","agents","license"],
    source: "Purview + Entra",
    sourceKey: "Purview",
    repo: "https://github.com/microsoft/AI-in-One-Dashboard",
    download: "https://github.com/microsoft/AI-in-One-Dashboard/archive/refs/heads/main.zip",
    emailFile: "01_AI_in_One_Dashboard_Admin_Email.txt",
    preview: "https://raw.githubusercontent.com/microsoft/AI-in-One-Dashboard/main/Images/AIO%20v10%20Gif.gif",
    blurb: "One unified Power BI report covering Microsoft 365 Copilot, Copilot Chat (licensed + unlicensed), Agents, and third-party AI signals. The flagship if you only deploy one template.",
    meta: { audience: "Execs, IT leadership, program leads", license: "Audit Reader + Entra read + M365 Admin export", time: "~1–2 hours for first build" },
    requirements: {
      roles: [
        { label: "Purview Audit Reader", url: "https://learn.microsoft.com/purview/audit-search?tabs=microsoft-purview-portal#before-you-search-the-audit-log" },
        { label: "Entra Reports Reader", url: "https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#reports-reader" },
        { label: "M365 Admin Reports Reader", url: "https://learn.microsoft.com/microsoft-365/admin/add-users/about-admin-roles" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "PAX exporter (optional)", url: "https://github.com/microsoft/PAX" }
      ]
    },
  },
  {
    id: 'chat-agent',
    question: "How are people using Copilot Chat and Agents across our org?",
    title: "Copilot Chat & Agent Intelligence",
    icon: "💬",
    accent: "#8661c5",
    category: "usage-intelligence",
    tier: "specialty",
    measures: ["chat","agents"],
    source: "Purview + Entra",
    sourceKey: "Purview",
    repo: "https://github.com/microsoft/CopilotChatAnalytics",
    download: "https://github.com/microsoft/CopilotChatAnalytics/archive/refs/heads/main.zip",
    emailFile: "02_Chat_Intelligence_Admin_Email.txt",
    secondaryEmailFile: "03_Agent_Intelligence_Admin_Email.txt",
    preview: "https://raw.githubusercontent.com/microsoft/CopilotChatAnalytics/refs/heads/main/Images/ChatIntelGIG.gif",
    blurb: "Two Power BI templates on Purview audit logs + Entra: one for Copilot Chat (licensed + unlicensed), one for Agents. By user, app, department — no third-party analytics, no data leaves the tenant.",
    meta: { audience: "IT admins, Copilot champions, BVAs", license: "Audit Reader on Purview + Entra read", time: "~1 hour incl. data export" },
    requirements: {
      roles: [
        { label: "Purview Audit Reader", url: "https://learn.microsoft.com/purview/audit-search?tabs=microsoft-purview-portal#before-you-search-the-audit-log" },
        { label: "Entra Reports Reader", url: "https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#reports-reader" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "PAX exporter (optional)", url: "https://github.com/microsoft/PAX" }
      ]
    },
  },
  {
    id: 'ghcp-impact',
    question: "How are developers adopting GitHub Copilot?",
    title: "GitHub Copilot Impact",
    icon: "⚙️",
    accent: "#24292f",
    category: "developer",
    tier: "specialty",
    measures: ["developer","adoption"],
    source: "GitHub Enterprise",
    sourceKey: "GitHub",
    repo: "https://github.com/microsoft/GitHubCopilotImpact",
    download: "https://github.com/microsoft/GitHubCopilotImpact/archive/refs/heads/main.zip",
    emailFile: "06_GitHub_Copilot_Impact_Admin_Email.txt",
    preview: "https://raw.githubusercontent.com/microsoft/GitHubCopilotImpact/main/assets/ghcpgif.gif",
    blurb: "Per-team and per-user GitHub Copilot usage — chat vs agent, language, model, acceptance rates — pulled straight from the GitHub Enterprise REST API.",
    meta: { audience: "Developer productivity leads, eng managers, BVAs", license: "GitHub Enterprise admin (Copilot metrics API)", time: "~30 min once token is issued" },
    requirements: {
      roles: [
        { label: "GitHub Enterprise Owner or Billing Manager", url: "https://docs.github.com/copilot/managing-copilot/managing-github-copilot-in-your-organization/managing-access-to-github-copilot-in-your-organization" },
        { label: "PAT with read:enterprise scope", url: "https://docs.github.com/rest/copilot/copilot-metrics" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" }
      ]
    },
  },
  {
    id: 'what-i-did',
    question: "What did I personally build with GitHub Copilot this week — and what's the leverage?",
    title: "What I Did: Copilot Impact Report",
    icon: "📝",
    accent: "#4cc2ff",
    category: "developer",
    tier: "specialty",
    measures: ["developer","productivity"],
    source: "Local Copilot sessions",
    sourceKey: "Local",
    repo: "https://github.com/microsoft/What-I-Did-Copilot",
    download: "https://github.com/microsoft/What-I-Did-Copilot/archive/refs/heads/main.zip",
    preview: "https://raw.githubusercontent.com/microsoft/What-I-Did-Copilot/main/docs/images/sample-report.gif",
    blurb: "Personal-leverage report. Points a script at your local VS Code / Copilot session logs and summarizes what shipped, where Copilot helped, and the multiplier on your week.",
    meta: { audience: "Individual devs, IC leads, demo storytelling", license: "None — runs locally", time: "~5 minutes" },
    requirements: {
      roles: [
        { label: "None — runs on your own machine" }
      ],
      software: [
        { label: "VS Code with GitHub Copilot", url: "https://code.visualstudio.com/docs/copilot/overview" },
        { label: "Python 3.10+", url: "https://www.python.org/downloads/" }
      ]
    },
  },
  {
    id: 'm365-readiness',
    question: "Who's ready to be enabled on Copilot, and who should I groom as a champion?",
    title: "M365 Copilot Readiness Report",
    icon: "🎯",
    accent: "#FFB900",
    category: "readiness-roi",
    tier: "specialty",
    measures: ["adoption","license","customization"],
    source: "Purview + Entra",
    sourceKey: "Purview",
    repo: "https://github.com/microsoft/M365UsageAnalytics",
    download: "https://github.com/microsoft/M365UsageAnalytics/archive/refs/heads/main.zip",
    emailFile: "07_M365_Copilot_Readiness_Admin_Email.txt",
    blurb: "Ranks every user by Microsoft 365 fluency (Outlook, Word, Excel, PowerPoint, Teams) so you can stage enablement waves and surface the natural champion candidates in each org — defended with audit data, not gut feel.",
    meta: { audience: "Enablement leads, IT, license owners", license: "Audit Reader + Entra read", time: "~45 min for first run" },
    requirements: {
      roles: [
        { label: "Purview Audit Reader", url: "https://learn.microsoft.com/purview/audit-search?tabs=microsoft-purview-portal#before-you-search-the-audit-log" },
        { label: "Entra Reports Reader", url: "https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#reports-reader" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "PAX exporter (recommended)", url: "https://github.com/microsoft/PAX" }
      ]
    },
  },
  {
    id: 'adoption-sentiment',
    question: "How do employees feel about Copilot, and does that match actual usage?",
    title: "Adoption & Sentiment Report",
    icon: "💛",
    accent: "#FFB900",
    category: "adoption-behavior",
    tier: "specialty",
    measures: ["sentiment","adoption"],
    source: "M365 Admin + Survey",
    sourceKey: "M365 Admin",
    repo: "https://github.com/olivierpecheux/copilot-adoption-sentiment-report",
    download: "https://github.com/olivierpecheux/copilot-adoption-sentiment-report/archive/refs/heads/main.zip",
    preview: "https://raw.githubusercontent.com/olivierpecheux/copilot-adoption-sentiment-report/main/images/adoption-overview.png",
    blurb: "Four-page Power BI template by olivierpecheux/Microsoft: Adoption Overview, Sentiment Analysis, Comments Analysis, and Saved Time Analysis. Ships with a 12-question recommended Copilot survey — drop into Microsoft Forms, match the UPN column to the Copilot Activity export, and the report stitches sentiment to actual usage by tier (Bottom 25% → Top 10%).",
    meta: { audience: "Change managers, comms, exec sponsors", license: "M365 Admin report access + survey export", time: "~30 min" },
    requirements: {
      roles: [
        { label: "M365 Admin Reports Reader", url: "https://learn.microsoft.com/microsoft-365/admin/add-users/about-admin-roles" },
        { label: "Forms owner (for the survey)", url: "https://support.microsoft.com/forms" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Microsoft Forms", url: "https://forms.office.com" }
      ]
    },
  },
  {
    id: 'pax',
    question: "How do I automate pulling audit logs without manual exports?",
    title: "PAX: Portable Audit eXporter",
    icon: "🛡️",
    accent: "#6264a7",
    category: "tooling-extension",
    tier: "specialty",
    measures: ["audit"],
    source: "Purview + Entra (Microsoft Graph)",
    sourceKey: "Graph API",
    repo: "https://github.com/microsoft/PAX",
    download: "https://github.com/microsoft/PAX/archive/refs/heads/release.zip",
    blurb: "Enterprise-grade PowerShell exporter for Microsoft 365 audit logs and Entra directory data. Pulls from Purview, Entra, or both — supports Entra-only mode with no Purview dependency. Handles billions of events, no row limits, lands data wherever you need it — lake, warehouse, BI. The automation layer behind the Purview + Entra templates.",
    meta: { audience: "IT automation, security ops, data engineering", license: "App registration + Graph API permissions", time: "~1 hour incl. app registration" },
    requirements: {
      roles: [
        { label: "Entra Application Administrator (to register app)", url: "https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#application-administrator" },
        { label: "Graph: AuditLog.Read.All", url: "https://learn.microsoft.com/graph/permissions-reference#auditlogreadall" },
        { label: "Graph: Directory.Read.All", url: "https://learn.microsoft.com/graph/permissions-reference#directoryreadall" }
      ],
      software: [
        { label: "PowerShell 7+", url: "https://learn.microsoft.com/powershell/scripting/install/installing-powershell" },
        { label: "Microsoft.Graph PowerShell SDK", url: "https://learn.microsoft.com/powershell/microsoftgraph/installation" }
      ]
    },
  },
  {
    id: 'roi-calc',
    question: "I have the Super Usage heatmap in Power BI — how do I turn it into an ROI story?",
    title: "M365 Copilot Productivity ROI Calculator",
    icon: "🧮",
    accent: "#0078d4",
    category: "readiness-roi",
    tier: "core",
    measures: ["roi","impact"],
    source: "Power BI export (Super Usage Heatmap CSV)",
    sourceKey: "Viva Insights",
    repo: "https://jordankingisalive.github.io/CopilotROICalculator/",
    download: "https://github.com/jordankingisalive/CopilotROICalculator/archive/refs/heads/main.zip",
    blurb: "Browser-only ROI modeler that pairs with the Super Usage Adoption Power BI report. Export the heatmap visual from Power BI as a CSV, drop it into the calculator, sweep assumptions, and generate a defensible value story. The Power BI report does the data work; the calculator does the modeling. No install required for the calc itself.",
    meta: { audience: "BVAs, finance partners, exec sponsors", license: "Calc is browser-only; upstream needs Super Usage in Power BI + Viva Insights", time: "~10 min once heatmap CSV is exported from Power BI" },
    requirements: {
      roles: [
        { label: "None for the calc itself" },
        { label: "Upstream: Viva Insights Analyst", url: "https://learn.microsoft.com/viva/insights/advanced/admin/add-users-ap" }
      ],
      software: [
        { label: "Modern browser (Edge / Chrome / Firefox)" },
        { label: "Super Usage heatmap CSV export" }
      ]
    },
  },
  {
    id: 'customize',
    question: "I want to add custom pages or extend my Viva Insights reports.",
    title: "CustomizeCopilot Add-on Library",
    icon: "🧩",
    accent: "#4cc2ff",
    category: "tooling-extension",
    tier: "specialty",
    measures: ["customization"],
    source: "Viva Insights",
    sourceKey: "Viva Insights",
    repo: "https://github.com/microsoft/customizecopilot",
    download: "https://github.com/microsoft/customizecopilot/archive/refs/heads/main.zip",
    blurb: "Drop-in Power BI add-on pages and visualizations that extend the Viva Insights-based templates with custom views — Champion ID, segment overlays, more.",
    meta: { audience: "BI developers, advanced template owners", license: "Whatever the parent template needs", time: "~15 min per add-on" },
    requirements: {
      roles: [
        { label: "Whatever the parent template requires" },
        { label: "Power BI workspace Member" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Parent Viva Insights template installed" }
      ]
    },
  },
];

// ----------------------------------------------------- categories & measures
const CATEGORIES = [
  { id: 'usage-intelligence',  label: 'Usage Intelligence',      icon: '🤖', blurb: 'Single panes of glass for Copilot + Agent activity across the tenant.' },
  { id: 'adoption-behavior',   label: 'Adoption & Behavior',     icon: '📈', blurb: 'Who adopts, who champions, who lags — and how the patterns spread.' },
  { id: 'readiness-roi',       label: 'Readiness & ROI',         icon: '🎯', blurb: 'License placement, productivity lift, payback period.' },
  { id: 'developer',           label: 'Developer Productivity',  icon: '💻', blurb: 'GitHub Copilot adoption, acceptance rates, personal leverage.' },
  { id: 'tooling-extension',   label: 'Tooling & Extension',     icon: '🧩', blurb: 'Data plumbing and add-on libraries that power the reports above.' },
];

const MEASURES = {
  adoption:      { label: 'Adoption',          color: '#0078d4' },
  impact:        { label: 'Impact',            color: '#8661c5' },
  chat:          { label: 'Chat usage',        color: '#00B294' },
  agents:        { label: 'Agents',            color: '#e3008c' },
  sentiment:     { label: 'Sentiment',         color: '#ffaa44' },
  license:       { label: 'License readiness', color: '#0078d4' },
  roi:           { label: 'ROI modeling',      color: '#00B294' },
  developer:     { label: 'Developer',         color: '#8661c5' },
  productivity:  { label: 'Productivity',      color: '#e3008c' },
  audit:         { label: 'Audit automation',  color: '#ffaa44' },
  customization: { label: 'Customization',     color: '#0078d4' },
};

// ----------------------------------------------------- helpers
function repoSlug(repoUrl) {
  const m = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  return m ? m[1] : repoUrl;
}

function measureChips(measures) {
  if (!measures || !measures.length) return '';
  return measures.map(m => {
    const meta = MEASURES[m] || { label: m, color: '#888' };
    return `<span class="m-chip" data-measure="${m}" style="--c:${meta.color}" title="Filter by ${meta.label}">${meta.label}</span>`;
  }).join('');
}

function escAttr(s) { return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escText(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function reqChip(item) {
  const label = escText(item.label || '');
  if (item.url) {
    return `<a class="req-chip req-chip-link" href="${escAttr(item.url)}" target="_blank" rel="noopener" title="${label} \u2014 open docs">${label}<span class="req-chip-arrow" aria-hidden="true">\u2197</span></a>`;
  }
  return `<span class="req-chip">${label}</span>`;
}
function requirementsHtml(t) {
  const req = t.requirements;
  if (!req) return '';
  const roles = Array.isArray(req.roles) ? req.roles : [];
  const sw    = Array.isArray(req.software) ? req.software : [];
  if (!roles.length && !sw.length) return '';
  return `
    <div class="detail-reqs" aria-label="Required roles and software">
      <div class="req-row">
        <span class="req-label"><span class="req-icon" aria-hidden="true">🔐</span> Roles &amp; permissions</span>
        <div class="req-chips">${roles.length ? roles.map(reqChip).join('') : '<span class="req-chip req-chip-muted">None specified</span>'}</div>
      </div>
      <div class="req-row">
        <span class="req-label"><span class="req-icon" aria-hidden="true">🛠️</span> Software</span>
        <div class="req-chips">${sw.length ? sw.map(reqChip).join('') : '<span class="req-chip req-chip-muted">None specified</span>'}</div>
      </div>
    </div>`;
}

function previewHtml(t) {
  if (t.preview) {
    return `<img loading="lazy" src="${t.preview}" alt="${t.title} preview" />
            <div class="preview-fallback-inner" style="--c:${t.accent}">
              <div class="pf-icon">${t.icon}</div>
              <div class="pf-name">${t.title}</div>
            </div>`;
  }
  return `<div class="preview-fallback-inner" style="--c:${t.accent}">
            <div class="pf-icon">${t.icon}</div>
            <div class="pf-name">${t.title}</div>
          </div>`;
}

// Cache fetched email texts so we don't refetch
const emailCache = new Map();

async function fetchEmail(filename) {
  if (emailCache.has(filename)) return emailCache.get(filename);
  const res = await fetch(`../email-templates/${filename}`);
  if (!res.ok) throw new Error(`Could not load ${filename}`);
  const text = await res.text();
  emailCache.set(filename, text);
  return text;
}

function parseEmail(raw) {
  // First line: "Subject: ..."
  const lines = raw.split(/\r?\n/);
  let subject = "Action Required: Data Prerequisites";
  let bodyStart = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^Subject:\s*/i.test(lines[i])) {
      subject = lines[i].replace(/^Subject:\s*/i, "").trim();
      bodyStart = i + 1;
      break;
    }
  }
  // Skip blank lines after Subject
  while (bodyStart < lines.length && lines[bodyStart].trim() === "") bodyStart++;
  const body = lines.slice(bodyStart).join("\n").trim();
  return { subject, body };
}

async function openMailto(filename) {
  try {
    const raw = await fetchEmail(filename);
    const { subject, body } = parseEmail(raw);
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (url.length > 8000) {
      // mailto URI length limit — fall back to opening the .txt
      window.open(`../email-templates/${filename}`, "_blank");
      return;
    }
    window.location.href = url;
  } catch (err) {
    console.error(err);
    window.open(`../email-templates/${filename}`, "_blank");
  }
}

// ----------------------------------------------------- render
function rowHtml(t) {
  const slug = repoSlug(t.repo);
  const coreBadge = t.tier === 'core'
    ? `<span class="tier-badge tier-core" title="Recommended starting report">CORE</span>`
    : '';
  const measuresAttr = (t.measures || []).join(' ');
  return `
    <tr class="row-main" data-id="${t.id}" data-src="${t.sourceKey}" data-cat="${t.category || ''}" data-tier="${t.tier || ''}" data-measures="${measuresAttr}" data-search="${(t.question + ' ' + t.title + ' ' + t.source + ' ' + measuresAttr).toLowerCase()}">
      <td class="col-q"><button class="expand-btn" aria-expanded="false" aria-controls="detail-${t.id}"><span class="chev" aria-hidden="true">▸</span> ${t.question}</button></td>
      <td class="col-tool"><a class="tool-chip" href="${t.repo}" target="_blank" rel="noopener" style="--c:${t.accent}" title="Open ${t.title} on GitHub"><span class="tool-icon" aria-hidden="true">${t.icon}</span> ${t.title} ${coreBadge}<span class="chip-arrow" aria-hidden="true">↗</span></a></td>
      <td class="col-src"><div class="m-chips">${measureChips(t.measures)}</div></td>
      <td class="col-actions">
        <a class="ico-btn" href="${t.repo}" target="_blank" rel="noopener" title="Open on GitHub" aria-label="Open on GitHub">↗</a>
        <a class="ico-btn" href="${t.download}" title="Download .zip" aria-label="Download zip">⬇</a>
        ${t.emailFile
          ? `<button class="ico-btn email-btn" data-email="${t.emailFile}" title="Email your admin" aria-label="Email your admin">📧</button>`
          : `<span class="ico-btn ico-btn-empty" aria-hidden="true" title="No admin email template for this tool">·</span>`}
      </td>
    </tr>
    <tr class="row-detail" id="detail-${t.id}" hidden>
      <td colspan="4">
        <div class="detail-grid">
          <div class="detail-preview">
            ${t.preview
              ? `<button class="preview-link" data-preview="${t.preview}" data-title="${t.title}" title="Click to enlarge">
                  <img loading="lazy" src="${t.preview}" alt="${t.title} preview" />
                  <div class="preview-fallback-inner" style="--c:${t.accent}"><div class="pf-icon">${t.icon}</div><div class="pf-name">${t.title}</div></div>
                  <span class="preview-zoom-hint"><span class="zoom-icon" aria-hidden="true">⤢</span> Click to enlarge</span>
                </button>`
              : `<a class="preview-link preview-fallback" href="${t.repo}" target="_blank" rel="noopener">
                  <div class="preview-fallback-inner" style="--c:${t.accent}"><div class="pf-icon">${t.icon}</div><div class="pf-name">${t.title}</div></div>
                </a>`
            }
            <p class="repo-slug"><code>${slug}</code></p>
          </div>
          <div class="detail-copy">
            <p class="blurb">${t.blurb}</p>
            <div class="detail-ctas">
              <a class="btn btn-primary" href="${t.repo}" target="_blank" rel="noopener">Open repository ↗</a>
              <a class="btn btn-ghost" href="${t.download}">⬇ Download .zip</a>
              ${t.emailFile ? `<button class="btn btn-soft email-btn" data-email="${t.emailFile}">📧 Email your admin</button>` : ''}
              ${t.secondaryEmailFile ? `<button class="btn btn-soft email-btn" data-email="${t.secondaryEmailFile}">📧 Email (Agent variant)</button>` : ''}
              <a class="btn btn-ghost" href="${t.repo}" target="_blank" rel="noopener" aria-label="Star ${t.title} on GitHub to follow updates">⭐ Star repo to follow for updates</a>
            </div>
            <p class="data-line"><strong>Data source:</strong> ${t.source}</p>
            ${requirementsHtml(t)}
          </div>
        </div>
      </td>
    </tr>`;
}

function render() {
  const body = document.getElementById('pickerBody');
  // Group tools by category, preserve CATEGORIES order, then within each category put 'core' first
  const html = CATEGORIES.map(cat => {
    const tools = TOOLS
      .filter(t => t.category === cat.id)
      .sort((a, b) => (a.tier === 'core' ? -1 : 0) - (b.tier === 'core' ? -1 : 0));
    if (!tools.length) return '';
    const header = `
      <tr class="cat-header" data-cat="${cat.id}">
        <td colspan="4">
          <div class="cat-header-inner">
            <span class="cat-icon" aria-hidden="true">${cat.icon}</span>
            <span class="cat-label">${cat.label}</span>
            <span class="cat-blurb">${cat.blurb}</span>
            <span class="cat-count">${tools.length} report${tools.length === 1 ? '' : 's'}</span>
          </div>
        </td>
      </tr>`;
    return header + tools.map(rowHtml).join('');
  }).join('');
  body.innerHTML = html;
  wirePreviewFallback();
  wireExpand();
  wireEmail();
  wireLightbox();
  wireMeasureChips();
}

function wireMeasureChips() {
  document.querySelectorAll('.m-chip[data-measure]').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const m = chip.dataset.measure;
      // Activate corresponding filter pill if present
      const pill = document.querySelector(`.filter-pills .pill[data-measure="${m}"]`);
      if (pill) {
        document.querySelectorAll('.filter-pills .pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      }
      applyFilters();
      pill?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  });
}

function wirePreviewFallback() {
  document.querySelectorAll('.detail-preview img[loading="lazy"], .preview img[loading="lazy"]').forEach((img) => {
    img.addEventListener('error', () => {
      const parent = img.parentElement;
      if (!parent) return;
      parent.classList.add('preview-fallback');
      parent.removeAttribute('data-preview');
      img.remove();
    });
  });
}

function wireLightbox() {
  const lb = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImg');
  const cap = document.getElementById('lightboxCaption');
  const close = () => {
    lb.setAttribute('hidden', '');
    lb.setAttribute('aria-hidden', 'true');
    img.src = '';
    document.body.style.overflow = '';
  };
  document.querySelectorAll('button.preview-link[data-preview]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const src = btn.dataset.preview;
      const title = btn.dataset.title || '';
      if (!src) return;
      img.src = src;
      img.alt = `${title} preview (enlarged)`;
      cap.textContent = title;
      lb.removeAttribute('hidden');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  });
  document.getElementById('lightboxClose').addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hasAttribute('hidden')) close(); });
}

function wireExpand() {
  document.querySelectorAll('.row-main .expand-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = btn.closest('.row-main');
      const id = row.dataset.id;
      const detail = document.getElementById(`detail-${id}`);
      const open = !detail.hasAttribute('hidden');
      // Close all
      document.querySelectorAll('.row-detail').forEach(d => d.setAttribute('hidden', ''));
      document.querySelectorAll('.row-main').forEach(r => r.classList.remove('expanded'));
      document.querySelectorAll('.expand-btn').forEach(b => b.setAttribute('aria-expanded', 'false'));
      if (!open) {
        detail.removeAttribute('hidden');
        row.classList.add('expanded');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

function wireEmail() {
  document.querySelectorAll('.email-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const f = btn.dataset.email;
      if (f) openMailto(f);
    });
  });
}

// ----------------------------------------------------- filter + search
function applyFilters() {
  const q = (document.getElementById('qSearch').value || '').toLowerCase().trim();
  const activePill = document.querySelector('.filter-pills .pill.active');
  const measure = activePill ? (activePill.dataset.measure || 'all') : 'all';
  const tier = activePill ? (activePill.dataset.tier || '') : '';
  let shown = 0;
  // Count visible rows per category
  const catCounts = {};
  document.querySelectorAll('.row-main').forEach(row => {
    const detail = document.getElementById(`detail-${row.dataset.id}`);
    const rowMeasures = (row.dataset.measures || '').split(/\s+/).filter(Boolean);
    const matchMeasure = measure === 'all' || rowMeasures.includes(measure);
    const matchTier = !tier || row.dataset.tier === tier;
    const matchQ = !q || row.dataset.search.includes(q);
    const visible = matchMeasure && matchTier && matchQ;
    row.style.display = visible ? '' : 'none';
    if (detail) detail.style.display = visible ? '' : 'none';
    if (visible) {
      shown++;
      const c = row.dataset.cat || '';
      catCounts[c] = (catCounts[c] || 0) + 1;
    }
  });
  // Hide category headers whose children are all hidden
  document.querySelectorAll('.cat-header').forEach(h => {
    const c = h.dataset.cat;
    h.style.display = (catCounts[c] > 0) ? '' : 'none';
  });
  document.getElementById('emptyState').hidden = shown > 0;
}

function wireFilters() {
  document.getElementById('qSearch').addEventListener('input', applyFilters);
  document.querySelectorAll('.filter-pills .pill').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.filter-pills .pill').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      applyFilters();
    });
  });
}

// ----------------------------------------------------- init
document.addEventListener('DOMContentLoaded', () => {
  render();
  wireFilters();
  const params = new URLSearchParams(window.location.search);
  const measure = params.get('measure');
  const tier = params.get('tier');
  const q = params.get('q');
  // Deep-link to a measure (from home tiles): activate matching pill
  if (measure) {
    const pill = document.querySelector(`.filter-pills .pill[data-measure="${measure}"]`);
    if (pill) {
      document.querySelectorAll('.filter-pills .pill').forEach(x => x.classList.remove('active'));
      pill.classList.add('active');
    }
  }
  // Deep-link to tier (e.g. "core only")
  if (tier === 'core') {
    const pill = document.querySelector('.filter-pills .pill[data-tier="core"]');
    if (pill) {
      document.querySelectorAll('.filter-pills .pill').forEach(x => x.classList.remove('active'));
      pill.classList.add('active');
    }
  }
  if (q) {
    const input = document.getElementById('qSearch');
    if (input) { input.value = q; input.focus(); }
  }
  applyFilters();
});
