"use strict";

const EVENTS_URL = "./events.json";
const TRAFFIC_URL = "../data/traffic-history.json";
const YOUTUBE_URL = "../data/youtube-analytics.json";
const SITE_KEY = "analytics-hub";
const HUB_REPO = "microsoft/Analytics-Hub";
const WINDOW_DAYS = 7;

const INTERNAL_HOSTS = ["microsoft.github.io", "github.com", "githubusercontent.com", "github.io"];
let EVENT_DETAIL_STORE = new Map();

const REPORTS = [
  { key: "valuelens", label: "ValueLens", needles: ["/valuelens"], type: "Power BI", guideKey: "valuelens" },
  { key: "consumption-central", label: "Consumption Central", needles: ["/consumption-central"], type: "Power BI", guideKey: "consumption-central" },
  { key: "ai-in-one", label: "AI in One", needles: ["/ai-in-one"], type: "Power BI", guideKey: "ai-in-one" },
  { key: "agent-evaluator", label: "Agent Evaluator", needles: ["/agent-evaluator"], type: "Web app", guideKey: "agent-evaluator" },
  { key: "ess-insights", label: "ESS Insights", needles: ["/ess-insights"], type: "Power BI", guideKey: "ess-insights" },
  { key: "personal-dashboard", label: "Personal Dashboard", needles: ["/personal-dashboard"], type: "Power BI", guideKey: "personal-dashboard" },
  { key: "m365-usage-analytics", label: "M365 Usage Analytics", needles: ["/m365-usage-analytics"], type: "Power BI", guideKey: "m365-usage-analytics" },
  { key: "cowork-chargeback", label: "Cowork Chargeback", needles: ["/cowork-chargeback"], type: "Power BI", guideKey: "cowork-chargeback" },
  { key: "cowork-team-report", label: "Cowork Team Report", needles: ["/cowork-team-report"], type: "Power BI", guideKey: "cowork-team-report" },
  { key: "finops-cowork", label: "FinOps and FOCUS", needles: ["/finops-cowork"], type: "Power BI", guideKey: "finops-cowork" },
  { key: "copilot-roi-calculator", label: "Copilot ROI Calculator", needles: ["/tools/copilot-roi-calculator"], type: "Web app", guideKey: "copilot-roi-calculator" },
  { key: "what-cowork-did-for-me", label: "What Cowork Did For Me", needles: ["/what-cowork-did-for-me"], type: "Web app", guideKey: "what-cowork-did-for-me" },
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

function isVosEvent(ev) {
  const title = String(ev?.title || "").toLowerCase();
  const note = String(ev?.note || "").toLowerCase();
  return title.includes("vos") || note.includes("vos");
}

function reportGuideHref(report) {
  return `../choose-report/#r=${encodeURIComponent(report.guideKey || report.key)}`;
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

function windowDates(eventDate, startOffset, endOffset) {
  const out = [];
  for (let i = startOffset; i <= endOffset; i++) out.push(isoShift(eventDate, i));
  return out;
}

function normalizeHubPath(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return u.pathname || "/";
  } catch (_) {
    return String(rawUrl || "").replace(/^https?:\/\/[^/]+/i, "") || "/";
  }
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
  const byDate = new Map();
  for (const [date, groups] of Object.entries(site.dailySnapshots || {})) {
    const traffic = getMetric(groups, "Traffic");
    const row = traffic?.information?.[0] || {};
    const total = toNum(row.totalSessionCount);
    const bots = toNum(row.totalBotSessionCount);
    byDate.set(date, Math.max(0, total - bots));
  }
  // Fall back to the longer 3-day snapshot history for earlier periods.
  for (const [date, groups] of Object.entries(site.snapshots || {})) {
    if (byDate.has(date)) continue;
    const traffic = getMetric(groups, "Traffic");
    const row = traffic?.information?.[0] || {};
    const total = toNum(row.totalSessionCount);
    const bots = toNum(row.totalBotSessionCount);
    byDate.set(date, Math.max(0, total - bots));
  }
  return toDateMap([...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])));
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
  for (const fam of REPORTS) {
    if (fam.needles.some((needle) => u.includes(needle))) return fam.key;
  }
  return null;
}

function readReportSeries(site) {
  const series = {};
  for (const fam of REPORTS) series[fam.key] = new Map();

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

function topRowsFromMap(map, limit = 8) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, value]) => ({ name, value }));
}

