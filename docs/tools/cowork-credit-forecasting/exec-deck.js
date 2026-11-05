/* Browser-only one-page executive overview for the scheduled forecast model. */
(function (root) {
  "use strict";

  var C = { navy: "0F3D6E", blue: "0F6CBD", ink: "242424", muted: "605E5C", line: "D1D1D1", panel: "F3F2F1", white: "FFFFFF", amber: "C27A00", green: "107C41", prepaid: "0F3D6E", payg: "F2A33A" };
  var FONT = "Segoe UI";

  function fmt(n, digits) { return n.toLocaleString("en-US", { maximumFractionDigits: digits === undefined ? 0 : digits }); }
  function short(n) {
    var a = Math.abs(n);
    if (a >= 1e9) return fmt(n / 1e9, 2) + "B";
    if (a >= 1e6) return fmt(n / 1e6, 1) + "M";
    if (a >= 1e4) return fmt(n / 1e3, 0) + "K";
    return fmt(n);
  }
  function usd(n) { return "$" + short(n); }
  var MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function label(d) { var m = /^(\d{4})-(\d{2})/.exec(String(d)); return m ? MON[+m[2] - 1] + " " + m[1] : String(d); }
  function pct(f) { return fmt(f * 100, 1).replace(/\.0$/, "") + "%"; }

  function summarize(plan, result) {
    var months = result.months, n = months.length;
    var sum = function (key) { return months.reduce(function (t, m) { return t + (m[key] || 0); }, 0); };
    var rated = typeof plan.prepaidRate === "number" && typeof plan.paygRate === "number";
    var pr = plan.prepaidRate || 0, pg = plan.paygRate || 0;
    var s = {
      n: n, rated: rated, pr: pr, pg: pg,
      credits: sum("credits"), prepaid: sum("prepaidCredits"), payg: sum("paygCredits"),
      startUsers: months[0].users, endUsers: months[n - 1].users,
      opening: plan.openingPool || 0, firstPayg: null
    };
    for (var i = 0; i < n; i++) if ((months[i].paygCredits || 0) > 0) { s.firstPayg = i; break; }
    s.cost = s.prepaid * pr + s.payg * pg;
    s.savings = s.payg * Math.max(0, pg - pr);
    return s;
  }

  function sentences(plan, result, s) {
    var months = result.months, out = [];
    var demand = s.rated ? usd(s.cost) + " (" + short(s.credits) + " credits)" : short(s.credits) + " credits";
    var growth = [];
    if (plan.userGrowth > 0) growth.push("user growth of " + pct(plan.userGrowth) + " per month");
    if (plan.usageGrowth > 0) growth.push("usage growth of " + pct(plan.usageGrowth) + " per month");
    out.push(["Demand. ", "We estimate credit demand of " + demand + " over " + s.n + " months. This assumes users move from " + fmt(s.startUsers) + " to " + fmt(s.endUsers) + (growth.length ? ", with " + growth.join(" and ") : "") + "."]);
    if (s.opening > 0) {
      out.push(["Prepaid today. ", s.firstPayg === null
        ? "Our current prepaid balance of " + short(s.opening) + " credits covers the full " + s.n + "-month forecast."
        : "Our current prepaid balance of " + short(s.opening) + " credits lasts through " + (s.firstPayg === 0 ? "the start of the forecast" : label(months[s.firstPayg - 1].date)) + "."]);
    } else {
      out.push(["Prepaid today. ", "There is no prepaid balance in this plan, so all demand is currently PAYGO."]);
    }
    if (s.firstPayg !== null) {
      var when = label(months[s.firstPayg].date);
      out.push(["Next funding. ", "We will need additional prepaid funding in " + when + " (" + short(s.payg) + " credits through the horizon), unless we choose PAYGO."]);
      out.push(["Opportunity. ", s.rated && s.savings > 0
        ? "Prepaid funding in " + when + " can improve economics by about " + usd(s.savings) + " versus PAYGO."
        : "Add prepaid and PAYGO rates to quantify the savings from prepaying in " + when + "."]);
    }
    return out;
  }

  function scheduleSlides(pptx, s, months) {
    var PER = 12, pages = Math.ceil(months.length / PER);
    var heads = ["Month", "Users", "Credits / user", "Credit need", "Prepaid used", "Prepaid balance", "PAYGO credits"];
    if (s.rated) heads.push("Prepaid cost", "PAYGO cost", "Total cost");
    var cell = function (t, o) { return { text: String(t), options: Object.assign({ fontFace: FONT, fontSize: 10.5, color: C.ink, align: "right", valign: "middle", border: [{ type: "none" }, { type: "none" }, { pt: 0.5, color: "E6E6E6" }, { type: "none" }] }, o || {}) }; };
    for (var p = 0; p < pages; p++) {
      var sl = pptx.addSlide(), rows = months.slice(p * PER, (p + 1) * PER);
      sl.background = { color: C.white };
      sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: C.navy }, line: { color: C.navy } });
      sl.addText("Monthly schedule" + (pages > 1 ? " (" + (p + 1) + " of " + pages + ")" : ""), { x: 0.6, y: 0.35, w: 9, h: 0.5, fontFace: FONT, fontSize: 24, bold: true, color: C.navy, margin: 0 });
      sl.addText("Prepaid credits are used first; the remainder is PAYGO.", { x: 0.6, y: 0.88, w: 9, h: 0.3, fontFace: FONT, fontSize: 12, color: C.muted, margin: 0 });
      var table = [heads.map(function (h, i) { return cell(h, { bold: true, color: C.white, fill: { color: C.navy }, align: i === 0 ? "left" : "right", fontSize: 10 }); })];
      rows.forEach(function (m, i) {
        var pc = (m.prepaidCredits || 0) * s.pr, gc = (m.paygCredits || 0) * s.pg, fill = i % 2 ? { color: C.panel } : { color: C.white };
        var r = [label(m.date), fmt(m.users), fmt(m.usage || (m.users ? m.credits / m.users : 0)), fmt(m.credits), fmt(m.prepaidCredits || 0), fmt(m.remaining || 0), fmt(m.paygCredits || 0)];
        if (s.rated) r.push("$" + fmt(pc), "$" + fmt(gc), "$" + fmt(pc + gc));
        table.push(r.map(function (v, j) { return cell(v, { align: j === 0 ? "left" : "right", fill: fill, bold: j === 0 || (s.rated && j === r.length - 1), color: j === 6 && (m.paygCredits || 0) > 0 ? C.amber : C.ink }); }));
      });
      if (p === pages - 1) {
        var t = ["Total", "", "", fmt(s.credits), fmt(s.prepaid), "", fmt(s.payg)];
        if (s.rated) t.push("$" + fmt(s.prepaid * s.pr), "$" + fmt(s.payg * s.pg), "$" + fmt(s.cost));
        table.push(t.map(function (v, j) { return cell(v, { bold: true, align: j === 0 ? "left" : "right", fill: { color: "E3EDF7" }, color: C.navy }); }));
      }
      var colW = s.rated ? [1.2, 0.8, 1.1, 1.3, 1.3, 1.4, 1.2, 1.1, 1.1, 1.1] : [1.6, 1.2, 1.6, 1.9, 1.9, 2.0, 1.9];
      sl.addTable(table, { x: 0.6, y: 1.45, w: colW.reduce(function (a, b) { return a + b; }, 0), colW: colW, rowH: 0.36 });
      sl.addShape(pptx.ShapeType.line, { x: 0.6, y: 7.0, w: 12.13, h: 0, line: { color: C.line, width: 0.75 } });
      sl.addText("Model estimate, not an invoice. Credits unless marked $.", { x: 0.6, y: 7.05, w: 12.1, h: 0.25, fontFace: FONT, fontSize: 9, color: C.muted, margin: 0 });
    }
  }

  async function exportDeck(context) {
    var plan = context.plan, result = context.result;
    if (!root.PptxGenJS) throw new Error("PowerPoint library is not loaded.");
    if (!plan || !result || !Array.isArray(result.months) || !result.months.length) throw new Error("No forecast to export.");
    var s = summarize(plan, result), months = result.months;
    var pptx = new root.PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.title = "Cowork credit forecast: executive overview";
    var sl = pptx.addSlide();
    sl.background = { color: C.white };

    sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.12, fill: { color: C.navy }, line: { color: C.navy } });
    sl.addText("Cowork credit forecast", { x: 0.6, y: 0.35, w: 9, h: 0.5, fontFace: FONT, fontSize: 26, bold: true, color: C.navy, margin: 0 });
    sl.addText("Executive overview  |  " + label(months[0].date) + " to " + label(months[s.n - 1].date), { x: 0.6, y: 0.88, w: 9, h: 0.3, fontFace: FONT, fontSize: 12, color: C.muted, margin: 0 });

    var cards = [
      ["Total credit need", short(s.credits), s.n + " months"],
      ["Prepaid-funded", short(s.prepaid), s.rated ? usd(s.prepaid * s.pr) : "credits"],
      ["PAYGO / additional", short(s.payg), s.rated ? usd(s.payg * s.pg) : "credits"],
      [s.rated ? "Total forecast cost" : "Ending users", s.rated ? usd(s.cost) : fmt(s.endUsers), s.rated ? "Potential prefunding savings " + usd(s.savings) : "users"]
    ];
    var cw = 2.9, gap = 0.17;
    cards.forEach(function (c, i) {
      var x = 0.6 + i * (cw + gap);
      sl.addShape(pptx.ShapeType.rect, { x: x, y: 1.45, w: cw, h: 1.2, fill: { color: C.panel }, line: { color: C.panel } });
      sl.addShape(pptx.ShapeType.rect, { x: x, y: 1.45, w: 0.06, h: 1.2, fill: { color: i === 2 ? C.payg : C.navy }, line: { color: i === 2 ? C.payg : C.navy } });
      sl.addText(c[0].toUpperCase(), { x: x + 0.2, y: 1.55, w: cw - 0.3, h: 0.25, fontFace: FONT, fontSize: 9, bold: true, color: C.muted, margin: 0 });
      sl.addText(c[1], { x: x + 0.2, y: 1.82, w: cw - 0.3, h: 0.5, fontFace: FONT, fontSize: 26, bold: true, color: C.ink, margin: 0 });
      sl.addText(c[2], { x: x + 0.2, y: 2.32, w: cw - 0.3, h: 0.25, fontFace: FONT, fontSize: 10, color: C.muted, margin: 0 });
    });

    var runs = [];
    sentences(plan, result, s).forEach(function (p, i, all) {
      runs.push({ text: p[0], options: { bold: true, color: C.navy, breakLine: false, paraSpaceAfter: 14 } });
      runs.push({ text: p[1], options: { color: C.ink, breakLine: i < all.length - 1, paraSpaceAfter: 14 } });
    });
    sl.addText(runs, { x: 0.6, y: 2.95, w: 5.4, h: 3.9, fontFace: FONT, fontSize: 15, valign: "top", margin: 0 });

    var labels = months.map(function (m) { return label(m.date); });
    var mult = s.rated;
    sl.addText(mult ? "Monthly cost by funding source" : "Monthly credits by funding source", { x: 6.4, y: 2.95, w: 6.3, h: 0.3, fontFace: FONT, fontSize: 12, bold: true, color: C.navy, margin: 0 });
    sl.addChart(pptx.ChartType.bar, [
      { name: "Prepaid", labels: labels, values: months.map(function (m) { return (m.prepaidCredits || 0) * (mult ? s.pr : 1); }) },
      { name: "PAYGO", labels: labels, values: months.map(function (m) { return (m.paygCredits || 0) * (mult ? s.pg : 1); }) }
    ], {
      x: 6.4, y: 3.25, w: 6.33, h: 3.6, barDir: "col", barGrouping: "stacked", chartColors: [C.prepaid, C.payg],
      showLegend: true, legendPos: "b", legendFontFace: FONT, legendFontSize: 10, legendColor: C.muted,
      catAxisLabelFontFace: FONT, catAxisLabelFontSize: 9, catAxisLabelColor: C.muted, catAxisLabelRotate: 315,
      valAxisLabelFontFace: FONT, valAxisLabelFontSize: 9, valAxisLabelColor: C.muted,
      valAxisLabelFormatCode: mult ? "$#,##0,K" : "#,##0,,\"M\"",
      valGridLine: { color: "E6E6E6", size: 0.5 }, catGridLine: { style: "none" }
    });

    sl.addShape(pptx.ShapeType.line, { x: 0.6, y: 7.0, w: 12.13, h: 0, line: { color: C.line, width: 0.75 } });
    sl.addText("Model estimate, not an invoice. PAYGO availability depends on your agreement.", { x: 0.6, y: 7.05, w: 12.1, h: 0.25, fontFace: FONT, fontSize: 9, color: C.muted, margin: 0 });

    scheduleSlides(pptx, s, months);

    if (context.onProgress) context.onProgress("Building PowerPoint");
    await pptx.writeFile({ fileName: "credit-forecast-executive-overview.pptx" });
  }

  root.ForecastDeck = Object.freeze({ export: exportDeck, summarize: summarize, sentences: sentences });
})(typeof globalThis !== "undefined" ? globalThis : this);
