/* ============================================================
   PleaseHelpMe · guided concierge logic
   - Calm copy, hand-holding flow
   - 3 stages: pick category → refine → recommendation
   - All data inline so it's easy to edit
   ============================================================ */

/* ----------------------------------------------------------------
   REPORT KNOWLEDGE BASE
   One entry per report. Each has:
     - title, icon, blurb
     - outcome:  what the user will *walk away with*
     - roles:    [strings] — plain-English roles to ask for
     - steps:    [strings] — stand-it-up walkthrough
     - repo:     GitHub URL
     - download: zip URL
     - demo:     internal demo path or null
     - email:    { to, subject, body }
   ---------------------------------------------------------------- */
const REPORTS = {
  'ai-in-one': {
    title: 'AI-in-One Dashboard',
    icon: '🤖',
    blurb: "One unified Power BI report covering Microsoft 365 Copilot, Copilot Chat (licensed + unlicensed), Agents, and third-party AI signals.",
    outcome: "A single exec-ready Power BI dashboard that shows — by user, department, and app — who is using Microsoft 365 Copilot, Chat, and Agents in your tenant. This is the one report to open in a leadership review if you can only stand up one thing.",
    roles: ['Audit Reader (Purview)', 'Entra Directory.Read.All', 'Power BI Pro (you, to publish)'],
    steps: [
      "Download the <code>.pbit</code> from the AI-in-One repo (link below).",
      "Send your IT admin the email below — they need to grant <strong>Audit Reader</strong> in Purview and <strong>Directory.Read.All</strong> in Entra so PAX can pull the data.",
      "Once you have access, follow the repo README to run PAX (PowerShell Audit eXporter) against your tenant. PAX outputs the CSVs the template consumes.",
      "Open the <code>.pbit</code> in Power BI Desktop, point it at the PAX output folder, and let it refresh — first build is ~1–2 hours.",
      "Publish to a Power BI workspace and share with your leadership team."
    ],
    repo: 'https://github.com/microsoft/AI-in-One-Dashboard',
    download: 'https://github.com/microsoft/AI-in-One-Dashboard/archive/refs/heads/main.zip',
    demo: '../demos/?report=ai-in-one',
    email: {
      to: 'youradmin@yourcompany.com',
      subject: 'Need access for the Microsoft AI-in-One Copilot dashboard',
      body: `Hi [admin],

I'd like to stand up the Microsoft open-source "AI-in-One" Power BI dashboard so we can see Copilot, Chat, and Agent activity across the tenant in one place. It's published by Microsoft, runs entirely inside our tenant, and no data leaves us.

To stage the data I need two things granted to me (or to a service principal I'll create):

  1. Audit Reader role in Microsoft Purview
  2. Directory.Read.All on Microsoft Entra (read-only)

These are read-only permissions on logs and directory metadata — no mailbox access, no message content. They're documented in the project README here:
https://github.com/microsoft/AI-in-One-Dashboard

Happy to walk through this together. Thanks!`
    }
  },

  'super-usage': {
    title: 'Super Usage Adoption',
    icon: '⚡',
    blurb: "Power BI template on Viva Insights person-query data. Profiles your super users — what they use, how habits form, where they cluster.",
    outcome: "A heatmap and persona profile of your highest-impact Copilot users — who they are, what they're doing differently, and which collaboration patterns they share. This is the report you want when leadership asks 'who's actually getting value, and what are they doing?'",
    roles: ['Viva Insights Analyst', 'Power BI Pro (you, to publish)'],
    steps: [
      "Download the <code>.pbit</code> from the DecodingSuperUsage repo.",
      "Send your Viva Insights Analyst the email below — they'll need to run a person-query in Viva Insights and share the export with you.",
      "Open the <code>.pbit</code> in Power BI Desktop and point it at the Viva Insights CSV.",
      "Refresh the model (~30 min once the query is staged) and explore the Super User heatmap.",
      "Pair this with the ROI Calculator (export the heatmap visual as CSV) if you need a $ value to tell the story."
    ],
    repo: 'https://github.com/microsoft/DecodingSuperUsage',
    download: 'https://github.com/microsoft/DecodingSuperUsage/archive/refs/heads/main.zip',
    demo: '../demos/?report=super-user-adoption',
    email: {
      to: 'vivaanalyst@yourcompany.com',
      subject: 'Viva Insights person-query for Microsoft Super Usage Power BI template',
      body: `Hi [Viva Insights Analyst],

I'm setting up the Microsoft open-source "Super Usage Adoption" Power BI template — it profiles our Copilot super users by collaboration pattern, focus time, and meeting load. It's published by Microsoft and runs entirely inside our tenant.

It needs a Viva Insights person-query export. The repo (with the exact query definition and column list) is here:
https://github.com/microsoft/DecodingSuperUsage

Could you run the query as described in the README and share the CSV with me? Happy to jump on a call to walk through it. Thanks!`
    }
  },

  'super-user-impact': {
    title: 'Super User Impact',
    icon: '🏆',
    blurb: "Companion to Super Usage Adoption. Quantifies the work-pattern delta super users produce vs comparable peers.",
    outcome: "A side-by-side comparison showing how the work patterns of your top Copilot users differ from comparable peers — collaboration hours, focus time, meeting load. Use this when you've already shown adoption and need to prove that adoption is changing how people work.",
    roles: ['Viva Insights Analyst', 'Power BI Pro (you, to publish)'],
    steps: [
      "Download the <code>.pbit</code> from the superuserimpact repo.",
      "If you've already stood up Super Usage Adoption, you can re-use that same Viva Insights query — no new data ask needed.",
      "If not, send your Viva Insights Analyst the email below.",
      "Open the <code>.pbit</code> in Power BI Desktop, point it at the Viva CSV.",
      "Refresh and use the comparison views in your next leadership review."
    ],
    repo: 'https://github.com/microsoft/superuserimpact',
    download: 'https://github.com/microsoft/superuserimpact/archive/refs/heads/main.zip',
    demo: '../demos/?report=super-user-impact',
    email: {
      to: 'vivaanalyst@yourcompany.com',
      subject: 'Viva Insights person-query for Microsoft Super User Impact Power BI template',
      body: `Hi [Viva Insights Analyst],

I'd like to stand up the Microsoft open-source "Super User Impact" Power BI template — it quantifies how the work patterns of our top Copilot users differ from comparable peers (focus time, meeting load, collaboration hours). It re-uses the same Viva Insights person-query as the "Super Usage Adoption" template, so if we already ran that, no new data is needed.

Repo + query definition:
https://github.com/microsoft/superuserimpact

Can you confirm whether the Super Usage query has already been run, or share the CSV if it has? Thanks!`
    }
  },

  'chat-agent': {
    title: 'Chat & Agent Intelligence',
    icon: '💬',
    blurb: "Two Power BI templates on Purview audit logs + Entra: one for Copilot Chat, one for Agents.",
    outcome: "Two Power BI reports — one for Copilot Chat (licensed and unlicensed users) and one for Agents — that show <em>what</em> people are actually doing: which apps, which features, by user and department. Use this when the question is 'beyond opening Copilot, what are they doing with it?'",
    roles: ['Audit Reader (Purview)', 'Entra Directory.Read.All', 'Power BI Pro (you, to publish)'],
    steps: [
      "Download the <code>.pbit</code> templates from the CopilotChatAnalytics repo.",
      "Send your IT admin the email below — same permissions as AI-in-One (Audit Reader + Directory.Read.All).",
      "Run PAX (PowerShell Audit eXporter) per the repo README to pull the audit data.",
      "Open each <code>.pbit</code> in Power BI Desktop and refresh.",
      "Publish and pair with the Adoption & Sentiment report if you want to overlay 'how people feel' on top of 'what people do'."
    ],
    repo: 'https://github.com/microsoft/CopilotChatAnalytics',
    download: 'https://github.com/microsoft/CopilotChatAnalytics/archive/refs/heads/main.zip',
    demo: '../demos/?report=chat-intelligence',
    email: {
      to: 'youradmin@yourcompany.com',
      subject: 'Need access for the Microsoft Chat & Agent Intelligence Power BI templates',
      body: `Hi [admin],

I'd like to stand up two Microsoft open-source Power BI templates — Copilot Chat Intelligence and Agent Intelligence. They show how our org is using Copilot Chat (licensed + unlicensed) and Agents, by user, app, and department. No third-party analytics, no data leaves our tenant.

To stage the data I need (or a service principal I'll create) granted:

  1. Audit Reader role in Microsoft Purview
  2. Directory.Read.All on Microsoft Entra (read-only)

These are read-only on logs and directory metadata. Setup is documented here:
https://github.com/microsoft/CopilotChatAnalytics

Thanks!`
    }
  },

  'adoption-sentiment': {
    title: 'Adoption & Sentiment Report',
    icon: '💛',
    blurb: "Four-page Power BI template by olivierpecheux/Microsoft: Adoption, Sentiment, Comments, and Saved Time analysis.",
    outcome: "A 4-page Power BI report that pairs <em>how people feel</em> about Copilot (via a 12-question Microsoft Forms survey it ships with) against <em>what they actually use</em> (M365 Admin Center Copilot Activity report). Use this to answer 'are users happy, and does that match their usage tier?'",
    roles: ['Microsoft Forms author (you)', 'Power Platform admin (to export Forms results)', 'M365 Reports Reader'],
    steps: [
      "Download the <code>.pbit</code> from the adoption-sentiment repo.",
      "Import the 12-question recommended survey into Microsoft Forms (template included in the repo).",
      "Send the survey to your Copilot-licensed user population.",
      "Export the M365 Admin Center 'Copilot Activity' report — send the request email below to your M365 admin.",
      "Open the <code>.pbit</code>, point it at both CSVs (survey + activity). The UPN column joins them.",
      "Refresh — you'll get adoption + sentiment overlay by tier (Bottom 25% → Top 10%)."
    ],
    repo: 'https://github.com/olivierpecheux/copilot-adoption-sentiment-report',
    download: 'https://github.com/olivierpecheux/copilot-adoption-sentiment-report/archive/refs/heads/main.zip',
    demo: '../demos/?report=copilot-adoption-sentiment',
    email: {
      to: 'youradmin@yourcompany.com',
      subject: 'Need M365 Copilot Activity export for the Adoption & Sentiment report',
      body: `Hi [admin],

I'm standing up the Microsoft open-source "Copilot Adoption & Sentiment" Power BI template. It pairs a Microsoft Forms survey with the M365 Admin Center Copilot Activity report so we can see how user sentiment maps to actual usage tiers.

I need the most recent export of the Copilot Activity report from the Microsoft 365 admin center (Reports → Usage → Microsoft 365 Copilot). The CSV with UPN column is what the template joins on.

Repo for context:
https://github.com/olivierpecheux/copilot-adoption-sentiment-report

Can you send me the most recent monthly export? Thanks!`
    }
  },

  'm365-readiness': {
    title: 'M365 Copilot Readiness',
    icon: '🎯',
    blurb: "Ranks every user by Microsoft 365 fluency so you can stage enablement waves.",
    outcome: "A ranked list of every user in your org by Microsoft 365 fluency (Outlook, Word, Excel, PowerPoint, Teams) so you can stage Copilot enablement waves and identify natural champion candidates per org — defended with audit data, not gut feel.",
    roles: ['Audit Reader (Purview)', 'Entra Directory.Read.All', 'Power BI Pro (you, to publish)'],
    steps: [
      "Download the <code>.pbit</code> from the M365UsageAnalytics repo.",
      "Send your IT admin the access email below.",
      "Run PAX to pull the audit data per the repo README.",
      "Open the <code>.pbit</code>, point it at the PAX output, refresh.",
      "Use the readiness scoring to plan your next enablement wave and pick champion candidates."
    ],
    repo: 'https://github.com/microsoft/M365UsageAnalytics',
    download: 'https://github.com/microsoft/M365UsageAnalytics/archive/refs/heads/main.zip',
    demo: null,
    email: {
      to: 'youradmin@yourcompany.com',
      subject: 'Need access for the Microsoft M365 Copilot Readiness Power BI template',
      body: `Hi [admin],

I'd like to stand up the Microsoft open-source "M365 Copilot Readiness" Power BI template — it ranks users by Microsoft 365 fluency (Outlook, Word, Excel, PowerPoint, Teams) so we can stage Copilot enablement waves and identify champion candidates per org. It runs entirely inside our tenant.

I need (or a service principal I'll create) granted:

  1. Audit Reader role in Microsoft Purview
  2. Directory.Read.All on Microsoft Entra (read-only)

Read-only on logs + directory metadata. Setup is here:
https://github.com/microsoft/M365UsageAnalytics

Thanks!`
    }
  },

  'ghcp-impact': {
    title: 'GitHub Copilot Impact',
    icon: '⚙️',
    blurb: "Per-team and per-user GitHub Copilot usage — chat vs agent, language, model, acceptance rates.",
    outcome: "A Power BI report that shows GitHub Copilot adoption and impact per team and per user — chat vs agent, language, model, acceptance rates — straight from the GitHub Enterprise Copilot metrics API. Use this if your developer org is on GitHub Enterprise and you need to defend the spend.",
    roles: ['GitHub Enterprise Owner (or Copilot Metrics API access)', 'Power BI Pro (you, to publish)'],
    steps: [
      "Download the <code>.pbit</code> from the GitHubCopilotImpact repo.",
      "Send your GitHub Enterprise owner the email below — they need to issue you a PAT with Copilot metrics read access.",
      "Open the <code>.pbit</code> in Power BI Desktop, paste in the PAT and your GitHub org name.",
      "Refresh (~30 min once token is issued).",
      "Use the team and user views in your next dev productivity review."
    ],
    repo: 'https://github.com/microsoft/GitHubCopilotImpact',
    download: 'https://github.com/microsoft/GitHubCopilotImpact/archive/refs/heads/main.zip',
    demo: null,
    email: {
      to: 'githubadmin@yourcompany.com',
      subject: 'Need GitHub Copilot Metrics API access for the Microsoft GitHub Copilot Impact report',
      body: `Hi [GitHub admin],

I'd like to stand up the Microsoft open-source "GitHub Copilot Impact" Power BI template — it pulls GitHub Copilot usage per team and per user (chat vs agent, language, model, acceptance rate) straight from the GitHub Enterprise Copilot metrics API.

I need a Personal Access Token (or fine-grained token) scoped to read the Copilot metrics API for our org. The repo documents the exact scopes:
https://github.com/microsoft/GitHubCopilotImpact

Can you issue the token (or assign me the role to mint one)? Thanks!`
    }
  },

  'what-i-did': {
    title: 'What I Did: Copilot Impact Report',
    icon: '📝',
    blurb: "Personal leverage report. Points a script at your local VS Code / Copilot session logs.",
    outcome: "A personal weekly report of what <em>you</em> shipped with GitHub Copilot — what you built, where Copilot helped, and the leverage multiplier on your week. Runs entirely on your laptop. Use this for personal demos, your own brag doc, or to seed an internal storytelling pattern.",
    roles: ['Just you. No admin needed.'],
    steps: [
      "Download (or git clone) the What-I-Did-Copilot repo to your laptop.",
      "Run the included script — it points at your local VS Code / Copilot session logs.",
      "Open the generated report. ~5 minutes start to finish.",
      "(Optional) Share with your manager as a brag doc, or use as a demo template for the rest of your team."
    ],
    repo: 'https://github.com/microsoft/What-I-Did-Copilot',
    download: 'https://github.com/microsoft/What-I-Did-Copilot/archive/refs/heads/main.zip',
    demo: null,
    email: null
  },

  'pax': {
    title: 'PAX: Portable Audit eXporter',
    icon: '🛡️',
    blurb: "Enterprise-grade PowerShell exporter for Microsoft 365 audit logs and Entra data.",
    outcome: "A production-grade PowerShell tool that automates pulling Microsoft 365 audit logs (Purview) and Entra directory data — no row limits, handles billions of events, lands data wherever you need it (lake, warehouse, BI). This is the automation layer behind every Purview-backed Power BI report on this site.",
    roles: ['App registration in Entra (Application.ReadWrite + AuditLog.Read.All + Directory.Read.All)', 'Compliance Administrator (to grant tenant-wide consent)'],
    steps: [
      "Download or clone the PAX repo.",
      "Send your Entra admin the email below to create the app registration and grant the API permissions.",
      "Walk through the PAX setup script — it walks you through cert install, app ID, and target storage.",
      "Schedule PAX as a recurring job (Azure Function, scheduled task, or Logic App).",
      "Point your Power BI templates at the PAX output folder / blob / lake."
    ],
    repo: 'https://github.com/microsoft/PAX',
    download: 'https://github.com/microsoft/PAX/archive/refs/heads/release.zip',
    demo: null,
    email: {
      to: 'entraadmin@yourcompany.com',
      subject: 'Need an Entra app registration + permissions for Microsoft PAX (audit log exporter)',
      body: `Hi [Entra admin],

I'm setting up the Microsoft open-source PAX (Portable Audit eXporter) — a PowerShell tool that automates pulling our M365 audit logs (Purview) and Entra directory data so we can feed it into the Copilot reporting Power BI templates without manual exports.

It needs an Entra app registration with these Application permissions (and tenant-wide admin consent):

  1. AuditLog.Read.All
  2. Directory.Read.All
  3. (Optional) Reports.Read.All for usage reports

Full setup walkthrough is in the README:
https://github.com/microsoft/PAX

Can you create the app registration (or walk me through doing it myself) and grant consent? Happy to pair on it. Thanks!`
    }
  },

  'roi-calc': {
    title: 'M365 Copilot Productivity ROI Calculator',
    icon: '🧮',
    blurb: "Browser-only ROI modeler that pairs with the Super Usage Heatmap.",
    outcome: "A defensible ROI story: dollarize the time savings your Copilot deployment is producing, sweep assumptions live, and walk into a finance review with numbers you can stand behind. No install required for the calculator itself — but you'll get the strongest answer by pairing it with the Super Usage Power BI report.",
    roles: ['None for the calculator itself.', 'Power BI Pro + Viva Insights Analyst (only if you want to feed in real Super Usage heatmap data)'],
    steps: [
      "Open the calculator in your browser (link below) — no install, runs entirely client-side.",
      "Enter your basic inputs: licensed user count, fully-loaded hourly rate, time saved assumptions.",
      "(Recommended) Export the Super Usage heatmap visual from the Super Usage Power BI report as CSV and drop it in for tenant-grounded numbers.",
      "Sweep assumptions until you have a band you can defend.",
      "Screenshot or copy the summary into your exec deck."
    ],
    repo: 'https://jordankingisalive.github.io/CopilotROICalculator/',
    download: 'https://github.com/jordankingisalive/CopilotROICalculator/archive/refs/heads/main.zip',
    demo: '../demos/?report=roi-calculator',
    email: null
  },

  'customize': {
    title: 'CustomizeCopilot Add-on Library',
    icon: '🧩',
    blurb: "Drop-in Power BI add-on pages that extend the Viva Insights-based templates.",
    outcome: "Drop-in Power BI add-on pages and visualizations that extend the existing Viva Insights-based templates — Champion ID, segment overlays, custom views — so you can hand a tailored report to a specific persona without rebuilding the template from scratch.",
    roles: ['Power BI Pro', 'Already running the parent template (Super Usage, etc.)'],
    steps: [
      "Identify the parent template you want to extend (most commonly Super Usage Adoption).",
      "Browse the CustomizeCopilot repo for the add-on page(s) you want.",
      "Open your existing <code>.pbix</code> in Power BI Desktop.",
      "Copy the add-on page from the add-on file into your report (~15 min per add-on).",
      "Re-publish."
    ],
    repo: 'https://github.com/microsoft/customizecopilot',
    download: 'https://github.com/microsoft/customizecopilot/archive/refs/heads/main.zip',
    demo: '../demos/?report=champion-id',
    email: null
  }
};

