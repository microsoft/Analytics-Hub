/* ============================================================
   Signals Lab — a working preview of upgraded traffic monitoring.
   Reads the SAME ../data/traffic-history.json the live page uses and
   computes, in the browser, the displays the measurement team asked for:
   anomaly bands, a silent-signal feed, movers & standouts, bot
   transparency, friction watch, referrer discovery, and pipeline health.

   Methods follow the two research passes:
   - Seasonal-naive expected value (m=7) + robust MAD-scaled residual
     z-score (Iglewicz-Hoaglin threshold 3.5) as the primary detector.
   - Bounded-metric rules (bot%, error%) with an absolute floor + 2-day
     persistence to avoid low-N alert fatigue.
   - Set-membership novelty for new referrers.
   - Five-pillar "data downtime" checks for the pipeline itself.
   Vanilla JS, no deps, nothing written back — purely additive.
   ============================================================ */
"use strict";

const DATA_URL = "../data/traffic-history.json";
let RAW = null;
let EVENTS = [];
let SITEKEY = "analytics-hub";
let WINDOW = 14;

const EVENT_COLORS = {
  "cowork-enablement": "#0078d4",
  "enablement": "#0a7d6c",
  "org-learning": "#6b40c0",
  "office-hours": "#8a8a9c",
  "demo": "#c98a00",
  "launch": "#0a7d33",
};
const eventColor = (t) => EVENT_COLORS[t] || "#0a7d33";

// ---------- small helpers ----------
const I = (x) => { const n = parseInt(x, 10); return isNaN(n) ? 0 : n; };
const F = (x) => { const n = Number(x); return isFinite(n) ? n : null; };
const fmt = (n) => (n == null || isNaN(n)) ? "—" : Math.round(n).toLocaleString("en-US");
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pct = (n, d) => (d ? (n / d) * 100 : 0);
const fmtSecs = (s) => { s = Math.round(s || 0); if (!s) return "—"; if (s < 60) return s + "s"; const m = Math.floor(s / 60), r = s % 60; return r ? `${m}m ${r}s` : `${m}m`; };
const qp = (k) => new URLSearchParams(location.search).get(k);

const INTERNAL = ["microsoft.github.io", "github.com", "githubusercontent.com", "github.io"];
function isInternalRef(name) {
  let h = String(name || ""); try { h = new URL(h).hostname; } catch (_) {}
  h = h.toLowerCase(); if (!h) return false;
  return INTERNAL.some((x) => h === x || h.endsWith("." + x) || h.includes(x));
}
function trafficRow(metrics) {
  const m = (metrics || []).find((x) => x.metricName === "Traffic");
  return (m && m.information && m.information[0]) || null;
}
function isCorrupt(metrics) {
  const t = trafficRow(metrics); if (!t) return false;
  return I(t.totalBotSessionCount) > I(t.totalSessionCount);
}
function metricRow(metrics, name) {
  const m = (metrics || []).find((x) => x.metricName === name);
  return (m && m.information && m.information[0]) || {};
}

// ---------- robust stats ----------
function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b), n = s.length, m = n >> 1;
  return n % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function mad(arr) {
  if (!arr.length) return 0;
  const med = median(arr);
  return median(arr.map((v) => Math.abs(v - med)));
}
// robust z: 0.6745*(x-med)/MAD ; falls back to meanAD when MAD==0 (frozen values)
function robustZ(x, med, madv, meanADv) {
  if (madv > 0) return 0.6745 * (x - med) / madv;
  if (meanADv > 0) return (x - med) / (1.253314 * meanADv);
  return 0;
}
function meanAD(arr) {
  if (!arr.length) return 0; const med = median(arr);
  return arr.reduce((s, v) => s + Math.abs(v - med), 0) / arr.length;
}

// ---------- build the daily series from clean rolling snapshots ----------
function buildSeries(site) {
  const snaps = site.snapshots || {};
  const days = Object.keys(snaps).sort();
  const out = [];
  for (const day of days) {
    const m = snaps[day];
    if (isCorrupt(m)) continue; // never let a corrupt capture into the series
    const t = trafficRow(m) || {};
    const tot = I(t.totalSessionCount), bot = I(t.totalBotSessionCount);
    const se = metricRow(m, "ScriptErrorCount"), dc = metricRow(m, "DeadClickCount");
    const rc = metricRow(m, "RageClickCount"), qb = metricRow(m, "QuickbackClick");
    const eng = metricRow(m, "EngagementTime"), sd = metricRow(m, "ScrollDepth");
    out.push({
      day, tot, bot, human: Math.max(0, tot - bot),
      botShare: pct(bot, tot),
      users: I(t.distinctUserCount),
      pps: F(t.pagesPerSessionPercentage) || 0,
      scriptErrPct: F(se.sessionsWithMetricPercentage) || 0,
      deadPct: F(dc.sessionsWithMetricPercentage) || 0,
      ragePct: F(rc.sessionsWithMetricPercentage) || 0,
      qbPct: F(qb.sessionsWithMetricPercentage) || 0,
      scroll: F(sd.averageScrollDepth) || 0,
      active: I(eng.activeTime), total: I(eng.totalTime),
    });
  }
  return out;
}

// seasonal-naive residuals (expected = same weekday last week = 7 steps back
// in this 3-day-rolling daily series; the step aligns week-over-week).
function seasonalResiduals(vals, m = 7) {
  return vals.map((v, i) => (i >= m ? v - vals[i - m] : null));
}

// ---------- per-URL window (clamped, matching the production fix) ----------
function perUrlOn(day) {
  const out = new Map();
  for (const s of Object.values(RAW.sites || {})) {
    const g = (s.snapshotsByUrl || {})[day];
    if (!g) continue;
    for (const grp of g) for (const r of (grp.information || [])) {
      const u = r.Url || r.url; if (!u) continue;
      const sess = Math.max(I(r.totalSessionCount), I(r.sessionsCount));
      const bots = Math.min(I(r.totalBotSessionCount), sess);
      const human = Math.max(0, sess - bots);
      const cur = out.get(u) || { human: 0, sess: 0, active: 0, scroll: 0, dead: 0 };
      cur.human = Math.max(cur.human, human);
      cur.sess = Math.max(cur.sess, sess);
      out.set(u, cur);
    }
    // fold engagement/friction per URL from their metric groups
    for (const grp of g) {
      const name = grp.metricName;
      for (const r of (grp.information || [])) {
        const u = r.Url || r.url; if (!u) continue; const cur = out.get(u); if (!cur) continue;
        if (name === "EngagementTime" && r.activeTime != null) cur.active = Math.max(cur.active, I(r.activeTime));
        if (name === "ScrollDepth" && r.averageScrollDepth != null) cur.scroll = Math.max(cur.scroll, F(r.averageScrollDepth) || 0);
        if (name === "DeadClickCount") cur.dead = Math.max(cur.dead, I(r.subTotal));
      }
    }
  }
  return out;
}
function perUrlDays() {
  const set = new Set();
  for (const s of Object.values(RAW.sites || {})) for (const d of Object.keys(s.snapshotsByUrl || {})) set.add(d);
  return [...set].sort();
}
const prettyUrl = (u) => String(u || "").replace(/^https?:\/\/[^/]+/, "").replace("/Analytics-Hub", "") || "/";

/* Aggregate the daily rolling series into a window and the equal window before
   it, so every KPI can be shown as "this period vs the previous period".
   Windows are built from NON-OVERLAPPING 3-day snapshots (step by 3), exactly
   like the live analytics page — 3d=1 block, 7d=2, 14d=5, 30d=10. Counts are
   summed; rates are session-weighted. */
