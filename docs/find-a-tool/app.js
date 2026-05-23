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
    source: "Viva Insights",
    sourceKey: "Viva Insights",
    repo: "https://github.com/microsoft/DecodingSuperUsage",
    download: "https://github.com/microsoft/DecodingSuperUsage/archive/refs/heads/main.zip",
    emailFile: "04_Super_User_Adoption_Admin_Email.txt",
    blurb: "Decode how Copilot super users emerge in your org — what they use, how habits form, and where to focus enablement to scale them.",
  },
  {
    id: 'super-user-impact',
    question: "What's the measurable impact of super users on work patterns?",
    title: "Super User Impact",
    icon: "🏆",
    accent: "#00B294",
    source: "Viva Insights",
    sourceKey: "Viva Insights",
    repo: "https://github.com/microsoft/superuserimpact",
    download: "https://github.com/microsoft/superuserimpact/archive/refs/heads/main.zip",
    emailFile: "05_Super_User_Impact_Admin_Email.txt",
    blurb: "Quantify the work-pattern shift that Copilot super users produce — collaboration, focus time, meeting load — vs comparable peers.",
  },
  {
    id: 'chat-agent',
    question: "How are people using Copilot Chat and Agents across our org?",
    title: "Copilot Chat & Agent Intelligence",
    icon: "💬",
    accent: "#8661c5",
    source: "Purview + Entra",
    sourceKey: "Purview",
    repo: "https://github.com/microsoft/CopilotChatAnalytics",
    download: "https://github.com/microsoft/CopilotChatAnalytics/archive/refs/heads/main.zip",
    emailFile: "02_Chat_Intelligence_Admin_Email.txt",
    secondaryEmailFile: "03_Agent_Intelligence_Admin_Email.txt",
    blurb: "Audit-log-powered Power BI templates that show Copilot Chat and Agent activity by user, app, department — without third-party analytics.",
  },
  {
    id: 'ai-in-one',
    question: "I want a single dashboard showing all Copilot and Agent activity.",
    title: "AI-in-One Dashboard",
    icon: "🤖",
    accent: "#e3008c",
    source: "Purview + Entra",
    sourceKey: "Purview",
    repo: "https://github.com/microsoft/AI-in-One-Dashboard",
    download: "https://github.com/microsoft/AI-in-One-Dashboard/archive/refs/heads/main.zip",
    emailFile: "01_AI_in_One_Dashboard_Admin_Email.txt",
    blurb: "One Power BI report unifying Microsoft 365 Copilot, Copilot Chat (licensed + unlicensed), agents, and third-party AI activity.",
  },
  {
    id: 'ghcp-impact',
    question: "How are developers adopting GitHub Copilot?",
    title: "GitHub Copilot Impact",
    icon: "⚙️",
    accent: "#24292f",
    source: "GitHub Enterprise",
    sourceKey: "GitHub",
    repo: "https://github.com/microsoft/GitHubCopilotImpact",
    download: "https://github.com/microsoft/GitHubCopilotImpact/archive/refs/heads/main.zip",
    emailFile: "06_GitHub_Copilot_Impact_Admin_Email.txt",
    blurb: "Per-team and per-user GitHub Copilot usage — chat vs agent, language, model, acceptance rates — straight from the Enterprise API.",
  },
  {
    id: 'what-i-did',
    question: "What did I personally build with GitHub Copilot this week — and what's the leverage?",
    title: "What I Did: Copilot Impact Report",
    icon: "📝",
    accent: "#4cc2ff",
    source: "Local Copilot sessions",
    sourceKey: "Local",
    repo: "https://github.com/microsoft/What-I-Did-Copilot",
    download: "https://github.com/microsoft/What-I-Did-Copilot/archive/refs/heads/main.zip",
    blurb: "Personal-leverage report — points your local Copilot session logs at a script to summarize what shipped, where Copilot helped, and at what multiplier.",
  },
  {
    id: 'm365-readiness',
    question: "Which users should get Copilot licenses next?",
    title: "M365 Copilot Readiness Report",
    icon: "🎯",
    accent: "#FFB900",
    source: "Purview + Entra",
    sourceKey: "Purview",
    repo: "https://github.com/microsoft/M365UsageAnalytics",
    download: "https://github.com/microsoft/M365UsageAnalytics/archive/refs/heads/main.zip",
    emailFile: "07_M365_Copilot_Readiness_Admin_Email.txt",
    blurb: "Rank users by Microsoft 365 fluency to surface the strongest next candidates for a Copilot license — defensible, audit-log-based.",
  },
  {
    id: 'adoption-sentiment',
    question: "How do employees feel about Copilot, and does that match actual usage?",
    title: "Adoption & Sentiment Report",
    icon: "💛",
    accent: "#FFB900",
    source: "M365 Admin + Survey",
    sourceKey: "M365 Admin",
    repo: "https://github.com/olivierpecheux/copilot-adoption-sentiment-report",
    download: "https://github.com/olivierpecheux/copilot-adoption-sentiment-report/archive/refs/heads/main.zip",
    blurb: "Cross M365 Copilot adoption data with employee sentiment survey signals — perception vs reality in one view.",
  },
  {
    id: 'pax',
    question: "How do I automate pulling audit logs without manual exports?",
    title: "PAX: Portable Audit eXporter",
    icon: "🛡️",
    accent: "#6264a7",
    source: "Microsoft Graph API",
    sourceKey: "Graph API",
    repo: "https://github.com/microsoft/PAX",
    download: "https://github.com/microsoft/PAX/archive/refs/heads/main.zip",
    blurb: "Enterprise-grade PowerShell exporter for Microsoft 365 audit logs. Handles billions of events, no row limits, lands data wherever you need it.",
  },
  {
    id: 'roi-calc',
    question: "I want to model Copilot ROI scenarios from a CSV — no Power BI, no install.",
    title: "M365 Copilot Productivity ROI Calculator",
    icon: "🧮",
    accent: "#0078d4",
    source: "CSV export (browser-only)",
    sourceKey: "CSV",
    repo: "https://github.com/jordankingisalive/CopilotROICalculator",
    download: "https://github.com/jordankingisalive/CopilotROICalculator/archive/refs/heads/main.zip",
    blurb: "Browser-only ROI modeler. Drop in a CSV export, sweep assumptions, generate a defensible value story — no Power BI required.",
  },
  {
    id: 'customize',
    question: "I want to add custom pages or extend my Viva Insights reports.",
    title: "CustomizeCopilot Add-on Library",
    icon: "🧩",
    accent: "#4cc2ff",
    source: "Viva Insights",
    sourceKey: "Viva Insights",
    repo: "https://github.com/microsoft/customizecopilot",
    download: "https://github.com/microsoft/customizecopilot/archive/refs/heads/main.zip",
    blurb: "Drop-in Power BI add-on pages and visualizations that extend the Viva Insights-based templates with custom views.",
  },
];

