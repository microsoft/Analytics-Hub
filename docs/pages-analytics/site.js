/* ============================================================
   Site Analytics · detailed single-site breakdown
   Reads ../data/traffic-history.json (same source as the main page),
   for one hosted Clarity site. Richer than the inline linked-site panel:
   full dimension breakdowns, a real sessions-over-time trend from the
   stored 3-day snapshots, and external-only referrer discovery.
   Vanilla JS, no deps.
   ============================================================ */
"use strict";

const DATA_URL = "../data/traffic-history.json";
const KNOWN = {
  "analytics-hub":  { title: "Analytics Hub",  url: "https://microsoft.github.io/Analytics-Hub/" },
  "jordan-homepage":{ title: "Jordan Homepage", url: "https://jordankingisalive.github.io/" },
};
const CLARITY_WINDOWS = [3, 7, 14, 30];
let windowDays = 14;
let SITE = null, SITEKEY = null;

const INTERNAL_HOSTS = ["microsoft.github.io", "github.com", "githubusercontent.com", "github.io"];
function isInternalRef(name) {
  let host = String(name || "");
  try { host = new URL(host).hostname; } catch (_) {}
  host = host.toLowerCase();
  if (!host) return false;
  return INTERNAL_HOSTS.some((h) => host === h || host.endsWith("." + h) || host.includes(h));
}
const intSafe = (v) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
/* Drop physically-impossible captures (more bots than total sessions) so one bad
   snapshot can't inject negative human counts or phantom bots into a window. */
function isCorruptArr(arr) {
  if (!Array.isArray(arr)) return false;
  const t = (arr.find((m) => m.metricName === "Traffic")?.information || [])[0];
  if (!t) return false;
  const tot = parseInt(t.totalSessionCount, 10), bot = parseInt(t.totalBotSessionCount, 10);
  return Number.isFinite(tot) && Number.isFinite(bot) && bot > tot;
}
const fmt = (n) => (n == null || isNaN(n)) ? "—" : Number(n).toLocaleString("en-US");
const fmtTime = (s) => { const n = intSafe(s); if (!n) return "—"; if (n < 60) return n + "s"; const m = Math.floor(n / 60), r = n % 60; return r ? `${m}m ${r}s` : `${m}m`; };
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const qp = (k) => new URLSearchParams(location.search).get(k);

/* Assemble non-overlapping 3-day snapshots into a metric map for the window.
   Returns { metrics: {name->information[]}, blocks, covered, dates }. */
function assembleWindow(site, wantDays) {
  const snaps = site.snapshots || {};
  const dates = Object.keys(snaps).sort();
  const steps = Math.max(1, Math.floor(wantDays / 3));
  const picked = [];
  for (let i = 0; i < steps; i++) { const idx = dates.length - 1 - i * 3; if (idx < 0) break; picked.push(dates[idx]); }
  // For dimension metrics we sum sessions across picked snapshots by name.
  const agg = {}; // metricName -> Map(name -> {sessions, extra})
  const NAMED = new Set(["PageTitle", "ReferrerUrl", "Country", "Browser", "Device", "OS", "PopularPages"]);
  let traffic = { totalSessionCount: 0, totalBotSessionCount: 0, distinctUserCount: 0, ppsW: 0, ppsN: 0 };
  let engage = { totalTime: 0, activeTime: 0, n: 0 };
  let scrollSum = 0, scrollN = 0;
  let dead = 0, rage = 0, scriptErr = 0, quickback = 0;
  for (const day of picked) {
    const arr = snaps[day]; if (!Array.isArray(arr) || isCorruptArr(arr)) continue;
    for (const m of arr) {
      const info = m.information || [];
      if (m.metricName === "Traffic") {
        const t = info[0] || {};
        traffic.totalSessionCount += intSafe(t.totalSessionCount);
        traffic.totalBotSessionCount += intSafe(t.totalBotSessionCount);
        traffic.distinctUserCount += intSafe(t.distinctUserCount);
        const pps = Number(t.pagesPerSessionPercentage) || 0, s = intSafe(t.totalSessionCount);
        if (pps) { traffic.ppsW += pps * s; traffic.ppsN += s; }
      } else if (m.metricName === "EngagementTime") {
        const e = info[0] || {}; engage.totalTime += intSafe(e.totalTime); engage.activeTime += intSafe(e.activeTime); engage.n++;
      } else if (m.metricName === "ScrollDepth") {
        const sd = info[0] || {}; const v = Number(sd.averageScrollDepth); if (v) { scrollSum += v; scrollN++; }
      } else if (m.metricName === "DeadClickCount") { dead += intSafe((info[0] || {}).pagesViews);
      } else if (m.metricName === "RageClickCount") { rage += intSafe((info[0] || {}).pagesViews);
      } else if (m.metricName === "ScriptErrorCount") { scriptErr += intSafe((info[0] || {}).subTotal);
      } else if (m.metricName === "QuickbackClick") { quickback += intSafe((info[0] || {}).pagesViews);
      } else if (NAMED.has(m.metricName)) {
        const map = agg[m.metricName] || (agg[m.metricName] = new Map());
        for (const r of info) {
          const key = r.name || r.Url || r.url || "(unknown)";
          map.set(key, (map.get(key) || 0) + Math.max(intSafe(r.sessionsCount), intSafe(r.totalSessionCount)));
        }
      }
    }
  }
  return { picked, blocks: picked.length, covered: picked.length * 3, agg, traffic, engage, scrollSum, scrollN, dead, rage, scriptErr, quickback };
}

