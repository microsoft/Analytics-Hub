<div align="center">

<br>

# 🧠 Analytics Hub

### The complete toolkit for measuring, understanding, and accelerating Microsoft Copilot & AI adoption

<br>

[![Built by Microsoft](https://img.shields.io/badge/Built%20by-Microsoft-0078d4?style=for-the-badge&logo=microsoft&logoColor=white)](https://github.com/microsoft)
[![Power BI](https://img.shields.io/badge/Power%20BI-Templates-F2C811?style=for-the-badge&logo=powerbi&logoColor=black)](https://powerbi.microsoft.com)
[![Repositories](https://img.shields.io/badge/Repositories-8-8661c5?style=for-the-badge&logo=github&logoColor=white)](https://github.com/microsoft)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](https://opensource.org/licenses/MIT)

<br>

**[Browse the Toolkit ↓](#-the-toolkit)** &nbsp;·&nbsp; **[Find Your Tool ↓](#-which-tool-do-i-need)** &nbsp;·&nbsp; **[Data Sources ↓](#-data-sources-at-a-glance)** &nbsp;·&nbsp; **[About the Team ↓](#-about-the-team)**

<br>

</div>

---

<div align="center">
<i>Eight production-ready Power BI templates, add-ons, and PowerShell automation tools — built by Microsoft's Copilot ROI Advisory Team to give every organization the analytics firepower to prove, grow, and sustain AI impact.</i>
</div>

---

## What Is This?

The **Analytics Hub** is a curated collection of open-source analytics tools from Microsoft designed for one purpose: to help organizations understand how their people are adopting Microsoft Copilot and AI — and to turn that understanding into action.

Each tool in this hub is a standalone, downloadable resource. Together, they form a complete analytics ecosystem that spans the full Copilot adoption journey — from **license readiness**, to **active usage**, to **deep behavioral insights**, all the way to **measuring real business impact**.

> All tools are free, open-source, and link directly to original Microsoft repositories. No data is ever sent to Microsoft — everything runs in your own environment.

---

## 🗺 The Ecosystem

Understanding how the tools fit together is key. There are **three data source tracks** — choose the tools that match where your data lives.

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                              YOUR DATA SOURCES                                       ║
╠═══════════════════════╦══════════════════════════╦═══════════════════════════════════╣
║   Microsoft Purview   ║    Viva Insights          ║    GitHub Enterprise              ║
║   (Audit Logs)        ║    (Person Query)         ║    (Usage API + Members)          ║
╚═══════════╤═══════════╩══════════════╤═══════════╩══════════════════╤════════════════╝
            │                          │                               │
            ▼                          │                               │
  ┌─────────────────┐                  │                               │
  │   PAX Scripts   │ ← automates ─── ─┤                               │
  │  (PowerShell)   │  data collection │                               │
  └────────┬────────┘                  │                               │
           │                           │                               │
     ┌─────┴──────────────────────┐    └─────────────────┐            │
     ▼                            ▼                       ▼            ▼
┌──────────────┐  ┌─────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ AI-in-One    │  │  Copilot Chat &      │  │  Super Usage     │  │  GitHub Copilot  │
│  Dashboard   │  │  Agent Intelligence  │  │  Analysis +      │  │  Impact          │
│              │  │                      │  │  Superuser       │  │                  │
│ + M365       │  │                      │  │  Impact          │  │                  │
│  Readiness   │  │                      │  │                  │  │                  │
└──────────────┘  └─────────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 🎯 Which Tool Do I Need?

| If you're asking... | Use this tool | Data source |
|---|---|---|
| Who are our Copilot super users, and how did they get there? | [Super Usage Analysis](#-super-usage-analysis) | Viva Insights |
| What's the measurable impact of super users on work patterns? | [Superuser Impact](#-superuser-impact) | Viva Insights |
| How are people using Copilot Chat and Agents across our org? | [Copilot Chat & Agent Intelligence](#-copilot-chat--agent-intelligence) | Purview + Entra |
| I want a single dashboard showing all Copilot and Agent activity | [AI-in-One Dashboard](#-ai-in-one-dashboard) | Purview + Entra |
| How are developers adopting GitHub Copilot? | [GitHub Copilot Impact](#-github-copilot-impact) | GitHub Enterprise |
| Which users should get Copilot licenses next? | [M365 Copilot Readiness](#-m365-copilot-readiness-report) | Purview + Entra |
| How do I automate pulling audit logs without manual exports? | [PAX — Portable Audit eXporter](#-pax--portable-audit-exporter) | Microsoft Graph API |
| I want to add custom pages or extend my Viva Insights reports | [CustomizeCopilot](#-customizecopilot--add-on-library) | Viva Insights |

---

## 🛠 The Toolkit

### ⚡ [Super Usage Analysis](https://github.com/microsoft/DecodingSuperUsage)

[![Data Source](https://img.shields.io/badge/Data-Viva%20Insights-00B294?style=flat-square)](https://analysis.insights.cloud.microsoft/)
[![Type](https://img.shields.io/badge/Type-Power%20BI%20Template-F2C811?style=flat-square&logo=powerbi&logoColor=black)](https://github.com/microsoft/DecodingSuperUsage)
[![Stars](https://img.shields.io/github/stars/microsoft/DecodingSuperUsage?style=flat-square&logo=github&label=Stars)](https://github.com/microsoft/DecodingSuperUsage/stargazers)
[![Download](https://img.shields.io/badge/📥%20Download-All%20Files-success?style=flat-square)](https://github.com/microsoft/DecodingSuperUsage/archive/refs/heads/main.zip)

**Who are your Copilot super users — and how do you make more of them?**

Super usage patterns reveal how experimentation turns into durable habits. This template uses Viva Insights organizational data to decode the journey from first-time user to power user: what they use Copilot for, how fast habits form, which teams are leading, and where to focus your enablement energy next.

<details>
<summary><strong>What you can explore</strong></summary>

<br>

- **Super usage profile** — What does super usage look like at your org? Which Copilot surfaces are driving the deepest engagement?
- **The journey** — What did super users do differently in the early days? How fast are you producing them?
- **Work patterns** — What behavioral signals are associated with super users? Any early signs of productivity shifts?
- **Change management** — Where are super users concentrated? Which teams need enablement investment most?

</details>

<details>
<summary><strong>Dashboard preview</strong></summary>

<br>

![Super Usage Dashboard Preview](https://raw.githubusercontent.com/microsoft/DecodingSuperUsage/refs/heads/DecodingSuperUsage/images/SuperUser.gif)

</details>

→ **[View Repository](https://github.com/microsoft/DecodingSuperUsage)** &nbsp;|&nbsp; **[Download Template](https://github.com/microsoft/DecodingSuperUsage/archive/refs/heads/main.zip)** &nbsp;|&nbsp; **[Interpretation Guide](https://github.com/microsoft/DecodingSuperUsage/blob/DecodingSuperUsage/Interpretation%20Guide%20Super%20Usage%20Adoption.pdf)** &nbsp;|&nbsp; **[⭐ Star](https://github.com/microsoft/DecodingSuperUsage/stargazers)**

---

### 🏆 [Superuser Impact](https://github.com/microsoft/superuserimpact)

[![Data Source](https://img.shields.io/badge/Data-Viva%20Insights-00B294?style=flat-square)](https://analysis.insights.cloud.microsoft/)
[![Type](https://img.shields.io/badge/Type-Power%20BI%20Template-F2C811?style=flat-square&logo=powerbi&logoColor=black)](https://github.com/microsoft/superuserimpact)
[![Stars](https://img.shields.io/github/stars/microsoft/superuserimpact?style=flat-square&logo=github&label=Stars)](https://github.com/microsoft/superuserimpact/stargazers)
[![Download](https://img.shields.io/badge/📥%20Download-All%20Files-success?style=flat-square)](https://github.com/microsoft/superuserimpact/archive/refs/heads/main.zip)

**What is the measurable impact of Copilot on how your super users work?**

Goes beyond adoption metrics to answer the harder question: *so what?* This template explores the work pattern changes — and where available, sentiment shifts — associated with super users, along with estimated value delivered. Cross-team comparisons and one-click zoom into individual cohorts make it easy to build a compelling ROI story.

<details>
<summary><strong>What you can explore</strong></summary>

<br>

- **Impact measurement** — Work pattern deltas before and after super user status emerges
- **Sentiment signals** — Sentiment overlay (when available) to contextualize behavioral change
- **Estimated value** — Quantified value estimates tied to time savings and collaboration shifts
- **Cross-team comparison** — Benchmark super user cohorts across functions and orgs
- **Usage tiers** — Static threshold-based tier classification for clearer benchmarking

</details>

<details>
<summary><strong>Dashboard preview</strong></summary>

<br>

![Superuser Impact Dashboard Preview](https://raw.githubusercontent.com/microsoft/superuserimpact/main/images/report-preview.gif)

</details>

→ **[View Repository](https://github.com/microsoft/superuserimpact)** &nbsp;|&nbsp; **[Download Template](https://github.com/microsoft/superuserimpact/archive/refs/heads/main.zip)** &nbsp;|&nbsp; **[⭐ Star](https://github.com/microsoft/superuserimpact/stargazers)**

---

### 🧩 [CustomizeCopilot — Add-on Library](https://github.com/microsoft/customizecopilot)

[![Data Source](https://img.shields.io/badge/Data-Viva%20Insights-00B294?style=flat-square)](https://analysis.insights.cloud.microsoft/)
[![Type](https://img.shields.io/badge/Type-Power%20BI%20Add--ons-F2C811?style=flat-square&logo=powerbi&logoColor=black)](https://github.com/microsoft/customizecopilot)
[![Stars](https://img.shields.io/github/stars/microsoft/customizecopilot?style=flat-square&logo=github&label=Stars)](https://github.com/microsoft/customizecopilot/stargazers)
[![Download](https://img.shields.io/badge/📥%20Download-All%20Files-success?style=flat-square)](https://github.com/microsoft/customizecopilot/archive/refs/heads/main.zip)

**Extend your Viva Insights reports with plug-and-play add-on pages — no rebuilding from scratch.**

A growing library of modular Power BI pages that drop directly into the Super Usage Analysis and Superuser Impact templates. Each add-on is pre-configured with its own measures and visuals, compatible with both templates, and maintained alongside the base reports. Pick only what you need and import in minutes.

<details>
<summary><strong>Current add-ons</strong></summary>

<br>

**Champion ID Pages** — Two person-level analytics pages for identifying your top Copilot champions. Shows individual usage rankings across all M365 apps, Copilot action breakdowns, network influence metrics (strong ties, diverse ties, internal network size), and temporal usage patterns. Ideal for peer training programs, recognition initiatives, and targeted coaching.

*Compatible with Super User Adoption v5+ and Super User Impact v5+. Requires 25 measures — all included automatically in the latest template versions.*

</details>

<details>
<summary><strong>How to add pages to your report</strong></summary>

<br>

**Option A — Power BI Desktop (easiest):**
1. Open your base report and a second Power BI Desktop instance with the add-on file
2. Right-click the page you want → Copy → paste into your base report
3. Verify visuals load and save

**Option B — Power BI Project files (.pbip):**
1. Copy the page folder from the add-on into your report's `definition/pages/` directory
2. Add the page GUID to `pages.json`
3. Open in Power BI Desktop and verify

</details>

→ **[View Repository](https://github.com/microsoft/customizecopilot)** &nbsp;|&nbsp; **[Download Add-ons](https://github.com/microsoft/customizecopilot/archive/refs/heads/main.zip)** &nbsp;|&nbsp; **[⭐ Star](https://github.com/microsoft/customizecopilot/stargazers)**

---

### 🤖 [AI-in-One Dashboard](https://github.com/microsoft/AI-in-One-Dashboard)

[![Data Source](https://img.shields.io/badge/Data-Microsoft%20Purview-742774?style=flat-square)](https://security.microsoft.com)
[![Data Source](https://img.shields.io/badge/Data-Microsoft%20Entra-0F6CBD?style=flat-square)](https://entra.microsoft.com)
[![Type](https://img.shields.io/badge/Type-Power%20BI%20Template-F2C811?style=flat-square&logo=powerbi&logoColor=black)](https://github.com/microsoft/AI-in-One-Dashboard)
[![Stars](https://img.shields.io/github/stars/microsoft/AI-in-One-Dashboard?style=flat-square&logo=github&label=Stars)](https://github.com/microsoft/AI-in-One-Dashboard/stargazers)
[![Download](https://img.shields.io/badge/📥%20Download-All%20Files-success?style=flat-square)](https://github.com/microsoft/AI-in-One-Dashboard/archive/refs/heads/main.zip)

**Every Copilot and Agent interaction in one place — from licensed M365 Copilot to third-party AI.**

The most comprehensive Copilot usage dashboard in the toolkit. Pulls from Purview audit logs to give you a single view of M365 Copilot usage, unlicensed Copilot Chat, and Agent activity across your organization. Track adoption trends, identify champions, optimize license allocation, and measure readiness — all from one template.

> **New:** The Agent Dashboard feature is now in public preview — providing one-click visibility into agent usage. Work with your IT admin to enable it.

<details>
<summary><strong>What you can explore</strong></summary>

<br>

- **Comprehensive coverage** — M365 Copilot, unlicensed Copilot Chat, custom agents, and third-party AI apps (Confluence, Jira, Miro, and more)
- **User engagement tracking** — Adoption trends over time across all Copilot surfaces
- **License intelligence** — Licensed vs. unlicensed usage patterns to optimize allocation
- **Agent inventory** — Full catalog of agents deployed in your tenant via the Agent Registry
- **Org segmentation** — Slice any view by department, role, or custom attributes
- **Two setup paths** — Manual portal export or fully automated PowerShell scripts

</details>

<details>
<summary><strong>Dashboard preview</strong></summary>

<br>

![AI-in-One Dashboard Preview](https://raw.githubusercontent.com/microsoft/AI-in-One-Dashboard/main/Images/AIO%20v10%20Gif.gif)

</details>

→ **[View Repository](https://github.com/microsoft/AI-in-One-Dashboard)** &nbsp;|&nbsp; **[Interpretation Guide](https://github.com/microsoft/AI-in-One-Dashboard/blob/main/AI-in-One%20-%20Interpretation%20Guide.pdf)** &nbsp;|&nbsp; **[⭐ Star](https://github.com/microsoft/AI-in-One-Dashboard/stargazers)**

---

### 💬 [Copilot Chat & Agent Intelligence](https://github.com/microsoft/CopilotChatAnalytics)

[![Data Source](https://img.shields.io/badge/Data-Microsoft%20Purview-742774?style=flat-square)](https://security.microsoft.com)
[![Data Source](https://img.shields.io/badge/Data-Microsoft%20Entra-0F6CBD?style=flat-square)](https://entra.microsoft.com)
[![Type](https://img.shields.io/badge/Type-Power%20BI%20Template-F2C811?style=flat-square&logo=powerbi&logoColor=black)](https://github.com/microsoft/CopilotChatAnalytics)
[![Stars](https://img.shields.io/github/stars/microsoft/CopilotChatAnalytics?style=flat-square&logo=github&label=Stars)](https://github.com/microsoft/CopilotChatAnalytics/stargazers)
[![Download](https://img.shields.io/badge/📥%20Download-All%20Files-success?style=flat-square)](https://github.com/microsoft/CopilotChatAnalytics/archive/refs/heads/main.zip)

**Deep-dive analytics on Copilot Chat sessions and Agent adoption — with two purpose-built templates.**

Where the AI-in-One Dashboard gives you the full picture, this repo goes deep on **Chat** and **Agents** specifically. The Chat Intelligence report breaks down prompt volume, session patterns, and engagement progression from light to habitual use. The Agent Intelligence report shows which agents are being used, by whom, and how adoption is trending.

<details>
<summary><strong>Two templates, two lenses</strong></summary>

<br>

**Chat Intelligence** — Prompts, sessions, surface breakdown, user engagement tiers, and licensing readiness signals across Copilot Chat.

**Agent Intelligence** — Agent adoption across licensed and free experiences, segmented by org, quartile, and surface. Identify adoption hotspots and quantify agent ROI.

</details>

<details>
<summary><strong>Dashboard previews</strong></summary>

<br>

**Agent Intelligence:**

![Agent Intelligence Preview](https://raw.githubusercontent.com/microsoft/CopilotChatAnalytics/refs/heads/main/Images/AgentIntelGif.gif)

**Chat Intelligence:**

![Chat Intelligence Preview](https://raw.githubusercontent.com/microsoft/CopilotChatAnalytics/refs/heads/main/Images/ChatIntelGIG.gif)

</details>

→ **[View Repository](https://github.com/microsoft/CopilotChatAnalytics)** &nbsp;|&nbsp; **[Agent Intelligence Guide](https://github.com/microsoft/CopilotChatAnalytics/blob/main/AgentIntelligenceGuide.pdf)** &nbsp;|&nbsp; **[Chat Interpretation Guide](https://github.com/microsoft/CopilotChatAnalytics/blob/main/Copilot%20Chat%20-%20Interpretation%20Guide.pdf)** &nbsp;|&nbsp; **[⭐ Star](https://github.com/microsoft/CopilotChatAnalytics/stargazers)**

---

### 🐙 [GitHub Copilot Impact](https://github.com/microsoft/GitHubCopilotImpact)

[![Data Source](https://img.shields.io/badge/Data-GitHub%20Enterprise-24292f?style=flat-square&logo=github&logoColor=white)](https://github.com/enterprise)
[![Data Source](https://img.shields.io/badge/Data-Microsoft%20Entra-0F6CBD?style=flat-square)](https://entra.microsoft.com)
[![Type](https://img.shields.io/badge/Type-Power%20BI%20Template-F2C811?style=flat-square&logo=powerbi&logoColor=black)](https://github.com/microsoft/GitHubCopilotImpact)
[![Stars](https://img.shields.io/github/stars/microsoft/GitHubCopilotImpact?style=flat-square&logo=github&label=Stars)](https://github.com/microsoft/GitHubCopilotImpact/stargazers)
[![Download](https://img.shields.io/badge/📥%20Download-All%20Files-success?style=flat-square)](https://github.com/microsoft/GitHubCopilotImpact/archive/refs/heads/main.zip)

**How are developers building habits with GitHub Copilot — and which teams are pulling ahead?**

Built specifically for engineering orgs, this template connects GitHub Enterprise usage data with your Entra org structure so you can segment developer habit data by team. Track the shift to agentic coding, compare acceptance rates by language, monitor model adoption, and set team-level goals with bright-spot / hotspot views.

<details>
<summary><strong>What you can explore</strong></summary>

<br>

- **Adoption & engagement** — Weekly active users, interaction volume, chat vs. agent mode split by team
- **Code impact** — Acceptance rates, lines suggested and accepted, code generation trends over time
- **Language insights** — Which languages see the highest acceptance? Which teams get the most value from specific languages?
- **Feature insights** — How do code completion, agent mode, and inline edits compare in usage and acceptance?
- **Model insights** — Which models are contributing to the codebase? Which are gaining new users?
- **Goal tracking** — Set adoption targets per team, track progress, surface leading and lagging cohorts

</details>

<details>
<summary><strong>Dashboard preview</strong></summary>

<br>

![GitHub Copilot Impact Preview](https://raw.githubusercontent.com/microsoft/GitHubCopilotImpact/main/assets/ghcpgif.gif)

</details>

→ **[View Repository](https://github.com/microsoft/GitHubCopilotImpact)** &nbsp;|&nbsp; **[⭐ Star](https://github.com/microsoft/GitHubCopilotImpact/stargazers)**

---

### 📊 [M365 Copilot Readiness Report](https://github.com/microsoft/M365UsageAnalytics)

[![Data Source](https://img.shields.io/badge/Data-Microsoft%20Purview-742774?style=flat-square)](https://purview.microsoft.com)
[![Data Source](https://img.shields.io/badge/Data-Microsoft%20Entra-0F6CBD?style=flat-square)](https://entra.microsoft.com)
[![Type](https://img.shields.io/badge/Type-Power%20BI%20Template-F2C811?style=flat-square&logo=powerbi&logoColor=black)](https://github.com/microsoft/M365UsageAnalytics)
[![Stars](https://img.shields.io/github/stars/microsoft/M365UsageAnalytics?style=flat-square&logo=github&label=Stars)](https://github.com/microsoft/M365UsageAnalytics/stargazers)
[![Download](https://img.shields.io/badge/📥%20Download-All%20Files-success?style=flat-square)](https://github.com/microsoft/M365UsageAnalytics/archive/refs/heads/main.zip)

**Don't guess who should get Copilot licenses next. Let the data decide.**

Turns your M365 Unified Audit Log into a ranked, prioritized view of user readiness — so Copilot licenses go to people most likely to get value from day one. A composite Licensing Priority (LP) score blends M365 activity across Teams, Outlook, Word, Excel, and PowerPoint, and adjustable weighting sliders let you model different licensing scenarios instantly.

<details>
<summary><strong>7 report pages, one complete story</strong></summary>

<br>

| Page | What it shows |
|------|---------------|
| **M365 Executive Summary** | Tenant-level KPIs — total users, active Copilot users, aggregate M365 activity by workload |
| **M365 Usage Trends** | Week-over-week trend lines per app with tier distribution matrix |
| **Copilot License Recommendations** | Every user ranked by composite LP score with adjustable weighting profiles |
| **Copilot Enablement Strategy** | 2×2 quadrant: Champions, Enablement Targets, AI-First, Low Engagement |
| **Copilot Enablement Strategy Tiers** | Priority tiers (Critical → Low) based on M365-to-Copilot engagement gap |
| **M365 Usage Activity** | Engagement segments (Daily / Frequent / Moderate / Infrequent / Inactive) by department |
| **Glossary & Metric Definitions** | Every metric, threshold, and scoring method defined — shareable without docs |

</details>

→ **[View Repository](https://github.com/microsoft/M365UsageAnalytics)** &nbsp;|&nbsp; **[Download Template](https://github.com/microsoft/M365UsageAnalytics/archive/refs/heads/main.zip)** &nbsp;|&nbsp; **[⭐ Star](https://github.com/microsoft/M365UsageAnalytics/stargazers)**

---

### 🔧 [PAX — Portable Audit eXporter](https://github.com/microsoft/PAX)

[![Type](https://img.shields.io/badge/Type-PowerShell%20Scripts-2563eb?style=flat-square&logo=powershell&logoColor=white)](https://github.com/microsoft/PAX)
[![API](https://img.shields.io/badge/API-Microsoft%20Graph-0078d4?style=flat-square&logo=microsoft&logoColor=white)](https://developer.microsoft.com/en-us/graph)
[![Stars](https://img.shields.io/github/stars/microsoft/PAX?style=flat-square&logo=github&label=Stars)](https://github.com/microsoft/PAX/stargazers)
[![Download](https://img.shields.io/badge/📥%20Download-Latest%20Release-success?style=flat-square)](https://github.com/microsoft/PAX/releases)

**Skip the manual exports. Automate your entire Copilot data pipeline.**

PAX is the backbone of the Purview-based tools in this hub. Three PowerShell scripts that pull exactly the audit log data the templates need — with pagination, rate limiting, retry logic, and incremental watermark state management built in. No manual portal work, no row limits, no babysitting.

<details>
<summary><strong>Three scripts, three use cases</strong></summary>

<br>

**`PAX_Purview_Audit_Log_Processor`** — Retrieves Copilot interaction audit records from Purview via Graph API or Exchange Online Management. Supports `CopilotInteraction`, `AIInteraction`, `ConnectedAIAppInteraction`, `AIAppInteraction`, and the full M365 Usage Bundle (Teams, Exchange, SharePoint, OneDrive). Also includes Copilot license data and AI agent type detection.

**`PAX_CopilotInteractions_Content_Audit_Log_Processor`** — Retrieves the actual *content* of Copilot interactions: user prompts and AI responses from the Graph API `aiInteraction` resource type. Features incremental exports, parallel processing for enterprise scale, and Entra ID user enrichment.

**`PAX_Graph_Audit_Log_Processor`** — Retrieves Copilot usage data and comprehensive audit records directly from Microsoft Graph API with full Entra user and org enrichment.

</details>

<details>
<summary><strong>Why automate?</strong></summary>

<br>

| Manual Export | PAX Script |
|---|---|
| 50K–100K row limit per export | No row limits — retrieves everything |
| Must sit at keyboard and wait | Runs fully unattended |
| Re-start from scratch if interrupted | Automatically resumes from where it stopped |
| One-time point-in-time export | Schedulable for automated daily/weekly refresh |
| Separate steps for each data source | Single script run pulls all required files |

</details>

> ⚠️ **Important:** PAX exports may include highly sensitive data including user prompts and AI responses. Review the [compliance and security guidance](https://github.com/microsoft/PAX#readme) before deploying.

→ **[View Repository](https://github.com/microsoft/PAX)** &nbsp;|&nbsp; **[Download Latest Script](https://github.com/microsoft/PAX/releases)** &nbsp;|&nbsp; **[⭐ Star](https://github.com/microsoft/PAX/stargazers)**

---

## 📡 Data Sources at a Glance

Each tool in this hub requires data from one or more Microsoft admin portals. Here's a quick reference:

| Data Source | What It Provides | Who Needs It | Access Required |
|---|---|---|---|
| **[Microsoft Purview](https://security.microsoft.com)** | Copilot interaction audit logs, third-party AI logs, M365 workload activity | AI-in-One, Chat & Agent, M365 Readiness, PAX | Audit Reader or Compliance Admin |
| **[Viva Insights](https://analysis.insights.cloud.microsoft/)** | Person-level behavioral metrics, collaboration patterns, Copilot usage metrics | Super Usage Analysis, Superuser Impact | Insights Analyst |
| **[Microsoft Entra](https://entra.microsoft.com)** | User attributes, department, org hierarchy, Copilot license status | AI-in-One, Chat & Agent, M365 Readiness, GitHub Copilot Impact | User Administrator or Global Reader |
| **[M365 Admin Center](https://admin.microsoft.com)** | Copilot licensed user list, Agent Registry export | AI-in-One, Chat & Agent | Global Admin or Reports Reader |
| **[GitHub Enterprise](https://github.com/enterprise)** | Copilot usage insights, member list, agent mode stats | GitHub Copilot Impact | Enterprise Owner |

> **💡 Pro tip:** The [PAX scripts](https://github.com/microsoft/PAX) automate the Purview and Entra exports for you — no portal navigation required after initial setup.

---

## 🚀 Get Started

### New to the toolkit?

**Step 1 — Pick your starting question** using the [Which Tool Do I Need?](#-which-tool-do-i-need) table above.

**Step 2 — Check your data access.** Each tool's repository has a detailed prerequisites section. Most require admin-level access to at least one Microsoft portal.

**Step 3 — Download the template.** Every repo has a direct download link for the `.pbit` Power BI template file. Open it in Power BI Desktop, paste in your data file paths, and you're running.

**Step 4 — Use the interpretation guides.** Several repos include PDF guides and storyboard PPTX templates to help you turn raw dashboard output into an executive-ready narrative.

### Automate everything

If you're setting up multiple Purview-based tools, start with [PAX](https://github.com/microsoft/PAX). One script run can pull all the data files that AI-in-One, Chat & Agent Intelligence, and M365 Readiness need — on a schedule, with no manual steps.

### Turn insights into decks automatically

If you're allergic to building PowerPoint decks manually, check out [pbi-to-exec-deck](https://github.com/shailendrahegde/pbi-to-exec-deck) — it turns Power BI report outputs into exec-ready presentations with insights pre-baked. Verify, tweak, ship.

---

## 🔗 Quick Links

<div align="center">

| Repository | Description | Stars | Download |
|:---:|:---:|:---:|:---:|
| [DecodingSuperUsage](https://github.com/microsoft/DecodingSuperUsage) | Super Usage Analysis | [![Stars](https://img.shields.io/github/stars/microsoft/DecodingSuperUsage?style=flat-square&logo=github)](https://github.com/microsoft/DecodingSuperUsage/stargazers) | [↓ ZIP](https://github.com/microsoft/DecodingSuperUsage/archive/refs/heads/main.zip) |
| [superuserimpact](https://github.com/microsoft/superuserimpact) | Superuser Impact Report | [![Stars](https://img.shields.io/github/stars/microsoft/superuserimpact?style=flat-square&logo=github)](https://github.com/microsoft/superuserimpact/stargazers) | [↓ ZIP](https://github.com/microsoft/superuserimpact/archive/refs/heads/main.zip) |
| [customizecopilot](https://github.com/microsoft/customizecopilot) | Power BI Add-on Library | [![Stars](https://img.shields.io/github/stars/microsoft/customizecopilot?style=flat-square&logo=github)](https://github.com/microsoft/customizecopilot/stargazers) | [↓ ZIP](https://github.com/microsoft/customizecopilot/archive/refs/heads/main.zip) |
| [AI-in-One-Dashboard](https://github.com/microsoft/AI-in-One-Dashboard) | All-up Copilot & Agent Dashboard | [![Stars](https://img.shields.io/github/stars/microsoft/AI-in-One-Dashboard?style=flat-square&logo=github)](https://github.com/microsoft/AI-in-One-Dashboard/stargazers) | — |
| [CopilotChatAnalytics](https://github.com/microsoft/CopilotChatAnalytics) | Chat & Agent Intelligence | [![Stars](https://img.shields.io/github/stars/microsoft/CopilotChatAnalytics?style=flat-square&logo=github)](https://github.com/microsoft/CopilotChatAnalytics/stargazers) | — |
| [GitHubCopilotImpact](https://github.com/microsoft/GitHubCopilotImpact) | GitHub Copilot Developer Analytics | [![Stars](https://img.shields.io/github/stars/microsoft/GitHubCopilotImpact?style=flat-square&logo=github)](https://github.com/microsoft/GitHubCopilotImpact/stargazers) | — |
| [M365UsageAnalytics](https://github.com/microsoft/M365UsageAnalytics) | Copilot Readiness & License Strategy | [![Stars](https://img.shields.io/github/stars/microsoft/M365UsageAnalytics?style=flat-square&logo=github)](https://github.com/microsoft/M365UsageAnalytics/stargazers) | [↓ ZIP](https://github.com/microsoft/M365UsageAnalytics/archive/refs/heads/main.zip) |
| [PAX](https://github.com/microsoft/PAX) | Audit Log Automation Scripts | [![Stars](https://img.shields.io/github/stars/microsoft/PAX?style=flat-square&logo=github)](https://github.com/microsoft/PAX/stargazers) | [↓ Latest Release](https://github.com/microsoft/PAX/releases) |

</div>

---

## 👥 About the Team

This hub and all linked repositories are maintained by the **Microsoft Copilot ROI Advisory Team** — a team of analysts, engineers, and change management specialists dedicated to helping organizations measure and accelerate the impact of Microsoft AI.

📧 Feedback, questions, or ideas: [copilot-roi-advisory-team-gh@microsoft.com](mailto:copilot-roi-advisory-team-gh@microsoft.com)

---

## 🤓 Nerd Corner

<details>
<summary><strong>Clone everything, analyze everything, automate everything</strong></summary>

<br>

### Step 1 — Clone all repos in one shot

**PowerShell (Windows — recommended for this toolkit):**

```powershell
$repos = @(
    "DecodingSuperUsage",
    "superuserimpact",
    "customizecopilot",
    "AI-in-One-Dashboard",
    "CopilotChatAnalytics",
    "GitHubCopilotImpact",
    "M365UsageAnalytics",
    "PAX"
)
foreach ($repo in $repos) {
    git clone "https://github.com/microsoft/$repo"
}
```

**Bash / macOS / Linux:**

```bash
for repo in DecodingSuperUsage superuserimpact customizecopilot \
  AI-in-One-Dashboard CopilotChatAnalytics GitHubCopilotImpact \
  M365UsageAnalytics PAX; do
  git clone "https://github.com/microsoft/$repo"
done
```

---

### Step 2 — Open in your editor

```bash
# VS Code
code .

# Cursor
cursor .

# Claude Code
claude
```

All repos will be visible in the file explorer. Each has its own README, PDF guides, PowerShell scripts, PPTX storyboards, and `.pbit` templates ready to explore.

---

### Step 3 — Drop this prompt into your AI tool

Once cloned and open, paste this into Claude Code, Cursor, Copilot, or your AI tool of choice to get an immediate deep-dive across all repos:

```
I've cloned the following Microsoft Analytics Hub repositories locally:

- DecodingSuperUsage — Copilot super user adoption analysis (Viva Insights + Power BI)
- superuserimpact — Super user work pattern impact measurement (Viva Insights + Power BI)
- customizecopilot — Plug-and-play Power BI add-on pages for the above templates
- AI-in-One-Dashboard — All-up Copilot + Agent dashboard (Purview audit logs + Power BI)
- CopilotChatAnalytics — Chat and Agent intelligence reports (Purview + Power BI)
- GitHubCopilotImpact — GitHub Copilot developer analytics (GitHub API + Power BI)
- M365UsageAnalytics — Copilot license readiness and M365 usage scoring (Purview + Power BI)
- PAX — PowerShell scripts for automating Purview and Graph API audit log exports

Please read all README files, PDF interpretation guides, PowerShell scripts, and
any other documentation across these repositories. Then:

1. Summarize what each tool does and how they connect to each other
2. Identify which tools I should set up first based on data I have available
3. Flag all prerequisites, permissions, and dependencies I need to arrange
4. Suggest a setup sequence to get maximum value with minimum effort
5. Identify any gaps — questions these tools don't yet answer
6. Highlight anything in the documentation that could be clearer or improved
```

---

### Step 4 — Supercharge your editor with MCP servers

**MCP (Model Context Protocol)** servers extend AI tools like Claude Code and Cursor to natively read, write, and reason over specific file types. These are the most valuable ones for working across this repo collection:

| MCP Server | Why it's useful here |
|---|---|
| **Filesystem** | Read any local file across all cloned repos without copying paths manually |
| **GitHub** | Browse issues, PRs, releases, and commit history without leaving your editor |
| **PDF** | Read interpretation guides and methodology PDFs directly in your AI tool |
| **DOCX** | Parse Word setup docs and troubleshooting guides |
| **PPTX** | Extract content from storyboard and exec deck templates |
| **XLSX** | Inspect Excel exports and data model files |
| **Doc Co-authoring** | Draft new setup guides, exec summaries, or onboarding docs grounded in repo content |
| **Power BI** | Interact with published reports, datasets, and workspaces via the Power BI REST API |

**For Claude Code users** — install MCP servers via:

```bash
# Official filesystem and GitHub servers
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem /path/to/your/repos
claude mcp add github -- npx -y @modelcontextprotocol/server-github

# Document servers (PDF, DOCX, PPTX, XLSX)
# See: https://github.com/microsoft/markitdown for universal document parsing
```

**For VS Code / Cursor users** — add MCP servers in your editor's settings or via the MCP extension marketplace. See the [MCP server registry](https://github.com/modelcontextprotocol/servers) for the full list of available servers and install instructions.

</details>

---

## 🔔 Stay Updated

The toolkit grows as new tools are released. The best way to stay current:

- ⭐ **Star this repository** to track updates to the hub
- 👀 **Star individual repos** that matter to you for version release notifications
- 🔄 Check back regularly — new templates and features are released on a rolling basis

---

<div align="center">

<br>

*Built with care by the Microsoft Copilot ROI Advisory Team &nbsp;·&nbsp; All tools are open-source under the MIT License*

<br>

[![Star this repo](https://img.shields.io/github/stars/microsoft/Analytics-Hub?style=social)](https://github.com/microsoft/Analytics-Hub/stargazers)

</div>