function windowAgg(series, N) {
  const steps = Math.max(1, Math.round(N / 3));
  const idxsCur = [], idxsPrev = [];
  for (let i = 0; i < steps; i++) { const idx = series.length - 1 - i * 3; if (idx >= 0) idxsCur.push(idx); }
  for (let i = 0; i < steps; i++) { const idx = series.length - 1 - (steps + i) * 3; if (idx >= 0) idxsPrev.push(idx); }
  const agg = (idxs) => {
    let human = 0, tot = 0, bot = 0, users = 0, wSum = 0;
    let wActive = 0, wTotal = 0, wScroll = 0, wPps = 0, wDead = 0, wRage = 0, wQb = 0, wErr = 0;
    const blocks = [];
    for (const i of idxs) {
      const s = series[i]; if (!s) continue; blocks.push(s);
      human += s.human; tot += s.tot; bot += s.bot; users += s.users;
      const w = s.tot || 0; wSum += w;
      wActive += s.active * w; wTotal += s.total * w; wScroll += s.scroll * w; wPps += s.pps * w;
      wDead += s.deadPct * w; wRage += s.ragePct * w; wQb += s.qbPct * w; wErr += s.scriptErrPct * w;
    }
    const wa = (x) => wSum ? x / wSum : 0;
    return {
      human, users, tot, bot, botShare: tot ? (bot / tot) * 100 : 0,
      pps: wa(wPps), scroll: wa(wScroll), active: wa(wActive), total: wa(wTotal),
      deadPct: wa(wDead), ragePct: wa(wRage), qbPct: wa(wQb), scriptErrPct: wa(wErr),
      blocks: blocks.slice().reverse(),
    };
  };
  const startDay = idxsCur.length ? series[idxsCur[idxsCur.length - 1]].day : null;
  const endDay = idxsCur.length ? series[idxsCur[0]].day : null;
  return { steps, covered: idxsCur.length * 3, hasPrev: idxsPrev.length > 0, startDay, endDay, cur: agg(idxsCur), prev: agg(idxsPrev), idxsCur, idxsPrev };
}

/* Same window logic over the per-URL series, returning current vs previous
   per-URL human maps for window-over-window movers. */
function perUrlWindow(N) {
  const bd = perUrlDays();
  const steps = Math.max(1, Math.round(N / 3));
  const pick = (offset) => { const days = []; for (let i = 0; i < steps; i++) { const idx = bd.length - 1 - (offset + i) * 3; if (idx >= 0) days.push(bd[idx]); } return days; };
  const aggDays = (days) => {
    const m = new Map();
    for (const d of days) { const day = perUrlOn(d); for (const [u, v] of day) { const e = m.get(u) || { human: 0, sess: 0, active: 0, dead: 0 }; e.human += v.human; e.sess += v.sess; e.active = Math.max(e.active, v.active); e.dead += v.dead; m.set(u, e); } }
    return m;
  };
  return { cur: aggDays(pick(0)), prev: aggDays(pick(steps)), covered: steps * 3 };
}

// ================= metric metadata (tooltips + deep-dive) =================
const METRICS = {
  human: { label: "Human sessions", color: "var(--accent,#0078d4)", badUp: false, fmt: (v) => fmt(v),
    tip: ["Visits from real people, after Clarity's bot sessions are removed", "= total sessions − bot sessions", "The headline number every other signal is judged against"],
    what: ["A session is one visit; a person can have several in a window", "\u201cHuman\u201d means we subtract the sessions Clarity flagged as bot/automated traffic"],
    how: ["Per 3-day rolling snapshot: totalSessionCount − totalBotSessionCount", "Captures where bots exceed total (impossible) are dropped first", "Longer windows stitch non-overlapping snapshots so days aren't triple-counted"],
    why: ["The single most important trust signal on the page", "A day outside the expected band (this chart) is worth checking same-day", "A \u201crise\u201d that's really bots isn't real growth \u2014 read with bot share"] },
  users: { label: "Distinct users", color: "#8a5cf6", badUp: false, fmt: (v) => "\u2264 " + fmt(v),
    tip: ["Approximate unique visitors in the window", "Shown as \u201c\u2264\u201d because Clarity can't de-duplicate a person across snapshots", "Always an upper bound, never exact"],
    what: ["Clarity's distinctUserCount per snapshot, summed across the window", "The same person on two snapshots is counted twice \u2014 hence \u2264"],
    how: ["Sum of distinctUserCount across the window's snapshots", "No cross-snapshot de-duplication is possible from the export"],
    why: ["Use the direction, not the absolute value", "If users rise but sessions don't, visits are getting shorter"] },
  pps: { label: "Pages / session", color: "#0a7d9c", badUp: false, fmt: (v) => v ? v.toFixed(2) : "\u2014",
    tip: ["Average pages viewed per session", "A rough depth-of-visit signal", "Falling = faster bounces or dead-end pages"],
    what: ["How many pages an average visit touches", "Higher usually means people are exploring, not bouncing"],
    how: ["Clarity's pagesPerSessionPercentage, session-weighted across snapshots"],
    why: ["A sudden drop can mean broken nav or a landing page that dead-ends", "Read alongside quick-backs and active time"] },
  active: { label: "Avg active time", color: "#0a7d33", badUp: false, fmt: (v) => fmtSecs(v),
    tip: ["Time per session the visitor was actually engaged", "Excludes idle/background tab time", "A truer attention signal than total time on page"],
    what: ["Clarity separates active engagement from total tab-open time", "This is the active portion, averaged per session"],
    how: ["EngagementTime.activeTime, averaged across the window's snapshots"],
    why: ["Rising active time = content is holding attention", "A drop with steady sessions can signal a content/layout regression"] },
  scroll: { label: "Avg scroll depth", color: "#c98a00", badUp: false, fmt: (v) => v ? Math.round(v) + "%" : "\u2014",
    tip: ["How far down the page an average visit scrolls", "A single average, not the full drop-off curve", "Low = content below the fold isn't being seen"],
    what: ["Average % of page height reached across sessions"],
    how: ["ScrollDepth.averageScrollDepth, averaged across snapshots"],
    why: ["A sustained dip can mean a new hero/section pushed content down", "Multi-day regressions are flagged in the signals feed"] },
  botShare: { label: "Bot share", color: "#c50f1f", badUp: true, fmt: (v) => v.toFixed(0) + "%",
    tip: ["Share of sessions Clarity flagged as bots/automated", "Higher is worse \u2014 inflates totals and skews rankings", "Spikes are flagged automatically in the signals feed"],
    what: ["Bot sessions as a percentage of total sessions"],
    how: ["totalBotSessionCount \u00f7 totalSessionCount per snapshot", "Impossible captures (bots>total) are rejected upstream"],
    why: ["A crawl or scrape can silently double your \u201ctraffic\u201d", "Watch for sustained days above ~25% \u2014 the pattern behind the corruption we fixed"] },
  deadPct: { label: "Dead clicks", color: "#c98a00", badUp: true, pointDelta: true, foot: "of sessions", fmt: (v) => v.toFixed(2) + "%",
    tip: ["Sessions where someone clicked something that did nothing", "A leading indicator of confusing or broken UI", "Rising = people expect an element to be interactive and it isn't"],
    what: ["% of sessions with at least one \u201cdead\u201d click (no response)"],
    how: ["DeadClickCount.sessionsWithMetricPercentage per snapshot"],
    why: ["Never shows up in session counts \u2014 silent UX friction", "Drill into the highest-friction pages in Movers & standouts"] },
  ragePct: { label: "Rage clicks", color: "#c50f1f", badUp: true, pointDelta: true, foot: "of sessions", fmt: (v) => v.toFixed(2) + "%",
    tip: ["Sessions with rapid repeated clicks in frustration", "A strong signal something is broken or unresponsive", "Even small numbers are worth investigating"],
    what: ["% of sessions where Clarity detected rage-clicking"],
    how: ["RageClickCount.sessionsWithMetricPercentage per snapshot"],
    why: ["High-intent frustration signal", "A spike often maps to one specific broken control"] },
  qbPct: { label: "Quick-backs", color: "#8a5cf6", badUp: true, pointDelta: true, foot: "of sessions", fmt: (v) => v.toFixed(2) + "%",
    tip: ["Sessions that hit a page then immediately bounced back", "Our closest proxy for bounce rate", "Rising = a page isn't meeting the click's expectation"],
    what: ["% of sessions with a quick-back (open then return)"],
    how: ["QuickbackClick.sessionsWithMetricPercentage per snapshot"],
    why: ["Great for judging referrer/landing quality", "Pair with pages/session to spot dead-end pages"] },
  scriptErrPct: { label: "Script errors", color: "#0a7d9c", badUp: true, pointDelta: true, foot: "of sessions", fmt: (v) => v.toFixed(2) + "%",
    tip: ["Sessions that hit a JavaScript error", "Completely silent \u2014 no user files a bug", "Any rise around a deploy is worth a look"],
    what: ["% of sessions where a JS error fired"],
    how: ["ScriptErrorCount.sessionsWithMetricPercentage per snapshot"],
    why: ["Leading indicator of a broken release", "Any recent day above 0.3% is surfaced in the signals feed"] },
};