// ----------------------------------------------------- helpers
function ghPreview(repoUrl) {
  // GitHub's auto-generated social preview card
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return `https://opengraph.githubassets.com/1/${m[1]}/${m[2]}`;
}

function repoSlug(repoUrl) {
  const m = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  return m ? m[1] : repoUrl;
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
  return `
    <tr class="row-main" data-id="${t.id}" data-src="${t.sourceKey}" data-search="${(t.question + ' ' + t.title + ' ' + t.source).toLowerCase()}">
      <td class="col-q"><button class="expand-btn" aria-expanded="false" aria-controls="detail-${t.id}"><span class="chev" aria-hidden="true">▸</span> ${t.question}</button></td>
      <td class="col-tool"><span class="tool-chip" style="--c:${t.accent}"><span class="tool-icon" aria-hidden="true">${t.icon}</span> ${t.title}</span></td>
      <td class="col-src"><span class="src-tag">${t.source}</span></td>
      <td class="col-actions">
        <a class="ico-btn" href="${t.repo}" target="_blank" rel="noopener" title="View on GitHub" aria-label="View on GitHub">↗</a>
        <a class="ico-btn" href="${t.download}" title="Download .zip" aria-label="Download zip">⬇</a>
        ${t.emailFile ? `<button class="ico-btn email-btn" data-email="${t.emailFile}" title="Email your admin" aria-label="Email your admin">📧</button>` : ''}
      </td>
    </tr>
    <tr class="row-detail" id="detail-${t.id}" hidden>
      <td colspan="4">
        <div class="detail-grid">
          <div class="detail-preview">
            <a href="${t.repo}" target="_blank" rel="noopener" class="preview-link">
              <img loading="lazy" src="${ghPreview(t.repo)}" alt="${t.title} repository preview" />
            </a>
            <p class="repo-slug"><code>${slug}</code></p>
          </div>
          <div class="detail-copy">
            <p class="blurb">${t.blurb}</p>
            <div class="detail-ctas">
              <a class="btn btn-primary" href="${t.repo}" target="_blank" rel="noopener">View repository →</a>
              <a class="btn btn-ghost" href="${t.download}">⬇ Download .zip</a>
              ${t.emailFile ? `<button class="btn btn-soft email-btn" data-email="${t.emailFile}">📧 Email your admin</button>` : ''}
              ${t.secondaryEmailFile ? `<button class="btn btn-soft email-btn" data-email="${t.secondaryEmailFile}">📧 Email (Agent variant)</button>` : ''}
            </div>
            <p class="data-line"><strong>Data source:</strong> ${t.source}</p>
          </div>
        </div>
      </td>
    </tr>`;
}

function render() {
  const body = document.getElementById('pickerBody');
  body.innerHTML = TOOLS.map(rowHtml).join('');
  wireExpand();
  wireEmail();
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
  const src = activePill ? activePill.dataset.src : 'all';
  let shown = 0;
  document.querySelectorAll('.row-main').forEach(row => {
    const detail = document.getElementById(`detail-${row.dataset.id}`);
    const matchSrc = src === 'all' || row.dataset.src === src;
    const matchQ = !q || row.dataset.search.includes(q);
    const visible = matchSrc && matchQ;
    row.style.display = visible ? '' : 'none';
    if (detail) detail.style.display = visible ? '' : 'none';
    if (visible) shown++;
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
});
