/* Browser-only executive export for the scheduled forecast model. */
(function (root) {
  "use strict";

  var C = {
    bg: "21151B", card: "38242D", card2: "48303A", line: "654B56",
    ink: "FFF8FA", muted: "DCC6CE", cyan: "F18EA5", blue: "E4AFBF",
    gold: "F2CC88", green: "A6D8B9"
  };
  var W = 13.333, H = 7.5;
  var paygCaveat = "PAYG availability depends on your agreement; modeled excess does not imply coverage or automatic availability.";

  function number(n, digits) {
    if (typeof n !== "number" || !Number.isFinite(n)) throw new Error("Forecast contains an invalid number.");
    if (Math.abs(n) >= 1e12) return n.toExponential(2);
    return n.toLocaleString("en-US", { maximumFractionDigits: digits === undefined ? 2 : digits });
  }
  function compact(n) {
    if (n !== 0 && Math.abs(n) < 0.01) return n.toExponential(2);
    if (Math.abs(n) >= 1e12) return n.toExponential(1);
    if (Math.abs(n) >= 1e9) return number(n / 1e9, 2) + "B";
    if (Math.abs(n) >= 1e6) return number(n / 1e6, 2) + "M";
    if (Math.abs(n) >= 1e4) return number(n / 1e3, 2) + "K";
    return number(n, 2);
  }
  // ECMA-402 accepts any three letters, including codes that are not ISO currencies.
  var currencyCodes = ("AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BOV BRL BSD BTN BWP BYN BZD " +
    "CAD CDF CHE CHF CHW CLF CLP CNY COP COU CRC CUC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP GEL GHS GIP GMD GNF GTQ GYD " +
    "HKD HNL HRK HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD " +
    "MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MXN MXV MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR " +
    "RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SLL SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS " +
    "UAH UGX USD USN UYI UYU UYW UZS VED VES VND VUV WST XAD XAF XAG XAU XBA XBB XBC XBD XCD XCG XDR XOF XPD XPF XPT XSU XTS XUA XXX YER ZAR ZMW ZWG ZWL").split(" ");
  function resolveCurrency(value) {
    if (value === undefined) return "USD";
    if (typeof value !== "string" || !/^[A-Za-z]{3}$/.test(value) ||
        currencyCodes.indexOf(value.toUpperCase()) < 0) {
      throw new Error("Forecast currency must be a valid ISO 4217 three-letter code.");
    }
    return value.toUpperCase();
  }
  function money(n, currency, isRate) {
    if (typeof n !== "number" || !Number.isFinite(n)) throw new Error("Forecast contains an invalid number.");
    var abs = Math.abs(n), options = { style: "currency", currency: currency, minimumFractionDigits: 2 };
    if (abs !== 0 && (abs < 1e-16 || abs >= 1e15)) {
      options.notation = "scientific";
      options.minimumFractionDigits = 0;
      options.maximumSignificantDigits = 4;
    } else {
      options.maximumFractionDigits = isRate ? 8 : 2;
      if (abs !== 0 && abs < 1) {
        options.maximumFractionDigits = Math.max(options.maximumFractionDigits,
          Math.min(20, 3 - Math.floor(Math.log10(abs))));
      }
    }
    return currency + " " + new Intl.NumberFormat("en-US", options).format(n);
  }
  function at(m, months) { return m === null || m === undefined ? "Not reached" : months[m - 1].date; }
  function safeText(value) {
    return Array.from(value).map(function (char) {
      var code = char.codePointAt(0);
      return code < 32 || (code >= 127 && code <= 159) ||
        (code >= 0xD800 && code <= 0xDFFF) || code === 0xFFFE || code === 0xFFFF ? " " : char;
    }).join("");
  }
  function text(slide, value, x, y, w, h, opts) {
    slide.addText(String(value), Object.assign({
      x: x, y: y, w: w, h: h, fontFace: "Arial", fontSize: 12,
      color: C.ink, margin: 0, breakLine: false, fit: "shrink", valign: "mid"
    }, opts || {}));
  }
  function box(slide, pptx, x, y, w, h, color) {
    slide.addShape(pptx.ShapeType.rect, {
      x: x, y: y, w: w, h: h, line: { color: color || C.card, transparency: 100 },
      fill: { color: color || C.card }
    });
  }
  function heading(slide, tag, title, sub) {
    text(slide, tag.toUpperCase(), 0.6, 0.39, 11.9, 0.22, { fontSize: 9, bold: true, color: C.cyan, charSpacing: 1.2 });
    text(slide, title, 0.6, 0.75, 12.1, 0.49, { fontSize: 26, bold: true });
    if (sub) text(slide, sub, 0.6, 1.29, 12.1, 0.34, { fontSize: 11, color: C.muted });
  }
  function footer(slide, page, total, source) {
    text(slide, "FORECAST  /  " + source.toUpperCase() + "  /  MODEL ESTIMATE", 0.6, 7.12, 10.8, 0.18,
      { fontSize: 8, color: C.muted });
    text(slide, String(page) + " / " + total, 12.08, 7.12, 0.65, 0.18,
      { fontSize: 8, color: C.muted, align: "right" });
  }
  function slide(pptx, page, total, source) {
    var s = pptx.addSlide();
    s.background = { color: C.bg };
    footer(s, page, total, source);
    return s;
  }
  function card(slide, pptx, x, y, w, label, value, detail, accent) {
    box(slide, pptx, x, y, w, 1.39);
    text(slide, label.toUpperCase(), x + 0.2, y + 0.15, w - 0.4, 0.23,
      { fontSize: 9, color: C.muted, bold: true });
    text(slide, value, x + 0.2, y + 0.48, w - 0.4, 0.42,
      { fontSize: 25, bold: true, color: accent || C.ink });
    text(slide, detail, x + 0.2, y + 1.02, w - 0.4, 0.22,
      { fontSize: 9, color: C.muted });
  }
  function note(slide, value) { slide.addNotes(value); }
  function check(plan, result) {
    if (!plan || !result || !Array.isArray(result.months) || !result.totals ||
        !Number.isInteger(plan.horizon) || plan.horizon < 1 || plan.horizon > 36 ||
        result.months.length !== plan.horizon || !Array.isArray(plan.steps) ||
        !Array.isArray(plan.purchases) || !Array.isArray(plan.phases) || !plan.phases.length) {
      throw new Error("A validated scheduled plan and matching result are required.");
    }
    result.months.forEach(function (m, i) {
      if (!m || m.month !== i + 1 || typeof m.date !== "string" ||
          !/^\d{4,5}-(0[1-9]|1[0-2])$/.test(m.date)) throw new Error("Forecast months are invalid.");
      ["credits", "prepaidCredits", "paygCredits", "cost", "users", "usage", "opening",
        "purchase", "available", "remaining"].forEach(function (k) { number(m[k]); });
    });
    ["credits", "prepaidCredits", "paygCredits", "cost", "paygCost", "purchases",
      "remaining", "headroom"].forEach(function (k) { number(result.totals[k]); });
  }
  function checkHistory(value) {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new Error("History must be an array of monthly aggregates.");
    var previous = "";
    for (var i = 0; i < value.length; i++) {
      var item = value[i];
      if (!item || typeof item !== "object" || Array.isArray(item) ||
          Object.keys(item).some(function (key) {
            return ["month", "credits", "users", "completeness"].indexOf(key) < 0;
          }) ||
          typeof item.month !== "string" ||
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(item.month) || item.month.slice(0, 4) === "0000" ||
          item.month <= previous ||
          typeof item.credits !== "number" || !Number.isFinite(item.credits) ||
          typeof item.users !== "number" || !Number.isFinite(item.users) || item.users < 0 ||
          ["complete", "unknown"].indexOf(item.completeness) < 0) {
        throw new Error("History must contain unique, chronological YYYY-MM aggregates with finite credits, nonnegative users, and valid completeness.");
      }
      previous = item.month;
    }
    return value;
  }
  function growthAt(plan, month) {
    if (plan.growthMode === "constant") return [plan.userGrowth, plan.usageGrowth];
    var phase = plan.phases[0];
    plan.phases.forEach(function (p) { if (p.month <= month) phase = p; });
    return [phase.userGrowth, phase.usageGrowth];
  }
  function chartOptions(x, y, w, h) {
    return {
      x: x, y: y, w: w, h: h, showTitle: false, showLegend: true, legendPos: "b",
      legendFontFace: "Arial", legendFontSize: 10, legendColor: C.muted,
      catAxisLabelColor: C.muted, catAxisLabelFontSize: 7, catAxisLabelRotate: -45,
      valAxisLabelColor: C.muted, valAxisLabelFontSize: 9,
      valGridLine: { color: C.line, size: 0.5 }, catGridLine: { style: "none" },
      chartColors: [C.cyan, C.gold], showValue: false, showBorder: false,
      showCatName: false, showValAxisTitle: false, showCatAxisTitle: false,
      chartArea: { fill: { color: C.bg }, border: { color: C.bg } },
      plotArea: { fill: { color: C.bg }, border: { color: C.bg } }
    };
  }

  function trendSlide(pptx, s, months, departmentMode) {
    var labels = months.map(function (m) { return m.date; });
    heading(s, "Monthly demand", "Monthly forecast demand",
      "Credits per month in the current scheduled forecast.");
    var demandChart = chartOptions(0.65, 1.85, 12, 4.45);
    var maxDemand = Math.max.apply(null, months.map(function (m) { return m.credits; }));
    Object.assign(demandChart, { objectName: "Monthly forecast demand in credits", showLegend: false,
      catAxisLabelRotate: 0, catAxisLabelFrequency: months.length > 24 ? "3" : months.length > 12 ? "2" : "1",
      valAxisLabelFormatCode: maxDemand >= 1e9 ? '0.0,,,"B"' : maxDemand >= 1e6 ? '0.0,,"M"' :
        maxDemand >= 1e3 ? '0.0,"K"' : "0.0" });
    s.addChart(pptx.ChartType.line, [
      { name: "Forecast demand (credits)", labels: labels, values: months.map(function (m) { return m.credits; }) }
    ], demandChart);
    text(s, "Forecast only: imported actuals, saved comparison overlays and checkpoint markers are not shown. Checkpoint details appear separately when selected.",
      0.65, 6.38, 12, 0.3, { fontSize: 10, color: C.muted });
    text(s, paygCaveat, 0.65, 6.72, 12, 0.28, { fontSize: 9, color: C.muted });
    note(s, "The editable chart contains every forecast month and shows scheduled modeled demand in credits. " +
      "Imported actuals, saved comparison overlays and checkpoint markers are not shown. Checkpoint details appear separately when selected. " +
      (departmentMode ? "Demand sums separately entered department assumptions; selected history is background context only. " : "") +
      paygCaveat);
  }

  function sensitivitySlide(pptx, s, sensitivity, currency, selected) {
    var points = sensitivity.inputs.percentagePoints;
    heading(s, "Growth sensitivity", "A scenario range, not a confidence interval",
      "Usage growth is adjusted by ±" + number(points) + " percentage points per month; user growth and other inputs are unchanged.");
    var names = ["low", "base", "high"].filter(function (name) { return selected[name] !== false; });
    if (!names.length) text(s, "No sensitivity series selected.", 0.8, 2.1, 11.6, 0.5, { fontSize: 14 });
    names.forEach(function (name, i) {
      var scenario = sensitivity.scenarios[name], x = 0.6 + i * 4.12;
      box(s, pptx, x, 1.79, 3.88, 2.0, name === "base" ? C.card2 : C.card);
      text(s, name.toUpperCase() + "  (" + (name === "low" ? "−" : name === "high" ? "+" : "") +
        number(name === "base" ? 0 : points) + " pp)", x + 0.2, 1.94, 3.48, 0.27,
      { fontSize: 13, bold: true, color: C.cyan });
      if (scenario && scenario.forecast) {
        var totals = scenario.forecast.totals;
        text(s, compact(totals.credits) + " credits", x + 0.2, 2.35, 3.48, 0.34,
          { fontSize: 19, bold: true });
        text(s, "Consumption value: " + money(totals.cost, currency), x + 0.2, 2.88, 3.48, 0.32,
          { fontSize: 11 });
        text(s, "PAYG excess: " + compact(totals.paygCredits) + " credits", x + 0.2, 3.28, 3.48, 0.32,
          { fontSize: 10, color: C.muted });
      } else {
        var errors = scenario && Array.isArray(scenario.errors) ? scenario.errors : sensitivity.errors;
        text(s, "Unavailable: " + (errors && errors.length ? errors.join("; ") : "scenario could not be calculated"),
          x + 0.2, 2.37, 3.48, 1.12, { fontSize: 12 });
      }
    });
    var plotted = names.filter(function (name) { return sensitivity.scenarios[name] && sensitivity.scenarios[name].forecast; });
    if (plotted.length) {
      text(s, "MONTHLY DEMAND — CREDITS", 0.75, 3.94, 11.7, 0.2, { fontSize: 10, bold: true });
      var opt = chartOptions(0.65, 4.17, 12, 1.94);
      Object.assign(opt, { objectName: "Monthly sensitivity demand in credits",
        chartColors: plotted.map(function (name) { return name === "low" ? C.blue : name === "base" ? C.cyan : C.gold; }),
        catAxisLabelRotate: 0,
        catAxisLabelFrequency: sensitivity.scenarios.base.forecast.months.length > 24 ? "3" :
          sensitivity.scenarios.base.forecast.months.length > 12 ? "2" : "1" });
      s.addChart(pptx.ChartType.line, plotted.map(function (name) {
        var months = sensitivity.scenarios[name].forecast.months;
        return { name: name.toUpperCase() + " demand", labels: months.map(function (m) { return m.date; }),
          values: months.map(function (m) { return m.credits; }) };
      }), opt);
    } else text(s, "No selected scenario can be plotted.", 0.8, 4.4, 11.6, 0.5, { fontSize: 12 });
    text(s, "Scenarios vary usage growth only; they are illustrative, not probabilities or bounds on actual outcomes.",
      0.65, 6.2, 12, 0.3, { fontSize: 10, color: C.muted });
    text(s, paygCaveat, 0.65, 6.65, 12, 0.3, { fontSize: 9, color: C.muted });
    note(s, "Percentage points are added to or subtracted from the configured monthly usage growth rates, not multiplied by them. " +
      "Out-of-period phases are unchanged. The range is not a confidence interval. " + paygCaveat);
  }

  function phaseValue(value) {
    if (value === 0) return "0";
    if (Math.abs(value) >= 1e9 || Math.abs(value) < 0.001) return value.toExponential(4);
    return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 5 }).format(value);
  }

  function phaseSlide(pptx, s, model, segment, segmentCount) {
    var entries = model.entries.slice(segment * 5, segment * 5 + 5);
    var prior = segment ? model.entries[segment * 5 - 1] : null;
    var start = prior ? prior.after : model.baseline;
    var end = entries.length ? entries[entries.length - 1].after : start;
    var last = segment === segmentCount - 1;
    var bars = [{ kind: "total", label: segment ? "Carry in" : "Starting demand",
      detail: prior ? "M" + prior.endMonth + " · " + prior.endDate : "Before month 1",
      value: start, after: start }];
    entries.forEach(function (entry) {
      bars.push({ kind: "delta", label: model.constant ? "Change · ends M" + entry.endMonth : "P" + (entry.index + 1) + " · ends M" + entry.endMonth,
        detail: entry.endDate, name: model.constant ? "Constant growth" : entry.label || ("Phase " + (entry.index + 1)), value: entry.value,
        startMonth: entry.startMonth, startDate: entry.startDate, before: entry.before, after: entry.after });
    });
    var ending = entries.length ? entries[entries.length - 1] : prior;
    bars.push({ kind: "total", label: last ? "Final month" : "Carry out",
      detail: last ? "M" + model.month + " · " + model.date :
        "M" + ending.endMonth + " · " + ending.endDate, value: end, after: end });
    heading(s, "Phase timeline", "Starting demand to final month  •  " + (segment + 1) + " / " + segmentCount,
      "Monthly credits: starting demand is configured users × usage, summed across departments when applicable.");
    text(s, "Each change compares phase-end demand with the previous phase end (or starting demand before month 1).",
      0.65, 1.7, 12, 0.32, { fontSize: 10, color: C.muted });
    [[C.cyan, "Total / carry"], [C.green, "Increase"], [C.gold, "Decrease"]].forEach(function (item, i) {
      box(s, pptx, 0.68 + i * 2.05, 2.15, 0.13, 0.13, item[0]);
      text(s, item[1], 0.88 + i * 2.05, 2.1, 1.8, 0.23, { fontSize: 10, color: C.muted });
    });
    text(s, "Chronological change • not causal attribution", 7.05, 2.1, 5.6, 0.23,
      { fontSize: 10, color: C.muted, align: "right" });
    var left = 0.7, width = 11.95, column = width / bars.length, barWidth = Math.min(0.75, column * 0.55);
    var top = 2.55, bottom = 4.68, height = bottom - top;
    var scale = Math.max(Math.abs(model.min), Math.abs(model.max));
    var low = scale ? model.min / scale : 0, high = scale ? model.max / scale : 1;
    function y(value) { return bottom - ((scale ? value / scale : 0) - low) / (high - low) * height; }
    function line(x1, y1, x2, y2, color, size) {
      s.addShape(pptx.ShapeType.line, { x: x1, y: y1, w: x2 - x1, h: y2 - y1,
        line: { color: color, width: size || 1 } });
    }
    line(left, y(0), left + width, y(0), C.line, 1);
    bars.forEach(function (bar, i) {
      var x = left + i * column + (column - barWidth) / 2;
      var from = bar.kind === "total" ? 0 : bar.before;
      var y1 = y(from), y2 = y(bar.after), upper = Math.min(y1, y2), h = Math.abs(y1 - y2);
      var color = bar.kind === "total" ? C.cyan : bar.value < 0 ? C.gold : C.green;
      if (h < 0.015) {
        line(x, y2, x + barWidth, y2, color, 2);
      } else {
        s.addShape(pptx.ShapeType.rect, { x: x, y: upper, w: barWidth, h: h,
          line: { color: color, transparency: 100 }, fill: { color: color } });
      }
      if (i < bars.length - 1) {
        var nextX = left + (i + 1) * column + (column - barWidth) / 2;
        line(x + barWidth, y2, nextX, y2, C.muted, 1);
      }
      text(s, bar.label, left + i * column, 4.78, column, 0.25,
        { fontSize: 10, bold: true, align: "center" });
      var shortName = bar.name ? safeText(bar.name) : "";
      if (Array.from(shortName).length > 20) shortName = Array.from(shortName).slice(0, 19).join("") + "…";
      text(s, bar.detail, left + i * column + 0.03, 5.05, column - 0.06, 0.22,
        { fontSize: 9, align: "center", color: C.muted });
      text(s, shortName, left + i * column + 0.03, 5.29, column - 0.06, 0.22,
        { fontSize: 9, align: "center", color: C.muted });
      text(s, (bar.kind === "delta" && bar.value > 0 ? "+" : "") + phaseValue(bar.value),
        left + i * column, 5.54, column, 0.27,
        { fontSize: 12, bold: true, align: "center", color: color });
    });
    text(s, "Changes include growth, steps and caps; they are not isolated causal effects or full-period totals.",
      0.65, 5.98, 12, 0.25, { fontSize: 10, color: C.muted });
    text(s, "Values rounded to 5 significant digits; full labels and values are in notes. " +
      (model.excluded.length ? model.excluded.length + " outside-horizon phase(s) excluded from the waterfall." :
        "No outside-horizon phases excluded from the waterfall."),
      0.65, 6.27, 12, 0.42, { fontSize: 10, color: C.muted });
    note(s, "Monthly demand in credits, not full-horizon totals. Starting demand is the current entered model assumption before month 1" +
      (model.departmentMode ? ", summed across departments" : "") +
      "; inputs may have been edited after data selection and are not necessarily observed usage. " +
      "Each phase change is its last month's demand minus the preceding phase ending demand, or starting demand for the first phase. " +
      "Changes include all growth, overrides and caps; they are not causal attribution. " +
      "Segment " + (segment + 1) + " of " + segmentCount + ". " +
      bars.map(function (bar) { return bar.label + " " + bar.detail + (bar.name ? " " + safeText(bar.name) : "") +
        (bar.kind === "delta" ? " (starts M" + bar.startMonth + ", " + bar.startDate + ")" : "") +
        ": " + String(bar.value) + " credits; resulting demand " + String(bar.after) + "."; }).join(" ") +
      " Outside-horizon phases excluded from the waterfall: " + model.excluded.length + ".");
  }

  function checkpointSlide(pptx, s, point, months, currency) {
    var month = months[point.month - 1];
    heading(s, "Review checkpoint", "Month " + point.month + (month ? "  •  " + month.date : "  •  outside forecast"),
      "Owner, trigger and response are user-provided notes, not model recommendations.");
    if (month) {
      text(s, "MODELED MONTH: " + compact(month.credits) + " credits  |  " +
        money(month.cost, currency) + " consumption value  |  " +
        compact(month.paygCredits) + " modeled PAYG credits", 0.65, 1.77, 12, 0.45,
      { fontSize: 12, bold: true, color: C.cyan });
    } else text(s, "Outside the forecast horizon; no modeled snapshot is available.",
      0.65, 1.77, 12, 0.45, { fontSize: 12, color: C.muted });
    [["OWNER", point.owner], ["TRIGGER", point.trigger], ["RESPONSE", point.response]].forEach(function (item, i) {
      var y = 2.4 + i * 1.08;
      box(s, pptx, 0.6, y, 12.1, 0.96, i % 2 ? C.card2 : C.card);
      text(s, item[0], 0.8, y + 0.12, 1.1, 0.25, { fontSize: 10, bold: true, color: C.cyan });
      text(s, item[1] ? safeText(item[1]) : "Not provided", 2.0, y + 0.1, 10.35, 0.75,
        { fontSize: 12, valign: "top" });
    });
    text(s, paygCaveat, 0.65, 6.43, 12, 0.38, { fontSize: 10, color: C.muted });
    note(s, "Checkpoint notes are supplied by the user. They are not modeled thresholds or recommendations. " + paygCaveat);
  }

  function departmentSlide(pptx, s, department, input, index, count, currency) {
    heading(s, "Department breakdown", "Department " + (index + 1) + " of " + count,
      "Full-period modeled demand and consumption value.");
    text(s, safeText(department.name), 0.65, 1.75, 12, 0.96,
      { fontSize: 12, bold: true, color: C.cyan, valign: "top" });
    text(s, "Starting users: " + compact(input.startingUsers) + "  |  Starting usage: " +
      compact(input.startingCreditsPerUser) + " credits per user per month",
      0.65, 2.81, 12, 0.38, { fontSize: 12, color: C.muted });
    card(s, pptx, 0.6, 3.33, 3.88, "Demand", compact(department.totals.credits), "credits", C.cyan);
    card(s, pptx, 4.72, 3.33, 3.88, "Shared prepaid allocated", compact(department.totals.prepaidCredits), "modeled credits, not billed", C.ink);
    card(s, pptx, 8.84, 3.33, 3.88, "Modeled PAYG excess", compact(department.totals.paygCredits), "credits", C.gold);
    text(s, "Modeled consumption value: " + money(department.totals.cost, currency) +
      "  •  Prepaid and PAYG allocations are proportional to each month's demand.",
      0.65, 4.99, 12, 0.55, { fontSize: 12 });
    text(s, "Prepaid availability is shared; allocations are modeled attribution, not department invoices or actual billing.",
      0.65, 5.57, 12, 0.45, { fontSize: 11, color: C.muted });
    text(s, paygCaveat, 0.65, 6.43, 12, 0.38, { fontSize: 10, color: C.muted });
    note(s, "Department prepaid is allocated in proportion to each month's demand from shared prepaid availability, not from separately billed department pools. " + paygCaveat);
  }

  function optionalSlides(context, plan, result, currency) {
    var views = context.views === undefined ? {} : context.views;
    if (!views || typeof views !== "object" || Array.isArray(views)) throw new Error("Export views must be an object.");
    ["trend", "sensitivity", "phases", "checkpoints", "departments"].forEach(function (key) {
      if (views[key] !== undefined && typeof views[key] !== "boolean") throw new Error("Export view " + key + " must be true or false.");
    });
    var output = [];
    if (views.trend) output.push(function (p, s) { trendSlide(p, s, result.months, !!plan.departments); });
    if (views.sensitivity || views.phases) {
      if (!root.ForecastAnalysis ||
          (views.sensitivity && typeof root.ForecastAnalysis.sensitivity !== "function") ||
          (views.phases && typeof root.ForecastAnalysis.timelineWaterfall !== "function"))
        throw new Error("Forecast analysis is required for selected analysis views.");
    }
    function matchesCurrent(forecast) {
      return forecast && forecast.totals && forecast.totals.credits === result.totals.credits &&
        forecast.totals.cost === result.totals.cost && forecast.months &&
        forecast.months.length === result.months.length && forecast.months.every(function (m, i) {
          var current = result.months[i];
          return m.date === current.date && m.credits === current.credits && m.users === current.users &&
            m.usage === current.usage && m.prepaidCredits === current.prepaidCredits && m.paygCredits === current.paygCredits;
        });
    }
    if (views.sensitivity) {
      var points = context.viewSettings && context.viewSettings.sensitivity;
      if (typeof points !== "number" || !Number.isFinite(points) || points < 0)
        throw new Error("A finite nonnegative sensitivity in percentage points is required.");
      var range = root.ForecastAnalysis.sensitivity(plan, points);
      if (!Array.isArray(range.errors) || range.errors.length)
        throw new Error("Sensitivity analysis is unavailable: " + (range.errors || []).join("; "));
      if (!range.scenarios || !range.scenarios.base || !matchesCurrent(range.scenarios.base.forecast))
        throw new Error("Sensitivity analysis does not match the current scheduled result.");
      ["low", "base", "high"].forEach(function (name) {
        var scenario = range.scenarios[name];
        if (!scenario || !Array.isArray(scenario.errors) || (scenario.forecast && scenario.errors.length))
          throw new Error("Sensitivity scenario " + name + " is invalid.");
      });
      var selected = context.viewSettings || {};
      ["low", "base", "high"].forEach(function (key) {
        if (selected[key] !== undefined && typeof selected[key] !== "boolean")
          throw new Error("Sensitivity series selections must be true or false.");
      });
      output.push(function (p, s) { sensitivitySlide(p, s, range, currency, selected); });
    }
    if (views.phases) {
      if (!root.ForecastEngine || typeof root.ForecastEngine.forecastScheduled !== "function")
        throw new Error("Forecast engine is required to validate the phase timeline.");
      function matchesExpected(expected, supplied) {
        if (Array.isArray(expected))
          return Array.isArray(supplied) && expected.length === supplied.length &&
            expected.every(function (item, i) { return matchesExpected(item, supplied[i]); });
        if (expected && typeof expected === "object")
          return supplied && typeof supplied === "object" && !Array.isArray(supplied) &&
            Object.keys(expected).every(function (key) { return matchesExpected(expected[key], supplied[key]); });
        return expected === supplied;
      }
      if (!matchesExpected(root.ForecastEngine.forecastScheduled(plan), result))
        throw new Error("Phase timeline does not match the current scheduled result.");
      var phases = root.ForecastAnalysis.timelineWaterfall(plan, result);
      if (!phases || !Array.isArray(phases.errors) || phases.errors.length)
        throw new Error("Phase analysis is unavailable: " +
          (phases && Array.isArray(phases.errors) ? phases.errors.join("; ") : "invalid analysis result"));
      var lastMonth = result.months.length - 1;
      var baselineCredits = phases.baseline;
      number(baselineCredits);
      var previousCredits = baselineCredits;
      if (!Array.isArray(phases.phases) || !Array.isArray(phases.excludedPhases))
        throw new Error("Phase timeline is invalid.");
      var phaseEntries = phases.phases.map(function (entry) {
        var delta = entry.delta;
        var after = entry.to;
        number(delta); number(after);
        if (entry.from !== previousCredits || after - previousCredits !== delta ||
            !Number.isInteger(entry.startMonth) || !Number.isInteger(entry.endMonth) ||
            entry.startMonth < 1 || entry.endMonth < entry.startMonth || entry.endMonth > result.months.length ||
            entry.startDate !== result.months[entry.startMonth - 1].date ||
            entry.endDate !== result.months[entry.endMonth - 1].date ||
            after !== result.months[entry.endMonth - 1].credits)
          throw new Error("Phase timeline does not reconcile with the scheduled forecast.");
        var item = { index: entry.index, label: entry.label, startMonth: entry.startMonth,
          endMonth: entry.endMonth, startDate: entry.startDate, endDate: entry.endDate,
          before: previousCredits, after: after, value: delta };
        previousCredits = after;
        return item;
      });
      if (previousCredits !== result.months[lastMonth].credits || phases.lastValue !== previousCredits)
        throw new Error("Phase timeline does not reconcile with the current final month.");
      var values = [0, baselineCredits, previousCredits].concat(phaseEntries.map(function (entry) { return entry.after; }));
      var model = { baseline: baselineCredits,
        entries: phaseEntries, excluded: phases.excludedPhases,
        constant: plan.growthMode === "constant", month: lastMonth + 1, date: result.months[lastMonth].date,
        departmentMode: !!plan.departments, min: Math.min.apply(null, values), max: Math.max.apply(null, values) };
      var segmentCount = Math.max(1, Math.ceil(phaseEntries.length / 5));
      for (var i = 0; i < segmentCount; i++) {
        (function (segment) {
          output.push(function (p, s) { phaseSlide(p, s, model, segment, segmentCount); });
        }(i));
      }
    }
    if (views.checkpoints) {
      if (!Array.isArray(context.checkpoints) || context.checkpoints.length > 36)
        throw new Error("Selected review checkpoints must be supplied as an array of at most 36 entries.");
      var seen = new Set();
      context.checkpoints.forEach(function (point) {
        if (!point || !Number.isInteger(point.month) || point.month < 1 || point.month > 36 || seen.has(point.month))
          throw new Error("Checkpoint months must be unique integers from 1 to 36.");
        seen.add(point.month);
        ["owner", "trigger", "response"].forEach(function (key) {
          if (point[key] !== undefined && (typeof point[key] !== "string" || point[key].length > 200))
            throw new Error("Checkpoint " + key + " must be text of at most 200 characters.");
        });
        output.push(function (p, s) { checkpointSlide(p, s, point, result.months, currency); });
      });
      if (!context.checkpoints.length) output.push(function (p, s) {
        heading(s, "Review checkpoints", "No checkpoints supplied", "Owner, trigger and response notes are user-provided.");
      });
    }
    if (views.departments) {
      if (!plan.departments) output.push(function (p, s) {
        heading(s, "Department breakdown", "No department split configured", "No department-level allocation is modeled.");
      });
      else {
        if (!Array.isArray(result.departments) || result.departments.length !== plan.departments.length)
          throw new Error("Selected department breakdown requires matching department results.");
        if (!root.ForecastEngine || typeof root.ForecastEngine.forecastScheduled !== "function")
          throw new Error("Forecast engine is required to validate the department breakdown.");
        var current = root.ForecastEngine.forecastScheduled(plan);
        if (!matchesCurrent(current) || !Array.isArray(current.departments) ||
            current.departments.length !== result.departments.length)
          throw new Error("Department breakdown does not match the current scheduled result.");
        result.departments.forEach(function (department, index) {
          var input = plan.departments[index], expected = current.departments[index];
          if (!department || !input || department.id !== input.id || department.name !== input.name ||
              typeof department.name !== "string" || department.name.length > 160 || !department.totals ||
              !expected || expected.id !== department.id || expected.name !== department.name ||
              !Array.isArray(department.months) || department.months.length !== expected.months.length)
            throw new Error("Department assumptions and results do not match.");
          number(input.startingUsers); number(input.startingCreditsPerUser);
          ["credits", "prepaidCredits", "paygCredits", "cost"].forEach(function (key) {
            number(department.totals[key]);
            if (department.totals[key] !== expected.totals[key])
              throw new Error("Department totals do not match the current scheduled result.");
          });
          department.months.forEach(function (month, i) {
            if (!month || month.month !== expected.months[i].month || month.date !== expected.months[i].date ||
                ["users", "usage", "credits", "prepaidCredits", "paygCredits", "cost"].some(function (key) {
                  return month[key] !== expected.months[i][key];
                })) throw new Error("Department months do not match the current scheduled result.");
          });
          output.push(function (p, s) { departmentSlide(p, s, department, input, index, result.departments.length, currency); });
        });
      }
    }
    return output;
  }

  async function exportDeck(context) {
    if (!context || !context.plan || !context.result) throw new Error("Forecast export requires plan and result.");
    if (typeof root.PptxGenJS !== "function") throw new Error("PptxGenJS is not loaded; load the local bundle before exporting.");
    var plan = context.plan, result = context.result, months = result.months, totals = result.totals;
    var departmentMode = Array.isArray(plan.departments);
    var currency = resolveCurrency(context.currency);
    check(plan, result);
    var history = checkHistory(context.history);
    if (context.decisionNote !== undefined &&
        (typeof context.decisionNote !== "string" || context.decisionNote.length > 300)) {
      throw new Error("Decision note must be text of at most 300 characters.");
    }
    var decisionNote = safeText(context.decisionNote || "").trim();
    if (departmentMode) plan.departments.forEach(function (d) {
      if (!d) throw new Error("Invalid department assumptions.");
      number(d.startingUsers); number(d.startingCreditsPerUser);
    });
    else { number(plan.initialUsers); number(plan.avgCredits); }
    var startingUsers = departmentMode ? plan.departments.reduce(function (a, d) { return a + d.startingUsers; }, 0) : plan.initialUsers;
    var startingDemand = departmentMode ? plan.departments.reduce(function (a, d) { return a + d.startingUsers * d.startingCreditsPerUser; }, 0) : plan.initialUsers * plan.avgCredits;
    number(startingUsers);
    var startingUsage = plan.avgCredits;
    if (departmentMode) {
      if (!startingUsers) startingUsage = 0;
      else if (Number.isFinite(startingDemand)) startingUsage = startingDemand / startingUsers;
      else {
        var maxUsage = Math.max.apply(null, plan.departments.map(function (d) { return d.startingCreditsPerUser; }));
        var weighted = plan.departments.reduce(function (a, d) {
          return a + (d.startingCreditsPerUser / maxUsage) * (d.startingUsers / startingUsers);
        }, 0);
        startingUsage = maxUsage * Math.min(1, weighted);
      }
    }
    var additions = optionalSlides(context, plan, result, currency);
    var totalSlides = (history.length ? 8 : 7) + additions.length, page = 0;
    var hasBaseline = context.baselinePlan != null || context.baselineResult != null;
    if (hasBaseline && (!context.baselinePlan || !context.baselineResult))
      throw new Error("Baseline plan and result must be supplied together.");
    if (hasBaseline) check(context.baselinePlan, context.baselineResult);
    var source = ["Synthetic demo", "Imported data", "Manual assumptions"].indexOf(context.source) >= 0
      ? context.source : "Source unspecified";
    var sourceDetail = typeof context.sourceDetail === "string"
      ? safeText(context.sourceDetail.slice(0, 120)) : "";
    var dateAttribution = context.dateAttribution !== undefined && context.dateAttribution !== null;
    if (dateAttribution && (typeof context.dateAttribution !== "string" ||
        context.dateAttribution.length > 500 || !context.dateAttribution.trim())) {
      throw new Error("Date attribution must be nonempty text of at most 500 characters.");
    }
    var dateCaveat = dateAttribution ? safeText(context.dateAttribution) : "";
    var dateCaveatFontSize = dateCaveat.length > 350 ? 6 : dateCaveat.length > 200 ? 8 : 10;
    var progress = typeof context.onProgress === "function" ? context.onProgress : function () {};
    progress("Building executive deck");
    var pptx = new root.PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "ClawPilot";
    pptx.subject = "Scheduled credit forecast";
    pptx.title = "Credit forecast executive brief";
    var period = months[0].date + " to " + months[months.length - 1].date;
    var s, labels = months.map(function (m) { return m.date; });

    s = slide(pptx, ++page, totalSlides, source);
    box(s, pptx, 0.6, 0.88, 0.08, 3.9, C.cyan);
    text(s, "EXECUTIVE BRIEF", 0.95, 1.03, 10, 0.3, { fontSize: 11, bold: true, color: C.cyan, charSpacing: 2 });
    text(s, "Credit forecast\n& coverage", 0.95, 1.62, 10.8, 1.55,
      { fontSize: 40, bold: true, breakLine: false });
    text(s, "A scheduled view of demand, prepaid coverage and modeled value", 0.98, 3.53, 10.6, 0.5,
      { fontSize: 18, color: C.muted });
    box(s, pptx, 0.98, 4.65, 10.8, sourceDetail ? 0.99 : 0.76);
    text(s, period + "   |   " + plan.horizon + " months   |   " + source + "   |   Currency: " + currency, 1.18, 4.80, 10.3, 0.3,
      { fontSize: 12, bold: true, color: source === "Synthetic demo" ? C.gold : C.ink });
    if (departmentMode) text(s, history.length ?
      "Department forecast uses separately entered assumptions; selected history is background only, not an inferred group split." :
      "Department forecast uses separately entered assumptions; no history is supplied or inferred group split used.",
      0.98, 5.64, 11.8, 0.3, { fontSize: 9, color: C.muted });
    if (source === "Synthetic demo") text(s, "SYNTHETIC DEMO — NOT ACTUAL CUSTOMER DATA", 0.98, 5.96, 10, 0.32,
      { fontSize: 12, bold: true, color: C.gold });
    if (sourceDetail) text(s, "Selected data: " + sourceDetail, 1.18, 5.19, 10.3, 0.25,
      { fontSize: 10, color: C.muted });
    if (dateAttribution) text(s, "SOURCE DATA: " + dateCaveat, 0.98, 6.34, 11.8, 0.52,
      { fontSize: dateCaveatFontSize, color: C.muted });
    note(s, "This deck is generated locally from the scheduled forecast aggregates. It is an estimate, not a billing report." +
      (departmentMode ? (history.length ? " Selected history is background context only;" : " No history was supplied;") +
        " forecast department assumptions were entered separately, not inferred from a historical group split." : ""));

    s = slide(pptx, ++page, totalSlides, source);
    heading(s, "Decision snapshot", "Credits and estimated costs", period + "  •  Full forecast period");
    card(s, pptx, 0.6, 1.86, 3.88, "Total demand", compact(totals.credits), "credits", C.cyan);
    card(s, pptx, 4.72, 1.86, 3.88, "Estimated cost of credits used", money(totals.cost, currency), "estimated, not cash paid", C.ink);
    card(s, pptx, 8.84, 1.86, 3.88, "Modeled PAYG excess", compact(totals.paygCredits), "modeled cost " + money(totals.paygCost, currency), C.gold);
    box(s, pptx, 0.6, 3.48, 12.12, 1.0, C.card2);
    text(s, "BUDGET " + money(plan.budget, currency) + "   |   " +
      (totals.headroom < 0 ? "OVER BUDGET " : "BUDGET REMAINING ") + money(Math.abs(totals.headroom), currency), 0.85, 3.68, 11.5, 0.28,
      { fontSize: 16, bold: true });
    text(s, "Cumulative estimate first over budget: " + at(totals.firstBudget, months) + "   •   First modeled PAYG excess: " + at(totals.firstPayg, months), 0.85, 4.06, 11.5, 0.22,
      { fontSize: 10, color: C.muted });
    var compare = "No saved comparison supplied.";
    if (hasBaseline) {
      var bm = context.baselineResult.months;
      var sourceState = context.baselineSourceComparison;
      if (sourceState !== undefined && ["same", "different", "unknown"].indexOf(sourceState) < 0) sourceState = "unknown";
      var same = context.baselineComparable !== false && (sourceState === undefined || sourceState === "same") &&
        bm.length === months.length && bm.every(function (m, i) { return m.date === months[i].date; });
      compare = same
        ? "Vs saved comparison (same months), demand is " +
          (totals.credits > context.baselineResult.totals.credits ? "higher" :
            totals.credits < context.baselineResult.totals.credits ? "lower" : "equal") +
          " and consumption value is " +
          (totals.cost > context.baselineResult.totals.cost ? "higher" :
            totals.cost < context.baselineResult.totals.cost ? "lower" : "equal") +
          ". Saved: demand " + compact(context.baselineResult.totals.credits) +
          " credits  |  consumption value " + money(context.baselineResult.totals.cost, currency) +
          "  |  PAYG " + compact(context.baselineResult.totals.paygCredits) + " credits."
        : sourceState === "different" ? "Saved comparison uses a different data selection; no totals compared."
          : sourceState === "unknown" ? "Saved comparison data provenance is unknown; no totals compared."
          : context.baselineComparable === false ? "Saved comparison data compatibility is unconfirmed; no totals compared."
          : "Saved comparison uses a different period; no totals compared.";
    }
    text(s, "COMPARISON", 0.65, 4.65, 11.5, 0.2, { fontSize: 9, color: C.cyan, bold: true });
    text(s, compare, 0.65, 4.9, 11.9, 0.54, { fontSize: 12, color: C.ink });
    box(s, pptx, 0.6, 5.55, 12.12, 1.05, C.card);
    text(s, "DECISION NOTE", 0.82, 5.65, 1.7, 0.2, { fontSize: 9, color: C.cyan, bold: true });
    text(s, decisionNote || "No decision note supplied.", 2.55, 5.62, 9.9, 0.91, { fontSize: 11 });
    text(s, paygCaveat + " Estimates are not recommendations, invoices or cash paid.", 0.65, 6.65, 11.9, 0.37,
      { fontSize: 9, color: C.muted });
    note(s, "Budget is compared with modeled consumption value in " + currency + ". Prepaid consumption is valued at the prepaid rate, not at purchase timing. PAYG value is also modeled, not a bill. " + paygCaveat + " Values use the entered numerical units without currency conversion.");

    if (history.length) {
      var shown = history.slice(-36), omitted = history.length - shown.length;
      var historyLabels = shown.map(function (item) {
        return item.month + (item.completeness === "unknown" ? "*" : "");
      });
      var historyColors = shown.map(function (item) {
        return item.completeness === "unknown" ? C.gold : C.cyan;
      });
      var zeroUnknown = shown.filter(function (item) {
        return item.completeness === "unknown" && item.credits === 0 && item.users === 0;
      });
      s = slide(pptx, ++page, totalSlides, source);
      heading(s, "Historical context", "Selected monthly usage history",
        departmentMode ? "Background context only: department forecasts use separately entered assumptions, not a group split inferred from history." :
          "Observed aggregates shown separately from the " + period + " forecast; no continuity or projection is implied.");
      if (source === "Synthetic demo") text(s, "SYNTHETIC DEMO — NOT ACTUAL CUSTOMER DATA", 0.65, 1.65, 11.8, 0.22,
        { fontSize: 9, bold: true, color: C.gold });
      box(s, pptx, 8.65, 1.68, 0.1, 0.1, C.cyan);
      text(s, "Complete", 8.82, 1.62, 1.05, 0.22, { fontSize: 9, color: C.muted });
      box(s, pptx, 10.02, 1.68, 0.1, 0.1, C.gold);
      text(s, "Unknown completeness", 10.19, 1.62, 2.4, 0.22, { fontSize: 9, color: C.muted });
      text(s, "CREDITS", 0.75, 1.98, 11.7, 0.2, { fontSize: 10, color: C.ink, bold: true });
      var historyCreditChart = chartOptions(0.65, 2.2, 12.0, 1.7);
      var historyMax = Math.max.apply(null, shown.map(function (item) { return Math.abs(item.credits); }));
      var historyFormat = historyMax >= 1e9 ? '0.0,,,"B"' : historyMax >= 1e6 ? '0.0,,"M"' : historyMax >= 1e3 ? '0.0,"K"' : "#,##0.0";
      var historyFrequency = shown.length > 24 ? "3" : shown.length > 12 ? "2" : "1";
      Object.assign(historyCreditChart, { barDir: "col", showLegend: false, catAxisLabelRotate: 0,
        chartColors: historyColors, catAxisLabelFrequency: historyFrequency, catAxisLabelFontSize: 8, valAxisLabelFormatCode: historyFormat });
      s.addChart(pptx.ChartType.bar, [
        { name: "Credits", labels: historyLabels, values: shown.map(function (item) { return item.credits; }) }
      ], historyCreditChart);
      text(s, "DISTINCT USERS", 0.75, 4.08, 11.7, 0.2, { fontSize: 10, color: C.ink, bold: true });
      var historyUserChart = chartOptions(0.65, 4.3, 12.0, 1.7);
      Object.assign(historyUserChart, { barDir: "col", showLegend: false, chartColors: historyColors, catAxisLabelRotate: 0,
        catAxisLabelFrequency: historyFrequency, catAxisLabelFontSize: 8, valAxisLabelFormatCode: "#,##0" });
      var historyUserMax = Math.max.apply(null, shown.map(function (item) { return item.users; }));
      if (historyUserMax <= 5 && shown.every(function (item) { return Number.isInteger(item.users); })) {
        historyUserChart.valAxisMajorUnit = 1;
        if (historyUserMax === 0) historyUserChart.valAxisMaxVal = 1;
      }
      s.addChart(pptx.ChartType.bar, [
        { name: "Distinct users", labels: historyLabels, values: shown.map(function (item) { return item.users; }) }
      ], historyUserChart);
      text(s, "Only months in source are shown; missing months are not zeros. Gold and * indicate unknown completeness; months may be partial.",
        0.65, 6.16, 12.0, 0.27, { fontSize: 10, color: C.muted });
      text(s, omitted ? "Most recent 36 months shown; " + omitted + " earlier month(s) omitted." :
        "All " + shown.length + " supplied month(s) shown; monthly aggregates are retained as supplied.",
        0.65, 6.44, 12.0, 0.25, { fontSize: 10, color: C.muted });
      if (zeroUnknown.length) text(s, "Unknown completeness with zero credits and users: " +
        zeroUnknown.map(function (item) { return item.month; }).join(", "),
        0.65, 6.69, 12.0, 0.32, { fontSize: 9, color: C.muted });
      note(s, "History is supplied as monthly aggregates, without individual records. Gold bars and asterisks identify months of unknown completeness, which may be partial. Missing months are not inferred or treated as zero. Historical bars and modeled forecast are separate, with no implied continuity.");
    }

    s = slide(pptx, ++page, totalSlides, source);
    heading(s, "Credit demand", "Monthly credits: prepaid and pay-as-you-go", "Each bar shows forecast demand. Excess is modeled at the PAYG rate. Every forecast month is included.");
    var chart = chartOptions(0.65, 1.78, 12.0, 4.65);
    var maxDemand = Math.max.apply(null, months.map(function (m) { return m.credits; }));
    var axisFormat = maxDemand >= 1e9 ? '0.0,,,"B"' : maxDemand >= 1e6 ? '0.0,,"M"' : maxDemand >= 1e3 ? '0.0,"K"' : "0.0";
    Object.assign(chart, { barDir: "col", barGrouping: "stacked", barOverlapPct: 100,
      valAxisLabelFormatCode: axisFormat, catAxisLabelFrequency: months.length > 24 ? "3" : months.length > 12 ? "2" : "1",
      showLegend: true, catAxisLabelRotate: -45 });
    s.addChart(pptx.ChartType.bar, [
      { name: "Prepaid consumed", labels: labels, values: months.map(function (m) { return m.prepaidCredits; }) },
      { name: "Modeled excess (PAYG)", labels: labels, values: months.map(function (m) { return m.paygCredits; }) }
    ], chart);
    text(s, "First prepaid depletion: " + at(totals.firstDepletion, months) + "   |   First modeled PAYG excess: " + at(totals.firstPayg, months),
      0.75, 6.42, 11.8, 0.27, { fontSize: 10, color: C.muted });
    text(s, paygCaveat, 0.75, 6.73, 11.8, 0.25, { fontSize: 9, color: C.muted });
    note(s, "Each bar sums prepaid credits consumed and modeled PAYG excess. Prepaid availability can be replenished later, so first depletion is not necessarily permanent. " + paygCaveat);

    s = slide(pptx, ++page, totalSlides, source);
    heading(s, "Prepaid ledger", "How coverage flows through the model", "Credits, not currency. The model's funding rules determine the ledger.");
    var monthly = plan.fundingMode === "monthly";
    var supplied = monthly ? plan.monthlyAllocation * plan.horizon : totals.purchases;
    var unused = monthly ? months.reduce(function (a, m) { return a + m.remaining; }, 0) : totals.remaining;
    var ledger = monthly ? [
      ["Opening balance", 0, "No carry-in in reset mode"],
      ["Monthly allocations", supplied, compact(plan.monthlyAllocation) + " credits / month × horizon"],
      ["Prepaid consumed", totals.prepaidCredits, "Credits applied to demand"],
      ["Unused allocations", unused, "Unused amounts reset each month"],
      ["Final month remaining", totals.remaining, "Not carried into a new month"]
    ] : [
      ["Opening balance", plan.openingPool, "Prepaid credits at start"],
      ["Scheduled purchases", totals.purchases, "Credits added within forecast"],
      ["Prepaid consumed", totals.prepaidCredits, "Credits applied to demand"],
      ["Ending balance", totals.remaining, "Credits remaining at horizon end"]
    ];
    ledger.forEach(function (r, i) {
      var y = 1.85 + i * 0.69;
      box(s, pptx, 0.6, y, 8.25, 0.57, i % 2 ? C.card2 : C.card);
      text(s, r[0], 0.82, y + 0.12, 3.0, 0.28, { fontSize: 13, bold: true });
      text(s, compact(r[1]), 3.9, y + 0.12, 1.6, 0.28, { fontSize: 15, bold: true, color: C.cyan, align: "right" });
      text(s, r[2], 5.8, y + 0.13, 2.8, 0.26, { fontSize: 10, color: C.muted });
    });
    card(s, pptx, 9.18, 1.85, 3.53, "Forecast demand", compact(totals.credits), "prepaid + modeled excess", C.ink);
    card(s, pptx, 9.18, 3.48, 3.53, "Modeled PAYG excess", compact(totals.paygCredits), "credits beyond prepaid coverage", C.gold);
    text(s, monthly ? "Monthly reset is an input assumption, not a contract expiry claim." :
      "Unused pool credits carry forward in this model; expiry and contract terms are not modeled.",
      0.65, 6.35, 11.8, 0.42, { fontSize: 11, color: C.muted });
    text(s, paygCaveat, 0.65, 6.79, 11.8, 0.22, { fontSize: 9, color: C.muted });
    note(s, (monthly ? "The sum of unused allocations is not an ending balance: the model resets availability each month. The final month remaining is shown separately." :
      "Pool balance begins with opening credits. Purchases are added in their scheduled month before demand is covered. No expiry is modeled.") + " " + paygCaveat);

    s = slide(pptx, ++page, totalSlides, source);
    heading(s, "Rollout assumptions", "Users and usage drive credit demand", "Configured monthly growth rates; values are assumptions, not observed outcomes.");
    card(s, pptx, 0.6, 1.75, 3.85, "Starting users", compact(startingUsers), "Maximum: " + (plan.userCap === null ? "none" : compact(plan.userCap)), C.cyan);
    card(s, pptx, 4.73, 1.75, 3.85, departmentMode ? "Starting weighted usage" : "Starting usage",
      departmentMode && startingUsers === 0 ? "Unavailable" : compact(startingUsage),
      departmentMode && startingUsers === 0 ? "No starting users" : "credits per user per month", C.ink);
    card(s, pptx, 8.86, 1.75, 3.85, "Final modeled users", compact(months[months.length - 1].users), "after growth, overrides and cap", C.green);
    var growth = months.map(function (m) { return growthAt(plan, m.month); });
    var opt = chartOptions(0.65, 3.33, 12, 3.02);
    opt.valAxisLabelFormatCode = "0.0%";
    opt.catAxisLabelFrequency = months.length > 24 ? "3" : months.length > 12 ? "2" : "1";
    s.addChart(pptx.ChartType.line, [
      { name: "User growth % / month", labels: labels, values: growth.map(function (v) { return v[0]; }) },
      { name: "Usage growth % / month", labels: labels, values: growth.map(function (v) { return v[1]; }) }
    ], opt);
    text(s, "Matching rates overlap. Growth: " + plan.growthMode + "  •  Month 1 usage growth: " +
      (plan.firstMonthUsageGrowth === true ? "applied" : "not applied") + "  •  User overrides follow growth and precede the cap.",
      0.65, 6.55, 11.95, 0.3, { fontSize: 10, color: C.muted });
    note(s, "User growth applies in month one and users are rounded to whole people each month" +
      (departmentMode ? " separately by department; a binding global cap is apportioned by largest remainder" : "") +
      ". Usage growth begins in month two unless first-month usage growth is enabled. Overrides replace the grown user count before the cap." +
      (departmentMode ? " Aggregate usage is weighted demand per user, unavailable when there are no users; aggregate starting inputs are ignored." : ""));

    s = slide(pptx, ++page, totalSlides, source);
    heading(s, "Scheduled inputs", "Rollout steps and prepaid purchases", "User steps set the total for that month; purchases are available before credits are used.");
    var scheduledMonths = months.filter(function (m) { return m.override !== null || m.purchase > 0; });
    if (!scheduledMonths.length) text(s, "No user overrides or prepaid purchases are applied in this forecast.", 0.8, 2.0, 11.5, 0.5, { fontSize: 16 });
    var columns = Math.ceil(scheduledMonths.length / 12);
    var colW = 12.1 / columns;
    for (var c = 0; c < columns; c++) {
      var x = 0.6 + c * colW, width = colW - 0.12;
      box(s, pptx, x, 1.77, width, 0.4, C.card2);
      text(s, "MONTH", x + 0.1, 1.86, width * 0.32, 0.17, { fontSize: 8, bold: true, color: C.muted });
      text(s, "OVERRIDE", x + width * 0.34, 1.86, width * 0.29, 0.17, { fontSize: 8, bold: true, color: C.muted, align: "right" });
      text(s, "PURCHASE", x + width * 0.66, 1.86, width * 0.31 - 0.1, 0.17, { fontSize: 8, bold: true, color: C.muted, align: "right" });
      scheduledMonths.slice(c * 12, c * 12 + 12).forEach(function (m, i) {
        var y = 2.21 + i * 0.31;
        if (i % 2 === 0) box(s, pptx, x, y, width, 0.3, C.card);
        text(s, m.date, x + 0.1, y + 0.05, width * 0.32, 0.2, { fontSize: 9 });
        text(s, m.override === null ? "—" : compact(m.override), x + width * 0.34, y + 0.05, width * 0.29, 0.2, { fontSize: 9, align: "right" });
        text(s, compact(m.purchase), x + width * 0.66, y + 0.05, width * 0.31 - 0.1, 0.2, { fontSize: 9, align: "right" });
      });
    }
    var futureSteps = plan.steps.filter(function (v) { return v.month > plan.horizon; }).length;
    var futurePurchases = plan.purchases.filter(function (v) { return v.month > plan.horizon; });
    text(s, "Only months with changes are shown; purchases in the same month are combined." +
      (futureSteps || futurePurchases.length ? " Outside forecast: " + futureSteps + " override(s), " + futurePurchases.length + " purchase(s); excluded from results." : "") +
      (monthly && plan.purchases.length ? " Scheduled purchases are saved but not included when credits reset monthly." : ""),
      0.65, 6.34, 12.0, 0.48, { fontSize: 10, color: C.muted });
    note(s, "A dash means no user override; zero is a valid override. Multiple purchases in a month are summed. Inputs outside the forecast horizon are not applied by the model.");

    s = slide(pptx, ++page, totalSlides, source);
    heading(s, "Methodology & caveats", "Interpret the forecast in context", "Assumptions and limitations of the scheduled model");
    var bullets = [
      ["DEMAND", departmentMode ? "Demand sums department users × department usage. Users round per group; a global cap is apportioned. Aggregate usage is weighted." :
        "Monthly credits = modeled users × credits per user. User counts are rounded and capped; overrides replace the grown count."],
      ["PRICING", "Prepaid: " + money(plan.prepaidRate, currency, true) + " / credit; PAYG: " + money(plan.paygRate, currency, true) + " / credit. No currency conversion."],
      ["FUNDING", monthly ? "A fixed allocation resets each month; unused credits do not carry over. Contract terms and expiration are not modeled." : "Opening credits and scheduled purchases form a carry-forward pool. Credit expiration and contract terms are not modeled."],
      ["VALUE ≠ BILL", "Consumption value prices credits used, not cash paid. Purchase timing, invoices, taxes and actual billing are not modeled."],
      ["PROVENANCE", departmentMode ? source + (history.length ? ". Selected history is background only; " : ". No history supplied; ") +
        "forecasts use separately entered department assumptions, not an inferred group split." :
        source === "Synthetic demo" ? "Synthetic demo: example assumptions and outputs are not customer actuals." : source + ". Results are modeled estimates, not actuals or realized savings."]
    ];
    bullets.forEach(function (b, i) {
      var y = 1.79 + i * 0.83;
      box(s, pptx, 0.6, y, 12.1, 0.7, i % 2 ? C.card2 : C.card);
      text(s, b[0], 0.82, y + 0.19, 1.45, 0.25, { fontSize: 10, bold: true, color: C.cyan });
      text(s, b[1], 2.35, y + 0.1, 10.05, 0.47, { fontSize: 12 });
    });
    if (dateAttribution) text(s, "SOURCE DATA: " + dateCaveat, 0.65, 5.94, 11.8, 0.49,
      { fontSize: dateCaveatFontSize, color: C.muted });
    text(s, "Figures are rounded for display; underlying model values retain precision.", 0.65, 6.48, 11.8, 0.25,
      { fontSize: 10, color: C.muted });
    note(s, "The model is an estimate under the supplied assumptions. Pricing is in " + currency + ": prepaid " + money(plan.prepaidRate, currency, true) + " per credit; PAYG " + money(plan.paygRate, currency, true) + " per credit. No currency conversion is applied. It does not model contract expiration, taxes, invoice timing, or other billing terms.");

    additions.forEach(function (render) {
      var extra = slide(pptx, ++page, totalSlides, source);
      render(pptx, extra);
    });
    progress("Saving PowerPoint");
    await pptx.writeFile({ fileName: "credit-forecast-executive-brief.pptx" });
  }
  root.ForecastDeck = Object.freeze({ export: exportDeck });
}(typeof globalThis !== "undefined" ? globalThis : this));
