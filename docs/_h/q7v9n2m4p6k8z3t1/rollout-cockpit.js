(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const clone = value => structuredClone(value);
  const number = value => value === "" ? NaN : Number(value);
  const fmt = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
  const money = value => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
  const month = value => value == null ? "Not reached" : `Month ${value}`;
  const initial = {
    horizon: 12, currentMonth: 3,
    departments: [
      { name: "Department A", eligible: 1200, enabled: 400, active: 240, avgCredits: 25 },
      { name: "Department B", eligible: 800, enabled: 260, active: 150, avgCredits: 20 },
      { name: "Department C", eligible: 500, enabled: 160, active: 90, avgCredits: 30 }
    ],
    phases: [
      { startMonth: 1, label: "Foundation", userGrowth: .04, usageGrowth: .02, addedEnabled: 100, activationRate: .55 },
      { startMonth: 5, label: "Expansion", userGrowth: .06, usageGrowth: .03, addedEnabled: 300, activationRate: .6 },
      { startMonth: 9, label: "Optimize", userGrowth: .03, usageGrowth: .01, addedEnabled: 200, activationRate: .65 }
    ],
    paygRate: .01, prepaidRate: .008, prepaid: { mode: "pool", amount: 150000 },
    budget: 2400, checkpoints: [4, 8, 12]
  };
  let baseline = clone(initial);
  let alternative = clone(initial);
  let actuals = [];
  let results = null;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function clear(id) { $(id).replaceChildren(); }
  function message(text) {
    $("errors").textContent = text;
    $("errors").classList.toggle("hidden", !text);
  }
  function field(label, value, options = {}) {
    const wrapper = element("label", label, options.wide ? "wide" : "");
    const input = document.createElement(options.select ? "select" : "input");
    if (options.select) {
      options.select.forEach(([key, title]) => {
        const opt = element("option", title);
        opt.value = key;
        input.append(opt);
      });
    } else {
      input.type = options.type || "number";
      if (input.type === "number") input.step = "any";
      if (options.min !== undefined) input.min = options.min;
      if (options.max !== undefined) input.max = options.max;
    }
    input.value = value;
    input.dataset.field = options.field;
    wrapper.append(input);
    return wrapper;
  }
  function drawEditors() {
    const fields = $("plan-fields");
    fields.replaceChildren(
      field("Forecast horizon (months)", alternative.horizon, { field: "horizon", min: 1, max: 24 }),
      field("Current month (0 = before rollout)", alternative.currentMonth, { field: "currentMonth", min: 0, max: 24 }),
      field("Horizon budget (currency units)", alternative.budget, { field: "budget", min: 0 }),
      field("Checkpoints (months, comma-separated)", alternative.checkpoints.join(", "), { field: "checkpoints", type: "text" }),
      field("Prepaid mode", alternative.prepaid.mode, { field: "prepaid.mode", select: [["monthly", "Monthly allocation"], ["pool", "Total pool"]] }),
      field("Prepaid credits (per month or total)", alternative.prepaid.amount, { field: "prepaid.amount", min: 0 }),
      field("Prepaid rate / credit", alternative.prepaidRate, { field: "prepaidRate", min: 0 }),
      field("PAYG rate / credit", alternative.paygRate, { field: "paygRate", min: 0 })
    );
    drawRows("phase-rows", alternative.phases, "phase", [
      ["label", "text"], ["startMonth", "number"], ["userGrowth", "percent"],
      ["usageGrowth", "percent"], ["addedEnabled", "number"], ["activationRate", "percent"]
    ]);
    drawRows("department-rows", alternative.departments, "department", [
      ["name", "text"], ["eligible", "number"], ["enabled", "number"], ["active", "number"], ["avgCredits", "number"]
    ]);
  }
  function drawRows(id, rows, kind, columns) {
    const body = $(id);
    body.replaceChildren();
    rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      columns.forEach(([key, type]) => {
        const td = document.createElement("td");
        const input = document.createElement("input");
        input.type = type === "text" ? "text" : "number";
        if (input.type === "number") input.step = "any";
        input.value = type === "percent" ? Math.round(row[key] * 100000000) / 1000000 : row[key];
        input.dataset.kind = kind;
        input.dataset.index = index;
        input.dataset.key = key;
        input.dataset.percent = type === "percent" ? "yes" : "no";
        input.setAttribute("aria-label", `${kind} ${index + 1} ${key}`);
        if (type === "text") input.maxLength = 160;
        td.append(input); tr.append(td);
      });
      const td = document.createElement("td");
      const button = element("button", "Remove");
      button.type = "button";
      button.dataset.remove = kind;
      button.dataset.index = index;
      button.setAttribute("aria-label", `Remove ${kind} ${index + 1}`);
      td.append(button); tr.append(td); body.append(tr);
    });
  }
  function enginePlan(plan) {
    const result = clone(plan);
    result.phases.forEach((phase, index) => {
      if (typeof phase.label === "string" && !phase.label.trim()) phase.label = `Phase ${index + 1}`;
    });
    return result;
  }
  function render() {
    let errors = [];
    try {
      const bp = enginePlan(baseline), ap = enginePlan(alternative);
      errors = [
        ...ForecastEngine.validatePlan(bp).map(e => `Baseline: ${e}`),
        ...ForecastEngine.validatePlan(ap).map(e => `Alternative: ${e}`)
      ];
      if (actuals.some(row => row.month > ap.horizon)) errors.push("Imported actuals extend beyond the alternative horizon. Restore the horizon or clear actuals.");
      if (!errors.length) results = { baseline: ForecastEngine.forecast(bp), alternative: ForecastEngine.forecast(ap) };
    } catch (error) { errors.push(error.message); }
    message(errors.join("\n"));
    $("snapshot").disabled = !!errors.length;
    $("export-csv").disabled = !!errors.length;
    if (errors.length) {
      results = null;
      ["scenario-cards", "trend-chart", "monthly-table", "range-output", "department-totals", "waterfall", "checkpoint-copy", "capacity-notes"].forEach(clear);
      $("checkpoint-title").textContent = "Correct the assumptions to see the forecast";
      return;
    }
    drawCards(); drawTrend(); drawMonthly(); drawCheckpoint(); drawRange(); drawDepartmentTotals(); drawWaterfall(); drawCapacityNotes();
  }
  function metric(container, label, value, negative) {
    const item = element("div");
    item.append(element("div", label, "metric-label"), element("div", value, `metric-value${negative ? " negative" : ""}`));
    container.append(item);
  }
  function drawCards() {
    const container = $("scenario-cards");
    container.replaceChildren();
    [["Baseline", baseline, results.baseline], ["Alternative", alternative, results.alternative]].forEach(([name, plan, result]) => {
      const t = result.totals;
      const card = element("div", undefined, `card scenario-card${name === "Alternative" ? " alternative" : ""}`);
      const heading = element("div", undefined, "scenario-title");
      const title = element("div"); title.append(element("div", name, "eyebrow"), element("h3", `${plan.horizon}-month forecast`));
      heading.append(title, element("span", name === "Baseline" ? "Saved snapshot" : "Editable", "badge"));
      card.append(heading);
      const metrics = element("div", undefined, "metrics");
      const full = t.credits * plan.paygRate, saving = full - t.cost;
      metric(metrics, "Cumulative credits", fmt(t.credits));
      metric(metrics, "Horizon cost · currency", money(t.cost));
      metric(metrics, "Full PAYG cost · currency", money(full));
      metric(metrics, "Savings vs full PAYG · currency", money(saving), saving < 0);
      metric(metrics, t.headroom < 0 ? "Budget breach · currency" : "Budget headroom · currency", money(t.headroom), t.headroom < 0);
      metric(metrics, "PAYG overage · credits", fmt(t.paygCredits));
      metric(metrics, "First prepaid exhaustion", month(t.prepaidExhaustionMonth));
      metric(metrics, "First budget breach", month(t.budgetExhaustionMonth));
      metric(metrics, "Eligible at horizon", fmt(t.eligible));
      metric(metrics, "Enabled at horizon", fmt(t.enabled));
      metric(metrics, "Active at horizon", fmt(t.active));
      metric(metrics, "Current month cost · currency", plan.currentMonth ? money(t.current.cost) : "—");
      card.append(metrics); container.append(card);
    });
    const b = results.baseline.totals, a = results.alternative.totals;
    const comparison = element("div", undefined, "card comparison");
    comparison.append(element("h3", "Alternative vs baseline"));
    const metrics = element("div", undefined, "metrics");
    const signed = (value, formatter) => `${value > 0 ? "+" : ""}${formatter(value)}`;
    metric(metrics, "Credits difference", signed(a.credits - b.credits, fmt));
    metric(metrics, "Cost difference · currency", signed(a.cost - b.cost, money));
    metric(metrics, "Headroom difference · currency", signed(a.headroom - b.headroom, money));
    metric(metrics, "PAYG overage difference · credits", signed(a.paygCredits - b.paygCredits, fmt));
    comparison.append(metrics);
    if (baseline.horizon !== alternative.horizon) {
      comparison.append(element("p", "Horizons differ; these compare each scenario's full period, not the same number of months.", "caption detail"));
    }
    container.append(comparison);
  }
  function drawCapacityNotes() {
    const notes = alternative.phases.flatMap(phase => {
      const actual = results.alternative.months[phase.startMonth - 1].addedEnabled;
      return actual + 1e-8 < phase.addedEnabled
        ? [`${phase.label || `Month ${phase.startMonth}`}: requested ${fmt(phase.addedEnabled)} newly enabled; ${fmt(actual)} available under the eligibility cap.`] : [];
    });
    $("capacity-notes").textContent = notes.join(" ");
  }
  function svgNode(name, attrs = {}, text) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function drawTrend() {
    const target = $("trend-chart"); target.replaceChildren();
    const w = 900, h = 340, left = 75, right = 25, top = 36, bottom = 55;
    const n = Math.max(baseline.horizon, alternative.horizon);
    const values = [...results.baseline.months.map(m => m.credits), ...results.alternative.months.map(m => m.credits), ...actuals.map(m => m.credits)];
    if (alternative.prepaid.mode === "monthly") values.push(alternative.prepaid.amount);
    const max = Math.max(1, ...values) * 1.12;
    const x = m => left + (m - 1) * (w - left - right) / Math.max(1, n - 1);
    const y = v => h - bottom - v / max * (h - top - bottom);
    const svg = svgNode("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": "Monthly forecast and actual credit demand. Detailed values are available in the table below." });
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, py = y(v);
      svg.append(svgNode("line", { x1: left, y1: py, x2: w - right, y2: py, stroke: "var(--cp-border)" }), svgNode("text", { x: left - 10, y: py + 4, "text-anchor": "end", fill: "var(--cp-text-muted)", "font-size": 12 }, fmt(v)));
    }
    alternative.checkpoints.forEach(cp => {
      svg.append(svgNode("line", { x1: x(cp), y1: top, x2: x(cp), y2: h - bottom, stroke: "var(--cp-warning)", "stroke-dasharray": "3 5" }), svgNode("text", { x: x(cp), y: 20, "text-anchor": "middle", fill: "var(--cp-text)", "font-size": 11 }, `CP ${cp}`));
    });
    if (alternative.prepaid.mode === "monthly") {
      svg.append(svgNode("line", { x1: left, y1: y(alternative.prepaid.amount), x2: w - right, y2: y(alternative.prepaid.amount), stroke: "var(--cp-link)", "stroke-dasharray": "2 4" }));
      svg.append(svgNode("text", { x: w - right, y: y(alternative.prepaid.amount) - 5, "text-anchor": "end", fill: "var(--cp-link)", "font-size": 11 }, "Monthly prepaid"));
    }
    for (let i = 1; i <= n; i++) {
      if (n <= 12 || i === 1 || i === n || i % 2 === 0) svg.append(svgNode("text", { x: x(i), y: h - bottom + 22, "text-anchor": "middle", fill: "var(--cp-text-muted)", "font-size": 12 }, `M${i}`));
    }
    function series(rows, color, dash) {
      if (!rows.length) return;
      // Separate actual segments when months are missing.
      let segment = [];
      function flush() {
        if (!segment.length) return;
        svg.append(svgNode("polyline", { points: segment.map(r => `${x(r.month)},${y(r.credits)}`).join(" "), fill: "none", stroke: color, "stroke-width": 3, ...(dash ? { "stroke-dasharray": dash } : {}) }));
        segment.forEach(r => svg.append(svgNode("circle", { cx: x(r.month), cy: y(r.credits), r: 3.5, fill: color })));
        segment = [];
      }
      rows.forEach(row => { if (segment.length && row.month !== segment[segment.length - 1].month + 1) flush(); segment.push(row); }); flush();
    }
    series(results.baseline.months, "var(--cp-text-muted)", "7 5");
    series(results.alternative.months, "var(--cp-accent)");
    series(actuals, "var(--cp-success)");
    target.append(svg);
  }
  function table(target, headers, rows) {
    target.replaceChildren();
    const t = document.createElement("table"), head = document.createElement("thead"), hr = document.createElement("tr");
    headers.forEach(value => { const th = element("th", value); th.scope = "col"; hr.append(th); });
    head.append(hr); t.append(head);
    const body = document.createElement("tbody");
    rows.forEach(row => {
      const tr = document.createElement("tr");
      row.forEach(value => tr.append(element("td", String(value))));
      body.append(tr);
    });
    t.append(body); target.append(t);
  }
  function drawMonthly() {
    const rows = [];
    const n = Math.max(baseline.horizon, alternative.horizon);
    for (let i = 1; i <= n; i++) {
      const b = results.baseline.months[i - 1], a = results.alternative.months[i - 1], actual = actuals.find(row => row.month === i);
      rows.push([i, b ? fmt(b.credits) : "—", b ? money(b.cost) : "—", a ? a.phase : "—",
        a ? fmt(a.credits) : "—", a ? money(a.cost) : "—", a ? money(a.budget) : "—", a ? money(a.headroom) : "—",
        a ? fmt(a.prepaidCredits) : "—", a ? fmt(a.paygCredits) : "—",
        a ? fmt(a.active) : "—", actual ? fmt(actual.credits) : "—", actual ? money(actual.cost) : "—", actual ? fmt(actual.active) : "—"]);
    }
    table($("monthly-table"), ["Month", "Baseline credits", "Baseline cost", "Alternative phase", "Alternative credits", "Alternative cost", "Monthly budget", "Monthly headroom", "Prepaid credits", "PAYG credits", "Alternative active", "Actual credits", "Actual cost", "Actual active"], rows);
  }
  function drawCheckpoint() {
    const next = results.alternative.nextCheckpoint;
    $("checkpoint-title").textContent = next ? `Month ${next.month} · ${next.phase}` : "No upcoming checkpoint";
    const copy = $("checkpoint-copy"); copy.replaceChildren();
    const p = element("p");
    const current = results.alternative.totals.current;
    p.textContent = `Current period: ${alternative.currentMonth === 0 ? "before month 1" : `month ${alternative.currentMonth}`}. Forecast cumulative cost so far: ${money(current.cumulative.cost)}; horizon budget: ${money(alternative.budget)}; current forecast headroom: ${money(current.cumulative.headroom)}. `;
    if (next) p.append(element("strong", `At month ${next.month}: ${fmt(next.credits)} credits, ${money(next.cost)} period cost and ${money(next.cumulative.headroom)} horizon headroom after cumulative forecast cost.`));
    else p.append(element("strong", "Add a future checkpoint to create a decision brief."));
    copy.append(p);
    const list = element("p", `Owner: ${$("owner").value || "Not set"} · Trigger: ${$("trigger").value || "Not set"} · Response: ${$("response").value || "Not set"}`, "detail");
    copy.append(list);
  }
  function drawRange() {
    const adjustment = number($("sensitivity").value);
    if (!Number.isFinite(adjustment) || adjustment < 0) { $("range-output").textContent = "Enter a finite, nonnegative adjustment."; return; }
    const rows = [];
    for (const [label, delta] of [["Low", -adjustment / 100], ["Base", 0], ["High", adjustment / 100]]) {
      const plan = enginePlan(alternative);
      plan.phases.forEach(p => { p.usageGrowth += delta; });
      const errors = ForecastEngine.validatePlan(plan);
      if (errors.length) rows.push([label, `${delta >= 0 ? "+" : ""}${fmt(delta * 100)} pp`, "Invalid assumption", "—", "—", errors.join("; ")]);
      else {
        const t = ForecastEngine.forecast(plan).totals;
        rows.push([label, `${delta >= 0 ? "+" : ""}${fmt(delta * 100)} pp`, fmt(t.credits), money(t.cost), money(t.headroom), ""]);
      }
    }
    table($("range-output"), ["Scenario", "Usage-growth adjustment", "Horizon credits", "Horizon cost", "Horizon headroom", "Note"], rows);
  }
  function drawDepartmentTotals() {
    const rows = results.alternative.departments.map(d => [d.name, fmt(d.totals.credits), fmt(d.totals.prepaidCredits), fmt(d.totals.paygCredits), money(d.totals.cost)]);
    const t = results.alternative.totals;
    rows.push(["All departments", fmt(t.credits), fmt(t.prepaidCredits), fmt(t.paygCredits), money(t.cost)]);
    table($("department-totals"), ["Department", "Credits", "Prepaid credits", "PAYG credits", "Cost · currency"], rows);
  }
  function drawWaterfall() {
    const plan = enginePlan(alternative);
    const start = plan.departments.reduce((sum, d) => sum + d.active * d.avgCredits, 0);
    const stages = [{ label: "Initial", value: start, from: 0, to: start }];
    let previous = start;
    try {
      plan.phases.forEach((phase, i) => {
        const variant = clone(plan);
        variant.phases = plan.phases.slice(0, i + 1).map(clone);
        const final = ForecastEngine.forecast(variant).months[plan.horizon - 1].credits;
        stages.push({ label: phase.label, value: final - previous, from: previous, to: final });
        previous = final;
      });
    } catch (error) {
      $("waterfall").textContent = `Waterfall unavailable for these assumptions: ${error.message}`;
      return;
    }
    stages.push({ label: "Final month", value: previous, from: 0, to: previous });
    const width = Math.max(700, stages.length * 115), height = 300, pad = 60, floor = 235;
    const max = Math.max(1, ...stages.flatMap(s => [s.from, s.to])) * 1.1;
    const y = v => floor - v / max * (floor - 30);
    const svg = svgNode("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Waterfall of initial credits, phase contributions and final-month credits. Values follow below." });
    const spacing = (width - pad * 2) / stages.length;
    svg.append(svgNode("line", { x1: pad, x2: width - 20, y1: floor, y2: floor, stroke: "var(--cp-border-strong)" }));
    stages.forEach((s, i) => {
      const x = pad + i * spacing + spacing * .2, bar = spacing * .6;
      svg.append(svgNode("rect", { x, y: y(Math.max(s.from, s.to)), width: bar, height: Math.max(1, Math.abs(y(s.to) - y(s.from))), fill: i === 0 || i === stages.length - 1 ? "var(--cp-accent)" : "var(--cp-border-strong)" }));
      if (i < stages.length - 1) svg.append(svgNode("line", { x1: x + bar, x2: x + spacing, y1: y(s.to), y2: y(s.to), stroke: "var(--cp-text-muted)", "stroke-dasharray": "3 3" }));
      svg.append(svgNode("text", { x: x + bar / 2, y: Math.max(15, y(Math.max(s.from, s.to)) - 7), "text-anchor": "middle", fill: "var(--cp-text)", "font-size": 11 }, `${i > 0 && i < stages.length - 1 && s.value >= 0 ? "+" : ""}${fmt(s.value)}`));
      svg.append(svgNode("text", { x: x + bar / 2, y: floor + 20, "text-anchor": "middle", fill: "var(--cp-text-muted)", "font-size": 11 }, s.label.length > 15 ? `${s.label.slice(0, 14)}…` : s.label));
    });
    const target = $("waterfall"); target.replaceChildren(svg);
    const detail = element("p", stages.map(s => `${s.label}: ${s.value >= 0 && s !== stages[0] && s !== stages[stages.length - 1] ? "+" : ""}${fmt(s.value)} credits`).join(" · "), "caption");
    target.append(detail);
  }

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url; link.download = name;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function csvCell(value) {
    let text = String(value);
    if (/^[\s]*[=+\-@\t\r]/.test(text) && typeof value === "string") text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }
  function exportCsv() {
    if (!results) return;
    const rows = [["scenario", "month", "phase", "eligible", "enabled", "active", "credits", "prepaid_credits", "payg_credits", "prepaid_cost", "payg_cost", "cost", "monthly_budget", "monthly_headroom", "cumulative_credits", "cumulative_cost", "horizon_headroom"]];
    [["Baseline", results.baseline], ["Alternative", results.alternative]].forEach(([name, result]) => {
      result.months.forEach(m => rows.push([name, m.month, m.phase, m.eligible, m.enabled, m.active, m.credits, m.prepaidCredits, m.paygCredits, m.prepaidCost, m.paygCost, m.cost, m.budget, m.headroom, m.cumulative.credits, m.cumulative.cost, m.cumulative.headroom]));
    });
    download("rollout-monthly-forecasts.csv", rows.map(row => row.map(csvCell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  }
  function cleanPlan(source) {
    if (!source || typeof source !== "object" || Array.isArray(source) || !Array.isArray(source.departments) || !Array.isArray(source.phases) || !Array.isArray(source.checkpoints) || !source.prepaid || typeof source.prepaid !== "object") throw new Error("Scenario JSON has an invalid plan structure.");
    if (source.departments.length > 200 || source.phases.length > 24 || source.checkpoints.length > 24) throw new Error("Scenario exceeds the import limit (200 departments, 24 phases and 24 checkpoints).");
    const pickNumber = (obj, key) => {
      if (!obj || typeof obj[key] !== "number" || !Number.isFinite(obj[key])) throw new Error(`Expected a finite number for ${key}.`);
      return obj[key];
    };
    const pickString = (obj, key) => {
      if (!obj || typeof obj[key] !== "string" || obj[key].length > 160) throw new Error(`Expected a string of at most 160 characters for ${key}.`);
      return obj[key];
    };
    const plan = {
      horizon: pickNumber(source, "horizon"), currentMonth: pickNumber(source, "currentMonth"),
      budget: pickNumber(source, "budget"), paygRate: pickNumber(source, "paygRate"), prepaidRate: pickNumber(source, "prepaidRate"),
      prepaid: { mode: pickString(source.prepaid, "mode"), amount: pickNumber(source.prepaid, "amount") },
      checkpoints: source.checkpoints.map((v, i) => pickNumber(source.checkpoints, i)),
      departments: source.departments.map(d => ({ name: pickString(d, "name"), eligible: pickNumber(d, "eligible"), enabled: pickNumber(d, "enabled"), active: pickNumber(d, "active"), avgCredits: pickNumber(d, "avgCredits") })),
      phases: source.phases.map(p => ({ label: pickString(p, "label"), startMonth: pickNumber(p, "startMonth"), userGrowth: pickNumber(p, "userGrowth"), usageGrowth: pickNumber(p, "usageGrowth"), addedEnabled: pickNumber(p, "addedEnabled"), activationRate: pickNumber(p, "activationRate") }))
    };
    const errors = ForecastEngine.validatePlan(enginePlan(plan));
    if (errors.length) throw new Error(errors.join("; "));
    return plan;
  }
  function parseActuals(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/).filter(line => line.trim() !== "");
    if (!lines.length || lines[0].trim() !== "month,credits,cost,active") throw new Error("CSV header must be exactly month,credits,cost,active.");
    const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
    const seen = new Set();
    const parsed = lines.slice(1).map((line, index) => {
      const cells = line.split(",").map(s => s.trim());
      if (cells.length !== 4 || cells.some(cell => !numeric.test(cell))) throw new Error(`CSV data row ${index + 2} must contain exactly four numeric values; formulas and quoted values are not accepted.`);
      const [m, credits, cost, active] = cells.map(Number);
      if (![m, credits, cost, active].every(Number.isFinite) || !Number.isInteger(m) || m < 1 || m > alternative.horizon || credits < 0 || cost < 0 || active < 0 || seen.has(m)) throw new Error(`CSV data row ${index + 2}: month must be unique and within the horizon; all other values must be finite and nonnegative.`);
      seen.add(m);
      return { month: m, credits, cost, active };
    });
    return parsed.sort((a, b) => a.month - b.month);
  }
  async function readFile(input, callback) {
    const file = input.files[0];
    if (!file) return;
    try {
      if (file.size > 1000000) throw new Error("File must be no larger than 1 MB.");
      callback(await file.text());
      render();
    } catch (error) { message(`Import failed: ${error.message}`); }
    finally { input.value = ""; }
  }
  function updateActualStatus() {
    $("actuals-status").textContent = actuals.length ? `${actuals.length} actual month${actuals.length === 1 ? "" : "s"} imported locally. Forecast totals remain independent.` : "No actuals imported.";
  }
  document.addEventListener("change", event => {
    const input = event.target;
    if (input.dataset.field) {
      const key = input.dataset.field;
      if (key === "checkpoints") {
        alternative.checkpoints = input.value.trim() ? input.value.split(",").map(part => number(part.trim())) : [];
      } else if (key === "prepaid.mode") alternative.prepaid.mode = input.value;
      else if (key === "prepaid.amount") alternative.prepaid.amount = number(input.value);
      else alternative[key] = number(input.value);
      render();
    } else if (input.dataset.kind) {
      const row = input.dataset.kind === "phase" ? alternative.phases[Number(input.dataset.index)] : alternative.departments[Number(input.dataset.index)];
      const key = input.dataset.key;
      row[key] = input.type === "text" ? input.value : number(input.value) / (input.dataset.percent === "yes" ? 100 : 1);
      render();
    } else if (input.id === "sensitivity") {
      if (results) drawRange();
    } else if (input.id === "import-csv") {
      readFile(input, text => { actuals = parseActuals(text); updateActualStatus(); });
    } else if (input.id === "import-json") {
      readFile(input, text => {
        const data = JSON.parse(text);
        if (!data || data.version !== 1) throw new Error("Expected a version 1 scenario export.");
        const b = cleanPlan(data.baseline), a = cleanPlan(data.alternative);
        if (actuals.some(row => row.month > a.horizon)) throw new Error("Clear actuals before importing a shorter horizon.");
        const details = data.decision || {};
        ["owner", "trigger", "response"].forEach(key => {
          if (details[key] !== undefined && (typeof details[key] !== "string" || details[key].length > 200)) throw new Error(`Invalid ${key}.`);
        });
        if (data.sensitivity !== undefined && (typeof data.sensitivity !== "number" || !Number.isFinite(data.sensitivity) || data.sensitivity < 0)) throw new Error("Invalid sensitivity adjustment.");
        baseline = b; alternative = a;
        ["owner", "trigger", "response"].forEach(key => { if (details[key] !== undefined) $(key).value = details[key]; });
        if (data.sensitivity !== undefined) $("sensitivity").value = data.sensitivity;
        drawEditors();
      });
    }
  });
  document.addEventListener("input", event => {
    if (["owner", "trigger", "response"].includes(event.target.id) && results) drawCheckpoint();
  });
  document.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.remove) {
      const rows = button.dataset.remove === "phase" ? alternative.phases : alternative.departments;
      rows.splice(Number(button.dataset.index), 1); drawEditors(); render();
    } else if (button.id === "add-phase") {
      const last = alternative.phases[alternative.phases.length - 1];
      alternative.phases.push({ startMonth: last ? last.startMonth + 1 : 1, label: "", userGrowth: 0, usageGrowth: 0, addedEnabled: 0, activationRate: 0 });
      drawEditors(); render();
    } else if (button.id === "add-department") {
      alternative.departments.push({ name: "", eligible: 0, enabled: 0, active: 0, avgCredits: 0 }); drawEditors(); render();
    } else if (button.id === "snapshot" && results) {
      baseline = clone(alternative); render();
    } else if (button.id === "restore") {
      alternative = clone(baseline); drawEditors(); render();
    } else if (button.id === "clear-actuals") {
      actuals = []; updateActualStatus(); render();
    } else if (button.id === "export-csv") exportCsv();
    else if (button.id === "export-json") {
      if (!results) { message("Correct the plan assumptions before exporting scenarios."); return; }
      const sensitivity = number($("sensitivity").value);
      if (!Number.isFinite(sensitivity) || sensitivity < 0) { message("Enter a finite, nonnegative sensitivity adjustment before exporting."); return; }
      download("rollout-scenarios.json", JSON.stringify({ version: 1, baseline, alternative, sensitivity, decision: { owner: $("owner").value, trigger: $("trigger").value, response: $("response").value } }, null, 2), "application/json");
    }
  });
  drawEditors();
  updateActualStatus();
  render();
})();
