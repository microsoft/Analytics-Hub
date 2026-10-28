/* ============================================================
   Pages Analytics · video traffic + interaction dashboard
   Reads the daily snapshot exported from Cloudflare KV.
   ============================================================ */

const VIDEO_DATA_URL = "../data/video-analytics.json";
const YOUTUBE_DATA_URL = "../data/youtube-analytics.json";
const VIDEO_STATS_URL = "https://analytics-hub-video-stats.stephansmith-msft.workers.dev/stats.json";

const VIDEO_META = {
  "Analytics_Hub_Tour": { name: "Analytics Hub Tour", duration: 132, family: "Hub" },
  "ValueLens-Demo": { name: "ValueLens Demo", duration: 132, family: "Report demos" },
  "ConsumptionCentral-Demo": { name: "Consumption Central Demo", duration: 128, family: "Report demos" },
  "AgentEvaluator-Demo": { name: "Agent Evaluator Demo", duration: 141, family: "Report demos" },
  "GitHubCopilotPanel-Demo": { name: "GitHub Copilot Panel Demo", duration: 130, family: "Report demos" },
  "AI-in-One-Overview": { name: "AI-in-One Overview", duration: 155, family: "Report demos" },
  "AI-in-One-Setup-Guide": { name: "AI-in-One Setup Guide", duration: 210, family: "Report demos" },
  "CreditUsage-Demo": { name: "Cowork Credit Chargeback Demo", duration: 150, family: "Cowork Billing" },
  "FinOps-Cowork-Demo": { name: "FinOps and FOCUS Cost Demo", duration: 119, family: "Cowork Billing" },
  "multi-budget-chargeback-walkthrough": { name: "Multi-Budget Chargeback Walkthrough", duration: 210, family: "Cowork Billing" },
  "Cowork_Team_Report_Setup": { name: "Cowork Team Report Setup", duration: 180, family: "Cowork Billing" },
  "Cowork_Policy_Helper_Overview": { name: "Cowork Policy Helper Overview", duration: 150, family: "Cowork Billing" },
  "Cowork_Policy_Helper_Tutorial": { name: "Cowork Policy Helper Tutorial", duration: 360, family: "Cowork Billing" },
  "ESS_Insights_Overview": { name: "ESS Insights Overview", duration: 138, family: "Report demos" },
  "Personal_Dashboard_Overview": { name: "Personal Dashboard Overview", duration: 159, family: "Report demos" },
  "What-Cowork-Did-For-Me-Overview": { name: "What Cowork Did For Me Overview", duration: 150, family: "Report demos" },
  "M365UsageAnalytics_Overview": { name: "M365 Usage Analytics Overview", duration: 150, family: "Report demos" },
  "CopilotROICalculator-Demo": { name: "Copilot ROI Calculator Demo", duration: 150, family: "Tools" },
  "Cowork-Adoption-Intelligence-Walkthrough": { name: "Cowork Adoption Intelligence Walkthrough", duration: 180, family: "Report demos" },
  "AI-Solutions-Intelligence-Dashboard-Overview": { name: "AI Solutions Intelligence Overview", duration: 180, family: "Report demos" },
  "AI-Solutions-Dashboard-V27-In-Testing-Walkthrough": { name: "AI Solutions Dashboard Walkthrough", duration: 240, family: "Report demos" },
  "ValueLens_Fabric_Setup": { name: "ValueLens Fabric Setup", duration: 240, family: "Setup guides" },
  /* YouTube embeds (clarity-events.js YT_NAMES); durations from the channel. */
  "YT-Analytics-Hub-Tour": { name: "Analytics Hub Tour (YouTube)", duration: 284, family: "Hub" },
  "YT-ValueLens-Overview": { name: "ValueLens Overview (YouTube)", duration: 109, family: "Report demos" },
  "YT-ValueLens-Fabric-Setup": { name: "ValueLens Fabric Setup (YouTube)", duration: 2149, family: "Setup guides" },
  "YT-Consumption-Central-Overview": { name: "Consumption Central Overview (YouTube)", duration: 111, family: "Report demos" },
  "YT-Consumption-Central-Setup": { name: "Consumption Central Setup (YouTube)", duration: 649, family: "Setup guides" },
  "YT-Cowork-Team-Report": { name: "Cowork Team Report (YouTube)", duration: 293, family: "Cowork Billing" },
  "YT-Cowork-Chargeback-Billing-Overview": { name: "Cowork Chargeback and Billing Overview (YouTube)", duration: 135, family: "Cowork Billing" },
  "YT-Agent-Evaluator-Overview": { name: "Agent Evaluator Overview (YouTube)", duration: 113, family: "Report demos" },
  "YT-AI-in-One-Overview": { name: "AI-in-One Overview (YouTube)", duration: 150, family: "Report demos" },
  "YT-AI-in-One-Setup": { name: "AI-in-One Setup (YouTube)", duration: 612, family: "Setup guides" },
  "YT-Personal-Dashboard-Overview": { name: "Personal Dashboard Overview (YouTube)", duration: 195, family: "Report demos" },
  "YT-M365-Copilot-Readiness-Overview": { name: "M365 Copilot Readiness Overview (YouTube)", duration: 106, family: "Report demos" },
  "YT-ESS-Insights-Overview": { name: "ESS Insights Overview (YouTube)", duration: 100, family: "Report demos" },
  "YT-Copilot-ROI-Calculator-Overview": { name: "Copilot ROI Calculator Overview (YouTube)", duration: 111, family: "Tools" },
  "YT-Cowork-Policy-Helper-Overview": { name: "Cowork Policy Helper Overview (YouTube)", duration: 106, family: "Cowork Billing" },
  "YT-FinOps-FOCUS-Overview": { name: "FinOps and FOCUS Overview (YouTube)", duration: 115, family: "Cowork Billing" },
  "YT-What-Cowork-Did-For-Me-Overview": { name: "What Cowork Did For Me Overview (YouTube)", duration: 124, family: "Report demos" },
};

