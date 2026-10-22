"use strict";

const EVENTS_URL = "./events.json";
const TRAFFIC_URL = "../data/traffic-history.json";
const YOUTUBE_URL = "../data/youtube-analytics.json";
const SITE_KEY = "analytics-hub";
const HUB_REPO = "microsoft/Analytics-Hub";
const WINDOW_DAYS = 7;

const INTERNAL_HOSTS = ["microsoft.github.io", "github.com", "githubusercontent.com", "github.io"];

const REPORT_FAMILIES = [
  { key: "valuelens", label: "ValueLens", needles: ["/valuelens"] },
  { key: "consumption-central", label: "Consumption Central", needles: ["/consumption-central"] },
  { key: "ai-in-one", label: "AI in One", needles: ["/ai-in-one"] },
  { key: "agent-evaluator", label: "Agent Evaluator", needles: ["/agent-evaluator"] },
  { key: "ess-insights", label: "ESS Insights", needles: ["/ess-insights"] },
  { key: "personal-dashboard", label: "Personal Dashboard", needles: ["/personal-dashboard"] },
  { key: "m365-usage-analytics", label: "M365 Usage Analytics", needles: ["/m365-usage-analytics"] },
  { key: "cowork-chargeback", label: "Cowork Chargeback", needles: ["/cowork-chargeback"] },
  { key: "cowork-team-report", label: "Cowork Team Report", needles: ["/cowork-team-report"] },
  { key: "finops-cowork", label: "FinOps and FOCUS", needles: ["/finops-cowork"] },
  { key: "copilot-roi-calculator", label: "Copilot ROI Calculator", needles: ["/tools/copilot-roi-calculator"] },
  { key: "what-cowork-did-for-me", label: "What Cowork Did For Me", needles: ["/what-cowork-did-for-me"] },
];

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[ch]));
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n) {
  if (n == null || Number.isNaN(n)) return "n/a";
  return Math.round(n).toLocaleString("en-US");
}

function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return "n/a";
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? "+" : ""}${r}%`;
}

function fmtSigned(n, decimals = 1) {
  if (n == null || Number.isNaN(n)) return "n/a";
  const rounded = Number(n.toFixed(decimals));
  if (rounded === 0) return "0.0";
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(decimals)}`;
}

function isoShift(isoDate, deltaDays) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function formatShortDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatFullDate(isoDate) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

