/* ============================================================
   Find a Tool · picker page
   ============================================================ */

const TOOLS = [
  {
    id: 'super-usage',
    tags: ["adoption","super users","power users","champions","habits","behaviour","enablement"],
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
    tags: ["impact","productivity","work patterns","collaboration","meetings","time saved"],
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
    tags: ["executive","single pane","overview","adoption","chat","agents","licences","monthly review"],
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
    demoVideo: "https://github.com/microsoft/AI-in-One-Dashboard/raw/main/media/AI-in-One-Overview.mp4",
    demoVideoLabel: "Watch the 2-minute overview",
    guide: "https://github.com/microsoft/AI-in-One-Dashboard/blob/main/docs/Video-Guide.md",
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
    tags: ["chat","agents","prompts","usage","departments","maturity"],
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
    tags: ["developer","github copilot","engineering","adoption","code"],
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
    tags: ["developer","github copilot","personal","weekly","individual","leverage"],
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
    tags: ["cowork","business process","impact","personal","time saved"],
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
    download: "https://github.com/microsoft/What-I-did-with-Cowork/raw/main/cowork-roi-report-skill-v37.zip",
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
    tags: ["readiness","enablement","onboarding","champions","licences","who to enable next"],
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
    tags: ["sentiment","survey","satisfaction","feedback","employee voice","adoption"],
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
    tags: ["audit","logs","export","automation","compliance","graph api"],
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
    tags: ["roi","business case","payback","calculator","cost recovery","value"],
    question: "I want to tell an ROI story from the Superuser report.",
    title: "M365 Copilot Productivity ROI Calculator",
    icon: "🧮",
    accent: "#0078d4",
    category: "impact-roi",
    tier: "core",
    measures: ["roi","impact"],
    source: "Viva Insights (person query CSV)",
    sourceKey: "Viva Insights",
    repo: "https://jordankingisalive.github.io/CopilotROICalculator/",
    download: "https://github.com/jordankingisalive/CopilotROICalculator/archive/refs/heads/main.zip",
    blurb: "Browser-only ROI modeler that runs on the same Viva Insights person query CSV as Super Usage Adoption and Super User Impact. If you already run either report, reuse that export — drop it in, sweep assumptions, and generate a defensible value story with real Power/Habitual/Novice/Low/Non-user cohorts. No heatmap export needed, and no install for the calculator itself.",
    meta: { audience: "BVAs, finance partners, exec sponsors", license: "Calc is browser-only; the export needs Viva Insights Analyst", time: "~10 min once the person query CSV is downloaded" },
    requirements: {
      roles: [
        { label: "None for the calc itself" },
        { label: "Upstream: Viva Insights Analyst", url: "https://learn.microsoft.com/viva/insights/advanced/admin/add-users-ap" }
      ],
      software: [
        { label: "Modern browser (Edge / Chrome / Firefox)" },
        { label: "Viva Insights person query CSV export (same file as Super Usage Adoption)" }
      ]
    },
  },
  {
    id: 'cowork-billing-report',
    tags: ["chargeback","billing","cost allocation","departments","cowork","credits","showback"],
    question: "I want to determine the chargeback and department-level cost allocation.",
    title: "Cowork Chargeback Report Power BI",
    icon: "🧾",
    accent: "#0078d4",
    category: "impact-roi",
    tier: "core",
    measures: ["impact","roi"],
    source: "Copilot credit consumption + Entra export",
    sourceKey: "M365 Admin",
    repo: "https://github.com/microsoft/CreditUsage",
    download: "https://github.com/microsoft/CreditUsage/archive/refs/heads/main.zip",
    demoVideo: "https://github.com/microsoft/CreditUsage#video-walkthrough",
    demoVideoLabel: "Watch the 2-minute walkthrough",
    preview: "https://raw.githubusercontent.com/microsoft/CreditUsage/main/images/dashboard-preview.gif",
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
    tags: ["chargeback","scenario modelling","what-if","credits","cowork","web app"],
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
    tags: ["policy","spend limits","exceptions","governance","guardrails","cowork"],
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
    id: 'finops-focus-app',
    tags: ["finops","focus","cost","cloud finance","unit economics","cowork"],
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
    demoVideo: "https://microsoft.github.io/Analytics-Hub/FinOps-Cowork/media/FinOps-Cowork-Demo.mp4",
    demoVideoLabel: "Watch the 2-minute overview",
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
    tags: ["roi","scenario modelling","business case","forecasting","cowork"],
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
    tags: ["customisation","extend","add-ons","custom pages","viva insights"],
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
    tags: ["personal","individual","self-service","benchmarking","my usage"],
    question: "I want a personal dashboard of my own Copilot, agent, and Cowork usage vs my org.",
    title: "Personal Copilot Dashboard",
    icon: "📊",
    accent: "#0078d4",
    category: "adoption-behavior",
    tier: "specialty",
    measures: ["adoption","productivity","agents"],
    source: "Copilot Dashboard export (Viva Insights)",
    sourceKey: "Viva Insights",
    repo: "https://github.com/microsoft/Personal-Dashboard",
    download: "https://github.com/microsoft/Personal-Dashboard/archive/refs/heads/main.zip",
    demoVideo: "https://github.com/microsoft/Personal-Dashboard#-watch-first",
    demoVideoLabel: "Watch the 3-minute walkthrough",
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
    tags: ["employee self-service","deflection","agents","support","hr","business value"],
    question: "How is my Employee Self-Service (ESS) Copilot Studio agent performing — adoption, deflection, and value?",
    title: "ESS Insights — Employee Self-Serve Business Value",
    icon: "🧑‍💼",
    accent: "#8661c5",
    category: "impact-roi",
    tier: "specialty",
    measures: ["agents","impact","roi"],
    source: "Copilot Studio transcripts (Dataverse)",
    sourceKey: "Dataverse",
    repo: "https://github.com/microsoft/ESS",
    download: "https://github.com/microsoft/ESS/archive/refs/heads/main.zip",
    preview: "https://raw.githubusercontent.com/microsoft/ESS/main/images/dashboard-preview.gif",
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
    tags: ["roi","business case","hours saved","value","defensible","executive","frontier firm"],
    question: "I need a defensible ROI narrative for Microsoft Copilot & agent adoption.",
    title: "ValueLens for Microsoft Copilot",
    icon: "💠",
    accent: "#00B294",
    category: "impact-roi",
    // ValueLens spans most of the catalogue: it covers adoption and maturity,
    // the value case, licence readiness, and agent governance. Only Developer
    // and Tooling sit outside it. `categories` is optional - every other entry
    // still uses the singular `category`.
    categories: ["impact-roi","usage-intelligence","adoption-behavior","readiness"],
    tier: "specialty",
    measures: ["impact","roi","adoption","license","agents"],
    source: "Purview audit logs",
    sourceKey: "Purview",
    repo: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot",
    download: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot/archive/refs/heads/main.zip",
    preview: "https://raw.githubusercontent.com/microsoft/ValueLens-for-Microsoft-Copilot/main/Images/ValueLens-Preview.gif",
    demoVideo: "https://github.com/microsoft/ValueLens-for-Microsoft-Copilot/raw/main/media/ValueLens-Demo.mp4",
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
    id: 'consumption-central',
    tags: ["credits","consumption","cost","spend","forecast","budget","finops","chargeback"],
    question: "What are we spending on Copilot credits across every product, and where is it going?",
    title: "Consumption Central for Microsoft Copilot",
    icon: "💳",
    accent: "#0078d4",
    category: "impact-roi",
    tier: "specialty",
    measures: ["roi","impact"],
    source: "Viva Insights consumption + PPAC + GitHub Copilot + Azure Cost Management",
    sourceKey: "M365 Admin",
    repo: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot",
    download: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot/archive/refs/heads/main.zip",
    demoVideo: "https://github.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot/raw/main/media/ConsumptionCentral-Demo.mp4",
    preview: "https://raw.githubusercontent.com/microsoft/ConsumptionCentral-for-Microsoft-Copilot/main/Images/ConsumptionCentral-Preview.gif",
    blurb: "One Power BI template for Copilot credit consumption and cost across four products — Cowork/Work IQ, Copilot Studio, GitHub Copilot, and Azure AI Foundry. Group spend by your own org attributes, forecast to the end of the billing period, and see overage against prepaid packs. Local CSV, Fabric, and Viva Direct deployment paths, each with a synthetic sample dataset. Reports spend; it does not enforce limits.",
    meta: { audience: "FinOps, IT admins, platform owners, finance partners", license: "Admin exports (per product)", time: "~10 min for a first look with sample data" },
    requirements: {
      roles: [
        { label: "Viva Insights Analyst (Cowork consumption)", url: "https://learn.microsoft.com/viva/insights/advanced/admin/add-users-ap" },
        { label: "Power Platform Administrator (Copilot Studio credits)", url: "https://learn.microsoft.com/power-platform/admin/manage-copilot-studio-messages-capacity" },
        { label: "Entra Reports Reader (org attributes)", url: "https://learn.microsoft.com/entra/identity/role-based-access-control/permissions-reference#reports-reader" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Fabric capacity (Fabric path only) — optional" }
      ]
    },
  },
  {
    id: 'agent-evaluator',
    tags: ["agents","copilot studio","quality","transcripts","csat","credits","evaluation"],
    question: "How well are my Copilot Studio agents performing — what do they resolve, what do people ask for, and what does it cost?",
    title: "Agent Evaluator for Copilot Studio",
    icon: "🔎",
    accent: "#e3008c",
    category: "usage-intelligence",
    tier: "specialty",
    isNew: true,
    measures: ["agents","impact"],
    source: "Copilot Studio transcripts (Dataverse) + Power Platform admin center",
    sourceKey: "Dataverse",
    repo: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio",
    download: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio/archive/refs/heads/main.zip",
    preview: "https://raw.githubusercontent.com/microsoft/AgentEvaluator-for-Copilot-Studio/main/assets/agent-evaluator-demo.gif",
    demoVideo: "https://github.com/microsoft/AgentEvaluator-for-Copilot-Studio/raw/main/media/AgentEvaluator-Demo.mp4",
    blurb: "One Power BI template for deep Copilot Studio agent evaluation — sessions, turns, errors, sub-agent calls, quality & performance, topics, knowledge grounding, CSAT and message-credit consumption. Reads the conversation transcripts themselves, so every number has a real conversation behind it. Local CSV, Dataverse and Fabric paths, chosen by one parameter; sample data included.",
    meta: { audience: "Agent makers, Studio admins, FinOps", license: "Dataverse read (+ Fabric for credit pages)", time: "~2 min on sample data, ~45 min on your own" },
    requirements: {
      roles: [
        { label: "Dataverse read (Copilot Studio transcripts)", url: "https://learn.microsoft.com/microsoft-copilot-studio/" },
        { label: "Power BI workspace Member" }
      ],
      software: [
        { label: "Power BI Desktop (May 2024+)", url: "https://www.microsoft.com/download/details.aspx?id=58494" },
        { label: "Nothing at all for the sample-data path; Dataverse environment or Fabric capacity for your own data" }
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

/* ============================================================
   Reports catalogue — card grid, filters, sort, flyout.

   TOOLS / CATEGORIES / MEASURES above are the single source of
   truth for this page; nothing below re-declares or shadows them.

   Two optional payloads are fetched at runtime from docs/data:
     repo-stars.json  GitHub star counts, from the daily sync job
     sort-data.json   star / weekly-traffic / created keys for Sort by
   Both are strictly additive. If either fetch fails the grid still
   renders in full: stars are simply absent and the order falls back
   to the curated order of TOOLS. A failed fetch can never blank the
   grid, because the grid is built and shown before either is read.
   ============================================================ */
(function () {
  'use strict';

  var STARS_URL = '../data/repo-stars.json';
  var SORT_URL = '../data/sort-data.json';

  /* ---------- text safety ---------- */
  var ENT = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
    '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&mdash;': '-', '&ndash;': '-'
  };
  function decodeEnt(v) {
    return String(v == null ? '' : v)
      .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp|mdash|ndash);/g, function (m) { return ENT[m]; });
  }
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(v) {
    return decodeEnt(v).replace(/[&<>"']/g, function (c) { return ESC[c]; });
  }
  function safeUrl(v) {
    var u = String(v == null ? '' : v).trim();
    return /^https?:\/\//i.test(u) ? u : '';
  }
  function escUrl(v) {
    var u = safeUrl(v);
    return u ? u.replace(/[&<>"']/g, function (c) { return ESC[c]; }) : '';
  }
  /* Accent values are injected into a style attribute, so they are allowlisted
     to a plain hex literal and nothing else. Anything odd renders uncoloured. */
  function safeColor(v) {
    var c = String(v == null ? '' : v).trim();
    return /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c) ? c : '';
  }

  /* ---------- lookups ---------- */
  var catById = {};
  CATEGORIES.forEach(function (c) { catById[c.id] = c; });
  var toolById = {};
  TOOLS.forEach(function (t) { toolById[t.id] = t; });

  function catLabel(id) { return catById[id] ? catById[id].label : id; }
  function measureLabel(k) { return (MEASURES[k] && MEASURES[k].label) ? MEASURES[k].label : k; }
  function catIds(t) {
    return (t.categories && t.categories.length) ? t.categories : [t.category];
  }
  function tagsOf(t) { return (t && Array.isArray(t.tags)) ? t.tags : []; }

  function mediaKind(preview) {
    var u = safeUrl(preview);
    if (!u) return 'none';
    return /\.gif(?:[?#].*)?$/i.test(u) ? 'animated' : 'still';
  }

  /* github.com/<o>/<r>/raw/<ref>/<path>.mp4 is served as
     application/octet-stream, so following it downloads the file instead of
     playing it. The blob view of the same path is a normal HTML page that
     renders the video in a player, so outbound links point there. The <video>
     element still uses the raw URL, which is what it needs. */
  function watchUrl(v) {
    var u = safeUrl(v);
    if (!u) return '';
    return u.replace(/^(https:\/\/github\.com\/[^\/]+\/[^\/]+)\/raw\/(.+)$/i, '$1/blob/$2');
  }
  function isEmbeddableVideo(v) {
    var u = safeUrl(v);
    return !!u && /\.(?:mp4|webm|ogv|ogg|m4v)(?:[?#].*)?$/i.test(u);
  }

  /* Related reports are derived, not authored: two points per shared focus
     area plus one for sharing the primary category, ties broken by title. */
  function relatedFor(t) {
    var mine = t.measures || [];
    return TOOLS
      .filter(function (o) { return o.id !== t.id; })
      .map(function (o) {
        var shared = (o.measures || []).filter(function (m) { return mine.indexOf(m) !== -1; });
        return {
          tool: o,
          shared: shared,
          score: shared.length * 2 + (o.category === t.category ? 1 : 0)
        };
      })
      .filter(function (r) { return r.score > 0; })
      .sort(function (a, b) {
        if (a.score !== b.score) return b.score - a.score;
        return String(a.tool.title).localeCompare(String(b.tool.title));
      })
      .slice(0, 3);
  }

  /* Rendered as buttons, not text: each one runs the search for its own term. */
  function tagChips(t) {
    var list = tagsOf(t);
    if (!list.length) return '';
    return '<ul class="mk-tags">' + list.map(function (tag) {
      return '<li><button type="button" class="mk-tag" data-tag="' + esc(tag) + '">' + esc(tag) + '</button></li>';
    }).join('') + '</ul>';
  }

  /* ---------- masthead counts ---------- */
  var sources = {};
  TOOLS.forEach(function (t) { if (t.sourceKey) sources[t.sourceKey] = 1; });
  function setCount(id, n) {
    var el = document.getElementById(id);
    if (el) el.textContent = String(n);
  }
  setCount('mkCountTools', TOOLS.length);
  setCount('mkCountCats', CATEGORIES.length);
  setCount('mkCountCore', TOOLS.filter(function (t) { return t.tier === 'core'; }).length);
  setCount('mkCountSrc', Object.keys(sources).length);

  /* ---------- the grid ----------
     The card is an <article>, not a <button>, for two reasons: votes.js
     mounts a real <button> into .rf-foot, and a button inside a button is
     invalid and would give every card two overlapping tab stops. The title
     button carries a stretched ::after overlay so the whole card still
     opens the flyout, while .rf-foot's own controls sit above it. This is
     also the exact card anatomy the home page uses, which is what lets
     votes.js derive the same vote id on both pages. */
  var gridHost = document.getElementById('mkSections');

  function cardHtml(t) {
    var ids = catIds(t);
    var others = ids.filter(function (id) { return id !== t.category; });
    var accent = safeColor(t.accent);
    var more = others.length
      ? '<span class="rf-more" title="' + esc(others.map(catLabel).join(', ')) + '">+' + others.length + '</span>'
      : '';
    var isNew = t.isNew === true ? '<span class="rf-new">New</span>' : '';
    var repo = escUrl(t.repo);

    return '' +
      '<article class="rf-card" data-id="' + esc(t.id) + '"' +
      (accent ? ' style="--c:' + esc(accent) + '"' : '') +
      ' data-cat="' + esc(ids.join(' ')) + '"' +
      ' data-primary="' + esc(t.category) + '"' +
      ' data-tier="' + esc(t.tier) + '"' +
      ' data-measures="' + esc((t.measures || []).join(' ')) + '">' +
        '<div class="rf-top">' +
          '<span class="rf-chip">' + esc(catLabel(t.category)) + '</span>' + more + isNew +
        '</div>' +
        '<h3 class="rf-title">' +
          '<button type="button" class="rf-open" data-id="' + esc(t.id) + '"' +
          ' aria-label="Open details for ' + esc(t.title) + '">' + esc(t.title) + '</button>' +
        '</h3>' +
        '<p class="rf-blurb">' + esc(t.blurb) + '</p>' +
        '<div class="rf-foot">' +
          '<span class="rf-src">' + esc(t.source) + '</span>' +
          '<span class="rf-stars-slot" data-id="' + esc(t.id) + '"></span>' +
          (repo
            ? '<a class="rf-cta" href="' + repo + '" target="_blank" rel="noopener noreferrer">View <span aria-hidden="true">&#8599;</span></a>'
            : '') +
        '</div>' +
      '</article>';
  }

  /* Emission order follows CATEGORIES order, then TOOLS order inside each
     category — the curated order, and the fallback every sort tie breaks to. */
  var ordered = [];
  CATEGORIES.forEach(function (cat) {
    TOOLS.forEach(function (t) { if (t.category === cat.id) ordered.push(t); });
  });
  TOOLS.forEach(function (t) { if (ordered.indexOf(t) === -1) ordered.push(t); });

  gridHost.innerHTML = '<div class="mk-sec"><div class="wrap">' +
    '<div class="rf-grid">' + ordered.map(cardHtml).join('') + '</div>' +
    '</div></div>';

  var gridEl = gridHost.querySelector('.rf-grid');
  var cardEls = Array.prototype.slice.call(gridHost.querySelectorAll('.rf-card'));

  /* Curated order is the tie-breaker and the fallback, so a sort never
     scrambles reports that share a value. */
  var BASE = {};
  ordered.forEach(function (t, i) { BASE[t.id] = i; });

  /* ---------- category pills ---------- */
  var catPills = document.getElementById('mkCatPills');
  function rfPill(label, value, on, n) {
    return '<button type="button" class="rf-pill' + (on ? ' is-on' : '') + '" data-cat="' +
      esc(value) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
      esc(label) + ' <span class="rf-n">' + n + '</span></button>';
  }
  catPills.innerHTML =
    rfPill('All', 'all', true, TOOLS.length) +
    CATEGORIES.map(function (c) {
      var n = TOOLS.filter(function (t) { return t.category === c.id; }).length;
      return rfPill(c.label, c.id, false, n);
    }).join('');

  /* ---------- search index ----------
     Title, question, blurb, source, id, focus areas and tags all count, so
     "chargeback" finds the billing report even though the word is not in
     its title, and an id-shaped deep link such as ?q=what-i-did resolves. */
  var HAY = {};
  TOOLS.forEach(function (t) {
    HAY[t.id] = [
      t.title, t.question, t.blurb, t.source, t.sourceKey, t.id,
      (t.measures || []).map(measureLabel).join(' '),
      (t.measures || []).join(' '),
      tagsOf(t).join(' ')
    ].join(' ').toLowerCase();
  });
  /* Every term must appear somewhere, so extra words narrow rather than widen. */
  function textMatch(id) {
    if (!state.q) return true;
    var hay = HAY[id] || '';
    return state.q.split(/\s+/).every(function (term) { return hay.indexOf(term) !== -1; });
  }

  /* ---------- filter state ---------- */
  var state = { cat: 'all', coreOnly: false, q: '' };

  var searchEl = document.getElementById('mkSearch');
  var clearEl = document.getElementById('mkSearchClear');
  var coreEl = document.getElementById('mkCoreOnly');
  var sortEl = document.getElementById('mkSort');
  var resultEl = document.getElementById('mkResult');
  var emptyEl = document.getElementById('mkEmpty');

  function matches(el) {
    if (state.cat !== 'all' && el.getAttribute('data-primary') !== state.cat) return false;
    if (state.coreOnly && el.getAttribute('data-tier') !== 'core') return false;
    if (!textMatch(el.getAttribute('data-id'))) return false;
    return true;
  }

  function applyFilters() {
    var total = 0;
    cardEls.forEach(function (el) {
      var ok = matches(el);
      el.hidden = !ok;
      if (ok) total++;
    });
    emptyEl.hidden = total !== 0;

    var filtered = state.cat !== 'all' || state.coreOnly || !!state.q;
    resultEl.innerHTML = 'Showing ' + total + ' of ' + TOOLS.length + ' reports.' +
      (filtered ? ' <button type="button" id="mkReset">Clear filters</button>' : '');
    var reset = document.getElementById('mkReset');
    if (reset) {
      reset.addEventListener('click', function () {
        state.cat = 'all';
        state.coreOnly = false;
        state.q = '';
        syncCatPills('all');
        coreEl.setAttribute('aria-pressed', 'false');
        searchEl.value = '';
        clearEl.hidden = true;
        applyFilters();
      });
    }
  }

  function syncCatPills(value) {
    Array.prototype.forEach.call(catPills.querySelectorAll('.rf-pill'), function (b) {
      var on = b.getAttribute('data-cat') === value;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function runSearch(q) {
    searchEl.value = q;
    state.q = String(q || '').trim().toLowerCase();
    clearEl.hidden = !q;
    applyFilters();
  }

  catPills.addEventListener('click', function (e) {
    var b = e.target.closest('.rf-pill');
    if (!b) return;
    state.cat = b.getAttribute('data-cat');
    syncCatPills(state.cat);
    applyFilters();
  });
  /* Filtering on input keeps the result count honest as you type. 22 cards is
     small enough that this needs no debounce. */
  searchEl.addEventListener('input', function () {
    state.q = this.value.trim().toLowerCase();
    clearEl.hidden = !this.value;
    applyFilters();
  });
  searchEl.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && this.value) { e.stopPropagation(); runSearch(''); }
  });
  clearEl.addEventListener('click', function () { runSearch(''); searchEl.focus(); });
  coreEl.addEventListener('click', function () {
    state.coreOnly = !state.coreOnly;
    this.setAttribute('aria-pressed', state.coreOnly ? 'true' : 'false');
    applyFilters();
  });

  /* ---------- sort ----------
     SORT stays empty until sort-data.json lands. With an empty map every
     sortVal() is null, every comparison falls through to BASE, and the
     curated order is what you see — which is exactly the degraded state
     a failed fetch should produce. */
  var SORT = {};

  function sortVal(id, mode) {
    var r = SORT[id];
    if (!r) return null;
    if (mode === 'popular') return (typeof r.stars === 'number') ? r.stars : null;
    if (mode === 'week') return (typeof r.viewsWeek === 'number') ? r.viewsWeek : null;
    if (mode === 'latest' || mode === 'oldest') {
      var ms = r.created ? Date.parse(r.created) : NaN;
      return isNaN(ms) ? null : ms;
    }
    return null;
  }

  function applySort() {
    var mode = sortEl.value;
    var asc = mode === 'oldest';
    var list = cardEls.slice().sort(function (a, b) {
      var ia = a.getAttribute('data-id'), ib = b.getAttribute('data-id');
      var va = sortVal(ia, mode), vb = sortVal(ib, mode);
      /* Missing data always sinks, in both directions. */
      if (va === null && vb === null) return BASE[ia] - BASE[ib];
      if (va === null) return 1;
      if (vb === null) return -1;
      if (va !== vb) return asc ? va - vb : vb - va;
      return BASE[ia] - BASE[ib];
    });
    var frag = document.createDocumentFragment();
    list.forEach(function (el) { frag.appendChild(el); });
    gridEl.appendChild(frag);
  }

  sortEl.addEventListener('change', function () { applySort(); applyFilters(); });

  /* ---------- GitHub stars ----------
     Anything that is not a number renders NOTHING — no zero, no dash, no
     empty pill — so the absence is silent. Five of the 22 reports are Pages
     apps with no repository and carry stars:null. A record marked stale
     still shows its last known number, because blanking it would throw away
     the only figure there is, but it is labelled with the date it was read
     so it is never passed off as current. */
  var STAR_SVG =
    '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M8 1.6l1.98 4.01 4.42.64-3.2 3.12.76 4.41L8 11.7l-3.96 2.08.76-4.41' +
    '-3.2-3.12 4.42-.64L8 1.6Z"/></svg>';

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function applyStars(meta) {
    var reports = (meta && meta.reports) || {};
    Array.prototype.forEach.call(gridHost.querySelectorAll('.rf-stars-slot'), function (slot) {
      var r = reports[slot.getAttribute('data-id')];
      if (!r || typeof r.stars !== 'number') { slot.remove(); return; }
      var n = r.stars;
      var base = (r.repo ? r.repo + ' \u2014 ' : '') + n + (n === 1 ? ' GitHub star' : ' GitHub stars');
      var stale = r.stale === true;
      var when = fmtDate(r.fetchedAt || meta.fetchedAt);
      slot.outerHTML = '<span class="rf-stars' + (stale ? ' is-stale' : '') + '" title="' +
        esc(stale ? base + ' \u2014 last synced ' + (when || 'an earlier date') +
          '; this count may be out of date' : base) + '">' +
        STAR_SVG + '<span class="rf-stars-n">' + n + '</span></span>';
      /* >=10 stars promotes the card to a brighter outline. Colour only —
         the border stays 1px, so nothing reflows. */
      var card = document.querySelector('.rf-card[data-id="' + slot.getAttribute('data-id') + '"]');
      if (card && n >= 10) card.classList.add('rf-card--hot');
    });

    var note = document.getElementById('mkStarSync');
    var when = fmtDate(meta && meta.fetchedAt);
    if (note && when) {
      note.textContent = 'GitHub star counts synced ' + when + '.';
      note.hidden = false;
    }
  }

  function loadJson(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' -> HTTP ' + r.status);
      return r.json();
    });
  }

  /* Each payload is loaded independently and each failure is swallowed
     locally, so one missing file cannot take the other down with it and
     neither can take the grid down. */
  if (typeof fetch === 'function') {
    loadJson(STARS_URL)
      .then(function (meta) { applyStars(meta); })
      .catch(function () {
        Array.prototype.forEach.call(gridHost.querySelectorAll('.rf-stars-slot'), function (s) { s.remove(); });
      });
    loadJson(SORT_URL)
      .then(function (payload) {
        SORT = (payload && payload.reports) || {};
        applySort();
        applyFilters();
      })
      .catch(function () { /* curated order stands */ });
  } else {
    Array.prototype.forEach.call(gridHost.querySelectorAll('.rf-stars-slot'), function (s) { s.remove(); });
  }

  /* ---------- flyout ---------- */
  var dlg = document.getElementById('mkDlg');
  var dlgChip = document.getElementById('mkDlgChip');
  var dlgTitle = document.getElementById('mkDlgTitle');
  var dlgQ = document.getElementById('mkDlgQ');
  var dlgBody = document.getElementById('mkDlgBody');
  var dlgFoot = document.getElementById('mkDlgFoot');
  var dlgDl = document.getElementById('mkDlgDl');
  var opener = null;

  function placeholderHtml(title) {
    return '<div class="mk-noprev">' +
      '<p class="mk-noprev-title">' + esc(title) + '</p>' +
      '<p class="mk-noprev-note">No preview available</p></div>';
  }

  /* Four branches, and only ONE media element is in the DOM at a time:
       video + image -> two quiet tabs, Video selected by default
       video only    -> the <video>; never the typographic placeholder
       image only    -> the <img>
       neither       -> the typographic placeholder
     A page-anchor demoVideo (github.com/...#section) is a page, not a media
     file, so it never reaches the <video> branch — it is linked out of the
     footer instead. */
  function imageCap(t) {
    var kind = mediaKind(t.preview);
    return kind === 'animated' ? 'Animated preview' : kind === 'still' ? 'Screenshot' : 'Preview';
  }
  function imageAlt(t) {
    return (mediaKind(t.preview) === 'animated' ? 'Animated preview of ' : 'Screenshot of ') +
      decodeEnt(t.title);
  }
  function imageSlot(t) {
    var u = escUrl(t.preview);
    return u
      ? '<img class="mk-shot" id="mkShot" src="' + u + '" alt="' + esc(imageAlt(t)) + '" loading="lazy">'
      : placeholderHtml(t.title);
  }
  /* preload="metadata" only: these files are 1-5 MB and live on
     raw.githubusercontent / github.io. Opening a flyout must not pull them.
     No autoplay, no loop, no muted-autoplay trick. */
  function videoSlot(t) {
    var u = escUrl(t.demoVideo);
    return '<video class="mk-video" id="mkVid" src="' + u + '" controls preload="metadata" playsinline>' +
      '<span class="mk-vfallback">This browser cannot play the demo video. ' +
      '<a href="' + u + '" target="_blank" rel="noopener noreferrer">Open the file directly</a>.</span>' +
      '</video>';
  }
  function mediaSlot(t, mode) { return mode === 'video' ? videoSlot(t) : imageSlot(t); }
  function mediaCap(t, mode) { return mode === 'video' ? 'Demo video' : imageCap(t); }
  function mediaFigure(t) {
    var hasVid = isEmbeddableVideo(t.demoVideo);
    var hasImg = !!safeUrl(t.preview);
    var mode = hasVid ? 'video' : 'image';
    var tabs = (hasVid && hasImg)
      ? '<span class="mk-seg" id="mkMediaTabs" role="group" aria-label="Choose media">' +
          '<button type="button" data-media="video" aria-pressed="true">Video</button>' +
          '<button type="button" data-media="image" aria-pressed="false">Preview</button>' +
        '</span>'
      : '';
    return '<figure class="mk-fig">' +
        '<figcaption class="mk-mediahead">' +
          '<span class="mk-figcap" id="mkFigCap">' + esc(mediaCap(t, mode)) + '</span>' + tabs +
        '</figcaption>' +
        '<div id="mkMediaSlot">' + mediaSlot(t, mode) + '</div>' +
      '</figure>';
  }

  function dlRow(label, valueHtml) {
    if (!valueHtml) return '';
    return '<dt>' + esc(label) + '</dt><dd>' + valueHtml + '</dd>';
  }

  function linkList(items) {
    if (!items || !items.length) return '';
    return items.map(function (it) {
      var u = escUrl(it.url);
      return u
        ? '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + esc(it.label) + '</a>'
        : esc(it.label);
    }).join('<span class="mk-sep">|</span>');
  }

  function render(t) {
    var accent = safeColor(t.accent);
    if (accent) dlg.style.setProperty('--c', accent);
    else dlg.style.removeProperty('--c');

    dlgChip.textContent = catIds(t).map(catLabel).join(' / ') +
      (t.tier === 'core' ? '  |  Core' : '');
    dlgTitle.textContent = decodeEnt(t.title);
    dlgQ.textContent = decodeEnt(t.question);

    var req = t.requirements || {};
    var meta = t.meta || {};

    var related = relatedFor(t).map(function (r) {
      var shared = r.shared.map(measureLabel).join(', ');
      return '<li><button type="button" data-rel="' + esc(r.tool.id) + '">' + esc(r.tool.title) + '</button>' +
        (shared ? '<span class="mk-why">Shares focus area: ' + esc(shared) + '</span>' : '') +
        '</li>';
    }).join('');

    dlgBody.innerHTML = '' +
      mediaFigure(t) +
      '<section class="mk-sub"><h3>Overview</h3><p>' + esc(t.blurb) + '</p></section>' +
      '<section class="mk-sub"><h3>At a glance</h3><dl class="mk-dl">' +
        dlRow('Data source', esc(t.source)) +
        dlRow('Built for', esc(meta.audience)) +
        dlRow('Licensing', esc(meta.license)) +
        dlRow('Time to first result', esc(meta.time)) +
        dlRow('Tags', tagChips(t)) +
      '</dl></section>' +
      '<section class="mk-sub"><h3>What you need</h3><dl class="mk-dl">' +
        dlRow('Roles required', linkList(req.roles)) +
        dlRow('Software', linkList(req.software)) +
      '</dl></section>' +
      (related
        ? '<section class="mk-sub"><h3>Related reports</h3><ul class="mk-rel">' + related + '</ul></section>'
        : '');

    var slotEl = document.getElementById('mkMediaSlot');
    var tabsEl = document.getElementById('mkMediaTabs');
    var capEl = document.getElementById('mkFigCap');

    /* Media that will not load is replaced by whatever IS actually
       available, never left as a blank box. */
    function wireSlot() {
      var img = document.getElementById('mkShot');
      if (img) {
        img.addEventListener('error', function () {
          if (capEl) capEl.textContent = 'Preview';
          slotEl.innerHTML = placeholderHtml(t.title);
        });
      }
      var vidEl = document.getElementById('mkVid');
      if (vidEl) {
        vidEl.addEventListener('error', function () {
          if (tabsEl) {
            var vb = tabsEl.querySelector('button[data-media="video"]');
            if (vb) {
              vb.disabled = true;
              vb.setAttribute('aria-pressed', 'false');
              vb.title = 'The demo video failed to load';
            }
            var ib = tabsEl.querySelector('button[data-media="image"]');
            if (ib) ib.setAttribute('aria-pressed', 'true');
          }
          if (capEl) capEl.textContent = imageCap(t);
          slotEl.innerHTML = imageSlot(t);
          wireSlot();
        });
      }
    }
    wireSlot();

    if (tabsEl) {
      tabsEl.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-media]');
        if (!b || b.disabled) return;
        var mode = b.getAttribute('data-media');
        Array.prototype.forEach.call(tabsEl.querySelectorAll('button[data-media]'), function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        if (capEl) capEl.textContent = mediaCap(t, mode);
        slotEl.innerHTML = mediaSlot(t, mode);
        wireSlot();
      });
    }

    var repo = escUrl(t.repo);
    dlgDl.innerHTML = repo
      ? '<a class="mk-ghbtn" href="' + repo + '" target="_blank" rel="noopener noreferrer">View on GitHub</a>'
      : '';

    var actions = [];
    var dl = escUrl(t.download);
    if (dl) actions.push('<a class="mk-btn mk-dlg-dl" href="' + dl + '" target="_blank" rel="noopener noreferrer">Download template</a>');
    /* A direct media file that is not on github.com has no blob view to link
       to, and linking the file itself downloads it. Those videos already play
       in the pane above, so no footer link is offered for them. */
    var vidRaw = safeUrl(t.demoVideo);
    var vidBare = /^https:\/\/github\.com\//i.test(vidRaw || '') ? false : isEmbeddableVideo(t.demoVideo);
    var vidUrl = vidBare ? '' : escUrl(watchUrl(t.demoVideo));
    if (vidUrl) {
      var vidLabel = t.demoVideoLabel ||
        (isEmbeddableVideo(t.demoVideo) ? 'Open the demo video' : 'Watch the demo');
      actions.push('<a class="mk-link" href="' + vidUrl + '" target="_blank" rel="noopener noreferrer">' +
        esc(vidLabel) + '</a>');
    }
    var guide = escUrl(t.guide);
    if (guide) actions.push('<a class="mk-link" href="' + guide + '" target="_blank" rel="noopener noreferrer">Setup guide</a>');
    if (t.emailFile) {
      actions.push('<span class="mk-footnote">Includes an admin request template: ' + esc(t.emailFile) + '</span>');
    }
    dlgFoot.innerHTML = actions.join('');

    dlgBody.scrollTop = 0;
  }

  function focusables() {
    return Array.prototype.slice.call(dlg.querySelectorAll(
      'a[href], button:not([disabled]), video[controls], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }

  function openReport(id, keepOpener) {
    var t = toolById[id];
    if (!t) return;
    if (!keepOpener) opener = document.activeElement;
    render(t);
    if (!dlg.open) {
      dlg.showModal();
      document.body.classList.add('mk-locked');
    }
    /* render() also zeroes this, but a <dialog> that has not been shown yet is
       display:none, so assigning scrollTop there is a no-op and the body keeps
       the scroll offset from the previously-opened report. Repeat it once the
       dialog is actually laid out, or the media at the top is scrolled past. */
    dlgBody.scrollTop = 0;
    dlgTitle.setAttribute('tabindex', '-1');
    dlgTitle.focus();
  }

  function closeReport() {
    if (dlg.open) dlg.close();
  }

  gridHost.addEventListener('click', function (e) {
    var open = e.target.closest('.rf-open');
    if (open) { openReport(open.getAttribute('data-id'), false); return; }
    /* Clicks that land on the card but not on one of its own controls still
       open the flyout, which is what the stretched overlay is for; this is
       the fallback for pointer targets the overlay does not cover. */
    if (e.target.closest('a, button')) return;
    var card = e.target.closest('.rf-card');
    if (card) {
      var btn = card.querySelector('.rf-open');
      if (btn) btn.focus();
      openReport(card.getAttribute('data-id'), false);
    }
  });

  dlgBody.addEventListener('click', function (e) {
    var rel = e.target.closest('[data-rel]');
    if (rel) openReport(rel.getAttribute('data-rel'), true);
  });

  /* Tag chips run a search, so the vocabulary is discoverable rather than
     something you have to guess at. */
  document.addEventListener('click', function (e) {
    var tag = e.target.closest('.mk-tag');
    if (!tag) return;
    if (dlg && dlg.open) dlg.close();
    runSearch(tag.getAttribute('data-tag'));
    searchEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  document.getElementById('mkDlgClose').addEventListener('click', closeReport);

  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) closeReport();
  });

  dlg.addEventListener('cancel', function (e) {
    e.preventDefault();
    closeReport();
  });

  dlg.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dlgTitle)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  dlg.addEventListener('close', function () {
    document.body.classList.remove('mk-locked');
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  });

  /* ---------- the sticky category row ----------
     A zero-height sentinel drives an IntersectionObserver that toggles
     .is-stuck. There is no scroll listener and nothing animates. The offset
     is the height of the sticky site header, read from the same custom
     property the CSS uses so the two cannot drift apart. */
  (function stickyFilter() {
    var cat = document.querySelector('.mk-fp-cat');
    var sentinel = document.querySelector('.mk-fp-sentinel');
    if (!cat || !sentinel || typeof IntersectionObserver !== 'function') return;
    var top = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--mk-stickytop')
    ) || 64;
    var io = new IntersectionObserver(function (entries) {
      cat.classList.toggle('is-stuck', !entries[0].isIntersecting);
    }, { rootMargin: '-' + (top + 1) + 'px 0px 0px 0px', threshold: 0 });
    io.observe(sentinel);
  }());

  /* ---------- deep links ----------
     ?q=, ?category= and ?tier=core are honoured as before. ?measure= no
     longer has a control of its own, so it keeps the older fallback: it
     selects the category of the first report carrying that focus area. */
  (function deepLink() {
    var params = new URLSearchParams(window.location.search);
    var category = params.get('category');
    var measure = params.get('measure');
    var tier = params.get('tier');
    var q = params.get('q');

    if (category && catById[category]) state.cat = category;
    if (measure && state.cat === 'all') {
      var first = measure.split(',').map(function (m) { return m.trim(); }).filter(Boolean)[0];
      var match = TOOLS.find(function (t) {
        return Array.isArray(t.measures) && t.measures.indexOf(first) !== -1;
      });
      if (match) state.cat = match.category;
    }
    if (tier === 'core') {
      state.coreOnly = true;
      coreEl.setAttribute('aria-pressed', 'true');
    }
    if (q) {
      searchEl.value = q;
      state.q = q.trim().toLowerCase();
      clearEl.hidden = false;
    }
    syncCatPills(state.cat);
  }());

  applySort();
  applyFilters();
}());
