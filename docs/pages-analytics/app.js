/* ============================================================
   Pages Analytics · data fetch + render
   Vanilla JS, no deps. Reads ../data/traffic-history.json.
   ============================================================ */

const DATA_URL = "../data/traffic-history.json";

const KNOWN_LABELS = {
  "analytics-hub": {
    title: "Analytics Hub",
    url: "https://microsoft.github.io/Analytics-Hub/",
  },
  "jordan-homepage": {
    title: "Jordan Homepage (incl. Copilot ROI Calculator)",
    url: "https://jordankingisalive.github.io/",
  },
};

// Repos whose actual user-facing site is hosted elsewhere and tracked by a
// different Clarity project. When the row is expanded we surface the linked
// site's metrics so visitors see *real* traffic (the GitHub repo row alone
// would only show repo-page views, which dramatically understates reach).
const LINKED_SITES = {
  "jordankingisalive/CopilotROICalculator": {
    siteKey: "jordan-homepage",
    siteTitle: "Copilot ROI Calculator (live site)",
    siteUrl: "https://jordankingisalive.github.io/CopilotROICalculator/",
    // Optional regex/prefix used to filter page titles + referrers down to
    // just the ROI Calculator subset of the host site.
    pageTitleMatch: /ROI Calculator|ROI Projections|Adoption Journey|Changelog/i,
  },
};

// Cache for sites snapshots, populated on load.
let SITES_CACHE = {};

// Quick preview numbers used by the row-pill teaser. Reads from a manual
// baseline export when present (wider window, e.g. 14d), otherwise falls
// back to the latest Clarity snapshot (rolling 3-day window).
function previewLinkedSiteNumbers(linked) {
  const slice = resolveLinkedSiteSlice(linked);
  if (!slice) return null;
  const traffic = slice.metrics.find(m => m.metricName === "Traffic")?.information?.[0] || {};
  const sessions = parseInt(traffic.totalSessionCount, 10);
  const users    = parseInt(traffic.distinctUserCount, 10);
  return {
    syncedAt:   slice.syncedAt,
    windowDays: slice.windowDays,
    source:     slice.source,
    sessions:   isNaN(sessions) ? null : sessions,
    users:      isNaN(users)    ? null : users,
  };
}

// Returns the broadest available data slice for a linked site:
//   { metrics: [...], syncedAt, windowDays, source }
// Prefers the manual baseline if its windowDays exceeds the latest
// snapshot's window (snapshots default to 3-day rolling).
function resolveLinkedSiteSlice(linked) {
  const site = SITES_CACHE[linked.siteKey];
  if (!site) return null;
  const baseline = site.baseline || null;
  const dates = Object.keys(site.snapshots || {}).sort();
  const latestDate = dates[dates.length - 1];
  const latestMetrics = latestDate ? site.snapshots[latestDate] : null;
  const snapshotWindow = 3; // numOfDays used by snapshotter

  if (baseline && (baseline.windowDays || 0) >= snapshotWindow) {
    return {
      metrics:    baseline.metrics || [],
      syncedAt:   baseline.syncedAt,
      windowDays: baseline.windowDays,
      source:     baseline.source || "Clarity baseline",
    };
  }
  if (latestMetrics) {
    return {
      metrics:    latestMetrics,
      syncedAt:   latestDate,
      windowDays: snapshotWindow,
      source:     "Clarity rolling snapshot",
    };
  }
  return null;
}

// ------------------------------------------------------------ utilities

const fmt = (n) => (n == null ? "—" : n.toLocaleString());

const pad = (n) => String(n).padStart(2, "0");
const todayUTC = () => new Date();