function isInternalRef(name) {
  let host = String(name || "");
  try {
    host = new URL(host).hostname;
  } catch (_) {}
  host = host.toLowerCase();
  if (!host) return false;
  return INTERNAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`) || host.includes(h));
}

function isProdUrl(rawUrl) {
  const u = String(rawUrl || "").toLowerCase();
  if (!u) return false;
  if (u.includes("localhost") || u.includes("127.0.0.1") || u.includes("azurewebsites.net") || u.includes("electron")) return false;
  return true;
}

function getMetric(groups, metricName) {
  if (!Array.isArray(groups)) return null;
  return groups.find((g) => g && g.metricName === metricName) || null;
}

function toDateMap(entries) {
  const map = new Map();
  for (const [date, value] of entries) map.set(date, value);
  return map;
}

function readHubVisits(site) {
  const out = [];
  for (const [date, groups] of Object.entries(site.dailySnapshots || {})) {
    const traffic = getMetric(groups, "Traffic");
    const row = traffic?.information?.[0] || {};
    const total = toNum(row.totalSessionCount);
    const bots = toNum(row.totalBotSessionCount);
    out.push([date, Math.max(0, total - bots)]);
  }
  return toDateMap(out.sort((a, b) => a[0].localeCompare(b[0])));
}

function readExternalReferrals(site) {
  const out = [];
  for (const [date, groups] of Object.entries(site.dailySnapshots || {})) {
    const refs = getMetric(groups, "ReferrerUrl")?.information || [];
    let total = 0;
    for (const row of refs) {
      const ref = row.name || row.Url || "";
      if (isInternalRef(ref)) continue;
      total += toNum(row.sessionsCount);
    }
    out.push([date, total]);
  }
  return toDateMap(out.sort((a, b) => a[0].localeCompare(b[0])));
}

function readHubRepoMetric(traffic, metric) {
  const repo = traffic.repos?.[HUB_REPO] || {};
  const source = repo[metric] || {};
  const out = [];
  for (const [date, row] of Object.entries(source)) {
    out.push([date, toNum(row?.count)]);
  }
  return toDateMap(out.sort((a, b) => a[0].localeCompare(b[0])));
}

function readYouTubeMetric(yt, metric) {
  const out = [];
  for (const day of (yt?.days || [])) {
    out.push([day.date, toNum(day[metric])]);
  }
  return toDateMap(out.sort((a, b) => a[0].localeCompare(b[0])));
}

function matchReportFamily(url) {
  const u = String(url || "").toLowerCase();
  for (const fam of REPORT_FAMILIES) {
    if (fam.needles.some((needle) => u.includes(needle))) return fam.key;
  }
  return null;
}

function readReportSeries(site) {
  const series = {};
  for (const fam of REPORT_FAMILIES) series[fam.key] = new Map();

  for (const [date, groups] of Object.entries(site.snapshotsByUrl || {})) {
    const traffic = getMetric(groups, "Traffic")?.information || [];
    const byUrl = new Map();
    for (const row of traffic) {
      const rawUrl = row.Url || row.url || "";
      if (!isProdUrl(rawUrl)) continue;
      const familyKey = matchReportFamily(rawUrl);
      if (!familyKey) continue;
      const sessions = Math.max(toNum(row.totalSessionCount), toNum(row.sessionsCount));
      const bots = Math.min(toNum(row.totalBotSessionCount), sessions);
      const human = Math.max(0, sessions - bots);
      if (!human) continue;
      const key = `${familyKey}|${String(rawUrl).toLowerCase()}`;
      byUrl.set(key, Math.max(byUrl.get(key) || 0, human));
    }
    const dayTotals = new Map();
    for (const [key, human] of byUrl) {
      const familyKey = key.split("|")[0];
      dayTotals.set(familyKey, (dayTotals.get(familyKey) || 0) + human);
    }
    for (const [familyKey, total] of dayTotals) {
      series[familyKey].set(date, total);
    }
  }

  return series;
}

function statsForEvent(seriesMap, eventDate, windowDays = WINDOW_DAYS) {
  let beforeSum = 0, beforeN = 0;
  let afterSum = 0, afterN = 0;
  for (let i = windowDays; i >= 1; i--) {
    const d = isoShift(eventDate, -i);
    if (seriesMap.has(d)) {
      beforeSum += toNum(seriesMap.get(d));
      beforeN++;
    }
  }
  for (let i = 0; i < windowDays; i++) {
    const d = isoShift(eventDate, i);
    if (seriesMap.has(d)) {
      afterSum += toNum(seriesMap.get(d));
      afterN++;
    }
  }
  const beforeAvg = beforeN ? beforeSum / beforeN : null;
  const afterAvg = afterN ? afterSum / afterN : null;
  const deltaAbs = (beforeAvg == null || afterAvg == null) ? null : (afterAvg - beforeAvg);
  const deltaPct = (beforeAvg == null || afterAvg == null || beforeAvg === 0) ? null : ((deltaAbs / beforeAvg) * 100);
  return { beforeAvg, afterAvg, deltaAbs, deltaPct, beforeN, afterN };
}

function deltaClass(value) {
  if (value == null || Number.isNaN(value)) return "ec-flat";
  if (value > 0) return "ec-up";
  if (value < 0) return "ec-down";
  return "ec-flat";
}

function sparseLinePath(values, xAt, yAt) {
  let started = false;
  return values.map((v, i) => {
    if (v == null || Number.isNaN(v)) {
      started = false;
      return "";
    }
    const cmd = started ? "L" : "M";
    started = true;
    return `${cmd} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`;
  }).filter(Boolean).join(" ");
}

function svgTimeline(seriesMap, events) {
  const data = [...seriesMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, value]) => ({ day, value }));
  if (!data.length) return `<p class="ec-loading">No daily visit data available.</p>`;

  const width = 980;
  const height = 270;
  const pad = { l: 44, r: 14, t: 16, b: 38 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.value));
  const xAt = (i) => pad.l + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const yAt = (v) => pad.t + plotH - (v / max) * plotH;
  const line = sparseLinePath(data.map((d) => d.value), xAt, yAt);
  const area = `${line} L ${xAt(data.length - 1).toFixed(1)} ${(pad.t + plotH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(pad.t + plotH).toFixed(1)} Z`;
  const grid = [0, .25, .5, .75, 1].map((f) => {
    const val = Math.round(max * f);
    const y = yAt(val);
    return `<line class="ec-grid" x1="${pad.l}" x2="${width - pad.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" />
      <text class="ec-axis" x="${pad.l - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${fmt(val)}</text>`;
  }).join("");

  const tickCount = 8;
  const ticks = [];
  for (let i = 0; i < tickCount; i++) {
    const idx = Math.round((i / (tickCount - 1)) * (data.length - 1));
    const d = data[idx];
    ticks.push(`<text class="ec-axis" x="${xAt(idx).toFixed(1)}" y="${height - 12}" text-anchor="middle">${formatShortDate(d.day)}</text>`);
  }

  const dayIndex = new Map(data.map((d, i) => [d.day, i]));
  const marks = events.map((ev) => {
    let idx = dayIndex.get(ev.date);
    if (idx == null) {
      idx = data.findIndex((d) => d.day >= ev.date);
      if (idx < 0) idx = data.length - 1;
    }
    const x = xAt(idx);
    return `<g class="ec-mark">
      <line class="ec-event-line" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${pad.t}" y2="${(pad.t + plotH).toFixed(1)}"></line>
      <circle cx="${x.toFixed(1)}" cy="${yAt(data[idx].value).toFixed(1)}" r="3.1"></circle>
      <title>${esc(ev.date)} · ${esc(ev.title)}</title>
    </g>`;
  }).join("");

  return `<svg class="ec-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily hub visits with event markers">
    ${grid}
    <path class="ec-area" d="${area}"></path>
    <path class="ec-line" stroke="#0078d4" d="${line}"></path>
    ${marks}
    ${ticks.join("")}
  </svg>`;
}

