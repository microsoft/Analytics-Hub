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

// ------------------------------------------------------------ week-over-week

// Find the latest YYYY-MM-DD that appears in any repo's dailyViews/dailyClones.
// We anchor the rolling windows to this date so the comparison stays meaningful
// even if today's nightly snapshot hasn't run yet.
function findLatestDataDate(repos) {
  let latest = null;
  for (const repo of Object.values(repos)) {
    for (const map of [repo.dailyViews, repo.dailyClones]) {
      if (!map) continue;
      for (const day of Object.keys(map)) {
        if (!latest || day > latest) latest = day;
      }
    }
  }
  return latest;
}

// Shift an ISO date string YYYY-MM-DD by n days.
function shiftDay(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

// Sum a daily map across an inclusive [from, to] window.
function sumWindow(dailyMap, from, to) {
  if (!dailyMap) return { count: 0, uniques: 0 };
  let count = 0, uniques = 0;
  for (const [day, v] of Object.entries(dailyMap)) {
    if (day < from || day > to) continue;
    count   += v?.count   || 0;
    uniques += v?.uniques || 0;
  }
  return { count, uniques };
}

// Formats a friendly "May 23 – May 29" range from two ISO dates.
function fmtRange(from, to) {
  const opts = { month: "short", day: "numeric" };
  const a = new Date(`${from}T00:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: "UTC" });
  const b = new Date(`${to}T00:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: "UTC" });
  return `${a} – ${b}`;
}

// Render a delta cell with arrow, absolute change, and percent.
// `prev=0, curr>0` → "new"; `prev=0, curr=0` → "—".
function deltaCell(curr, prev) {
  if (!prev && !curr) return `<td class="num delta-flat">—</td>`;
  if (!prev && curr > 0) {
    return `<td class="num delta-up delta-new" title="No traffic in prior week">+${fmt(curr)} <span class="delta-tag">new</span></td>`;
  }
  const diff = curr - prev;
  const pct  = (diff / prev) * 100;
  const sign = diff > 0 ? "+" : diff < 0 ? "−" : "";
  const cls  = diff > 0 ? "delta-up" : diff < 0 ? "delta-down" : "delta-flat";
  const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "·";
  const pctStr = isFinite(pct) ? `${sign}${Math.abs(pct).toFixed(0)}%` : "";
  return `<td class="num ${cls}"><span class="delta-arrow">${arrow}</span> ${sign}${fmt(Math.abs(diff))} <span class="delta-pct">${pctStr}</span></td>`;
}

const wowState = { sortKey: "deltaViews", dir: "desc", rows: [], curr: null, prev: null };

function wowCompare(a, b, key) {
  if (key === "repo") return a.fullName.localeCompare(b.fullName);
  const av = a[key] ?? -Infinity;
  const bv = b[key] ?? -Infinity;
  return av - bv;
}