function summarizePageChanges(site, eventDate, reportOnly = false, limit = 12) {
  const beforeDates = windowDates(eventDate, -WINDOW_DAYS, -1);
  const afterDates = windowDates(eventDate, 0, WINDOW_DAYS - 1);
  const stats = new Map();

  function accumulate(dates, phase) {
    for (const d of dates) {
      const groups = site?.snapshotsByUrl?.[d];
      const trafficRows = getMetric(groups, "Traffic")?.information || [];
      const dayMax = new Map();
      for (const row of trafficRows) {
        const rawUrl = row.Url || row.url || "";
        if (!isProdUrl(rawUrl)) continue;
        if (reportOnly && !matchReportFamily(rawUrl)) continue;
        const path = normalizeHubPath(rawUrl);
        const sess = Math.max(toNum(row.totalSessionCount), toNum(row.sessionsCount));
        const bots = Math.min(toNum(row.totalBotSessionCount), sess);
        const human = Math.max(0, sess - bots);
        if (!human) continue;
        dayMax.set(path, Math.max(dayMax.get(path) || 0, human));
      }
      for (const [path, value] of dayMax) {
        const row = stats.get(path) || { name: path, beforeSum: 0, beforeN: 0, afterSum: 0, afterN: 0 };
        if (phase === "before") {
          row.beforeSum += value;
          row.beforeN++;
        } else {
          row.afterSum += value;
          row.afterN++;
        }
        stats.set(path, row);
      }
    }
  }

  accumulate(beforeDates, "before");
  accumulate(afterDates, "after");

  const rows = [];
  for (const row of stats.values()) {
    const beforeAvg = row.beforeN ? row.beforeSum / row.beforeN : null;
    const afterAvg = row.afterN ? row.afterSum / row.afterN : null;
    const delta = (beforeAvg == null || afterAvg == null) ? null : (afterAvg - beforeAvg);
    const deltaPct = (beforeAvg == null || afterAvg == null || beforeAvg === 0) ? null : ((delta / beforeAvg) * 100);
    rows.push({
      name: row.name,
      beforeAvg,
      afterAvg,
      delta,
      deltaPct,
    });
  }

  rows.sort((a, b) => Math.abs(b.delta || -Infinity) - Math.abs(a.delta || -Infinity));
  return rows.slice(0, limit);
}

function aggregateExternalReferrers(site, dates) {
  const totals = new Map();
  for (const d of dates) {
    const refs = getMetric(site?.dailySnapshots?.[d], "ReferrerUrl")?.information || [];
    for (const row of refs) {
      const ref = row.name || row.Url || "";
      if (isInternalRef(ref)) continue;
      totals.set(ref, (totals.get(ref) || 0) + toNum(row.sessionsCount));
    }
  }
  return totals;
}

function summarizeCloneRepos(traffic, eventDate) {
  const out = [];
  for (const [repoName, repo] of Object.entries(traffic?.repos || {})) {
    const series = toDateMap(Object.entries(repo?.dailyClones || {}).map(([d, row]) => [d, toNum(row?.count)]));
    const s = statsForEvent(series, eventDate);
    if (!s.beforeN && !s.afterN) continue;
    out.push({
      repo: repoName,
      before: s.beforeAvg,
      after: s.afterAvg,
      delta: s.deltaAbs,
      pct: s.deltaPct,
    });
  }
  out.sort((a, b) => (b.delta || -Infinity) - (a.delta || -Infinity));
  const positives = out.filter((r) => (r.delta || 0) > 0).slice(0, 10);
  return positives.length ? positives : out.slice(0, 10);
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

  const width = Math.max(1400, data.length * 28);
  const height = 270;
  const axisW = 58;
  const pad = { l: 10, r: 14, t: 16, b: 38 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.value));
  const xAt = (i) => pad.l + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const yAt = (v) => pad.t + plotH - (v / max) * plotH;
  const line = sparseLinePath(data.map((d) => d.value), xAt, yAt);
  const area = `${line} L ${xAt(data.length - 1).toFixed(1)} ${(pad.t + plotH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(pad.t + plotH).toFixed(1)} Z`;
  const yTicks = [0, .25, .5, .75, 1].map((f) => {
    const val = Math.round(max * f);
    const y = yAt(val);
    return { val, y };
  });
  const grid = yTicks.map((tick) => {
    return `<line class="ec-grid" x1="${pad.l}" x2="${width - pad.r}" y1="${tick.y.toFixed(1)}" y2="${tick.y.toFixed(1)}" />`;
  }).join("");
  const axisLabels = yTicks.map((tick) =>
    `<line class="ec-grid" x1="${axisW - 6}" x2="${axisW}" y1="${tick.y.toFixed(1)}" y2="${tick.y.toFixed(1)}" />
     <text class="ec-axis" x="${axisW - 10}" y="${(tick.y + 4).toFixed(1)}" text-anchor="end">${fmt(tick.val)}</text>`
  ).join("");

  const tickCount = 14;
  const ticks = [];
  for (let i = 0; i < tickCount; i++) {
    const idx = Math.round((i / (tickCount - 1)) * (data.length - 1));
    const d = data[idx];
    ticks.push(`<text class="ec-axis" x="${xAt(idx).toFixed(1)}" y="${height - 12}" text-anchor="middle">${formatShortDate(d.day)}</text>`);
  }

  const dayIndex = new Map(data.map((d, i) => [d.day, i]));
  const eventsByIndex = new Map();
  const marks = events.map((ev) => {
    let idx = dayIndex.get(ev.date);
    if (idx == null) {
      idx = data.findIndex((d) => d.day >= ev.date);
      if (idx < 0) idx = data.length - 1;
    }
    if (!eventsByIndex.has(idx)) eventsByIndex.set(idx, []);
    eventsByIndex.get(idx).push(ev);
    const x = xAt(idx);
    const vos = isVosEvent(ev);
    const lineStyle = vos ? `class="ec-event-line" style="stroke:url(#ec-vos-gradient)"` : `class="ec-event-line"`;
    const circleStyle = vos ? `fill="url(#ec-vos-gradient)"` : "";
    return `<g class="ec-mark">
      <line ${lineStyle} x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${pad.t}" y2="${(pad.t + plotH).toFixed(1)}"></line>
      <circle cx="${x.toFixed(1)}" cy="${yAt(data[idx].value).toFixed(1)}" r="3.1" ${circleStyle}></circle>
      <title>${esc(ev.date)} · ${esc(ev.title)}</title>
    </g>`;
  }).join("");
  const attendeeLabels = [...eventsByIndex.entries()].sort((a, b) => a[0] - b[0]).map(([idx, evs], labelIdx) => {
    const totalAttendees = evs.reduce((sum, ev) => sum + Math.max(0, toNum(ev.attendees)), 0);
    const label = totalAttendees > 0 ? fmt(totalAttendees) : "TBD";
    const x = xAt(idx) + 1;
    const y = labelIdx % 2 === 0 ? 8 : 22;
    const hasVos = evs.some((ev) => isVosEvent(ev));
    const fill = hasVos ? `fill="url(#ec-vos-gradient)"` : "";
    return `<text class="ec-attendees" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="start" dominant-baseline="hanging" ${fill}>${esc(label)}</text>`;
  }).join("");

  const hoverPoints = data.map((d, idx) => {
    const x = xAt(idx);
    const y = yAt(d.value);
    const eventsOnDay = eventsByIndex.get(idx) || [];
    const eventText = eventsOnDay.length
      ? `\nEngagements: ${eventsOnDay.map((ev) => ev.title).join("; ")}`
      : "";
    return `<circle class="ec-point-hover" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8">
      <title>${esc(formatFullDate(d.day))}: ${esc(fmt(d.value))} daily visits${esc(eventText)}</title>
    </circle>`;
  }).join("");

  return `<div class="ec-timeline-shell">
    <svg class="ec-y-axis" viewBox="0 0 ${axisW} ${height}" role="presentation" aria-hidden="true">${axisLabels}</svg>
    <div class="ec-timeline-scroll" title="Scroll left and right to navigate full timeline history.">
      <svg class="ec-chart" style="width:${width}px;max-width:none;height:auto;display:block" viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily hub visits with event markers">
        <defs>
          <linearGradient id="ec-vos-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00B7C3"></stop>
            <stop offset="52%" stop-color="#7F56D9"></stop>
            <stop offset="100%" stop-color="#C026D3"></stop>
          </linearGradient>
        </defs>
        ${grid}
        <path class="ec-area" d="${area}"></path>
        <path class="ec-line" stroke="#0078d4" d="${line}"></path>
        ${marks}
        ${attendeeLabels}
        ${hoverPoints}
        ${ticks.join("")}
      </svg>
    </div>
  </div>`;
}