let rawStats = null;
let rawYouTube = null;
let currentWindow = "lifetime";
let sortKey = "views";
let sortDir = -1;
let topDriversSort = "watch";
let youtubeTopSort = "watch";
let activeTrafficSource = "external";
const WINDOW_OPTIONS = {
  "48h": { label: "last 48 hours", days: 2 },
  "7d": { label: "last 7 days", days: 7 },
  "14d": { label: "last 14 days", days: 14 },
  "30d": { label: "last 30 days", days: 30 },
  lifetime: { label: "Lifetime", lifetime: true },
};
const TRAFFIC_SOURCE_PRESET = [
  { key: "external", label: "External", color: "#0078d4" },
  { key: "youtube-search", label: "YouTube search", color: "#57a300" },
  { key: "channel-pages", label: "Channel pages", color: "#d98b00" },
  { key: "browse-features", label: "Browse features", color: "#8a2be2" },
  { key: "direct-or-unknown", label: "Direct or unknown", color: "#e4456f" },
  { key: "suggested-videos", label: "Suggested videos", color: "#7a7a7a" },
  { key: "other-youtube-features", label: "Other YouTube features", color: "#7a7a7a" },
  { key: "playlists", label: "Playlists", color: "#7a7a7a" },
  { key: "end-screens", label: "End screens", color: "#7a7a7a" },
  { key: "notifications", label: "Notifications", color: "#7a7a7a" },
];

function fmtNum(value) {
  return Math.round(value || 0).toLocaleString("en-US");
}