/* ----------------------------------------------------------------
   DECISION TREE
   Each top-level category has:
     - id, icon, title, sub
     - either { recommend: 'report-id' } for direct
     - or     { questions: [{ ...sub-question with options leading to a report-id }] }
   ---------------------------------------------------------------- */
const TREE = [
  {
    id: 'adoption',
    icon: '📈',
    title: "Is anyone actually using Copilot?",
    sub: "Show me adoption — who's logging in, who's not, where the gaps are.",
    next: {
      type: 'question',
      title: "What level do you want to start at?",
      lede: "Both answers lead to a real report — pick whichever description sounds more like your week.",
      options: [
        { icon: '🤖', title: "One dashboard for everything across the tenant", sub: "Copilot + Chat + Agents in a single Power BI report.", recommend: 'ai-in-one' },
        { icon: '🎯', title: "Who is ready to be enabled next?", sub: "Rank users by M365 fluency and plan enablement waves.", recommend: 'm365-readiness' }
      ]
    }
  },
  {
    id: 'super-users',
    icon: '⚡',
    title: "Who are my power users / champions?",
    sub: "Find the people getting outsized value, then replicate them.",
    next: {
      type: 'question',
      title: "Do you just want to identify them, or prove their impact?",
      lede: "Both reports run on the same Viva Insights query, so if you stand one up the other is essentially free.",
      options: [
        { icon: '⚡', title: "Identify and profile them", sub: "Heatmaps, persona profiles, what they do differently.", recommend: 'super-usage' },
        { icon: '🏆', title: "Prove their impact vs comparable peers", sub: "Quantify the work-pattern delta in collab/focus/meetings.", recommend: 'super-user-impact' },
        { icon: '🧩', title: "I already have the Super Usage report — extend it", sub: "Champion ID add-on page and other custom views.", recommend: 'customize' }
      ]
    }
  },
  {
    id: 'impact',
    icon: '🎯',
    title: "Is Copilot actually changing how people work?",
    sub: "Move beyond logins — show behavior change in collaboration, focus, meeting load.",
    next: {
      type: 'recommend',
      id: 'super-user-impact'
    }
  },
  {
    id: 'roi',
    icon: '💰',
    title: "What is Copilot costing me vs. what am I getting back?",
    sub: "Build the dollar story for finance and the exec sponsor.",
    next: {
      type: 'question',
      title: "Do you already have usage data, or are you starting from scratch?",
      lede: "The strongest ROI story pairs the calculator with real tenant data from the Super Usage report.",
      options: [
        { icon: '🧮', title: "Just give me the calculator", sub: "Browser-only modeler. Use assumptions to build a band.", recommend: 'roi-calc' },
        { icon: '⚡', title: "I want tenant-grounded numbers", sub: "Stand up Super Usage first, then feed it into the calculator.", recommend: 'super-usage' }
      ]
    }
  },
  {
    id: 'chat-content',
    icon: '💬',
    title: "What are people actually doing in Copilot Chat?",
    sub: "Surface app, feature, and department breakdowns of Chat usage.",
    next: {
      type: 'recommend',
      id: 'chat-agent'
    }
  },
  {
    id: 'agents',
    icon: '🤝',
    title: "How are Agents being used in my tenant?",
    sub: "Track Agent activity by user, app, and department.",
    next: {
      type: 'recommend',
      id: 'chat-agent'
    }
  },
  {
    id: 'sentiment',
    icon: '💛',
    title: "How do people feel about Copilot?",
    sub: "Pair sentiment survey responses with actual usage tiers.",
    next: {
      type: 'recommend',
      id: 'adoption-sentiment'
    }
  },
  {
    id: 'developer',
    icon: '⚙️',
    title: "I want developer / GitHub Copilot reporting",
    sub: "Devs are a different population with different telemetry.",
    next: {
      type: 'question',
      title: "Team-level or personal?",
      lede: "Two very different scopes — pick the one that matches the conversation you're walking into.",
      options: [
        { icon: '⚙️', title: "Team / org reporting", sub: "Per-team and per-user GitHub Copilot metrics.", recommend: 'ghcp-impact' },
        { icon: '📝', title: "Just me — my personal weekly leverage", sub: "Runs locally on your laptop. ~5 minutes.", recommend: 'what-i-did' }
      ]
    }
  },
  {
    id: 'automation',
    icon: '🛡️',
    title: "How do I automate pulling audit logs?",
    sub: "Stop manually exporting CSVs every month.",
    next: {
      type: 'recommend',
      id: 'pax'
    }
  },
  {
    id: 'extend',
    icon: '🧩',
    title: "I already have a report — I want to extend it",
    sub: "Add custom pages, Champion ID overlays, segment views.",
    next: {
      type: 'recommend',
      id: 'customize'
    }
  },
  {
    id: 'overwhelmed',
    icon: '🌿',
    title: "I have no idea — just give me the safe default",
    sub: "Calm option. We'll point you at the one report that answers the most for the least effort.",
    next: {
      type: 'recommend',
      id: 'ai-in-one',
      note: "If you only deploy one report, deploy this one. It covers Copilot, Chat, and Agents across the tenant in a single Power BI dashboard — and it's what we'd open in your shoes."
    }
  }
];

