(() => {
  "use strict";
  const root = document.getElementById("data-panel");
  if (!root) return;
  const CD = globalThis.ConsumptionData;
  const fmt = v => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(v);
  const $ = id => document.getElementById(id);
  const h = (tag, text, cls, attrs) => {
    const n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (cls) n.className = cls;
    if (attrs) for (const k of Object.keys(attrs)) n.setAttribute(k, attrs[k]);
    return n;
  };
  const REQUIRED = [["date", "Date"], ["credits", "Credits"], ["person", "Person"]];
  const OPTIONAL = [["historicalId", "Historical ID"], ["serviceId", "Service ID"], ["serviceName", "Service name"], ["policyId", "Policy ID"], ["organization", "Organization"]];
  const DATE_ATTRIBUTION = "Rows are assigned to the month of their listed date. Weekly rows may span months, so totals may differ from calendar-month usage, even when coverage is complete.";
  const DEMO_DATE_ATTRIBUTION = "Synthetic demo credits are assigned to their listed month.";
  const NONE = "__none";
  const state = { source: null, dataset: null, demo: false, name: "", mapping: {}, ignored: {}, metadataKey: "", dateOrder: "ISO", coverageOpen: false, complete: new Set(), sel: { attr: "", value: "", breakdown: "", baseline: "", ack: false, growth: "manual" } };
  let seq = 0;

  const tabs = [$("tab-data"), $("tab-model")], panels = [$("panel-data"), $("panel-model")];
  let modelStarted = false;
  function selectTab(i, focus) {
    tabs.forEach((t, j) => { t.setAttribute("aria-selected", String(i === j)); t.tabIndex = i === j ? 0 : -1; panels[j].hidden = i !== j; });
    $("switch-model").hidden = i === 0;
    if (i === 1) modelStarted = true;
    if (focus) tabs[i].focus();
  }
  function requestTab(i, focus) {
    if (i === 1 && !modelStarted) startManual();
    else selectTab(i, focus);
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => requestTab(i, false));
    t.addEventListener("keydown", e => {
      const k = { ArrowRight: (i + 1) % 2, ArrowLeft: (i + 1) % 2, Home: 0, End: 1 }[e.key];
      if (k !== undefined) { e.preventDefault(); requestTab(k, true); }
    });
  });
  selectTab(0);
  document.querySelector(".tabs").hidden = true;
  $("panel-data").hidden = true;
  window.addEventListener("load", () => requestTab(1));
  const status = h("div", null, "bad", { role: "alert" });
  status.hidden = true;
  const body = h("div");
  function error(msg) { status.textContent = msg || ""; status.hidden = !msg; }

  function startManual(confirmed = false) {
    const request = new CustomEvent("consumption:manual", { cancelable: true, detail: { confirmed, handled: false } });
    const accepted = document.dispatchEvent(request);
    if (!request.detail.handled) {
      error("The forecast could not load. Check that the app's local files are available.");
      return;
    }
    if (!accepted) {
      $("manual-forecast-confirm").showModal();
      return;
    }
    error("");
    selectTab(1, true);
  }
  $("manual-forecast-cancel").addEventListener("click", () => $("manual-forecast-confirm").close());
  $("manual-forecast-confirm-start").addEventListener("click", () => {
    $("manual-forecast-confirm").close();
    startManual(true);
  });
  function manualButton() {
    const button = h("button", "Start with assumptions");
    button.type = "button";
    button.addEventListener("click", () => startManual());
    return button;
  }
  function manualOnlyChoice() {
    const choice = h("div", null, "import-source");
    choice.append(h("h3", "Step 2: Choose how to forecast", "data-step-title"),
      h("p", "You can also skip the data selection and start a forecast with your own assumptions.", "caption"),
      manualButton());
    return choice;
  }

  function frame() {
    root.replaceChildren(
      h("div", "No data to upload? Open the Modeling tab to start with your own assumptions. Return to Modeling later to continue your current forecast.", "notice modeling-notice"),
      h("div", "Your files stay in this browser tab and are not uploaded. Clear data removes the imported rows and asks Modeling to clear retained history and provenance; values already sent to Modeling may remain. Exported scenarios may contain those values.", "notice"),
      status, body);
  }
  frame();

  function renderAll() {
    body.replaceChildren(sourceCard());
    if (state.source && !state.dataset) body.append(mappingCard());
    if (state.dataset) { body.append(completenessCard()); body.append(selectionCard()); }
  }

  function sourceCard() {
    const card = h("div", null, "card");
    card.append(h("h3", "Step 1: Where you are", "data-step-title"),
      h("p", "Upload your usage or explore the fictional demo to understand your starting point.", "caption"),
      h("p", "Choose a Viva Insights Consumption query ZIP or a CSV with usage and organization details, or try the demo. Limits: 64 MB per file, 128 MB extracted, 200,000 rows, 4 million input fields or joined attribute cells, and 600 observed months. Grouping is limited to 5,000 groups and 250,000 group/month cells.", "caption"));
    const guide = h("div", null, "viva-guide");
    guide.append(h("h4", "Get your usage data from Viva Insights"));
    const steps = h("ol");
    [
      "Open the Viva Insights web app. You need the Insights Analyst role and access to the global partition.",
      "Select Create analysis → Create custom query → Consumption query. Choose your date range.",
      "Under More Settings, group by Day or Month for calendar-month totals. Keep all preselected metrics, and select any organization attributes you need.",
      "Add a ServiceName condition for one Microsoft 365 Copilot service, such as Cowork. Verify the service is not GitHub; its credits are separate.",
      "Run the query. In Analysis results, wait for Success and download the CSV results ZIP. Upload that ZIP below."
    ].forEach(text => steps.append(h("li", text)));
    guide.append(steps, h("p", "The app cannot verify an opaque service name or ID. Confirm the selected service before importing. GitHub credits are not combined with Microsoft 365 credits.", "caption"),
      h("p", "The download contains person-level data. Follow your organization’s data-handling policies.", "caption"));
    const links = h("div", null, "actions");
    links.append(
      h("a", "Open Viva Insights", null, { href: "https://go.microsoft.com/fwlink/?linkid=2201482", target: "_blank", rel: "noopener noreferrer" }),
      h("a", "Microsoft’s query instructions", null, { href: "https://learn.microsoft.com/en-us/viva/insights/advanced/analyst/ai-cost-query", target: "_blank", rel: "noopener noreferrer" })
    );
    guide.append(links); card.append(guide);
    const actions = h("div", null, "actions");
    const file = h("input", null, null, { type: "file", accept: ".zip,.csv", "aria-label": "Consumption ZIP or joined CSV" });
    file.id = "cu-file"; file.style.maxWidth = "320px";
    file.addEventListener("change", () => file.files[0] && load(file.files[0]));
    const demo = h("button", "View Demo", "primary"); demo.type = "button";
    demo.addEventListener("click", loadDemo);
    const clear = h("button", "Clear data"); clear.type = "button";
    clear.addEventListener("click", () => { clearAll(); window.dispatchEvent(new CustomEvent("consumption:clear")); });
    actions.append(file, demo, clear);
    card.append(actions);
    if (state.demo) card.append(h("p", "SYNTHETIC DEMO — a fictional five-month rollout reaching 1,000 users, with varied usage levels. It is not based on real data.", "warn"));
    else if (state.name) card.append(h("p", `Loaded in memory: ${state.name}`, "caption"));
    if (!state.dataset) {
      const skip = h("div", null, "skip-data"), actions = h("div", null, "forecast-action");
      skip.append(h("h4", "Step 2: Choose how to forecast", "data-step-title"),
        h("p", "After reviewing usage, you can forecast from that data. Or skip the upload and start with your own assumptions.", "caption"));
      actions.append(manualButton());
      skip.append(actions);
      card.append(skip);
    }
    return card;
  }

  function clearAll() {
    seq++;
    state.source = state.dataset = null; state.demo = false; state.name = ""; state.mapping = {}; state.ignored = {}; state.metadataKey = ""; state.dateOrder = "ISO"; state.coverageOpen = false;
    state.complete = new Set(); state.sel = { attr: "", value: "", breakdown: "", baseline: "", ack: false, growth: "manual" };
    error(""); renderAll();
  }
  function loadDemo() {
    try {
      clearAll();
      state.dataset = CD.demo(); state.demo = true; state.name = "Synthetic demo";
      state.complete = new Set(state.dataset.months.filter(m => state.dataset.completeness[m] === "complete"));
      state.sel.baseline = state.dataset.months[state.dataset.months.length - 1];
      state.sel.breakdown = "Organization";
      state.sel.growth = "demo";
      renderAll();
    } catch (e) { error("Demo failed: " + e.message); }
  }
  async function load(file) {
    const my = ++seq;
    clearAll(); seq = my;
    try {
      if (!CD) throw new Error("consumption-data.js is not available.");
      if (file.size > 64 * 1024 * 1024) throw new Error("File exceeds the 64 MB input limit.");
      if (/\.zip$/i.test(file.name) && !globalThis.JSZip) throw new Error("ZIP support (jszip.min.js) is not loaded; use a joined CSV instead.");
      const src = await CD.inspect(file);
      if (my !== seq) return;
      state.source = src; state.name = file.name;
      for (const [role] of REQUIRED.concat(OPTIONAL)) {
        const c = src.candidates[role] || [];
        if (c.length === 1) state.mapping[role] = c[0];
        else if (!c.length && OPTIONAL.some(o => o[0] === role)) state.mapping[role] = NONE;
        else state.mapping[role] = "";
      }
      if (src.metadata) { const c = (src.metadataCandidates && src.metadataCandidates.historicalId) || []; state.metadataKey = c.length === 1 ? c[0] : ""; }
      renderAll();
    } catch (e) { if (my === seq) { error("Could not read file: " + e.message); renderAll(); } }
  }

  function selectField(label, options, value, onChange, id) {
    const wrap = h("label", label);
    const s = document.createElement("select");
    if (id) s.id = id;
    options.forEach(([v, t]) => { const o = h("option", t); o.value = v; s.append(o); });
    s.value = value;
    s.addEventListener("change", () => onChange(s.value));
    wrap.append(s);
    return wrap;
  }

  function mappingCard() {
    const src = state.source, card = h("div", null, "card"), headers = src.metrics.headers;
    card.append(h("h3", "2. Check your columns"), h("p", "We selected columns where there was one clear match. Choose the correct columns where needed. Date, credits and person are required. Ignoring an optional role excludes its matching metric columns unless mapped elsewhere; metadata columns are separate.", "caption"));
    const row = h("div", null, "row");
    const opts = (req) => [["", req ? "Choose a column…" : "Choose a column or ignore…"]].concat(req ? [] : [[NONE, "Ignore matching column(s)"]], headers.map(x => [x, x]));
    REQUIRED.concat(OPTIONAL).forEach(([role, title]) => {
      const req = REQUIRED.some(r => r[0] === role);
      const label = `${title}${req ? " (required)" : " (optional)"}${(src.candidates[role] || []).length > 1 ? " — ambiguous, choose one" : ""}`;
      row.append(selectField(label, opts(req), state.mapping[role], v => {
        const previous = state.mapping[role];
        if (v === NONE && previous && previous !== NONE) state.ignored[role] = previous;
        else if (v !== NONE) delete state.ignored[role];
        state.mapping[role] = v;
      }));
    });
    if (src.metadata) {
      const mh = src.metadata.headers;
      row.append(selectField("Metadata historical ID column", [["", "Choose a column…"]].concat(mh.map(x => [x, x])), state.metadataKey, v => { state.metadataKey = v; }));
    }
    row.append(selectField("Numeric date order", [["ISO", "ISO dates only (YYYY-MM-DD)"], ["MDY", "Month/Day/Year"], ["DMY", "Day/Month/Year"]], state.dateOrder, v => { state.dateOrder = v; }));
    const go = h("button", "Show my usage", "primary"); go.type = "button";
    go.addEventListener("click", () => build());
    card.append(row, go);
    return card;
  }

  function build() {
    try {
      const mapping = {};
      for (const [role, title] of REQUIRED.concat(OPTIONAL)) {
        const v = state.mapping[role];
        if (v === "" || v === undefined) throw new Error(`Choose a column for ${title}.`);
        mapping[role] = v === NONE ? null : v;
      }
      const mappedHeaders = new Set(Object.values(mapping).filter(v => v != null));
      const opts = { mapping, ignoredHeaders: Object.values(state.ignored).filter(v => !mappedHeaders.has(v)), completeMonths: Array.from(state.complete) };
      if (state.source.metadata) { if (!state.metadataKey) throw new Error("Choose the metadata historical ID column."); opts.metadataKey = state.metadataKey; }
      if (state.dateOrder !== "ISO") opts.dateOrder = state.dateOrder;
      const ds = CD.build(state.source, opts);
      const ignored = new Set(opts.ignoredHeaders);
      for (const [role] of OPTIONAL) {
        if (mapping[role] === null) for (const header of state.source.candidates[role]) ignored.add(header);
      }
      const ignoredIndexes = state.source.metrics.headers.map((header, i) => ignored.has(header) && !mappedHeaders.has(header) ? i : -1).filter(i => i >= 0);
      for (const sourceRow of state.source.metrics.rows) for (const i of ignoredIndexes) sourceRow[i] = "";
      state.dataset = ds; state.sel = { attr: "", value: "", breakdown: "", baseline: "", ack: false, growth: "manual" };
      error(""); renderAll();
    } catch (e) { error(e.message); }
  }

  function completenessCard() {
    const ds = state.dataset, card = h("details", null, "card"), content = h("div");
    card.open = state.coverageOpen;
    card.addEventListener("toggle", () => { if (card.isConnected) state.coverageOpen = card.open; });
    const missingRows = ds.stats.unmatched + ds.stats.missingKey;
    card.append(h("summary", `Check data coverage and matching${missingRows ? ` · ${fmt(missingRows)} usage rows without group details` : ""}`), content);
    content.append(h("p", "Select the months you know contain complete data. A month is marked unknown until you confirm it.", "caption"));
    const list = h("div", null, "actions");
    ds.months.forEach(m => {
      const lab = h("label", null, null);
      const cb = h("input", null, null, { type: "checkbox" }); cb.style.width = "auto";
      cb.checked = ds.completeness[m] === "complete"; cb.disabled = state.demo;
      cb.addEventListener("change", () => {
        cb.checked ? state.complete.add(m) : state.complete.delete(m);
        if (state.source) { try { rebuild(); } catch (e) { error(e.message); } }
      });
      lab.append(cb, document.createTextNode(` ${m}: ${ds.completeness[m]}`));
      list.append(lab);
    });
    content.append(list, h("p", `${fmt(ds.stats.rows)} rows. Metadata matched ${fmt(ds.stats.matched)}, unmatched ${fmt(ds.stats.unmatched)}, missing key ${fmt(ds.stats.missingKey)}, not provided ${fmt(ds.stats.notProvided)}.`, "caption"));
    if (ds.stats.unmatched || ds.stats.missingKey) {
      const ids = new Set();
      ds.rows.forEach(r => { if (r.metadataStatus === "unmatched" || r.metadataStatus === "missing-key") ids.add(r.personId); });
      content.append(h("p", `Warning: ${fmt(ids.size)} distinct people have no matching metadata, so their organization attributes are blank.`, "warn"));
    }
    return card;
  }
  function rebuild() {
    const mapping = {};
    for (const [role] of REQUIRED.concat(OPTIONAL)) mapping[role] = state.mapping[role] === NONE ? null : state.mapping[role];
    const mappedHeaders = new Set(Object.values(mapping).filter(v => v != null));
    const opts = { mapping, ignoredHeaders: Object.values(state.ignored).filter(v => !mappedHeaders.has(v)), completeMonths: Array.from(state.complete) };
    if (state.source.metadata) opts.metadataKey = state.metadataKey;
    if (state.dateOrder !== "ISO") opts.dateOrder = state.dateOrder;
    state.dataset = CD.build(state.source, opts);
    state.sel.ack = false;
    renderAll();
  }

  const disp = v => v == null ? "(blank)" : v;
  const label = g => g === "$service" ? "Service" : g === "$serviceId" ? "Service ID" : g === "$serviceName" ? "Service name" : g === "$policy" ? "Policy" : g === "$metadataStatus" ? "Metadata status" : g;
  function previousMonth(month) {
    const year = Number(month.slice(0, 4)), number = Number(month.slice(5, 7));
    return number === 1 ? `${String(year - 1).padStart(4, "0")}-12` : `${year}-${String(number - 1).padStart(2, "0")}`;
  }
  function changes(agg, month) {
    const current = agg.monthly[agg.months.indexOf(month)];
    const priorMonth = previousMonth(month);
    const prior = agg.monthly[agg.months.indexOf(priorMonth)];
    if (!current || !prior) return null;
    return {
      priorMonth,
      users: prior.persons > 0 ? current.persons / prior.persons - 1 : null,
      usage: prior.persons > 0 && current.persons > 0 && prior.credits > 0 && current.credits >= 0
        ? (current.credits / current.persons) / (prior.credits / prior.persons) - 1 : null,
      credits: prior.credits > 0 ? current.credits / prior.credits - 1 : null
    };
  }
  const pct = value => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
  function exportHistory(history, scope, dateAttribution) {
    const cell = value => {
      let text = String(value);
      if (typeof value === "string" && /^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [["selected_group", "month", "credits", "distinct_users", "data_completeness", "date_attribution"],
      ...history.map(item => [scope, item.month, item.credits, item.users, item.completeness, dateAttribution])];
    const url = URL.createObjectURL(new Blob([rows.map(row => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = h("a"); link.href = url; link.download = "selected-usage-history.csv";
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function selectionCard() {
    const ds = state.dataset, s = state.sel, card = h("div", null, "card");
    card.append(h("h3", "Where you are: explore your usage"), h("p", "Choose an organization, cost center, service or another field to see that group's monthly credits and users.", "caption"),
      h("p", DATE_ATTRIBUTION + " Use daily or calendar-month data for calendar-month forecasts.", "warn"));
    const row = h("div", null, "row");
    row.append(selectField("View by", [["", "Everyone"]].concat(ds.groupings.map(g => [g, label(g)])), s.attr, v => { s.attr = v; s.value = ""; s.baseline = ""; s.ack = false; renderAll(); $("cu-view-by").focus(); }, "cu-view-by"));
    let filters = Object.create(null), values = [];
    if (s.attr) {
      let groups;
      try { groups = CD.aggregate(ds, { groupBy: [s.attr] }).groups; }
      catch (e) { card.append(row, h("p", e.message, "warn"), manualOnlyChoice()); return card; }
      values = groups.map(g => g.values[0]);
      row.append(selectField("Choose a group", [["", "Choose a group…"]].concat(values.map(v => [JSON.stringify(v), disp(v)])), s.value, v => { s.value = v; s.baseline = ""; s.ack = false; renderAll(); }));
    }
    row.append(selectField("Also break down by", [["", "None"]].concat(ds.groupings.map(g => [g, label(g)])), s.breakdown, v => { s.breakdown = v; renderAll(); }));
    card.append(row);
    if (s.attr && !s.value) { card.append(h("p", "Choose a group to see its usage.", "caption"), manualOnlyChoice()); return card; }
    if (s.attr) filters[s.attr] = JSON.parse(s.value);
    const agg = CD.aggregate(ds, { filters });
    const scope = s.attr ? `${label(s.attr)} = ${disp(filters[s.attr])}` : "Everyone";
    const months = ds.months.filter((m, i) => agg.monthly[i]);
    if (months.length && !s.baseline) s.baseline = months[months.length - 1];
    if (!months.length) { card.append(h("p", "No data for this selection.", "warn"), manualOnlyChoice()); return card; }
    const planning = h("div", null, "card");
    planning.append(h("h3", "Step 2: Choose how to forecast", "data-step-title"),
      h("p", "Use the selected usage as your starting point, or start a new forecast with your own assumptions.", "caption"));
    const choices = h("div", null, "forecast-choices"), fromData = h("div", null, "forecast-choice");
    fromData.append(h("h4", "Forecast from your data"),
      h("p", "Choose a starting month and how to estimate growth for this selection.", "caption"));
    const controls = h("div", null, "row");
    controls.append(selectField("Starting month", months.map(m => [m, m]), s.baseline, v => { s.baseline = v; s.ack = false; renderAll(); }));
    const growthOptions = [
      ["manual", "Use the growth rates in Modeling"],
      ["historical", "Use the change from the previous month"]
    ];
    if (state.demo) growthOptions.push(["demo", "Use fictional demo growth rates"]);
    const growthChoice = selectField("How should users and usage grow?", growthOptions,
      s.growth, v => { s.growth = v; s.ack = false; renderAll(); $("cu-growth-method").focus(); }, "cu-growth-method");
    growthChoice.querySelector("select").setAttribute("aria-describedby", "cu-growth-explanation");
    controls.append(growthChoice);
    fromData.append(controls);
    const explanation = h("div", null, "growth-explanation caption", { id: "cu-growth-explanation" });
    explanation.append(h("p", "These settings control both the number of users and credits used per user."));
    const options = h("ul"), manual = h("li"), historical = h("li");
    manual.append(h("strong", "Growth rates in Modeling: "), document.createTextNode("Keep your current growth settings. For a first imported-data forecast without an established plan, growth starts at zero. You can review or change it in Modeling."));
    historical.append(h("strong", "Change from the previous month: "), document.createTextNode("Compare the selected month with the previous calendar month, then apply those two rates each forecast month until you change them."));
    options.append(manual, historical);
    if (state.demo) {
      const demo = h("li");
      demo.append(h("strong", "Fictional demo growth rates: "), document.createTextNode("Replace your current monthly growth rates with example rates. Other assumptions and your schedule remain unchanged. Review or edit the rates in Modeling."));
      options.append(demo);
    }
    explanation.append(options); fromData.append(explanation);
    const selected = agg.monthly[ds.months.indexOf(s.baseline)];
    const trend = changes(agg, s.baseline);
    const usableTrend = trend && trend.users !== null && trend.usage !== null;
    if (selected) {
      fromData.append(h("p", `${fmt(selected.persons)} users · ${fmt(selected.credits)} credits · ${selected.persons ? fmt(selected.credits / selected.persons) : "—"} credits per user in ${s.baseline}.`, "caption"));
    }
    if (s.growth === "historical") {
      if (usableTrend) fromData.append(h("p", `Compared with ${trend.priorMonth}: users ${pct(trend.users)}, credits per user ${pct(trend.usage)}, total credits ${pct(trend.credits)}. If selected, both rates compound every forecast month. A single month's change can greatly exaggerate a long-term forecast; review and edit the rates in Modeling.`, "warn"));
      else fromData.append(h("p", "The preceding calendar month is missing or has zero users/credits. Choose another month or keep your current modeling assumptions.", "warn"));
    }
    const uncertain = ds.completeness[s.baseline] !== "complete" ||
      (s.growth === "historical" && usableTrend && ds.completeness[trend.priorMonth] !== "complete");
    if (uncertain) {
      const lab = h("label", null, "warn"), cb = h("input", null, null, { type: "checkbox" });
      cb.style.width = "auto"; cb.checked = s.ack;
      cb.addEventListener("change", () => { s.ack = cb.checked; });
      lab.append(cb, document.createTextNode(" I understand the selected month or comparison month may be incomplete and could distort this forecast."));
      fromData.append(lab);
    }
    const apply = h("button", "Forecast this selection", "primary"); apply.type = "button";
    apply.addEventListener("click", () => {
      try {
        if (!selected || !selected.persons) throw new Error("Cannot forecast: this month has no distinct users.");
        if (selected.credits < 0) throw new Error("Cannot forecast a negative total credit baseline.");
        if (s.growth === "historical" && !usableTrend) throw new Error("Choose a month with a usable preceding calendar month, or keep the current modeling assumptions.");
        if (uncertain && !s.ack) throw new Error("Acknowledge that the selected or comparison month may be incomplete.");
        const name = state.demo ? "Synthetic demo" : "Imported data";
        const ev = new CustomEvent("consumption:apply", { cancelable: true, detail: {
          users: selected.persons, credits: selected.credits, month: s.baseline,
          label: `${name} · ${scope}`, isDemo: state.demo,
          sourceKey: JSON.stringify([seq, s.attr, s.attr ? filters[s.attr] : null]),
          history: agg.monthly.map((item, index) => item && ds.months[index] <= s.baseline ? {
            month: ds.months[index], credits: item.credits, users: item.persons,
            completeness: ds.completeness[ds.months[index]]
          } : null).filter(Boolean),
          ...(state.demo ? {} : { dateAttribution: DATE_ATTRIBUTION }),
          ...(state.demo && s.growth === "demo" ? { demoRollout: true } : {}),
          growth: s.growth === "historical" ? { users: trend.users, usage: trend.usage, priorMonth: trend.priorMonth } : null
        } });
        if (!document.dispatchEvent(ev)) throw new Error(ev.detail.cancelled ? "Forecast not applied. Your existing plan is unchanged." : "The Modeling tab rejected this baseline; see its message.");
        error(""); selectTab(1, true);
      } catch (e) { error(e.message); }
    });
    fromData.append(apply);
    const fromAssumptions = h("div", null, "forecast-choice");
    fromAssumptions.append(h("h4", "Forecast from assumptions"),
      h("p", "Start a new forecast without using this data. Enter your own users, usage, prices and budget.", "caption"),
      manualButton());
    choices.append(fromData, fromAssumptions);
    planning.append(choices);
    const total = h("table"), tb = h("tbody");
    total.append(h("caption", `Selected group: ${s.attr ? label(s.attr) + " = " + disp(filters[s.attr]) : "all rows"}`));
    const head = h("tr"); ["Month", "Credits", "Credit growth MoM", "Distinct users", "User growth MoM", "Credits per user", "Completeness"].forEach(x => head.append(h("th", x)));
    const th = h("thead"); th.append(head); total.append(th);
    ds.months.forEach((m, i) => {
      const c = agg.monthly[i], tr = h("tr");
      const t = changes(agg, m);
      tr.append(h("td", m), h("td", c ? fmt(c.credits) : "No data"), h("td", t && t.credits !== null ? pct(t.credits) : "—"), h("td", c ? fmt(c.persons) : "No data"), h("td", t && t.users !== null ? pct(t.users) : "—"), h("td", c && c.persons ? fmt(c.credits / c.persons) : "—"), h("td", ds.completeness[m]));
      tb.append(tr);
    });
    total.append(tb);
    const observed = agg.monthly.map((value, i) => value ? { month: ds.months[i], credits: value.credits } : null).filter(Boolean);
    if (observed.length) {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      const width = Math.max(720, observed.length * 52), height = 220, left = 80, bottom = 40, top = 20;
      const max = Math.max(0, ...observed.map(point => point.credits));
      const min = Math.min(0, ...observed.map(point => point.credits));
      const range = max - min || 1;
      const chartY = value => top + (max - value) / range * (height - top - bottom);
      const zeroY = chartY(0);
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Historical credits by month for the selected group. Exact figures follow in the table.");
      const svgNode = (tag, attrs, value) => {
        const node = document.createElementNS(ns, tag);
        for (const [key, val] of Object.entries(attrs)) node.setAttribute(key, val);
        if (value !== undefined) node.textContent = value;
        svg.append(node);
      };
      for (let i = 0; i <= 4; i++) {
        const tick = min + range * i / 4;
        const y = chartY(tick);
        svgNode("line", { x1: left, x2: width - 10, y1: y, y2: y, stroke: "var(--cp-border)" });
        svgNode("text", { x: left - 8, y: y + 4, "text-anchor": "end", fill: "var(--cp-text-muted)", "font-size": 10 }, fmt(tick));
      }
      const span = (width - left - 10) / observed.length;
      observed.forEach((point, i) => {
        const y = chartY(point.credits);
        const x = left + span * i + span * 0.18;
        svgNode("rect", { x, y: Math.min(y, zeroY), width: span * 0.64, height: Math.abs(y - zeroY), fill: "var(--cp-accent)" });
        svgNode("text", { x: x + span * 0.32, y: height - 18, "text-anchor": "middle", fill: "var(--cp-text-muted)", "font-size": 10 }, point.month);
      });
      const chart = h("div", null, "chart-box detail");
      chart.append(svg);
      card.append(h("h4", "Historical credit usage"), chart);
    }
    const wrap = h("div", null, "table-wrap"); wrap.append(total); card.append(wrap, planning);
    const download = h("button", "Export selected usage history"); download.type = "button";
    download.addEventListener("click", () => {
      const history = agg.monthly.map((item, index) => item ? {
        month: ds.months[index], credits: item.credits, users: item.persons,
        completeness: ds.completeness[ds.months[index]]
      } : null).filter(Boolean);
      exportHistory(history, scope, state.demo ? DEMO_DATE_ATTRIBUTION : DATE_ATTRIBUTION);
    });
    const exports = h("div", null, "forecast-action");
    exports.append(download, h("span", "CSV contains monthly totals for this selection, not individual rows. Review before sharing.", "caption"));
    card.append(exports);

    if (s.breakdown) {
      let b;
      try { b = CD.aggregate(ds, { filters, groupBy: [s.breakdown] }); }
      catch (e) { card.append(h("p", e.message, "warn")); return card; }
      const MAX = 100;
      const t = h("table"), hd = h("tr"); hd.append(h("th", label(s.breakdown)));
      ds.months.forEach(m => hd.append(h("th", m + " credits / users")));
      const th2 = h("thead"); th2.append(hd); t.append(th2);
      const tbody = h("tbody");
      b.groups.slice(0, MAX).forEach(g => {
        const tr = h("tr"); tr.append(h("td", disp(g.values[0])));
        g.monthly.forEach(c => tr.append(h("td", c ? `${fmt(c.credits)} / ${fmt(c.persons)}` : "—")));
        tbody.append(tr);
      });
      t.append(tbody);
      const w = h("div", null, "table-wrap"); w.append(t);
      card.append(h("h4", "Breakdown (distinct users are not additive across groups)"), w);
      if (b.groups.length > MAX) card.append(h("p", `Showing the first ${MAX} of ${b.groups.length} groups.`, "caption"));
    }

    return card;
  }
  renderAll();
})();
