/* Traction Report. Reads ../data/traffic-history.json (Analytics Hub site only).
   Human sessions = total minus bot. Snapshot keys are the morning after the traffic,
   so each key is shifted back one day to the day it describes. */
(function () {
  "use strict";
  const DATA_URL = "../data/traffic-history.json";
  const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const fmtSigned = (n) => `${n >= 0 ? "+" : ""}${fmt(n)}`;
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const avg = (a) => (a.length ? sum(a) / a.length : 0);
  const dow = (d) => new Date(d + "T12:00:00Z").getUTCDay();
  const shift = (iso, n) => { const x = new Date(iso + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const pct = (a, b) => ((a - b) / b) * 100;
  const pctSafe = (a, b) => (b ? ((a - b) / b) * 100 : null);
  const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
  const INTERNAL_REFERRER_HOSTS = ["microsoft.github.io", "github.com", "githubusercontent.com", "github.io"];

  function metricRows(metrics, name) {
    const m = (metrics || []).find((x) => x.metricName === name);
    return (m && m.information) || [];
  }

  function trafficFromMetrics(metrics) {
    const t = metricRows(metrics, "Traffic")[0];
    if (!t) return null;
    const total = n(t.totalSessionCount);
    const bot = n(t.totalBotSessionCount);
    if (!Number.isFinite(total) || bot > total) return null;
    return {
      total,
      bot,
      human: total - bot,
      users: n(t.distinctUserCount),
    };
  }

  function isInternalReferrer(ref) {
    let host = String(ref || "");
    try { host = new URL(host).hostname; } catch (_) {}
    host = host.toLowerCase();
    if (!host) return false;
    return INTERNAL_REFERRER_HOSTS.some((h) => host === h || host.endsWith("." + h) || host.includes(h));
  }

  function canonicalReferrer(ref) {
    let host = String(ref || "").trim().toLowerCase();
    if (!host) return "";
    try { host = new URL(host).hostname.toLowerCase(); } catch (_) {
      host = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    }
    return host;
  }

  function rowsFrom(site) {
    const snaps = site.dailySnapshots || {};
    return Object.keys(snaps).sort().map((key) => {
      const t = trafficFromMetrics(snaps[key] || []);
      if (!t) return null;
      return { date: shift(key, -1), total: t.total, bot: t.bot, sessions: t.human, users: t.users };
    }).filter(Boolean);
  }

  function lineChart(rows) {
    const W = 920, H = 300, L = 48, R = 16, T = 16, B = 34;
    const max = Math.ceil(Math.max(...rows.map((r) => r.sessions)) / 200) * 200;
    const x = (i) => L + (i * (W - L - R)) / (rows.length - 1);
    const y = (v) => T + (H - T - B) * (1 - v / max);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily human sessions and distinct users"><g class="tr-grid">`;
    for (let v = 0; v <= max; v += 200) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" class="tr-ax">${v}</text>`;
    s += "</g>";
    const step = Math.max(1, Math.round(rows.length / 8));
    rows.forEach((r, i) => { if (i % step === 0 || i === rows.length - 1) s += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" class="tr-ax">${r.date.slice(5)}</text>`; });
    rows.forEach((r, i) => { if (dow(r.date) === 0 || dow(r.date) === 6) s += `<rect x="${x(i) - 5}" y="${T}" width="10" height="${H - T - B}" class="tr-wkend"/>`; });
    const ma = rows.map((_, i) => (i < 6 ? null : avg(rows.slice(i - 6, i + 1).map((r) => r.sessions))));
    const pts = (f) => rows.map((r, i) => f(r, i)).filter(Boolean).join(" ");
    s += `<polyline class="tr-ln u" points="${pts((r, i) => `${x(i)},${y(r.users)}`)}"/>`;
    s += `<polyline class="tr-ln s" points="${pts((r, i) => `${x(i)},${y(r.sessions)}`)}"/>`;
    s += `<polyline class="tr-ln m" points="${pts((r, i) => (ma[i] == null ? "" : `${x(i)},${y(ma[i])}`))}"/>`;
    rows.forEach((r, i) => { s += `<circle cx="${x(i)}" cy="${y(r.sessions)}" r="2.5" fill="#0078d4"><title>${r.date}: ${r.sessions} sessions, ${r.users} users</title></circle>`; });
    return s + "</svg>";
  }

  function barChart(byDow, key, color, label) {
    const W = 440, H = 220, L = 40, T = 24, B = 28;
    const max = Math.ceil(Math.max(...byDow.map((d) => d[key])) / 100) * 100;
    const bw = (W - L - 10) / byDow.length;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}"><g class="tr-grid">`;
    for (let v = 0; v <= max; v += max / 4) { const yy = T + (H - T - B) * (1 - v / max); s += `<line x1="${L}" x2="${W - 10}" y1="${yy}" y2="${yy}"/><text x="${L - 6}" y="${yy + 4}" text-anchor="end" class="tr-ax">${Math.round(v)}</text>`; }
    s += "</g>";
    byDow.forEach((d, i) => {
      const h = ((H - T - B) * d[key]) / max, bx = L + i * bw + 6, we = d.n === "Sat" || d.n === "Sun";
      s += `<rect x="${bx}" y="${H - B - h}" width="${bw - 12}" height="${h}" rx="4" fill="${color}" opacity="${we ? 0.4 : 1}"/><text x="${bx + (bw - 12) / 2}" y="${H - B - h - 6}" text-anchor="middle" class="tr-val">${Math.round(d[key])}</text><text x="${bx + (bw - 12) / 2}" y="${H - 9}" text-anchor="middle" class="tr-ax">${d.n}</text>`;
    });
    return s + "</svg>";
  }

  function sumRange(series, start, end, field) {
    let out = 0;
    for (let d = start; d <= end; d = shift(d, 1)) out += Number((series[d] || {})[field] || 0);
    return out;
  }

  function repoVolatility(repos) {
    const names = Object.keys(repos || {});
    let latest = null;
    names.forEach((name) => {
      const days = Object.keys((repos[name] || {}).dailyViews || {}).sort();
      if (!days.length) return;
      const d = days[days.length - 1];
      if (!latest || d > latest) latest = d;
    });
    if (!latest) return null;

    const curStart = shift(latest, -13);
    const prevEnd = shift(curStart, -1);
    const prevStart = shift(prevEnd, -13);

    const rows = [];
    names.forEach((name) => {
      const repo = repos[name] || {};
      const views = repo.dailyViews || {};
      const clones = repo.dailyClones || {};
      const curViews = sumRange(views, curStart, latest, "count");
      const prevViews = sumRange(views, prevStart, prevEnd, "count");
      const curClones = sumRange(clones, curStart, latest, "count");
      const prevClones = sumRange(clones, prevStart, prevEnd, "count");
      if (curViews === 0 && prevViews === 0 && curClones === 0 && prevClones === 0) return;
      rows.push({
        name,
        curViews,
        prevViews,
        viewDelta: curViews - prevViews,
        viewDeltaPct: pctSafe(curViews, prevViews),
        curClones,
        prevClones,
        cloneDelta: curClones - prevClones,
      });
    });

    rows.sort((a, b) => Math.abs(b.viewDelta) - Math.abs(a.viewDelta));
    return {
      latest,
      curStart,
      prevStart,
      prevEnd,
      rows,
      totalCurViews: sum(rows.map((r) => r.curViews)),
      totalPrevViews: sum(rows.map((r) => r.prevViews)),
      totalCurClones: sum(rows.map((r) => r.curClones)),
      totalPrevClones: sum(rows.map((r) => r.prevClones)),
    };
  }

  function repoVolatilitySection(vol) {
    if (!vol || !vol.rows.length) return "";
    const totalDelta = vol.totalCurViews - vol.totalPrevViews;
    const totalPct = pctSafe(vol.totalCurViews, vol.totalPrevViews);
    const topDown = vol.rows.slice().sort((a, b) => a.viewDelta - b.viewDelta).slice(0, 3).filter((r) => r.viewDelta < 0);
    const topUp = vol.rows.slice().sort((a, b) => b.viewDelta - a.viewDelta).slice(0, 3).filter((r) => r.viewDelta > 0);
    const drivers = [...topDown, ...topUp];
    const tableRows = (drivers.length ? drivers : vol.rows.slice(0, 8)).map((r) => `
      <tr>
        <td>${r.name}</td>
        <td class="n">${fmt(r.curViews)}</td>
        <td class="n">${fmt(r.prevViews)}</td>
        <td class="n ${r.viewDelta >= 0 ? "up" : "dn"}">${fmtSigned(r.viewDelta)}</td>
        <td class="n ${r.viewDelta >= 0 ? "up" : "dn"}">${r.viewDeltaPct == null ? "—" : `${r.viewDeltaPct >= 0 ? "+" : ""}${r.viewDeltaPct.toFixed(1)}%`}</td>
        <td class="n">${fmt(r.curClones)}</td>
      </tr>`).join("");

    return `
<h2 class="tr-h">Where the volatility is coming from (GitHub repos)</h2>
<p class="tr-sub">Biweekly comparison from repo traffic data. Current window is ${vol.curStart} to ${vol.latest}; previous is ${vol.prevStart} to ${vol.prevEnd}.</p>
<div class="tr-card">
  <table class="tr-wk tr-tbl">
    <thead><tr><th>Period</th><th class="n">Repo views</th><th class="n">Repo clones</th><th class="n">View change</th></tr></thead>
    <tbody>
      <tr><td>Current 14 days</td><td class="n">${fmt(vol.totalCurViews)}</td><td class="n">${fmt(vol.totalCurClones)}</td><td class="n ${totalDelta >= 0 ? "up" : "dn"}">${fmtSigned(totalDelta)} ${totalPct == null ? "" : `(${totalPct >= 0 ? "+" : ""}${totalPct.toFixed(1)}%)`}</td></tr>
      <tr><td>Previous 14 days</td><td class="n">${fmt(vol.totalPrevViews)}</td><td class="n">${fmt(vol.totalPrevClones)}</td><td class="n">—</td></tr>
    </tbody>
  </table>
</div>
<div class="tr-card" style="margin-top:.8rem">
  <table class="tr-wk tr-tbl">
    <thead><tr><th>Repo</th><th class="n">Views (cur 14d)</th><th class="n">Views (prev 14d)</th><th class="n">Change</th><th class="n">Change %</th><th class="n">Clones (cur 14d)</th></tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</div>
<p class="tr-note">This attributes swings by repo first. Next layer for root-cause is referrer and path shifts inside the top movers.</p>`;
  }

  function buildCausalDrivers(site, rows, events) {
    if (!rows.length) return null;
    const latest = rows[rows.length - 1].date;
    const days = 14;
    const curStart = shift(latest, -(days - 1));
    const prevEnd = shift(curStart, -1);
    const prevStart = shift(prevEnd, -(days - 1));
    const snaps = site.dailySnapshots || {};
    const byDate = {};
    Object.keys(snaps).forEach((key) => {
      const d = shift(key, -1);
      const t = trafficFromMetrics(snaps[key] || []);
      if (t) byDate[d] = snaps[key];
    });

    function forEachDay(start, end, cb) {
      for (let d = start; d <= end; d = shift(d, 1)) if (byDate[d]) cb(d, byDate[d]);
    }
    function aggMap(start, end, metricName, keyField, filterFn, normalizeKey) {
      const out = new Map();
      forEachDay(start, end, (_d, metrics) => {
        metricRows(metrics, metricName).forEach((r) => {
          let k = String(r[keyField] || "").trim();
          if (normalizeKey) k = normalizeKey(k);
          if (!k) return;
          if (filterFn && !filterFn(k)) return;
          const v = n(r.sessionsCount || r.visitsCount || 0);
          out.set(k, (out.get(k) || 0) + v);
        });
      });
      return out;
    }
    function deltaRows(curMap, prevMap, label) {
      const keys = new Set([...curMap.keys(), ...prevMap.keys()]);
      return [...keys].map((k) => {
        const cur = curMap.get(k) || 0;
        const prev = prevMap.get(k) || 0;
        const delta = cur - prev;
        return { key: k, cur, prev, delta, pct: pctSafe(cur, prev), label };
      }).filter((r) => r.cur || r.prev).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    }

    const refCur = aggMap(curStart, latest, "ReferrerUrl", "name", (k) => !isInternalReferrer(k), canonicalReferrer);
    const refPrev = aggMap(prevStart, prevEnd, "ReferrerUrl", "name", (k) => !isInternalReferrer(k), canonicalReferrer);
    const pageCur = aggMap(curStart, latest, "PopularPages", "url");
    const pagePrev = aggMap(prevStart, prevEnd, "PopularPages", "url");

    function avgRate(start, end, metricName, field) {
      const vals = [];
      forEachDay(start, end, (_d, metrics) => {
        const r = metricRows(metrics, metricName)[0];
        vals.push(n(r && r[field]));
      });
      return vals.length ? avg(vals) : 0;
    }
    const fr = [
      { name: "Bot share", cur: (function () { let bot = 0, total = 0; forEachDay(curStart, latest, (_d, m) => { const t = trafficFromMetrics(m); bot += t.bot; total += t.total; }); return total ? (bot / total) * 100 : 0; })(), prev: (function () { let bot = 0, total = 0; forEachDay(prevStart, prevEnd, (_d, m) => { const t = trafficFromMetrics(m); bot += t.bot; total += t.total; }); return total ? (bot / total) * 100 : 0; })() },
      { name: "Quick-backs", cur: avgRate(curStart, latest, "QuickbackClick", "sessionsWithMetricPercentage"), prev: avgRate(prevStart, prevEnd, "QuickbackClick", "sessionsWithMetricPercentage") },
      { name: "Dead clicks", cur: avgRate(curStart, latest, "DeadClickCount", "sessionsWithMetricPercentage"), prev: avgRate(prevStart, prevEnd, "DeadClickCount", "sessionsWithMetricPercentage") },
      { name: "Script errors", cur: avgRate(curStart, latest, "ScriptErrorCount", "sessionsWithMetricPercentage"), prev: avgRate(prevStart, prevEnd, "ScriptErrorCount", "sessionsWithMetricPercentage") },
    ].map((r) => ({ ...r, delta: r.cur - r.prev }));

    const ev = Array.isArray(events) ? events : [];
    const inRange = (d, s, e) => d >= s && d <= e;
    const evCur = ev.filter((x) => inRange(String(x.date || "").slice(0, 10), curStart, latest));
    const evPrev = ev.filter((x) => inRange(String(x.date || "").slice(0, 10), prevStart, prevEnd));
    const attendees = (arr) => arr.reduce((s, x) => s + n(x.attendees), 0);

    return {
      latest, curStart, prevStart, prevEnd,
      ref: deltaRows(refCur, refPrev, "referrer"),
      pages: deltaRows(pageCur, pagePrev, "page"),
      friction: fr,
      events: {
        curCount: evCur.length,
        prevCount: evPrev.length,
        curAttendees: attendees(evCur),
        prevAttendees: attendees(evPrev),
      },
    };
  }

  function causalSection(c) {
    if (!c) return "";
    const top = (rows) => rows.slice(0, 8).map((r) => `
      <tr>
        <td>${r.key}</td>
        <td class="n">${fmt(r.cur)}</td>
        <td class="n">${fmt(r.prev)}</td>
        <td class="n ${r.delta >= 0 ? "up" : "dn"}">${fmtSigned(r.delta)}</td>
        <td class="n ${r.delta >= 0 ? "up" : "dn"}">${r.pct == null ? "—" : `${r.pct >= 0 ? "+" : ""}${r.pct.toFixed(1)}%`}</td>
      </tr>`).join("");

    const frRows = c.friction.map((r) => `
      <tr>
        <td>${r.name}</td>
        <td class="n">${r.cur.toFixed(2)}%</td>
        <td class="n">${r.prev.toFixed(2)}%</td>
        <td class="n ${r.delta <= 0 ? "up" : "dn"}">${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(2)}pp</td>
      </tr>`).join("");

    const evDelta = c.events.curAttendees - c.events.prevAttendees;
    const evCntDelta = c.events.curCount - c.events.prevCount;

    return `
<h2 class="tr-h">Causal impact signals: why spikes and drops happen</h2>
<p class="tr-sub">Current window ${c.curStart} to ${c.latest} compared with previous ${c.prevStart} to ${c.prevEnd}. These are directional drivers, not strict proof.</p>
<div class="tr-card">
  <table class="tr-wk tr-tbl">
    <thead><tr><th>Cadence signal</th><th class="n">Current 14d</th><th class="n">Previous 14d</th><th class="n">Delta</th></tr></thead>
    <tbody>
      <tr><td>Enablement events logged</td><td class="n">${fmt(c.events.curCount)}</td><td class="n">${fmt(c.events.prevCount)}</td><td class="n ${evCntDelta >= 0 ? "up" : "dn"}">${fmtSigned(evCntDelta)}</td></tr>
      <tr><td>Total attendees across logged events</td><td class="n">${fmt(c.events.curAttendees)}</td><td class="n">${fmt(c.events.prevAttendees)}</td><td class="n ${evDelta >= 0 ? "up" : "dn"}">${fmtSigned(evDelta)}</td></tr>
    </tbody>
  </table>
</div>
<h3 class="tr-h3">External referrer movers</h3>
<div class="tr-card"><table class="tr-wk tr-tbl"><thead><tr><th>Referrer</th><th class="n">Current</th><th class="n">Previous</th><th class="n">Change</th><th class="n">Change %</th></tr></thead><tbody>${top(c.ref)}</tbody></table></div>
<h3 class="tr-h3">Landing-page movers</h3>
<div class="tr-card"><table class="tr-wk tr-tbl"><thead><tr><th>Page URL</th><th class="n">Current</th><th class="n">Previous</th><th class="n">Change</th><th class="n">Change %</th></tr></thead><tbody>${top(c.pages)}</tbody></table></div>
<h3 class="tr-h3">Friction and quality shifts</h3>
<div class="tr-card"><table class="tr-wk tr-tbl"><thead><tr><th>Signal</th><th class="n">Current</th><th class="n">Previous</th><th class="n">Change</th></tr></thead><tbody>${frRows}</tbody></table></div>`;
  }


  /* Full-history averages. Exact daily rows cover the recent period; earlier history is
     3-day rolling windows (key K covers actual days K-3..K-1), spread evenly across the
     days each window covers and averaged where windows overlap. */
  function buildHistory(site, exactRows) {
    const firstExact = exactRows[0].date;
    const est = {};
    const snaps = site.snapshots || {};
    Object.keys(snaps).sort().forEach((key) => {
      const m = (snaps[key] || []).find((x) => x.metricName === "Traffic");
      const t = m && m.information && m.information[0];
      if (!t) return;
      const tot = Number(t.totalSessionCount), bot = Number(t.totalBotSessionCount || 0);
      if (!Number.isFinite(tot) || bot > tot) return;
      const per = (tot - bot) / 3;
      if (per < 0) return;
      for (let n = 1; n <= 3; n++) { const d = shift(key, -n); if (d < firstExact) (est[d] = est[d] || []).push(per); }
    });
    const days = Object.keys(est).sort().map((d) => ({ date: d, h: avg(est[d]), exact: false }));
    exactRows.forEach((r) => days.push({ date: r.date, h: r.sessions, exact: true, u: r.users }));
    return days;
  }

  function historyTables(days) {
    const first = days[0].date, last = days[days.length - 1].date;
    const dim = (ym) => new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7), 0)).getUTCDate();
    const months = {};
    days.forEach((d) => (months[d.date.slice(0, 7)] = months[d.date.slice(0, 7)] || []).push(d));
    const basis = (a) => { const e = a.filter((x) => x.exact).length; return e === a.length ? "Exact" : e === 0 ? "Estimated" : "Mixed"; };
    const monthRows = Object.keys(months).sort().map((ym) => {
      const a = months[ym], av = avg(a.map((x) => x.h));
      const full = ym + "-01" >= first.slice(0, 7) + "-01" && shift(ym + "-" + String(dim(ym)).padStart(2, "0"), 0) <= last && first <= ym + "-01";
      return { ym, n: a.length, cal: dim(ym), av, wk: av * 7, tot: av * a.length, full, basis: basis(a) };
    });
    const completeMonths = monthRows.filter((m) => m.full);
    const weeks = {};
    days.forEach((d) => { const dt = new Date(d.date + "T12:00:00Z"); dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); const k = dt.toISOString().slice(0, 10); (weeks[k] = weeks[k] || []).push(d); });
    const weekRows = Object.keys(weeks).sort().map((k) => { const a = weeks[k]; return { k, n: a.length, av: avg(a.map((x) => x.h)), basis: basis(a) }; }).filter((w) => w.n >= 4);
    const overall = avg(days.map((d) => d.h));
    const lastN = (n) => avg(days.slice(-n).map((d) => d.h));
    const sumRows = [
      ["All data (" + first.slice(5) + " to " + last.slice(5) + ")", overall, overall * 7, overall * 30.4],
      ["Last 30 days", lastN(30), lastN(30) * 7, lastN(30) * 30.4],
      ["Last 7 days", lastN(7), lastN(7) * 7, lastN(7) * 30.4],
    ];
    if (completeMonths.length) { const mav = avg(completeMonths.map((m) => m.av)); sumRows.splice(1, 0, ["Average full month (" + completeMonths.length + " months)", mav, mav * 7, avg(completeMonths.map((m) => m.tot / m.n * m.cal))]); }
    const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const td = (v) => `<td class="n">${fmt(v)}</td>`;
    return `
<h2 class="tr-h">Average traffic: per day, per week, per month</h2>
<p class="tr-sub">Human sessions across all data collected so far, ${first} to ${last}.</p>
<div class="tr-card"><table class="tr-wk tr-tbl"><thead><tr><th>Period</th><th class="n">Per day</th><th class="n">Per week</th><th class="n">Per month</th></tr></thead><tbody>${sumRows.map((r) => `<tr><td>${r[0]}</td>${td(r[1])}${td(r[2])}${td(r[3])}</tr>`).join("")}</tbody></table></div>
<h3 class="tr-h3">By month</h3>
<div class="tr-card"><table class="tr-wk tr-tbl"><thead><tr><th>Month</th><th class="n">Days covered</th><th class="n">Avg per day</th><th class="n">Avg per week</th><th class="n">Total sessions</th><th>Basis</th></tr></thead><tbody>${monthRows.map((m) => `<tr><td>${MN[+m.ym.slice(5) - 1]} ${m.ym.slice(0, 4)}${m.full ? "" : " (partial)"}</td><td class="n">${m.n}${m.n < m.cal && m.full ? " of " + m.cal : ""}</td>${td(m.av)}${td(m.wk)}<td class="n">${m.full && m.n < m.cal ? "~" + fmt(m.av * m.cal) : fmt(m.tot)}</td><td>${m.basis}</td></tr>`).join("")}</tbody></table></div>
<h3 class="tr-h3">By week</h3>
<details class="tr-card"><summary style="cursor:pointer;font-weight:600">Show all ${weekRows.length} weeks</summary><table class="tr-wk tr-tbl" style="margin-top:.6rem"><thead><tr><th>Week of</th><th class="n">Days covered</th><th class="n">Avg per day</th><th class="n">Week total</th><th>Basis</th></tr></thead><tbody>${weekRows.map((w) => `<tr><td>${w.k}</td><td class="n">${w.n}</td>${td(w.av)}${td(w.av * 7)}<td>${w.basis}</td></tr>`).join("")}</tbody></table></details>
<p class="tr-note">Exact = one Clarity snapshot per day (from Sep 18). Estimated = earlier history, stored as overlapping 3-day windows, spread evenly across the days each covers; real single days will be spikier. Gaps in collection (Jul 1 to 5, Jul 24 to 26, Aug 5 to 11) are not filled in, so those days are excluded and the averages describe the days we have. Totals marked ~ are the average scaled to the full month.</p>`;
  }
  function render(rows, site, repos, events) {
    const first = rows[0].date, last = rows[rows.length - 1].date;
    const l7 = rows.slice(-7), p7 = rows.slice(-14, -7);
    const l7s = sum(l7.map((r) => r.sessions)), p7s = sum(p7.map((r) => r.sessions));
    const wd = rows.filter((r) => dow(r.date) >= 1 && dow(r.date) <= 5), we = rows.filter((r) => dow(r.date) === 0 || dow(r.date) === 6);
    const wdS = avg(wd.map((r) => r.sessions)), wdU = avg(wd.map((r) => r.users)), weS = avg(we.map((r) => r.sessions));
    const byDow = [1, 2, 3, 4, 5, 6, 0].map((d) => { const a = rows.filter((r) => dow(r.date) === d); return { n: NAMES[d], s: avg(a.map((r) => r.sessions)), u: avg(a.map((r) => r.users)) }; });
    const peak = rows.reduce((a, b) => (b.sessions > a.sessions ? b : a));
    const peakU = rows.reduce((a, b) => (b.users > a.users ? b : a));
    const best = byDow.slice(0, 5).reduce((a, b) => (b.s > a.s ? b : a));
    const weeks = {};
    rows.forEach((r) => { const dt = new Date(r.date + "T12:00:00Z"); dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7)); (weeks[dt.toISOString().slice(0, 10)] = weeks[dt.toISOString().slice(0, 10)] || []).push(r); });
    const wk = Object.keys(weeks).sort().map((k) => ({ start: k, days: weeks[k].length, s: sum(weeks[k].map((r) => r.sessions)) })).filter((w) => w.days === 7);
    const wkMax = Math.max(...wk.map((w) => w.s));
    const wkRows = wk.map((w, i) => { const c = i ? pct(w.s, wk[i - 1].s) : null; return `<tr><td>Week of ${w.start.slice(5)}</td><td class="n">${fmt(w.s)}</td><td class="bar"><span style="width:${((w.s / wkMax) * 100).toFixed(0)}%"></span></td><td class="n ${c == null ? "" : c >= 0 ? "up" : "dn"}">${c == null ? "" : (c >= 0 ? "+" : "") + c.toFixed(1) + "%"}</td></tr>`; }).join("");
    const d7 = p7s ? pct(l7s, p7s) : 0;
    const two = wk.length >= 3 ? ` and <b>${pct(wk[wk.length - 1].s, wk[wk.length - 3].s).toFixed(0)}%</b> above two weeks earlier` : "";
    const causal = buildCausalDrivers(site, rows, events);

    document.getElementById("tr-meta").textContent = `Data ${first} to ${last} · Microsoft Clarity daily snapshots · human sessions only`;
    document.getElementById("tr-body").innerHTML = `
<div class="tr-callout"><h2>Bottom line</h2><p>The Hub served <b>${fmt(l7s)}</b> human sessions in the last 7 days, <b>${d7 >= 0 ? "up" : "down"} ${Math.abs(d7).toFixed(1)}%</b> on the week before${two}. It is a weekday audience: a typical weekday brings about <b>${fmt(wdS)}</b> sessions and <b>${fmt(wdU)}</b> distinct users, versus <b>${fmt(weS)}</b> sessions on a weekend day.</p></div>
<div class="tr-kpis">
<div class="tr-kpi"><span>Human sessions, last 7 days</span><b>${fmt(l7s)}</b><em class="${d7 >= 0 ? "up" : "dn"}">${d7 >= 0 ? "+" : ""}${d7.toFixed(1)}% vs prior 7</em></div>
<div class="tr-kpi"><span>Distinct users, avg weekday</span><b>${fmt(wdU)}</b><em>per day</em></div>
<div class="tr-kpi"><span>Peak day</span><b>${fmt(peak.sessions)}</b><em>${peak.date.slice(5)} · best users day ${fmt(peakU.users)}</em></div>
<div class="tr-kpi"><span>Sessions since ${first.slice(5)}</span><b>${fmt(sum(rows.map((r) => r.sessions)))}</b><em>${rows.length} days tracked</em></div>
</div>
<h2 class="tr-h">Trend over time</h2><p class="tr-sub">Daily human sessions with a 7-day average. Shaded columns are weekends.</p>
<div class="tr-card">${lineChart(rows)}<div class="tr-legend"><span><i></i>Sessions (daily)</span><span><i style="height:4px"></i>7-day average</span><span><i style="background:#8764b8"></i>Distinct users (daily)</span></div></div>
${repoVolatilitySection(repoVolatility(repos))}
${causalSection(causal)}
<h2 class="tr-h">Week by week</h2><p class="tr-sub">Complete Monday to Sunday weeks only.</p>
<div class="tr-card"><table class="tr-wk">${wkRows}</table></div>
<h2 class="tr-h">Weekday pattern</h2><p class="tr-sub">Average per day of the week. Traffic is concentrated Monday to Friday, with ${best.n} strongest.</p>
<div class="tr-two"><div class="tr-card"><b style="font-size:.85rem">Avg human sessions</b>${barChart(byDow, "s", "#0078d4", "Average sessions by weekday")}</div><div class="tr-card"><b style="font-size:.85rem">Avg distinct users</b>${barChart(byDow, "u", "#8764b8", "Average distinct users by weekday")}</div></div>
<h2 class="tr-h">Distinct users</h2><p class="tr-sub">The last 7 days averaged <b>${fmt(avg(l7.map((r) => r.users)))}</b> distinct users per day and a weekday averages <b>${fmt(wdU)}</b>, with a best day of <b>${fmt(peakU.users)}</b> (${peakU.date}).</p>
<p class="tr-note">Clarity counts distinct users per day. They cannot be added across days, because the same person can appear on several days. Treat them as daily reach, not total unique people.</p>
${historyTables(buildHistory(site, rows))}<p class="tr-note" style="margin-top:1.6rem">Human sessions = Clarity total sessions minus Clarity bot sessions. Rows where the bot count exceeds the total (an early multi-day backfill) are excluded.</p>`;
  }

  Promise.all([
    fetch(DATA_URL).then((r) => r.json()),
    fetch("events.json").then((r) => (r.ok ? r.json() : [])).catch(() => []),
  ]).then(([j, events]) => {
    const site = (j.sites && j.sites["analytics-hub"]) || {};
    const rows = rowsFrom(site);
    if (rows.length < 8) throw new Error("not enough data");
    render(rows, site, j.repos || {}, events);
  }).catch(() => { document.getElementById("tr-meta").textContent = "Traffic data could not be loaded."; });
})();