function fmtDuration(seconds) {
  const total = Math.max(0, Math.round(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function fmtMinutes(minutes) {
  return fmtDuration((Number(minutes) || 0) * 60);
}

function fmtHoursFromSeconds(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function fmtHoursFromMinutes(minutes) {
  return fmtHoursFromSeconds((Number(minutes) || 0) * 60);
}

function fmtPct(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
}

function fmtDay(date) {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function addDaysIso(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function daySpanInclusive(startDate, endDate) {
  const s = new Date(`${startDate}T00:00:00Z`);
  const e = new Date(`${endDate}T00:00:00Z`);
  const ms = e - s;
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / 86400000) + 1;
}

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function sourceKeyFor(value) {
  const norm = normalizeKey(value);
  if (norm.includes("external")) return "external";
  if (norm.includes("youtube-search") || norm.includes("yt-search")) return "youtube-search";
  if (norm.includes("channel-pages")) return "channel-pages";
  if (norm.includes("browse-features")) return "browse-features";
  if (norm.includes("direct-or-unknown") || norm.includes("direct-unknown")) return "direct-or-unknown";
  if (norm.includes("suggested-videos")) return "suggested-videos";
  if (norm.includes("other-youtube-features")) return "other-youtube-features";
  if (norm.includes("playlists")) return "playlists";
  if (norm.includes("end-screens")) return "end-screens";
  if (norm.includes("notifications")) return "notifications";
  return norm || "unknown";
}

function metricValue(row, keys) {
  for (const key of keys) {
    const value = row?.[key];
    if (value != null && Number.isFinite(Number(value))) return Number(value);
  }
  return 0;
}

function summarizeYouTubeDays(days) {
  const rows = Array.isArray(days) ? days : [];
  const hasField = (field) => rows.some((day) => day[field] != null && Number.isFinite(Number(day[field])));
  const sumField = (field) => rows.reduce((sum, day) => sum + (Number(day[field]) || 0), 0);
  const views = sumField("views");
  const weightedDuration = rows.reduce((sum, day) => sum + (Number(day.averageViewDuration) || 0) * (Number(day.views) || 0), 0);
  const weightedPercentage = rows.reduce((sum, day) => sum + (Number(day.averageViewPercentage) || 0) * (Number(day.views) || 0), 0);
  return {
    views,
    watchMinutes: sumField("watchMinutes"),
    subscribersNet: sumField("subscribersNet"),
    averageViewDuration: views ? weightedDuration / views : 0,
    averageViewPercentage: views ? weightedPercentage / views : 0,
    likes: hasField("likes") ? sumField("likes") : null,
    comments: hasField("comments") ? sumField("comments") : null,
    shares: hasField("shares") ? sumField("shares") : null,
  };
}

function setKpiTrend(id, delta, formatter) {
  const el = document.getElementById(id);
  if (!el) return;
  if (delta == null || !Number.isFinite(delta)) {
    el.className = "trend flat";
    el.textContent = "Trend: -";
    return;
  }
  const cls = trendClass(delta);
  el.className = `trend ${cls}`;
  el.textContent = `Trend: ${signed(delta, formatter(Math.abs(delta)))}`;
}

function trendClass(delta) {
  if (delta > 0) return "pos";
  if (delta < 0) return "neg";
  return "flat";
}

function signed(delta, formattedAbs) {
  if (!Number.isFinite(delta)) return "-";
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "±";
  return `${sign}${formattedAbs}`;
}

function renderTrend(delta, formatter) {
  if (delta == null || !Number.isFinite(delta)) return "";
  return `<span class="va-trend ${trendClass(delta)}">${signed(delta, formatter(Math.abs(delta)))}</span>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[ch]));
}

function friendlyName(file) {
  const base = String(file || "").replace(/\.(mp4|webm|ogg|mov|m4v)$/i, "");
  return base
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function metaFor(file) {
  return VIDEO_META[file] || VIDEO_META[String(file).replace(/\.(mp4|webm|ogg|mov|m4v)$/i, "")] || {
    name: friendlyName(file),
    duration: 0,
    family: "Other",
  };
}

function windowDays() {
  return filterDaysByWindow(rawStats?.days || []);
}

function aggregate(days = windowDays()) {
  const acc = new Map();
  days.forEach((day) => {
    Object.entries(day.videos || {}).forEach(([file, row]) => {
      const prev = acc.get(file) || {
        file,
        plays: 0,
        seconds: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        hasLikes: false,
        hasComments: false,
        hasShares: false,
      };
      prev.plays += Number(row.plays) || 0;
      prev.seconds += Number(row.secs ?? row.seconds) || 0;
      if (row.likes != null) {
        prev.likes += Number(row.likes) || 0;
        prev.hasLikes = true;
      }
      if (row.comments != null) {
        prev.comments += Number(row.comments) || 0;
        prev.hasComments = true;
      }
      if (row.shares != null) {
        prev.shares += Number(row.shares) || 0;
        prev.hasShares = true;
      }
      acc.set(file, prev);
    });
  });
  return [...acc.values()].map((row) => {
    const meta = metaFor(row.file);
    const avg = row.plays ? row.seconds / row.plays : 0;
    const completion = meta.duration && row.plays ? Math.min(1, avg / meta.duration) : null;
    return {
      ...row,
      name: meta.name,
      duration: meta.duration,
      family: meta.family,
      views: row.plays,
      avg,
      completion,
      likes: row.hasLikes ? row.likes : null,
      comments: row.hasComments ? row.comments : null,
      shares: row.hasShares ? row.shares : null,
    };
  });
}

function dailySeries() {
  return [...windowDays()].reverse().map((day) => {
    const rows = Object.values(day.videos || {});
    return {
      date: day.date,
      plays: rows.reduce((sum, row) => sum + (Number(row.plays) || 0), 0),
      seconds: rows.reduce((sum, row) => sum + (Number(row.secs ?? row.seconds) || 0), 0),
    };
  });
}

function priorRows() {
  const days = rawStats?.days || [];
  const cfg = windowConfig();
  if (cfg.lifetime) return [];
  return aggregate(days.slice(cfg.days, cfg.days * 2));
}

function pctDelta(now, previous) {
  if (!previous) return null;
  return Math.round(((now - previous) / previous) * 100);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function windowConfig() {
  return WINDOW_OPTIONS[currentWindow] || WINDOW_OPTIONS["7d"];
}

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

function lifetimeStartIsoUtc() {
  const year = new Date().getUTCFullYear();
  return `${year}-09-01`;
}

function filterDaysByWindow(days = []) {
  const cfg = windowConfig();
  if (!cfg.lifetime) return days.slice(0, cfg.days);
  if (rawYouTube?.windows?.lifetime?.startDate && rawYouTube?.windows?.lifetime?.endDate) {
    const start = rawYouTube.windows.lifetime.startDate;
    const end = rawYouTube.windows.lifetime.endDate;
    return days.filter((day) => day.date >= start && day.date <= end);
  }
  const start = lifetimeStartIsoUtc();
  const end = todayIsoUtc();
  return days.filter((day) => day.date >= start && day.date <= end);
}

function renderMeta() {
  if (rawStats?.message) {
    setText("va-meta", rawStats.message);
    setText("va-window-label", windowConfig().label);
    return;
  }
  const updated = rawStats?.updated ? new Date(rawStats.updated) : null;
  const lastUpdated = rawStats?.lastUpdated ? new Date(rawStats.lastUpdated) : null;
  const days = windowDays();
  const newest = days[0]?.date;
  const oldest = days[days.length - 1]?.date;
  const fmt = (date) => new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const parts = [];
  if (oldest && newest) parts.push(`Showing ${fmt(oldest)} to ${fmt(newest)}`);
  const stamp = lastUpdated && !Number.isNaN(lastUpdated.valueOf()) ? lastUpdated : updated;
  if (stamp && !Number.isNaN(stamp.valueOf())) {
    parts.push(`refreshed ${stamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`);
  }
  if (rawStats?.summary?.dayCount) parts.push(`${rawStats.summary.dayCount} stored days`);
  setText("va-meta", parts.length ? parts.join(" · ") : "No video telemetry loaded yet.");
  setText("va-window-label", windowConfig().label);
}

function renderKpis(rows) {
  const totalPlays = rows.reduce((sum, row) => sum + row.plays, 0);
  const totalSeconds = rows.reduce((sum, row) => sum + row.seconds, 0);
  const avg = totalPlays ? totalSeconds / totalPlays : 0;
  const weightedCompletionDenom = rows.reduce((sum, row) => sum + (row.duration ? row.plays : 0), 0);
  const weightedCompletion = weightedCompletionDenom
    ? rows.reduce((sum, row) => sum + (row.completion == null ? 0 : row.completion * row.plays), 0) / weightedCompletionDenom
    : null;
  const previousPlays = priorRows().reduce((sum, row) => sum + row.plays, 0);
  const delta = pctDelta(totalPlays, previousPlays);

  setText("va-kpi-plays", fmtNum(totalPlays));
  setText("va-kpi-watch", fmtHoursFromSeconds(totalSeconds));
  setText("va-kpi-avg", fmtHoursFromSeconds(avg));
  setText("va-kpi-completion", weightedCompletion == null ? "-" : `${Math.round(weightedCompletion * 100)}%`);
  setText("va-kpi-count", fmtNum(rows.filter((row) => row.plays > 0).length));

  const foot = document.getElementById("va-kpi-plays-foot");
  if (foot) {
    const cfg = windowConfig();
    foot.innerHTML = delta == null || cfg.lifetime
      ? "Starts across all videos"
      : `vs prior ${cfg.days}d: <span class="${delta >= 0 ? "pos" : "neg"}">${delta >= 0 ? "+" : ""}${delta}%</span>`;
  }
}

function renderInsights(rows) {
  const host = document.getElementById("va-insights");
  if (!host) return;
  const days = dailySeries();
  const peak = [...days].sort((a, b) => b.plays - a.plays)[0];
  const byVideoPrior = new Map(priorRows().map((row) => [row.file, row]));
  const risers = rows.map((row) => {
    const prev = byVideoPrior.get(row.file)?.plays || 0;
    return { ...row, previousPlays: prev, lift: row.plays - prev };
  }).sort((a, b) => b.lift - a.lift);
  const riser = risers.find((row) => row.lift > 0) || risers[0];
  const sticky = [...rows].filter((row) => row.plays > 0).sort((a, b) => b.avg - a.avg)[0];
  const fmtDate = (date) => date
    ? new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    : "-";
  host.innerHTML = [
    {
      label: "Peak traffic day",
      value: peak ? `${fmtDate(peak.date)} · ${fmtNum(peak.plays)} plays` : "-",
      note: peak ? `${fmtHoursFromSeconds(peak.seconds)} watched that day.` : "No daily trend yet.",
    },
    {
      label: "Fastest mover",
      value: riser ? riser.name : "-",
      note: riser
        ? (windowConfig().lifetime
          ? `${riser.lift >= 0 ? "+" : ""}${fmtNum(riser.lift)} plays in the lifetime window.`
          : `${riser.lift >= 0 ? "+" : ""}${fmtNum(riser.lift)} plays vs the prior ${windowConfig().days}d window.`)
        : "Needs a prior window to compare.",
    },
    {
      label: "Deepest viewing",
      value: sticky ? sticky.name : "-",
      note: sticky ? `${fmtHoursFromSeconds(sticky.avg)} average view duration.` : "No play depth yet.",
    },
  ].map((item) => `
    <div class="va-insight">
      <div class="label">${item.label}</div>
      <div class="value">${item.value}</div>
      <div class="note">${item.note}</div>
    </div>
  `).join("");
}

function linePath(points, width, height, max, key) {
  if (!points.length) return "";
  const left = 38;
  const right = 14;
  const top = 14;
  const bottom = 24;
  const plotW = Math.max(1, width - left - right);
  const plotH = Math.max(1, height - top - bottom);
  return points.map((p, i) => {
    const x = left + (points.length === 1 ? plotW : (i / (points.length - 1)) * plotW);
    const y = top + plotH - ((p[key] || 0) / Math.max(1, max)) * plotH;
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function areaPath(points, width, height, max, key) {
  if (!points.length) return "";
  const left = 38;
  const right = 14;
  const bottom = 24;
  const plotW = Math.max(1, width - left - right);
  const baseY = height - bottom;
  return `${linePath(points, width, height, max, key)} L${left + plotW},${baseY} L${left},${baseY} Z`;
}

function renderTrend() {
  const host = document.getElementById("va-trend");
  const points = dailySeries();
  if (!host) return;
  if (!points.length || !points.some((p) => p.plays || p.seconds)) {
    host.innerHTML = '<p class="va-message"><strong>No plays in this window</strong>Video starts and watched seconds will appear here once visitors interact with embedded videos.</p>';
    return;
  }
  const width = 760;
  const height = 240;
  const maxPlays = Math.max(1, ...points.map((p) => p.plays));
  const maxSeconds = Math.max(1, ...points.map((p) => p.seconds));
  const grid = [0, .25, .5, .75, 1].map((t) => {
    const y = 14 + (height - 14 - 24) * t;
    return `<line class="grid" x1="38" x2="${width - 14}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" />`;
  }).join("");
  const labels = points.map((p, i) => {
    if (points.length > 10 && i % Math.ceil(points.length / 6) !== 0 && i !== points.length - 1) return "";
    const x = 38 + (points.length === 1 ? 0 : (i / (points.length - 1)) * (width - 52));
    const label = new Date(p.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return `<text class="lbl" x="${x.toFixed(1)}" y="${height - 5}" text-anchor="middle">${label}</text>`;
  }).join("");
  host.innerHTML = `
    <svg class="va-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily video plays and watch time">
      ${grid}
      <path class="area" d="${areaPath(points, width, height, maxPlays, "plays")}" />
      <path class="line" d="${linePath(points, width, height, maxPlays, "plays")}" />
      <path class="line watch" d="${linePath(points, width, height, maxSeconds, "seconds")}" />
      ${labels}
      <text class="lbl" x="8" y="18">high</text>
      <text class="lbl" x="8" y="${height - 27}">0</text>
    </svg>`;
}

function renderTopWatch(rows) {
  const host = document.getElementById("va-top-watch-body");
  if (!host) return;
  const watchBtn = document.getElementById("va-top-sort-watch");
  const viewsBtn = document.getElementById("va-top-sort-views");
  if (watchBtn && viewsBtn) {
    watchBtn.setAttribute("aria-pressed", topDriversSort === "watch" ? "true" : "false");
    viewsBtn.setAttribute("aria-pressed", topDriversSort === "views" ? "true" : "false");
  }
  const withData = [...rows].filter((row) => row.seconds > 0 || row.plays > 0);
  const sorted = withData.sort((a, b) => (
    topDriversSort === "views" ? (b.plays - a.plays) : (b.seconds - a.seconds)
  ));
  const top = sorted.slice(0, 8);
  host.innerHTML = top.length ? top.map((row) => `
    <tr>
      <td><div class="va-top-video">${esc(row.name)}</div></td>
      <td class="num"><strong>${fmtHoursFromSeconds(row.seconds)}</strong></td>
      <td class="num">${fmtNum(row.plays)}</td>
    </tr>
  `).join("") : '<tr><td colspan="3" class="va-message"><strong>No watch time yet</strong>Video starts and watch time will appear here when viewers interact with videos.</td></tr>';
}

function renderTable(rows) {
  const body = document.getElementById("va-body");
  if (!body) return;
  const withPlays = rows.filter((row) => row.plays > 0);
  if (!withPlays.length) {
    body.innerHTML = '<tr><td colspan="8" class="va-message"><strong>No video interactions in this window</strong>Try another window, or open the page with the collector access key.</td></tr>';
    return;
  }
  const maxViews = Math.max(1, ...withPlays.map((row) => row.views));
  const cfg = windowConfig();
  const showTrend = !cfg.lifetime;
  const priorByFile = new Map(priorRows().map((row) => [row.file, row]));
  const sorted = [...withPlays].sort((a, b) => {
    if (sortKey === "name") return a.name.localeCompare(b.name) * sortDir;
    const x = a[sortKey] == null ? -1 : a[sortKey];
    const y = b[sortKey] == null ? -1 : b[sortKey];
    return (x - y) * sortDir;
  });
  body.innerHTML = sorted.map((row) => {
    const prev = priorByFile.get(row.file) || {};
    const viewsTrend = showTrend ? renderTrend(row.views - (prev.views || 0), fmtNum) : "";
    const watchTrend = showTrend ? renderTrend(row.seconds - (prev.seconds || 0), fmtHoursFromSeconds) : "";
    const avgTrend = showTrend ? renderTrend(row.avg - (prev.avg || 0), fmtHoursFromSeconds) : "";
    const completionTrend = showTrend && row.completion != null && prev.completion != null
      ? renderTrend((row.completion - prev.completion) * 100, (v) => `${v.toFixed(1)}pp`)
      : "";
    const likesTrend = showTrend && row.likes != null && prev.likes != null ? renderTrend(row.likes - prev.likes, fmtNum) : "";
    const commentsTrend = showTrend && row.comments != null && prev.comments != null ? renderTrend(row.comments - prev.comments, fmtNum) : "";
    const sharesTrend = showTrend && row.shares != null && prev.shares != null ? renderTrend(row.shares - prev.shares, fmtNum) : "";
    return `
    <tr>
      <td><div class="va-video-name">${esc(row.name)}</div><div class="va-video-file">Video Play: ${esc(row.file)}</div></td>
      <td class="num"><strong>${fmtNum(row.views)}</strong><div class="va-bar-track"><div class="va-bar" style="width:${row.views / maxViews * 100}%"></div></div>${viewsTrend}</td>
      <td class="num">${fmtHoursFromSeconds(row.seconds)}${watchTrend}</td>
      <td class="num">${fmtHoursFromSeconds(row.avg)}${avgTrend}</td>
      <td class="num">${row.completion == null ? '<span class="va-pill">unknown</span>' : `<span class="va-pill">${Math.round(row.completion * 100)}%</span>`}${completionTrend}</td>
      <td class="num">${row.likes == null ? "-" : fmtNum(row.likes)}${likesTrend}</td>
      <td class="num">${row.comments == null ? "-" : fmtNum(row.comments)}${commentsTrend}</td>
      <td class="num">${row.shares == null ? "-" : fmtNum(row.shares)}${sharesTrend}</td>
    </tr>
  `;
  }).join("");
}

function render() {
  const rows = aggregate();
  renderMeta();
  renderKpis(rows);
  renderInsights(rows);
  renderTrend();
  renderTopWatch(rows);
  renderTable(rows);
  renderYouTube();
}

function youtubeWindow() {
  const cfg = windowConfig();
  if (cfg.lifetime && rawYouTube?.windows?.lifetime?.summary) return rawYouTube.windows.lifetime;
  const keyed = !cfg.lifetime ? rawYouTube?.windows?.[String(cfg.days)] : null;
  if (keyed) return keyed;
  const days = filterDaysByWindow(rawYouTube?.days || []);
  const summary = days.reduce((acc, day) => {
    acc.views += Number(day.views) || 0;
    acc.watchMinutes += Number(day.watchMinutes) || 0;
    acc.subscribersNet += Number(day.subscribersNet) || 0;
    acc.durationNumerator += (Number(day.averageViewDuration) || 0) * (Number(day.views) || 0);
    acc.percentageNumerator += (Number(day.averageViewPercentage) || 0) * (Number(day.views) || 0);
    return acc;
  }, { views: 0, watchMinutes: 0, subscribersNet: 0, durationNumerator: 0, percentageNumerator: 0 });
  summary.averageViewDuration = summary.views ? summary.durationNumerator / summary.views : 0;
  summary.averageViewPercentage = summary.views ? summary.percentageNumerator / summary.views : 0;
  delete summary.durationNumerator;
  delete summary.percentageNumerator;
  return { summary, videos: rawYouTube?.videos || [] };
}

function youtubeDailySeries() {
  return [...filterDaysByWindow(rawYouTube?.days || [])].reverse().map((day) => ({
    date: day.date,
    views: Number(day.views) || 0,
    watchMinutes: Number(day.watchMinutes) || 0,
  }));
}

function renderYouTubeMeta() {
  const metas = [document.getElementById("yt-meta"), document.getElementById("yt-meta-inline")].filter(Boolean);
  const selectedRange = document.getElementById("yt-selected-range");
  if (!metas.length) return;
  const setMeta = (text) => metas.forEach((meta) => { meta.textContent = text; });
  if (!rawYouTube || rawYouTube.message) {
    setMeta(rawYouTube?.message || "No YouTube Analytics snapshot has been published yet.");
    if (selectedRange) selectedRange.textContent = "Selected range: -";
    return;
  }
  const win = youtubeWindow();
  const days = filterDaysByWindow(rawYouTube.days || []);
  const newest = win?.endDate || days[0]?.date;
  const oldest = win?.startDate || days[days.length - 1]?.date;
  const stamp = rawYouTube.lastUpdated ? new Date(rawYouTube.lastUpdated) : null;
  const parts = [];
  if (oldest && newest) parts.push(`Date range: ${fmtDay(oldest)} to ${fmtDay(newest)}`);
  if (stamp && !Number.isNaN(stamp.valueOf())) {
    parts.push(`refreshed ${stamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`);
  }
  if (rawYouTube.source?.hasRevenue) parts.push("revenue included");
  else parts.push("revenue hidden");
  setMeta(parts.join(" · "));
  if (selectedRange) {
    selectedRange.textContent = oldest && newest
      ? `Selected range: ${fmtDay(oldest)} to ${fmtDay(newest)}`
      : "Selected range: -";
  }
}

function renderYouTubeKpis(win) {
  const summary = win?.summary || {};
  const windowDays = filterDaysByWindow(rawYouTube?.days || []);
  const currentDailySummary = summarizeYouTubeDays(windowDays);
  const isLifetime = windowConfig().lifetime;
  const currentChannel = rawYouTube?.current?.channel || {};
  const currentVideoViews = (rawYouTube?.current?.videos || []).reduce((sum, row) => sum + (Number(row.views) || 0), 0);
  const currentViews = Math.max(Number(currentChannel.viewCount) || 0, currentVideoViews);
  const hasWindowViews = Number(summary.views) > 0;
  const likesAvailable = currentDailySummary.likes != null;
  const commentsAvailable = currentDailySummary.comments != null;
  const sharesAvailable = currentDailySummary.shares != null;
  const likes = currentDailySummary.likes;
  const comments = currentDailySummary.comments;
  const shares = currentDailySummary.shares;

  const rangeStart = win?.startDate || windowDays[windowDays.length - 1]?.date;
  const rangeEnd = win?.endDate || windowDays[0]?.date;
  const span = (rangeStart && rangeEnd) ? daySpanInclusive(rangeStart, rangeEnd) : 0;
  let priorSummary = null;
  if (span > 0) {
    const priorEnd = addDaysIso(rangeStart, -1);
    const priorStart = addDaysIso(priorEnd, -(span - 1));
    const priorRows = (rawYouTube?.days || []).filter((day) => day.date >= priorStart && day.date <= priorEnd);
    if (priorRows.length) priorSummary = summarizeYouTubeDays(priorRows);
  }

  setText("yt-kpi-views", fmtNum(hasWindowViews ? summary.views : currentViews));
  setText("yt-kpi-watch", fmtHoursFromMinutes(summary.watchMinutes));
  setText("yt-kpi-subs", `${summary.subscribersNet > 0 ? "+" : ""}${fmtNum(summary.subscribersNet)}`);
  setText("yt-kpi-avg-view", fmtHoursFromSeconds(summary.averageViewDuration));
  setText("yt-kpi-avg-view-foot", `Average percent viewed: ${fmtPct((summary.averageViewPercentage || 0) / 100)}`);
  setText("yt-kpi-likes", likesAvailable ? fmtNum(likes) : "-");
  setText("yt-kpi-comments", commentsAvailable ? fmtNum(comments) : "-");
  setText("yt-kpi-shares", sharesAvailable ? fmtNum(shares) : "-");
  setText("yt-kpi-likes-foot", likesAvailable ? "From analytics snapshot" : "Not included in current snapshot");
  setText("yt-kpi-comments-foot", commentsAvailable ? "From analytics snapshot" : "Not included in current snapshot");
  setText("yt-kpi-shares-foot", sharesAvailable ? "From analytics snapshot" : "Not included in current snapshot");
  setText("yt-kpi-views-foot", isLifetime ? "Official YouTube Analytics lifetime views" : (hasWindowViews ? "Official YouTube Analytics views" : "Current public lifetime views"));

  setKpiTrend("yt-kpi-views-trend", priorSummary ? (Number(summary.views) - Number(priorSummary.views || 0)) : null, fmtNum);
  setKpiTrend("yt-kpi-subs-trend", priorSummary ? (Number(summary.subscribersNet) - Number(priorSummary.subscribersNet || 0)) : null, fmtNum);
  setKpiTrend("yt-kpi-watch-trend", priorSummary ? ((Number(summary.watchMinutes) - Number(priorSummary.watchMinutes || 0)) * 60) : null, fmtHoursFromSeconds);
  setKpiTrend("yt-kpi-avg-view-trend", priorSummary ? (Number(summary.averageViewDuration) - Number(priorSummary.averageViewDuration || 0)) : null, fmtHoursFromSeconds);
  setKpiTrend("yt-kpi-likes-trend", (priorSummary && likesAvailable && priorSummary.likes != null) ? (Number(likes) - Number(priorSummary.likes || 0)) : null, fmtNum);
  setKpiTrend("yt-kpi-comments-trend", (priorSummary && commentsAvailable && priorSummary.comments != null) ? (Number(comments) - Number(priorSummary.comments || 0)) : null, fmtNum);
  setKpiTrend("yt-kpi-shares-trend", (priorSummary && sharesAvailable && priorSummary.shares != null) ? (Number(shares) - Number(priorSummary.shares || 0)) : null, fmtNum);
}

function renderYouTubeTrend() {
  const host = document.getElementById("yt-trend");
  const points = youtubeDailySeries();
  if (!host) return;
  if (!points.length || !points.some((p) => p.views || p.watchMinutes)) {
    host.innerHTML = '<p class="va-message"><strong>No YouTube data in this window</strong>The scheduled snapshot will populate this chart after the first successful API run.</p>';
    return;
  }
  const width = 760;
  const height = 240;
  const maxViews = Math.max(1, ...points.map((p) => p.views));
  const maxMinutes = Math.max(1, ...points.map((p) => p.watchMinutes));
  const grid = [0, .25, .5, .75, 1].map((t) => {
    const y = 14 + (height - 14 - 24) * t;
    return `<line class="grid" x1="38" x2="${width - 14}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" />`;
  }).join("");
  const labels = points.map((p, i) => {
    if (points.length > 10 && i % Math.ceil(points.length / 6) !== 0 && i !== points.length - 1) return "";
    const x = 38 + (points.length === 1 ? 0 : (i / (points.length - 1)) * (width - 52));
    const label = new Date(p.date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    return `<text class="lbl" x="${x.toFixed(1)}" y="${height - 5}" text-anchor="middle">${label}</text>`;
  }).join("");
  host.innerHTML = `
    <svg class="va-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily YouTube views and watch time">
      ${grid}
      <path class="area" d="${areaPath(points, width, height, maxViews, "views")}" />
      <path class="line" d="${linePath(points, width, height, maxViews, "views")}" />
      <path class="line watch" d="${linePath(points, width, height, maxMinutes, "watchMinutes")}" />
      ${labels}
      <text class="lbl" x="8" y="18">high</text>
      <text class="lbl" x="8" y="${height - 27}">0</text>
    </svg>`;
}

function renderYouTubeTopVideos(win) {
  const host = document.getElementById("yt-top-videos-body");
  if (!host) return;
  const watchBtn = document.getElementById("yt-top-sort-watch");
  const viewsBtn = document.getElementById("yt-top-sort-views");
  if (watchBtn && viewsBtn) {
    watchBtn.setAttribute("aria-pressed", youtubeTopSort === "watch" ? "true" : "false");
    viewsBtn.setAttribute("aria-pressed", youtubeTopSort === "views" ? "true" : "false");
  }
  const windowVideos = [...(win?.videos || [])].filter((row) => row.views > 0);
  const currentVideos = [...(rawYouTube?.current?.videos || [])].filter((row) => row.views > 0);
  const videos = (windowVideos.length ? windowVideos : currentVideos).map((row) => ({
    ...row,
    watchMinutes: Number(row.watchMinutes) || 0,
    views: Number(row.views) || 0,
  }));
  videos.sort((a, b) => (
    youtubeTopSort === "views" ? (b.views - a.views) : (b.watchMinutes - a.watchMinutes)
  ));
  const top = videos.slice(0, 8);
  host.innerHTML = top.length ? top.map((row) => `
    <tr>
      <td><a class="va-top-video" href="${esc(row.url)}" target="_blank" rel="noopener">${esc(row.title)}</a></td>
      <td class="num"><strong>${fmtHoursFromMinutes(row.watchMinutes)}</strong></td>
      <td class="num">${fmtNum(row.views)}</td>
    </tr>
  `).join("") : '<tr><td colspan="3" class="va-message"><strong>No YouTube videos in this window</strong>The scheduled snapshot will populate this table after the first successful API run.</td></tr>';
}

function collectTrafficRows(win) {
  const byKey = new Map(TRAFFIC_SOURCE_PRESET.map((item) => [item.key, {
    ...item,
    views: 0,
    watchMinutes: 0,
    averageViewDurationNumerator: 0,
    details: [],
    hasData: false,
  }]));
  const detailsByKey = new Map();
  const ingestDetails = (sourceKey, details) => {
    if (!Array.isArray(details)) return;
    const list = detailsByKey.get(sourceKey) || [];
    details.forEach((detail) => list.push(detail));
    detailsByKey.set(sourceKey, list);
  };
  const rawBuckets = [
    ...(Array.isArray(win?.trafficSources) ? win.trafficSources : []),
    ...(Array.isArray(rawYouTube?.trafficSources) ? rawYouTube.trafficSources : []),
  ];
  rawBuckets.forEach((bucket) => {
    const label = bucket?.source || bucket?.name || bucket?.trafficSource || "Unknown";
    const sourceKey = sourceKeyFor(label);
    const preset = byKey.get(sourceKey) || {
      key: sourceKey,
      label: label,
      color: "#7a7a7a",
      views: 0,
      watchMinutes: 0,
      averageViewDurationNumerator: 0,
      details: [],
      hasData: false,
    };
    const views = metricValue(bucket, ["views", "viewCount"]);
    let watchMinutes = metricValue(bucket, ["watchMinutes", "watchTimeMinutes", "minutesWatched"]);
    if (!watchMinutes) watchMinutes = metricValue(bucket, ["watchTimeHours", "watchHours"]) * 60;
    const averageViewDuration = metricValue(bucket, ["averageViewDuration", "avgViewDuration", "averageViewDurationSeconds"]);
    preset.views += views;
    preset.watchMinutes += watchMinutes;
    preset.averageViewDurationNumerator += averageViewDuration * views;
    preset.hasData = preset.hasData || views > 0 || watchMinutes > 0 || averageViewDuration > 0;
    byKey.set(sourceKey, preset);
    ingestDetails(sourceKey, bucket?.details || bucket?.breakdown || bucket?.children);
  });

  const sourceDetails = win?.trafficSourceDetails || rawYouTube?.trafficSourceDetails || rawYouTube?.trafficSourceBreakdowns || {};
  Object.entries(sourceDetails).forEach(([sourceLabel, details]) => ingestDetails(sourceKeyFor(sourceLabel), details));

  const presetRows = TRAFFIC_SOURCE_PRESET.map((item) => {
    const row = byKey.get(item.key) || {
      ...item, views: 0, watchMinutes: 0, averageViewDurationNumerator: 0, hasData: false,
    };
    const averageViewDuration = row.views > 0 ? row.averageViewDurationNumerator / row.views : 0;
    return {
      ...row,
      averageViewDuration,
      details: detailsByKey.get(item.key) || [],
    };
  });
  const customRows = [...byKey.values()]
    .filter((row) => !TRAFFIC_SOURCE_PRESET.some((item) => item.key === row.key))
    .map((row) => ({
      ...row,
      averageViewDuration: row.views > 0 ? row.averageViewDurationNumerator / row.views : 0,
      details: detailsByKey.get(row.key) || [],
    }))
    .sort((a, b) => b.views - a.views);
  const rows = [...presetRows, ...customRows];
  const totalViews = rows.reduce((sum, row) => sum + row.views, 0);
  const totalWatchMinutes = rows.reduce((sum, row) => sum + row.watchMinutes, 0);
  const totalAverageViewDuration = totalViews
    ? rows.reduce((sum, row) => sum + (row.averageViewDuration * row.views), 0) / totalViews
    : 0;
  return { rows, totalViews, totalWatchMinutes, totalAverageViewDuration };
}

function renderTrafficMetric(value, total, formatter, showDashWhenEmpty = true) {
  const num = Number(value) || 0;
  if (!num && showDashWhenEmpty) return "-";
  const share = total > 0 ? `${((num / total) * 100).toFixed(1)}%` : "0.0%";
  return `<span class="yt-metric"><span>${formatter(num)}</span><span class="share">${share}</span></span>`;
}

function normalizeTrafficDetails(details) {
  return (Array.isArray(details) ? details : []).map((row) => {
    const views = metricValue(row, ["views", "viewCount"]);
    let watchMinutes = metricValue(row, ["watchMinutes", "watchTimeMinutes", "minutesWatched"]);
    if (!watchMinutes) watchMinutes = metricValue(row, ["watchTimeHours", "watchHours"]) * 60;
    const averageViewDuration = metricValue(row, ["averageViewDuration", "avgViewDuration", "averageViewDurationSeconds"]);
    const label = row?.source || row?.name || row?.domain || row?.label || "Unknown";
    return { label, views, watchMinutes, averageViewDuration };
  }).filter((row) => row.label);
}

function renderTrafficSourceSection(win) {
  const sourceBody = document.getElementById("yt-traffic-sources-body");
  const detailBody = document.getElementById("yt-traffic-details-body");
  const detailHeading = document.getElementById("yt-traffic-detail-heading");
  const note = document.getElementById("yt-traffic-note");
  if (!sourceBody || !detailBody || !detailHeading) return;

  const table = collectTrafficRows(win);
  const hasAnyData = table.rows.some((row) => row.hasData);
  const selected = table.rows.find((row) => row.key === activeTrafficSource) || table.rows[0];
  activeTrafficSource = selected?.key || "external";

  sourceBody.innerHTML = `
    <tr class="yt-traffic-total">
      <td><strong>Total</strong></td>
      <td class="num"><strong>${fmtNum(table.totalViews)}</strong></td>
      <td class="num"><strong>${fmtHoursFromMinutes(table.totalWatchMinutes)}</strong></td>
      <td class="num"><strong>${fmtHoursFromSeconds(table.totalAverageViewDuration)}</strong></td>
    </tr>
    ${table.rows.map((row) => `
      <tr class="yt-source-row ${row.key === activeTrafficSource ? "is-selected" : ""}">
        <td>
          <button type="button" class="yt-source-btn" data-traffic-source="${esc(row.key)}">
            <span class="yt-source-chip" style="border-color:${esc(row.color)}"></span>
            <span class="yt-source-label">${esc(row.label)}</span>
          </button>
        </td>
        <td class="num">${renderTrafficMetric(row.views, table.totalViews, fmtNum, !row.hasData)}</td>
        <td class="num">${renderTrafficMetric(row.watchMinutes, table.totalWatchMinutes, fmtHoursFromMinutes, !row.hasData)}</td>
        <td class="num">${row.hasData ? fmtHoursFromSeconds(row.averageViewDuration) : "-"}</td>
      </tr>
    `).join("")}
  `;

  sourceBody.querySelectorAll("button[data-traffic-source]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTrafficSource = button.dataset.trafficSource || "external";
      renderTrafficSourceSection(win);
    });
  });

  const selectedRow = table.rows.find((row) => row.key === activeTrafficSource) || selected;
  const details = normalizeTrafficDetails(selectedRow?.details);
  const detailViewsTotal = details.reduce((sum, row) => sum + row.views, 0) || selectedRow?.views || 0;
  const detailWatchTotal = details.reduce((sum, row) => sum + row.watchMinutes, 0) || selectedRow?.watchMinutes || 0;
  const detailAvg = detailViewsTotal
    ? details.reduce((sum, row) => sum + (row.averageViewDuration * row.views), 0) / detailViewsTotal
    : (selectedRow?.averageViewDuration || 0);

  detailHeading.textContent = `Traffic source > ${selectedRow?.label || "Selected source"}`;
  if (!details.length) {
    detailBody.innerHTML = `
      <tr class="yt-traffic-total">
        <td><strong>Total</strong></td>
        <td class="num"><strong>${fmtNum(selectedRow?.views || 0)}</strong></td>
        <td class="num"><strong>${fmtHoursFromMinutes(selectedRow?.watchMinutes || 0)}</strong></td>
        <td class="num"><strong>${fmtHoursFromSeconds(selectedRow?.averageViewDuration || 0)}</strong></td>
      </tr>
      <tr><td colspan="4" class="va-message"><strong>Detail breakdown unavailable</strong>The current snapshot does not include expanded rows for ${esc(selectedRow?.label || "this source")}.</td></tr>
    `;
  } else {
    detailBody.innerHTML = `
      <tr class="yt-traffic-total">
        <td><strong>Total</strong></td>
        <td class="num"><strong>${fmtNum(detailViewsTotal)}</strong></td>
        <td class="num"><strong>${fmtHoursFromMinutes(detailWatchTotal)}</strong></td>
        <td class="num"><strong>${fmtHoursFromSeconds(detailAvg)}</strong></td>
      </tr>
      ${details.sort((a, b) => b.views - a.views).map((row) => `
        <tr>
          <td>${esc(row.label)}</td>
          <td class="num">${renderTrafficMetric(row.views, detailViewsTotal, fmtNum, false)}</td>
          <td class="num">${renderTrafficMetric(row.watchMinutes, detailWatchTotal, fmtHoursFromMinutes, false)}</td>
          <td class="num">${fmtHoursFromSeconds(row.averageViewDuration)}</td>
        </tr>
      `).join("")}
    `;
  }
  if (note) {
    note.textContent = hasAnyData
      ? "Traffic source rows are scoped to the selected date window."
      : "Traffic source labels are preloaded. Expanded values appear after the YouTube snapshot includes traffic source dimensions.";
  }
}

function youtubeVideoRows(win) {
  const windowVideos = [...(win?.videos || [])].filter((row) => Number(row.views) > 0);
  const currentVideos = [...(rawYouTube?.current?.videos || [])].filter((row) => Number(row.views) > 0);
  const source = windowVideos.length ? "window" : "current";
  const rows = (windowVideos.length ? windowVideos : currentVideos).map((row) => ({
    title: row.title || "Untitled video",
    url: row.url || "",
    views: Number(row.views) || 0,
    watchMinutes: Number(row.watchMinutes) || 0,
    averageViewDuration: Number(row.averageViewDuration) || 0,
    averageViewPercentage: row.averageViewPercentage == null ? null : Number(row.averageViewPercentage),
  }));
  rows.sort((a, b) => b.views - a.views);
  return { rows, source };
}

function renderYouTubeVideoTable(win) {
  const body = document.getElementById("yt-video-body");
  const meta = document.getElementById("yt-video-meta");
  if (!body) return;
  const { rows, source } = youtubeVideoRows(win);

  if (meta) {
    if (!rows.length) {
      meta.textContent = "No per-video rows are available yet from the YouTube snapshot.";
    } else if (source === "window") {
      meta.textContent = `Per-video metrics from official YouTube Analytics for ${windowConfig().label}.`;
    } else {
      meta.textContent = "Per-video metrics from the latest public channel snapshot (window metrics unavailable).";
    }
  }

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="5" class="va-message"><strong>No per-video YouTube data in this window</strong>The scheduled YouTube snapshot will populate this table after the first successful API run.</td></tr>';
    return;
  }

  body.innerHTML = rows.map((row) => {
    const title = row.url
      ? `<a class="va-video-name" href="${esc(row.url)}" target="_blank" rel="noopener">${esc(row.title)}</a>`
      : `<span class="va-video-name">${esc(row.title)}</span>`;
    const completion = row.averageViewPercentage == null || Number.isNaN(row.averageViewPercentage)
      ? '<span class="va-pill">unknown</span>'
      : `<span class="va-pill">${fmtPct((row.averageViewPercentage || 0) / 100)}</span>`;
    return `
      <tr>
        <td>${title}</td>
        <td class="num"><strong>${fmtNum(row.views)}</strong></td>
        <td class="num">${fmtHoursFromMinutes(row.watchMinutes)}</td>
        <td class="num">${fmtHoursFromSeconds(row.averageViewDuration)}</td>
        <td class="num">${completion}</td>
      </tr>
    `;
  }).join("");
}

function renderYouTube() {
  renderYouTubeMeta();
  const win = youtubeWindow();
  renderYouTubeKpis(win);
  renderYouTubeTrend();
  renderYouTubeTopVideos(win);
  renderYouTubeVideoTable(win);
  renderTrafficSourceSection(win);
}

function tokenQuery() {
  const token = new URLSearchParams(location.search).get("k") || "";
  return token ? `?k=${encodeURIComponent(token)}` : "";
}

async function load() {
  const youtubePromise = fetch(YOUTUBE_DATA_URL, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .catch((err) => ({ message: `Could not load YouTube Analytics snapshot: ${err.message}.` }));
  try {
    const response = await fetch(VIDEO_DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    rawStats = await response.json();
  } catch (err) {
    const query = tokenQuery();
    if (query) {
      try {
        const response = await fetch(VIDEO_STATS_URL + query, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        rawStats = await response.json();
      } catch (fallbackErr) {
        rawStats = { updated: null, days: [], message: `Could not load video telemetry: ${fallbackErr.message}.` };
      }
    } else {
      rawStats = { updated: null, days: [], message: `Could not load stored video telemetry: ${err.message}.` };
    }
  }
  rawYouTube = await youtubePromise;
  render();
}

document.querySelectorAll(".va-window button[data-window]").forEach((button) => {
  button.addEventListener("click", () => {
    currentWindow = button.dataset.window || "lifetime";
    document.querySelectorAll(".va-window button[data-window]").forEach((item) => {
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    render();
  });
});

document.querySelectorAll(".va-table th[data-sort]").forEach((th) => {
  th.addEventListener("click", () => {
    const next = th.dataset.sort;
    if (sortKey === next) sortDir *= -1;
    else {
      sortKey = next;
      sortDir = next === "name" ? 1 : -1;
    }
    renderTable(aggregate());
  });

  document.querySelectorAll("button[data-top-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      topDriversSort = button.dataset.topSort === "views" ? "views" : "watch";
      renderTopWatch(aggregate());
    });
  });

  document.querySelectorAll("button[data-yt-top-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      youtubeTopSort = button.dataset.ytTopSort === "views" ? "views" : "watch";
      renderYouTubeTopVideos(youtubeWindow());
    });
  });
});

load();
