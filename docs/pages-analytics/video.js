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
};

let rawStats = null;
let rawYouTube = null;
let currentWindow = 7;
let sortKey = "plays";
let sortDir = -1;

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

function fmtPct(value) {
  return `${((Number(value) || 0) * 100).toFixed(1)}%`;
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
  return (rawStats?.days || []).slice(0, currentWindow);
}

function aggregate(days = windowDays()) {
  const acc = new Map();
  days.forEach((day) => {
    Object.entries(day.videos || {}).forEach(([file, row]) => {
      const prev = acc.get(file) || { file, plays: 0, seconds: 0 };
      prev.plays += Number(row.plays) || 0;
      prev.seconds += Number(row.secs ?? row.seconds) || 0;
      acc.set(file, prev);
    });
  });
  return [...acc.values()].map((row) => {
    const meta = metaFor(row.file);
    const avg = row.plays ? row.seconds / row.plays : 0;
    const completion = meta.duration && row.plays ? Math.min(1, avg / meta.duration) : null;
    return { ...row, name: meta.name, duration: meta.duration, family: meta.family, avg, completion };
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
  return aggregate(days.slice(currentWindow, currentWindow * 2));
}

function pctDelta(now, previous) {
  if (!previous) return null;
  return Math.round(((now - previous) / previous) * 100);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderMeta() {
  if (rawStats?.message) {
    setText("va-meta", rawStats.message);
    setText("va-window-label", `last ${currentWindow} days`);
    return;
  }
  const updated = rawStats?.updated ? new Date(rawStats.updated) : null;
  const lastUpdated = rawStats?.lastUpdated ? new Date(rawStats.lastUpdated) : null;
  const days = rawStats?.days || [];
  const newest = days[0]?.date;
  const oldest = days[Math.min(currentWindow, days.length) - 1]?.date;
  const fmt = (date) => new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const parts = [];
  if (oldest && newest) parts.push(`Showing ${fmt(oldest)} to ${fmt(newest)}`);
  const stamp = lastUpdated && !Number.isNaN(lastUpdated.valueOf()) ? lastUpdated : updated;
  if (stamp && !Number.isNaN(stamp.valueOf())) {
    parts.push(`refreshed ${stamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`);
  }
  if (rawStats?.summary?.dayCount) parts.push(`${rawStats.summary.dayCount} stored days`);
  setText("va-meta", parts.length ? parts.join(" · ") : "No video telemetry loaded yet.");
  setText("va-window-label", `last ${currentWindow} days`);
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
  setText("va-kpi-watch", fmtDuration(totalSeconds));
  setText("va-kpi-avg", fmtDuration(avg));
  setText("va-kpi-completion", weightedCompletion == null ? "-" : `${Math.round(weightedCompletion * 100)}%`);
  setText("va-kpi-count", fmtNum(rows.filter((row) => row.plays > 0).length));

  const foot = document.getElementById("va-kpi-plays-foot");
  if (foot) {
    foot.innerHTML = delta == null
      ? "Starts across all videos"
      : `vs prior ${currentWindow}d: <span class="${delta >= 0 ? "pos" : "neg"}">${delta >= 0 ? "+" : ""}${delta}%</span>`;
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
      note: peak ? `${fmtDuration(peak.seconds)} watched that day.` : "No daily trend yet.",
    },
    {
      label: "Fastest mover",
      value: riser ? riser.name : "-",
      note: riser ? `${riser.lift >= 0 ? "+" : ""}${fmtNum(riser.lift)} plays vs the prior ${currentWindow}d window.` : "Needs a prior window to compare.",
    },
    {
      label: "Deepest viewing",
      value: sticky ? sticky.name : "-",
      note: sticky ? `${fmtDuration(sticky.avg)} average watch per play.` : "No play depth yet.",
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
  const host = document.getElementById("va-top-watch");
  if (!host) return;
  const top = [...rows].filter((row) => row.seconds > 0).sort((a, b) => b.seconds - a.seconds).slice(0, 6);
  const maxSeconds = Math.max(1, ...top.map((row) => row.seconds));
  host.innerHTML = top.length ? top.map((row) => `
    <li>
      <span class="va-fill" style="width:${Math.max(4, row.seconds / maxSeconds * 100)}%"></span>
      <span><span class="name">${esc(row.name)}</span><span class="detail">${esc(row.family)} · ${fmtNum(row.plays)} plays</span></span>
      <span class="num">${fmtDuration(row.seconds)}</span>
    </li>
  `).join("") : '<li><span class="name">No watch time yet</span><span class="num">-</span></li>';
}

function renderTable(rows) {
  const body = document.getElementById("va-body");
  if (!body) return;
  const withPlays = rows.filter((row) => row.plays > 0);
  if (!withPlays.length) {
    body.innerHTML = '<tr><td colspan="5" class="va-message"><strong>No video interactions in this window</strong>Try another window, or open the page with the collector access key.</td></tr>';
    return;
  }
  const maxPlays = Math.max(1, ...withPlays.map((row) => row.plays));
  const sorted = [...withPlays].sort((a, b) => {
    if (sortKey === "name") return a.name.localeCompare(b.name) * sortDir;
    const x = a[sortKey] == null ? -1 : a[sortKey];
    const y = b[sortKey] == null ? -1 : b[sortKey];
    return (x - y) * sortDir;
  });
  body.innerHTML = sorted.map((row) => `
    <tr>
      <td><div class="va-video-name">${esc(row.name)}</div><div class="va-video-file">video play: ${esc(row.file)}</div></td>
      <td class="num"><strong>${fmtNum(row.plays)}</strong><div class="va-bar-track"><div class="va-bar" style="width:${row.plays / maxPlays * 100}%"></div></div></td>
      <td class="num">${fmtDuration(row.seconds)}</td>
      <td class="num">${fmtDuration(row.avg)}</td>
      <td class="num">${row.completion == null ? '<span class="va-pill">unknown</span>' : `<span class="va-pill">${Math.round(row.completion * 100)}%</span>`}</td>
    </tr>
  `).join("");
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
  const keyed = rawYouTube?.windows?.[String(currentWindow)];
  if (keyed) return keyed;
  const days = (rawYouTube?.days || []).slice(0, currentWindow);
  const summary = days.reduce((acc, day) => {
    acc.views += Number(day.views) || 0;
    acc.watchMinutes += Number(day.watchMinutes) || 0;
    acc.subscribersNet += Number(day.subscribersNet) || 0;
    acc.impressions += Number(day.impressions) || 0;
    acc.ctrNumerator += (Number(day.ctr) || 0) * (Number(day.impressions) || 0);
    return acc;
  }, { views: 0, watchMinutes: 0, subscribersNet: 0, impressions: 0, ctrNumerator: 0 });
  summary.ctr = summary.impressions ? summary.ctrNumerator / summary.impressions : 0;
  delete summary.ctrNumerator;
  return { summary, videos: rawYouTube?.videos || [] };
}

function youtubeDailySeries() {
  return [...(rawYouTube?.days || []).slice(0, currentWindow)].reverse().map((day) => ({
    date: day.date,
    views: Number(day.views) || 0,
    watchMinutes: Number(day.watchMinutes) || 0,
  }));
}

function renderYouTubeMeta() {
  const meta = document.getElementById("yt-meta");
  if (!meta) return;
  if (!rawYouTube || rawYouTube.message) {
    meta.textContent = rawYouTube?.message || "No YouTube Analytics snapshot has been published yet.";
    return;
  }
  const days = rawYouTube.days || [];
  const newest = days[0]?.date;
  const oldest = days[Math.min(currentWindow, days.length) - 1]?.date;
  const fmt = (date) => new Date(date + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const stamp = rawYouTube.lastUpdated ? new Date(rawYouTube.lastUpdated) : null;
  const parts = [];
  if (oldest && newest) parts.push(`Showing ${fmt(oldest)} to ${fmt(newest)}`);
  if (stamp && !Number.isNaN(stamp.valueOf())) {
    parts.push(`refreshed ${stamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`);
  }
  if (rawYouTube.source?.hasRevenue) parts.push("revenue included");
  else parts.push("revenue hidden");
  meta.textContent = parts.join(" · ");
}

function renderYouTubeKpis(win) {
  const summary = win?.summary || {};
  setText("yt-kpi-views", fmtNum(summary.views));
  setText("yt-kpi-watch", fmtMinutes(summary.watchMinutes));
  setText("yt-kpi-subs", `${summary.subscribersNet > 0 ? "+" : ""}${fmtNum(summary.subscribersNet)}`);
  setText("yt-kpi-impressions", fmtNum(summary.impressions));
  setText("yt-kpi-ctr", fmtPct(summary.ctr));
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
  const host = document.getElementById("yt-top-videos");
  if (!host) return;
  const videos = [...(win?.videos || [])].filter((row) => row.views > 0).sort((a, b) => b.views - a.views).slice(0, 6);
  const maxViews = Math.max(1, ...videos.map((row) => row.views));
  host.innerHTML = videos.length ? videos.map((row) => `
    <li>
      <span class="va-fill" style="width:${Math.max(4, row.views / maxViews * 100)}%"></span>
      <span><a class="name" href="${esc(row.url)}" target="_blank" rel="noopener">${esc(row.title)}</a><span class="detail">${fmtMinutes(row.watchMinutes)} watch time · ${fmtNum(row.impressions)} impressions</span></span>
      <span class="num">${fmtNum(row.views)}</span>
    </li>
  `).join("") : '<li><span class="name">No YouTube videos in this window</span><span class="num">-</span></li>';
}

function renderYouTube() {
  renderYouTubeMeta();
  const win = youtubeWindow();
  renderYouTubeKpis(win);
  renderYouTubeTrend();
  renderYouTubeTopVideos(win);
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
    currentWindow = Number(button.dataset.window) || 7;
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
});

load();