const HEALTH_TIPS = {
  freshness: { title: "Freshness", bullets: ["How recently the nightly Clarity export ran", "Green \u2264 1 day, amber \u2264 2, red older", "Stale data can look like a traffic drop"] },
  rolling: { title: "Rolling coverage", bullets: ["Days present in the 3-day rolling series", "Calendar gaps = missing captures (e.g. a PAT expiry)", "Longer windows stitch these non-overlapping snapshots"] },
  perurl: { title: "Per-URL coverage", bullets: ["Days of per-page data (powers Community + Cowork)", "Shallower than the site-wide series", "Gaps here quietly shrink those tabs' windows"] },
  daily: { title: "Daily series depth", bullets: ["Days in the 1-day series used for exact 7/14/30d", "Under 14 days falls back to 3-day blocks", "Deepens by one day per nightly run"] },
  corrupt: { title: "Corrupt captures", bullets: ["Captures where bots exceeded total sessions", "Physically impossible \u2192 auto-stripped at load & write", "Caught before they can distort any window"] },
  urlbot: { title: "Per-URL bot rows", bullets: ["Per-page rows where bots exceeded that page's sessions", "Legit for crawled pages, but clamped so they can't leak", "Prevented a ~145% understatement on the Community tab"] },
  devleak: { title: "Dev-traffic leakage", bullets: ["localhost / staging URLs in per-URL data", "Filtered out of published KPIs", "Worth stopping at the source too"] },
  frozen: { title: "Frozen values", bullets: ["Identical values repeated across days", "Can signal a stale/stuck capture", "Detected via a zero-variance (MAD=0) check"] },
};

const SIGNAL_TIPS = {
  "Traffic drop": { title: "Traffic drop", bullets: ["Human sessions well below the same weekday last week", "Flagged when robust z < \u22123.5 and the baseline was \u2265 40 sessions", "Seasonal-naive baseline ignores normal weekend dips"] },
  "Traffic surge": { title: "Traffic surge", bullets: ["Human sessions well above the same weekday last week", "Flagged when robust z > 3.5", "Worth annotating why \u2014 a launch, a mention, a campaign"] },
  "Bot-share spike": { title: "Bot-share spike", bullets: ["Bot share both statistically high (robust z > 3.5) and over a 25% floor", "The floor stops tiny numbers from crying wolf", "A crawl silently inflates sessions and skews rankings"] },
  "Script errors detected": { title: "Script errors detected", bullets: ["A recent day where > 0.3% of sessions hit a JS error", "Silent \u2014 users rarely report these", "Check what shipped around that date"] },
  "New referrer appeared": { title: "New referrer appeared", bullets: ["An external referrer never seen before in the record", "Only fires if it sent > 2% of the day's sessions", "Could be a fresh mention \u2014 or a scraper"] },
  "Page fell off a cliff": { title: "Page fell off a cliff", bullets: ["A single page's human sessions dropped > 50% week-over-week", "Needs \u2265 15 prior sessions so noise doesn't trigger it", "Invisible in the site-wide total"] },
  "Page broke out": { title: "Page broke out", bullets: ["A page went from no traffic to a real audience", "A standout worth understanding and repeating"] },
  "Engagement dip": { title: "Engagement dip", bullets: ["Average scroll depth ran below normal for \u2265 2 days", "Robust z < \u22123.5 on scroll depth", "Can mean a layout change or a heavier bot mix"] },
  "All clear": { title: "All clear", bullets: ["No anomalies, spikes, errors, new referrers or page cliffs in 30 days", "The data is behaving"] },
};

