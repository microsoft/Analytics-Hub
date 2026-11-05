function renderDemandTimeline(chart, details, timeline) {
  const number = value => new Intl.NumberFormat("en-US", value !== 0 && Math.abs(value) < .1
    ? { maximumSignificantDigits: 6 } : { maximumFractionDigits: 2 }).format(value);
  const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const small = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 });
  const scientific = new Intl.NumberFormat("en-US", { notation: "scientific", maximumFractionDigits: 2 });
  const chartNumber = value => value !== 0 && (Math.abs(value) < .001 || Math.abs(value) >= 1e15)
    ? scientific.format(value) : Math.abs(value) < 1000 ? small.format(value) : compact.format(value);
  const signed = value => `${value > 0 ? "+" : ""}${number(value)}`;
  const entries = [
    { label: "Starting monthly demand", short: "Starting input", period: "Before month 1", from: 0, to: timeline.startingCredits, value: timeline.startingCredits, total: true },
    ...timeline.intervals.map((p, i) => ({
      label: timeline.constant ? "Constant growth" : `Phase ${i + 1}: ${p.label || `Phase ${i + 1}`}`,
      short: timeline.constant ? "Constant growth" : `Phase ${i + 1}`,
      period: p.startDate ? `Months ${p.startMonth}–${p.endMonth} (${p.startDate} – ${p.endDate})` : `Months ${p.startMonth}–${p.endMonth}`,
      from: p.from === undefined ? p.endingCredits - p.change : p.from, to: p.endingCredits, value: p.change
    })),
    { label: "Final monthly demand", short: "Final forecast", period: `Month ${timeline.finalMonth}${timeline.finalDate ? ` (${timeline.finalDate})` : ""}`, from: 0, to: timeline.finalCredits, value: timeline.finalCredits, total: true }
  ];
  const spacing = 145, left = 72, right = 18, height = 285, floor = 210, top = 26;
  const width = left + entries.length * spacing + right;
  const peak = Math.max(1, ...entries.flatMap(e => [e.from, e.to]));
  const max = Number.isFinite(peak * 1.15) ? peak * 1.15 : peak;
  const y = value => floor - value / max * (floor - top);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Waterfall from starting monthly demand through each period's change to final monthly demand. Full labels and rounded values are in the table.");
  svg.style.minWidth = `${width}px`;
  const add = (tag, attrs, text) => {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (text !== undefined) node.textContent = text;
    svg.append(node);
  };
  for (let i = 0; i <= 3; i++) {
    const value = max * (i / 3);
    add("line", { x1: left, x2: width - right, y1: y(value), y2: y(value), stroke: "var(--cp-border)" });
    add("text", { x: left - 8, y: y(value) + 4, "text-anchor": "end", fill: "var(--cp-text-muted)", "font-size": 11 }, chartNumber(value));
  }
  entries.forEach((entry, i) => {
    const center = left + spacing * (i + .5), bar = 76;
    const high = Math.max(entry.from, entry.to), low = Math.min(entry.from, entry.to);
    if (high !== low) add("rect", { x: center - bar / 2, y: y(high), width: bar, height: y(low) - y(high), fill: entry.total ? "var(--cp-accent)" : entry.value < 0 ? "var(--cp-warning)" : "var(--cp-success)", "data-waterfall-stage": i });
    if (i < entries.length - 1) add("line", { x1: center + bar / 2, x2: center + spacing - bar / 2, y1: y(entry.to), y2: y(entry.to), stroke: "var(--cp-text-muted)", "stroke-dasharray": "4 3", "data-waterfall-connector": i });
    add("text", { x: center, y: Math.max(14, y(high) - 7), "text-anchor": "middle", fill: "var(--cp-text)", "font-size": 11 }, `${!entry.total && entry.value > 0 ? "+" : ""}${chartNumber(entry.value)}`);
    add("text", { x: center, y: floor + 18, "text-anchor": "middle", fill: "var(--cp-text)", "font-size": 11 }, entry.short);
    if (i > 0 && i < entries.length - 1) {
      const p = timeline.intervals[i - 1];
      add("text", { x: center, y: floor + 34, "text-anchor": "middle", fill: "var(--cp-text-muted)", "font-size": 11 }, `M${p.startMonth}–M${p.endMonth}`);
    } else if (i === entries.length - 1) {
      add("text", { x: center, y: floor + 34, "text-anchor": "middle", fill: "var(--cp-text-muted)", "font-size": 11 }, `M${timeline.finalMonth}`);
    }
  });
  chart.replaceChildren(svg);
  const table = document.createElement("table"), caption = document.createElement("caption");
  caption.textContent = "Monthly demand timeline (credits, rounded)";
  const head = document.createElement("thead"), row = document.createElement("tr");
  ["Stage", "Forecast period", "Change in monthly demand", "Ending monthly demand"].forEach(label => {
    const th = document.createElement("th"); th.scope = "col"; th.textContent = label; row.append(th);
  });
  head.append(row);
  const body = document.createElement("tbody");
  entries.forEach(entry => {
    const tr = document.createElement("tr");
    [entry.label, entry.period, entry.total ? "—" : signed(entry.value), number(entry.to)].forEach((value, i) => {
      const cell = document.createElement(i === 0 ? "th" : "td");
      if (i === 0) cell.scope = "row";
      cell.textContent = value; tr.append(cell);
    });
    body.append(tr);
  });
  table.append(caption, head, body);
  details.replaceChildren(table);
}

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
      field("Forecast length (months)", alternative.horizon, { field: "horizon", min: 1, max: 24 }),
      field("Current month (0 = before rollout)", alternative.currentMonth, { field: "currentMonth", min: 0, max: 24 }),
      field("Budget for estimated credit usage", alternative.budget, { field: "budget", min: 0 }),
      field("Checkpoints (months, comma-separated)", alternative.checkpoints.join(", "), { field: "checkpoints", type: "text" }),
      field("How do prepaid credits work?", alternative.prepaid.mode, { field: "prepaid.mode", select: [["monthly", "Reset credits each month"], ["pool", "Carry unused credits forward"]] }),
      field("Prepaid credits available", alternative.prepaid.amount, { field: "prepaid.amount", min: 0 }),
      field("Prepaid price per credit", alternative.prepaidRate, { field: "prepaidRate", min: 0 }),
      field("Pay-as-you-go price per credit", alternative.paygRate, { field: "paygRate", min: 0 })
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
      metric(metrics, "Estimated cost of credits used", money(t.cost));
      metric(metrics, "Cost if all credits were pay-as-you-go", money(full));
      metric(metrics, "Estimated difference vs pay-as-you-go", money(saving), saving < 0);
      metric(metrics, t.headroom < 0 ? "Amount over budget" : "Budget left", money(t.headroom), t.headroom < 0);
      metric(metrics, "Pay-as-you-go credits needed", fmt(t.paygCredits));
      metric(metrics, "First month prepaid credits run out", month(t.prepaidExhaustionMonth));
      metric(metrics, "First month over budget", month(t.budgetExhaustionMonth));
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
    metric(metrics, "Estimated cost difference", signed(a.cost - b.cost, money));
    metric(metrics, "Budget left difference", signed(a.headroom - b.headroom, money));
    metric(metrics, "Pay-as-you-go credits difference", signed(a.paygCredits - b.paygCredits, fmt));
    comparison.append(metrics);
    if (baseline.horizon !== alternative.horizon) {
      comparison.append(element("p", "Forecast lengths differ, so these totals cover different numbers of months.", "caption detail"));
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

(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const copy = value => structuredClone(value);
  const num = value => {
    const text = value.trim().replace(/^[\u0024\u00a3\u20ac]\s*/, "").replace(/^-\s*([\u0024\u00a3\u20ac])/, "-");
    if (!/^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text)) return NaN;
    return Number(text.replace(/,/g, ""));
  };
  const fmt = value => new Intl.NumberFormat("en-US", value !== 0 && Math.abs(value) < 1
    ? { maximumSignificantDigits: 6 } : { maximumFractionDigits: 0 }).format(value);
  let currency = "USD";
  const cash = value => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  const inputNumber = value => String(value).replace(/^(-?)(\d+)(?=\.|e|$)/i, (_, sign, digits) => sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
  const inputValue = (value, currencyField) => currencyField ? `${value < 0 ? "-" : ""}${{ USD: "$", EUR: "€", GBP: "£" }[currency]}${inputNumber(Math.abs(value))}` : inputNumber(value);
  const percentValue = value => new Intl.NumberFormat("en-US", { useGrouping: false, maximumSignificantDigits: 15 }).format(value * 100);
  const formattedFields = new Set(["initialUsers", "avgCredits", "openingPool", "monthlyAllocation", "userCap", "budget"]);
  const formattedRows = new Set(["steps.users", "purchases.credits"]);
  const when = value => value == null ? "Not reached" : `Month ${value}`;
  const initial = {
    horizon: 12, currentMonth: 0, startMonth: "2026-06",
    initialUsers: 1000, userCap: 5000, avgCredits: 59708.108, userGrowth: .02, usageGrowth: .02,
    growthMode: "constant", phases: [{ label: "Initial", month: 1, userGrowth: .02, usageGrowth: .02 }],
    steps: [], fundingMode: "pool", openingPool: 650000000,
    purchases: [], monthlyAllocation: 0,
    prepaidRate: .008, paygRate: .01, budget: 8000000
  };
  let baseline = copy(initial), alternative = copy(initial), actuals = [], actualsStartMonth = null, results = null, baselineSaved = false, baselineSource = null, exportingDeck = false;
  let planEstablished = false, attemptedView = false;
  let mayHaveIllustrativeAssumptions = true, showAssumptionWarning = false;
  const defaultViewSettings = () => ({ view: "demand", sensitivity: 2, low: true, base: true, high: true });
  const defaultExportViews = () => ({ trend: false, sensitivity: false, phases: false, checkpoints: false, departments: false });
  const defaultExportViewOverrides = () => ({ checkpoints: false, departments: false });
  let viewSettings = defaultViewSettings(), exportViews = defaultExportViews(), exportViewOverrides = defaultExportViewOverrides(), checkpoints = [], baselineCheckpoints = [];
  const manualProvenance = Symbol("manual");
  let baselineProvenance = manualProvenance, currentProvenance = manualProvenance;
  let baselineDateAttribution = null, currentDateAttribution = null;
  function cleanDateAttribution(value) {
    if (value == null) return null;
    if (typeof value !== "string" || !value.trim() || value.length > 500) throw new Error("Date attribution must be text of at most 500 characters.");
    return value;
  }
  const sourceComparison = () => baselineProvenance === currentProvenance ? "same"
    : [baselineProvenance, currentProvenance].some(value => typeof value === "symbol" && value !== manualProvenance) ? "unknown" : "different";
  const sameForecastPeriod = () => baseline.horizon === alternative.horizon && baseline.startMonth === alternative.startMonth;
  const comparablePlans = () => baselineSaved && sameForecastPeriod() && sourceComparison() === "same";
  const el = (tag, text, cls) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (cls) node.className = cls;
    return node;
  };
  function notice(text) {
    $("scheduled-errors").textContent = text;
    $("scheduled-errors").classList.toggle("hidden", !text);
  }
  function control(label, key, value, options = {}) {
    const wrapper = el("label", label);
    const input = document.createElement(options.choices ? "select" : "input");
    if (options.choices) options.choices.forEach(([v, title]) => { const o = el("option", title); o.value = v; input.append(o); });
    else {
      input.type = options.type || (formattedFields.has(key) ? "text" : "number");
      if (formattedFields.has(key)) { input.inputMode = "decimal"; input.dataset.formatted = key === "budget" ? "currency" : "number"; }
      if (input.type === "number") input.step = "any";
      if (options.min !== undefined) input.min = options.min;
      if (options.max !== undefined) input.max = options.max;
    }
    const blankable = !["startMonth", "horizon"].includes(key);
    input.value = value == null || (value === 0 && blankable) ? "" : options.percent ? percentValue(value) : formattedFields.has(key) ? inputValue(value, key === "budget") : value;
    if (blankable) input.placeholder = options.percent ? "e.g. 5" : ({ initialUsers: "e.g. 1,000", avgCredits: "e.g. 8,000", openingPool: "e.g. 100,000,000", prepaidRate: "e.g. 0.008", paygRate: "e.g. 0.01", userCap: "e.g. 5,000", budget: "e.g. 5,000,000" }[key] || "Enter a number");
    input.dataset.scheduledField = key;
    if (options.percent) input.dataset.percent = "1";
    wrapper.append(input);
    return wrapper;
  }
  function rows(id, kind, data, columns) {
    const body = $(id); body.replaceChildren();
    data.forEach((row, i) => {
      const tr = el("tr");
      columns.forEach(([key, type]) => {
        const td = el("td"), input = el("input");
        const format = formattedRows.has(`${kind}.${key}`);
        input.type = type === "text" || format ? "text" : "number";
        if (format) { input.inputMode = "decimal"; input.dataset.formatted = "number"; input.dataset.numeric = "1"; }
        if (input.type === "number") input.step = "any";
        else input.maxLength = 160;
        input.value = type === "percent" ? percentValue(row[key]) : format ? inputValue(row[key], false) : row[key];
        input.dataset.scheduledRow = kind; input.dataset.rowIndex = i; input.dataset.rowKey = key;
        if (type === "percent") input.dataset.percent = "1";
        input.setAttribute("aria-label", `${kind} ${i + 1} ${key}`);
        td.append(input); tr.append(td);
      });
      const td = el("td"), button = el("button", "Remove");
      button.type = "button"; button.dataset.scheduledRemove = kind; button.dataset.rowIndex = i;
      button.setAttribute("aria-label", `Remove ${kind} ${i + 1}`);
      td.append(button); tr.append(td); body.append(tr);
    });
  }
  function monthLabel(start, offset) {
    const m = /^(\d{4})-(\d{2})$/.exec(start || "");
    if (!m) return "—";
    const index = Number(m[1]) * 12 + Number(m[2]) - 1 + offset;
    return new Date(Date.UTC(Math.floor(index / 12), index % 12, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  }
  function scheduleEditor() {
    const body = $("scheduled-schedule"); body.replaceChildren();
    const count = Number.isInteger(alternative.horizon) && alternative.horizon >= 1 ? Math.min(alternative.horizon, 36) : 0;
    for (let m = 1; m <= count; m++) {
      const tr = el("tr");
      tr.append(el("td", String(m)), el("td", monthLabel(alternative.startMonth, m - 1)));
      [["users", alternative.steps], ["credits", alternative.purchases]].forEach(([key, list]) => {
        const td = el("td"), input = el("input"), entry = list.find(item => item.month === m);
        input.type = "text"; input.inputMode = "decimal"; input.placeholder = "—";
        input.value = entry ? inputNumber(entry[key]) : "";
        input.dataset.schedule = key; input.dataset.month = m;
        input.setAttribute("aria-label", `Month ${m} ${key === "users" ? "total users after step-up" : "credits purchased"}`);
        td.append(input); tr.append(td);
      });
      body.append(tr);
    }
  }
  function setSchedule(key, month, text) {
    const list = key === "users" ? alternative.steps : alternative.purchases;
    const value = text.trim() === "" ? 0 : num(text);
    const index = list.findIndex(item => item.month === month);
    if (!Number.isFinite(value) || value < 0) return false;
    if (value === 0) {
      if (index >= 0) list.splice(index, 1);
      if (key === "users" && alternative.stepTargets) alternative.stepTargets = alternative.stepTargets.filter(target => target.month !== month);
    } else if (index >= 0) list[index][key] = value;
    else {
      list.push({ month, [key]: value });
      list.sort((a, b) => a.month - b.month);
      if (key === "users" && alternative.departments) alternative.stepTargets.push({ month, targets: alternative.departments.map(d => ({ departmentId: d.id, users: 0 })) });
    }
    return true;
  }
  function editors() {
    $("scheduled-fields").replaceChildren(
      control("First forecast month", "startMonth", alternative.startMonth, { type: "month" }),
      control("Forecast length (months, 1–36)", "horizon", alternative.horizon, { min: 1, max: 36 }),
      control("Starting users", "initialUsers", alternative.initialUsers, { min: 0 }),
      control("Starting credits per user per month", "avgCredits", alternative.avgCredits, { min: 0 })
    );
    $("scheduled-growth-fields").replaceChildren(
      control("Monthly user growth (%)", "userGrowth", alternative.userGrowth, { percent: true, min: 0 }),
      control("Monthly usage growth per user (%)", "usageGrowth", alternative.usageGrowth, { percent: true, min: -100 }),
      control("Max allowed users (ceiling)", "userCap", alternative.userCap, { min: 0 })
    );
    $("scheduled-funding-fields").replaceChildren(
      control("Credits available at the start", "openingPool", alternative.openingPool, { min: 0 }),
      control("Prepaid price per credit", "prepaidRate", alternative.prepaidRate, { min: 0 }),
      control("Pay-as-you-go price per credit", "paygRate", alternative.paygRate, { min: 0 })
    );
    $("scheduled-whatif-fields").replaceChildren(control("Additional budget (optional)", "budget", alternative.budget, { min: 0 }));
    scheduleEditor();
    departmentEditor();
    updateGrowthMode();
  }
  function departmentEditor() {
    const target = $("scheduled-department-editor"); target.replaceChildren();
    const groups = alternative.departments;
    const button = el("button", groups ? "Add department" : "Start department planning");
    button.type = "button"; button.id = "add-scheduled-department"; target.append(button);
    if (!groups) { target.append(el("p", "No department split is assumed. Add groups only when you have explicit assumptions.", "caption detail")); return; }
    target.append(el("p", "Department starting users and usage replace the aggregate starting inputs. User growth is rounded per group; a maximum is shared proportionally. Prepaid credits and their cost are allocated in proportion to each group's demand.", "caption detail"));
    const users = groups.reduce((sum, group) => sum + group.startingUsers, 0);
    const demand = groups.reduce((sum, group) => sum + group.startingUsers * group.startingCreditsPerUser, 0);
    if (Number.isSafeInteger(users) && users >= 0)
      target.append(el("p", `Derived starting total: ${fmt(users)} users; ${users && Number.isFinite(demand) && demand >= 0 ? `${fmt(demand / users)} credits per user (weighted)` : users ? "weighted credits per user unavailable" : "credits per user unavailable with zero users"}.`, "caption detail"));
    const wrap = el("div", undefined, "table-wrap detail"), t = el("table", undefined, "edit-table"), head = el("thead"), hr = el("tr"), body = el("tbody");
    ["Name", "Starting users", "Starting credits / user", ""].forEach(label => hr.append(el("th", label))); head.append(hr); t.append(head); t.append(body); wrap.append(t); target.append(wrap);
    body.id = "scheduled-department-rows";
    rows("scheduled-department-rows", "departments", groups, [["name", "text"], ["startingUsers", "number"], ["startingCreditsPerUser", "number"]]);
    if (alternative.steps.length) {
      target.append(el("p", "For each rollout step, enter an explicit target for every group. Targets must sum to the step's total users, including steps outside the forecast.", "caption detail"));
      alternative.steps.forEach((step, index) => {
        const section = el("div", undefined, "settings grid");
        const targets = alternative.stepTargets.find(entry => entry.month === step.month);
        groups.forEach((group, groupIndex) => {
          const label = el("label", `Month ${step.month} · ${group.name || `Department ${groupIndex + 1}`} target users`), input = el("input");
          const item = targets && targets.targets.find(entry => entry.departmentId === group.id);
          input.type = "number"; input.step = "1"; input.min = "0"; input.value = item ? item.users : "";
          input.dataset.targetIndex = index; input.dataset.targetGroup = groupIndex; label.append(input); section.append(label);
        });
        target.append(section);
      });
    }
  }
  function checkpointEditor() {}
  function cleanCheckpoints(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 36) throw new Error("Checkpoints must be an array of at most 36 entries.");
    const seen = new Set();
    return value.map(p => {
      if (!p || typeof p !== "object" || Array.isArray(p) || !Number.isInteger(p.month) || p.month < 1 || p.month > 36 || seen.has(p.month)) throw new Error("Checkpoint months must be unique whole numbers from 1 to 36.");
      seen.add(p.month);
      const point = { month: p.month };
      ["owner", "trigger", "response"].forEach(k => {
        if (p[k] !== undefined && (typeof p[k] !== "string" || p[k].length > 200)) throw new Error(`Checkpoint ${k} must be text of at most 200 characters.`);
        point[k] = p[k] || "";
      });
      return point;
    });
  }
  function cleanViewSettings(value) {
    if (value === undefined) return defaultViewSettings();
    if (!value || typeof value !== "object" || Array.isArray(value) || !["demand", "sensitivity", "phases"].includes(value.view) || typeof value.sensitivity !== "number" || !Number.isFinite(value.sensitivity) || value.sensitivity < 0 || !["low", "base", "high"].every(k => typeof value[k] === "boolean")) throw new Error("Invalid chart settings.");
    return { view: value.view, sensitivity: value.sensitivity, low: value.low, base: value.base, high: value.high };
  }
  function syncViewSettings() {
    $("scheduled-chart-view").value = viewSettings.view;
    $("scheduled-sensitivity").value = viewSettings.sensitivity;
    ["low", "base", "high"].forEach(k => { $(`scheduled-show-${k}`).checked = viewSettings[k]; });
    document.querySelectorAll("[data-export-view]").forEach(input => { input.checked = exportViews[input.dataset.exportView]; });
  }
  function cleanExportViews(value) {
    if (value === undefined) return defaultExportViews();
    if (!value || typeof value !== "object" || Array.isArray(value) || !Object.keys(defaultExportViews()).every(k => typeof value[k] === "boolean")) throw new Error("Invalid PowerPoint view settings.");
    return Object.fromEntries(Object.keys(defaultExportViews()).map(k => [k, value[k]]));
  }
  function cleanExportViewOverrides(value, hasSettings) {
    if (value === undefined) return { checkpoints: hasSettings, departments: hasSettings };
    if (!value || typeof value !== "object" || Array.isArray(value) || !["checkpoints", "departments"].every(k => typeof value[k] === "boolean")) throw new Error("Invalid PowerPoint view preferences.");
    return { checkpoints: value.checkpoints, departments: value.departments };
  }
  function updateGrowthMode() {
    ["initialUsers", "avgCredits"].forEach(key => { $("scheduled-fields").querySelector(`[data-scheduled-field="${key}"]`).disabled = !!alternative.departments; });
  }
  function mon(value) {
    return /^\d{4}-\d{2}$/.test(value) ? new Date(Date.UTC(+value.slice(0, 4), +value.slice(5) - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : value;
  }
  function table(id, headers, rowsData) {
    const target = $(id), t = el("table"), head = el("thead"), hr = el("tr"), body = el("tbody");
    headers.forEach(h => { const th = el("th", h); th.scope = "col"; hr.append(th); });
    head.append(hr); t.append(head);
    rowsData.forEach(row => { const tr = el("tr"); row.forEach(v => tr.append(el("td", mon(String(v))))); body.append(tr); });
    t.append(body); target.replaceChildren(t);
  }
  function metric(container, label, value, negative, sub) {
    const d = el("div"); d.append(el("div", label, "metric-label"), el("div", value, `metric-value${negative ? " negative" : ""}`));
    if (sub) d.append(el("div", sub, "metric-sub"));
    container.append(d);
  }
  function maxFit(fits, low, high, integer) {
    if (!fits(low)) return null;
    if (fits(high)) return Infinity;
    for (let i = 0; i < 50 && high - low > (integer ? 1 : high * 1e-6); i++) {
      const mid = integer ? Math.floor((low + high) / 2) : (low + high) / 2;
      if (fits(mid)) low = mid; else high = mid;
    }
    return low;
  }
  function whatIf() {
    const box = $("scheduled-whatif-results"), t = results.alternative.totals, B = alternative.budget;
    box.replaceChildren();
    if (!(B > 0)) { box.append(el("p", "Enter an additional budget to see how many users it can support, how long it lasts, and what usage it allows.", "caption")); return; }
    if (alternative.departments) { box.append(el("p", "Budget sizing is not available while department planning is on.", "caption")); return; }
    const prepaidMode = $("scheduled-whatif-mode").value === "prepaid", pr = alternative.prepaidRate, gr = alternative.paygRate;
    if (prepaidMode && !(pr > 0)) { box.append(el("p", "Enter a prepaid price per credit in Step 1 to size a prepaid purchase.", "warn")); return; }
    const n = alternative.horizon, k = Math.min(n, Math.max(1, Math.round(num($("scheduled-whatif-month").value) || 1)));
    const funded = alternative.openingPool + alternative.purchases.reduce((sum, p) => sum + p.credits, 0);
    const withBudget = plan => prepaidMode ? Object.assign({}, plan, { purchases: [...plan.purchases.filter(p => p.month !== 1), { month: 1, credits: B / pr + plan.purchases.filter(p => p.month === 1).reduce((sum, p) => sum + p.credits, 0) }] }) : plan;
    const fitsPlan = plan => { try { const r = ForecastEngine.forecastScheduled(withBudget(plan)).totals; return prepaidMode ? r.paygCredits < 0.5 : r.paygCost <= B; } catch (e) { return false; } };
    const bought = prepaidMode ? B / pr : B / gr;
    const usersFor = U => Object.assign({}, alternative, { userGrowth: 0, userCap: null, steps: [{ month: k, users: Math.round(U) }] });
    const users = maxFit(U => fitsPlan(usersFor(U)), Math.max(1, alternative.initialUsers), 10000000, true);
    const usage = maxFit(v => fitsPlan(Object.assign({}, alternative, { avgCredits: v })), 0, Math.max(1, alternative.avgCredits) * 1000, false);
    let runway = null;
    try {
      const long = ForecastEngine.forecastScheduled(withBudget(Object.assign({}, alternative, { horizon: 36 })));
      if (prepaidMode) runway = long.totals.firstPayg ? long.totals.firstPayg - 1 : null;
      else { let s = 0; const i = long.months.findIndex(m => (s += m.paygCost) > B); runway = i < 0 ? null : i; }
    } catch (e) { runway = undefined; }
    const needed = prepaidMode ? t.paygCredits * pr : t.paygCost;
    const how = prepaidMode ? "buy prepaid credits upfront in month 1" : "pay as you go for credits beyond your funded balance";
    const summary = el("div", undefined, "whatif-summary");
    summary.append(el("p", users === null
      ? `${cash(B)} cannot cover even your starting ${fmt(alternative.initialUsers)} users at ${fmt(alternative.avgCredits)} credits per user for ${n} months. Raise the budget or lower credits per user.`
      : `With ${cash(B)} of additional budget (${how}) on top of ${fmt(funded)} funded credits, you can support up to ${users === Infinity ? "10,000,000+" : fmt(users)} users at ${fmt(alternative.avgCredits)} credits per user per month for ${n} months, reaching that headcount in month ${k}.`, "whatif-headline"));
    box.append(summary);
    const items = [], add = (title, value, note) => { const c = el("div", undefined, "card whatif-card"); c.append(el("div", title, "metric-label"), el("div", value, "metric-value"), el("div", note, "metric-sub")); items.push(c); };
    add("Credits your money covers", fmt(funded + bought), `${fmt(funded)} already funded (starting balance and planned purchases, used first) + ${fmt(bought)} bought with ${cash(B)} at ${prepaidMode ? "the prepaid" : "the pay-as-you-go"} price.`);
    add("Budget needed for your current plan", cash(needed), needed <= B ? `${cash(B - needed)} left from your budget.` : `${cash(needed - B)} more than your budget.`);
    add("How long your current plan is covered", runway === undefined ? "—" : runway === null ? "Beyond 36 months" : `${runway} months`, prepaidMode ? "Months until the prepaid credits you can buy run out." : "Months until pay-as-you-go spend exceeds the budget.");
    if (usage !== null && usage !== Infinity) add("Max credits per user per month", fmt(usage), `Average the budget supports for your planned users (you entered ${fmt(alternative.avgCredits)}).`);
    const grid = el("div", undefined, "grid whatif-grid"); grid.append(...items); box.append(grid);
    box.append(el("p", `Users in the headline start at ${fmt(alternative.initialUsers)} and step up once to the maximum in month ${k}; this replaces your growth and step-up schedule for this what-if only. Existing prepaid credits are always spent first.`, "caption"));
  }
  ["scheduled-whatif-mode", "scheduled-whatif-month"].forEach(id => $(id).addEventListener("change", () => { if (results) whatIf(); }));
  function cards() {
    const summary = $("scheduled-summary"), current = results.alternative.totals;
    summary.replaceChildren();
    const gain = current.paygCredits * Math.max(0, alternative.paygRate - alternative.prepaidRate);
    const lastMonth = results.alternative.months[results.alternative.months.length - 1];
    const rate = v => `$${v.toFixed(4)}`;
    const rows = [
      [
        ["Forecast months", String(alternative.horizon)],
        ["Total credit need", fmt(current.credits)],
        ["Prepaid-funded credits", fmt(current.prepaidCredits), "prepaid"],
        ["Pay-as-you-go / additional credits", fmt(current.paygCredits), "payg"],
        ["Ending users", lastMonth && lastMonth.users ? fmt(lastMonth.users) : "—"]
      ],
      [
        ["Total forecast cost", cash(current.cost)],
        ["Prepaid-funded cost", cash(current.prepaidCost), "prepaid"],
        ["Pay-as-you-go cost", cash(current.paygCost), "payg"],
        ["Prepaid rate / credit", rate(alternative.prepaidRate)],
        ["Pay-as-you-go rate / credit", rate(alternative.paygRate)],
        ["Potential prefunding savings", cash(gain), "highlight", "Pay-as-you-go credits bought at the prepaid price instead"]
      ]
    ];
    const titles = ["Credits", "Cost"];
    rows.forEach((row, index) => {
      summary.append(el("div", titles[index], "dash-title"));
      const line = el("div", undefined, "dash-row");
      row.forEach(([label, value, tone, sub]) => {
        const card = el("div", undefined, `card dash-card${tone ? " dash-" + tone : ""}`);
        metric(card, label, value, false, sub);
        line.append(card);
      });
      summary.append(line);
    });
    const decision = $("scheduled-decision");
    decision.replaceChildren();
    const gap = current.firstPayg;
    let spent = 0;
    const overIndex = results.alternative.months.findIndex(m => (spent += m.paygCost) > alternative.budget);
    const firstOver = overIndex < 0 ? 0 : overIndex + 1;
    const message = current.credits === 0
      ? "No credit usage is forecast. Review your starting users, usage and growth assumptions."
      : gap
      ? `Your prepaid credits are expected to run short in ${mon(results.alternative.months[gap - 1].date)} (month ${gap}). Compare buying more credits before then with paying for ${fmt(current.paygCredits)} credits as you go over the full forecast, if pay-as-you-go is available under your agreement. A shortfall does not mean coverage is automatic.`
      : "Your prepaid credits cover the forecast. Check the credits left at the end before buying more.";
    decision.append(el("strong", "Takeaway: "), document.createTextNode(` ${message} ${alternative.budget > 0 ? (firstOver ? `Pay-as-you-go spend first goes over your additional budget in ${mon(results.alternative.months[firstOver - 1].date)}.` : "Pay-as-you-go spend stays within your additional budget.") : ""} This is not an invoice, a cash-spend forecast, or a spending limit.`));
    const target = $("scheduled-cards");
    target.replaceChildren();
    $("scheduled-restore").disabled = !baselineSaved;
    if (!baselineSaved) {
      target.append(el("p", "No plan saved yet. Save the current plan, change an assumption, and return here to see the difference.", "caption"));
      return;
    }
    const a = results.alternative.totals, b = results.baseline.totals;
    const samePeriod = sameForecastPeriod();
    const sourceState = sourceComparison(), sameSource = sourceState === "same", sourceUnknown = sourceState === "unknown";
    const comparable = samePeriod && sameSource;
    const unavailable = !samePeriod ? "Different periods" : sourceUnknown ? "Source unknown" : "Different data";
    const delta = (x, f) => `${x > 0 ? "+" : ""}${f(x)}`;
    const timing = result => result.totals.firstPayg == null ? "Not needed" : result.months[result.totals.firstPayg - 1].date;
    table("scheduled-cards", ["What changes", `Saved plan · ${baseline.horizon} months`, `Current plan · ${alternative.horizon} months`, "Difference"],
      [
        ["Credits needed", fmt(b.credits), fmt(a.credits), comparable ? delta(a.credits - b.credits, fmt) : unavailable],
        ["Estimated cost of credits used", cash(b.cost), cash(a.cost), comparable ? delta(a.cost - b.cost, cash) : unavailable],
        ["Pay-as-you-go credits needed", fmt(b.paygCredits), fmt(a.paygCredits), comparable ? delta(a.paygCredits - b.paygCredits, fmt) : unavailable],
        ["Budget left / over budget", cash(b.headroom), cash(a.headroom), comparable ? delta(a.headroom - b.headroom, cash) : unavailable],
        ["First month needing pay-as-you-go", timing(results.baseline), timing(results.alternative), "—"]
      ]);
    target.prepend(el("p", `Saved plan starts ${baseline.startMonth}; current plan starts ${alternative.startMonth}. Values estimate the cost of credits used, not cash paid.`, "caption"));
    if (!samePeriod) target.append(el("p", "The plans cover different periods, so differences are not calculated. Match the first month and forecast length to compare totals.", "warn"));
    if (!sameSource) target.append(el("p", sourceUnknown
      ? "The source of one or both plans is unknown or was cleared. Differences are not calculated. Save the current plan again to compare subsequent changes."
      : `The saved plan uses ${baselineSource ? baselineSource.label : "manual assumptions"}; the current plan uses ${importedSource ? importedSource.label : "manual assumptions"}. Differences are not calculated across different data selections.`, "warn"));
    if (!comparable) target.append(el("p", "The saved plan is omitted from the chart and monthly details until the plans are comparable.", "caption"));
    if (baseline.budget !== alternative.budget) target.append(el("p", "The plans use different budgets, so the change in budget left includes both the budget and estimated cost changes.", "caption"));
  }
  function chart() {
    const view = viewSettings.view, analysisError = $("scheduled-analysis-error"), legend = $("scheduled-chart-legend");
    const analysisTable = $("scheduled-analysis-table");
    $("scheduled-app").querySelectorAll("[data-chart-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.chartView === view)));
    function legendItem(label, style) { const item = el("span"), marker = el("i"); if (style) marker.className = style; marker.setAttribute("aria-hidden", "true"); item.append(marker, document.createTextNode(label)); legend.append(item); }
    analysisError.classList.add("hidden"); analysisError.textContent = ""; legend.replaceChildren(); analysisTable.replaceChildren();
    analysisTable.classList.toggle("waterfall-table", view === "phases");
    ["scheduled-chart", "scheduled-analysis-table"].forEach(id => {
      const node = $(id);
      if (view === "phases") { node.tabIndex = 0; node.setAttribute("aria-label", id === "scheduled-chart" ? "Monthly demand chart, scroll horizontally" : "Monthly demand timeline table, scroll horizontally"); }
      else { node.removeAttribute("tabindex"); node.removeAttribute("aria-label"); }
    });
    $("scheduled-series-controls").hidden = view !== "sensitivity";
    const sensLabel = $("scheduled-sensitivity").closest("label"); if (sensLabel) sensLabel.hidden = view !== "sensitivity";
    $("scheduled-overlay-note").hidden = view !== "demand" || !baselineSaved || comparablePlans();
    if (view !== "demand") {
      const sensitivity = view === "sensitivity";
      $("scheduled-chart-explanation").textContent = sensitivity
        ? "Scenarios, not predictions or confidence intervals. Low and high subtract or add the selected percentage points to monthly usage growth; all other assumptions, including purchases, remain the same. Historical actuals are not included."
        : "Starting monthly demand uses your current assumptions, which may have changed since selecting data. Each bar shows the change through a phase, including growth, rollout steps and the user cap—not an isolated effect of that phase.";
      if (!globalThis.ForecastAnalysis) {
        analysisError.textContent = "Forecast analysis could not load. Check that forecast-analysis.js is available.";
        analysisError.classList.remove("hidden"); $("scheduled-chart").replaceChildren(); return;
      }
      const analysis = sensitivity ? ForecastAnalysis.sensitivity(alternative, viewSettings.sensitivity) : ForecastAnalysis.timelineWaterfall(alternative, results.alternative);
      const errors = [...analysis.errors];
      if (sensitivity) ["low", "base", "high"].forEach(k => {
        const scenario = analysis.scenarios[k];
        if (scenario && scenario.errors.length) errors.push(`${k}: ${scenario.errors.join("; ")}`);
      });
      if (errors.length) { analysisError.textContent = errors.join("; "); analysisError.classList.remove("hidden"); }
      if (sensitivity) {
        const styles = { low: { color: "var(--cp-text)", dash: "8 5", marker: "sensitivity-low", description: "Low, dashed" }, base: { color: "var(--cp-accent)", dash: "", marker: "", description: "Base, solid" }, high: { color: "var(--cp-text-muted)", dash: "2 4", marker: "sensitivity-high", description: "High, dotted" } };
        const series = ["low", "base", "high"].filter(k => viewSettings[k] && analysis.scenarios[k] && analysis.scenarios[k].forecast).map(k => ({ label: k[0].toUpperCase() + k.slice(1), ...styles[k], months: analysis.scenarios[k].forecast.months }));
        const w = 900, h = 300, left = 75, right = 20, top = 20, bottom = 40, n = alternative.horizon;
        const max = Math.max(1, ...series.flatMap(s => s.months.map(m => m.credits))) * 1.1;
        const x = m => left + (m - 1) * (w - left - right) / Math.max(1, n - 1), y = v => h - bottom - v / max * (h - top - bottom);
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const add = (tag, attrs, text) => { const node = document.createElementNS("http://www.w3.org/2000/svg", tag); Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v)); if (text !== undefined) node.textContent = text; svg.append(node); };
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `Monthly sensitivity scenarios: ${series.length ? series.map(s => s.description).join("; ") : "no scenarios selected or available"}. Values in the table are rounded.`);
        const axis = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
        for (let i = 0; i <= 4; i++) { const v = max * i / 4; add("line", { x1: left, x2: w - right, y1: y(v), y2: y(v), stroke: "var(--cp-border)" }); add("text", { x: left - 8, y: y(v) + 4, "text-anchor": "end", fill: "var(--cp-text-muted)", "font-size": 11 }, axis.format(v)); }
        for (let i = 1; i <= n; i++) if (n <= 12 || i === 1 || i === n || i % 3 === 0) add("text", { x: x(i), y: h - 15, "text-anchor": "middle", fill: "var(--cp-text-muted)", "font-size": 11 }, `M${i}`);
        series.forEach(s => { add("polyline", { points: s.months.map(m => `${x(m.month)},${y(m.credits)}`).join(" "), fill: "none", stroke: s.color, "stroke-width": 3, "stroke-dasharray": s.dash }); s.months.forEach(m => add("circle", { cx: x(m.month), cy: y(m.credits), r: 3, fill: s.color })); legendItem(s.description, s.marker); });
        $("scheduled-chart").replaceChildren(svg);
        if (series.length) table("scheduled-analysis-table", ["Month", "Date", ...series.map(s => `${s.label} credits`)], results.alternative.months.map((m, i) => [m.month, m.date, ...series.map(s => fmt(s.months[i].credits))]));
        else analysisTable.append(el("p", "Select an available scenario to display it.", "caption"));
      } else {
        $("scheduled-chart").replaceChildren();
        if (!analysis.errors.length) {
          renderDemandTimeline($("scheduled-chart"), analysisTable, {
            startingCredits: analysis.baseline,
            intervals: analysis.phases.map(p => ({ ...p, endingCredits: p.to, change: p.delta })),
            finalMonth: alternative.horizon,
            finalDate: results.alternative.months[alternative.horizon - 1].date,
            finalCredits: analysis.lastValue,
            constant: alternative.growthMode === "constant"
          });
          if (analysis.excludedPhases.length) analysisTable.append(el("p", "Phases outside the forecast are saved but not shown.", "caption"));
        }
      }
      return;
    }
    $("scheduled-chart-explanation").textContent = "Each month's credits are covered by your prepaid credits first (blue); only what remains is billed at the pay-as-you-go price (orange). Imported actuals and a comparable saved plan, when displayed, remain separate from the current forecast.";
    const w = 900, h = 300, left = 75, right = 60, top = 20, bottom = 40;
    const showBaseline = comparablePlans() && $("scheduled-comparison").open;
    const n = showBaseline ? Math.max(baseline.horizon, alternative.horizon) : alternative.horizon;
    const max = Math.max(1, ...(showBaseline ? results.baseline.months.map(x => x.credits) : []), ...results.alternative.months.map(x => x.credits), ...actuals.map(x => x.credits)) * 1.1;
    const band = (w - left - right) / Math.max(1, n), x = m => left + (m - .5) * band, y = v => h - bottom - v / max * (h - top - bottom);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    function s(tag, attrs, text) { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if (text !== undefined) e.textContent = text; svg.append(e); return e; }
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", `Monthly credit demand as stacked bars: credits covered by prepaid, and credits billed at the pay-as-you-go price${showBaseline ? "; saved baseline total, dashed line" : ""}${actuals.length ? "; imported actual credits, dotted line" : ""}. Values in the table are rounded.`);
    const axis = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
    for (let i = 0; i <= 4; i++) { const v = max * i / 4; s("line", { x1: left, x2: w - right, y1: y(v), y2: y(v), stroke: "var(--cp-border)" }); s("text", { x: left - 8, y: y(v) + 4, "text-anchor": "end", fill: "var(--cp-text-muted)", "font-size": 11 }, axis.format(v)); }
    for (let i = 1; i <= n; i++) if (n <= 12 || i === 1 || i === n || i % 3 === 0) s("text", { x: x(i), y: h - 15, "text-anchor": "middle", fill: "var(--cp-text-muted)", "font-size": 11 }, `M${i}`);
    const prepaidColor = "#0f6cbd", paygColor = "#f7630c", barW = Math.max(4, Math.min(48, band * .7));
    results.alternative.months.forEach(m => {
      const prepaid = Math.min(m.prepaidCredits, m.credits), payg = Math.max(0, m.credits - prepaid);
      const tip = `Month ${m.month}: ${fmt(prepaid)} prepaid, ${fmt(payg)} pay-as-you-go, ${fmt(m.credits)} total`;
      s("rect", { x: x(m.month) - barW / 2, y: y(prepaid), width: barW, height: Math.max(0, y(0) - y(prepaid)), fill: prepaidColor }).append(Object.assign(document.createElementNS("http://www.w3.org/2000/svg", "title"), { textContent: tip }));
      if (payg > 0) s("rect", { x: x(m.month) - barW / 2, y: y(prepaid + payg), width: barW, height: Math.max(0, y(prepaid) - y(prepaid + payg)), fill: paygColor }).append(Object.assign(document.createElementNS("http://www.w3.org/2000/svg", "title"), { textContent: tip }));
    });
    function series(data, color, dash) {
      let segment = [];
      function flush() { if (!segment.length) return; s("polyline", { points: segment.map(v => `${x(v.month)},${y(v.credits)}`).join(" "), fill: "none", stroke: color, "stroke-width": 3, "stroke-dasharray": dash || "" }); segment.forEach(v => s("circle", { cx: x(v.month), cy: y(v.credits), r: 3, fill: color })); segment = []; }
      data.forEach(v => { if (segment.length && v.month !== segment[segment.length - 1].month + 1) flush(); segment.push(v); }); flush();
    }
    if (showBaseline) series(results.baseline.months, "var(--cp-text-muted)", "7 5");
    series(actuals, "var(--cp-success)", "2 4");
    const userColor = "#243a5e", userMax = Math.max(1, ...results.alternative.months.map(m => m.users || 0)) * 1.1;
    if (results.alternative.months.some(m => m.users > 0)) {
      const uy = v => h - bottom - v / userMax * (h - top - bottom);
      for (let i = 0; i <= 4; i++) s("text", { x: w - right + 8, y: uy(userMax * i / 4) + 4, "text-anchor": "start", fill: userColor, "font-size": 11 }, axis.format(userMax * i / 4));
      s("polyline", { points: results.alternative.months.map(m => `${x(m.month)},${uy(m.users)}`).join(" "), fill: "none", stroke: userColor, "stroke-width": 2.5 });
      results.alternative.months.forEach(m => s("circle", { cx: x(m.month), cy: uy(m.users), r: 3.5, fill: "#fff", stroke: userColor, "stroke-width": 2 }).append(Object.assign(document.createElementNS("http://www.w3.org/2000/svg", "title"), { textContent: `Month ${m.month}: ${fmt(m.users)} users` })));
    }
    const swatch = (label, color) => { const item = el("span"), box = el("i"); box.setAttribute("aria-hidden", "true"); box.style.cssText = `display:inline-block;width:12px;height:12px;border:0;border-radius:2px;background:${color};margin-right:6px;vertical-align:-1px`; item.append(box, document.createTextNode(label)); legend.append(item); };
    swatch("Prepaid credits used", prepaidColor);
    swatch("Pay-as-you-go credits", paygColor);
    if (results.alternative.months.some(m => m.users > 0)) swatch("Users (right axis)", userColor);
    if (showBaseline) legendItem("Saved baseline total, dashed", "base");
    if (actuals.length) legendItem("Imported actual credits, dotted", "actual");
    $("scheduled-chart").replaceChildren(svg);
  }
  function outputs() {
    cards(); chart(); whatIf();
    const departmentResults = results.alternative.departments;
    $("scheduled-department-csv").disabled = !departmentResults;
    if (departmentResults) {
      table("scheduled-department-totals", ["Department", "Horizon credits", "Prepaid credits used", "Pay-as-you-go credits needed", "Estimated cost"], departmentResults.map(d => [d.name, fmt(d.totals.credits), fmt(d.totals.prepaidCredits), fmt(d.totals.paygCredits), cash(d.totals.cost)]));
      table("scheduled-department-output", ["Department", "Month", "Date", "Users", "Credits / user", "Forecast credits", "Prepaid credits used", "Pay-as-you-go credits needed", "Estimated cost"], departmentResults.flatMap(d => d.months.map(m => [d.name, m.month, m.date, fmt(m.users), fmt(m.usage), fmt(m.credits), fmt(m.prepaidCredits), fmt(m.paygCredits), cash(m.cost)])));
    } else { $("scheduled-department-totals").replaceChildren(); $("scheduled-department-output").replaceChildren(el("p", "No explicit department assumptions in this plan.", "caption")); }
    const monthRows = [], includeBaseline = comparablePlans(), n = alternative.horizon;
    const headers = ["Month", "Date", "Users", "Credits / user", "Forecast credits", "Estimated cost"];
    if (includeBaseline) headers.push("Saved plan date", "Saved plan users", "Saved plan credits", "Saved plan cost");
    if (actuals.length) headers.push("Actual credits", "Actual cost", "Actual users");
    for (let i = 0; i < n; i++) {
      const b = results.baseline.months[i], a = results.alternative.months[i], actual = actuals.find(x => x.month === i + 1);
      const row = [i + 1, a ? a.date : "—", a ? fmt(a.users) : "—", a ? (alternative.departments && !a.users ? "Unavailable" : fmt(a.usage)) : "—", a ? fmt(a.credits) : "—", a ? cash(a.cost) : "—"];
      if (includeBaseline) row.push(b ? b.date : "—", b ? fmt(b.users) : "—", b ? fmt(b.credits) : "—", b ? cash(b.cost) : "—");
      if (actuals.length) row.push(actual ? fmt(actual.credits) : "—", actual ? cash(actual.cost) : "—", actual ? fmt(actual.active) : "—");
      monthRows.push(row);
    }
    table("scheduled-months", headers, monthRows);
    table("scheduled-funding", ["Month", "Date", "Prepaid credits at start", "Credits purchased", "Credits available", "Credits needed", "Prepaid credits used", "Pay-as-you-go credits needed", "Prepaid credits left", "Estimated prepaid cost", "Estimated pay-as-you-go cost", "Estimated cost of credits used", "Estimated cost to date"], results.alternative.months.map(m => [m.month, m.date, fmt(m.opening), fmt(m.purchase), fmt(m.available), fmt(m.credits), fmt(m.prepaidCredits), fmt(m.paygCredits), fmt(m.remaining), cash(m.prepaidCost), cash(m.paygCost), cash(m.cost), cash(m.cumulativeCost)]));
  }
  let importedSource = null;
  function showImportSource() {
    const box = $("scheduled-import-source");
    box.replaceChildren(); box.hidden = !importedSource && !currentDateAttribution;
    if (importedSource) {
      const g = alternative.growthMode === "phased" ? (alternative.phases[0] || {}).userGrowth : alternative.userGrowth;
      const seed = Math.round(alternative.initialUsers * (1 + (Number.isFinite(g) ? g : 0)));
      box.append(el("strong", "Selected data: "), document.createTextNode(`${importedSource.label}. In ${importedSource.month}: ${fmt(importedSource.users)} users and ${fmt(importedSource.credits)} credits (${fmt(importedSource.avg)} credits per user). Current forecast starts ${alternative.startMonth || "after you set a valid month"}. ${alternative.departments ? "" : `Month 1 applies user growth${alternative.firstMonthUsageGrowth ? " and usage growth" : ""} once (about ${fmt(seed)} users before rollout steps or a maximum). `}${importedSource.growthNote} ${importedSource.initializationNote || ""} Current inputs may differ from the selected data. Review rollout steps, user maximum, purchases and prices. Your saved comparison was not changed.`));
      if (alternative.departments) box.append(el("p", "Department mode uses your explicit group assumptions instead of these aggregate starting users and usage. Imported history is context, not a department split.", "caption"));
    }
    if (currentDateAttribution) box.append(el("p", currentDateAttribution, "caption"));
  }
  function render() {
    $("scheduled-assumption-warning").hidden = !showAssumptionWarning;
    showImportSource();
    $("scheduled-compare-shortcut").textContent = baselineSaved ? "View plan comparison" : "Save this plan to compare";
    $("scheduled-history-status").textContent = importedSource && importedSource.history.length
      ? `PowerPoint includes ${importedSource.history.length} month(s) of selected usage history through ${importedSource.month}. The forecast CSV includes projections and source caveats, not history; export history separately from Your Data.`
      : "PowerPoint and CSV use your current assumptions. The forecast CSV includes source status and any date-attribution caveat. No selected usage history is available.";
    const displayError = e => e.replace(/((?:Monthly|Phase) (?:user|usage(?: growth per user)?) growth|Monthly usage growth per user) must be a finite number of at least -1$/, "$1 must be a finite percentage of at least -100%");
    let errors = [...ForecastEngine.validateScheduledPlan(baseline).map(e => `Saved plan: ${displayError(e)}`), ...ForecastEngine.validateScheduledPlan(alternative).map(e => `Current plan: ${displayError(e)}`)];
    try { cleanCheckpoints(checkpoints); } catch (e) { errors.push(e.message); }
    const capInput = $("scheduled-growth-fields").querySelector('[data-scheduled-field="userCap"]');
    const capMissing = alternative.userGrowth > 0 && alternative.userCap == null;
    if (capMissing) errors.push("Set Max allowed users. Without a ceiling, monthly user growth would continue indefinitely.");
    if (capInput) { capInput.toggleAttribute("aria-invalid", capMissing); if (capMissing) capInput.setAttribute("aria-invalid", "true"); }
    if (actuals.some(a => a.month > alternative.horizon)) errors.push("Actuals exceed the alternative horizon; restore the horizon or clear actuals.");
    const missing = [];
    if (!alternative.departments) {
      if (!(alternative.initialUsers > 0)) missing.push(["initialUsers", "Enter Starting users, the number of people with Cowork today (greater than 0)."]);
      if (!(alternative.avgCredits > 0)) missing.push(["avgCredits", "Enter Starting credits per user per month, for example 8,000. Find it at aka.ms/copilotdashboard → Consumption Dashboard → Explore service insights."]);
    }
    if (!(alternative.paygRate > 0)) missing.push(["paygRate", "Enter the Pay-as-you-go price per credit, for example 0.01."]);
    if ((alternative.openingPool > 0 || alternative.purchases.length) && !(alternative.prepaidRate > 0)) missing.push(["prepaidRate", "Enter the Prepaid price per credit, for example 0.008, because you have prepaid credits."]);
    $("scheduled-app").querySelectorAll("[data-scheduled-field]").forEach(input => {
      const bad = attemptedView && missing.some(([key]) => key === input.dataset.scheduledField);
      if (bad) input.setAttribute("aria-invalid", "true");
      else if (!input.dataset.percent && input.dataset.scheduledField !== "userCap" && input.getAttribute("aria-invalid") && Number.isFinite(num(input.value))) input.removeAttribute("aria-invalid");
    });
    if (attemptedView) missing.forEach(([, text]) => errors.push(text));
    const waiting = missing.length > 0 && !errors.length;
    if (waiting) errors.push("");
    notice(errors.filter(Boolean).join("\n"));
    $("scheduled-app").querySelectorAll("[data-percent]").forEach(input => {
      const value = num(input.value);
      if (input.value.trim() !== "" && (!Number.isFinite(value) || value < -100)) {
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", "scheduled-errors");
      } else {
        input.removeAttribute("aria-invalid");
        if (input.getAttribute("aria-describedby") === "scheduled-errors") input.removeAttribute("aria-describedby");
      }
    });
    ["scheduled-snapshot", "scheduled-csv", "scheduled-xlsx", "scheduled-export", "scheduled-pptx", "scheduled-compare-shortcut"].forEach(id => { $(id).disabled = !!errors.length; });
    if (exportingDeck) $("scheduled-pptx").disabled = true;
    if (errors.length) {
      results = null;
      ["scheduled-summary", "scheduled-cards", "scheduled-months", "scheduled-funding", "scheduled-department-totals", "scheduled-department-output", "scheduled-analysis-table", "scheduled-chart-legend", "scheduled-whatif-results"].forEach(id => $(id).replaceChildren());
      $("scheduled-department-csv").disabled = true;
      $("scheduled-analysis-error").classList.add("hidden");
      $("scheduled-decision").textContent = waiting ? "Enter your starting users and credits per user, then select View forecast." : "The forecast is paused. Fix the highlighted message above Step 1, then select View forecast.";
      $("scheduled-chart").replaceChildren(el("p", waiting ? "Your forecast will appear here once the required inputs are entered." : "Your forecast will appear here after the inputs are corrected.", "caption"));
      $("scheduled-overlay-note").hidden = true;
      return;
    }
    results = { baseline: ForecastEngine.forecastScheduled(baseline), alternative: ForecastEngine.forecastScheduled(alternative) };
    outputs();
  }
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type })), a = el("a");
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function csv(value) { let s = String(value); if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; }
  function exportXlsx() {
    if (!globalThis.ExcelExport || !globalThis.JSZip) { $("scheduled-export-status").textContent = "Excel export could not load. Check excel-export.js and jszip.min.js."; return; }
    ExcelExport.build(alternative, results.alternative).then(blob => {
      const url = URL.createObjectURL(blob), a = el("a");
      a.href = url; a.download = "credit-forecast.xlsx"; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      $("scheduled-export-status").textContent = "Excel workbook downloaded. Edit the yellow cells on the Inputs sheet to recalculate.";
    }).catch(error => { $("scheduled-export-status").textContent = `Excel export failed: ${error.message}`; });
  }
  function exportCsv() {
    const data = [["scenario", "month", "date", "users", "credits_per_user", "credits", "opening_pool", "purchases", "prepaid_available", "prepaid_consumed", "payg_credits", "prepaid_remaining", "currency", "prepaid_value", "payg_cost", "consumption_cost", "cumulative_cost", "source_status", "date_attribution"]];
    const sourceStatus = (source, provenance) => (source
      ? (source.label.startsWith("Synthetic demo") ? "Synthetic demo" : "Imported data")
      : provenance === manualProvenance ? "Manual assumptions" : "Source unspecified") +
      (showAssumptionWarning ? " / assumptions unverified" : "");
    const scenarios = baselineSaved
      ? [["Baseline", results.baseline, baselineSource, baselineProvenance, baselineDateAttribution, baseline], ["Alternative", results.alternative, importedSource, currentProvenance, currentDateAttribution, alternative]]
      : [["Current plan", results.alternative, importedSource, currentProvenance, currentDateAttribution, alternative]];
    scenarios.forEach(([name, r, source, provenance, attribution, plan]) => r.months.forEach(m => data.push([name, m.month, m.date, m.users, plan.departments && !m.users ? "" : m.usage, m.credits, m.opening, m.purchase, m.available, m.prepaidCredits, m.paygCredits, m.remaining, currency, m.prepaidCost, m.paygCost, m.cost, m.cumulativeCost, sourceStatus(source, provenance), attribution || ""])));
    download("rollout-scheduled-monthly.csv", data.map(r => r.map(csv).join(",")).join("\r\n"), "text/csv;charset=utf-8");
  }
  function cleanPlan(p) {
    if (!p || typeof p !== "object" || Array.isArray(p)) throw new Error("Invalid scenario plan.");
    const keys = ["horizon", "currentMonth", "startMonth", "initialUsers", "userCap", "avgCredits", "userGrowth", "usageGrowth", "growthMode", "fundingMode", "openingPool", "monthlyAllocation", "prepaidRate", "paygRate", "budget"];
    const result = Object.fromEntries(keys.map(k => [k, p[k]]));
    if (p.firstMonthUsageGrowth !== undefined) result.firstMonthUsageGrowth = p.firstMonthUsageGrowth;
    ["steps", "purchases", "phases"].forEach(k => {
      if (!Array.isArray(p[k])) throw new Error(`Missing ${k} array.`);
      const fields = k === "steps" ? ["month", "users"] : k === "purchases" ? ["month", "credits"] : ["label", "month", "userGrowth", "usageGrowth"];
      result[k] = p[k].map(row => { if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`Invalid ${k} row.`); return Object.fromEntries(fields.map(f => [f, row[f]])); });
    });
    if (p.departments !== undefined) {
      if (!Array.isArray(p.departments) || !Array.isArray(p.stepTargets)) throw new Error("Invalid department assumptions or rollout targets.");
      result.departments = p.departments.map(row => {
        if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Invalid department row.");
        return { id: row.id, name: row.name, startingUsers: row.startingUsers, startingCreditsPerUser: row.startingCreditsPerUser };
      });
      result.stepTargets = p.stepTargets.map(row => {
        if (!row || typeof row !== "object" || Array.isArray(row) || !Array.isArray(row.targets)) throw new Error("Invalid department target row.");
        return { month: row.month, targets: row.targets.map(target => {
          if (!target || typeof target !== "object" || Array.isArray(target)) throw new Error("Invalid department target.");
          return { departmentId: target.departmentId, users: target.users };
        }) };
      });
    } else if (p.stepTargets !== undefined) throw new Error("Department targets require departments.");
    const errors = ForecastEngine.validateScheduledPlan(result);
    if (errors.length) throw new Error(errors.join("; "));
    return result;
  }
  function normalizeImported(plan) {
    if (plan.growthMode === "phased" && plan.phases.length) {
      plan.userGrowth = plan.phases[0].userGrowth; plan.usageGrowth = plan.phases[0].usageGrowth;
    }
    plan.growthMode = "constant"; plan.fundingMode = "pool";
    plan.userGrowth = Math.max(0, plan.userGrowth);
    plan.phases = [{ label: "Initial", month: 1, userGrowth: plan.userGrowth, usageGrowth: plan.usageGrowth }];
    return plan;
  }
  function parseActuals(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r\n|\n|\r/).filter(s => s.trim());
    if (!lines.length || lines[0].trim() !== "month,credits,cost,active") throw new Error("CSV header must be exactly month,credits,cost,active.");
    const re = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/, seen = new Set();
    return lines.slice(1).map((line, i) => {
      const parts = line.split(",").map(x => x.trim());
      if (parts.length !== 4 || parts.some(x => !re.test(x))) throw new Error(`Invalid numeric CSV row ${i + 2}.`);
      const [month, credits, cost, active] = parts.map(Number);
      if (![month, credits, cost, active].every(Number.isFinite) || !Number.isInteger(month) || month < 1 || month > alternative.horizon || seen.has(month) || credits < 0 || cost < 0 || active < 0) throw new Error(`Invalid or duplicate month or negative value in CSV row ${i + 2}.`);
      seen.add(month); return { month, credits, cost, active };
    }).sort((a, b) => a.month - b.month);
  }
  async function load(input, action) {
    const file = input.files[0]; if (!file) return;
    try { if (file.size > 1000000) throw new Error("File must be no larger than 1 MB."); action(await file.text()); render(); }
    catch (e) { notice(`Import failed: ${e.message}`); }
    finally { input.value = ""; }
  }
  function actualStatus() { $("scheduled-actual-status").textContent = actuals.length ? `${actuals.length} actual months imported locally, anchored to forecast start ${actualsStartMonth}; forecasts remain independent. Clear actuals before changing the first forecast month.` : "No actuals imported."; }
  function checkActualPeriod(plan) {
    if (actuals.length && plan.startMonth !== actualsStartMonth) throw new Error(`Actuals are anchored to ${actualsStartMonth}. Clear actuals before changing the first forecast month.`);
    if (actuals.some(x => x.month > plan.horizon)) throw new Error("Clear actuals before using a shorter forecast that excludes their months.");
  }
  $("scheduled-comparison").addEventListener("toggle", () => { if (results) chart(); });
  function switchModel() {
    const legacy = $("legacy-app").hidden;
    $("legacy-app").hidden = !legacy; $("scheduled-app").hidden = legacy;
  }
  $("switch-model").addEventListener("click", switchModel);
  $("return-scheduled").addEventListener("click", switchModel);
  $("scheduled-app").addEventListener("change", event => {
    const input = event.target;
    if (input.dataset.scheduledField || input.dataset.scheduledRow || input.dataset.schedule || input.dataset.targetIndex !== undefined) planEstablished = true;
    if (input.dataset.schedule) {
      if (!setSchedule(input.dataset.schedule, Number(input.dataset.month), input.value)) {
        input.setAttribute("aria-invalid", "true"); notice("Schedule values must be non-negative numbers; leave a cell blank to use the standard assumptions."); return;
      }
      input.removeAttribute("aria-invalid");
      const entry = (input.dataset.schedule === "users" ? alternative.steps : alternative.purchases).find(item => item.month === Number(input.dataset.month));
      input.value = entry ? inputNumber(entry[input.dataset.schedule]) : "";
      departmentEditor(); render();
    } else if (input.dataset.scheduledField) {
      const key = input.dataset.scheduledField;
      if (key === "startMonth" && actuals.length && input.value !== actualsStartMonth) {
        input.value = alternative.startMonth;
        notice(`Actuals are anchored to ${actualsStartMonth}. Clear actuals before changing the first forecast month.`);
        return;
      }
      const blank = input.value.trim() === "" && !["startMonth", "horizon"].includes(key);
      alternative[key] = key === "userCap" && blank ? null : blank ? 0 : key === "startMonth" ? input.value : num(input.value) / (input.dataset.percent ? 100 : 1);
      if (key === "horizon" && Number.isInteger(alternative.horizon) && alternative.horizon >= 1 && alternative.currentMonth > alternative.horizon) alternative.currentMonth = alternative.horizon;
      if (blank) input.removeAttribute("aria-invalid");
      else if (input.dataset.formatted && Number.isFinite(alternative[key])) {
        input.value = inputValue(alternative[key], input.dataset.formatted === "currency");
        input.removeAttribute("aria-invalid");
      } else if (input.dataset.formatted && !(key === "userCap" && alternative[key] === null)) {
        input.setAttribute("aria-invalid", "true");
      }
      if (key === "horizon" || key === "startMonth") scheduleEditor();
      render();
    } else if (input.dataset.targetIndex !== undefined) {
      const step = alternative.steps[Number(input.dataset.targetIndex)], group = alternative.departments[Number(input.dataset.targetGroup)];
      const entry = alternative.stepTargets.find(target => target.month === step.month), target = entry && entry.targets.find(item => item.departmentId === group.id);
      if (target) target.users = num(input.value);
      render();
    } else if (input.id === "scheduled-chart-view") {
      viewSettings.view = input.value; if (results) chart();
    } else if (input.dataset.exportView) {
      exportViews[input.dataset.exportView] = input.checked;
      if (Object.hasOwn(exportViewOverrides, input.dataset.exportView)) exportViewOverrides[input.dataset.exportView] = true;
    } else if (input.id === "scheduled-sensitivity") {
      viewSettings.sensitivity = num(input.value); if (results) chart();
    } else if (/^scheduled-show-(low|base|high)$/.test(input.id)) {
      viewSettings[input.id.slice(15)] = input.checked; if (results) chart();
    } else if (input.dataset.scheduledRow) {
      const rowIndex = Number(input.dataset.rowIndex), kind = input.dataset.scheduledRow, key = input.dataset.rowKey;
      const oldMonth = kind === "steps" && key === "month" ? alternative.steps[rowIndex].month : null;
      if (oldMonth !== null) {
        const month = num(input.value);
        if (!Number.isInteger(month) || month < 1 || month > 36 || alternative.steps.some((step, i) => i !== rowIndex && step.month === month)) {
          input.value = oldMonth;
          notice("Rollout step month must be a unique whole number from 1 to 36. The previous month and department targets were retained.");
          return;
        }
      }
      alternative[input.dataset.scheduledRow][Number(input.dataset.rowIndex)][input.dataset.rowKey] = input.type === "text" ? input.value : num(input.value) / (input.dataset.percent ? 100 : 1);
      if (input.dataset.numeric) {
        const value = num(input.value);
        alternative[input.dataset.scheduledRow][Number(input.dataset.rowIndex)][input.dataset.rowKey] = value;
        if (Number.isFinite(value)) { input.value = inputValue(value, false); input.removeAttribute("aria-invalid"); }
        else input.setAttribute("aria-invalid", "true");
      }
      if (oldMonth !== null && alternative.stepTargets) {
        const target = alternative.stepTargets.find(item => item.month === oldMonth);
        if (target) target.month = alternative.steps[rowIndex].month;
      }
      if (kind === "steps" || kind === "departments") departmentEditor();
      render();
    } else if (input.id === "scheduled-actual-import") load(input, text => {
      if (!/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(alternative.startMonth) || alternative.startMonth.slice(0, 4) === "0000") throw new Error("Set a valid first forecast month before importing actuals.");
      const parsed = parseActuals(text); actuals = parsed; actualsStartMonth = parsed.length ? alternative.startMonth : null; actualStatus();
    });
    else if (input.id === "scheduled-import") load(input, text => {
      const data = JSON.parse(text);
      if (data.version === 1) throw new Error("Version 1 uses the earlier model. Open 'Open an earlier version 1 scenario' below, then import it there. Its calculations are not silently converted.");
      if (data.version !== 2 || data.model !== "scheduled") throw new Error("Expected a version 2 scheduled scenario export.");
      if (data.currency !== undefined && !["USD", "EUR", "GBP"].includes(data.currency)) throw new Error("Scenario currency must be USD, EUR or GBP.");
      if (data.decisionNote !== undefined && (typeof data.decisionNote !== "string" || data.decisionNote.length > 300)) throw new Error("Decision note must be text of 300 characters or fewer.");
      const savedAttribution = cleanDateAttribution(data.baselineDateAttribution), currentAttribution = cleanDateAttribution(data.dateAttribution);
      const b = normalizeImported(cleanPlan(data.baseline)), a = normalizeImported(cleanPlan(data.alternative));
      const importedCheckpoints = cleanCheckpoints(data.checkpoints), importedBaselineCheckpoints = data.baselineCheckpoints == null ? null : cleanCheckpoints(data.baselineCheckpoints), importedView = cleanViewSettings(data.viewSettings), importedExportViews = cleanExportViews(data.exportViews), importedOverrides = cleanExportViewOverrides(data.exportViewOverrides, data.exportViews !== undefined);
      checkActualPeriod(a);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      baseline = b; alternative = a; currency = data.currency || "USD"; baselineSaved = data.baselineSaved !== false; baselineSource = null; importedSource = null;
      planEstablished = true;
      mayHaveIllustrativeAssumptions = true; showAssumptionWarning = true;
      checkpoints = importedCheckpoints; baselineCheckpoints = importedBaselineCheckpoints; viewSettings = importedView; exportViews = importedExportViews; exportViewOverrides = importedOverrides; syncViewSettings();
      $("scheduled-manual-source").hidden = true;
      baselineDateAttribution = savedAttribution; currentDateAttribution = currentAttribution;
      baselineProvenance = Symbol("unknown"); currentProvenance = Symbol("unknown");
      $("scheduled-decision-note").value = data.decisionNote || ""; editors();
    });
  });
  $("scheduled-app").addEventListener("click", event => {
    const b = event.target.closest("button"); if (!b) return;
    if (b.dataset.scheduledRemove || [
      "add-scheduled-department",
      "scheduled-snapshot", "scheduled-compare-shortcut", "scheduled-restore"
    ].includes(b.id)) planEstablished = true;
    if (b.dataset.chartView) {
      viewSettings.view = b.dataset.chartView;
      $("scheduled-chart-view").value = viewSettings.view;
      if (results) chart();
      return;
    }
    if (b.dataset.scheduledRemove) {
      const kind = b.dataset.scheduledRemove, index = Number(b.dataset.rowIndex), removed = alternative[kind][index];
      alternative[kind].splice(index, 1);
      if (kind === "steps" && alternative.stepTargets) alternative.stepTargets = alternative.stepTargets.filter(target => target.month !== removed.month);
      if (kind === "departments") {
        alternative.stepTargets.forEach(target => { target.targets = target.targets.filter(item => item.departmentId !== removed.id); });
        if (!alternative.departments.length) { delete alternative.departments; delete alternative.stepTargets; }
      }
      editors(); render();
    }
    else if (b.id === "add-scheduled-department") {
      if (!alternative.departments) {
        alternative.departments = []; alternative.stepTargets = alternative.steps.map(s => ({ month: s.month, targets: [] }));
        if (!exportViewOverrides.departments) { exportViews.departments = true; syncViewSettings(); }
      }
      if (alternative.departments.length >= 50) { notice("A maximum of 50 departments is supported."); return; }
      let n = 1; while (alternative.departments.some(d => d.id === `department-${n}`)) n++;
      const id = `department-${n}`;
      alternative.departments.push({ id, name: `Department ${n}`, startingUsers: 0, startingCreditsPerUser: 0 });
      alternative.stepTargets.forEach(target => target.targets.push({ departmentId: id, users: 0 }));
      editors(); render();
    }
    else if (b.classList.contains("view-forecast")) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      attemptedView = true;
      render();
      const firstBad = $("scheduled-app").querySelector('[data-scheduled-field][aria-invalid="true"]');
      const target = results ? $("forecast-results") : $("scheduled-errors");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.setAttribute("tabindex", "-1"); target.focus({ preventScroll: true });
      if (!results && firstBad) setTimeout(() => firstBad.focus({ preventScroll: true }), 400);
    }
    else if (b.id === "scheduled-snapshot" && results) { baseline = copy(alternative); baselineCheckpoints = copy(checkpoints); baselineSource = importedSource ? copy(importedSource) : null; baselineDateAttribution = currentDateAttribution; baselineProvenance = currentProvenance; baselineSaved = true; render(); }
    else if (b.id === "scheduled-compare-shortcut" && results) {
      const creating = !baselineSaved;
      if (creating) { baseline = copy(alternative); baselineCheckpoints = copy(checkpoints); baselineSource = importedSource ? copy(importedSource) : null; baselineDateAttribution = currentDateAttribution; baselineProvenance = currentProvenance; baselineSaved = true; }
      $("scheduled-comparison").open = true; render();
      const target = creating ? $("scheduled-fields") : $("scheduled-comparison");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (creating) target.querySelector("input").focus({ preventScroll: true });
      else target.querySelector("summary").focus({ preventScroll: true });
    }
    else if (b.id === "scheduled-restore" && baselineSaved) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      try { checkActualPeriod(baseline); } catch (e) { notice(e.message); return; }
      alternative = copy(baseline); if (baselineCheckpoints !== null) checkpoints = copy(baselineCheckpoints);
      importedSource = baselineSource ? copy(baselineSource) : null; currentDateAttribution = baselineDateAttribution; currentProvenance = baselineProvenance; editors(); render();
      if (baselineCheckpoints === null) notice("This older scenario did not save baseline checkpoints. Current checkpoints were retained.");
    }
    else if (b.id === "scheduled-actual-clear") { actuals = []; actualsStartMonth = null; actualStatus(); render(); }
    else if (b.id === "scheduled-xlsx" && results) exportXlsx();
    else if (b.id === "scheduled-csv" && results) exportCsv();
    else if (b.id === "scheduled-department-csv" && results && results.alternative.departments) {
      const data = [["department", "month", "date", "users", "credits_per_user", "credits", "prepaid_credits", "payg_credits", "currency", "prepaid_cost", "payg_cost", "cost"]];
      results.alternative.departments.forEach(d => d.months.forEach(m => data.push([d.name, m.month, m.date, m.users, m.usage, m.credits, m.prepaidCredits, m.paygCredits, currency, m.prepaidCost, m.paygCost, m.cost])));
      if (showAssumptionWarning) { data[0].push("assumption_status"); data.slice(1).forEach(row => row.push("Unverified; review assumptions")); }
      download("rollout-departments-monthly.csv", data.map(r => r.map(csv).join(",")).join("\r\n"), "text/csv;charset=utf-8");
    }
    else if (b.id === "scheduled-export" && results) {
      try { cleanViewSettings(viewSettings); } catch (e) { notice(e.message); return; }
      download("rollout-scheduled-scenarios.json", JSON.stringify({ version: 2, model: "scheduled", baseline: cleanPlan(baseline), baselineSaved, alternative: cleanPlan(alternative), currency, dateAttribution: currentDateAttribution, baselineDateAttribution, decisionNote: $("scheduled-decision-note").value, checkpoints: cleanCheckpoints(checkpoints), baselineCheckpoints: baselineCheckpoints === null ? null : cleanCheckpoints(baselineCheckpoints), viewSettings: cleanViewSettings(viewSettings), exportViews: cleanExportViews(exportViews), exportViewOverrides: cleanExportViewOverrides(exportViewOverrides, true), ...(showAssumptionWarning ? { assumptionsUnverified: true } : {}) }, null, 2), "application/json");
    }
    else if (b.id === "scheduled-pptx" && results && !exportingDeck) {
      try { cleanViewSettings(viewSettings); } catch (e) { $("scheduled-export-status").textContent = e.message; return; }
      if (!globalThis.ForecastDeck || typeof globalThis.ForecastDeck.export !== "function") {
        $("scheduled-export-status").textContent = "The PowerPoint export could not load. Check that the app's local files are available.";
        return;
      }
      const source = importedSource ? (importedSource.label.startsWith("Synthetic demo") ? "Synthetic demo" : "Imported data") : currentProvenance === manualProvenance ? "Manual assumptions" : "Source unspecified";
      const context = {
        plan: copy(alternative), result: copy(results.alternative),
        baselinePlan: baselineSaved ? copy(baseline) : null,
        baselineResult: baselineSaved ? copy(results.baseline) : null,
        baselineComparable: !baselineSaved || sourceComparison() === "same",
        baselineSourceComparison: baselineSaved ? sourceComparison() : "same",
        source, sourceDetail: (showAssumptionWarning ? "Unverified assumptions; review all values. " : "") + (importedSource ? importedSource.label : ""), currency,
        dateAttribution: currentDateAttribution,
        history: importedSource ? copy(importedSource.history) : [],
        decisionNote: $("scheduled-decision-note").value,
        viewSettings: copy(viewSettings), checkpoints: copy(checkpoints),
        views: Object.assign({}, exportViews, { [viewSettings.view === "demand" ? "trend" : viewSettings.view]: true }),
        onProgress: message => { $("scheduled-export-status").textContent = message + "…"; }
      };
      exportingDeck = true;
      b.disabled = true;
      ForecastDeck.export(context).then(() => {
        $("scheduled-export-status").textContent = "PowerPoint created. Review it before sharing.";
      }).catch(error => {
        $("scheduled-export-status").textContent = `PowerPoint export failed: ${error.message}`;
      }).finally(() => { exportingDeck = false; b.disabled = !results; });
    }
  });
  window.addEventListener("consumption:clear", () => {
    if (baselineProvenance !== manualProvenance) baselineProvenance = Symbol("unknown");
    if (currentProvenance !== manualProvenance) currentProvenance = Symbol("unknown");
    baselineSource = null; importedSource = null;
    baselineDateAttribution = null; currentDateAttribution = null;
    render();
  });
  document.addEventListener("consumption:manual", event => {
    event.detail.handled = true;
    const hasPlan = JSON.stringify(alternative) !== JSON.stringify(initial) || baselineSaved ||
      actuals.length > 0 || currency !== "USD" || currentProvenance !== manualProvenance ||
      $("scheduled-decision-note").value !== "" || checkpoints.length > 0 || JSON.stringify(viewSettings) !== JSON.stringify(defaultViewSettings()) || JSON.stringify(exportViews) !== JSON.stringify(defaultExportViews()) || JSON.stringify(exportViewOverrides) !== JSON.stringify(defaultExportViewOverrides());
    if (hasPlan && !(event.detail && event.detail.confirmed)) {
      event.preventDefault();
      return;
    }
    planEstablished = false;
    mayHaveIllustrativeAssumptions = false; showAssumptionWarning = false;
    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const startMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    alternative = {
      horizon: 12, currentMonth: 0, startMonth, initialUsers: 0, userCap: null,
      avgCredits: 0, userGrowth: 0, usageGrowth: 0, growthMode: "constant",
      phases: [{ label: "Initial", month: 1, userGrowth: 0, usageGrowth: 0 }],
      steps: [], fundingMode: "pool", openingPool: 0, purchases: [], monthlyAllocation: 0,
      prepaidRate: 0, paygRate: 0.01, budget: 0
    };
    if (/[?&]prefill\b/.test(location.search)) Object.assign(alternative, { initialUsers: 178, avgCredits: 8000, userGrowth: .05, usageGrowth: .03, userCap: 2000, openingPool: 94000000, prepaidRate: .008, budget: 3000000 });
    attemptedView = false;
    baseline = copy(alternative); baselineCheckpoints = []; baselineSaved = false; baselineSource = null; importedSource = null;
    baselineProvenance = currentProvenance = manualProvenance;
    baselineDateAttribution = currentDateAttribution = null;
    actuals = []; actualsStartMonth = null; currency = "USD";
    checkpoints = []; viewSettings = defaultViewSettings(); exportViews = defaultExportViews(); exportViewOverrides = defaultExportViewOverrides(); syncViewSettings();
    $("scheduled-decision-note").value = "";
    $("scheduled-export-status").textContent = "";
    $("scheduled-comparison").open = false;
    $("scheduled-manual-source").hidden = false;
    $("legacy-app").hidden = true; $("scheduled-app").hidden = false;
    notice(""); editors(); actualStatus(); render();
  });
  document.addEventListener("consumption:apply", event => {
    const d = event.detail || {};
    const month = typeof d.month === "string" && /^(\d{4})-(0[1-9]|1[0-2])$/.test(d.month) ? d.month : null;
    const fail = text => { event.preventDefault(); notice(text); };
    if (alternative.departments) return fail("Remove the explicit department assumptions before applying imported aggregate data. Imported data cannot provide a department split; export your scenario first to retain the group assumptions.");
    if (!month) return fail("Imported month must be YYYY-MM.");
    if (!Number.isSafeInteger(d.users) || d.users <= 0) return fail("Cannot calculate average credits per user: imported users must be greater than zero.");
    if (typeof d.sourceKey !== "string" || d.sourceKey.length > 1024) return fail("Imported data selection is invalid.");
    if (typeof d.credits !== "number" || !Number.isFinite(d.credits) || d.credits < 0) return fail("Imported credits must be a finite non-negative number.");
    let dateAttribution;
    try { dateAttribution = cleanDateAttribution(d.dateAttribution); } catch (error) { return fail(error.message); }
    if (!Array.isArray(d.history) || d.history.some((item, index) =>
      !item || typeof item.month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) ||
      item.month > month || (index > 0 && item.month <= d.history[index - 1].month) ||
      typeof item.credits !== "number" || !Number.isFinite(item.credits) ||
      !Number.isSafeInteger(item.users) || item.users < 0 ||
      !["complete", "unknown"].includes(item.completeness))) return fail("Imported monthly history is invalid.");
    if (d.growth && (!Number.isFinite(d.growth.users) || !Number.isFinite(d.growth.usage) || d.growth.users < -1 || d.growth.usage < -1)) return fail("Historical growth rates must be finite and at least -100%.");
    if (d.demoRollout !== undefined && (d.demoRollout !== true || d.isDemo !== true || typeof d.label !== "string" || !d.label.startsWith("Synthetic demo · ") || d.growth != null || d.dateAttribution !== undefined))
      return fail("Fictional demo rollout selection is invalid.");
    const idx = Number(month.slice(0, 4)) * 12 + Number(month.slice(5));
    const start = `${String(Math.floor(idx / 12)).padStart(4, "0")}-${String(idx % 12 + 1).padStart(2, "0")}`;
    try { checkActualPeriod({ startMonth: start, horizon: alternative.horizon }); } catch (e) {
      fail(e.message);
      $("tab-model").click();
      $("scheduled-errors").setAttribute("tabindex", "-1"); $("scheduled-errors").focus();
      return;
    }
    if (d.demoRollout) {
      const currentGrowth = { userGrowth: alternative.userGrowth, usageGrowth: alternative.usageGrowth };
      const initialGrowth = { userGrowth: initial.userGrowth, usageGrowth: initial.usageGrowth };
      if (JSON.stringify(currentGrowth) !== JSON.stringify(initialGrowth) &&
          !window.confirm("Use fictional demo growth rates? This replaces your current monthly growth rates. Other assumptions and your schedule remain unchanged.")) {
        event.preventDefault();
        return;
      }
    }
    const initializeImportedPlan = d.isDemo !== true && !planEstablished;
    if (d.isDemo !== true && !initializeImportedPlan && mayHaveIllustrativeAssumptions &&
        !window.confirm("The current plan may still contain fictional demo values or unverified scenario assumptions, including growth, prepaid credits, prices and budget. Continue and retain these assumptions? Select Cancel to review or reset the plan before applying this data.")) {
      d.cancelled = true;
      event.preventDefault();
      return;
    }
    if (initializeImportedPlan) {
      alternative.openingPool = 0; alternative.monthlyAllocation = 0;
      alternative.prepaidRate = 0; alternative.paygRate = 0.01; alternative.budget = 0;
      alternative.userGrowth = 0; alternative.usageGrowth = 0; alternative.growthMode = "constant";
      alternative.phases = [{ label: "Initial", month: 1, userGrowth: 0, usageGrowth: 0 }];
      mayHaveIllustrativeAssumptions = false; showAssumptionWarning = false;
    }
    if (d.isDemo !== true) {
      planEstablished = true;
      if (mayHaveIllustrativeAssumptions) showAssumptionWarning = true;
    }
    const avg = d.credits / d.users;
    alternative.initialUsers = d.users; alternative.avgCredits = avg; alternative.startMonth = start; alternative.currentMonth = 0; alternative.firstMonthUsageGrowth = false;
    if (d.growth) {
      alternative.growthMode = "constant";
      alternative.userGrowth = Math.max(0, d.growth.users);
      alternative.usageGrowth = d.growth.usage;
    } else if (d.demoRollout) {
      mayHaveIllustrativeAssumptions = true;
      alternative.growthMode = "constant";
      alternative.userGrowth = .01; alternative.usageGrowth = .01;
    }
    if (alternative.userGrowth > 0 && alternative.userCap == null) alternative.userCap = Math.max(d.users * 2, 1);
    if (initializeImportedPlan) baseline = copy(alternative);
    importedSource = { users: d.users, credits: d.credits, avg, month, start, label: String(d.label || "Imported data").slice(0, 160), sourceKey: d.sourceKey, history: copy(d.history), dateAttribution,
      growthNote: d.demoRollout ? "Fictional demo growth rates replaced the previous monthly rates; these example rates are not predictions." : d.growth ? `Growth assumptions use the observed change from ${d.growth.priorMonth} to ${month} (negative user growth is treated as zero); they are not predictions.` : initializeImportedPlan ? "Growth rates were initialized to zero." : "Growth assumptions remain unchanged.",
      initializationNote: initializeImportedPlan ? "Prepaid credits, prices and budget were initialized to zero. Enter your values and review growth rates before using this forecast." : "" };
    currentDateAttribution = dateAttribution;
    currentProvenance = `data:${d.sourceKey}`;
    $("scheduled-manual-source").hidden = true;
    $("legacy-app").hidden = true; $("scheduled-app").hidden = false;
    notice(""); editors(); render();
  });
  syncViewSettings(); editors(); actualStatus(); render();
})();