const startOfYear  = () => `${todayUTC().getUTCFullYear()}-01-01`;
const startOfNDaysAgo = (n) => {
  const d = todayUTC();
  d.setUTCDate(d.getUTCDate() - (n - 1)); // inclusive N days
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

const WINDOWS = {
  "14d": { label: "Last 14 days", short: "14d", since: () => startOfNDaysAgo(14) },
  "30d": { label: "Last 30 days", short: "30d", since: () => startOfNDaysAgo(30) },
  "ytd": { label: "Year to date", short: "YTD", since: startOfYear },
};
const windowState = { key: "14d" };
const currentSince = () => WINDOWS[windowState.key].since();
const currentShort = () => WINDOWS[windowState.key].short;

function sumDaily(dailyMap, sinceDate) {
  // dailyMap: { "YYYY-MM-DD": { count, uniques } }
  // sinceDate: inclusive lower bound (string compare works for ISO dates).
  if (!dailyMap) return { count: null, uniques: null, days: 0 };
  let count = 0;
  let uniques = 0;
  let days = 0;
  let seen = false;
  for (const [day, v] of Object.entries(dailyMap)) {
    if (sinceDate && day < sinceDate) continue;
    seen = true;
    days += 1;
    count   += v?.count   || 0;
    uniques += v?.uniques || 0;
  }
  return seen ? { count, uniques, days } : { count: null, uniques: null, days: 0 };
}

function viewsTrend(dailyMap, sinceDate) {
  if (!dailyMap) return [];
  return Object.entries(dailyMap)
    .filter(([day]) => !sinceDate || day >= sinceDate)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, v]) => v?.count ?? 0);
}