/* Full daily trend of human sessions across ALL stored snapshots (not just the
   window) so the chart shows the real long arc. */
function sessionTrend(site) {
  const snaps = site.snapshots || {};
  const out = [];
  for (const day of Object.keys(snaps).sort()) {
    const arr = snaps[day]; if (!Array.isArray(arr) || isCorruptArr(arr)) continue;
    const t = (arr.find((m) => m.metricName === "Traffic")?.information || [])[0] || {};
    const human = Math.max(0, intSafe(t.totalSessionCount) - intSafe(t.totalBotSessionCount));
    out.push({ day, human });
  }
  return out;
}

function bars(items, opts = {}) {
  const { labelFn = (x) => x.label, valFn = (x) => x.val, max: maxIn, empty = "No data in this window." } = opts;
  if (!items.length) return `<li class="sd-empty">${empty}</li>`;
  const max = maxIn || Math.max(...items.map(valFn), 1);
  return items.map((x) => {
    const v = valFn(x), pct = Math.max(2, Math.round((v / max) * 100));
    return `<li><span class="bar-fill" style="width:${pct}%"></span><span class="bar-label">${esc(labelFn(x))}</span><span class="bar-val">${fmt(v)}</span></li>`;
  }).join("");
}

function topFromMap(map, limit, transform) {
  if (!map) return [];
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([name, val]) => ({ label: transform ? transform(name) : name, val }));
}

function cleanRef(url) { if (!url || /^\(?unknown\)?$/i.test(String(url))) return "(direct / unattributed)"; try { const u = new URL(url); return u.hostname + u.pathname.replace(/\/$/, ""); } catch { return url; } }
function cleanPage(url) { try { return new URL(url).pathname || url; } catch { return String(url).replace(/^https?:\/\/[^/]+/, "") || url; } }

function render() {
  const w = assembleWindow(SITE, windowDays);
  const human = Math.max(0, w.traffic.totalSessionCount - w.traffic.totalBotSessionCount);
  const pps = w.traffic.ppsN ? (w.traffic.ppsW / w.traffic.ppsN) : 0;
  const scroll = w.scrollN ? Math.round(w.scrollSum / w.scrollN) : null;
  const avgActive = w.engage.n ? Math.round(w.engage.activeTime / w.engage.n) : 0;

  document.getElementById("sd-winnote").textContent = w.blocks
    ? `${w.blocks} non-overlapping snapshot${w.blocks === 1 ? "" : "s"} (~${w.covered} days). Each is a 3-day rolling total from Clarity; longer windows chain whole snapshots that don't overlap.`
    : "No stored snapshots yet.";

  // KPIs
  document.getElementById("sd-kpis").innerHTML = [
    ["Human sessions", fmt(human), true],
    ["Distinct users (max)", "≤ " + fmt(w.traffic.distinctUserCount), false],
    ["Pages / session", pps ? pps.toFixed(2) : "—", false],
    ["Avg scroll depth", scroll != null ? scroll + "%" : "—", false],
    ["Avg active time", fmtTime(avgActive), false],
    ["Bot sessions (excl.)", fmt(w.traffic.totalBotSessionCount), false],
  ].map(([l, v, a]) => `<div class="sd-kpi"><div class="l">${l}</div><div class="v${a ? " accent" : ""}">${v}</div></div>`).join("");

  // Trend chart
  drawTrend(sessionTrend(SITE));

  // Top pages
  const pageMap = w.agg.PageTitle || w.agg.PopularPages;
  const pageItems = topFromMap(pageMap, 10, (n) => (w.agg.PageTitle ? n : cleanPage(n)));
  document.getElementById("sd-pages-note").textContent = "By sessions in the window.";
  document.getElementById("sd-pages").innerHTML = bars(pageItems, { empty: "No page data in this window." });

  // Referrers — external only
  const refMap = w.agg.ReferrerUrl;
  const extRef = refMap ? [...refMap.entries()].filter(([n]) => !isInternalRef(n)) : [];
  const extItems = extRef.sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, v]) => ({ label: cleanRef(n), val: v }));
  document.getElementById("sd-referrers").innerHTML = bars(extItems, { empty: "No external referrers in this window." });

  // Country / Browser / Device+OS
  document.getElementById("sd-country").innerHTML = bars(topFromMap(w.agg.Country, 8), { empty: "No country data." });
  document.getElementById("sd-browser").innerHTML = bars(topFromMap(w.agg.Browser, 8), { empty: "No browser data." });
  const devItems = topFromMap(w.agg.Device, 4).concat(topFromMap(w.agg.OS, 4));
  document.getElementById("sd-deviceos").innerHTML = bars(devItems, { empty: "No device data." });

  // UX health
  document.getElementById("sd-health").innerHTML = bars([
    { label: "Dead-click sessions", val: w.dead },
    { label: "Rage-click sessions", val: w.rage },
    { label: "Quick-back sessions", val: w.quickback },
    { label: "Script errors (events)", val: w.scriptErr },
  ], { empty: "No friction data." });

  // Engagement quality
  document.getElementById("sd-engagement").innerHTML = [
    { label: "Pages / session", disp: pps ? pps.toFixed(2) : "—" },
    { label: "Avg scroll depth", disp: scroll != null ? scroll + "%" : "—" },
    { label: "Avg active time", disp: fmtTime(avgActive) },
    { label: "Avg total time", disp: fmtTime(w.engage.n ? Math.round(w.engage.totalTime / w.engage.n) : 0) },
  ].map((x) => `<li><span class="bar-label">${x.label}</span><span class="bar-val">${x.disp}</span></li>`).join("");

  // Referrer split (details)
  if (refMap) {
    let intTot = 0, extTot = 0;
    for (const [n, v] of refMap) { if (isInternalRef(n)) intTot += v; else extTot += v; }
    const tot = intTot + extTot || 1;
    document.getElementById("sd-refsplit").innerHTML =
      `<ul class="sd-bars"><li><span class="bar-label">External (discovery)</span><span class="bar-val">${fmt(extTot)} · ${Math.round(extTot / tot * 100)}%</span></li>` +
      `<li><span class="bar-label">Internal (Analytics Hub / GitHub navigation)</span><span class="bar-val">${fmt(intTot)} · ${Math.round(intTot / tot * 100)}%</span></li></ul>` +
      `<p class="note" style="margin-top:.6rem">Internal referrals are people moving between our own pages — useful for flow, but not a discovery signal. That's why the panels above show external only.</p>`;
  }
}

