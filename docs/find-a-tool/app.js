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
    preview: "https://raw.githubusercontent.com/microsoft/DecodingSuperUsage/refs/heads/DecodingSuperUsage/images/SuperUser.gif",
    blurb: "Power BI template on Viva Insights person-query data. Profiles your super users — what they use, how habits form, where they cluster — so you can replicate the pattern.",
    meta: { audience: "CCMs, enablement leads, execs", license: "Viva Insights", time: "30 min once query is staged" },
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
    preview: "https://raw.githubusercontent.com/microsoft/superuserimpact/main/images/report-preview.gif",
    blurb: "Companion to Super Usage Adoption. Quantifies the work-pattern delta super users produce — collaboration, focus time, meeting load — vs comparable peers. Same Viva query feeds both.",
    meta: { audience: "Execs, change leads, HR analytics", license: "Viva Insights", time: "Re-uses the Super Usage query" },
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
    preview: "https://raw.githubusercontent.com/microsoft/AI-in-One-Dashboard/main/Images/AIO%20v10%20Gif.gif",
    blurb: "One unified Power BI report covering Microsoft 365 Copilot, Copilot Chat (licensed + unlicensed), Agents, and third-party AI signals. The flagship if you only deploy one template.",
    meta: { audience: "Execs, IT leadership, program leads", license: "Audit Reader + Entra read + M365 Admin export", time: "~1–2 hours for first build" },
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
    preview: "https://raw.githubusercontent.com/microsoft/CopilotChatAnalytics/refs/heads/main/Images/ChatIntelGIG.gif",
    blurb: "Two Power BI templates on Purview audit logs + Entra: one for Copilot Chat (licensed + unlicensed), one for Agents. By user, app, department — no third-party analytics, no data leaves the tenant.",
    meta: { audience: "IT admins, Copilot champions, BVAs", license: "Audit Reader on Purview + Entra read", time: "~1 hour incl. data export" },
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
    preview: "https://raw.githubusercontent.com/microsoft/GitHubCopilotImpact/main/assets/ghcpgif.gif",
    blurb: "Per-team and per-user GitHub Copilot usage — chat vs agent, language, model, acceptance rates — pulled straight from the GitHub Enterprise REST API.",
    meta: { audience: "Developer productivity leads, eng managers, BVAs", license: "GitHub Enterprise admin (Copilot metrics API)", time: "~30 min once token is issued" },
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
    preview: "https://raw.githubusercontent.com/microsoft/What-I-Did-Copilot/main/docs/images/sample-report.gif",
    blurb: "Personal-leverage report. Points a script at your local VS Code / Copilot session logs and summarizes what shipped, where Copilot helped, and the multiplier on your week.",
    meta: { audience: "Individual devs, IC leads, demo storytelling", license: "None — runs locally", time: "~5 minutes" },
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
    blurb: "Ranks every user by Microsoft 365 fluency (Outlook, Word, Excel, PowerPoint, Teams) so you can defend your next Copilot license wave with audit data, not gut feel.",
    meta: { audience: "License owners, IT, finance partners", license: "Audit Reader + Entra read", time: "~45 min for first run" },
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
    preview: "https://raw.githubusercontent.com/olivierpecheux/copilot-adoption-sentiment-report/main/images/adoption-overview.png",
    blurb: "Crosses M365 Copilot adoption stats with employee sentiment survey results. Reveals where perception and reality diverge — the gap is where change management lives.",
    meta: { audience: "Change managers, comms, exec sponsors", license: "M365 Admin report access + survey export", time: "~30 min" },
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
    blurb: "Enterprise-grade PowerShell exporter for Microsoft 365 audit logs. Handles billions of events, no row limits, lands data wherever you need it — lake, warehouse, BI. The automation layer behind the Purview templates.",
    meta: { audience: "IT automation, security ops, data engineering", license: "App registration + Graph API permissions", time: "~1 hour incl. app registration" },
  },
  {
    id: 'roi-calc',
    question: "I want to model Copilot ROI scenarios from a CSV — no Power BI, no install.",
    title: "M365 Copilot Productivity ROI Calculator",
    icon: "🧮",
    accent: "#0078d4",
    source: "Viva Insights (via Super Usage Heatmap CSV)",
    sourceKey: "Viva Insights",
    repo: "https://github.com/jordankingisalive/CopilotROICalculator",
    download: "https://github.com/jordankingisalive/CopilotROICalculator/archive/refs/heads/main.zip",
    blurb: "Browser-only ROI modeler. Drop in the heatmap CSV exported from Super Usage Adoption (which itself runs on Viva Insights), sweep assumptions, generate a defensible value story — zero install, no Power BI.",
    meta: { audience: "BVAs, finance partners, exec sponsors", license: "None for the calc — upstream needs Viva Insights", time: "~10 min once heatmap CSV is in hand" },
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
    blurb: "Drop-in Power BI add-on pages and visualizations that extend the Viva Insights-based templates with custom views — Champion ID, segment overlays, more.",
    meta: { audience: "BI developers, advanced template owners", license: "Whatever the parent template needs", time: "~15 min per add-on" },
  },
];

// ----------------------------------------------------- helpers
function repoSlug(repoUrl) {
  const m = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
  return m ? m[1] : repoUrl;
}

function previewHtml(t) {
  if (t.preview) {
    return `<img loading="lazy" src="${t.preview}" alt="${t.title} preview"
              onerror="this.parentElement.classList.add('preview-fallback');this.remove();" />
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
  return `
    <tr class="row-main" data-id="${t.id}" data-src="${t.sourceKey}" data-search="${(t.question + ' ' + t.title + ' ' + t.source).toLowerCase()}">
      <td class="col-q"><button class="expand-btn" aria-expanded="false" aria-controls="detail-${t.id}"><span class="chev" aria-hidden="true">▸</span> ${t.question}</button></td>
      <td class="col-tool"><a class="tool-chip" href="${t.repo}" target="_blank" rel="noopener" style="--c:${t.accent}" title="Open ${t.title} on GitHub"><span class="tool-icon" aria-hidden="true">${t.icon}</span> ${t.title} <span class="chip-arrow" aria-hidden="true">↗</span></a></td>
      <td class="col-src"><span class="src-tag">${t.source}</span></td>
      <td class="col-actions">
        <a class="ico-btn" href="${t.repo}" target="_blank" rel="noopener" title="View on GitHub" aria-label="View on GitHub">↗</a>
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
                  <img loading="lazy" src="${t.preview}" alt="${t.title} preview" onerror="this.parentElement.classList.add('preview-fallback');this.parentElement.removeAttribute('data-preview');this.remove();" />
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
  wireLightbox();
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
