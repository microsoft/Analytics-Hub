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
    id: 'cowork-impact',
    question: "I want to see business processes that Cowork helped me with and its impact.",
    title: "What Cowork Did For Me",
    icon: "🎁",
    accent: "#e3008c",
    category: "impact-roi",
    tier: "specialty",
    measures: ["roi","productivity","impact"],
    source: "Local Cowork sessions (OneDrive)",
    sourceKey: "Local",
    repo: "https://github.com/microsoft/What-I-did-with-Cowork",
    download: "https://github.com/microsoft/What-I-did-with-Cowork/raw/main/cowork-roi-report-skill-v24.zip",
    preview: "https://raw.githubusercontent.com/microsoft/What-I-did-with-Cowork/main/images/report-hero.png",
    blurb: "Personal ROI report for Microsoft Copilot Cowork. Harvests your OneDrive Cowork session history, classifies each task into research-anchored categories, and renders a single-file HTML report with Time Saved, professional-services-equivalent value, and a mapping to the four Value Pillars.",
    meta: { audience: "Cowork users, IC leads, execs quantifying Cowork ROI", license: "None — runs locally", time: "~2 minutes" },
    requirements: {
      roles: [
        { label: "None — runs against your own OneDrive data" }
      ],
      software: [
        { label: "Microsoft Copilot Cowork", url: "https://copilot.cloud.microsoft/cowork" },
        { label: "OneDrive with Documents/Cowork/ folder" }
      ]
    },
  },
  {
    id: 'm365-readiness',
    question: "Who's ready to be enabled on Copilot, and who should I groom as a champion?",
    title: "M365 Copilot Readiness Report",
    icon: "🎯",
    accent: "#FFB900",
    category: "readiness",
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
    question: "I want to tell an ROI story from the Superuser report.",
    title: "M365 Copilot Productivity ROI Calculator",
    icon: "🧮",
    accent: "#0078d4",
    category: "impact-roi",
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
    id: 'cowork-billing-report',
    question: "I want to determine the chargeback and department-level cost allocation.",
    title: "Copilot Cowork Billing Report",
    icon: "🧾",
    accent: "#0078d4",
    category: "impact-roi",
    tier: "core",
    measures: ["impact","roi"],
    source: "Copilot credit consumption + Entra export",
    sourceKey: "M365 Admin",
    repo: "https://github.com/microsoft/CreditUsage",
    download: "https://github.com/microsoft/CreditUsage/archive/refs/heads/main.zip",
    blurb: "RLS-ready Power BI report for Cowork credit consumption, chargeback modeling, optimization, and billing analysis.",
    meta: { audience: "FinOps, IT admins, platform owners", license: "M365 Admin exports", time: "~45 min" },
    requirements: {
      roles: [
        { label: "M365 Admin Reports Reader", url: "https://learn.microsoft.com/microsoft-365/admin/add-users/about-admin-roles" },
        { label: "Entra Reports Reader", url: "https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#reports-reader" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" }
      ]
    },
  },
  {
    id: 'cowork-chargeback-app',
    question: "I want a lightweight web app that lets me do scenario modeling for Cowork credits.",
    title: "Cowork Chargeback (Web App)",
    icon: "🧮",
    accent: "#00B294",
    category: "impact-roi",
    tier: "specialty",
    measures: ["impact","roi"],
    source: "Copilot credit consumption + Entra export",
    sourceKey: "M365 Admin",
    repo: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-chargeback/app/index.html",
    download: "https://github.com/microsoft/Analytics-Hub/archive/refs/heads/main.zip",
    preview: "https://microsoft.github.io/Analytics-Hub/cowork-billing/assets/report-walkthrough.gif",
    blurb: "Client-side chargeback app that allocates Cowork credits to departments and users with export-ready outputs.",
    meta: { audience: "FinOps, finance partners, IT operations", license: "M365 Admin exports", time: "~10 min" },
    requirements: {
      roles: [
        { label: "M365 Admin Reports Reader", url: "https://learn.microsoft.com/microsoft-365/admin/add-users/about-admin-roles" },
        { label: "Entra Reports Reader", url: "https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#reports-reader" }
      ],
      software: [
        { label: "Modern browser (Edge / Chrome / Firefox)" }
      ]
    },
  },
  {
    id: 'cowork-policy-helper-app',
    question: "I need to assign Cowork spend policies and track exceptions.",
    title: "Cowork Policy Helper (Web App)",
    icon: "🔐",
    accent: "#8661c5",
    category: "readiness",
    tier: "specialty",
    measures: ["license","impact"],
    source: "Copilot consumption + Entra user attributes",
    sourceKey: "M365 Admin",
    repo: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-policy-helper/app/index.html",
    download: "https://github.com/microsoft/Analytics-Hub/archive/refs/heads/main.zip",
    blurb: "Policy assignment and exception management app for governing Cowork spend tiers.",
    meta: { audience: "IT governance, FinOps, platform admins", license: "M365 Admin exports", time: "~10 min" },
    requirements: {
      roles: [
        { label: "M365 Admin Reports Reader", url: "https://learn.microsoft.com/microsoft-365/admin/add-users/about-admin-roles" },
        { label: "Entra Reports Reader", url: "https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#reports-reader" }
      ],
      software: [
        { label: "Modern browser (Edge / Chrome / Firefox)" }
      ]
    },
  },
  {
    id: 'cowork-usage-tracker-app',
    question: "I want to track Cowork credits beyond the standard Admin Center time period.",
    title: "Cowork Usage Tracker (Web App)",
    icon: "⏱️",
    accent: "#e3008c",
    category: "impact-roi",
    tier: "specialty",
    measures: ["impact","roi"],
    source: "Recurring Cowork CSV exports",
    sourceKey: "M365 Admin",
    repo: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-usage-tracker/app/index.html",
    download: "https://github.com/microsoft/Analytics-Hub/archive/refs/heads/main.zip",
    blurb: "Trend reconstruction app for point-in-time Cowork exports with run-rate, depletion, and action signals.",
    meta: { audience: "FinOps, operations, adoption leads", license: "M365 Admin exports", time: "~10 min" },
    requirements: {
      roles: [
        { label: "M365 Admin Reports Reader", url: "https://learn.microsoft.com/microsoft-365/admin/add-users/about-admin-roles" }
      ],
      software: [
        { label: "Modern browser (Edge / Chrome / Firefox)" }
      ]
    },
  },
  {
    id: 'finops-focus-app',
    question: "I need Cowork cost views aligned to FinOps FOCUS definitions.",
    title: "FinOps & FOCUS Cost Report (Web App)",
    icon: "📊",
    accent: "#0078d4",
    category: "impact-roi",
    tier: "specialty",
    measures: ["impact","roi"],
    source: "Cowork consumption + billing context",
    sourceKey: "M365 Admin",
    repo: "https://microsoft.github.io/Analytics-Hub/FinOps-Cowork/app/finops.html",
    download: "https://github.com/microsoft/Analytics-Hub/archive/refs/heads/main.zip",
    blurb: "Browser app presenting Cowork costs with FinOps Framework and FOCUS-aligned cost lenses.",
    meta: { audience: "FinOps practitioners, finance, cloud platform teams", license: "M365 Admin exports", time: "~10 min" },
    requirements: {
      roles: [
        { label: "M365 Admin Reports Reader", url: "https://learn.microsoft.com/microsoft-365/admin/add-users/about-admin-roles" }
      ],
      software: [
        { label: "Modern browser (Edge / Chrome / Firefox)" }
      ]
    },
  },
  {
    id: 'cowork-roi-model-app',
    question: "I want to model Cowork ROI scenarios.",
    title: "Cowork ROI Model (Web App)",
    icon: "📈",
    accent: "#b11f4b",
    category: "impact-roi",
    tier: "core",
    measures: ["impact","roi","productivity"],
    source: "User-entered assumptions + research defaults",
    sourceKey: "Local",
    repo: "https://microsoft.github.io/Analytics-Hub/cowork-billing/cowork-roi-model/app/",
    download: "https://github.com/microsoft/Analytics-Hub/archive/refs/heads/main.zip",
    blurb: "Interactive ROI model with research-based category defaults and user-entered assumptions (no tenant payload required).",
    meta: { audience: "BVAs, finance partners, sellers", license: "None", time: "~5 min" },
    requirements: {
      roles: [
        { label: "None — browser only" }
      ],
      software: [
        { label: "Modern browser (Edge / Chrome / Firefox)" }
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
  {
    id: 'personal-copilot-dashboard',
    question: "I want a personal dashboard of my own Copilot, agent, and Cowork usage vs my org.",
    title: "Personal Copilot Dashboard",
    icon: "📊",
    accent: "#0078d4",
    category: "adoption-behavior",
    tier: "specialty",
    measures: ["adoption","productivity","agents"],
    source: "Copilot Dashboard export (Viva Insights)",
    sourceKey: "Viva Insights",
    repo: "https://github.com/sbrandl1005/copilot-personal-dashboard",
    download: "https://github.com/sbrandl1005/copilot-personal-dashboard/archive/refs/heads/main.zip",
    blurb: "Self-service Power BI template that turns your own Copilot Dashboard export into a personal view of adoption, hours saved, feature-level leverage, agent usage, and Cowork credits — with org benchmarks, a personalized user-category, and next-step learning. Loads Copilot, Agent, and Cowork exports in any combination.",
    meta: { audience: "Individual users, IC leads, enablement demos", license: "Copilot Dashboard export (Viva Insights)", time: "~15 min" },
    requirements: {
      roles: [
        { label: "Copilot Dashboard access (auto-enabled)", url: "https://learn.microsoft.com/viva/insights/org-team-insights/copilot-dashboard" },
        { label: "Power BI workspace Member" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Copilot Dashboard export CSVs" }
      ]
    },
  },
  {
    id: 'ess-insights',
    question: "How is my Employee Self-Service (ESS) Copilot Studio agent performing — adoption, deflection, and value?",
    title: "ESS Insights — Employee Self-Serve Business Value",
    icon: "🧑‍💼",
    accent: "#8661c5",
    category: "impact-roi",
    tier: "specialty",
    measures: ["agents","impact","roi"],
    source: "Copilot Studio transcripts (Dataverse)",
    sourceKey: "Dataverse",
    repo: "https://github.com/downeysteph/ESS-Insights",
    download: "https://github.com/downeysteph/ESS-Insights/archive/refs/heads/main.zip",
    preview: "https://raw.githubusercontent.com/downeysteph/ESS-Insights/main/images/dashboard-preview.gif",
    blurb: "Drop-in Power BI template for the Microsoft ESS Copilot Studio agent (works for any agent). A nine-page executive dashboard built from the ConversationTranscript Dataverse table — adoption, resolution vs escalation, time-to-knowledge, tickets deflected, hours saved and dollar value, plus in-conversation feedback. No custom logging or extra pipelines.",
    meta: { audience: "HR/IT program owners, ESS sponsors, execs", license: "Power Platform / Dataverse export", time: "~45 min" },
    requirements: {
      roles: [
        { label: "Dataverse read (ConversationTranscript)", url: "https://learn.microsoft.com/microsoft-copilot-studio/" },
        { label: "Power BI workspace Member" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Copilot Studio agent writing transcripts to Dataverse" }
      ]
    },
  },
  {
    id: 'value-lens',
    question: "I need a defensible ROI narrative for Microsoft Copilot & agent adoption.",
    title: "ValueLens for Microsoft Copilot",
    icon: "💠",
    accent: "#00B294",
    category: "impact-roi",
    tier: "specialty",
    measures: ["impact","roi","adoption"],
    source: "Purview audit logs",
    sourceKey: "Purview",
    repo: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot",
    download: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot/archive/refs/heads/main.zip",
    preview: "https://raw.githubusercontent.com/microsoft/ValueLens-for-Microsoft-Copilot/main/Images/ValueLens-Preview.gif",
    blurb: "Business Value Advisory Power BI template that unifies every Copilot & agent adoption signal into hours saved, assisted value, and adoption/readiness — a defensible ROI story aligned to Microsoft's Frontier Firm framework. Ships with SharePoint, Fabric, and Dataverse deployment paths.",
    meta: { audience: "Business Value Advisory, execs, program leads", license: "Purview Audit Reader", time: "~1 hour for first build" },
    requirements: {
      roles: [
        { label: "Purview Audit Reader", url: "https://learn.microsoft.com/purview/audit-search?tabs=microsoft-purview-portal#before-you-search-the-audit-log" },
        { label: "Power BI workspace Member" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Python (SharePoint path) or Fabric capacity (Fabric path)" }
      ]
    },
  },
  {
    id: 'studio-lens',
    question: "How do my Copilot Studio agents perform — quality, containment, transcripts, and message-credit cost?",
    title: "StudioLens for Copilot Studio",
    icon: "🔬",
    accent: "#e3008c",
    category: "usage-intelligence",
    tier: "specialty",
    measures: ["agents","impact"],
    source: "Copilot Studio transcripts (Dataverse) + Power Platform admin center",
    sourceKey: "Dataverse",
    repo: "https://github.com/Keithland89/StudioLens-for-Copilot-Studio",
    download: "https://github.com/Keithland89/StudioLens-for-Copilot-Studio/archive/refs/heads/main.zip",
    preview: "https://raw.githubusercontent.com/Keithland89/StudioLens-for-Copilot-Studio/main/assets/studiolens-demo.gif",
    blurb: "Business Value Advisory Power BI template for deep Copilot Studio agent evaluation — sessions, turns, errors, sub-agent calls, quality & performance, topics, knowledge files, user feedback, and Power Platform message-credit consumption. Dataverse Direct and Fabric deployment paths.",
    meta: { audience: "Agent makers, Studio admins, FinOps", license: "Dataverse read (+ Fabric for credit pages)", time: "~45 min" },
    requirements: {
      roles: [
        { label: "Dataverse read (Copilot Studio transcripts)", url: "https://learn.microsoft.com/microsoft-copilot-studio/" },
        { label: "Power BI workspace Member" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Dataverse environment (+ Fabric capacity for message-credit pages)" }
      ]
    },
  },
];

// ----------------------------------------------------- categories & measures
const CATEGORIES = [
  { id: 'usage-intelligence',  label: 'Usage & Intelligence',    blurb: 'Single panes of glass for Copilot + Agent activity across the tenant.' },
  { id: 'adoption-behavior',   label: 'Adoption & Behavior',     blurb: 'Who adopts, who champions, who lags — and how the patterns spread.' },
  { id: 'readiness',           label: 'Readiness',               blurb: 'License placement, activation sequencing, and champion identification.' },
  { id: 'impact-roi',          label: 'Impact & ROI',            blurb: 'Productivity lift, financial value, and cost modeling outcomes.' },
  { id: 'developer',           label: 'Developer Productivity',  blurb: 'GitHub Copilot adoption, acceptance rates, personal leverage.' },
  { id: 'tooling-extension',   label: 'Tooling & Extension',     blurb: 'Data plumbing and add-on libraries that power the reports above.' },
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
  audit:         { label: 'Data Export Scripts', color: '#ffaa44' },
  customization: { label: 'Customization',     color: '#0078d4' },
};

// ----------------------------------------------------- helpers
function measureChips(measures) {
  if (!measures || !measures.length) return '';
  return `<span class="m-text">${measures.map(m => (MEASURES[m] || { label: m }).label).join(', ')}</span>`;
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
        <span class="req-label">Roles &amp; permissions</span>
        <div class="req-chips">${roles.length ? roles.map(reqChip).join('') : '<span class="req-chip req-chip-muted">None specified</span>'}</div>
      </div>
      <div class="req-row">
        <span class="req-label">Software</span>
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

// ----------------------------------------------------- render
function rowHtml(t) {
  const coreBadge = t.tier === 'core'
    ? `<span class="tier-badge tier-core" title="Recommended starting report">CORE</span>`
    : '';
  const measuresAttr = (t.measures || []).join(' ');
  return `
    <tr class="row-main" data-id="${t.id}" data-src="${t.sourceKey}" data-cat="${t.category || ''}" data-tier="${t.tier || ''}" data-measures="${measuresAttr}" data-search="${(t.question + ' ' + t.title + ' ' + t.source + ' ' + measuresAttr).toLowerCase()}">
      <td class="col-q"><button class="expand-btn" aria-expanded="false" aria-controls="detail-${t.id}"><span class="chev" aria-hidden="true">▸</span> ${t.question}</button></td>
      <td class="col-tool"><a class="tool-chip" href="${t.repo}" target="_blank" rel="noopener" style="--c:${t.accent}" title="Open ${t.title}">${t.title} ${coreBadge}</a></td>
      <td class="col-src"><div class="m-chips">${measureChips(t.measures)}</div></td>
      <td class="col-actions">
        <a class="ico-btn" href="${t.repo}" target="_blank" rel="noopener" title="Open report link" aria-label="Open report link">Open</a>
        <a class="ico-btn" href="${t.download}" title="Download .zip package" aria-label="Download .zip package">Download</a>
      </td>
    </tr>
    <tr class="row-detail" id="detail-${t.id}" hidden>
      <td colspan="4">
        <div class="detail-grid">
          <div class="detail-preview">
            ${t.preview
              ? `<button class="preview-link" data-preview="${t.preview}" data-title="${t.title}" title="Click to enlarge">
                  <img loading="lazy" src="${t.preview}" alt="${t.title} preview" />
                  <div class="preview-fallback-inner" style="--c:${t.accent}"><div class="pf-name">${t.title}</div></div>
                  <span class="preview-zoom-hint"><span class="zoom-icon" aria-hidden="true">⤢</span> Click to enlarge</span>
                </button>`
              : `<a class="preview-link preview-fallback" href="${t.repo}" target="_blank" rel="noopener">
                  <div class="preview-fallback-inner" style="--c:${t.accent}"><div class="pf-name">${t.title}</div></div>
                </a>`
            }
          </div>
          <div class="detail-copy">
            <p class="blurb">${t.blurb}</p>
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
  wireLightbox();
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

// ----------------------------------------------------- filter + search
const filterState = {
  category: 'all',
  coreOnly: false,
  measures: new Set(),
};

function syncFilterUI() {
  document.querySelectorAll('.filter-pills .pill[data-cat]').forEach(p => {
    p.classList.toggle('active', (p.dataset.cat || 'all') === filterState.category);
  });
  const coreBtn = document.querySelector('.filter-pills .pill[data-tier="core"], .pill[data-tier="core"]');
  if (coreBtn) coreBtn.classList.toggle('active', !!filterState.coreOnly);
  document.querySelectorAll('.outcome-pill[data-measure-filter]').forEach(p => {
    p.classList.toggle('active', filterState.measures.has(p.dataset.measureFilter));
  });
}

function applyFilters() {
  const q = (document.getElementById('qSearch').value || '').toLowerCase().trim();
  const selectedMeasures = Array.from(filterState.measures);
  let shown = 0;
  // Count visible rows per category
  const catCounts = {};
  document.querySelectorAll('.row-main').forEach(row => {
    const detail = document.getElementById(`detail-${row.dataset.id}`);
    const rowMeasures = (row.dataset.measures || '').split(/\s+/).filter(Boolean);
    const matchCategory = filterState.category === 'all' || row.dataset.cat === filterState.category;
    const matchTier = !filterState.coreOnly || row.dataset.tier === 'core';
    const matchMeasure = selectedMeasures.length === 0 || selectedMeasures.some(m => rowMeasures.includes(m));
    const matchQ = !q || row.dataset.search.includes(q);
    const visible = matchCategory && matchTier && matchMeasure && matchQ;
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
  document.querySelectorAll('.filter-pills .pill[data-cat]').forEach(p => {
    p.addEventListener('click', () => {
      filterState.category = p.dataset.cat || 'all';
      syncFilterUI();
      applyFilters();
    });
  });
  const coreBtn = document.querySelector('.pill[data-tier="core"]');
  if (coreBtn) {
    coreBtn.addEventListener('click', () => {
      filterState.coreOnly = !filterState.coreOnly;
      syncFilterUI();
      applyFilters();
    });
  }
  document.querySelectorAll('.outcome-pill[data-measure-filter]').forEach(p => {
    p.addEventListener('click', () => {
      const measure = p.dataset.measureFilter;
      if (!measure) return;
      if (filterState.measures.has(measure)) {
        filterState.measures.delete(measure);
      } else {
        filterState.measures.add(measure);
      }
      syncFilterUI();
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
  const category = params.get('category');
  const tier = params.get('tier');
  const q = params.get('q');
  // Deep-link to a category.
  if (category) filterState.category = category;
  // Backward compatibility: old links with ?measure=...
  if (measure && !category) {
    const match = TOOLS.find(t => Array.isArray(t.measures) && t.measures.includes(measure));
    if (match) filterState.category = match.category;
  }
  // Supports measure=adoption,impact deep links as optional focus filters.
  if (measure) {
    measure.split(',').map(m => m.trim()).filter(Boolean).forEach(m => filterState.measures.add(m));
  }
  // Deep-link to tier (e.g. "core only")
  if (tier === 'core') filterState.coreOnly = true;
  if (q) {
    const input = document.getElementById('qSearch');
    if (input) { input.value = q; input.focus(); }
  }
  syncFilterUI();
  applyFilters();
});