// ---- tooltip engine (event-delegated, works for dynamic content) ----
const TIPS = {};
function registerTips() {
  for (const [k, m] of Object.entries(METRICS)) TIPS["metric:" + k] = { title: m.label, bullets: m.tip };
  for (const [k, v] of Object.entries(HEALTH_TIPS)) TIPS["health:" + k] = v;
  for (const [k, v] of Object.entries(SIGNAL_TIPS)) TIPS["signal:" + k] = v;
}
let ttEl = null;
function showTip(el) {
  const key = el.getAttribute("data-tip"); const t = TIPS[key]; if (!t || !ttEl) return;
  ttEl.innerHTML = `<div class="tt-title">${esc(t.title)}</div><ul>${t.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  ttEl.classList.add("show"); ttEl.setAttribute("aria-hidden", "false");
  const r = el.getBoundingClientRect(); const tw = ttEl.offsetWidth || 300, th = ttEl.offsetHeight || 80;
  let left = r.left + r.width / 2 - tw / 2; left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  let top = r.top - th - 8; if (top < 8) top = r.bottom + 8;
  ttEl.style.left = left + "px"; ttEl.style.top = top + "px";
}
function hideTip() { if (ttEl) { ttEl.classList.remove("show"); ttEl.setAttribute("aria-hidden", "true"); } }
function initTooltips() {
  ttEl = document.getElementById("tt-float");
  document.addEventListener("mouseover", (e) => { const t = e.target.closest("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("mouseout", (e) => { if (e.target.closest("[data-tip]")) hideTip(); });
  document.addEventListener("focusin", (e) => { const t = e.target.closest("[data-tip]"); if (t) showTip(t); });
  document.addEventListener("focusout", hideTip);
  window.addEventListener("scroll", hideTip, { passive: true });
}

// ---- deep-dive engine ----
let LAST_CARD = null;
function openDetail(key, fromId) {
  if (!METRICS[key]) return;
  LAST_CARD = fromId || null;
  renderDetail(key);
  const sec = document.getElementById("detail-section");
  if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
}
function extraForMetric(key) {
  if (!["deadPct", "ragePct", "qbPct"].includes(key)) return "";
  const bd = perUrlDays(); if (!bd.length) return "";
  const latest = perUrlOn(bd[bd.length - 1]);
  const arr = [...latest.entries()].map(([u, v]) => ({ u, ...v })).filter((r) => r.human >= 3 && r.dead > 0).sort((a, b) => b.dead - a.dead).slice(0, 5);
  if (!arr.length) return "";
  return `<div class="bg" style="margin-top:.4rem"><h4>Where friction concentrates (latest per-URL dead-clicks)</h4>
    <table class="lab-tbl"><thead><tr><th>Page</th><th class="num">Human</th><th class="num">Dead-clicks</th></tr></thead>
    <tbody>${arr.map((r) => `<tr><td title="${esc(r.u)}">${esc(prettyUrl(r.u)).slice(0, 44)}</td><td class="num">${fmt(r.human)}</td><td class="num">${fmt(r.dead)}</td></tr>`).join("")}</tbody></table>
    <p class="lab-note">Per-URL friction is only captured for click metrics, so this shows dead-clicks as the shared proxy.</p></div>`;
}
function renderDetail(key) {
  const m = METRICS[key], s = SERIES, box = document.getElementById("detail-box");
  if (!box || !s) return;
  const now = s.length ? s[s.length - 1][key] : null;
  const d = wowDelta(s, key);
  const arr = s.map((x) => x[key]);
  const med = median(arr), mn = Math.min(...arr), mx = Math.max(...arr);
  const resid = seasonalResiduals(arr, 7);
  const rs = 1.4826 * mad(resid.filter((r) => r != null)) || 1;
  let anomN = 0, lastAnom = null;
  s.forEach((x, i) => { if (resid[i] != null && Math.abs(resid[i] / rs) > 3.5) { anomN++; lastAnom = x.day; } });
  const deltaStr = d ? (m.pointDelta ? `${d.abs > 0 ? "+" : ""}${d.abs.toFixed(2)}pt` : (d.rel != null ? `${d.abs > 0 ? "+" : ""}${Math.round(d.rel)}%` : "\u2014")) : "\u2014";
  const win = windowAgg(s, WINDOW);
  const cw = win.cur[key], pw = win.prev[key];
  let winStr = m.fmt(cw);
  if (win.hasPrev && pw != null) {
    const abs = cw - pw, rel = pw ? (abs / pw) * 100 : null;
    winStr = `${m.fmt(cw)} <span class="delta ${abs >= 0 ? "up" : "down"}">${abs >= 0 ? "▲" : "▼"} ${m.pointDelta ? Math.abs(abs).toFixed(2) + "pt" : (rel != null ? Math.abs(rel).toFixed(0) + "%" : "—")}</span>`;
  }
  box.innerHTML = `
    <div class="detail-nav">
      <button data-nav="prev">&#8617; Return to previous</button>
      <button data-nav="top">&#8593; Return to top</button>
    </div>
    <div class="detail-head"><h3>${m.label}</h3><div class="big">${m.fmt(now)}</div></div>
    <div class="detail-stats">
      <span>Latest (3-day)<b>${m.fmt(now)}</b></span>
      <span>This ${win.covered}d window<b>${winStr}</b></span>
      <span>Previous ${win.covered}d<b>${win.hasPrev ? m.fmt(pw) : "—"}</b></span>
      <span>Median<b>${m.fmt(med)}</b></span>
      <span>Range<b>${m.fmt(mn)} \u2013 ${m.fmt(mx)}</b></span>
      <span>Anomalies (in record)<b>${anomN}${lastAnom ? " \u00b7 last " + lastAnom : ""}</b></span>
    </div>
    <div class="detail-chart-wrap" id="detail-chart"></div>
    <div class="detail-bullets">
      <div class="bg"><h4>What this is</h4><ul>${m.what.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
      <div class="bg"><h4>How it's computed</h4><ul>${m.how.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
      <div class="bg"><h4>Why it matters</h4><ul>${m.why.map((b) => `<li>${esc(b)}</li>`).join("")}</ul></div>
    </div>
    ${extraForMetric(key)}`;
  drawDetailChart(document.getElementById("detail-chart"), s, key, m);
  box.querySelector('[data-nav="prev"]').addEventListener("click", () => {
    const el = LAST_CARD && document.getElementById(LAST_CARD);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.remove("pulse"); void el.offsetWidth; el.classList.add("pulse"); }
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });
  box.querySelector('[data-nav="top"]').addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}
function drawDetailChart(host, series, key, m) {
  if (!host) return;
  const view = series.slice(-60);
  if (view.length < 8) { host.innerHTML = `<p class="muted">Insufficient data for a trend.</p>`; return; }
  const vals = series.map((s) => s[key]);
  const resid = seasonalResiduals(vals, 7).filter((r) => r != null);
  const sigma = 1.4826 * mad(resid) || 0;
  const startIdx = series.length - view.length;
  const W = host.clientWidth || 900, H = 230, pad = { l: 50, r: 14, t: 14, b: 26 };
  const arr = view.map((s) => s[key]);
  const maxV = Math.max(...arr, 0.0001) * 1.12, minV = Math.min(...arr, 0);
  const x = (i) => pad.l + (i / Math.max(1, view.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - minV) / ((maxV - minV) || 1)) * (H - pad.t - pad.b);
  const c80 = 1.2816;
  const exp = view.map((s, k) => { const gi = startIdx + k; return gi >= 7 ? vals[gi - 7] : null; });
  const bi = exp.map((e, k) => e == null ? null : k).filter((k) => k != null);
  let band = "";
  if (sigma > 0 && bi.length > 1) {
    const top = bi.map((k) => `${x(k).toFixed(1)},${y(exp[k] + c80 * sigma).toFixed(1)}`).join(" L");
    const bot = bi.slice().reverse().map((k) => `${x(k).toFixed(1)},${y(Math.max(minV, exp[k] - c80 * sigma)).toFixed(1)}`).join(" L");
    band = `<path class="band" d="M${top} L${bot} Z"/>`;
  }
  const expLine = bi.map((k, j) => `${j ? "L" : "M"}${x(k).toFixed(1)},${y(exp[k]).toFixed(1)}`).join(" ");
  const actLine = view.map((s, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(s[key]).toFixed(1)}`).join(" ");
  let dots = "";
  view.forEach((s, k) => {
    const gi = startIdx + k; if (gi < 7 || sigma <= 0) return;
    const z = (s[key] - vals[gi - 7]) / sigma;
    if (Math.abs(z) > 3.5) { const good = z > 0 && !m.badUp; dots += `<circle class="dot-anom${good ? " high" : ""}" cx="${x(k).toFixed(1)}" cy="${y(s[key]).toFixed(1)}" r="4"><title>${s.day}: ${m.fmt(s[key])} (z=${z.toFixed(1)})</title></circle>`; }
  });
  const grid = [0, 0.5, 1].map((f) => { const v = minV + (maxV - minV) * f, yy = y(v); return `<line class="grid" x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}"/><text class="lbl" x="6" y="${(yy + 3).toFixed(1)}">${m.fmt(v)}</text>`; }).join("");
  host.innerHTML = `<svg class="anom-chart" style="height:230px" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${grid}${band}<path class="expected" d="${expLine}"/><path class="actual" d="${actLine}" style="stroke:${m.color}"/>${dots}<text class="lbl" x="${pad.l}" y="${H - 6}">${view[0].day}</text><text class="lbl" x="${W - pad.r}" y="${H - 6}" text-anchor="end">${view[view.length - 1].day}</text></svg>`;
}
function initDetailClicks() {
  document.addEventListener("click", (e) => {
    const c = e.target.closest(".score.clickable");
    if (c && c.dataset.metric) openDetail(c.dataset.metric, c.id);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const a = document.activeElement;
      if (a && a.classList && a.classList.contains("score") && a.dataset.metric) { e.preventDefault(); openDetail(a.dataset.metric, a.id); }
    }
  });
}

// ================= renderers =================

// One reusable KPI card (module A and F). Shows the selected window's value and
// its change vs the previous equal window.
function kpiCard(win, key, series) {
  const m = METRICS[key];
  const cur = win.cur[key], prev = win.prev[key];
  let deltaHtml = '<span class="delta flat">— no prior window</span>';
  if (win.hasPrev && prev != null) {
    const abs = cur - prev, rel = prev ? (abs / prev) * 100 : null;
    const good = m.badUp ? (abs <= 0) : (abs >= 0);
    const cls = Math.abs(abs) < 1e-9 ? "flat" : good ? "up" : "down";
    const arrow = abs > 1e-9 ? "▲" : abs < -1e-9 ? "▼" : "•";
    const val = m.pointDelta ? `${Math.abs(abs).toFixed(2)}pt` : (rel != null ? `${Math.abs(rel).toFixed(0)}%` : "—");
    deltaHtml = `<span class="delta ${cls}" title="Current ${win.covered}-day window vs the previous ${win.covered} days">${arrow} ${val}</span>`;
  }
  const prevText = (win.hasPrev && prev != null) ? `<div class="prevcmp">prev ${win.covered}d: <b>${m.fmt(prev)}</b></div>` : "";
  return `<div class="score clickable" id="card-${key}" data-metric="${key}" role="button" tabindex="0" aria-label="${m.label}, activate for details">
    <button class="info-i" data-tip="metric:${key}" aria-label="About ${m.label}" tabindex="0">i</button>
    <div class="l">${m.label}</div><div class="v">${m.fmt(cur)}</div>
    <div class="foot">${deltaHtml}${sparkline(series.slice(-42).map((s) => s[key]), m.color)}</div>
    ${prevText}
    ${m.foot ? `<div class="lab-note" style="margin-top:4px">${m.foot}</div>` : ""}
    <div class="more">Details →</div></div>`;
}