function sparkline(values, w = 80, h = 24) {
  if (!values || values.length < 2) {
    return `<span class="spark-empty" style="color:var(--text-muted);font-size:.75em">–</span>`;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = w / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${pts.join(" L ")}`;
  const last = pts[pts.length - 1].split(",");
  return `
    <svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-label="trend">
      <path d="${path}" />
      <circle cx="${last[0]}" cy="${last[1]}" r="2" />
    </svg>`;
}

// ------------------------------------------------------------ render

function renderLastUpdated(lastUpdated) {
  const el = document.getElementById("last-updated");
  if (!lastUpdated) {
    el.textContent = "No snapshots yet. The nightly job will populate this page on its first run.";
    return;
  }
  const d = new Date(lastUpdated);
  el.textContent = `Last updated ${d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

function renderHero(repos) {
  const since = currentSince();
  const short = currentShort();
  let stars = 0, forks = 0, watchers = 0, views = 0, clones = 0, count = 0;
  for (const repo of Object.values(repos)) {
    count += 1;
    const meta = repo.meta || {};
    stars    += meta.stars    || 0;
    forks    += meta.forks    || 0;
    watchers += meta.watchers || 0;
    const v = sumDaily(repo.dailyViews,  since).count;
    const c = sumDaily(repo.dailyClones, since).count;
    if (v != null) views  += v;
    if (c != null) clones += c;
  }
  document.querySelector('[data-kpi="stars"]').textContent    = fmt(stars);
  document.querySelector('[data-kpi="forks"]').textContent    = fmt(forks);
  document.querySelector('[data-kpi="watchers"]').textContent = fmt(watchers);
  document.querySelector('[data-kpi="views"]').textContent    = fmt(views);
  document.querySelector('[data-kpi="clones"]').textContent   = fmt(clones);
  document.querySelector('[data-kpi="repos"]').textContent    = fmt(count);
  document.querySelectorAll('[data-window-label]').forEach((el) => { el.textContent = short; });
}

function rowsFromRepos(repos) {
  const since = currentSince();
  return Object.entries(repos).map(([fullName, repo]) => {
    const [owner, name] = fullName.split("/");
    const meta = repo.meta || {};
    const v = sumDaily(repo.dailyViews,  since);
    const c = sumDaily(repo.dailyClones, since);
    const trend = viewsTrend(repo.dailyViews, since);
    return {
      fullName,
      owner,
      name,
      stars:        meta.stars    ?? null,
      forks:        meta.forks    ?? null,
      watchers:     meta.watchers ?? null,
      views:        v.count,
      uniqueViews:  v.uniques,
      clones:       c.count,
      uniqueClones: c.uniques,
      daysTracked:  v.days || c.days,
      trend,
      hasTraffic:   v.count != null || c.count != null,
      referrers:    repo.referrers || [],
      paths:        repo.paths     || [],
      linkedSite:   LINKED_SITES[fullName] || null,
      linkedSitePreview: null, // filled in by renderTable from SITES_CACHE
    };
  });
}

const tableState = { sortKey: "stars", dir: "desc", rows: [] };

function compare(a, b, key) {
  if (key === "repo") {
    return a.fullName.localeCompare(b.fullName);
  }
  if (key === "trend") {
    return (a.trend.length || 0) - (b.trend.length || 0);
  }
  const av = a[key] ?? -1;
  const bv = b[key] ?? -1;
  return av - bv;
}

function renderTable() {
  const tbody = document.getElementById("repo-tbody");
  const sorted = [...tableState.rows].sort((a, b) => {
    const r = compare(a, b, tableState.sortKey);
    return tableState.dir === "asc" ? r : -r;
  });

  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">No repos in history yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = sorted.map((r, i) => {
    const hasMeta = r.stars != null || r.forks != null || r.watchers != null;
    let note = "";
    if (!hasMeta) {
      note = `<span class="skip-note" title="GitHub returned 404 — likely SSO not authorized for this org, or repo is private"> · no data (check SSO)</span>`;
    } else if (!r.hasTraffic) {
      note = `<span class="skip-note" title="No push access — public meta only"> · public meta only</span>`;
    }

    // Compute live-site preview numbers (sessions + users) from latest Clarity snapshot
    let pillHtml = "";
    if (r.linkedSite) {
      const preview = previewLinkedSiteNumbers(r.linkedSite);
      r.linkedSitePreview = preview; // cache for the detail panel
      if (preview && preview.sessions != null) {
        const winLabel = preview.windowDays >= 7 ? `${preview.windowDays}d` : `${preview.windowDays || 3}d`;
        pillHtml = `<span class="linked-site-pill has-numbers" title="Live site tracked by Microsoft Clarity · window: last ${winLabel}">· live site: <strong>${fmt(preview.users)}</strong> users · <strong>${fmt(preview.sessions)}</strong> sessions (${winLabel})</span>`;
      } else {
        pillHtml = `<span class="linked-site-pill" title="Live site tracked separately by Microsoft Clarity">+ live site traffic</span>`;
      }
    }

    return `
      <tr class="repo-row${r.linkedSite ? ' has-linked-site' : ''}" data-idx="${i}" title="Click to expand traffic detail">
        <td class="repo-name">
          <span class="row-chevron" aria-hidden="true">›</span>
          <a href="https://github.com/${r.fullName}" target="_blank" rel="noopener" data-stop-row-click="1">${r.name}</a>
          <span class="repo-owner">${r.owner}</span>${note}
          ${pillHtml}
        </td>
        <td class="num">${fmt(r.stars)}</td>
        <td class="num">${fmt(r.forks)}</td>
        <td class="num">${fmt(r.watchers)}</td>
        <td class="num">${fmt(r.views)}</td>
        <td class="num">${fmt(r.clones)}</td>
        <td class="num">${sparkline(r.trend)}</td>
      </tr>
    `;
  }).join("");

  // Header sort indicators
  document.querySelectorAll("#repo-table thead th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.sort === tableState.sortKey) {
      th.classList.add(tableState.dir === "asc" ? "sort-asc" : "sort-desc");
    }
  });

  // Row expansion
  tbody.querySelectorAll('a[data-stop-row-click]').forEach((a) => {
    a.addEventListener('click', (e) => e.stopPropagation());
  });
  tbody.querySelectorAll(".repo-row").forEach((row) => {
    row.addEventListener("click", () => {
      const idx = parseInt(row.dataset.idx, 10);
      const r = sorted[idx];
      const next = row.nextElementSibling;
      if (next && next.classList.contains("detail-row")) {
        next.remove();
        row.classList.remove("is-open");
        return;
      }
      // Close other open details
      tbody.querySelectorAll(".detail-row").forEach((d) => d.remove());
      tbody.querySelectorAll(".repo-row.is-open").forEach((d) => d.classList.remove("is-open"));
      const detail = document.createElement("tr");
      detail.className = "detail-row";
      detail.innerHTML = `<td colspan="7">${renderRepoDetail(r)}</td>`;
      row.parentNode.insertBefore(detail, row.nextSibling);
      row.classList.add("is-open");
    });
  });

  // Auto-expand the first linked-site row on initial render so the rich
  // Clarity data is visible without requiring a click. Only fires once per
  // table render (re-renders from sort/window change re-trigger it).
  const firstLinkedRow = tbody.querySelector(".repo-row.has-linked-site");
  if (firstLinkedRow && !tableState.autoExpandedKey) {
    firstLinkedRow.click();
    tableState.autoExpandedKey = sorted[parseInt(firstLinkedRow.dataset.idx, 10)]?.fullName;
  }
}

