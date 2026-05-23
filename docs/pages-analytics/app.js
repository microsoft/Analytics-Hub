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

// ------------------------------------------------------------ utilities

const fmt = (n) => (n == null ? "—" : n.toLocaleString());

function sumViews(snapshots, key) {
  // GitHub /traffic/views returns { count, uniques, views: [{timestamp, count, uniques}, ...] }
  // Take the most recent snapshot's count (it already represents the 14-day rolling window).
  const dates = Object.keys(snapshots || {}).sort();
  if (!dates.length) return null;
  const latest = snapshots[dates[dates.length - 1]];
  return latest?.[key]?.count ?? null;
}

function uniques(snapshots, key) {
  const dates = Object.keys(snapshots || {}).sort();
  if (!dates.length) return null;
  const latest = snapshots[dates[dates.length - 1]];
  return latest?.[key]?.uniques ?? null;
}

function latestSnapshot(snapshots) {
  const dates = Object.keys(snapshots || {}).sort();
  if (!dates.length) return null;
  return snapshots[dates[dates.length - 1]];
}

function viewsTrend(snapshots) {
  // Array of per-day view counts across all snapshots we've recorded.
  const dates = Object.keys(snapshots || {}).sort();
  return dates
    .map((d) => snapshots[d]?.views?.count ?? null)
    .filter((v) => v != null);
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
  let stars = 0, forks = 0, watchers = 0, views = 0, clones = 0, count = 0;
  for (const repo of Object.values(repos)) {
    count += 1;
    const meta = repo.meta || {};
    stars    += meta.stars    || 0;
    forks    += meta.forks    || 0;
    watchers += meta.watchers || 0;
    const v = sumViews(repo.snapshots, "views");
    const c = sumViews(repo.snapshots, "clones");
    if (v != null) views  += v;
    if (c != null) clones += c;
  }
  document.querySelector('[data-kpi="stars"]').textContent    = fmt(stars);
  document.querySelector('[data-kpi="forks"]').textContent    = fmt(forks);
  document.querySelector('[data-kpi="watchers"]').textContent = fmt(watchers);
  document.querySelector('[data-kpi="views"]').textContent    = fmt(views);
  document.querySelector('[data-kpi="clones"]').textContent   = fmt(clones);
  document.querySelector('[data-kpi="repos"]').textContent    = fmt(count);
}