function sparkline(vals, color) {
  if (!vals.length) return "";
  const W = 74, H = 24, pad = 2, max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const rng = (max - min) || 1;
  const x = (i) => pad + (i / Math.max(1, vals.length - 1)) * (W - 2 * pad);
  const y = (v) => pad + (1 - (v - min) / rng) * (H - 2 * pad);
  const line = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `M${x(0).toFixed(1)},${y(min).toFixed(1)} ` + vals.map((v, i) => `L${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") + ` L${x(vals.length - 1).toFixed(1)},${y(min).toFixed(1)} Z`;
  return `<svg class="spark" viewBox="0 0 ${W} ${H}"><path class="area" d="${area}" style="fill:color-mix(in srgb,${color} 10%,transparent)"/><path d="${line}" style="stroke:${color}"/></svg>`;
}

function wowDelta(series, key) {
  // compare newest value vs value 7 steps back (same weekday last week)
  if (series.length < 8) return null;
  const now = series[series.length - 1][key], prev = series[series.length - 8][key];
  if (prev == null) return null;
  const abs = now - prev, rel = prev ? (abs / prev) * 100 : null;
  return { now, prev, abs, rel };
}

function renderScorecards(series) {
  const win = windowAgg(series, WINDOW);
  const keys = ["human", "users", "pps", "active", "scroll", "botShare"];
  document.getElementById("scorecards").innerHTML = keys.map((k) => kpiCard(win, k, series)).join("");
}

function renderAnomaly(series) {
  const host = document.getElementById("anom-chart");
  const view = series.slice(-45);
  if (view.length < 10) { host.innerHTML = `<p class="muted">Insufficient data for a trend yet.</p>`; return; }
  const vals = series.map((s) => s.human);
  const resid = seasonalResiduals(vals, 7);
  const validResid = resid.filter((r) => r != null);
  const rMed = median(validResid), rMad = mad(validResid), rMeanAD = meanAD(validResid);
  const sigma = rMad > 0 ? 1.4826 * rMad : 1.253314 * rMeanAD;
  const startIdx = series.length - view.length;

  const W = host.clientWidth || 900, H = 300, pad = { l: 46, r: 14, t: 14, b: 26 };
  const maxV = Math.max(...view.map((s) => s.human), 1) * 1.1;
  const x = (i) => pad.l + (i / Math.max(1, view.length - 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - v / maxV) * (H - pad.t - pad.b);

  // expected (seasonal naive) and 80% band (c=1.28)
  const c80 = 1.2816;
  const exp = view.map((s, k) => { const gi = startIdx + k; return gi >= 7 ? vals[gi - 7] : null; });
  const bandTop = exp.map((e) => e == null ? null : e + c80 * sigma);
  const bandBot = exp.map((e) => e == null ? null : Math.max(0, e - c80 * sigma));

  let bandPath = "";
  const bi = exp.map((e, k) => e == null ? null : k).filter((k) => k != null);
  if (bi.length > 1) {
    const top = bi.map((k) => `${x(k).toFixed(1)},${y(bandTop[k]).toFixed(1)}`).join(" L");
    const bot = bi.slice().reverse().map((k) => `${x(k).toFixed(1)},${y(bandBot[k]).toFixed(1)}`).join(" L");
    bandPath = `<path class="band" d="M${top} L${bot} Z"/>`;
  }
  const expLine = bi.map((k, j) => `${j ? "L" : "M"}${x(k).toFixed(1)},${y(exp[k]).toFixed(1)}`).join(" ");
  const actLine = view.map((s, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(s.human).toFixed(1)}`).join(" ");

  // anomaly dots
  let dots = "", anomCount = 0, lastAnom = null;
  view.forEach((s, k) => {
    const gi = startIdx + k, r = resid[gi];
    if (r == null || sigma <= 0) return;
    const z = r / sigma;
    if (Math.abs(z) > 3.5) {
      anomCount++; lastAnom = s.day;
      const cls = z > 0 ? "dot-anom high" : "dot-anom";
      dots += `<circle class="${cls}" cx="${x(k).toFixed(1)}" cy="${y(s.human).toFixed(1)}" r="4.5"><title>${s.day}: ${fmt(s.human)} sessions, z=${z.toFixed(1)}</title></circle>`;
    }
  });

  const grid = [0, 0.5, 1].map((f) => { const v = maxV * f, yy = y(v); return `<line class="grid" x1="${pad.l}" y1="${yy}" x2="${W - pad.r}" y2="${yy}"/><text class="lbl" x="6" y="${(yy + 3).toFixed(1)}">${fmt(v)}</text>`; }).join("");

  // shade the currently-selected window at the right edge of the view
  const win = windowAgg(series, WINDOW);
  let winBand = "";
  if (win.covered > 0) {
    const startK = Math.max(0, view.length - win.covered);
    const x0 = x(startK) - (W - pad.l - pad.r) / Math.max(1, view.length - 1) / 2;
    winBand = `<rect class="winband" x="${Math.max(pad.l, x0).toFixed(1)}" y="${pad.t}" width="${(W - pad.r - Math.max(pad.l, x0)).toFixed(1)}" height="${H - pad.t - pad.b}"><title>Selected ${win.covered}-day window</title></rect>`;
  }
  // enablement-event markers: a dashed vertical line + top triangle at each
  // event date that falls inside the visible window, with a native hover tip.
  let evMarks = "";
  const dayIndex = new Map(view.map((s, k) => [s.day, k]));
  const firstDay = view[0].day, lastDay = view[view.length - 1].day;
  for (const ev of EVENTS) {
    if (!ev.date || ev.date < firstDay || ev.date > lastDay) continue;
    // snap to the nearest snapshot day at or after the event
    let k = dayIndex.get(ev.date);
    if (k == null) { for (let j = 0; j < view.length; j++) { if (view[j].day >= ev.date) { k = j; break; } } }
    if (k == null) continue;
    const xx = x(k), col = eventColor(ev.type);
    const star = ev.attendees >= 300 ? " \u2605" : "";
    evMarks += `<line class="ev-line" x1="${xx.toFixed(1)}" y1="${pad.t}" x2="${xx.toFixed(1)}" y2="${(H - pad.b).toFixed(1)}" stroke="${col}"/>` +
      `<polygon class="ev-tri" points="${(xx - 4).toFixed(1)},${pad.t} ${(xx + 4).toFixed(1)},${pad.t} ${xx.toFixed(1)},${(pad.t + 6).toFixed(1)}" fill="${col}"><title>${esc(ev.date)}${star} \u2014 ${esc(ev.title)} (${fmt(ev.attendees)} reach)</title></polygon>`;
  }
  host.innerHTML = `<svg class="anom-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    ${grid}${winBand}${bandPath}${evMarks}
    <path class="expected" d="${expLine}"/>
    <path class="actual" d="${actLine}"/>
    ${dots}
    <text class="lbl" x="${pad.l}" y="${H - 6}">${view[0].day}</text>
    <text class="lbl" x="${W - pad.r}" y="${H - 6}" text-anchor="end">${view[view.length - 1].day}</text>
  </svg>`;
  document.getElementById("anom-note").textContent = anomCount
    ? `${anomCount} day${anomCount === 1 ? "" : "s"} broke out of the expected band in this view (most recent: ${lastAnom}). Robust band width ≈ ±${Math.round(c80 * sigma)} sessions.`
    : "No anomalies in this view — every day sat inside its expected range.";
  // period comparison caption
  const cmp = document.getElementById("anom-cmp");
  if (cmp) {
    if (win.hasPrev) {
      const abs = win.cur.human - win.prev.human, rel = win.prev.human ? (abs / win.prev.human) * 100 : null;
      const cls = abs >= 0 ? "up" : "down", arrow = abs >= 0 ? "▲" : "▼";
      cmp.innerHTML = `<span>Shaded window (${win.startDay} → ${win.endDay}): <b>${fmt(win.cur.human)}</b> human sessions</span>
        <span>Previous ${win.covered}d: <b>${fmt(win.prev.human)}</b></span>
        <span class="delta ${cls}">${arrow} ${rel != null ? Math.abs(rel).toFixed(0) + "%" : "—"} (${abs >= 0 ? "+" : ""}${fmt(abs)})</span>`;
    } else {
      cmp.innerHTML = `<span>Shaded window: <b>${fmt(win.cur.human)}</b> human sessions</span><span class="muted">no prior window to compare yet</span>`;
    }
  }
}