function renderWoW(repos) {
  const tbody = document.getElementById("wow-tbody");
  const tfoot = document.getElementById("wow-tfoot");
  if (!tbody) return;

  const anchor = findLatestDataDate(repos);
  if (!anchor) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty">No daily traffic data yet.</td></tr>`;
    return;
  }
  const currTo   = anchor;
  const currFrom = shiftDay(anchor, -6);
  const prevTo   = shiftDay(anchor, -7);
  const prevFrom = shiftDay(anchor, -13);
  wowState.curr = { from: currFrom, to: currTo };
  wowState.prev = { from: prevFrom, to: prevTo };

  document.getElementById("wow-curr-label").textContent = `current week (${fmtRange(currFrom, currTo)})`;
  document.getElementById("wow-prev-label").textContent = `previous week (${fmtRange(prevFrom, prevTo)})`;

  const rows = Object.entries(repos).map(([fullName, repo]) => {
    const [owner, name] = fullName.split("/");
    const cv = sumWindow(repo.dailyViews,  currFrom, currTo);
    const pv = sumWindow(repo.dailyViews,  prevFrom, prevTo);
    const cc = sumWindow(repo.dailyClones, currFrom, currTo);
    const pc = sumWindow(repo.dailyClones, prevFrom, prevTo);
    return {
      fullName, owner, name,
      currViews:    cv.count,    prevViews:    pv.count,    deltaViews:    cv.count - pv.count,
      currUniques:  cv.uniques,  prevUniques:  pv.uniques,  deltaUniques:  cv.uniques - pv.uniques,
      currClones:   cc.count,    prevClones:   pc.count,    deltaClones:   cc.count - pc.count,
      hasAny: (cv.count + pv.count + cc.count + pc.count) > 0,
    };
  }).filter(r => r.hasAny);

  wowState.rows = rows;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty">No traffic in the last 14 days.</td></tr>`;
    if (tfoot) tfoot.innerHTML = "";
    return;
  }

  const sorted = [...rows].sort((a, b) => {
    const r = wowCompare(a, b, wowState.sortKey);
    return wowState.dir === "asc" ? r : -r;
  });

  tbody.innerHTML = sorted.map(r => `
    <tr>
      <td class="repo-name">
        <a href="https://github.com/${r.fullName}" target="_blank" rel="noopener">${r.name}</a>
        <span class="repo-owner">${r.owner}</span>
      </td>
      <td class="num">${fmt(r.currViews)}</td>
      <td class="num">${fmt(r.prevViews)}</td>
      ${deltaCell(r.currViews,   r.prevViews)}
      <td class="num">${fmt(r.currUniques)}</td>
      <td class="num">${fmt(r.prevUniques)}</td>
      ${deltaCell(r.currUniques, r.prevUniques)}
      <td class="num">${fmt(r.currClones)}</td>
      <td class="num">${fmt(r.prevClones)}</td>
      ${deltaCell(r.currClones,  r.prevClones)}
    </tr>
  `).join("");

  // Totals footer
  const tot = rows.reduce((acc, r) => {
    acc.cv += r.currViews;   acc.pv += r.prevViews;
    acc.cu += r.currUniques; acc.pu += r.prevUniques;
    acc.cc += r.currClones;  acc.pc += r.prevClones;
    return acc;
  }, { cv:0, pv:0, cu:0, pu:0, cc:0, pc:0 });
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="wow-totals">
        <td><strong>Total · ${rows.length} repos</strong></td>
        <td class="num"><strong>${fmt(tot.cv)}</strong></td>
        <td class="num"><strong>${fmt(tot.pv)}</strong></td>
        ${deltaCell(tot.cv, tot.pv)}
        <td class="num"><strong>${fmt(tot.cu)}</strong></td>
        <td class="num"><strong>${fmt(tot.pu)}</strong></td>
        ${deltaCell(tot.cu, tot.pu)}
        <td class="num"><strong>${fmt(tot.cc)}</strong></td>
        <td class="num"><strong>${fmt(tot.pc)}</strong></td>
        ${deltaCell(tot.cc, tot.pc)}
      </tr>`;
  }

  // Sort indicators
  document.querySelectorAll("#wow-table thead th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
    if (th.dataset.wowSort === wowState.sortKey) {
      th.classList.add(wowState.dir === "asc" ? "sort-asc" : "sort-desc");
    }
  });
}

// ------------------------------------------------------------ multi-line chart

const ML_PALETTE = [
  "#0078d4", "#e3008c", "#8661c5", "#107c10", "#d83b01",
  "#00b294", "#ffb900", "#5c2d91", "#038387", "#b4009e",
  "#498205", "#ca5010", "#0099bc", "#881798", "#797775",
];

const multilineState = {
  metric: "views",   // views | uniques | clones
  window: "30d",     // 14d | 30d | 90d | all
  hidden: new Set(), // fullNames the user toggled off
};

function pickDailyMap(repo, metric) {
  if (metric === "clones") return repo.dailyClones || {};
  return repo.dailyViews || {};
}
function pickDailyVal(entry, metric) {
  if (!entry) return 0;
  if (metric === "uniques") return entry.uniques || 0;
  return entry.count || 0;
}

function computeMultilineDomain(repos, metric, windowKey) {
  // Collect union of date strings across repos.
  const allDates = new Set();
  for (const repo of Object.values(repos)) {
    const map = pickDailyMap(repo, metric);
    for (const d of Object.keys(map)) allDates.add(d);
  }
  if (!allDates.size) return { dates: [], from: null, to: null };

  const sorted = Array.from(allDates).sort();
  const to = sorted[sorted.length - 1];
  let from;
  if (windowKey === "all") {
    from = sorted[0];
  } else {
    const days = windowKey === "14d" ? 14 : windowKey === "90d" ? 90 : 30;
    from = shiftDay(to, -(days - 1));
  }
  // Build full continuous date list from `from` to `to`.
  const dates = [];
  let cursor = from < sorted[0] ? sorted[0] : from;
  // Ensure cursor is a real ISO; cap to actual data range.
  while (cursor <= to) {
    dates.push(cursor);
    cursor = shiftDay(cursor, 1);
  }
  return { dates, from: dates[0], to };
}

function buildMultilineSeries(repos, dates, metric) {
  return Object.entries(repos)
    .map(([fullName, repo]) => {
      const map = pickDailyMap(repo, metric);
      const values = dates.map(d => pickDailyVal(map[d], metric));
      const total  = values.reduce((a, b) => a + b, 0);
      const [, name] = fullName.split("/");
      return { fullName, name, values, total };
    })
    .filter(s => s.total > 0)
    .sort((a, b) => b.total - a.total);
}

function renderMultiline(repos) {
  const host = document.getElementById("multiline-chart");
  const legendHost = document.getElementById("multiline-legend");
  if (!host || !legendHost) return;

  const { metric, window: windowKey, hidden } = multilineState;
  const domain = computeMultilineDomain(repos, metric, windowKey);
  if (!domain.dates.length) {
    host.innerHTML = `<p class="empty">No data yet.</p>`;
    legendHost.innerHTML = "";
    return;
  }

  const series = buildMultilineSeries(repos, domain.dates, metric);
  if (!series.length) {
    host.innerHTML = `<p class="empty">No traffic in this window.</p>`;
    legendHost.innerHTML = "";
    return;
  }

  // Layout
  const W = Math.max(600, host.clientWidth || 800);
  const H = 360;
  const padL = 48, padR = 16, padT = 16, padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  // Y max across visible series
  const visible = series.filter(s => !hidden.has(s.fullName));
  const yMax = Math.max(1, ...visible.flatMap(s => s.values));
  const niceMax = niceCeil(yMax);

  const N = domain.dates.length;
  const xStep = N > 1 ? plotW / (N - 1) : 0;
  const xAt = (i) => padL + i * xStep;
  const yAt = (v) => padT + plotH - (v / niceMax) * plotH;

  // Y gridlines (5 ticks)
  const ticks = 5;
  let gridLines = "";
  let yLabels = "";
  for (let t = 0; t <= ticks; t++) {
    const v = (niceMax / ticks) * t;
    const y = yAt(v);
    gridLines += `<line x1="${padL}" x2="${W - padR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="ml-grid"/>`;
    yLabels   += `<text x="${padL - 8}" y="${(y + 4).toFixed(1)}" class="ml-axis-label" text-anchor="end">${fmt(Math.round(v))}</text>`;
  }

  // X labels (~6 across)
  const labelCount = Math.min(6, N);
  let xLabels = "";
  if (labelCount > 1) {
    for (let k = 0; k < labelCount; k++) {
      const i = Math.round(k * (N - 1) / (labelCount - 1));
      const x = xAt(i);
      const d = domain.dates[i];
      const dt = new Date(`${d}T00:00:00Z`);
      const label = dt.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
      xLabels += `<text x="${x.toFixed(1)}" y="${H - padB + 18}" class="ml-axis-label" text-anchor="middle">${label}</text>`;
    }
  }

  // Series paths
  let paths = "";
  series.forEach((s, idx) => {
    const color = ML_PALETTE[idx % ML_PALETTE.length];
    s.color = color;
    if (hidden.has(s.fullName)) return;
    const d = s.values.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
    paths += `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" data-series="${s.fullName}"/>`;
  });

  // Hover overlay: vertical guide + dots + tooltip
  const overlay = `
    <line class="ml-guide" id="ml-guide" x1="0" x2="0" y1="${padT}" y2="${padT + plotH}" style="display:none"/>
    <g id="ml-hover-dots"></g>
    <rect class="ml-hit" x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="transparent"/>
  `;

  host.innerHTML = `
    <svg id="ml-svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Daily ${metric} by repo">
      ${gridLines}
      ${yLabels}
      ${xLabels}
      ${paths}
      ${overlay}
    </svg>
    <div class="ml-tooltip" id="ml-tooltip" style="display:none"></div>
  `;

  // Legend (clickable to toggle)
  legendHost.innerHTML = series.map((s) => {
    const off = hidden.has(s.fullName);
    return `
      <button type="button" class="ml-legend-item ${off ? 'is-off' : ''}" data-series="${s.fullName}" title="${s.fullName} — total ${fmt(s.total)}">
        <span class="ml-legend-swatch" style="background:${s.color}"></span>
        <span class="ml-legend-name">${s.name}</span>
        <span class="ml-legend-total">${fmt(s.total)}</span>
      </button>
    `;
  }).join("");
  legendHost.querySelectorAll(".ml-legend-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const k = btn.dataset.series;
      if (hidden.has(k)) hidden.delete(k); else hidden.add(k);
      renderMultiline(repos);
    });
  });

  // Hover behavior
  const svg = document.getElementById("ml-svg");
  const guide = document.getElementById("ml-guide");
  const dotsG = document.getElementById("ml-hover-dots");
  const tip = document.getElementById("ml-tooltip");
  const wrap = document.getElementById("multiline-wrap");

  const onMove = (evt) => {
    const rect = svg.getBoundingClientRect();
    const scale = rect.width / W;
    const xInSvg = (evt.clientX - rect.left) / scale;
    if (xInSvg < padL || xInSvg > padL + plotW) {
      guide.style.display = "none";
      dotsG.innerHTML = "";
      tip.style.display = "none";
      return;
    }
    const i = Math.round((xInSvg - padL) / Math.max(xStep, 0.0001));
    const idx = Math.max(0, Math.min(N - 1, i));
    const xPx = xAt(idx);
    guide.setAttribute("x1", xPx);
    guide.setAttribute("x2", xPx);
    guide.style.display = "";

    const visibleSeries = series.filter(s => !hidden.has(s.fullName));
    dotsG.innerHTML = visibleSeries.map(s =>
      `<circle cx="${xPx.toFixed(1)}" cy="${yAt(s.values[idx]).toFixed(1)}" r="3" fill="${s.color}" stroke="#fff" stroke-width="1"/>`
    ).join("");

    const date = domain.dates[idx];
    const dt = new Date(`${date}T00:00:00Z`);
    const dateLabel = dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    const sortedRows = [...visibleSeries].sort((a, b) => b.values[idx] - a.values[idx]).slice(0, 12);
    tip.innerHTML = `
      <div class="ml-tip-date">${dateLabel}</div>
      <ul>
        ${sortedRows.map(s => `<li><span class="ml-tip-sw" style="background:${s.color}"></span><span class="ml-tip-name">${s.name}</span><span class="ml-tip-val">${fmt(s.values[idx])}</span></li>`).join("")}
      </ul>
    `;
    tip.style.display = "";
    // Position tooltip inside wrap
    const wrapRect = wrap.getBoundingClientRect();
    const tipW = tip.offsetWidth;
    let left = evt.clientX - wrapRect.left + 14;
    if (left + tipW > wrap.clientWidth - 8) left = evt.clientX - wrapRect.left - tipW - 14;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top  = `${evt.clientY - wrapRect.top + 14}px`;
  };
  const onLeave = () => {
    guide.style.display = "none";
    dotsG.innerHTML = "";
    tip.style.display = "none";
  };
  svg.addEventListener("mousemove", onMove);
  svg.addEventListener("mouseleave", onLeave);
}

