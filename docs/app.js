/* ============================================================
   Analytics Hub · interactive landing page
   ============================================================ */

// ----------------------------------------------------- DATA: tools
const TOOLS = [
  {
    id: 'super-usage',
    icon: '⚡',
    accent: '#0078d4',
    title: 'Super Usage Adoption',
    sub: 'Decode how Copilot super users emerge, then scale their patterns across your org.',
    dataSource: 'Viva Insights',
    type: 'Power BI Template',
    filters: ['viva'],
    audience: ['ccm','exec'],
    goals: ['discover'],
    repo: 'https://github.com/microsoft/DecodingSuperUsage',
    download: 'https://github.com/microsoft/DecodingSuperUsage/archive/refs/heads/main.zip',
  },
  {
    id: 'super-user-impact',
    icon: '🏆',
    accent: '#00B294',
    title: 'Super User Impact',
    sub: 'Measure the real work-pattern impact of your Copilot super users.',
    dataSource: 'Viva Insights',
    type: 'Power BI Template',
    filters: ['viva'],
    audience: ['exec','ccm'],
    goals: ['measure'],
    repo: 'https://github.com/microsoft/superuserimpact',
    download: 'https://github.com/microsoft/superuserimpact/archive/refs/heads/main.zip',
  },
  {
    id: 'chat-agent',
    icon: '💬',
    accent: '#8661c5',
    title: 'Copilot Chat & Agent Intelligence',
    sub: 'Free, audit-log-powered analytics for Copilot Chat and Agent usage.',
    dataSource: 'Purview + Entra',
    type: 'Power BI Template',
    filters: ['purview'],
    audience: ['it','exec'],
    goals: ['discover','measure'],
    repo: 'https://github.com/microsoft/CopilotChatAnalytics',
    download: 'https://github.com/microsoft/CopilotChatAnalytics/archive/refs/heads/main.zip',
  },
  {
    id: 'ai-in-one',
    icon: '🤖',
    accent: '#e3008c',
    title: 'AI-in-One Dashboard',
    sub: 'One Power BI dashboard for all Microsoft Copilot and Agent adoption signals.',
    dataSource: 'Purview + Entra',
    type: 'Power BI Template',
    filters: ['purview'],
    audience: ['exec','it'],
    goals: ['discover','measure'],
    repo: 'https://github.com/microsoft/AI-in-One-Dashboard',
    download: 'https://github.com/microsoft/AI-in-One-Dashboard/archive/refs/heads/main.zip',
  },
  {
    id: 'm365-readiness',
    icon: '🎯',
    accent: '#FFB900',
    title: 'M365 Copilot Readiness Report',
    sub: 'User-level Microsoft 365 adoption and Copilot readiness, powered by Purview audit logs.',
    dataSource: 'Purview + Entra',
    type: 'Power BI Template',
    filters: ['purview'],
    audience: ['it'],
    goals: ['license'],
    repo: 'https://github.com/microsoft/M365UsageAnalytics',
    download: 'https://github.com/microsoft/M365UsageAnalytics/archive/refs/heads/main.zip',
  },
  {
    id: 'ghcp-impact',
    icon: '⚙️',
    accent: '#24292f',
    title: 'GitHub Copilot Impact',
    sub: 'See how developers build habits with GitHub Copilot, and the impact on real work.',
    dataSource: 'GitHub Enterprise',
    type: 'Power BI Template',
    filters: ['github'],
    audience: ['dev'],
    goals: ['discover','measure'],
    repo: 'https://github.com/microsoft/GitHubCopilotImpact',
    download: 'https://github.com/microsoft/GitHubCopilotImpact/archive/refs/heads/main.zip',
  },
  {
    id: 'adoption-sentiment',
    icon: '💛',
    accent: '#FFB900',
    title: 'Adoption & Sentiment Report',
    sub: 'M365 Copilot adoption combined with employee sentiment survey signals.',
    dataSource: 'M365 Admin + Survey',
    type: 'Power BI Template',
    filters: ['purview','addon'],
    audience: ['exec','ccm'],
    goals: ['measure'],
    repo: 'https://github.com/olivierpecheux/copilot-adoption-sentiment-report',
    download: 'https://github.com/olivierpecheux/copilot-adoption-sentiment-report/archive/refs/heads/main.zip',
  },
  {
    id: 'pax',
    icon: '🛡️',
    accent: '#6264a7',
    title: 'PAX: Portable Audit eXporter',
    sub: 'Enterprise-grade portable exporter for Microsoft 365 audit logs (Purview), Entra directory data, Copilot and beyond.',
    dataSource: 'Purview + Entra (Microsoft Graph)',
    type: 'PowerShell Script',
    filters: ['purview','addon'],
    audience: ['it'],
    goals: ['automate'],
    repo: 'https://github.com/microsoft/PAX',
    download: 'https://github.com/microsoft/PAX/archive/refs/heads/main.zip',
  },
  {
    id: 'customize',
    icon: '🧩',
    accent: '#4cc2ff',
    title: 'CustomizeCopilot: Add-on Library',
    sub: 'Drop-in add-on pages and customizations for the Copilot analytics templates.',
    dataSource: 'Viva Insights',
    type: 'Add-on Library',
    filters: ['viva','addon'],
    audience: ['ccm','it'],
    goals: ['extend'],
    repo: 'https://github.com/microsoft/customizecopilot',
    download: 'https://github.com/microsoft/customizecopilot/archive/refs/heads/main.zip',
  },
];

