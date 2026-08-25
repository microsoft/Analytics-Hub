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

// Sub-app URL family mapping. Substring match against Clarity's Url
// dimension, case-insensitive. Order matters — the first match wins so
// list the more-specific patterns before broader ones.
const SUB_APP_FAMILIES = [
  { label: "Cowork Chargeback",    needle: "cowork-chargeback" },
  { label: "Cowork Policy Helper", needle: "cowork-policy-helper" },
  { label: "Cowork Usage Tracker", needle: "cowork-usage-tracker" },
  { label: "Cowork FinOps",        needle: "finops-cowork" },
  { label: "Cowork Billing hub",   needle: "cowork-billing/" },
];

const COWORK_EXCLUDED_REPOS = new Set([
  "microsoft/what-i-did-with-cowork",
]);

const COWORK_REPO_HINTS = [
  /cowork/i,
  /copilotroicalculator/i,
  /roi[-_ ]?calculator/i,
  /billing/i,
];

const COWORK_WEB_HINTS = [
  /cowork/i,
  /billing/i,
  /copilotroicalculator/i,
  /roi[-_ ]?calculator/i,
];

/* Which cowork tool a Clarity URL belongs to, and how far the visitor got.
 *
 * The stage is read out of the query string because Clarity's Data Export API
 * returns a URL dimension but will not return custom events, so a click on
 * "View Demo" is invisible to this page unless it changes the URL. cwk-events.js
 * writes ?demo=1 when sample data is loaded and ?report=1 when a report is built
 * from a real upload, both via history.replaceState, which Clarity proxies and
 * treats as a new page view.
 *
 * Anything with neither flag is someone who arrived and did not load data. That
 * is a real and useful third state, not a gap. */
const COWORK_APPS = [
  { key: "multi-budget", label: "Multi-Budget Chargeback", needle: "multi-budget-chargeback" },
  { key: "healthcare", label: "Healthcare Chargeback (redirect)", needle: "healthcare-chargeback" },
  { key: "chargeback", label: "Chargeback Report", needle: "cowork-chargeback" },
  { key: "policy-helper", label: "Policy Helper", needle: "cowork-policy-helper" },
  { key: "usage-tracker", label: "Usage Tracker", needle: "cowork-usage-tracker" },
  { key: "roi-model", label: "Cohort ROI Model", needle: "cowork-roi-model" },
  { key: "finops", label: "FinOps / FOCUS", needle: "finops-cowork" },
];

/* The first nightly snapshot that can contain mode-tagged URLs.
 *
 * Tagging shipped on 2026-08-21, after that morning's 07:34 UTC snapshot had
 * already run, so 08-21 carries none of it. Dating the constant to the deploy
 * day rather than the first clean snapshot would fold a pre-tagging day into
 * the figures and report it as measured. */
const COWORK_MODE_TAGGING_SINCE = "2026-08-22";

/* The day the update feed and the /updates/ page went live. Same reasoning as
   above: before this the page did not exist, so an empty figure means not yet
   measured rather than nobody visited. */
const FEED_LIVE_SINCE = "2026-08-25";

function coworkApp(url) {
  const u = String(url || "").toLowerCase();
  for (const a of COWORK_APPS) if (u.includes(a.needle)) return a;
  return null;
}

function coworkStage(url) {
  const u = String(url || "").toLowerCase();
  if (/[?&]demo=1(?:&|$)/.test(u)) return "demo";
  if (/[?&]report=1(?:&|$)/.test(u)) return "real";
  return "landing";
}

const COWORK_CORRELATION_SERIES = [
  { label: "FinOps", needle: "finops-cowork", color: "#7c3aed" },
  { label: "Chargeback", needle: "cowork-chargeback", color: "#0ea5e9" },
  { label: "Policy Helper", needle: "cowork-policy-helper", color: "#f97316" },
  { label: "GitHub PBIT repo views", color: "#16a34a" },
];

