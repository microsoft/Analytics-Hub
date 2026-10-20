/* Traction Report. Reads ../data/traffic-history.json (Analytics Hub site only).
   Human sessions = total minus bot. Snapshot keys are the morning after the traffic,
   so each key is shifted back one day to the day it describes. */
(function () {
  "use strict";
  const DATA_URL = "../data/traffic-history.json";
  const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const avg = (a) => (a.length ? sum(a) / a.length : 0);
  const dow = (d) => new Date(d + "T12:00:00Z").getUTCDay();
  const shift = (iso, n) => { const x = new Date(iso + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const pct = (a, b) => ((a - b) / b) * 100;

  function rowsFrom(site) {
    const snaps = site.dailySnapshots || {};
    return Object.keys(snaps).sort().map((key) => {
      const m = (snaps[key] || []).find((x) => x.metricName === "Traffic");
      const t = m && m.information && m.information[0];
      if (!t) return null;
      return { date: shift(key, -1), total: t.totalSessionCount, bot: t.totalBotSessionCount || 0, sessions: t.totalSessionCount - (t.totalBotSessionCount || 0), users: t.distinctUserCount };
    }).filter((r) => r && r.bot <= r.total);
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

  function render(rows) {
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
    const d7 = pct(l7s, p7s);
    const two = wk.length >= 3 ? ` and <b>${pct(wk[wk.length - 1].s, wk[wk.length - 3].s).toFixed(0)}%</b> above two weeks earlier` : "";

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
<h2 class="tr-h">Week by week</h2><p class="tr-sub">Complete Monday to Sunday weeks only.</p>
<div class="tr-card"><table class="tr-wk">${wkRows}</table></div>
<h2 class="tr-h">Weekday pattern</h2><p class="tr-sub">Average per day of the week. Traffic is concentrated Monday to Friday, with ${best.n} strongest.</p>
<div class="tr-two"><div class="tr-card"><b style="font-size:.85rem">Avg human sessions</b>${barChart(byDow, "s", "#0078d4", "Average sessions by weekday")}</div><div class="tr-card"><b style="font-size:.85rem">Avg distinct users</b>${barChart(byDow, "u", "#8764b8", "Average distinct users by weekday")}</div></div>
<h2 class="tr-h">Distinct users</h2><p class="tr-sub">The last 7 days averaged <b>${fmt(avg(l7.map((r) => r.users)))}</b> distinct users per day and a weekday averages <b>${fmt(wdU)}</b>, with a best day of <b>${fmt(peakU.users)}</b> (${peakU.date}).</p>
<p class="tr-note">Clarity counts distinct users per day. They cannot be added across days, because the same person can appear on several days. Treat them as daily reach, not total unique people.</p>
<p class="tr-note" style="margin-top:1.6rem">Human sessions = Clarity total sessions minus Clarity bot sessions. Rows where the bot count exceeds the total (an early multi-day backfill) are excluded.</p>`;
  }

  fetch(DATA_URL).then((r) => r.json()).then((j) => {
    const site = (j.sites && j.sites["analytics-hub"]) || {};
    const rows = rowsFrom(site);
    if (rows.length < 8) throw new Error("not enough data");
    render(rows);
  }).catch(() => { document.getElementById("tr-meta").textContent = "Traffic data could not be loaded."; });
})();