// ----------------------------------------------------- RENDER: cards
function renderCards(filter = 'all') {
  const grid = document.getElementById('cardGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const visible = filter === 'all' ? TOOLS : TOOLS.filter(t => t.filters.includes(filter));
  visible.forEach(t => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.setProperty('--card-accent', t.accent);
    el.innerHTML = `
      <div class="card-icon">${t.icon}</div>
      <div class="card-tags">
        <span class="card-tag">${t.dataSource}</span>
        <span class="card-tag">${t.type}</span>
      </div>
      <h3 class="card-title">${t.title}</h3>
      <p class="card-sub">${t.sub}</p>
      <div class="card-meta">
        <div><strong>${t.dataSource}</strong><span>Data source</span></div>
        <div><strong>${t.type}</strong><span>Asset type</span></div>
      </div>
      <div class="card-links">
        <a class="primary" href="${t.repo}" target="_blank" rel="noopener">View Repository →</a>
        <a href="${t.download}" target="_blank" rel="noopener">⬇ Download</a>
      </div>
    `;
    grid.appendChild(el);
  });
}

// ----------------------------------------------------- FILTER
document.querySelectorAll('.filter-pill').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCards(btn.dataset.filter);
  });
});

// ----------------------------------------------------- PICKER
const pickerState = { datasource: null, audience: null, goal: null };

function scoreTool(tool) {
  let score = 0;
  if (pickerState.datasource && pickerState.datasource !== 'any') {
    if (tool.filters.includes(pickerState.datasource)) score += 3;
    else score -= 1;
  }
  if (pickerState.audience && tool.audience.includes(pickerState.audience)) score += 2;
  if (pickerState.goal && tool.goals.includes(pickerState.goal)) score += 3;
  return score;
}

function updatePickerResult() {
  const { datasource, audience, goal } = pickerState;
  if (!datasource || !audience || !goal) return;

  const card = document.getElementById('pickerResultCard');
  if (!card) return;

  const ranked = [...TOOLS].map(t => ({ tool: t, score: scoreTool(t) })).sort((a,b) => b.score - a.score);
  const best = ranked[0].tool;

  card.style.setProperty('--card-accent', best.accent);
  card.style.borderColor = best.accent;
  card.innerHTML = `
    <div class="card-icon" style="--card-accent:${best.accent};">${best.icon}</div>
    <h3>${best.title}</h3>
    <p>${best.sub}</p>
    <div class="card-links">
      <a class="primary" href="${best.repo}" target="_blank" rel="noopener">View Repository →</a>
      <a href="${best.download}" target="_blank" rel="noopener">⬇ Download</a>
    </div>
  `;
  const wrap = document.getElementById('pickerResult');
  wrap.hidden = false;
  wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

document.querySelectorAll('.picker-question').forEach(q => {
  const key = q.dataset.question;
  q.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      q.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      pickerState[key] = chip.dataset.value;
      updatePickerResult();
    });
  });
});

document.getElementById('pickerReset')?.addEventListener('click', () => {
  pickerState.datasource = pickerState.audience = pickerState.goal = null;
  document.querySelectorAll('.picker .chip').forEach(c => c.classList.remove('selected'));
  const pr = document.getElementById('pickerResult'); if (pr) pr.hidden = true;
});

// ----------------------------------------------------- THEME
const themeToggle = document.getElementById('themeToggle');
const stored = localStorage.getItem('theme');
const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
const initialTheme = stored || preferred;
document.documentElement.setAttribute('data-theme', initialTheme);
themeToggle.textContent = initialTheme === 'dark' ? '☀' : '◐';

themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeToggle.textContent = next === 'dark' ? '☀' : '◐';
});

// ----------------------------------------------------- INIT
renderCards();