function rowsFromRepos(repos) {
  return Object.entries(repos).map(([fullName, repo]) => {
    const [owner, name] = fullName.split("/");
    const meta = repo.meta || {};
    const trend = viewsTrend(repo.snapshots);
    return {
      fullName,
      owner,
      name,
      stars:        meta.stars    ?? null,
      forks:        meta.forks    ?? null,
      watchers:     meta.watchers ?? null,
      views:        sumViews(repo.snapshots, "views"),
      uniqueViews:  uniques(repo.snapshots, "views"),
      clones:       sumViews(repo.snapshots, "clones"),
      uniqueClones: uniques(repo.snapshots, "clones"),
      trend,
      hasTraffic:   !!latestSnapshot(repo.snapshots),
      latest:       latestSnapshot(repo.snapshots),
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
    tbody.innerHTML = `<tr><td colspan="9" class="empty">No repos in history yet.</td></tr>`;
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
    return `
      <tr class="repo-row" data-idx="${i}">
        <td class="repo-name">
          <a href="https://github.com/${r.fullName}" target="_blank" rel="noopener">${r.name}</a>
          <span class="repo-owner">${r.owner}</span>${note}
        </td>
        <td class="num">${fmt(r.stars)}</td>
        <td class="num">${fmt(r.forks)}</td>
        <td class="num">${fmt(r.watchers)}</td>
        <td class="num">${fmt(r.views)}</td>
        <td class="num">${fmt(r.uniqueViews)}</td>
        <td class="num">${fmt(r.clones)}</td>
        <td class="num">${fmt(r.uniqueClones)}</td>
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
  tbody.querySelectorAll(".repo-row").forEach((row) => {
    row.addEventListener("click", () => {
      const idx = parseInt(row.dataset.idx, 10);
      const r = sorted[idx];
      const next = row.nextElementSibling;
      if (next && next.classList.contains("detail-row")) {
        next.remove();
        return;
      }
      // Close other open details
      tbody.querySelectorAll(".detail-row").forEach((d) => d.remove());
      const detail = document.createElement("tr");
      detail.className = "detail-row";
      detail.innerHTML = `<td colspan="9">${renderRepoDetail(r)}</td>`;
      row.parentNode.insertBefore(detail, row.nextSibling);
    });
  });
}

function renderRepoDetail(r) {
  const referrers = r.latest?.referrers ?? [];
  const paths     = r.latest?.paths     ?? [];

  const refList = referrers.length
    ? referrers.slice(0, 10).map(x =>
        `<li><span>${x.referrer}</span><span>${fmt(x.count)}</span></li>`).join("")
    : `<li><span class="empty" style="padding:0">No referrer data</span></li>`;

  const pathList = paths.length
    ? paths.slice(0, 10).map(x =>
        `<li><span>${(x.title || x.path).slice(0, 60)}</span><span>${fmt(x.count)}</span></li>`).join("")
    : `<li><span class="empty" style="padding:0">No path data</span></li>`;

  return `
    <div class="detail-grid">
      <div>
        <h4>Top referrers (14d)</h4>
        <ul>${refList}</ul>
      </div>
      <div>
        <h4>Popular paths (14d)</h4>
        <ul>${pathList}</ul>
      </div>
    </div>
  `;
}

function renderRepoCards(rows) {
  const wrap = document.getElementById("repo-cards");
  if (!rows.length) {
    wrap.innerHTML = `<p class="empty">No repos in history yet.</p>`;
    return;
  }
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
        <span>Views: <strong>${fmt(r.views)}</strong> (${fmt(r.uniqueViews)} unique)</span>
      </div>
      <div class="meta-row">
        <span>Clones: <strong>${fmt(r.clones)}</strong> (${fmt(r.uniqueClones)} unique)</span>
      </div>
      <div class="sparkline-wrap">
        <div class="sparkline-label">Views over recorded snapshots</div>
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

  wrap.innerHTML = entries.map(([label, site]) => {
    const info  = KNOWN_LABELS[label] || { title: label, url: "" };
    const dates = Object.keys(site.snapshots || {}).sort();
    const latest = dates.length ? site.snapshots[dates[dates.length - 1]] : null;

    let metricsHtml = `<p class="empty" style="padding:0">No snapshot yet for this site.</p>`;
    if (latest) {
      // Clarity Data Export returns an array of {metricName, information: [{value, ...}]}
      const flat = Array.isArray(latest) ? latest : [];
      metricsHtml = `<div class="clarity-metrics">` +
        flat.slice(0, 8).map((m) => {
          const value = m.information?.[0]?.value
                      ?? m.information?.[0]?.totalSessionCount
                      ?? m.information?.[0]?.sessionsCount
                      ?? "—";
          return `
            <div class="clarity-metric">
              <div class="clarity-metric-label">${m.metricName || "metric"}</div>
              <div class="clarity-metric-value">${value}</div>
            </div>`;
        }).join("") +
        `</div>`;
    }

    return `
      <div class="site-card">
        <h3>${info.title}</h3>
        <span class="site-url">
          ${info.url ? `<a href="${info.url}" target="_blank" rel="noopener">${info.url}</a>` : ""}
          ${site.projectId ? ` · Clarity project <code>${site.projectId}</code>` : ""}
        </span>
        ${metricsHtml}
      </div>
    `;
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

  renderLastUpdated(history.lastUpdated);
  renderHero(history.repos || {});

  tableState.rows = rowsFromRepos(history.repos || {});
  renderTable();
  renderRepoCards(tableState.rows);
  renderSites(history.sites || {});

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
}

load();