/* ----------------------------------------------------------------
   RENDERER
   ---------------------------------------------------------------- */
const stage = document.getElementById('stage');
const backBtn = document.getElementById('backBtn');
const restartBtn = document.getElementById('restartBtn');
const escapeBtn = document.getElementById('escapeBtn');
const stepEls = document.querySelectorAll('.step');

let history = [];   // stack of { step, payload }

function setProgress(stepNum) {
  stepEls.forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle('is-active', n === stepNum);
    el.classList.toggle('is-done', n < stepNum);
  });
}

function renderStart() {
  setProgress(1);
  backBtn.hidden = true;
  restartBtn.hidden = true;

  const grid = TREE.map(c => `
    <button class="option-card${c.id === 'overwhelmed' ? ' is-safe' : ''}" data-category="${c.id}">
      <span class="opt-icon" aria-hidden="true">${c.icon}</span>
      <span class="opt-body">
        <span class="opt-title">${escapeHtml(c.title)}</span>
        <span class="opt-sub">${escapeHtml(c.sub)}</span>
      </span>
      <span class="opt-arrow" aria-hidden="true">→</span>
    </button>
  `).join('');

  stage.innerHTML = `
    <h2>Where do you want to start?</h2>
    <p class="stage-lede">Pick the one that sounds most like what's on your plate. If nothing fits, the last option ("just give me the safe default") is always a good pick.</p>
    <div class="option-grid">${grid}</div>
  `;

  stage.querySelectorAll('[data-category]').forEach(btn => {
    btn.addEventListener('click', () => onCategoryPick(btn.dataset.category));
  });
}