function niceCeil(v) {
  if (v <= 10) return Math.ceil(v / 2) * 2;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
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
  renderWoW(reposData);
  renderMultiline(reposData);
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

  // WoW sort header clicks
  document.querySelectorAll("#wow-table thead th").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.wowSort;
      if (!key) return;
      if (wowState.sortKey === key) {
        wowState.dir = wowState.dir === "asc" ? "desc" : "asc";
      } else {
        wowState.sortKey = key;
        wowState.dir = key === "repo" ? "asc" : "desc";
      }
      renderWoW(reposData);
    });
  });

  // Multiline metric + window controls
  document.querySelectorAll(".ml-metric-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const m = btn.dataset.metric;
      if (!m || m === multilineState.metric) return;
      multilineState.metric = m;
      document.querySelectorAll(".ml-metric-btn").forEach(b => b.classList.toggle("active", b.dataset.metric === m));
      renderMultiline(reposData);
    });
  });
  document.querySelectorAll(".ml-window-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const w = btn.dataset.mlWindow;
      if (!w || w === multilineState.window) return;
      multilineState.window = w;
      document.querySelectorAll(".ml-window-btn").forEach(b => b.classList.toggle("active", b.dataset.mlWindow === w));
      renderMultiline(reposData);
    });
  });
  window.addEventListener("resize", () => {
    clearTimeout(window.__mlResizeT);
    window.__mlResizeT = setTimeout(() => renderMultiline(reposData), 150);
  });

  // Page-level tab switcher (Summary / Comparisons)
  const tabBtns = document.querySelectorAll(".page-tab");
  const tabPanels = {
    summary:     document.getElementById("tab-summary"),
    comparisons: document.getElementById("tab-comparisons"),
  };
  const activateTab = (key) => {
    if (!tabPanels[key]) return;
    tabBtns.forEach(b => {
      const on = b.dataset.tab === key;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    Object.entries(tabPanels).forEach(([k, panel]) => {
      if (!panel) return;
      if (k === key) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
    // Persist + sync hash
    try { localStorage.setItem("pages-analytics-tab", key); } catch (_) {}
    if (key !== "summary") {
      history.replaceState(null, "", `#${key}`);
    } else if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    // The multiline chart needs a re-render when it becomes visible (clientWidth
    // is 0 while the tab is hidden).
    if (key === "comparisons") {
      requestAnimationFrame(() => renderMultiline(reposData));
    }
  };
  tabBtns.forEach(b => b.addEventListener("click", () => activateTab(b.dataset.tab)));

  // Restore tab from hash > localStorage > default
  let initialTab = "summary";
  if (location.hash === "#comparisons") initialTab = "comparisons";
  else {
    try {
      const saved = localStorage.getItem("pages-analytics-tab");
      if (saved && tabPanels[saved]) initialTab = saved;
    } catch (_) {}
  }
  activateTab(initialTab);
}

load();