function svgEventMetric(seriesMap, eventDate, color) {
  const points = [];
  for (let i = -10; i <= 10; i++) {
    const d = isoShift(eventDate, i);
    points.push({ day: d, value: seriesMap.has(d) ? toNum(seriesMap.get(d)) : null });
  }

  const width = 470;
  const height = 178;
  const pad = { l: 34, r: 10, t: 14, b: 30 };
  const vals = points.map((p) => p.value).filter((v) => v != null);
  const max = Math.max(1, ...(vals.length ? vals : [1]));
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const xAt = (i) => pad.l + (i / (points.length - 1)) * plotW;
  const yAt = (v) => pad.t + plotH - ((v || 0) / max) * plotH;
  const line = sparseLinePath(points.map((p) => p.value), xAt, yAt);
  const eventIdx = 10;
  const grid = [0, .5, 1].map((f) => {
    const y = yAt(max * f);
    return `<line class="ec-grid" x1="${pad.l}" x2="${width - pad.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"></line>`;
  }).join("");

  return `<svg class="ec-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Event window metric chart">
    ${grid}
    <line class="ec-event-line" x1="${xAt(eventIdx).toFixed(1)}" x2="${xAt(eventIdx).toFixed(1)}" y1="${pad.t}" y2="${(pad.t + plotH).toFixed(1)}"></line>
    <path class="ec-line" stroke="${esc(color)}" d="${line}"></path>
    <text class="ec-axis" x="${xAt(0).toFixed(1)}" y="${height - 10}" text-anchor="middle">${formatShortDate(points[0].day)}</text>
    <text class="ec-axis" x="${xAt(eventIdx).toFixed(1)}" y="${height - 10}" text-anchor="middle">${formatShortDate(points[eventIdx].day)}</text>
    <text class="ec-axis" x="${xAt(points.length - 1).toFixed(1)}" y="${height - 10}" text-anchor="middle">${formatShortDate(points[points.length - 1].day)}</text>
  </svg>`;
}

function metricMini(label, stats) {
  const cls = deltaClass(stats.deltaAbs);
  const before = stats.beforeAvg == null ? "n/a" : fmt(stats.beforeAvg);
  const after = stats.afterAvg == null ? "n/a" : fmt(stats.afterAvg);
  const delta = stats.deltaAbs == null ? "n/a" : fmtSigned(stats.deltaAbs);
  const pct = stats.deltaPct == null ? "n/a" : fmtPct(stats.deltaPct);
  return `<div class="ec-mini">
    <h4>${esc(label)}</h4>
    <p><strong>${before}</strong> before -> <strong>${after}</strong> after</p>
    <p class="${cls}">Delta/day: ${delta} (${pct})</p>
  </div>`;
}