function renderSignals(series) {
  const host = document.getElementById("signals");
  const cards = [];
  const n = series.length;
  const vals = series.map((s) => s.human);
  const resid = seasonalResiduals(vals, 7).filter((r) => r != null);
  const sigmaH = 1.4826 * mad(resid) || 1;

  // recent window scoped to the selected comparison window (min 7 days so short
  // windows still surface something); baselines above still use full history.
  const lookback = Math.max(7, windowAgg(series, WINDOW).covered);
  const recent = series.slice(-lookback);

  // 1) traffic anomalies (last 10 days)
  recent.forEach((s, k) => {
    const gi = n - recent.length + k; if (gi < 7) return;
    const r = s.human - vals[gi - 7];
    const z = r / sigmaH;
    if (z < -3.5 && vals[gi - 7] >= 40) {
      cards.push({ sev: "high", when: s.day, order: gi, title: "Traffic drop",
        detail: `Human sessions fell to ${fmt(s.human)} — about ${Math.round(-r)} below the same weekday last week (${fmt(vals[gi - 7])}). Robust z = ${z.toFixed(1)}.` });
    } else if (z > 3.5) {
      cards.push({ sev: "good", when: s.day, order: gi, title: "Traffic surge",
        detail: `Human sessions jumped to ${fmt(s.human)} — ${Math.round(r)} above the same weekday last week. Something drove attention; worth annotating why.` });
    }
  });

  // 2) bot-share spikes (robust + absolute floor 25%, 2-day persistence)
  const bshare = series.map((s) => s.botShare);
  const bMed = median(bshare), bMad = mad(bshare);
  let botRun = [];
  series.slice(-12).forEach((s) => {
    const z = bMad ? 0.6745 * (s.botShare - bMed) / bMad : 0;
    if (s.botShare > 25 && z > 3.5) botRun.push(s);
  });
  if (botRun.length >= 1) {
    const worst = botRun.reduce((a, b) => b.botShare > a.botShare ? b : a);
    cards.push({ sev: botRun.length >= 2 ? "high" : "med", when: worst.day, order: n,
      title: "Bot-share spike",
      detail: `Bots were ${worst.botShare.toFixed(0)}% of sessions on ${worst.day} (${fmt(worst.bot)}/${fmt(worst.tot)})${botRun.length >= 2 ? `, and elevated on ${botRun.length} recent days` : ""}. This is the pattern that corrupts daily captures — the pipeline now rejects impossible ones, but a real crawl still skews rankings.` });
  }

  // 3) script-error presence (any day in the window with sessions-with-error > 0.3%)
  const errDays = recent.filter((s) => s.scriptErrPct > 0.3);
  if (errDays.length) {
    const worst = errDays.reduce((a, b) => b.scriptErrPct > a.scriptErrPct ? b : a);
    cards.push({ sev: "med", when: worst.day, order: n - 1,
      title: "Script errors detected",
      detail: `${worst.scriptErrPct.toFixed(2)}% of sessions hit a JavaScript error on ${worst.day}. Small, but script errors are silent — no user reports them. Worth checking what shipped around then.` });
  }

  // 4) new referrer (novelty)
  const site = RAW.sites[SITEKEY] || {};
  const rdates = Object.keys(site.snapshots || {}).sort();
  const refsOn = (day) => { const g = (site.snapshots || {})[day]; const m = (g || []).find((x) => x.metricName === "ReferrerUrl"); const o = {}; for (const r of ((m && m.information) || [])) if (r.name) o[r.name] = I(r.sessionsCount); return o; };
  const recentSet = new Map(), earlierSet = new Set();
  rdates.slice(-2).forEach((d) => { const o = refsOn(d); for (const k in o) if (!isInternalRef(k)) recentSet.set(k, (recentSet.get(k) || 0) + o[k]); });
  rdates.slice(0, -2).forEach((d) => { const o = refsOn(d); for (const k in o) if (!isInternalRef(k)) earlierSet.add(k); });
  const daySessions = series.length ? series[series.length - 1].tot : 0;
  for (const [k, v] of recentSet) {
    if (!earlierSet.has(k) && v >= Math.max(2, daySessions * 0.02)) {
      cards.push({ sev: "info", when: rdates[rdates.length - 1], order: n, title: "New referrer appeared",
        detail: `${esc(k)} sent ${fmt(v)} sessions and hasn't been seen before in the record. Could be a fresh mention — or a scraper. Worth a look.` });
    }
  }

  // 5) per-URL page cliff / breakout riser — current window vs previous window
  const puw = perUrlWindow(WINDOW);
  if (puw.cur.size || puw.prev.size) {
    const cur = puw.cur, prev = puw.prev;
    const urls = new Set([...cur.keys(), ...prev.keys()]);
    let biggestFall = null, biggestRise = null;
    for (const u of urls) {
      const c = (cur.get(u) || {}).human || 0, p = (prev.get(u) || {}).human || 0;
      if (c + p < 12) continue;
      const dlt = c - p;
      if (p >= 15 && dlt < -p * 0.5) { if (!biggestFall || dlt < biggestFall.dlt) biggestFall = { u, c, p, dlt }; }
      if (p === 0 && c >= 30) { if (!biggestRise || c > biggestRise.c) biggestRise = { u, c, p, dlt }; }
    }
    const when = series.length ? series[series.length - 1].day : "";
    if (biggestFall) cards.push({ sev: "med", when, order: n - 2, title: "Page fell off a cliff",
      detail: `${esc(prettyUrl(biggestFall.u))} dropped from ${fmt(biggestFall.p)} to ${fmt(biggestFall.c)} human sessions vs the previous ${puw.covered}d window (${Math.round((biggestFall.dlt / biggestFall.p) * 100)}%). A single page collapsing is invisible in the site total.` });
    if (biggestRise) cards.push({ sev: "good", when, order: n, title: "Page broke out",
      detail: `${esc(prettyUrl(biggestRise.u))} went from no traffic to ${fmt(biggestRise.c)} human sessions this window — a new page finding an audience.` });
  }

  // 6) engagement (scroll) regression — robust z on scroll, 2-day persistence
  const scrolls = series.map((s) => s.scroll).filter((v) => v > 0);
  const sMed = median(scrolls), sMad = mad(scrolls);
  const scrollRun = series.slice(-4).filter((s) => s.scroll > 0 && sMad && (0.6745 * (s.scroll - sMed) / sMad) < -3.5);
  if (scrollRun.length >= 2) {
    cards.push({ sev: "med", when: scrollRun[scrollRun.length - 1].day, order: n - 3, title: "Engagement dip",
      detail: `Average scroll depth ran below normal for ${scrollRun.length} recent days (down to ${Math.round(scrollRun[scrollRun.length - 1].scroll)}%). Could mean a layout change is pushing content down or a heavier bot mix.` });
  }

  if (!cards.length) {
    host.innerHTML = `<div class="signal sev-good" data-tip="signal:All clear"><div class="st"><span class="chip">All clear</span></div><p class="sd">No anomalies, bot spikes, errors, new referrers, or page cliffs in the last 30 days. The data is behaving.</p></div>`;
    return;
  }
  cards.sort((a, b) => (b.order - a.order) || 0);
  const chip = { high: "Alert", med: "Watch", info: "FYI", good: "Standout" };
  host.innerHTML = cards.slice(0, 9).map((c) => `<div class="signal sev-${c.sev}" data-tip="signal:${esc(c.title)}">
    <div class="st"><span class="chip">${chip[c.sev]}</span>${esc(c.title)}</div>
    <p class="sd">${c.detail}</p>
    <div class="sm">${c.when}</div></div>`).join("");
}