function parseIntSafe(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

function matchesAny(text, patterns) {
  if (!text) return false;
  return patterns.some((rx) => rx.test(String(text)));
}

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

// Earliest date for which we have any GitHub traffic data. Nightly snapshot job
// first ran 2026-05-23 and GitHub backfilled the 14-day rolling window to
// 2026-05-08. Earlier dates are physically impossible to display.
const ANALYTICS_COVERAGE_START = "2026-05-08";

const WINDOWS = {
  "3d":     { label: "Last 3 days",  short: "3d",     days: 3,    since: () => startOfNDaysAgo(3) },
  "7d":     { label: "Last 7 days",  short: "7d",     days: 7,    since: () => startOfNDaysAgo(7) },
  "14d":    { label: "Last 14 days", short: "14d",    days: 14,   since: () => startOfNDaysAgo(14) },
  "30d":    { label: "Last 30 days", short: "30d",    days: 30,   since: () => startOfNDaysAgo(30) },
  "ytd":    { label: "Year to date", short: "YTD",    days: null, since: startOfYear },
  "custom": { label: "Custom range", short: "Custom", days: null, since: () => windowState.customSince || ANALYTICS_COVERAGE_START },
};
const windowState = { key: "14d", customSince: null, customUntil: null };
const currentSince = () => WINDOWS[windowState.key].since();
const currentUntil = () => (windowState.key === "custom" ? (windowState.customUntil || null) : null);
const currentShort = () => WINDOWS[windowState.key].short;
/* Day count for the selected window, or null for open-ended ranges. Clarity
   data is a series of daily snapshots rather than a summable daily total, so
   it needs the span in days rather than a since-date to pick how many
   snapshots to read. */
const currentWindowDays = () => {
  const w = WINDOWS[windowState.key];
  if (w.days) return w.days;
  const since = currentSince();
  const until = currentUntil() || `${todayUTC().getUTCFullYear()}-${pad(todayUTC().getUTCMonth() + 1)}-${pad(todayUTC().getUTCDate())}`;
  const ms = new Date(until + "T00:00:00Z") - new Date(since + "T00:00:00Z");
  return Math.max(1, Math.round(ms / 86400000) + 1);
};

function sumDaily(dailyMap, sinceDate, untilDate) {
  // dailyMap: { "YYYY-MM-DD": { count, uniques } }
  // sinceDate / untilDate: inclusive bounds (string compare works for ISO dates).
  if (!dailyMap) return { count: null, uniques: null, days: 0 };
  let count = 0;
  let uniques = 0;
  let days = 0;
  let seen = false;
  for (const [day, v] of Object.entries(dailyMap)) {
    if (sinceDate && day < sinceDate) continue;
    if (untilDate && day > untilDate) continue;
    seen = true;
    days += 1;
    count   += v?.count   || 0;
    uniques += v?.uniques || 0;
  }
  return seen ? { count, uniques, days } : { count: null, uniques: null, days: 0 };
}

function viewsTrend(dailyMap, sinceDate, untilDate) {
  if (!dailyMap) return [];
  return Object.entries(dailyMap)
    .filter(([day]) => (!sinceDate || day >= sinceDate) && (!untilDate || day <= untilDate))
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
  const until = currentUntil();
  const short = currentShort();
  let stars = 0, forks = 0, watchers = 0, views = 0, clones = 0, count = 0;
  let downloads = 0, reposWithReleases = 0;
  for (const repo of Object.values(repos)) {
    count += 1;
    const meta = repo.meta || {};
    stars    += meta.stars    || 0;
    forks    += meta.forks    || 0;
    watchers += meta.watchers || 0;
    const v = sumDaily(repo.dailyViews,  since, until).count;
    const c = sumDaily(repo.dailyClones, since, until).count;
    if (v != null) views  += v;
    if (c != null) clones += c;
    if (repo.releases && repo.releases.totalDownloads) {
      downloads += repo.releases.totalDownloads;
      reposWithReleases += 1;
    }
  }
  document.querySelector('[data-kpi="stars"]').textContent    = fmt(stars);
  document.querySelector('[data-kpi="forks"]').textContent    = fmt(forks);
  document.querySelector('[data-kpi="watchers"]').textContent = fmt(watchers);
  document.querySelector('[data-kpi="views"]').textContent    = fmt(views);
  document.querySelector('[data-kpi="clones"]').textContent   = fmt(clones);
  document.querySelector('[data-kpi="repos"]').textContent    = fmt(count);

  /* Release downloads are a lifetime cumulative count from GitHub, not a
     windowed figure, so the card is labelled as such rather than inheriting
     the 14d window label the views and clones cards carry. */
  const dlEl = document.querySelector('[data-kpi="downloads"]');
  if (dlEl) dlEl.textContent = downloads ? fmt(downloads) : "—";
  const dlFoot = document.querySelector('[data-kpi="downloads-foot"]');
  if (dlFoot) {
    dlFoot.textContent = reposWithReleases
      ? `GitHub · lifetime, ${reposWithReleases} repo${reposWithReleases === 1 ? "" : "s"} with releases`
      : "GitHub · no releases published";
  }
  document.querySelectorAll('[data-window-label]').forEach((el) => { el.textContent = short; });
}

function rowsFromRepos(repos) {
  const since = currentSince();
  const until = currentUntil();
  return Object.entries(repos).map(([fullName, repo]) => {
    const [owner, name] = fullName.split("/");
    const meta = repo.meta || {};
    const v = sumDaily(repo.dailyViews,  since, until);
    const c = sumDaily(repo.dailyClones, since, until);
    const trend = viewsTrend(repo.dailyViews, since, until);
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

  /* Same case-variant fold as the rollup table. GitHub returns the casing the
     visitor typed, and repo URLs are case-insensitive, so the overview page can
     appear twice and read as two different pages. */
  const foldedPaths = (() => {
    const agg = new Map();
    for (const p of paths) {
      const raw = p.path || p.name || "(unknown)";
      const key = canonicalPathKey(raw);
      const e = agg.get(key) || { count: 0, title: p.title, variants: new Map() };
      e.count += p.count || 0;
      e.variants.set(raw, (e.variants.get(raw) || 0) + (p.count || 0));
      agg.set(key, e);
    }
    return [...agg.entries()]
      .map(([key, e]) => ({
        label: e.title || preferredPathLabel(e.variants, r.fullName ? [r.fullName] : [], key),
        count: e.count,
        merged: e.variants.size > 1,
      }))
      .sort((a, b) => b.count - a.count);
  })();

  const pathList = foldedPaths.length
    ? foldedPaths.slice(0, 10).map(x =>
        `<li><span>${String(x.label).slice(0, 60)}${x.merged ? " *" : ""}</span><span>${fmt(x.count)}</span></li>`).join("")
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
        ${foldedPaths.some((x) => x.merged) ? '<p class="detail-note">* merged across URL spellings of the same page</p>' : ''}
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

// Note: ANALYTICS_COVERAGE_START is declared once near the top of this file
// (next to WINDOWS) and reused here by the multi-line chart custom-range UI.

const multilineState = {
  metric: "views",   // views | uniques | clones
  window: "30d",     // 14d | 30d | 90d | all | custom
  hidden: new Set(), // fullNames the user toggled off
  customFrom: null,  // YYYY-MM-DD, only used when window === "custom"
  customTo: null,
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
  if (windowKey === "custom") {
    // Clamp custom inputs into the available data range. If either bound is
    // missing or invalid, fall back to the full data range.
    const cf = multilineState.customFrom;
    const ct = multilineState.customTo;
    const lo = sorted[0];
    const hi = to;
    const safeFrom = cf && cf >= lo && cf <= hi ? cf : lo;
    const safeTo   = ct && ct >= lo && ct <= hi && ct >= safeFrom ? ct : hi;
    const dates = [];
    let cursor = safeFrom;
    while (cursor <= safeTo) {
      dates.push(cursor);
      cursor = shiftDay(cursor, 1);
    }
    return { dates, from: safeFrom, to: safeTo };
  }
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

// ------------------------------------------------------------ Portfolio tab

const portfolioStackState = { window: "30d", metric: "views" };

function dayRange(fromIso, toIso) {
  // inclusive list of YYYY-MM-DD between two ISO dates
  if (!fromIso || !toIso || fromIso > toIso) return [];
  const out = [];
  const d = new Date(fromIso + "T00:00:00Z");
  const end = new Date(toIso + "T00:00:00Z");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function priorWindowBounds(since, until) {
  // Same-length window immediately before [since, until]
  if (!since) return { since: null, until: null };
  const hi = until || todayUTC().toISOString().slice(0, 10);
  const days = dayRange(since, hi).length;
  if (!days) return { since: null, until: null };
  const startDate = new Date(since + "T00:00:00Z");
  const priorUntilDate = new Date(startDate);
  priorUntilDate.setUTCDate(priorUntilDate.getUTCDate() - 1);
  const priorSinceDate = new Date(priorUntilDate);
  priorSinceDate.setUTCDate(priorSinceDate.getUTCDate() - (days - 1));
  return {
    since: priorSinceDate.toISOString().slice(0, 10),
    until: priorUntilDate.toISOString().slice(0, 10),
  };
}

function renderPortfolio(repos) {
  const since = currentSince();
  const until = currentUntil();
  let winViews = 0, winClones = 0, winUniques = 0;
  let cumViews = 0, cumClones = 0;
  let peakDay = 0, peakDate = null;
  const portfolioDaily = {}; // date -> total views
  for (const repo of Object.values(repos)) {
    const w = sumDaily(repo.dailyViews, since, until);
    const wc = sumDaily(repo.dailyClones, since, until);
    if (w.count   != null) winViews   += w.count;
    if (w.uniques != null) winUniques += w.uniques;
    if (wc.count  != null) winClones  += wc.count;
    const allV = sumDaily(repo.dailyViews, ANALYTICS_COVERAGE_START, null);
    const allC = sumDaily(repo.dailyClones, ANALYTICS_COVERAGE_START, null);
    if (allV.count != null) cumViews  += allV.count;
    if (allC.count != null) cumClones += allC.count;
    for (const [day, v] of Object.entries(repo.dailyViews || {})) {
      portfolioDaily[day] = (portfolioDaily[day] || 0) + (v?.count || 0);
    }
  }
  for (const [day, cnt] of Object.entries(portfolioDaily)) {
    if (cnt > peakDay) { peakDay = cnt; peakDate = day; }
  }
  const winDays = dayRange(since, until || (findLatestDataDate(repos) || todayUTC().toISOString().slice(0, 10))).length || 1;
  const setKpi = (key, val, opts = {}) => {
    const el = document.querySelector(`[data-port-kpi="${key}"]`);
    if (el) el.textContent = val;
  };
  setKpi("winViews", fmt(winViews));
  setKpi("winClones", fmt(winClones));
  setKpi("winUniques", fmt(winUniques));
  setKpi("avgViewsPerDay", fmt(Math.round(winViews / winDays)));
  setKpi("avgClonesPerDay", fmt(Math.round(winClones / winDays)));
  setKpi("peakDay", fmt(peakDay));
  setKpi("peakDate", peakDate ? `on ${peakDate}` : "—");
  setKpi("cumViews", fmt(cumViews));
  setKpi("cumClones", fmt(cumClones));
  setKpi("cumViewsSince", `since ${ANALYTICS_COVERAGE_START}`);
  setKpi("cumClonesSince", `since ${ANALYTICS_COVERAGE_START}`);

  // Growth cards: current period vs prior equally-sized period
  const prior = priorWindowBounds(since, until);
  let prevViews = 0, prevClones = 0, prevUniques = 0;
  for (const repo of Object.values(repos)) {
    const pv = sumDaily(repo.dailyViews, prior.since, prior.until);
    const pc = sumDaily(repo.dailyClones, prior.since, prior.until);
    if (pv.count   != null) prevViews   += pv.count;
    if (pv.uniques != null) prevUniques += pv.uniques;
    if (pc.count   != null) prevClones  += pc.count;
  }
  const renderGrowth = (key, curr, prev) => {
    const card = document.querySelector(`[data-growth="${key}"]`);
    if (!card) return;
    const valEl = card.querySelector(".growth-value");
    const subEl = card.querySelector(".growth-sub");
    card.classList.remove("is-up", "is-down", "is-flat");
    if (prev === 0 && curr === 0) {
      valEl.textContent = "—";
      subEl.textContent = "No data in either period.";
      card.classList.add("is-flat");
      return;
    }
    if (prev === 0) {
      valEl.textContent = "NEW";
      subEl.textContent = `${fmt(curr)} this period · 0 prior`;
      card.classList.add("is-up");
      return;
    }
    const delta = curr - prev;
    const pct = (delta / prev) * 100;
    const arrow = delta > 0 ? "▲" : delta < 0 ? "▼" : "→";
    valEl.textContent = `${arrow} ${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
    subEl.textContent = `${fmt(curr)} this period · ${fmt(prev)} prior · Δ ${delta >= 0 ? "+" : ""}${fmt(delta)}`;
    if (delta > 0) card.classList.add("is-up");
    else if (delta < 0) card.classList.add("is-down");
    else card.classList.add("is-flat");
  };
  renderGrowth("views", winViews, prevViews);
  renderGrowth("clones", winClones, prevClones);
  renderGrowth("uniques", winUniques, prevUniques);

  renderPortfolioStack(repos);
}

function renderPortfolioStack(repos) {
  const host = document.getElementById("portfolio-stack");
  const legend = document.getElementById("portfolio-stack-legend");
  if (!host) return;

  const latest = findLatestDataDate(repos) || todayUTC().toISOString().slice(0, 10);
  let since;
  switch (portfolioStackState.window) {
    case "14d": since = shiftDay(latest, -13); break;
    case "30d": since = shiftDay(latest, -29); break;
    case "90d": since = shiftDay(latest, -89); break;
    default:    since = ANALYTICS_COVERAGE_START; break;
  }
  if (since < ANALYTICS_COVERAGE_START) since = ANALYTICS_COVERAGE_START;
  const days = dayRange(since, latest);
  if (!days.length) { host.innerHTML = `<p class="empty">No data yet.</p>`; legend.innerHTML = ""; return; }

  const metric = portfolioStackState.metric;
  const repoNames = Object.keys(repos).filter(n => {
    const map = metric === "views" ? repos[n].dailyViews : repos[n].dailyClones;
    return map && Object.keys(map).some(d => d >= since && d <= latest);
  });
  // sort by total contribution desc so biggest bands draw on bottom
  repoNames.sort((a, b) => {
    const ma = metric === "views" ? repos[a].dailyViews : repos[a].dailyClones;
    const mb = metric === "views" ? repos[b].dailyViews : repos[b].dailyClones;
    return (sumDaily(mb, since, latest).count || 0) - (sumDaily(ma, since, latest).count || 0);
  });

  // Build per-repo daily series
  const series = repoNames.map(name => {
    const map = metric === "views" ? repos[name].dailyViews : repos[name].dailyClones;
    return { name, values: days.map(d => (map?.[d]?.count) || 0) };
  });

  // SVG dims
  const w = Math.max(host.clientWidth || 800, 320);
  const h = 320;
  const padL = 48, padR = 16, padT = 16, padB = 36;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const stepX = days.length > 1 ? plotW / (days.length - 1) : plotW;

  // Cumulative stack per day
  const stacked = days.map(() => 0);
  const dayTotals = days.map((_, i) => series.reduce((s, r) => s + r.values[i], 0));
  const yMax = Math.max(1, ...dayTotals);

  const yScale = v => padT + plotH - (v / yMax) * plotH;
  const xAt = i => padL + i * stepX;

  // Build stacked path data per repo
  const paths = [];
  const baseline = days.map(() => 0);
  series.forEach((s, idx) => {
    const upper = baseline.map((b, i) => b + s.values[i]);
    const top = upper.map((v, i) => `${xAt(i).toFixed(1)},${yScale(v).toFixed(1)}`);
    const bot = baseline.map((v, i) => `${xAt(i).toFixed(1)},${yScale(v).toFixed(1)}`).reverse();
    const d = `M ${top.join(" L ")} L ${bot.join(" L ")} Z`;
    const color = ML_PALETTE[idx % ML_PALETTE.length];
    paths.push({ d, color, name: s.name });
    for (let i = 0; i < baseline.length; i++) baseline[i] = upper[i];
  });

  // y-axis ticks (4)
  const ticks = [];
  for (let t = 0; t <= 4; t++) {
    const v = Math.round((yMax * t) / 4);
    ticks.push({ y: yScale(v), label: fmt(v) });
  }
  // x-axis: first, middle, last labels
  const xLabels = [];
  const xIdxs = days.length <= 4 ? days.map((_, i) => i) : [0, Math.floor(days.length / 3), Math.floor((2 * days.length) / 3), days.length - 1];
  xIdxs.forEach(i => xLabels.push({ x: xAt(i), label: days[i].slice(5) }));

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Portfolio stacked chart">
      ${ticks.map(t => `<line x1="${padL}" x2="${w - padR}" y1="${t.y.toFixed(1)}" y2="${t.y.toFixed(1)}" stroke="var(--border)" stroke-width="1" />`).join("")}
      ${ticks.map(t => `<text x="${padL - 6}" y="${t.y + 3}" text-anchor="end" font-size="10" fill="var(--text-muted)">${t.label}</text>`).join("")}
      ${paths.map(p => `<path d="${p.d}" fill="${p.color}" fill-opacity="0.78" stroke="${p.color}" stroke-width="0.5"><title>${p.name}</title></path>`).join("")}
      ${xLabels.map(l => `<text x="${l.x}" y="${h - 12}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${l.label}</text>`).join("")}
    </svg>`;
  host.innerHTML = svg;

  legend.innerHTML = series.map((s, idx) => {
    const color = ML_PALETTE[idx % ML_PALETTE.length];
    const total = s.values.reduce((a, b) => a + b, 0);
    return `<span class="ml-legend-item" style="--ml-color:${color}">
      <span class="ml-legend-swatch" style="background:${color}"></span>
      <span class="ml-legend-name">${s.name}</span>
      <span class="ml-legend-value">${fmt(total)}</span>
    </span>`;
  }).join("");
}

// ------------------------------------------------------------ Highlights tab

function renderHighlights(repos) {
  const since = currentSince();
  const until = currentUntil();
  const prior = priorWindowBounds(since, until);

  // Top movers
  const movers = [];
  for (const [name, repo] of Object.entries(repos)) {
    const curr = sumDaily(repo.dailyViews, since, until).count || 0;
    const prev = sumDaily(repo.dailyViews, prior.since, prior.until).count || 0;
    if (curr === 0 && prev === 0) continue;
    let kind = "flat", deltaPct = 0;
    if (prev === 0) { kind = "new"; deltaPct = Infinity; }
    else {
      deltaPct = ((curr - prev) / prev) * 100;
      kind = deltaPct > 5 ? "up" : deltaPct < -5 ? "down" : "flat";
    }
    movers.push({ name, curr, prev, deltaPct, kind });
  }
  movers.sort((a, b) => {
    // New first, then biggest absolute % swing
    if (a.kind === "new" && b.kind !== "new") return -1;
    if (b.kind === "new" && a.kind !== "new") return 1;
    return Math.abs(b.deltaPct) - Math.abs(a.deltaPct);
  });
  const grid = document.getElementById("movers-grid");
  if (grid) {
    if (!movers.length) {
      grid.innerHTML = `<p class="empty">No movement yet — need more snapshot history.</p>`;
    } else {
      grid.innerHTML = movers.slice(0, 12).map(m => {
        const label = m.kind === "new"
          ? "NEW"
          : `${m.deltaPct >= 0 ? "▲ +" : "▼ "}${m.deltaPct.toFixed(0)}%`;
        const detail = m.kind === "new"
          ? `${fmt(m.curr)} views · 0 prior`
          : `${fmt(m.curr)} this period · ${fmt(m.prev)} prior`;
        return `<div class="mover-card is-${m.kind}">
          <span class="mover-repo">${m.name}</span>
          <span class="mover-delta">${label}</span>
          <span class="mover-detail">${detail}</span>
        </div>`;
      }).join("");
    }
  }

  // Records table
  const tbody = document.getElementById("records-tbody");
  if (tbody) {
    const rows = Object.entries(repos).map(([name, repo]) => {
      let pv = 0, pvDate = "—", pc = 0, pcDate = "—";
      let daysV = 0;
      for (const [day, v] of Object.entries(repo.dailyViews || {})) {
        if ((v?.count || 0) > pv) { pv = v.count; pvDate = day; }
        daysV += 1;
      }
      for (const [day, v] of Object.entries(repo.dailyClones || {})) {
        if ((v?.count || 0) > pc) { pc = v.count; pcDate = day; }
      }
      return { name, pv, pvDate, pc, pcDate, daysV };
    }).sort((a, b) => b.pv - a.pv);
    tbody.innerHTML = rows.length
      ? rows.map(r => `<tr>
          <td>${r.name}</td>
          <td class="num">${fmt(r.pv)}</td>
          <td>${r.pvDate}</td>
          <td class="num">${fmt(r.pc)}</td>
          <td>${r.pcDate}</td>
          <td class="num">${fmt(r.daysV)}</td>
        </tr>`).join("")
      : `<tr><td colspan="6" class="empty">No data yet.</td></tr>`;
  }

  // Milestones
  const milestonesEl = document.getElementById("milestones-grid");
  if (milestonesEl) {
    const THRESHOLDS = [100, 250, 500, 1000, 2500, 5000];
    const totals = Object.entries(repos).map(([name, repo]) => {
      const v = sumDaily(repo.dailyViews, ANALYTICS_COVERAGE_START, null).count || 0;
      const c = sumDaily(repo.dailyClones, ANALYTICS_COVERAGE_START, null).count || 0;
      return { name, v, c };
    });
    const renderTier = (title, key) => {
      const sorted = [...totals].sort((a, b) => b[key] - a[key]);
      return `<div class="milestone-card">
        <h3>${title}</h3>
        ${THRESHOLDS.map(th => {
          const hit = sorted.find(r => r[key] >= th);
          const cls = hit ? "is-hit" : "";
          const tick = hit ? "✓" : "·";
          const leader = hit ? `${hit.name} · ${fmt(hit[key])}` : "not yet";
          return `<div class="milestone-row ${cls}">
            <span class="milestone-tick">${tick}</span>
            <span class="milestone-threshold">${fmt(th)}</span>
            <span class="milestone-leader">${leader}</span>
          </div>`;
        }).join("")}
      </div>`;
    };
    milestonesEl.innerHTML = renderTier("Views milestones · since launch", "v")
                           + renderTier("Clones milestones · since launch", "c");
  }
}

// ------------------------------------------------------------ Engagement tab

function renderEngagement(repos) {
  const since = currentSince();
  const until = currentUntil();

  // Clone-to-view ratio table
  const tbody = document.getElementById("ratio-tbody");
  if (tbody) {
    const rows = Object.entries(repos).map(([name, repo]) => {
      const v  = sumDaily(repo.dailyViews,  since, until);
      const c  = sumDaily(repo.dailyClones, since, until);
      const views = v.count || 0;
      const uniques = v.uniques || 0;
      const clones = c.count || 0;
      return { name, views, uniques, clones };
    }).filter(r => r.views > 0)
      .map(r => ({ ...r, ratio: r.clones / r.views, uniqShare: r.uniques / r.views }))
      .sort((a, b) => b.ratio - a.ratio);
    tbody.innerHTML = rows.length
      ? rows.map(r => `<tr>
          <td>${r.name}</td>
          <td class="num">${fmt(r.views)}</td>
          <td class="num">${fmt(r.clones)}</td>
          <td class="num">${(r.ratio * 100).toFixed(1)}%</td>
          <td class="num">${(r.uniqShare * 100).toFixed(0)}%</td>
        </tr>`).join("")
      : `<tr><td colspan="5" class="empty">No views in this window yet.</td></tr>`;
  }

  // Aggregated referrers
  const refTbody = document.getElementById("referrers-rollup-tbody");
  if (refTbody) {
    const agg = new Map(); // name -> { count, uniques, repos:Set }
    for (const [repoName, repo] of Object.entries(repos)) {
      for (const r of (repo.referrers || [])) {
        const key = r.referrer || r.name || "(unknown)";
        const e = agg.get(key) || { count: 0, uniques: 0, repos: new Set() };
        e.count   += r.count   || 0;
        e.uniques += r.uniques || 0;
        e.repos.add(repoName);
        agg.set(key, e);
      }
    }
    const rows = [...agg.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 15);
    refTbody.innerHTML = rows.length
      ? rows.map(([name, e]) => `<tr>
          <td>${name}</td>
          <td class="num">${fmt(e.count)}</td>
          <td class="num">${fmt(e.uniques)}</td>
          <td class="num">${e.repos.size}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="empty">No referrer data yet.</td></tr>`;
  }

  // Aggregated paths.
  //
  // GitHub reports popular paths using the URL casing the visitor actually
  // used, and repo URLs are case-insensitive, so /microsoft/CreditUsage and
  // /microsoft/creditusage both resolve to the same page and both come back as
  // separate rows. On CreditUsage that split the repo overview almost in half,
  // 782 views against 756, which reads as two different pages in the table.
  //
  // Only the owner and repo segments are folded. Everything after them is a
  // real file path and git is case-sensitive there, so /blob/main/README.md and
  // /blob/main/readme.md are genuinely different URLs and must stay apart.
  const pathTbody = document.getElementById("paths-rollup-tbody");
  if (pathTbody) {
    const agg = new Map();
    for (const [repoName, repo] of Object.entries(repos)) {
      for (const p of (repo.paths || [])) {
        const raw = p.path || p.name || "(unknown)";
        const key = canonicalPathKey(raw);
        const e = agg.get(key) || { count: 0, uniques: 0, repos: new Set(), variants: new Map() };
        e.count   += p.count   || 0;
        e.uniques += p.uniques || 0;
        e.repos.add(repoName);
        e.variants.set(raw, (e.variants.get(raw) || 0) + (p.count || 0));
        agg.set(key, e);
      }
    }
    const rows = [...agg.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 15);
    pathTbody.innerHTML = rows.length
      ? rows.map(([key, e]) => {
          const label = preferredPathLabel(e.variants, e.repos, key);
          const merged = e.variants.size > 1;
          /* Views add up cleanly across spellings. Unique visitors do not:
             anyone who used both spellings is counted twice and there is no way
             to tell from this data, so say so rather than present it as exact. */
          const note = merged
            ? ` title="Merged ${e.variants.size} URL spellings of the same page: ${[...e.variants.keys()].join(', ')}. Views are additive; unique visitors may double count anyone who used more than one spelling."`
            : "";
          return `<tr${note}>
          <td><code>${label}</code>${merged ? ` <span class="path-merged">${e.variants.size} spellings</span>` : ""}</td>
          <td class="num">${fmt(e.count)}</td>
          <td class="num">${merged ? "≤" : ""}${fmt(e.uniques)}</td>
          <td class="num">${e.repos.size}</td>
        </tr>`;
        }).join("")
      : `<tr><td colspan="4" class="empty">No path data yet.</td></tr>`;
  }
}

/* Fold the case-insensitive part of a GitHub path (owner and repo) while
   leaving the case-sensitive file path after it untouched. */
function canonicalPathKey(path) {
  const parts = String(path || "").split("/");
  // ["", owner, repo, ...rest] for a leading-slash path
  if (parts.length >= 3) {
    parts[1] = parts[1].toLowerCase();
    parts[2] = parts[2].toLowerCase();
  }
  return parts.join("/");
}

/* Which spelling to show once variants are folded together. Prefer the one that
   matches the repo's real name, since that is the canonical URL, and fall back
   to whichever spelling drew the most views. */
function preferredPathLabel(variants, repoNames, fallback) {
  const list = [...variants.entries()].map(([path, count]) => ({ path, count }));
  if (!list.length) return fallback;
  const prefixes = [...repoNames].map((n) => "/" + String(n));
  const canonical = list.find((v) => prefixes.some((p) => v.path === p || v.path.startsWith(p + "/")));
  if (canonical) return canonical.path;
  return list.sort((a, b) => b.count - a.count)[0].path;
}

// ------------------------------------------------------------ sub-app rankings

function renderSubAppRankings(sites) {
  const tbody = document.getElementById("subapp-tbody");
  if (!tbody) return;
  const ah = (sites && sites["analytics-hub"]) || null;
  const byUrlSnaps = (ah && ah.snapshotsByUrl) || null;
  if (!byUrlSnaps || !Object.keys(byUrlSnaps).length) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="empty">No per-URL data yet — the nightly snapshot needs to have run at least once with the URL dimension enabled.</td></tr>';
    return;
  }
  const dates = Object.keys(byUrlSnaps).sort();
  const latestDate = dates[dates.length - 1];
  const snapshot = byUrlSnaps[latestDate] || [];

  // Extract sessions and page views per URL. Each metric group repeats
  // the same sessionsCount per URL, so we max across metric groups.
  const byUrl = {};
  for (const metricGroup of snapshot) {
    for (const row of (metricGroup.information || [])) {
      const url = row.Url || "";
      if (!url) continue;
      const b = byUrl[url] = byUrl[url] || { sessions: 0, pageViews: 0 };
      const s  = parseInt(row.sessionsCount, 10);
      const pv = parseInt(row.pagesViews,    10);
      if (!isNaN(s))  b.sessions  = Math.max(b.sessions,  s);
      if (!isNaN(pv)) b.pageViews = Math.max(b.pageViews, pv);
    }
  }

  // Aggregate into families (first-match wins).
  const families = SUB_APP_FAMILIES.map(fam => ({
    ...fam, sessions: 0, pageViews: 0, urls: [],
  }));
  for (const [url, m] of Object.entries(byUrl)) {
    const lower = url.toLowerCase();
    for (const fam of families) {
      if (lower.includes(fam.needle)) {
        fam.sessions  += m.sessions;
        fam.pageViews += m.pageViews;
        fam.urls.push(url);
        break;
      }
    }
  }
  families.sort((a, b) => (b.sessions - a.sessions) || (b.pageViews - a.pageViews));

  const rows = families.map(fam => `
    <tr>
      <td>${fam.label}</td>
      <td class="num">${fmt(fam.sessions)}</td>
      <td class="num">${fmt(fam.pageViews)}</td>
      <td class="num">${fam.urls.length}</td>
    </tr>
  `).join("");
  const footer = `<tr><td colspan="4" class="section-sub">Snapshot from ${latestDate} · 3-day rolling window</td></tr>`;
  tbody.innerHTML = rows + footer;
}

// ------------------------------------------------------------ cowork billing tab

function isCoworkRepo(fullName, repo) {
  if (COWORK_EXCLUDED_REPOS.has((fullName || "").toLowerCase())) return false;
  if (matchesAny(fullName, COWORK_REPO_HINTS)) return true;
  return (repo.paths || []).some((p) => {
    const text = `${p.path || ""} ${p.title || ""}`;
    return matchesAny(text, COWORK_WEB_HINTS);
  });
}

function linePath(values, xAt, yAt) {
  return values.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
}

function sparseLinePath(values, xAt, yAt) {
  let started = false;
  return values.map((value, index) => {
    if (value == null) {
      started = false;
      return "";
    }
    const command = started ? "L" : "M";
    started = true;
    return `${command} ${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`;
  }).filter(Boolean).join(" ");
}

/* Sparkline of the daily 3-day-rolling session value. Inline SVG to match the
   rest of the page, which uses no charting library. */
function renderWebTrend(points) {
  const host = document.getElementById("cowork-web-trend");
  if (!host) return;
  if (!points || points.length < 2) {
    host.innerHTML = `<p class="empty">Not enough snapshots yet for a trend.</p>`;
    return;
  }
  const W = 720, H = 130, padL = 8, padR = 8, padT = 12, padB = 22;
  const max = Math.max(...points.map((p) => p.sessions), 1);
  const stepX = (W - padL - padR) / (points.length - 1);
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  const pts = points.map((p, i) => [padL + i * stepX, y(p.sessions)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - padB} L${pts[0][0].toFixed(1)},${H - padB} Z`;
  const dots = pts.map((p, i) =>
    `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i === pts.length - 1 ? 4 : 2.5}" class="${i === pts.length - 1 ? "spark-dot-last" : "spark-dot"}"><title>${points[i].day}: ${points[i].sessions} sessions</title></circle>`
  ).join("");
  const first = points[0], last = points[points.length - 1];
  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="spark-svg" preserveAspectRatio="none" role="img"
         aria-label="Cowork web app sessions per daily snapshot, ${first.day} to ${last.day}">
      <path d="${area}" class="spark-area"></path>
      <path d="${line}" class="spark-line"></path>
      ${dots}
    </svg>
    <div class="spark-axis"><span>${first.day}</span><span>peak ${max}</span><span>${last.day}</span></div>`;
}

function renderCoworkBilling(repos, sites) {
  const since = currentSince();
  const until = currentUntil();
  const latest = findLatestDataDate(repos) || todayUTC().toISOString().slice(0, 10);
  const to = until || latest;

  const coworkRows = [];
  const dailyViews = {};
  const dailyClones = {};

  for (const [fullName, repo] of Object.entries(repos || {})) {
    if (!isCoworkRepo(fullName, repo)) continue;
    const views = sumDaily(repo.dailyViews, since, until);
    const clones = sumDaily(repo.dailyClones, since, until);
    coworkRows.push({
      fullName,
      views: views.count || 0,
      viewUniques: views.uniques || 0,
      clones: clones.count || 0,
      cloneUniques: clones.uniques || 0,
      repo,
    });
    for (const [day, bucket] of Object.entries(repo.dailyViews || {})) {
      if (day < since || day > to) continue;
      dailyViews[day] = (dailyViews[day] || 0) + (bucket?.count || 0);
    }
    for (const [day, bucket] of Object.entries(repo.dailyClones || {})) {
      if (day < since || day > to) continue;
      dailyClones[day] = (dailyClones[day] || 0) + (bucket?.count || 0);
    }
  }

  coworkRows.sort((a, b) => b.views - a.views);

  const viewsTotal = coworkRows.reduce((s, r) => s + r.views, 0);
  const clonesTotal = coworkRows.reduce((s, r) => s + r.clones, 0);
  const uniquesTotal = coworkRows.reduce((s, r) => s + r.viewUniques, 0);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set("cowork-kpi-repos", fmt(coworkRows.length));
  set("cowork-kpi-views", fmt(viewsTotal));
  set("cowork-kpi-clones", fmt(clonesTotal));
  set("cowork-kpi-uniques", fmt(uniquesTotal));

  const repoTbody = document.getElementById("cowork-repo-tbody");
  if (repoTbody) {
    repoTbody.innerHTML = coworkRows.length
      ? coworkRows.map((r) => `<tr>
          <td><a href="https://github.com/${r.fullName}" target="_blank" rel="noopener">${r.fullName}</a></td>
          <td class="num">${fmt(r.views)}</td>
          <td class="num">${fmt(r.viewUniques)}</td>
          <td class="num">${fmt(r.clones)}</td>
          <td class="num">${fmt(r.cloneUniques)}</td>
        </tr>`).join("")
      : `<tr><td colspan="5" class="empty">No cowork-related repo traffic found in this window.</td></tr>`;
  }

  const webAgg = new Map();
  const FRICTION_METRICS = new Set([
    "DeadClickCount", "RageClickCount", "ScriptErrorCount",
    "ErrorClickCount", "ExcessiveScroll", "QuickbackClick",
  ]);
  let coworkSnapshotDate = null;
  let coworkSnapshotSite = null;
  const coverageDates = new Set();

  for (const [siteKey, site] of Object.entries(sites || {})) {
    const byUrl = site?.snapshotsByUrl || {};
    const dates = Object.keys(byUrl).sort();
    dates.forEach((d) => coverageDates.add(d));
    const latestDate = dates[dates.length - 1];
    if (!latestDate) continue;
    const groups = byUrl[latestDate] || [];
    for (const g of groups) {
      const metricName = g?.metricName || "";
      for (const row of (g?.information || [])) {
        const url = row?.Url || row?.url || "";
        if (!url) continue;
        const lower = String(url).toLowerCase();
        if (lower.includes("what-i-did-with-cowork")) continue;
        // Exclude local dev and staging hosts from a published metric.
        if (lower.includes("localhost") || lower.includes("127.0.0.1")
            || lower.includes("azurewebsites.net")) continue;
        if (!matchesAny(url, COWORK_WEB_HINTS)) continue;
        const entry = webAgg.get(url) || {
          url, sessions: 0, users: 0, signals: 0, sites: new Set(),
          scroll: null, activeTime: null, totalTime: null, bots: 0, pagesPerSession: null,
        };
        // Clarity returns 9 metric rows per URL and repeats the same session
        // total on most of them (6x in sessionsCount, plus once more as
        // totalSessionCount on the Traffic row). Take the value once via max
        // rather than summing — see the identical treatment at ~line 1469.
        entry.sessions = Math.max(
          entry.sessions,
          parseIntSafe(row.sessionsCount),
          parseIntSafe(row.totalSessionCount)
        );
        entry.users = Math.max(entry.users, parseIntSafe(row.distinctUserCount));
        // UX friction: subTotal is the occurrence count for whichever metric
        // group this row belongs to. Only accumulate the friction metrics —
        // summing every group would fold in scroll depth and engagement time.
        if (FRICTION_METRICS.has(metricName)) {
          entry.signals += parseIntSafe(row.subTotal);
        }
        // Depth and dwell live on their own metric rows rather than on Traffic,
        // so they have to be picked up by name. Both are already per-URL
        // averages from Clarity, so they are read rather than accumulated.
        if (metricName === "ScrollDepth" && row.averageScrollDepth != null) {
          entry.scroll = Number(row.averageScrollDepth);
        }
        if (metricName === "EngagementTime") {
          if (row.activeTime != null) entry.activeTime = parseIntSafe(row.activeTime);
          if (row.totalTime != null) entry.totalTime = parseIntSafe(row.totalTime);
        }
        if (row.totalBotSessionCount != null) {
          entry.bots = Math.max(entry.bots, parseIntSafe(row.totalBotSessionCount));
        }
        if (row.pagesPerSessionPercentage != null) {
          entry.pagesPerSession = Number(row.pagesPerSessionPercentage);
        }
        entry.sites.add(siteKey);
        webAgg.set(url, entry);
        if (!coworkSnapshotDate) { coworkSnapshotDate = latestDate; coworkSnapshotSite = siteKey; }
      }
    }
  }

  const webRows = [...webAgg.values()].sort((a, b) => b.sessions - a.sessions).slice(0, 40);
  const webSessionsTotal = webRows.reduce((s, r) => s + r.sessions, 0);
  const webUsersTotal = webRows.reduce((s, r) => s + r.users, 0);

  /* Depth and dwell are per-URL averages, so a plain mean would let a page with
     three sessions swing the headline as hard as one with two thousand. Weight
     by sessions so the number reflects what visitors actually experienced. */
  function weighted(rows, field) {
    let num = 0, den = 0;
    for (const r of rows) {
      const v = r[field];
      if (v == null || !isFinite(v) || r.sessions <= 0) continue;
      num += v * r.sessions;
      den += r.sessions;
    }
    return den ? num / den : null;
  }
  const avgScroll = weighted(webRows, "scroll");
  const avgActive = weighted(webRows, "activeTime");
  const avgTotal = weighted(webRows, "totalTime");
  const botTotal = webRows.reduce((s, r) => s + (r.bots || 0), 0);
  const frictionTotal = webRows.reduce((s, r) => s + (r.signals || 0), 0);
  // Friction per 100 sessions, because the raw count only ever tracks traffic.
  const frictionRate = webSessionsTotal ? (frictionTotal / webSessionsTotal) * 100 : null;

  const secs = (v) => (v == null ? "—" : (v >= 60 ? `${Math.floor(v / 60)}m ${Math.round(v % 60)}s` : `${Math.round(v)}s`));
  const pct1 = (v) => (v == null ? "—" : `${v.toFixed(1)}%`);

  set("cowork-kpi-web-users", fmt(webUsersTotal));
  set("cowork-kpi-active-time", secs(avgActive));
  set("cowork-kpi-scroll", pct1(avgScroll));
  set("cowork-kpi-friction", frictionRate == null ? "—" : frictionRate.toFixed(1));

  const atFoot = document.getElementById("cowork-kpi-active-time-foot");
  if (atFoot && avgTotal != null && avgActive != null) {
    const share = avgTotal > 0 ? (avgActive / avgTotal) * 100 : null;
    atFoot.textContent = share == null
      ? "Clarity · active time per session"
      : `Clarity · ${Math.round(share)}% of ${secs(avgTotal)} on page`;
  }
  const btFoot = document.getElementById("cowork-kpi-web-users-foot");
  if (btFoot) {
    btFoot.textContent = botTotal
      ? `Clarity · ${fmt(botTotal)} bot session${botTotal === 1 ? "" : "s"} excluded`
      : "Clarity · distinct users";
  }

  set("cowork-kpi-web-sessions", fmt(webSessionsTotal));

  /* Windowed view.
     Each Clarity snapshot is a 3-day rolling window captured daily, so
     consecutive snapshots overlap by two days and summing them all would count
     most days three times. Snapshots three days apart do not overlap, so the
     window is built by stepping back in threes from the newest. That gives an
     exact figure for 3d, 6d for a 7d request, 12d for 14d, and so on: always
     the largest non-overlapping span that fits inside what was asked for.
     The sparkline shows the raw daily rolling value so direction stays visible
     without implying precision the window cannot carry. */
  const perDay = new Map();
  for (const site of Object.values(sites || {})) {
    const byUrl = site?.snapshotsByUrl || {};
    for (const day of Object.keys(byUrl)) {
      // Clarity repeats the session total across metric rows, so take the max
      // per URL before summing, exactly as the single-snapshot path does.
      const perUrl = new Map();
      for (const g of (byUrl[day] || [])) {
        for (const row of (g?.information || [])) {
          const url = row?.Url || row?.url || "";
          if (!url) continue;
          const lower = String(url).toLowerCase();
          if (lower.includes("what-i-did-with-cowork")) continue;
          if (lower.includes("localhost") || lower.includes("127.0.0.1")
              || lower.includes("azurewebsites.net")) continue;
          if (!matchesAny(url, COWORK_WEB_HINTS)) continue;
          const n = Math.max(parseIntSafe(row.sessionsCount), parseIntSafe(row.totalSessionCount));
          perUrl.set(url, Math.max(perUrl.get(url) || 0, n));
        }
      }
      let dayTotal = 0;
      for (const n of perUrl.values()) dayTotal += n;
      perDay.set(day, (perDay.get(day) || 0) + dayTotal);
    }
  }

  const trendDays = [...perDay.keys()].sort();
  const trend = trendDays.slice(-21).map((d) => ({ day: d, sessions: perDay.get(d) }));

  const wantDays = (typeof currentWindowDays === "function") ? currentWindowDays() : 14;
  const stepsWanted = Math.max(1, Math.floor(wantDays / 3));
  const picked = [];
  for (let i = 0; i < stepsWanted; i++) {
    const idx = trendDays.length - 1 - (i * 3);
    if (idx < 0) break;
    picked.push(trendDays[idx]);
  }
  const windowSessions = picked.reduce((s, d) => s + (perDay.get(d) || 0), 0);
  const coveredDays = picked.length * 3;

  /* ---- demo versus real, per tool -------------------------------------
     Same non-overlapping stepping as the sessions figure above, but split by
     tool and by the stage flag in the query string. Sessions are de-duplicated
     per URL first, because Clarity repeats the session total across metric
     rows. */
  const funnelPerDay = new Map();
  for (const site of Object.values(sites || {})) {
    const byUrl = site?.snapshotsByUrl || {};
    for (const day of Object.keys(byUrl)) {
      const perUrl = new Map();
      for (const g of (byUrl[day] || [])) {
        for (const row of (g?.information || [])) {
          const url = row?.Url || row?.url || "";
          if (!url) continue;
          const lower = String(url).toLowerCase();
          if (lower.includes("what-i-did-with-cowork")) continue;
          if (lower.includes("localhost") || lower.includes("127.0.0.1")
              || lower.includes("azurewebsites.net")) continue;
          if (!coworkApp(url)) continue;
          const n = Math.max(parseIntSafe(row.sessionsCount), parseIntSafe(row.totalSessionCount));
          perUrl.set(url, Math.max(perUrl.get(url) || 0, n));
        }
      }
      const dayMap = funnelPerDay.get(day) || new Map();
      for (const [url, n] of perUrl) {
        const key = coworkApp(url).key + "|" + coworkStage(url);
        dayMap.set(key, (dayMap.get(key) || 0) + n);
      }
      funnelPerDay.set(day, dayMap);
    }
  }

  const funnel = new Map();
  for (const day of picked) {
    const dayMap = funnelPerDay.get(day);
    if (!dayMap) continue;
    for (const [key, n] of dayMap) {
      const [appKey, stage] = key.split("|");
      const e = funnel.get(appKey) || { landing: 0, demo: 0, real: 0 };
      e[stage] += n;
      funnel.set(appKey, e);
    }
  }

  /* The demo and real columns are gated on the date, not on whether any tagged
     URL happens to be present.
     ?demo=1 already existed as a hand-written link on the Policy Helper landing
     page, so a handful of tagged sessions predate the instrumentation. Counting
     those would report one entry path as if it were all of them, and would pair
     them with a real-runs figure of zero that only means "never measured".
     So the split is computed over snapshots on or after the day tagging shipped,
     and left blank rather than zeroed before it. */
  const modeDays = picked.filter((d) => d >= COWORK_MODE_TAGGING_SINCE);
  const modeReady = modeDays.length > 0;
  const fullCoverage = modeReady && modeDays.length === picked.length;
  const modeCoveredDays = modeDays.length * 3;

  const modeFunnel = new Map();
  for (const day of modeDays) {
    const dayMap = funnelPerDay.get(day);
    if (!dayMap) continue;
    for (const [key, n] of dayMap) {
      const [appKey, stage] = key.split("|");
      const e = modeFunnel.get(appKey) || { landing: 0, demo: 0, real: 0 };
      e[stage] += n;
      modeFunnel.set(appKey, e);
    }
  }

  let demoTotal = 0, realTotal = 0, landingTotal = 0;
  for (const e of modeFunnel.values()) {
    demoTotal += e.demo; realTotal += e.real; landingTotal += e.landing;
  }
  const runsTotal = demoTotal + realTotal;

  set("cowork-kpi-demo-runs", modeReady ? fmt(demoTotal) : "—");
  set("cowork-kpi-real-runs", modeReady ? fmt(realTotal) : "—");
  set("cowork-kpi-real-share",
    modeReady && runsTotal ? `${Math.round((realTotal / runsTotal) * 100)}%` : "—");

  const notMeasuredFoot = `Not measured before ${COWORK_MODE_TAGGING_SINCE}`;
  const dFoot = document.getElementById("cowork-kpi-demo-runs-foot");
  if (dFoot) dFoot.textContent = modeReady ? `Sample data loaded · ${modeCoveredDays}d` : notMeasuredFoot;
  const rFoot = document.getElementById("cowork-kpi-real-runs-foot");
  if (rFoot) rFoot.textContent = modeReady ? `Report built from an upload · ${modeCoveredDays}d` : notMeasuredFoot;
  const sFoot = document.getElementById("cowork-kpi-real-share-foot");
  if (sFoot) {
    sFoot.textContent = modeReady
      ? `${fmt(runsTotal)} run${runsTotal === 1 ? "" : "s"} · ${fmt(landingTotal)} did not load data`
      : notMeasuredFoot;
  }

  const funnelTbody = document.getElementById("cowork-funnel-tbody");
  if (funnelTbody) {
    const rows = COWORK_APPS
      .map((a) => ({ app: a, e: funnel.get(a.key), m: modeFunnel.get(a.key) }))
      /* Kept even at zero sessions. An app whose URL Clarity knows about but
         which nobody opened is a finding, not an empty row: Multi-Budget sits
         at zero precisely because it is unlisted from the hub. Apps with no URL
         in the data at all are still dropped. */
      .filter((r) => r.e)
      .sort((x, y) => (y.e.demo + y.e.real + y.e.landing) - (x.e.demo + x.e.real + x.e.landing));
    funnelTbody.innerHTML = rows.length
      ? rows.map(({ app, e, m }) => {
          const arrived = e.landing + e.demo + e.real;
          const runs = m ? m.demo + m.real : 0;
          const seen = m ? m.landing + runs : 0;
          /* Only shown at full coverage. While the mode window is shorter than
             the session window, this would divide one period's runs by another
             period's traffic and read as a collapse in conversion. */
          const conv = fullCoverage && seen ? Math.round((runs / seen) * 100) : null;
          const realPct = modeReady && runs ? Math.round((m.real / runs) * 100) : null;
          return `<tr>
          <td>${app.label}</td>
          <td class="num">${fmt(arrived)}</td>
          <td class="num">${modeReady && m ? fmt(m.demo) : "—"}</td>
          <td class="num">${modeReady && m ? fmt(m.real) : "—"}</td>
          <td class="num">${conv == null ? "—" : conv + "%"}</td>
          <td class="num">${realPct == null ? "—" : `<span class="${realPct >= 50 ? "pill-good" : "pill-warn"}">${realPct}%</span>`}</td>
        </tr>`;
        }).join("")
      : `<tr><td colspan="6" class="empty">No cowork web app URLs in this window.</td></tr>`;
  }

  /* ---- update feed reach ----------------------------------------------
     Feed readers fetch feed.xml over plain HTTP and never run JavaScript, so
     a subscriber cannot be counted from here and GitHub Pages exposes no
     server logs either. What is observable is the /updates/ page itself, and
     the query string tells us how someone arrived and whether they copied the
     address. ?copied=1 is written by the page via replaceState, the same
     mechanism as the demo tagging, because Clarity returns the URL but will
     not return custom events. */
  const feedPerUrl = new Map();
  for (const day of picked) {
    for (const [url, m] of (function () {
      const per = new Map();
      for (const site of Object.values(sites || {})) {
        const groups = (site.snapshotsByUrl || {})[day];
        if (!groups) continue;
        for (const g of groups) {
          const metric = g?.metricName || "";
          for (const row of (g?.information || [])) {
            const u = row?.Url || row?.url || "";
            if (!u || !/\/updates\/?(\?|$)/i.test(u)) continue;
            const lower = u.toLowerCase();
            if (lower.includes("localhost") || lower.includes("127.0.0.1")) continue;
            const e = per.get(u) || { sessions: 0, users: 0, scroll: null };
            e.sessions = Math.max(e.sessions,
              parseIntSafe(row.sessionsCount), parseIntSafe(row.totalSessionCount));
            e.users = Math.max(e.users, parseIntSafe(row.distinctUserCount));
            if (metric === "ScrollDepth" && row.averageScrollDepth != null) {
              e.scroll = Number(row.averageScrollDepth);
            }
            per.set(u, e);
          }
        }
      }
      return per;
    })()) {
      const e = feedPerUrl.get(url) || { sessions: 0, users: 0, scroll: m.scroll };
      e.sessions += m.sessions;
      e.users += m.users;
      if (m.scroll != null) e.scroll = m.scroll;
      feedPerUrl.set(url, e);
    }
  }

  const SOURCES = [
    { key: "nav", label: "Nav button", test: (u) => /[?&]from=nav\b/i.test(u) },
    { key: "hero", label: "Home page button", test: (u) => /[?&]from=hero\b/i.test(u) },
  ];
  const feedBySource = new Map();
  let feedSessions = 0, feedUsers = 0, feedCopied = 0;

  for (const [url, m] of feedPerUrl) {
    feedSessions += m.sessions;
    feedUsers += m.users;
    /* A copy rewrites the URL in place, so these rows are a subset of the
       sessions above rather than additional traffic. An older copied=1 form
       exists in any snapshot taken before the value was named, so it is still
       matched. */
    if (/[?&]copied=(1|all)\b/i.test(url)) feedCopied += m.sessions;
    const src = SOURCES.find((s) => s.test(url));
    const k = src ? src.key : "direct";
    const e = feedBySource.get(k) || { sessions: 0, users: 0, sw: 0, wsum: 0 };
    e.sessions += m.sessions;
    e.users += m.users;
    if (m.scroll != null && m.sessions > 0) { e.sw += m.scroll * m.sessions; e.wsum += m.sessions; }
    feedBySource.set(k, e);
  }

  const feedSeen = feedPerUrl.size > 0;
  set("feed-kpi-sessions", feedSeen ? fmt(feedSessions) : "—");
  set("feed-kpi-users", feedSeen ? fmt(feedUsers) : "—");
  set("feed-kpi-copied", feedSeen ? fmt(feedCopied) : "—");
  set("feed-kpi-rate", feedSeen && feedSessions
    ? `${Math.round((feedCopied / feedSessions) * 100)}%` : "—");

  const fsFoot = document.getElementById("feed-kpi-sessions-foot");
  if (fsFoot) {
    fsFoot.textContent = feedSeen
      ? `Clarity · ${coveredDays}d across ${feedPerUrl.size} URL variant${feedPerUrl.size === 1 ? "" : "s"}`
      : "Not seen in a snapshot yet";
  }
  const fcFoot = document.getElementById("feed-kpi-copied-foot");
  if (fcFoot && !feedSeen) fcFoot.textContent = "Not seen in a snapshot yet";

  const feedTbody = document.getElementById("feed-source-tbody");
  if (feedTbody) {
    const order = ["nav", "hero", "direct"];
    const labels = { nav: "Nav button", hero: "Home page button", direct: "Direct or shared link" };
    const rows = order
      .map((k) => ({ k, e: feedBySource.get(k) }))
      .filter((r) => r.e);
    feedTbody.innerHTML = rows.length
      ? rows.map(({ k, e }) => `<tr>
          <td>${labels[k]}</td>
          <td class="num">${fmt(e.sessions)}</td>
          <td class="num">${fmt(e.users)}</td>
          <td class="num">${e.wsum ? Math.round(e.sw / e.wsum) + "%" : "—"}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="empty">The updates page has not appeared in a Clarity snapshot yet. It went live on ${FEED_LIVE_SINCE}; the first nightly snapshot after that date will populate this.</td></tr>`;
  }

  const feedNote = document.getElementById("feed-note");
  if (feedNote) {
    feedNote.textContent = feedSeen
      ? `Window covers ${coveredDays} day${coveredDays === 1 ? "" : "s"}. Copy counts are a subset of sessions, not extra traffic, because copying rewrites the URL of the session already in progress.`
      : `The feed and updates page went live on ${FEED_LIVE_SINCE}. Figures appear from the first nightly snapshot after that date, so they are blank rather than zero.`;
  }

  const funnelNote = document.getElementById("cowork-funnel-note");
  if (funnelNote) {
    if (!modeReady) {
      funnelNote.textContent = `Sessions cover ${coveredDays} day${coveredDays === 1 ? "" : "s"}. Demo and real tagging went live on ${COWORK_MODE_TAGGING_SINCE} and fill in from the first nightly snapshot after that date, so those two columns are blank rather than zero.`;
    } else if (!fullCoverage) {
      funnelNote.textContent = `Sessions cover ${coveredDays} days. Demo and real cover the ${modeCoveredDays} of those days since tagging began on ${COWORK_MODE_TAGGING_SINCE}, so the two are not directly comparable yet and the loaded-data share is withheld.`;
    } else {
      funnelNote.textContent = `Window covers ${coveredDays} day${coveredDays === 1 ? "" : "s"} from ${picked.length} non-overlapping Clarity snapshot${picked.length === 1 ? "" : "s"}.`;
    }
  }

  set("cowork-kpi-web-sessions", picked.length ? fmt(windowSessions) : "—");
  const wsFoot = document.getElementById("cowork-kpi-web-sessions-foot");
  if (wsFoot) {
    wsFoot.textContent = picked.length
      ? `Clarity · ${coveredDays}d from ${picked.length} non-overlapping snapshot${picked.length === 1 ? "" : "s"}`
      : "Clarity · no snapshots in range";
  }
  renderWebTrend(trend);

  const webTbody = document.getElementById("cowork-webapp-tbody");
  if (webTbody) {
    /* Short labels beat full URLs here: the table is scanned to compare apps,
       and forty characters of shared prefix on every row defeats that. */
    const label = (u) => u
      .replace(/^https?:\/\//, "")
      .replace("microsoft.github.io/Analytics-Hub/", "")
      .replace(/\/app\/index\.html$/, "")
      .replace(/\/index\.html$/, "")
      .replace(/\/$/, "") || "home";
    webTbody.innerHTML = webRows.length
      ? webRows.map((r) => {
          const engaged = r.scroll != null && r.scroll >= 60 && (r.activeTime || 0) >= 60;
          return `<tr>
          <td><a href="${r.url}" target="_blank" rel="noopener" title="${r.url}">${label(r.url)}</a></td>
          <td class="num">${fmt(r.sessions)}</td>
          <td class="num">${fmt(r.users)}</td>
          <td class="num">${r.scroll == null ? "—" : r.scroll.toFixed(0) + "%"}</td>
          <td class="num">${r.activeTime == null ? "—" : secs(r.activeTime)}</td>
          <td class="num">${fmt(r.signals)}</td>
          <td class="num">${engaged ? '<span class="pill-good">deep</span>' : ""}</td>
        </tr>`;
        }).join("")
      : `<tr><td colspan="7" class="empty">No cowork web app URL traffic found in Clarity snapshots.</td></tr>`;
  }

  const pbitRows = [];
  for (const row of coworkRows) {
    for (const p of (row.repo.paths || [])) {
      const text = `${p.path || ""} ${p.title || ""}`;
      if (!String(text).toLowerCase().includes(".pbit")) continue;
      pbitRows.push({
        resource: p.path || p.title || "(unknown)",
        count: p.count || 0,
        uniques: p.uniques || 0,
        repo: row.fullName,
      });
    }
  }
  pbitRows.sort((a, b) => b.count - a.count);
  const pbitHits = pbitRows.reduce((s, r) => s + r.count, 0);
  set("cowork-kpi-pbit-hits", fmt(pbitHits));

  // ---- Scope disclosure: exactly what is counted, so the number can be defended.
  const scopeHint = document.getElementById("cowork-scope-hint");
  if (scopeHint) {
    scopeHint.textContent = `${coworkRows.length} repo${coworkRows.length === 1 ? "" : "s"} · ${webRows.length} URL${webRows.length === 1 ? "" : "s"}`;
  }
  const scopeBody = document.getElementById("cowork-scope-body");
  if (scopeBody) {
    const repoList = coworkRows.length
      ? coworkRows.map((r) => `<li><a href="https://github.com/${r.fullName}" target="_blank" rel="noopener">${r.fullName}</a> — ${fmt(r.views)} views, ${fmt(r.clones)} clones</li>`).join("")
      : `<li class="empty">none matched</li>`;
    const urlList = webRows.length
      ? webRows.map((r) => `<li><a href="${r.url}" target="_blank" rel="noopener">${r.url.replace(/^https?:\/\//, "")}</a> — ${fmt(r.sessions)} sessions</li>`).join("")
      : `<li class="empty">none matched</li>`;
    scopeBody.innerHTML = `
      <div class="cowork-scope-cols">
        <div>
          <h4>GitHub repos counted (${coworkRows.length})</h4>
          <p class="cowork-scope-rule">Matched on: <code>cowork</code>, <code>billing</code>, <code>copilotroicalculator</code>, <code>roi-calculator</code> in the repo name or its popular paths. <code>What-I-did-with-Cowork</code> is deliberately excluded.</p>
          <ul class="cowork-scope-list">${repoList}</ul>
        </div>
        <div>
          <h4>Web app URLs counted (${webRows.length})</h4>
          <p class="cowork-scope-rule">Clarity URL snapshot for <strong>${coworkSnapshotDate || "n/a"}</strong>${coworkSnapshotSite ? ` · project <code>${coworkSnapshotSite}</code>` : ""}. Local and staging hosts excluded.</p>
          <ul class="cowork-scope-list">${urlList}</ul>
        </div>
      </div>
      <p class="cowork-scope-foot"><strong>These are not the same population.</strong> Repo views and clones are GitHub traffic against source repositories. Web app sessions are Clarity telemetry on the hosted pages. They answer different questions and should not be added together.</p>`;
  }

  // ---- Snapshot coverage: make outages visible instead of implied.
  const covStrip = document.getElementById("cowork-coverage-strip");
  const covNote = document.getElementById("cowork-coverage-note");
  if (covStrip && covNote) {
    const sorted = [...coverageDates].sort();
    if (!sorted.length) {
      covStrip.innerHTML = "";
      covNote.textContent = "No Clarity snapshots captured.";
    } else {
      const first = new Date(sorted[0] + "T00:00:00Z");
      const last = new Date(sorted[sorted.length - 1] + "T00:00:00Z");
      const have = new Set(sorted);
      const cells = [];
      let missing = 0;
      for (let t = first.getTime(); t <= last.getTime(); t += 86400000) {
        const key = new Date(t).toISOString().slice(0, 10);
        const ok = have.has(key);
        if (!ok) missing += 1;
        cells.push(`<span class="cov-cell ${ok ? "cov-ok" : "cov-gap"}" title="${key}${ok ? "" : " — no snapshot"}"></span>`);
      }
      covStrip.innerHTML = cells.join("");
      covNote.innerHTML = missing
        ? `${sorted.length} snapshot${sorted.length === 1 ? "" : "s"} from ${sorted[0]} to ${sorted[sorted.length - 1]} · <strong>${missing} day${missing === 1 ? "" : "s"} missing</strong>. Clarity URL snapshots cannot be backfilled, so totals across a gap understate real traffic.`
        : `${sorted.length} consecutive snapshots from ${sorted[0]} to ${sorted[sorted.length - 1]} · no gaps.`;
    }
  }

  // ---- Answer sheet: pre-answers the questions that keep getting asked.
  const topApps = webRows
    .filter((r) => /\/app\/|finops\.html/i.test(r.url))
    .slice(0, 5);
  const hubRow = webRows.find((r) => /cowork-billing\/?$/i.test(r.url.replace(/[?#].*$/, "")));
  const answerBody = document.getElementById("cowork-answer-body");
  const answerLines = [];
  answerLines.push(`<p><strong>Scope.</strong> These figures cover the Cowork Billing pages and apps only — ${coworkRows.length} GitHub repo${coworkRows.length === 1 ? "" : "s"} and ${webRows.length} hosted URL${webRows.length === 1 ? "" : "s"}. They are not hub-wide, and they exclude <code>What-I-did-with-Cowork</code>.</p>`);
  if (webSessionsTotal) {
    answerLines.push(`<p><strong>Web app traffic.</strong> ${fmt(webSessionsTotal)} sessions from ${fmt(webUsersTotal)} distinct users, over the 3-day rolling window ending ${coworkSnapshotDate || "n/a"}. Each Clarity snapshot is a 3-day summary, so this is a current-rate figure — not a lifetime total and not a daily count.</p>`);
  }
  if (topApps.length) {
    const li = topApps.map((r) => {
      const name = r.url.replace(/^https?:\/\/[^/]+\/Analytics-Hub\//i, "").replace(/\/app\/index\.html$/i, "").replace(/\/app\/finops\.html$/i, "");
      const s = r.sessions === 1 ? "session" : "sessions";
      const u = r.users === 1 ? "user" : "users";
      return `<li>${name} — ${fmt(r.sessions)} ${s}, ${fmt(r.users)} ${u}</li>`;
    }).join("");
    answerLines.push(`<p><strong>By app.</strong></p><ul class="cowork-answer-list">${li}</ul>`);
  }
  if (hubRow) {
    answerLines.push(`<p><strong>Hub vs apps.</strong> The Cowork Billing landing page drew ${fmt(hubRow.sessions)} sessions; the apps themselves drew ${fmt(topApps.reduce((s, r) => s + r.sessions, 0))}. Landing-page visits are browsing; app sessions are working sessions.</p>`);
  }
  answerLines.push(`<p><strong>GitHub.</strong> ${fmt(viewsTotal)} views and ${fmt(clonesTotal)} clones across the ${coworkRows.length} in-scope repo${coworkRows.length === 1 ? "" : "s"}. Clones are the stronger adoption signal — that is someone pulling the code down to run it.</p>`);
  if (pbitHits) {
    answerLines.push(`<p><strong>PBIT.</strong> ${fmt(pbitHits)} hits on Power BI template paths. This is GitHub reporting those paths as popular — it is not a verified download count.</p>`);
  }
  if (answerBody) answerBody.innerHTML = answerLines.join("");

  const copyBtn = document.getElementById("cowork-copy-btn");
  if (copyBtn && !copyBtn.dataset.bound) {
    copyBtn.dataset.bound = "1";
    copyBtn.addEventListener("click", () => {
      const plain = (answerBody ? answerBody.innerText : "").trim();
      const stamp = `\n\nSource: Analytics Hub pages-analytics, Cowork Billing tab. Clarity snapshot ${coworkSnapshotDate || "n/a"}; GitHub rolling window.`;
      navigator.clipboard.writeText(plain + stamp).then(() => {
        copyBtn.textContent = "Copied";
        setTimeout(() => { copyBtn.textContent = "Copy summary"; }, 1800);
      }).catch(() => {
        copyBtn.textContent = "Copy failed";
        setTimeout(() => { copyBtn.textContent = "Copy summary"; }, 1800);
      });
    });
  }

  const pbitTbody = document.getElementById("cowork-pbit-tbody");
  if (pbitTbody) {
    pbitTbody.innerHTML = pbitRows.length
      ? pbitRows.map((r) => `<tr>
          <td><code>${r.resource}</code></td>
          <td class="num">${fmt(r.count)}</td>
          <td class="num">${fmt(r.uniques)}</td>
          <td>${r.repo}</td>
        </tr>`).join("")
      : `<tr><td colspan="4" class="empty">No cowork PBIT path traffic found yet.</td></tr>`;
  }

  const chartHost = document.getElementById("cowork-chart");
  if (!chartHost) return;
  const days = dayRange(since, to);
  if (!days.length) {
    chartHost.innerHTML = `<p class="empty">No daily cowork series available for this window.</p>`;
    return;
  }
  const viewsSeries = days.map((d) => dailyViews[d] || 0);
  const clonesSeries = days.map((d) => dailyClones[d] || 0);
  const maxV = Math.max(1, ...viewsSeries, ...clonesSeries);

  const W = Math.max(640, chartHost.clientWidth || 760);
  const H = 300;
  const padL = 44, padR = 16, padT = 16, padB = 36;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const xStep = days.length > 1 ? plotW / (days.length - 1) : plotW;
  const xAt = (i) => padL + i * xStep;
  const yAt = (v) => padT + plotH - (v / maxV) * plotH;

  const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = yAt(maxV * t);
    const label = Math.round(maxV * t);
    return `<line x1="${padL}" x2="${W - padR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="cowork-grid" />
      <text x="${padL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="cowork-axis">${fmt(label)}</text>`;
  }).join("");

  const labels = [0, Math.floor((days.length - 1) / 2), days.length - 1]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .map((idx) => {
      const dt = new Date(`${days[idx]}T00:00:00Z`);
      const text = dt.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
      return `<text x="${xAt(idx).toFixed(1)}" y="${H - 12}" text-anchor="middle" class="cowork-axis">${text}</text>`;
    }).join("");

  const viewPath = linePath(viewsSeries, xAt, yAt);
  const clonePath = linePath(clonesSeries, xAt, yAt);
  chartHost.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cowork billing daily views and clones">
      ${grid}
      <path d="${viewPath}" class="cowork-line views" />
      <path d="${clonePath}" class="cowork-line clones" />
      ${labels}
    </svg>
    <div class="cowork-chart-legend">
      <span><i class="sw views"></i> Views</span>
      <span><i class="sw clones"></i> Clones</span>
    </div>
  `;

  const correlationHost = document.getElementById("cowork-correlation-chart");
  if (!correlationHost) return;

  const correlation = COWORK_CORRELATION_SERIES.map((series) => ({ ...series, values: {} }));
  const pbitRepoNames = new Set(coworkRows
    .filter((row) => (row.repo.paths || []).some((path) => `${path.path || ""} ${path.title || ""}`.toLowerCase().includes(".pbit")))
    .map((row) => row.fullName));

  for (const series of correlation) {
    if (series.needle) continue;
    for (const repoName of pbitRepoNames) {
      const repo = repos[repoName] || {};
      for (const [date, bucket] of Object.entries(repo.dailyViews || {})) {
        if (date >= since && date <= to) {
          series.values[date] = (series.values[date] || 0) + (bucket?.count || 0);
        }
      }
    }
  }

  for (const site of Object.values(sites || {})) {
    for (const [date, groups] of Object.entries(site?.snapshotsByUrl || {})) {
      if (date < since || date > to) continue;
      const perUrlSessions = new Map();
      for (const group of groups || []) {
        for (const row of group?.information || []) {
          const url = row?.Url || row?.url || "";
          if (!url) continue;
          const sessions = parseIntSafe(row.sessionsCount) || parseIntSafe(row.totalSessionCount);
          perUrlSessions.set(url, Math.max(perUrlSessions.get(url) || 0, sessions));
        }
      }
      for (const [url, sessions] of perUrlSessions) {
        const lower = url.toLowerCase();
        for (const series of correlation) {
          if (series.needle && lower.includes(series.needle)) {
            series.values[date] = (series.values[date] || 0) + sessions;
          }
        }
      }
    }
  }

  const correlationDates = [...new Set(correlation.flatMap((series) => Object.keys(series.values)))].sort();
  if (!correlationDates.length) {
    correlationHost.innerHTML = `<p class="empty">No web app or PBIT traffic series is available for this window yet.</p>`;
    return;
  }
  const correlationMax = Math.max(1, ...correlation.flatMap((series) => Object.values(series.values)));
  const correlationWidth = Math.max(640, correlationHost.clientWidth || 760);
  const correlationHeight = 300;
  const cPadL = 44, cPadR = 16, cPadT = 16, cPadB = 36;
  const cPlotW = correlationWidth - cPadL - cPadR;
  const cPlotH = correlationHeight - cPadT - cPadB;
  const cX = (index) => cPadL + (correlationDates.length > 1 ? index * cPlotW / (correlationDates.length - 1) : cPlotW / 2);
  const cY = (value) => cPadT + cPlotH - value / correlationMax * cPlotH;
  const correlationGrid = [0, 0.25, 0.5, 0.75, 1].map((fraction) => {
    const y = cY(correlationMax * fraction);
    return `<line x1="${cPadL}" x2="${correlationWidth - cPadR}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" class="cowork-grid" />
      <text x="${cPadL - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="cowork-axis">${fmt(Math.round(correlationMax * fraction))}</text>`;
  }).join("");
  const correlationLabels = [0, Math.floor((correlationDates.length - 1) / 2), correlationDates.length - 1]
    .filter((value, index, array) => array.indexOf(value) === index)
    .map((index) => {
      const date = new Date(`${correlationDates[index]}T00:00:00Z`);
      const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
      return `<text x="${cX(index).toFixed(1)}" y="${correlationHeight - 12}" text-anchor="middle" class="cowork-axis">${label}</text>`;
    }).join("");
  const correlationPaths = correlation.map((series) => {
    const points = correlationDates.map((date) => series.values[date] ?? null);
    return `<path d="${sparseLinePath(points, cX, cY)}" class="cowork-line" stroke="${series.color}" />`;
  }).join("");
  const correlationLegend = correlation.map((series) =>
    `<span><i class="sw" style="background:${series.color}"></i>${series.label}</span>`).join("");
  correlationHost.innerHTML = `
    <svg viewBox="0 0 ${correlationWidth} ${correlationHeight}" role="img" aria-label="Web app and PBIT traffic correlation">
      ${correlationGrid}
      ${correlationPaths}
      ${correlationLabels}
    </svg>
    <div class="cowork-chart-legend">${correlationLegend}</div>
  `;
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
    renderPortfolio(reposData);
    renderHighlights(reposData);
    renderEngagement(reposData);
    renderCoworkBilling(reposData, history.sites || {});
  };
  rerenderAll();
  renderWoW(reposData);
  renderMultiline(reposData);
  renderSites(history.sites || {});
  renderSubAppRankings(history.sites || {});

  // Window switcher
  const customPanel = document.getElementById("window-custom");
  const fromInput = document.getElementById("win-from");
  const toInput   = document.getElementById("win-to");
  const resetBtn  = document.getElementById("win-reset");
  const latestDataDate = () => findLatestDataDate(reposData) || ANALYTICS_COVERAGE_START;
  const seedCustomInputs = () => {
    const hi = latestDataDate();
    const lo = ANALYTICS_COVERAGE_START;
    if (fromInput) {
      fromInput.min = lo;
      fromInput.max = hi;
      if (!fromInput.value) fromInput.value = windowState.customSince || lo;
      windowState.customSince = fromInput.value;
    }
    if (toInput) {
      toInput.min = lo;
      toInput.max = hi;
      if (!toInput.value) toInput.value = windowState.customUntil || hi;
      windowState.customUntil = toInput.value;
    }
  };
  document.querySelectorAll("[data-window]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.window;
      if (!WINDOWS[key] || key === windowState.key) return;
      windowState.key = key;
      document.querySelectorAll("[data-window]").forEach((b) => {
        b.classList.toggle("active", b.dataset.window === key);
      });
      if (customPanel) {
        if (key === "custom") { seedCustomInputs(); customPanel.removeAttribute("hidden"); }
        else                  { customPanel.setAttribute("hidden", ""); }
      }
      rerenderAll();
    });
  });
  const onCustomChange = () => {
    if (windowState.key !== "custom") return;
    if (fromInput && fromInput.value) windowState.customSince = fromInput.value;
    if (toInput   && toInput.value)   windowState.customUntil = toInput.value;
    if (fromInput && toInput && fromInput.value && toInput.value && fromInput.value > toInput.value) {
      toInput.value = fromInput.value;
      windowState.customUntil = fromInput.value;
    }
    rerenderAll();
  };
  if (fromInput) fromInput.addEventListener("change", onCustomChange);
  if (toInput)   toInput.addEventListener("change", onCustomChange);
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      const hi = latestDataDate();
      if (fromInput) fromInput.value = ANALYTICS_COVERAGE_START;
      if (toInput)   toInput.value   = hi;
      windowState.customSince = ANALYTICS_COVERAGE_START;
      windowState.customUntil = hi;
      rerenderAll();
    });
  }

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
      const customPanel = document.getElementById("multiline-custom");
      if (customPanel) {
        if (w === "custom") {
          // Seed inputs from current data range if user hasn't set values yet.
          const fromEl = document.getElementById("ml-from");
          const toEl = document.getElementById("ml-to");
          const latest = findLatestDataDate(reposData) || ANALYTICS_COVERAGE_START;
          if (fromEl) {
            fromEl.min = ANALYTICS_COVERAGE_START;
            fromEl.max = latest;
            if (!fromEl.value) fromEl.value = multilineState.customFrom || shiftDay(latest, -29);
            multilineState.customFrom = fromEl.value;
          }
          if (toEl) {
            toEl.min = ANALYTICS_COVERAGE_START;
            toEl.max = latest;
            if (!toEl.value) toEl.value = multilineState.customTo || latest;
            multilineState.customTo = toEl.value;
          }
          customPanel.removeAttribute("hidden");
        } else {
          customPanel.setAttribute("hidden", "");
        }
      }
      renderMultiline(reposData);
    });
  });

  // Custom date-range inputs
  const mlFromInput = document.getElementById("ml-from");
  const mlToInput = document.getElementById("ml-to");
  const onMlCustomChange = () => {
    if (multilineState.window !== "custom") return;
    if (mlFromInput && mlFromInput.value) multilineState.customFrom = mlFromInput.value;
    if (mlToInput && mlToInput.value) multilineState.customTo = mlToInput.value;
    // Keep the From <= To invariant gently — don't fight the user mid-type.
    if (mlFromInput && mlToInput && mlFromInput.value && mlToInput.value && mlFromInput.value > mlToInput.value) {
      mlToInput.value = mlFromInput.value;
      multilineState.customTo = mlFromInput.value;
    }
    renderMultiline(reposData);
  };
  if (mlFromInput) mlFromInput.addEventListener("change", onMlCustomChange);
  if (mlToInput) mlToInput.addEventListener("change", onMlCustomChange);
  const mlResetBtn = document.getElementById("ml-reset");
  if (mlResetBtn) {
    mlResetBtn.addEventListener("click", () => {
      const latest = findLatestDataDate(reposData) || ANALYTICS_COVERAGE_START;
      const def = shiftDay(latest, -29);
      if (mlFromInput) mlFromInput.value = def;
      if (mlToInput) mlToInput.value = latest;
      multilineState.customFrom = def;
      multilineState.customTo = latest;
      renderMultiline(reposData);
    });
  }
  window.addEventListener("resize", () => {
    clearTimeout(window.__mlResizeT);
    window.__mlResizeT = setTimeout(() => renderMultiline(reposData), 150);
  });

  // Page-level tab switcher (Summary / Portfolio / Highlights / Engagement / Comparisons)
  const tabBtns = document.querySelectorAll(".page-tab");
  const tabPanels = {
    summary:     document.getElementById("tab-summary"),
    portfolio:   document.getElementById("tab-portfolio"),
    highlights:  document.getElementById("tab-highlights"),
    engagement:  document.getElementById("tab-engagement"),
    comparisons: document.getElementById("tab-comparisons"),
    "cowork-billing": document.getElementById("tab-cowork-billing"),
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
    // Persist + sync hash so the choice survives a reload and is shareable.
    try { localStorage.setItem("pages-analytics-tab", key); } catch (_) {}
    if (key !== "summary") {
      history.replaceState(null, "", `#${key}`);
    } else if (location.hash) {
      history.replaceState(null, "", location.pathname + location.search);
    }
    // SVG charts need a re-render when they become visible (clientWidth is 0 while hidden).
    if (key === "comparisons") {
      requestAnimationFrame(() => renderMultiline(reposData));
    } else if (key === "portfolio") {
      requestAnimationFrame(() => renderPortfolioStack(reposData));
    } else if (key === "cowork-billing") {
      requestAnimationFrame(() => renderCoworkBilling(reposData, history.sites || {}));
    }
  };
  tabBtns.forEach(b => b.addEventListener("click", () => activateTab(b.dataset.tab)));

  // Portfolio stacked-chart controls
  document.querySelectorAll(".port-window-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".port-window-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      portfolioStackState.window = btn.dataset.portWindow;
      renderPortfolioStack(reposData);
    });
  });
  document.querySelectorAll(".port-metric-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".port-metric-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      portfolioStackState.metric = btn.dataset.portMetric;
      renderPortfolioStack(reposData);
    });
  });
  window.addEventListener("resize", () => {
    clearTimeout(window.__portResizeT);
    window.__portResizeT = setTimeout(() => renderPortfolioStack(reposData), 150);
  });

  // React to manual hash changes (browser back/forward, or pasting #portfolio)
  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace("#", "");
    activateTab(tabPanels[h] ? h : "summary");
  });

  // Restore tab from hash > localStorage > default
  let initialTab = "summary";
  const hashKey = (location.hash || "").replace("#", "");
  if (tabPanels[hashKey]) initialTab = hashKey;
  else {
    try {
      const saved = localStorage.getItem("pages-analytics-tab");
      if (saved && tabPanels[saved]) initialTab = saved;
    } catch (_) {}
  }
  activateTab(initialTab);
}

load();