function svgEventMetric(seriesMap, eventDate, color, options = {}) {
  const rangeDays = options.rangeDays == null ? 10 : options.rangeDays;
  const points = [];
  for (let i = -rangeDays; i <= rangeDays; i++) {
    const d = isoShift(eventDate, i);
    points.push({ day: d, value: seriesMap.has(d) ? toNum(seriesMap.get(d)) : null });
  }

  const width = options.width || 470;
  const height = options.height || 178;
  const pad = { l: 34, r: 10, t: 14, b: 30 };
  const vals = points.map((p) => p.value).filter((v) => v != null);
  const max = Math.max(1, ...(vals.length ? vals : [1]));
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const xAt = (i) => pad.l + (i / (points.length - 1)) * plotW;
  const yAt = (v) => pad.t + plotH - ((v || 0) / max) * plotH;
  const line = sparseLinePath(points.map((p) => p.value), xAt, yAt);
  const eventIdx = rangeDays;
  const grid = [0, .5, 1].map((f) => {
    const y = yAt(max * f);
    return `<line class="ec-grid" x1="${pad.l}" x2="${width - pad.r}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"></line>`;
  }).join("");
  const hoverPoints = points.map((p, idx) => {
    if (p.value == null) return "";
    const x = xAt(idx);
    const y = yAt(p.value);
    return `<circle class="ec-point-hover" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7">
      <title>${esc(formatFullDate(p.day))}: ${esc(fmt(p.value))}</title>
    </circle>`;
  }).join("");

  return `<svg class="ec-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Event window metric chart">
    ${grid}
    <line class="ec-event-line" x1="${xAt(eventIdx).toFixed(1)}" x2="${xAt(eventIdx).toFixed(1)}" y1="${pad.t}" y2="${(pad.t + plotH).toFixed(1)}"></line>
    <path class="ec-line" stroke="${esc(color)}" d="${line}"></path>
    ${hoverPoints}
    <text class="ec-axis" x="${xAt(0).toFixed(1)}" y="${height - 10}" text-anchor="middle">${formatShortDate(points[0].day)}</text>
    <text class="ec-axis" x="${xAt(eventIdx).toFixed(1)}" y="${height - 10}" text-anchor="middle">${formatShortDate(points[eventIdx].day)}</text>
    <text class="ec-axis" x="${xAt(points.length - 1).toFixed(1)}" y="${height - 10}" text-anchor="middle">${formatShortDate(points[points.length - 1].day)}</text>
  </svg>`;
}