function drawTrend(series) {
  const host = document.getElementById("sd-chart");
  if (!series.length) { host.innerHTML = `<p class="sd-empty">No trend data yet.</p>`; return; }
  const data = series.slice(-40);
  const W = host.clientWidth || 900, H = 200, pad = { l: 40, r: 12, t: 12, b: 24 };
  const max = Math.max(...data.map((d) => d.human), 1);
  const x = (i) => pad.l + (i / Math.max(1, data.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.human).toFixed(1)}`).join(" ");
  const area = `M${x(0).toFixed(1)},${y(0).toFixed(1)} ` + data.map((d, i) => `L${x(i).toFixed(1)},${y(d.human).toFixed(1)}`).join(" ") + ` L${x(data.length - 1).toFixed(1)},${y(0).toFixed(1)} Z`;
  const gridY = [0, 0.5, 1].map((f) => { const v = Math.round(max * f), yy = y(v); return `<line class="grid" x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}"/><text class="lbl" x="4" y="${yy + 3}">${v}</text>`; }).join("");
  const first = data[0].day, last = data[data.length - 1].day;
  host.innerHTML = `<svg class="sd-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Sessions over time">
    ${gridY}
    <path class="spark-area" d="${area}"/>
    <path class="spark-line" d="${line}"/>
    <text class="lbl" x="${pad.l}" y="${H - 6}">${first}</text>
    <text class="lbl" x="${W - pad.r}" y="${H - 6}" text-anchor="end">${last}</text>
  </svg>`;
}

function boot(data) {
  SITEKEY = qp("site") || "analytics-hub";
  SITE = (data.sites || {})[SITEKEY];
  const info = KNOWN[SITEKEY] || { title: SITEKEY, url: "" };
  document.getElementById("sd-title").textContent = info.title + " · detailed analytics";
  document.title = info.title + " · Site Analytics · Analytics Hub";
  if (!SITE) {
    document.getElementById("sd-src").textContent = "No Clarity data found for this site.";
    return;
  }
  const projectId = SITE.projectId || "—";
  const dates = Object.keys(SITE.snapshots || {}).sort();
  const synced = dates[dates.length - 1] || "—";
  document.getElementById("sd-src").innerHTML = `From Microsoft Clarity · project <code>${esc(projectId)}</code> · ${dates.length} stored snapshots · latest ${synced}`;
  const live = document.getElementById("sd-openlive");
  if (info.url) { live.href = info.url; live.hidden = false; }

  document.querySelectorAll("#sd-win button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#sd-win button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true");
    windowDays = parseInt(b.dataset.win, 10) || 14;
    render();
  }));
  render();
  window.addEventListener("resize", () => { clearTimeout(window.__sdT); window.__sdT = setTimeout(() => drawTrend(sessionTrend(SITE)), 150); });
}

fetch(DATA_URL, { cache: "no-store" })
  .then((r) => r.ok ? r.json() : null)
  .then((d) => { if (d) boot(d); else document.getElementById("sd-src").textContent = "Could not load analytics data."; })
  .catch(() => { document.getElementById("sd-src").textContent = "Could not load analytics data."; });