function renderSummary(events, signals, reportSeries) {
  const summary = document.getElementById("ec-summary");
  if (!summary) return;
  const visitUps = events.filter((ev) => statsForEvent(signals.visits, ev.date).deltaAbs > 0).length;
  const cloneUps = events.filter((ev) => statsForEvent(signals.clones, ev.date).deltaAbs > 0).length;
  const ytUps = events.filter((ev) => statsForEvent(signals.youtubeViews, ev.date).deltaAbs > 0).length;
  const withReportRise = events.filter((ev) => {
    for (const fam of REPORT_FAMILIES) {
      const st = statsForEvent(reportSeries[fam.key], ev.date);
      if (st.deltaAbs > 0) return true;
    }
    return false;
  }).length;
  summary.innerHTML = [
    ["Events logged", fmt(events.length), "All rows from events.json"],
    ["Visit-positive events", fmt(visitUps), "7-day after average > 7-day before average"],
    ["Clone-positive events", fmt(cloneUps), "Analytics Hub repo clones/day increased"],
    ["YouTube-positive events", fmt(ytUps), "YouTube views/day increased"],
    ["Events with report lift", fmt(withReportRise), "At least one report family gained traffic/day"],
  ].map(([label, value, note]) => `<div class="ec-kpi"><div class="ec-kpi-label">${label}</div><div class="ec-kpi-value">${value}</div><div class="ec-kpi-note">${note}</div></div>`).join("");
}

function renderEvents(events, signals, reportSeries) {
  const body = document.getElementById("ec-events-body");
  if (!body) return;

  const rows = events
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((ev) => {
      const visit = statsForEvent(signals.visits, ev.date);
      const clone = statsForEvent(signals.clones, ev.date);
      const ytViews = statsForEvent(signals.youtubeViews, ev.date);
      const refs = statsForEvent(signals.referrals, ev.date);
      const ytWatch = statsForEvent(signals.youtubeWatchMinutes, ev.date);

      const reportRows = REPORT_FAMILIES.map((fam) => ({
        fam,
        stats: statsForEvent(reportSeries[fam.key], ev.date),
      })).filter((entry) => entry.stats.beforeN || entry.stats.afterN);

      reportRows.sort((a, b) => (b.stats.deltaAbs || -Infinity) - (a.stats.deltaAbs || -Infinity));
      const positive = reportRows.filter((row) => (row.stats.deltaAbs || 0) > 0).slice(0, 3);
      const topLift = positive.length
        ? positive.map((row) => `${row.fam.label} (${fmtSigned(row.stats.deltaAbs)})`).join(", ")
        : "No report lift signal";

      const detailsReports = reportRows.length
        ? reportRows.map((row) => `
          <tr>
            <td>${esc(row.fam.label)}</td>
            <td class="num">${row.stats.beforeAvg == null ? "n/a" : fmt(row.stats.beforeAvg)}</td>
            <td class="num">${row.stats.afterAvg == null ? "n/a" : fmt(row.stats.afterAvg)}</td>
            <td class="num ${deltaClass(row.stats.deltaAbs)}">${row.stats.deltaAbs == null ? "n/a" : fmtSigned(row.stats.deltaAbs)}</td>
            <td class="num ${deltaClass(row.stats.deltaPct)}">${row.stats.deltaPct == null ? "n/a" : fmtPct(row.stats.deltaPct)}</td>
          </tr>`).join("")
        : `<tr><td colspan="5">No report-page series for this event window.</td></tr>`;

      return `<tr>
        <td>${esc(ev.date)}</td>
        <td>
          <strong>${esc(ev.title || "")}</strong>
          ${ev.note ? `<div class="ec-sub" style="margin:.25rem 0 0">${esc(ev.note)}</div>` : ""}
        </td>
        <td class="num">${fmt(ev.attendees)}</td>
        <td><span class="ec-badge">${esc(ev.type || "event")}</span></td>
        <td class="num ${deltaClass(visit.deltaAbs)}">${visit.deltaAbs == null ? "n/a" : fmtSigned(visit.deltaAbs)}</td>
        <td class="num ${deltaClass(clone.deltaAbs)}">${clone.deltaAbs == null ? "n/a" : fmtSigned(clone.deltaAbs)}</td>
        <td class="num ${deltaClass(ytViews.deltaAbs)}">${ytViews.deltaAbs == null ? "n/a" : fmtSigned(ytViews.deltaAbs)}</td>
        <td>${esc(topLift)}</td>
        <td>
          <details class="ec-details">
            <summary>Expand</summary>
            <div class="ec-details-body">
              <div class="ec-metric-grid">
                ${metricMini("Hub visits/day", visit)}
                ${metricMini("Repo clones/day", clone)}
                ${metricMini("Repo views/day", statsForEvent(signals.views, ev.date))}
                ${metricMini("External referrals/day", refs)}
                ${metricMini("YouTube views/day", ytViews)}
                ${metricMini("YouTube watch minutes/day", ytWatch)}
              </div>
              <div class="ec-chart-grid">
                <div class="ec-chart-card"><p class="ec-chart-title">Hub visits around ${esc(ev.date)}</p>${svgEventMetric(signals.visits, ev.date, "#0078d4")}</div>
                <div class="ec-chart-card"><p class="ec-chart-title">Repo clones around ${esc(ev.date)}</p>${svgEventMetric(signals.clones, ev.date, "#6b4ce6")}</div>
                <div class="ec-chart-card"><p class="ec-chart-title">YouTube views around ${esc(ev.date)}</p>${svgEventMetric(signals.youtubeViews, ev.date, "#d83b01")}</div>
                <div class="ec-chart-card"><p class="ec-chart-title">External referrals around ${esc(ev.date)}</p>${svgEventMetric(signals.referrals, ev.date, "#0f9d58")}</div>
              </div>
              <table class="ec-report-table">
                <thead>
                  <tr>
                    <th>Report family</th>
                    <th class="num">Before/day</th>
                    <th class="num">After/day</th>
                    <th class="num">Delta/day</th>
                    <th class="num">Delta %</th>
                  </tr>
                </thead>
                <tbody>${detailsReports}</tbody>
              </table>
              <p class="ec-sub" style="margin-top:.6rem">Window = ${WINDOW_DAYS} days before (${esc(formatFullDate(isoShift(ev.date, -WINDOW_DAYS)))} to ${esc(formatFullDate(isoShift(ev.date, -1)))}) and ${WINDOW_DAYS} days after (${esc(formatFullDate(ev.date))} to ${esc(formatFullDate(isoShift(ev.date, WINDOW_DAYS - 1)))}) when data exists.</p>
            </div>
          </details>
        </td>
      </tr>`;
    }).join("");

  body.innerHTML = rows || `<tr><td colspan="9">No events found.</td></tr>`;
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res.json();
}