function onCategoryPick(catId) {
  const cat = TREE.find(c => c.id === catId);
  if (!cat) return;
  history.push({ step: 'category', catId });

  if (cat.next.type === 'recommend') {
    renderRecommendation(cat.next.id, cat.next.note);
  } else {
    renderQuestion(cat);
  }
}

function renderQuestion(cat) {
  setProgress(2);
  backBtn.hidden = false;
  restartBtn.hidden = false;

  const q = cat.next;
  const grid = q.options.map((opt, i) => `
    <button class="option-card" data-pick="${i}">
      <span class="opt-icon" aria-hidden="true">${opt.icon}</span>
      <span class="opt-body">
        <span class="opt-title">${escapeHtml(opt.title)}</span>
        <span class="opt-sub">${escapeHtml(opt.sub)}</span>
      </span>
      <span class="opt-arrow" aria-hidden="true">→</span>
    </button>
  `).join('');

  stage.innerHTML = `
    <h2>${escapeHtml(q.title)}</h2>
    <p class="stage-lede">${escapeHtml(q.lede || '')}</p>
    <div class="option-grid">${grid}</div>
  `;

  stage.querySelectorAll('[data-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.pick);
      const choice = q.options[idx];
      history.push({ step: 'question', catId: cat.id, pick: idx });
      renderRecommendation(choice.recommend);
    });
  });
}