function renderMovers() {
  const bd = perUrlDays();
  const tb = document.getElementById("movers-tbody");
  if (bd.length < 4) { tb.innerHTML = `<tr><td colspan="5" class="muted">Need more per-URL history.</td></tr>`; return; }
  const puw = perUrlWindow(WINDOW);
  const cur = puw.cur, prev = puw.prev;
  const sub = document.getElementById("movers-sub");
  if (sub) sub.textContent = `(per-page, current ${puw.covered}d vs previous ${puw.covered}d)`;
  // per-URL mini series across available per-URL days for sparkline
  const seriesByUrl = (u) => bd.slice(-8).map((d) => (perUrlOn(d).get(u) || {}).human || 0);
  const urls = new Set([...cur.keys(), ...prev.keys()]);
  const rows = [];
  for (const u of urls) {
    const c = (cur.get(u) || {}).human || 0, p = (prev.get(u) || {}).human || 0;
    if (c + p < 8) continue;
    rows.push({ u, c, p, dlt: c - p });
  }
  const risers = [...rows].sort((a, b) => b.dlt - a.dlt).slice(0, 5);
  const fallers = [...rows].sort((a, b) => a.dlt - b.dlt).filter((r) => r.dlt < 0).slice(0, 3);
  const render = (r) => {
    const up = r.dlt >= 0;
    return `<tr><td title="${esc(r.u)}">${esc(prettyUrl(r.u)).slice(0, 40)}</td>
      <td class="num">${fmt(r.p)}</td><td class="num">${fmt(r.c)}</td>
      <td class="num movesign ${up ? "up" : "down"}">${up ? "+" : ""}${fmt(r.dlt)}</td>
      <td>${sparkline(seriesByUrl(r.u), up ? "#0a7d33" : "#c50f1f").replace("spark", "spark rowspark")}</td></tr>`;
  };
  tb.innerHTML = risers.map(render).join("") + (fallers.length ? `<tr><td colspan="5" style="padding-top:.6rem;font-size:.72rem;color:var(--text-muted,#6b6b85)">Falling</td></tr>` + fallers.map(render).join("") : "");

  // standouts (over the current window)
  const sb = document.getElementById("standouts-tbody");
  const arr = [...cur.entries()].map(([u, v]) => ({ u, ...v }));
  const bestEng = arr.filter((r) => r.human >= 5 && r.active > 0).sort((a, b) => b.active - a.active).slice(0, 3);
  const worstFric = arr.filter((r) => r.human >= 5).sort((a, b) => (b.dead / Math.max(1, b.human)) - (a.dead / Math.max(1, a.human))).slice(0, 3);
  let rows2 = bestEng.map((r) => `<tr><td title="${esc(r.u)}">${esc(prettyUrl(r.u)).slice(0, 36)}</td><td class="num">${fmt(r.human)}</td><td class="num" style="color:#0a7d33">${fmtSecs(r.active)} active</td></tr>`).join("");
  rows2 += `<tr><td colspan="3" style="padding-top:.5rem;font-size:.72rem;color:var(--text-muted,#6b6b85)">Highest friction (watch)</td></tr>`;
  rows2 += worstFric.map((r) => `<tr><td title="${esc(r.u)}">${esc(prettyUrl(r.u)).slice(0, 36)}</td><td class="num">${fmt(r.human)}</td><td class="num" style="color:#c50f1f">${fmt(r.dead)} dead-clicks</td></tr>`).join("");
  sb.innerHTML = rows2;
  document.getElementById("standouts-note").textContent = "Best = longest active engagement; friction = pages where visitors click dead spots most.";
}

function renderBot(series) {
  const host = document.getElementById("bot-chart");
  const view = series.slice(-45);
  if (!view.length) { host.innerHTML = `<p class="muted">No data.</p>`; return; }
  const W = host.clientWidth || 900, H = 180, pad = { l: 40, r: 12, t: 10, b: 22 };
  const maxV = Math.max(...view.map((s) => s.tot), 1);
  const bw = (W - pad.l - pad.r) / view.length;
  const y = (v) => pad.t + (1 - v / maxV) * (H - pad.t - pad.b);
  let bars = "";
  view.forEach((s, k) => {
    const xx = pad.l + k * bw;
    const yHuman = y(s.human), yTot = y(s.tot), y0 = y(0);
    bars += `<rect class="human" x="${xx.toFixed(1)}" y="${yHuman.toFixed(1)}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${(y0 - yHuman).toFixed(1)}"><title>${s.day}: ${fmt(s.human)} human</title></rect>`;
    if (s.bot > 0) bars += `<rect class="bot" x="${xx.toFixed(1)}" y="${yTot.toFixed(1)}" width="${Math.max(1, bw - 1).toFixed(1)}" height="${(yHuman - yTot).toFixed(1)}"><title>${s.day}: ${fmt(s.bot)} bots (${s.botShare.toFixed(0)}%)</title></rect>`;
  });
  const win = windowAgg(series, WINDOW);
  let winBand = "";
  if (win.covered > 0) {
    const startK = Math.max(0, view.length - win.covered);
    const x0 = pad.l + startK * bw;
    winBand = `<rect class="winband" x="${x0.toFixed(1)}" y="${pad.t}" width="${(W - pad.r - x0).toFixed(1)}" height="${H - pad.t - pad.b}"><title>Selected ${win.covered}-day window</title></rect>`;
  }
  host.innerHTML = `<svg class="bot-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${winBand}${bars}
    <text class="lbl" x="${pad.l}" y="${H - 5}">${view[0].day}</text>
    <text class="lbl" x="${W - pad.r}" y="${H - 5}" text-anchor="end">${view[view.length - 1].day}</text></svg>`;
  const spikes = view.filter((s) => s.botShare > 25);
  document.getElementById("bot-note").textContent = spikes.length
    ? `${spikes.length} day(s) with bot share over 25% (worst: ${spikes.reduce((a, b) => b.botShare > a.botShare ? b : a).botShare.toFixed(0)}%). Red = bots, blue = humans.`
    : "Bot share stayed under 25% across this window.";
}

function renderFriction(series) {
  const win = windowAgg(series, WINDOW);
  const keys = ["deadPct", "ragePct", "qbPct", "scriptErrPct"];
  document.getElementById("friction-cards").innerHTML = keys.map((k) => kpiCard(win, k, series)).join("");
}