function renderRepoDetail(r) {
  const referrers = r.referrers ?? [];
  const paths     = r.paths     ?? [];

  const refList = referrers.length
    ? referrers.slice(0, 10).map(x =>
        `<li><span>${x.referrer}</span><span>${fmt(x.count)}</span></li>`).join("")
    : `<li><span class="empty" style="padding:0">No referrer data</span></li>`;

  const pathList = paths.length
    ? paths.slice(0, 10).map(x =>
        `<li><span>${(x.title || x.path).slice(0, 60)}</span><span>${fmt(x.count)}</span></li>`).join("")
    : `<li><span class="empty" style="padding:0">No path data</span></li>`;

  const linkedHtml = r.linkedSite ? renderLinkedSiteDetail(r.linkedSite) : '';

  return `
    <div class="detail-grid">
      <div>
        <h4>Top referrers · GitHub repo (14d)</h4>
        <ul>${refList}</ul>
      </div>
      <div>
        <h4>Popular paths · GitHub repo (14d)</h4>
        <ul>${pathList}</ul>
      </div>
    </div>
    ${linkedHtml}
  `;
}

// Render a rich panel of Clarity-based metrics for a repo whose hosted site
// lives elsewhere (e.g. CopilotROICalculator -> jordan-homepage).
function renderLinkedSiteDetail(linked) {
  const site = SITES_CACHE[linked.siteKey];
  const slice = resolveLinkedSiteSlice(linked);
  if (!site || !slice) {
    return `<div class="linked-site-panel">
      <div class="linked-site-header">
        <h3>📊 ${linked.siteTitle} · <span class="linked-site-source">Clarity</span></h3>
        <a class="linked-site-cta" href="${linked.siteUrl}" target="_blank" rel="noopener">Open live site ↗</a>
      </div>
      <p class="empty" style="padding:.5rem 0">No Clarity snapshot yet for the linked site.</p>
    </div>`;
  }
  const latest = slice.metrics;
  const windowDays = slice.windowDays || 3;
  const windowLabel = windowDays >= 7 ? `Last ${windowDays} days` : `Last ${windowDays} days (rolling)`;
  const syncedDate = (slice.syncedAt || "").slice(0, 10);

  const findMetric = (name) => latest.find(m => m.metricName === name);
  const traffic       = findMetric("Traffic")?.information?.[0] || {};
  const engagement    = findMetric("EngagementTime")?.information?.[0] || {};
  const scrollDepth   = findMetric("ScrollDepth")?.information?.[0]?.averageScrollDepth;
  const deadClicks    = findMetric("DeadClickCount")?.information?.[0] || {};
  const rageClicks    = findMetric("RageClickCount")?.information?.[0] || {};
  const scriptErrors  = findMetric("ScriptErrorCount")?.information?.[0] || {};
  const pageTitles    = findMetric("PageTitle")?.information || [];
  const referrerUrls  = findMetric("ReferrerUrl")?.information || [];
  const countries     = findMetric("Country")?.information || [];
  const browsers      = findMetric("Browser")?.information || [];
  const devices       = findMetric("Device")?.information || [];
  const operatingSys  = findMetric("OS")?.information || [];
  const smartEvents   = findMetric("SmartEvents")?.information || [];
  const performance   = findMetric("Performance")?.information?.[0] || null;

  // Filter page titles to ROI Calculator subset if a matcher is supplied.
  const filteredTitles = linked.pageTitleMatch
    ? pageTitles.filter(p => linked.pageTitleMatch.test(p.name || ""))
    : pageTitles;

  const focusedSessions = filteredTitles.reduce((sum, p) => {
    const n = parseInt(p.sessionsCount, 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const fmtTime = (s) => {
    const n = parseInt(s, 10);
    if (!n) return "—";
    if (n < 60) return `${n}s`;
    const m = Math.floor(n / 60);
    const rem = n % 60;
    return rem ? `${m}m ${rem}s` : `${m}m`;
  };

  const list = (items, key = "name", valKey = "sessionsCount", limit = 6, transform) =>
    items.length
      ? items.slice(0, limit).map(x => {
          const label = transform ? transform(x[key]) : (x[key] || "—");
          return `<li><span>${label}</span><span>${fmt(parseInt(x[valKey], 10))}</span></li>`;
        }).join("")
      : `<li><span class="empty" style="padding:0">No data</span></li>`;

  const cleanRef = (url) => {
    if (!url) return "(direct / unknown)";
    try { return new URL(url).hostname + new URL(url).pathname.replace(/\/$/, ""); }
    catch { return url; }
  };

  return `
    <div class="linked-site-panel">
      <div class="linked-site-header">
        <div>
          <h3>📊 ${linked.siteTitle}</h3>
          <p class="linked-site-source"><strong>${windowLabel}</strong> from Microsoft Clarity · project <code>${site.projectId}</code> · synced ${syncedDate}${windowDays >= 7 ? ' · <em>manual export</em>' : ''}</p>
        </div>
        <a class="linked-site-cta" href="${linked.siteUrl}" target="_blank" rel="noopener">Open live site ↗</a>
      </div>

      <div class="linked-kpi-grid">
        <div class="linked-kpi"><span class="linked-kpi-label">Sessions</span><span class="linked-kpi-value">${fmt(parseInt(traffic.totalSessionCount, 10))}</span></div>
        <div class="linked-kpi"><span class="linked-kpi-label">Distinct users</span><span class="linked-kpi-value">${fmt(parseInt(traffic.distinctUserCount, 10))}</span></div>
        ${linked.pageTitleMatch ? `<div class="linked-kpi"><span class="linked-kpi-label">${linked.focusedLabel || 'Filtered sessions'}</span><span class="linked-kpi-value">${fmt(focusedSessions)}</span></div>` : ''}
        <div class="linked-kpi"><span class="linked-kpi-label">Avg scroll depth</span><span class="linked-kpi-value">${scrollDepth != null ? Math.round(scrollDepth) + "%" : "—"}</span></div>
        <div class="linked-kpi"><span class="linked-kpi-label">Active time</span><span class="linked-kpi-value">${fmtTime(engagement.activeTime)}</span></div>
        <div class="linked-kpi"><span class="linked-kpi-label">Bot sessions</span><span class="linked-kpi-value">${fmt(parseInt(traffic.totalBotSessionCount, 10))}</span></div>
      </div>

      <div class="linked-detail-grid">
        <div>
          <h4>${linked.pageTitleMatch ? 'Pages viewed (ROI Calculator pages)' : 'Top pages viewed'}</h4>
          <ul>${list(filteredTitles.length ? filteredTitles : pageTitles)}</ul>
        </div>
        <div>
          <h4>Top referrers</h4>
          <ul>${list(referrerUrls.slice(0, 8), "name", "sessionsCount", 8, cleanRef)}</ul>
        </div>
        ${smartEvents.length ? `<div>
          <h4>Smart events (engagement signals)</h4>
          <ul>${list(smartEvents, "name", "sessionsCount", 8)}</ul>
        </div>` : ''}
        <div>
          <h4>Browser</h4>
          <ul>${list(browsers)}</ul>
        </div>
        ${countries.length ? `<div>
          <h4>Country</h4>
          <ul>${list(countries)}</ul>
        </div>` : ''}
        ${(devices.length || operatingSys.length) ? `<div>
          <h4>Device · OS</h4>
          <ul>${list(devices)}${list(operatingSys, "name", "sessionsCount", 4)}</ul>
        </div>` : ''}
        <div>
          <h4>UX health signals</h4>
          <ul>
            <li><span>Dead clicks (sessions)</span><span>${fmt(parseInt(deadClicks.pagesViews, 10))}</span></li>
            <li><span>Rage clicks (sessions)</span><span>${fmt(parseInt(rageClicks.pagesViews, 10))}</span></li>
            <li><span>Script errors (events)</span><span>${fmt(parseInt(scriptErrors.subTotal, 10))}</span></li>
          </ul>
        </div>
        ${performance ? `<div>
          <h4>Performance (Core Web Vitals)</h4>
          <ul>
            <li><span>Score</span><span>${performance.score}/100</span></li>
            <li><span>LCP</span><span>${performance.lcpSeconds}s</span></li>
            <li><span>INP</span><span>${performance.inpMilliseconds}ms</span></li>
            <li><span>CLS</span><span>${performance.cls}</span></li>
          </ul>
        </div>` : ''}
      </div>
    </div>
  `;
}

function renderRepoCards(rows) {
  const wrap = document.getElementById("repo-cards");
  if (!rows.length) {
    wrap.innerHTML = `<p class="empty">No repos in history yet.</p>`;
    return;
  }
  const short = currentShort();
  wrap.innerHTML = rows.map((r) => `
    <div class="repo-card">
      <h3>
        <a href="https://github.com/${r.fullName}" target="_blank" rel="noopener">${r.name}</a>
      </h3>
      <div class="meta-row">
        <span>⭐ <strong>${fmt(r.stars)}</strong></span>
        <span>🍴 <strong>${fmt(r.forks)}</strong></span>
        <span>👁 <strong>${fmt(r.watchers)}</strong></span>
      </div>
      <div class="meta-row">
        <span>Views (${short}): <strong>${fmt(r.views)}</strong></span>
      </div>
      <div class="meta-row">
        <span>Clones (${short}): <strong>${fmt(r.clones)}</strong></span>
      </div>
      <div class="sparkline-wrap">
        <div class="sparkline-label">Daily views · ${r.daysTracked || 0} days in window</div>
        ${sparkline(r.trend, 280, 36)}
      </div>
    </div>
  `).join("");
}

function renderSites(sites) {
  const wrap = document.getElementById("site-grid");
  const entries = Object.entries(sites || {});
  if (!entries.length) {
    wrap.innerHTML = `<p class="empty">No Clarity data yet. The nightly job will populate this once tokens are set in the workflow.</p>`;
    return;
  }

  // Reuse the same rich linked-site detail panel for every hosted site so
  // the Analytics Hub home gets the same KPI grid + smart events panel
  // treatment as the Copilot ROI Calculator (it's our own product after all).
  wrap.innerHTML = entries.map(([label, site]) => {
    const info  = KNOWN_LABELS[label] || { title: label, url: "" };
    const linked = {
      siteKey:   label,
      siteTitle: info.title,
      siteUrl:   info.url,
      // No pageTitleMatch → panel shows the unfiltered "Top pages viewed" view.
    };
    return renderLinkedSiteDetail(linked);
  }).join("");
}

// ------------------------------------------------------------ boot

async function load() {
  let history;
  try {
    const resp = await fetch(DATA_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    history = await resp.json();
  } catch (err) {
    document.getElementById("last-updated").textContent =
      `Failed to load traffic data: ${err.message}`;
    return;
  }

  const reposData = history.repos || {};
  SITES_CACHE = history.sites || {};
  renderLastUpdated(history.lastUpdated);

  const rerenderAll = () => {
    renderHero(reposData);
    tableState.rows = rowsFromRepos(reposData);
    renderTable();
    renderRepoCards(tableState.rows);
  };
  rerenderAll();
  renderSites(history.sites || {});

  // Window switcher
  document.querySelectorAll("[data-window]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.window;
      if (!WINDOWS[key] || key === windowState.key) return;
      windowState.key = key;
      document.querySelectorAll("[data-window]").forEach((b) => {
        b.classList.toggle("active", b.dataset.window === key);
      });
      rerenderAll();
    });
  });

  // Sort header clicks
  document.querySelectorAll("#repo-table thead th").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      if (!key) return;
      if (tableState.sortKey === key) {
        tableState.dir = tableState.dir === "asc" ? "desc" : "asc";
      } else {
        tableState.sortKey = key;
        tableState.dir = key === "repo" ? "asc" : "desc";
      }
      renderTable();
    });
  });
}

load();