async function boot() {
  const meta = document.getElementById("ec-meta");
  try {
    const [eventsData, traffic, youtube] = await Promise.all([
      fetchJson(EVENTS_URL),
      fetchJson(TRAFFIC_URL),
      fetchJson(YOUTUBE_URL).catch(() => ({ days: [] })),
    ]);

    const site = traffic?.sites?.[SITE_KEY];
    if (!site) throw new Error(`Missing Clarity site key '${SITE_KEY}'`);
    const events = Array.isArray(eventsData?.events) ? eventsData.events.filter((ev) => ev?.date && ev?.title) : [];

    const signals = {
      visits: readHubVisits(site),
      referrals: readExternalReferrals(site),
      views: readHubRepoMetric(traffic, "dailyViews"),
      clones: readHubRepoMetric(traffic, "dailyClones"),
      youtubeViews: readYouTubeMetric(youtube, "views"),
      youtubeWatchMinutes: readYouTubeMetric(youtube, "watchMinutes"),
    };
    const reportSeries = readReportSeries(site);

    const trafficDays = [...signals.visits.keys()].sort();
    const eventDays = events.map((e) => e.date).sort();
    const latestTrafficDay = trafficDays.length ? trafficDays[trafficDays.length - 1] : "n/a";
    const latestEventDay = eventDays.length ? eventDays[eventDays.length - 1] : "n/a";
    if (meta) {
      meta.textContent = `Events: ${events.length} · Analysis window: ${WINDOW_DAYS}d before vs ${WINDOW_DAYS}d after · Latest traffic day: ${latestTrafficDay} · Latest event: ${latestEventDay}`;
    }

    const timelineHost = document.getElementById("ec-timeline");
    if (timelineHost) timelineHost.innerHTML = svgTimeline(signals.visits, events);
    renderSummary(events, signals, reportSeries);
    renderEvents(events, signals, reportSeries);
  } catch (err) {
    if (meta) meta.textContent = "Could not load enablement correlation datasets.";
    const host = document.getElementById("ec-events-body");
    if (host) host.innerHTML = `<tr><td colspan="9">Failed to load data: ${esc(err.message || String(err))}</td></tr>`;
    const timelineHost = document.getElementById("ec-timeline");
    if (timelineHost) timelineHost.innerHTML = `<p class="ec-loading">Failed to load timeline: ${esc(err.message || String(err))}</p>`;
  }
}

boot();