function renderReferrers() {
  const site = RAW.sites[SITEKEY] || {};
  const rdates = Object.keys(site.snapshots || {}).sort();
  const refsOn = (day) => { const g = (site.snapshots || {})[day]; const m = (g || []).find((x) => x.metricName === "ReferrerUrl"); const o = {}; for (const r of ((m && m.information) || [])) if (r.name) o[r.name] = I(r.sessionsCount); return o; };
  const steps = Math.max(1, Math.round(WINDOW / 3));
  const pickBlocks = (offset) => { const days = []; for (let i = 0; i < steps; i++) { const idx = rdates.length - 1 - (offset + i) * 3; if (idx >= 0) days.push(rdates[idx]); } return days; };
  const aggBlocks = (days) => { const m = new Map(); for (const d of days) { const o = refsOn(d); for (const k in o) if (!isInternalRef(k)) m.set(k, (m.get(k) || 0) + o[k]); } return m; };
  const curM = aggBlocks(pickBlocks(0)), prevM = aggBlocks(pickBlocks(steps));
  const picked = pickBlocks(0);
  const firstSeen = new Map();
  for (const d of rdates) { const o = refsOn(d); for (const k in o) if (!isInternalRef(k) && !firstSeen.has(k)) firstSeen.set(k, d); }
  const clean = (u) => u && /^https?:/.test(u) ? (() => { try { return new URL(u).hostname; } catch { return u; } })() : (u || "(direct / unattributed)");
  const rows = [...curM.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const newestWindow = new Set(picked);
  document.getElementById("referrer-tbody").innerHTML = rows.map(([k, v]) => {
    const fs = firstSeen.get(k);
    const isNew = newestWindow.has(fs);
    const p = prevM.get(k) || 0, abs = v - p;
    const deltaCell = !prevM.size ? '<span class="muted">—</span>'
      : (abs === 0 ? '<span class="delta flat">•</span>'
        : `<span class="movesign ${abs > 0 ? "up" : "down"}">${abs > 0 ? "+" : ""}${fmt(abs)}</span>`);
    return `<tr><td>${esc(clean(k))}${isNew ? '<span class="newbadge">NEW</span>' : ""}</td><td class="num">${fmt(v)}</td><td class="num">${deltaCell}</td><td class="muted">${fs || "—"}</td></tr>`;
  }).join("") || `<tr><td colspan="4" class="muted">No external referrers in window.</td></tr>`;
}

/* Impact events: for each enablement event, average human sessions in the week
   before vs the week after, as a first-order read on its effect on hub traffic. */
function renderImpactEvents(series) {
  const tb = document.getElementById("impact-tbody");
  const note = document.getElementById("impact-note");
  if (!tb) return;
  const byDay = new Map(series.map((s) => [s.day, s.human]));
  const days = series.map((s) => s.day);
  const firstDay = days[0], lastDay = days[days.length - 1];
  const meanBetween = (loDate, hiDate) => {
    let sum = 0, n = 0;
    for (const s of series) { if (s.day >= loDate && s.day <= hiDate) { sum += s.human; n++; } }
    return n ? sum / n : null;
  };
  const shift = (iso, d) => { const x = new Date(iso + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };
  const badge = (t) => `<span class="ev-badge ev-${t}">${(t || "").replace(/-/g, " ")}</span>`;

  const rows = [...EVENTS].sort((a, b) => (b.date || "").localeCompare(a.date || "")).map((ev) => {
    const before = meanBetween(shift(ev.date, -7), shift(ev.date, -1));
    const after = meanBetween(ev.date, shift(ev.date, 6));
    let liftHtml = '<span class="muted">n/a</span>', beforeAfter = '<span class="muted">outside data range</span>';
    if (ev.date < firstDay || ev.date > shift(lastDay, 0)) {
      // event predates the series or is in the future
    }
    if (before != null && after != null) {
      const abs = after - before, rel = before ? (abs / before) * 100 : null;
      const cls = abs >= 0 ? "up" : "down";
      liftHtml = `<span class="movesign ${cls}">${abs >= 0 ? "+" : ""}${rel != null ? Math.round(rel) + "%" : fmt(abs)}</span>`;
      beforeAfter = `${fmt(before)} &rarr; ${fmt(after)}`;
    } else if (after != null && before == null) {
      beforeAfter = `— &rarr; ${fmt(after)}`;
      liftHtml = '<span class="muted">no baseline</span>';
    }
    const star = ev.attendees >= 300 ? ' <span class="ev-flag" title="Large-audience session">\u2605</span>' : "";
    return `<tr>
      <td>${esc(ev.date)}</td>
      <td title="${esc(ev.note || "")}">${esc(ev.title)}${star}</td>
      <td class="num">${fmt(ev.attendees)}</td>
      <td>${badge(ev.type)}</td>
      <td class="num">${beforeAfter}</td>
      <td class="num">${liftHtml}</td></tr>`;
  }).join("");
  tb.innerHTML = rows || `<tr><td colspan="6" class="muted">No events logged yet.</td></tr>`;
  note.innerHTML = "Lift = average daily human sessions in the 7 days after vs the 7 days before. It's a directional read, not attribution \u2014 when sessions cluster (e.g. mid-August) their windows overlap, so a later event's \u201cbefore\u201d already includes an earlier event's lift.";
}

function renderHealth(series) {
  const site = RAW.sites[SITEKEY] || {};
  const grid = document.getElementById("health-grid");
  const rdates = Object.keys(site.snapshots || {}).sort();
  const udates = Object.keys(site.snapshotsByUrl || {}).sort();
  const ddates = Object.keys(site.dailySnapshots || {}).sort();
  const latest = rdates[rdates.length - 1];
  const daysSince = latest ? Math.round((Date.now() - new Date(latest + "T00:00:00Z")) / 86400000) : 999;

  // gaps
  const gaps = (keys) => { let g = 0; let prev = null; for (const k of keys) { const c = new Date(k + "T00:00:00Z"); if (prev && (c - prev) / 86400000 > 1) g++; prev = c; } return g; };
  // corrupt captures present in raw
  let corrupt = 0; for (const key of ["snapshots", "dailySnapshots"]) for (const d of Object.keys(site[key] || {})) if (isCorrupt(site[key][d])) corrupt++;
  // per-URL corrupt rows + dev leakage
  let devLeak = 0, urlCorrupt = 0;
  for (const d of udates) for (const grp of (site.snapshotsByUrl[d] || [])) for (const r of (grp.information || [])) {
    const u = String(r.Url || r.url || "").toLowerCase();
    if (u.includes("localhost") || u.includes("127.0.0.1") || u.includes("azurewebsites.net")) devLeak++;
    if (grp.metricName === "Traffic" && I(r.totalBotSessionCount) > I(r.totalSessionCount)) urlCorrupt++;
  }
  // frozen value check on human sessions
  let frozen = 0; for (let i = 3; i < series.length; i++) { if (series[i].human === series[i - 1].human && series[i].human === series[i - 2].human && series[i].human > 0) frozen++; }

  const cells = [
    { tip: "freshness", cls: daysSince <= 1 ? "ok" : daysSince <= 2 ? "warn" : "bad", l: "Freshness", v: daysSince <= 0 ? "Today" : daysSince + "d ago", n: `Last Clarity export: ${latest || "—"}` },
    { tip: "rolling", cls: gaps(rdates) === 0 ? "ok" : "warn", l: "Rolling coverage", v: `${rdates.length} days`, n: `${gaps(rdates)} calendar gap(s) in the 3-day series` },
    { tip: "perurl", cls: gaps(udates) <= 1 ? "warn" : "bad", l: "Per-URL coverage", v: `${udates.length} days`, n: `${gaps(udates)} gap(s) · powers Community + Cowork` },
    { tip: "daily", cls: ddates.length >= 14 ? "ok" : "warn", l: "Daily series depth", v: `${ddates.length} days`, n: ddates.length < 14 ? "Too shallow for exact 7/14d yet — falls back to 3-day blocks" : "Deep enough for exact windows" },
    { tip: "corrupt", cls: corrupt === 0 ? "ok" : "warn", l: "Corrupt captures", v: fmt(corrupt), n: corrupt ? "Impossible (bots>total) — auto-stripped at load & write" : "None in stored series" },
    { tip: "urlbot", cls: urlCorrupt === 0 ? "ok" : "warn", l: "Per-URL bot rows", v: fmt(urlCorrupt), n: "Rows where bots>sessions — clamped, not summed" },
    { tip: "devleak", cls: devLeak === 0 ? "ok" : "warn", l: "Dev-traffic leakage", v: fmt(devLeak), n: devLeak ? "localhost / staging URLs in per-URL data — filtered from KPIs" : "Clean" },
    { tip: "frozen", cls: frozen === 0 ? "ok" : "warn", l: "Frozen values", v: fmt(frozen), n: frozen ? "Repeated identical days — possible stale capture" : "No stuck values" },
  ];
  grid.innerHTML = cells.map((c) => `<div class="hcell ${c.cls}" data-tip="health:${c.tip}"><div class="hl">${c.l}</div><div class="hv">${c.v}</div><div class="hn">${c.n}</div></div>`).join("");
}

// ================= boot =================
let SERIES = [];
function renderAll() {
  const site = RAW.sites[SITEKEY];
  if (!site) { document.getElementById("lab-src").textContent = "No data for this site."; return; }
  const series = buildSeries(site);
  SERIES = series;
  const latest = series.length ? series[series.length - 1].day : "—";
  document.getElementById("lab-src").innerHTML = `Live from Microsoft Clarity · project <code>${esc(site.projectId || "—")}</code> · ${series.length} clean daily points · latest ${latest}`;
  // reset the deep-dive box when the dataset changes
  const dbox = document.getElementById("detail-box");
  if (dbox) dbox.innerHTML = `<div class="detail-empty">Click a KPI or friction card above to open its deep dive here.</div>`;
  LAST_CARD = null;
  renderScorecards(series);
  renderAnomaly(series);
  renderImpactEvents(series);
  renderSignals(series);
  renderMovers();
  renderBot(series);
  renderFriction(series);
  renderReferrers();
  renderHealth(series);
}

function boot() {
  registerTips();
  initTooltips();
  initDetailClicks();
  document.querySelectorAll("#site-switch button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#site-switch button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true"); SITEKEY = b.dataset.site; renderAll();
  }));
  document.querySelectorAll("#win-toggle button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll("#win-toggle button").forEach((x) => x.setAttribute("aria-pressed", "false"));
    b.setAttribute("aria-pressed", "true"); WINDOW = parseInt(b.dataset.win, 10) || 14;
    renderAll();
    // keep an open deep-dive in sync with the new window
    const open = document.querySelector("#detail-box .detail-head h3");
    if (open) { const key = Object.keys(METRICS).find((k) => METRICS[k].label === open.textContent); if (key) renderDetail(key); }
  }));
  SITEKEY = qp("site") || "analytics-hub";
  const qw = parseInt(qp("win"), 10); if ([3, 7, 14, 30].includes(qw)) { WINDOW = qw; document.querySelectorAll("#win-toggle button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.win == String(qw) ? "true" : "false")); }
  renderAll();
  let t; window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(renderAll, 200); });
}

const EVENTS_URL = "events.json";
Promise.all([
  fetch(DATA_URL, { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
  fetch(EVENTS_URL, { cache: "no-store" }).then((r) => r.ok ? r.json() : null).catch(() => null),
]).then(([d, ev]) => {
  if (ev && Array.isArray(ev.events)) EVENTS = ev.events;
  if (d) { RAW = d; boot(); }
  else document.getElementById("lab-src").textContent = "Could not load data.";
});