function renderRecommendation(reportId, note) {
  setProgress(3);
  backBtn.hidden = false;
  restartBtn.hidden = false;

  const r = REPORTS[reportId];
  if (!r) {
    stage.innerHTML = `<h2>Something went sideways</h2><p class="stage-lede">We couldn't load that recommendation. Try starting over, or email the team using the lifeline below.</p>`;
    return;
  }

  const noteBlock = note ? `
    <div class="rec-outcome" style="margin-top:.6rem">
      <p><strong>Note from us:</strong> ${escapeHtml(note)}</p>
    </div>` : '';

  const rolesHtml = r.roles.map(role => `<li class="role-pill">${escapeHtml(role)}</li>`).join('');
  const stepsHtml = r.steps.map(s => `<li><span class="step-body">${s}</span></li>`).join('');

  const emailHtml = r.email ? `
    <div class="rec-section">
      <h3><span class="ico" aria-hidden="true">✉️</span>Send this to your admin</h3>
      <div class="email-block">
        <p class="email-meta"><b>To:</b> ${escapeHtml(r.email.to)} &nbsp; <b>Subject:</b> ${escapeHtml(r.email.subject)}</p>
        <pre class="email-body" id="emailBody">${escapeHtml(r.email.body)}</pre>
        <div class="email-actions">
          <a class="btn-primary" href="mailto:${encodeURIComponent(r.email.to)}?subject=${encodeURIComponent(r.email.subject)}&body=${encodeURIComponent(r.email.body)}">Open in mail client →</a>
          <button class="btn-secondary" id="copyEmail" type="button">📋 Copy email text</button>
        </div>
      </div>
    </div>
  ` : `
    <div class="rec-section">
      <h3><span class="ico" aria-hidden="true">✉️</span>Send this to your admin</h3>
      <div class="email-block">
        <p class="email-meta" style="margin:0">No admin email needed for this one — you can stand it up yourself.</p>
      </div>
    </div>
  `;

  const demoHtml = r.demo ? `<a class="btn-secondary" href="${r.demo}" target="_blank" rel="noopener">▶ Watch a live demo</a>` : '';

  stage.innerHTML = `
    <div class="rec">
      <div class="rec-header">
        <div class="rec-icon" aria-hidden="true">${r.icon}</div>
        <div class="rec-title-block">
          <span class="rec-eyebrow">Your recommendation</span>
          <h2 class="rec-title">${escapeHtml(r.title)}</h2>
          <p class="rec-why">${escapeHtml(r.blurb)}</p>
        </div>
      </div>

      <div class="rec-section">
        <h3><span class="ico" aria-hidden="true">🎁</span>Here's what you'll walk away with</h3>
        <div class="rec-outcome"><p>${r.outcome}</p></div>
        ${noteBlock}
      </div>

      <div class="rec-section">
        <h3><span class="ico" aria-hidden="true">🔑</span>Roles / access you'll need</h3>
        <ul class="role-list">${rolesHtml}</ul>
      </div>

      <div class="rec-section">
        <h3><span class="ico" aria-hidden="true">🛠️</span>Stand it up — step by step</h3>
        <ol class="step-list">${stepsHtml}</ol>
      </div>

      ${emailHtml}

      <div class="rec-actions">
        <a class="btn-primary" href="${r.repo}" target="_blank" rel="noopener">Open repo on GitHub ↗</a>
        <a class="btn-secondary" href="${r.download}">⬇ Download .zip</a>
        ${demoHtml}
      </div>
    </div>
  `;

  const copyBtn = document.getElementById('copyEmail');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(r.email.body).then(() => toast('Email copied to clipboard'));
    });
  }
}

/* -------- nav buttons -------- */
backBtn.addEventListener('click', () => {
  if (history.length === 0) return renderStart();
  history.pop();
  if (history.length === 0) return renderStart();
  const last = history[history.length - 1];
  const cat = TREE.find(c => c.id === last.catId);
  if (last.step === 'category' && cat.next.type === 'question') {
    renderQuestion(cat);
  } else {
    history = [];
    renderStart();
  }
});

restartBtn.addEventListener('click', () => {
  history = [];
  renderStart();
});

/* -------- tiny utilities -------- */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

let toastTimer = null;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* -------- boot -------- */
renderStart();