function metricMini(label, stats, definition) {
  const cls = deltaClass(stats.deltaAbs);
  const before = stats.beforeAvg == null ? "n/a" : fmt(stats.beforeAvg);
  const after = stats.afterAvg == null ? "n/a" : fmt(stats.afterAvg);
  const delta = stats.deltaAbs == null ? "n/a" : fmtSigned(stats.deltaAbs);
  const pct = stats.deltaPct == null ? "n/a" : fmtPct(stats.deltaPct);
  const tip = esc(definition || "Delta/day is the 7-day post-event average minus the 7-day pre-event average.");
  return `<div class="ec-mini" title="${tip}">
    <h4 title="${tip}">${esc(label)}</h4>
    <p><strong>${before}</strong> before -> <strong>${after}</strong> after</p>
    <p class="${cls}" title="${tip}">Delta/day: ${delta} (${pct})</p>
  </div>`;
}

function moversPreview(rows, limit = 3) {
  const picks = (rows || []).slice(0, limit).filter((r) => r && r.name && r.delta != null);
  if (!picks.length) return "No mover signal for this window yet.";
  return picks.map((r) => `${r.name} (${fmtSigned(r.delta)})`).join(" · ");
}

function renderSummary(events, signals, reportSeries) {
  const summary = document.getElementById("ec-summary");
  if (!summary) return;
  const visitUps = events.filter((ev) => statsForEvent(signals.visits, ev.date).deltaAbs > 0).length;
  const cloneUps = events.filter((ev) => statsForEvent(signals.clones, ev.date).deltaAbs > 0).length;
  const ytUps = events.filter((ev) => statsForEvent(signals.youtubeViews, ev.date).deltaAbs > 0).length;
  const withReportRise = events.filter((ev) => {
    for (const fam of REPORTS) {
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
    ["Events with report lift", fmt(withReportRise), "At least one report gained traffic/day"],
  ].map(([label, value, note]) => `<div class="ec-kpi"><div class="ec-kpi-label">${label}</div><div class="ec-kpi-value">${value}</div><div class="ec-kpi-note">${note}</div></div>`).join("");
}

function escapeCsvCell(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","));
  return [header, ...lines].join("\n");
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function setupExports(payload) {
  const bar = document.getElementById("ec-export-bar");
  if (bar) bar.hidden = false;

  const summaryBtn = document.getElementById("ec-export-summary-csv");
  const reportBtn = document.getElementById("ec-export-report-csv");
  const dailyBtn = document.getElementById("ec-export-daily-csv");
  const jsonBtn = document.getElementById("ec-export-json");

  if (summaryBtn) {
    summaryBtn.onclick = () => {
      const csv = toCsv(payload.summaryRows, [
        { key: "date", label: "date" },
        { key: "event", label: "event" },
        { key: "attendees", label: "attendees" },
        { key: "type", label: "type" },
        { key: "visitsDeltaPerDay", label: "visits_delta_per_day" },
        { key: "clonesDeltaPerDay", label: "clones_delta_per_day" },
        { key: "youtubeViewsDeltaPerDay", label: "youtube_views_delta_per_day" },
        { key: "reportIncreases", label: "report_increases" },
      ]);
      downloadTextFile("enablement-correlation-summary.csv", csv, "text/csv;charset=utf-8");
    };
  }

  if (reportBtn) {
    reportBtn.onclick = () => {
      const csv = toCsv(payload.reportRows, [
        { key: "eventDate", label: "event_date" },
        { key: "event", label: "event" },
        { key: "report", label: "report" },
        { key: "reportType", label: "report_type" },
        { key: "guideUrl", label: "enablement_guide_url" },
        { key: "beforePerDay", label: "before_per_day" },
        { key: "afterPerDay", label: "after_per_day" },
        { key: "deltaPerDay", label: "delta_per_day" },
        { key: "deltaPct", label: "delta_pct" },
      ]);
      downloadTextFile("enablement-correlation-report-lifts.csv", csv, "text/csv;charset=utf-8");
    };
  }

  if (dailyBtn) {
    dailyBtn.onclick = () => {
      const csv = toCsv(payload.dailyRows, [
        { key: "date", label: "date" },
        { key: "hubVisits", label: "hub_visits" },
        { key: "repoViews", label: "repo_views" },
        { key: "repoClones", label: "repo_clones" },
        { key: "youtubeViews", label: "youtube_views" },
        { key: "youtubeWatchMinutes", label: "youtube_watch_minutes" },
        { key: "externalReferrals", label: "external_referrals" },
      ]);
      downloadTextFile("enablement-correlation-daily-series.csv", csv, "text/csv;charset=utf-8");
    };
  }

  if (jsonBtn) {
    jsonBtn.onclick = () => {
      const blob = JSON.stringify(payload, null, 2);
      downloadTextFile("enablement-correlation-export.json", blob, "application/json;charset=utf-8");
    };
  }
}

function modalTable(headers, rows) {
  if (!rows.length) return `<p class="ec-sub">No detailed rows available for this event window.</p>`;
  return `<table class="ec-modal-table">
    <thead><tr>${headers.map((h) => `<th class="${h.num ? "num" : ""}">${esc(h.label)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td class="${h.num ? "num" : ""}">${h.render(r)}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>`;
}

function openMetricModal(eventId, metricKey) {
  const data = EVENT_DETAIL_STORE.get(eventId);
  if (!data) return;
  const modal = document.getElementById("ec-modal");
  const title = document.getElementById("ec-modal-title");
  const sub = document.getElementById("ec-modal-sub");
  const chart = document.getElementById("ec-modal-chart");
  const details = document.getElementById("ec-modal-details");
  if (!modal || !title || !sub || !chart || !details) return;

  let label = "";
  let series = null;
  let color = "#0078d4";
  let detailHtml = "";

  if (metricKey === "visits") {
    label = "Hub visits";
    series = data.series.visits;
    color = "#0078d4";
    detailHtml =
      `<h4>Hub pages with biggest change</h4><p class="ec-sub">Sorted by largest absolute change in average daily sessions (after/day minus before/day).</p>` +
      modalTable(
        [
          { label: "Page path", render: (r) => esc(r.name) },
          { label: "Before/day", num: true, render: (r) => (r.beforeAvg == null ? "n/a" : fmt(r.beforeAvg)) },
          { label: "After/day", num: true, render: (r) => (r.afterAvg == null ? "n/a" : fmt(r.afterAvg)) },
          { label: "Delta/day", num: true, render: (r) => `<span class="${deltaClass(r.delta)}">${r.delta == null ? "n/a" : fmtSigned(r.delta)}</span>` },
          { label: "Delta %", num: true, render: (r) => `<span class="${deltaClass(r.deltaPct)}">${r.deltaPct == null ? "n/a" : fmtPct(r.deltaPct)}</span>` },
        ],
        data.pageChanges,
      ) +
      `<h4 style="margin-top:.7rem">Report pages with biggest change</h4><p class="ec-sub">Same calculation, scoped to report pages.</p>` +
      modalTable(
        [
          { label: "Report page", render: (r) => esc(r.name) },
          { label: "Before/day", num: true, render: (r) => (r.beforeAvg == null ? "n/a" : fmt(r.beforeAvg)) },
          { label: "After/day", num: true, render: (r) => (r.afterAvg == null ? "n/a" : fmt(r.afterAvg)) },
          { label: "Delta/day", num: true, render: (r) => `<span class="${deltaClass(r.delta)}">${r.delta == null ? "n/a" : fmtSigned(r.delta)}</span>` },
          { label: "Delta %", num: true, render: (r) => `<span class="${deltaClass(r.deltaPct)}">${r.deltaPct == null ? "n/a" : fmtPct(r.deltaPct)}</span>` },
        ],
        data.reportPageChanges,
      );
  } else if (metricKey === "movers") {
    label = "Biggest movers";
    series = data.series.visits;
    color = "#0078d4";
    detailHtml =
      `<h4>Report pages with biggest change</h4><p class="ec-sub">Largest absolute movement in average daily traffic across the event window.</p>` +
      modalTable(
        [
          { label: "Report page", render: (r) => esc(r.name) },
          { label: "Before/day", num: true, render: (r) => (r.beforeAvg == null ? "n/a" : fmt(r.beforeAvg)) },
          { label: "After/day", num: true, render: (r) => (r.afterAvg == null ? "n/a" : fmt(r.afterAvg)) },
          { label: "Delta/day", num: true, render: (r) => `<span class="${deltaClass(r.delta)}">${r.delta == null ? "n/a" : fmtSigned(r.delta)}</span>` },
          { label: "Delta %", num: true, render: (r) => `<span class="${deltaClass(r.deltaPct)}">${r.deltaPct == null ? "n/a" : fmtPct(r.deltaPct)}</span>` },
        ],
        data.reportPageChanges,
      ) +
      `<h4 style="margin-top:.7rem">All hub pages with biggest change</h4>` +
      modalTable(
        [
          { label: "Page path", render: (r) => esc(r.name) },
          { label: "Before/day", num: true, render: (r) => (r.beforeAvg == null ? "n/a" : fmt(r.beforeAvg)) },
          { label: "After/day", num: true, render: (r) => (r.afterAvg == null ? "n/a" : fmt(r.afterAvg)) },
          { label: "Delta/day", num: true, render: (r) => `<span class="${deltaClass(r.delta)}">${r.delta == null ? "n/a" : fmtSigned(r.delta)}</span>` },
          { label: "Delta %", num: true, render: (r) => `<span class="${deltaClass(r.deltaPct)}">${r.deltaPct == null ? "n/a" : fmtPct(r.deltaPct)}</span>` },
        ],
        data.pageChanges,
      );
  } else if (metricKey === "clones") {
    label = "Repo clones";
    series = data.series.clones;
    color = "#6b4ce6";
    detailHtml =
      `<h4>Repos with strongest clone lift</h4>` +
      modalTable(
        [
          { label: "Repo", render: (r) => esc(r.repo) },
          { label: "Before/day", num: true, render: (r) => (r.before == null ? "n/a" : fmt(r.before)) },
          { label: "After/day", num: true, render: (r) => (r.after == null ? "n/a" : fmt(r.after)) },
          { label: "Delta/day", num: true, render: (r) => `<span class="${deltaClass(r.delta)}">${r.delta == null ? "n/a" : fmtSigned(r.delta)}</span>` },
        ],
        data.cloneRepoRows,
      );
  } else if (metricKey === "youtubeViews") {
    label = "YouTube views";
    series = data.series.youtubeViews;
    color = "#d83b01";
    detailHtml =
      `<h4>YouTube readout</h4><p class="ec-sub">This view uses channel-level daily views from the analytics feed. Per-video split for this exact event window is not available in the current dataset.</p>`;
  } else if (metricKey === "referrals") {
    label = "External referrals";
    series = data.series.referrals;
    color = "#0f9d58";
    detailHtml =
      `<h4>Top external referrers after event</h4>` +
      modalTable(
        [{ label: "Referrer", render: (r) => esc(r.name) }, { label: "Sessions", num: true, render: (r) => fmt(r.value) }],
        data.topReferrersAfter,
      );
  }

  if (!series) return;
  title.textContent = `${label} detail`;
  sub.textContent = `${data.eventDate} · ${data.eventTitle} · Δ/day uses 7-day averages, not previous-day values`;
  chart.innerHTML = svgEventMetric(series, data.eventDate, color, { width: 1020, height: 320, rangeDays: 21 });
  details.innerHTML = detailHtml;
  modal.hidden = false;
}

function closeMetricModal() {
  const modal = document.getElementById("ec-modal");
  if (!modal) return;
  modal.hidden = true;
}

function initModal() {
  const closeBtn = document.getElementById("ec-modal-close");
  const backdrop = document.getElementById("ec-modal-backdrop");
  if (closeBtn) closeBtn.onclick = closeMetricModal;
  if (backdrop) backdrop.onclick = closeMetricModal;
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeMetricModal();
  });
}

function initTimelineScroll() {
  const scroller = document.querySelector("#ec-timeline .ec-timeline-scroll");
  if (!scroller) return;
  scroller.scrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
}

function renderEvents(events, signals, reportSeries, context) {
  const body = document.getElementById("ec-events-body");
  if (!body) return { summaryRows: [], reportRows: [], dailyRows: [] };
  EVENT_DETAIL_STORE = new Map();

  const summaryRows = [];
  const reportExportRows = [];

  const rows = events
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((ev, idx) => {
      const eventId = `ev-${idx}`;
      const visit = statsForEvent(signals.visits, ev.date);
      const clone = statsForEvent(signals.clones, ev.date);
      const repoViews = statsForEvent(signals.views, ev.date);
      const ytViews = statsForEvent(signals.youtubeViews, ev.date);
      const refs = statsForEvent(signals.referrals, ev.date);
      const ytWatch = statsForEvent(signals.youtubeWatchMinutes, ev.date);
      const afterDates = windowDates(ev.date, 0, WINDOW_DAYS - 1);
      const pageChanges = summarizePageChanges(context.site, ev.date, false, 12);
      const reportPageChanges = summarizePageChanges(context.site, ev.date, true, 12);
      const topReferrersAfter = topRowsFromMap(aggregateExternalReferrers(context.site, afterDates), 12);
      const cloneRepoRows = summarizeCloneRepos(context.traffic, ev.date);

      const eventReportRows = REPORTS.map((report) => ({
        report,
        stats: statsForEvent(reportSeries[report.key], ev.date),
      })).filter((entry) => entry.stats.beforeN || entry.stats.afterN);

      eventReportRows.sort((a, b) => (b.stats.deltaAbs || -Infinity) - (a.stats.deltaAbs || -Infinity));
      const positive = eventReportRows.filter((row) => (row.stats.deltaAbs || 0) > 0).slice(0, 3);
      const topLift = positive.length
        ? positive.map((row) => `${row.report.label} [${row.report.type}] (${fmtSigned(row.stats.deltaAbs)})`).join(", ")
        : "No report lift signal";

      summaryRows.push({
        date: ev.date,
        event: ev.title || "",
        attendees: ev.attendees,
        type: ev.type || "",
        visitsDeltaPerDay: visit.deltaAbs == null ? "" : Number(visit.deltaAbs.toFixed(2)),
        clonesDeltaPerDay: clone.deltaAbs == null ? "" : Number(clone.deltaAbs.toFixed(2)),
        youtubeViewsDeltaPerDay: ytViews.deltaAbs == null ? "" : Number(ytViews.deltaAbs.toFixed(2)),
        reportIncreases: topLift,
      });

      for (const row of eventReportRows) {
        reportExportRows.push({
          eventDate: ev.date,
          event: ev.title || "",
          report: row.report.label,
          reportType: row.report.type,
          guideUrl: reportGuideHref(row.report),
          beforePerDay: row.stats.beforeAvg == null ? "" : Number(row.stats.beforeAvg.toFixed(2)),
          afterPerDay: row.stats.afterAvg == null ? "" : Number(row.stats.afterAvg.toFixed(2)),
          deltaPerDay: row.stats.deltaAbs == null ? "" : Number(row.stats.deltaAbs.toFixed(2)),
          deltaPct: row.stats.deltaPct == null ? "" : Number(row.stats.deltaPct.toFixed(2)),
        });
      }

      const detailsReports = eventReportRows.length
        ? eventReportRows.map((row) => `
          <tr>
            <td>
              <a href="${esc(reportGuideHref(row.report))}" target="_blank" rel="noopener" title="Open ${esc(row.report.label)} enablement guide">${esc(row.report.label)}</a>
            </td>
            <td><span class="ec-badge" title="Report type">${esc(row.report.type)}</span></td>
            <td class="num" title="Average/day from ${esc(formatFullDate(isoShift(ev.date, -WINDOW_DAYS)))} to ${esc(formatFullDate(isoShift(ev.date, -1)))}">${row.stats.beforeAvg == null ? "n/a" : fmt(row.stats.beforeAvg)}</td>
            <td class="num" title="Average/day from ${esc(formatFullDate(ev.date))} to ${esc(formatFullDate(isoShift(ev.date, WINDOW_DAYS - 1)))}">${row.stats.afterAvg == null ? "n/a" : fmt(row.stats.afterAvg)}</td>
            <td class="num ${deltaClass(row.stats.deltaAbs)}" title="Post-event average/day minus pre-event average/day">${row.stats.deltaAbs == null ? "n/a" : fmtSigned(row.stats.deltaAbs)}</td>
            <td class="num ${deltaClass(row.stats.deltaPct)}" title="Percent change vs pre-event average/day">${row.stats.deltaPct == null ? "n/a" : fmtPct(row.stats.deltaPct)}</td>
          </tr>`).join("")
        : `<tr><td colspan="6">No report-page series for this event window.</td></tr>`;
      const moversHint = moversPreview(reportPageChanges, 3);

      const detailId = `ec-detail-${idx}`;
      EVENT_DETAIL_STORE.set(eventId, {
        eventDate: ev.date,
        eventTitle: ev.title || "",
        series: {
          visits: signals.visits,
          clones: signals.clones,
          youtubeViews: signals.youtubeViews,
          referrals: signals.referrals,
        },
        pageChanges,
        reportPageChanges,
        topReferrersAfter,
        cloneRepoRows,
      });
      return `<tr class="ec-main-row">
        <td>${esc(ev.date)}</td>
        <td>
          <strong>${esc(ev.title || "")}</strong>
          ${ev.note ? `<div class="ec-sub" style="margin:.25rem 0 0">${esc(ev.note)}</div>` : ""}
        </td>
        <td class="num">${fmt(ev.attendees)}</td>
        <td><span class="ec-badge">${esc(ev.type || "event")}</span></td>
        <td class="num ${deltaClass(visit.deltaAbs)}" title="Hub visits/day, 7-day after average minus 7-day before average">${visit.deltaAbs == null ? "n/a" : fmtSigned(visit.deltaAbs)}</td>
        <td class="num ${deltaClass(clone.deltaAbs)}" title="Repo clones/day, 7-day after average minus 7-day before average">${clone.deltaAbs == null ? "n/a" : fmtSigned(clone.deltaAbs)}</td>
        <td class="num ${deltaClass(ytViews.deltaAbs)}" title="YouTube views/day, 7-day after average minus 7-day before average">${ytViews.deltaAbs == null ? "n/a" : fmtSigned(ytViews.deltaAbs)}</td>
        <td title="Top positive report lifts for this event using 7-day after minus 7-day before averages.">${esc(topLift)}</td>
        <td>
          <button type="button" class="ec-expand-btn" data-target="${detailId}" aria-expanded="false">Expand</button>
        </td>
      </tr>
      <tr id="${detailId}" class="ec-detail-row" hidden>
        <td colspan="9">
            <div class="ec-details-body">
              <div class="ec-metric-grid">
                ${metricMini("Hub visits/day", visit, "Daily human sessions on the Analytics Hub site.")}
                ${metricMini("Repo clones/day", clone, "Daily clone count for microsoft/Analytics-Hub.")}
                ${metricMini("Repo views/day", repoViews, "Daily GitHub repository views for microsoft/Analytics-Hub.")}
                ${metricMini("External referrals/day", refs, "Daily sessions from non-Microsoft and non-GitHub referrers.")}
                ${metricMini("YouTube views/day", ytViews, "Daily views from the Analytics Hub YouTube channel feed.")}
                ${metricMini("YouTube watch minutes/day", ytWatch, "Daily watch minutes from the Analytics Hub YouTube channel feed.")}
              </div>
              <div class="ec-movers-card">
                <button type="button" class="ec-chart-open" data-event-id="${eventId}" data-metric="movers" title="Open biggest movers for this event window.">
                  <div class="ec-chart-card">
                    <p class="ec-chart-title">Biggest movers after this event (click for detail)</p>
                    <p class="ec-movers-preview">${esc(moversHint)}</p>
                  </div>
                </button>
                <p>Shows pages with the largest absolute shift in average daily traffic, not just top-traffic pages.</p>
              </div>
              <div class="ec-chart-grid">
                <button type="button" class="ec-chart-open" data-event-id="${eventId}" data-metric="visits" title="Open an enlarged chart and detail table for Hub visits."><div class="ec-chart-card"><p class="ec-chart-title">Hub visits around ${esc(ev.date)} (click to enlarge)</p>${svgEventMetric(signals.visits, ev.date, "#0078d4")}</div></button>
                <button type="button" class="ec-chart-open" data-event-id="${eventId}" data-metric="clones" title="Open an enlarged chart and detail table for repo clones."><div class="ec-chart-card"><p class="ec-chart-title">Repo clones around ${esc(ev.date)} (click to enlarge)</p>${svgEventMetric(signals.clones, ev.date, "#6b4ce6")}</div></button>
                <button type="button" class="ec-chart-open" data-event-id="${eventId}" data-metric="youtubeViews" title="Open an enlarged chart and detail readout for YouTube views."><div class="ec-chart-card"><p class="ec-chart-title">YouTube views around ${esc(ev.date)} (click to enlarge)</p>${svgEventMetric(signals.youtubeViews, ev.date, "#d83b01")}</div></button>
                <button type="button" class="ec-chart-open" data-event-id="${eventId}" data-metric="referrals" title="Open an enlarged chart and detail table for external referrers."><div class="ec-chart-card"><p class="ec-chart-title">External referrals around ${esc(ev.date)} (click to enlarge)</p>${svgEventMetric(signals.referrals, ev.date, "#0f9d58")}</div></button>
              </div>
              <table class="ec-report-table">
                <thead>
                  <tr>
                    <th title="Specific Analytics Hub report. Click the name to open its enablement guide.">Report</th>
                    <th title="Report type.">Type</th>
                    <th class="num" title="7-day pre-event average sessions/day for this report.">Before/day</th>
                    <th class="num" title="7-day post-event average sessions/day for this report.">After/day</th>
                    <th class="num" title="After/day minus Before/day.">Delta/day</th>
                    <th class="num" title="Percent change vs Before/day.">Delta %</th>
                  </tr>
                </thead>
                <tbody>${detailsReports}</tbody>
              </table>
              <p class="ec-sub" style="margin-top:.6rem">Window = ${WINDOW_DAYS} days before (${esc(formatFullDate(isoShift(ev.date, -WINDOW_DAYS)))} to ${esc(formatFullDate(isoShift(ev.date, -1)))}) and ${WINDOW_DAYS} days after (${esc(formatFullDate(ev.date))} to ${esc(formatFullDate(isoShift(ev.date, WINDOW_DAYS - 1)))}) when data exists.</p>
            </div>
        </td>
      </tr>`;
    }).join("");

  body.innerHTML = rows || `<tr><td colspan="9">No events found.</td></tr>`;

  body.onclick = (ev) => {
    const chartBtn = ev.target.closest(".ec-chart-open");
    if (chartBtn) {
      openMetricModal(chartBtn.dataset.eventId || "", chartBtn.dataset.metric || "");
      return;
    }
    const btn = ev.target.closest(".ec-expand-btn");
    if (!btn) return;
    const target = document.getElementById(btn.dataset.target || "");
    if (!target) return;
    const nowHidden = target.hasAttribute("hidden");
    if (nowHidden) {
      target.removeAttribute("hidden");
      btn.textContent = "Collapse";
      btn.setAttribute("aria-expanded", "true");
    } else {
      target.setAttribute("hidden", "");
      btn.textContent = "Expand";
      btn.setAttribute("aria-expanded", "false");
    }
  };

  const allDates = [...new Set([
    ...signals.visits.keys(),
    ...signals.views.keys(),
    ...signals.clones.keys(),
    ...signals.youtubeViews.keys(),
    ...signals.youtubeWatchMinutes.keys(),
    ...signals.referrals.keys(),
  ])].sort();
  const dailyRows = allDates.map((d) => ({
    date: d,
    hubVisits: signals.visits.get(d) ?? "",
    repoViews: signals.views.get(d) ?? "",
    repoClones: signals.clones.get(d) ?? "",
    youtubeViews: signals.youtubeViews.get(d) ?? "",
    youtubeWatchMinutes: signals.youtubeWatchMinutes.get(d) ?? "",
    externalReferrals: signals.referrals.get(d) ?? "",
  }));

  return { summaryRows, reportRows: reportExportRows, dailyRows };
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
    if (timelineHost) {
      timelineHost.innerHTML = svgTimeline(signals.visits, events);
      initTimelineScroll();
    }
    renderSummary(events, signals, reportSeries);
    const exportPayload = renderEvents(events, signals, reportSeries, { traffic, site, youtube });
    setupExports(exportPayload);
  } catch (err) {
    if (meta) meta.textContent = "Could not load enablement correlation datasets.";
    const host = document.getElementById("ec-events-body");
    if (host) host.innerHTML = `<tr><td colspan="9">Failed to load data: ${esc(err.message || String(err))}</td></tr>`;
    const timelineHost = document.getElementById("ec-timeline");
    if (timelineHost) timelineHost.innerHTML = `<p class="ec-loading">Failed to load timeline: ${esc(err.message || String(err))}</p>`;
  }
}

initModal();
boot();
