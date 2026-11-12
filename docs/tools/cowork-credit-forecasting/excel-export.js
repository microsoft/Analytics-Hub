/*
 * Excel workbook export for the Cowork credit forecast.
 * Builds a four-sheet .xlsx (Inputs, Forecast Dashboard, Forecast, Prepaid Coverage) whose
 * live formulas mirror "Credit Forecasting Tool.xlsx". Cached values come from the engine so
 * the numbers show before Excel recalculates. Requires JSZip (globalThis.JSZip).
 */
(function (root) {
  "use strict";
  var MAX = 36, FIRST = 7, LAST = FIRST + MAX - 1, SCHED_FIRST = 16, SCHED_LAST = SCHED_FIRST + MAX - 1;

  var S = { def: 0, title: 1, head: 2, inNum: 3, inPct: 4, inRate: 5, inDate: 6, int: 7, dec: 8, date: 9, usd: 10, factor: 11, bold: 12, kpiLabel: 13, kpiInt: 14, kpiUsd: 15, kpiRate: 16, wrap: 17, note: 18, section: 19, kpiDate: 20, headDate: 21 };

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function col(n) { var s = ""; while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; }
  function serial(ym) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7); return Math.round((Date.UTC(y, m - 1, 1) - Date.UTC(1899, 11, 30)) / 86400000); }
  function addMonths(ym, k) { var y = +ym.slice(0, 4), m = +ym.slice(5, 7) - 1 + k; return String(y + Math.floor(m / 12)) + "-" + String((m % 12) + 1).padStart(2, "0"); }

  function Sheet(name) { this.name = name; this.rows = {}; this.cols = []; this.merges = []; this.freeze = null; }
  Sheet.prototype.set = function (ref, cell) {
    var m = /^([A-Z]+)(\d+)$/.exec(ref), r = +m[2];
    (this.rows[r] = this.rows[r] || {})[ref] = cell;
  };
  Sheet.prototype.text = function (ref, value, style) { this.set(ref, { t: "s", v: value, s: style || 0 }); };
  Sheet.prototype.num = function (ref, value, style) { this.set(ref, { t: "n", v: value, s: style || 0 }); };
  Sheet.prototype.f = function (ref, formula, cached, style) { this.set(ref, { f: formula, v: cached, s: style || 0 }); };
  Sheet.prototype.blank = function (ref, style) { this.set(ref, { t: "b", s: style }); };
  Sheet.prototype.xml = function () {
    function colNum(ref) { var letters = /^[A-Z]+/.exec(ref)[0], n = 0; for (var i = 0; i < letters.length; i++) n = n * 26 + letters.charCodeAt(i) - 64; return n; }
    var out = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0" showGridLines="0"'];
    out.push(this.name === "Inputs" ? ' tabSelected="1">' : ">");
    if (this.freeze) out.push('<pane xSplit="' + (this.freeze.x || 0) + '" ySplit="' + this.freeze.y + '" topLeftCell="' + col((this.freeze.x || 0) + 1) + (this.freeze.y + 1) + '" activePane="' + (this.freeze.x ? "bottomRight" : "bottomLeft") + '" state="frozen"/>');
    out.push("</sheetView></sheetViews><sheetFormatPr defaultRowHeight=\"15\"/>");
    if (this.cols.length) out.push("<cols>" + this.cols.map(function (c) { return '<col min="' + c[0] + '" max="' + c[1] + '" width="' + c[2] + '" customWidth="1"/>'; }).join("") + "</cols>");
    out.push("<sheetData>");
    Object.keys(this.rows).map(Number).sort(function (a, b) { return a - b; }).forEach(function (r) {
      var cells = this.rows[r];
      out.push('<row r="' + r + '">');
      Object.keys(cells).sort(function (a, b) { return colNum(a) - colNum(b); }).forEach(function (ref) {
        var c = cells[ref], s = c.s ? ' s="' + c.s + '"' : "";
        if (c.f !== undefined) {
          var fx = "<f>" + esc(c.f) + "</f>";
          if (typeof c.v === "number" && isFinite(c.v)) out.push('<c r="' + ref + '"' + s + ">" + fx + "<v>" + c.v + "</v></c>");
          else out.push('<c r="' + ref + '"' + s + ' t="str">' + fx + "<v>" + esc(c.v === undefined || c.v === null ? "" : c.v) + "</v></c>");
        } else if (c.t === "n") out.push('<c r="' + ref + '"' + s + "><v>" + c.v + "</v></c>");
        else if (c.t === "s") out.push('<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + esc(c.v) + "</t></is></c>");
        else out.push('<c r="' + ref + '"' + s + "/>");
      });
      out.push("</row>");
    }, this);
    out.push("</sheetData>");
    if (this.merges.length) out.push('<mergeCells count="' + this.merges.length + '">' + this.merges.map(function (m) { return '<mergeCell ref="' + m + '"/>'; }).join("") + "</mergeCells>");
    out.push('<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>' + (this.drawing ? '<drawing r:id="rId1"/>' : "") + "</worksheet>");
    return out.join("");
  };

  function stylesXml() {
    var fonts = [
      '<font><sz val="11"/><name val="Segoe UI"/></font>',
      '<font><b/><sz val="16"/><color rgb="FF0F3D6E"/><name val="Segoe UI"/></font>',
      '<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Segoe UI"/></font>',
      '<font><b/><sz val="11"/><name val="Segoe UI"/></font>',
      '<font><b/><sz val="9"/><color rgb="FF605E5C"/><name val="Segoe UI"/></font>',
      '<font><b/><sz val="16"/><color rgb="FF242424"/><name val="Segoe UI"/></font>',
      '<font><sz val="10"/><color rgb="FF605E5C"/><name val="Segoe UI"/></font>',
      '<font><b/><sz val="12"/><color rgb="FF0F6CBD"/><name val="Segoe UI"/></font>'
    ];
    var fills = [
      '<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FF0F3D6E"/></patternFill></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4CE"/></patternFill></fill>',
      '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F2F1"/></patternFill></fill>'
    ];
    var border = '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD1D1D1"/></left><right style="thin"><color rgb="FFD1D1D1"/></right><top style="thin"><color rgb="FFD1D1D1"/></top><bottom style="thin"><color rgb="FFD1D1D1"/></bottom><diagonal/></border></borders>';
    var numFmts = ['<numFmt numFmtId="164" formatCode="mmm\\ yyyy"/>', '<numFmt numFmtId="165" formatCode="&quot;$&quot;#,##0"/>', '<numFmt numFmtId="166" formatCode="0.0000"/>', '<numFmt numFmtId="167" formatCode="&quot;$&quot;0.0000"/>', '<numFmt numFmtId="168" formatCode="0.0%"/>'];
    function xf(numFmt, font, fill, borderId, extra) { return '<xf numFmtId="' + numFmt + '" fontId="' + font + '" fillId="' + fill + '" borderId="' + borderId + '" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"' + (extra ? " applyAlignment=\"1\">" + extra + "</xf>" : "/>"); }
    var wrapC = '<alignment horizontal="center" vertical="center" wrapText="1"/>', wrap = '<alignment vertical="top" wrapText="1"/>';
    var xfs = [
      xf(0, 0, 0, 0), xf(0, 1, 0, 0), xf(0, 2, 2, 1, wrapC),
      xf(3, 0, 3, 1), xf(168, 0, 3, 1), xf(166, 0, 3, 1), xf(164, 0, 3, 1),
      xf(3, 0, 0, 1), xf(4, 0, 0, 1), xf(164, 0, 0, 1), xf(165, 0, 0, 1), xf(166, 0, 0, 1),
      xf(0, 3, 0, 0), xf(0, 4, 4, 1, wrap), xf(3, 5, 4, 1), xf(165, 5, 4, 1), xf(167, 5, 4, 1),
      xf(0, 0, 0, 0, wrap), xf(0, 6, 0, 0, wrap), xf(0, 7, 0, 0), xf(164, 5, 4, 1), xf(164, 2, 2, 1, wrapC)
    ];
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="' + numFmts.length + '">' + numFmts.join("") + '</numFmts><fonts count="' + fonts.length + '">' + fonts.join("") + '</fonts><fills count="' + fills.length + '">' + fills.join("") + "</fills>" + border + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="' + xfs.length + '">' + xfs.join("") + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  }

  function build(plan, forecast) {
    var months = forecast.months, n = plan.horizon, start = plan.startMonth;
    var cap = plan.userCap == null || plan.userCap === "" ? null : plan.userCap;
    var steps = {}, buys = {};
    (plan.steps || []).forEach(function (s) { if (s.users > 0) steps[s.month] = s.users; });
    (plan.purchases || []).forEach(function (p) { buys[p.month] = (buys[p.month] || 0) + p.credits; });

    // ---- Inputs ----
    var inp = new Sheet("Inputs");
    inp.cols = [[1, 1, 38], [2, 2, 18], [3, 3, 24], [4, 4, 48], [5, 5, 22], [6, 6, 30]];
    inp.text("A1", "Credit Needs Forecasting Tool - Inputs", S.title);
    inp.text("A3", "Assumption", S.head); inp.text("B3", "Input", S.head); inp.text("D3", "How to use", S.head);
    var labels = ["Average credits per user per month", "Starting users", "Monthly usage increase %", "Monthly continuous user increase %", "Max allowed users", "Forecast months (1-36)", "Forecast start month", "Opening prepaid credit balance", "Prepaid rate per credit", "PAYGO rate per credit"];
    labels.forEach(function (l, i) { inp.text("A" + (4 + i), l, S.bold); });
    inp.num("B4", plan.avgCredits, S.inNum); inp.num("B5", plan.initialUsers, S.inNum);
    inp.num("B6", plan.usageGrowth, S.inPct); inp.num("B7", plan.userGrowth, S.inPct);
    if (cap === null) inp.blank("B8", S.inNum); else inp.num("B8", cap, S.inNum);
    inp.num("B9", n, S.inNum); inp.num("B10", serial(start), S.inDate);
    inp.num("B11", plan.openingPool || 0, S.inNum);
    if (plan.prepaidRate == null) inp.blank("B12", S.inRate); else inp.num("B12", plan.prepaidRate, S.inRate);
    if (plan.paygRate == null) inp.blank("B13", S.inRate); else inp.num("B13", plan.paygRate, S.inRate);
    var how = [
      ["D4", "1. Set core assumptions"], ["D5", "Edit the yellow input cells. Enter the prepaid and PAYGO rates as cost per credit."],
      ["D6", "2. Configure growth"], ["D7", "Usage and user growth compound monthly. For a planned expansion, enter the full resulting user count in New total users after step-up."],
      ["D8", "3. Plan prepaid coverage"], ["D9", "Enter credits already owned in Opening prepaid credit balance and future purchases in the monthly schedule. Unused prepaid credits roll forward."],
      ["D10", "4. Set the user ceiling"], ["D11", "Set Max allowed users to stop user growth at a ceiling; leave it blank for no ceiling. Usage growth per user continues."]
    ];
    how.forEach(function (h, i) { inp.text(h[0], h[1], i % 2 ? S.note : S.bold); });
    inp.text("A14", "Step-up user schedule", S.section); inp.text("E14", "Prepaid credit purchase schedule", S.section);
    ["Month #", "Effective month", "New total users after step-up", "Notes", "Planned credits added", "Purchase notes"].forEach(function (h, i) { inp.text(col(i + 1) + "15", h, S.head); });
    for (var m = 1; m <= MAX; m++) {
      var r = SCHED_FIRST + m - 1;
      inp.num("A" + r, m, S.int);
      inp.f("B" + r, 'IF(A' + r + '<=$B$9,EDATE($B$10,A' + r + '-1),"")', m <= n ? serial(addMonths(start, m - 1)) : "", S.date);
      if (steps[m]) inp.num("C" + r, steps[m], S.inNum); else inp.blank("C" + r, S.inNum);
      inp.blank("D" + r, S.inNum);
      if (buys[m]) inp.num("E" + r, buys[m], S.inNum); else inp.blank("E" + r, S.inNum);
      inp.blank("F" + r, S.inNum);
    }
    inp.freeze = { y: 3 };

    // ---- Forecast (computed cache + formulas) ----
    var fc = new Sheet("Forecast");
    fc.cols = [[1, 1, 9], [2, 2, 12], [3, 12, 16], [13, 14, 18], [15, 16, 20]];
    fc.text("A1", "Credit Needs Forecast - Monthly Waterfall", S.title);
    ["Total forecast credits", "", "Peak monthly credits", "", "Ending users", "", "Ending credits/user"].forEach(function (l, i) { if (l) fc.text(col(i + 1) + "3", l, S.kpiLabel); });
    var heads = ["Month #", "Month", "Prior users", "Continuous user growth", "New total users after step-up", "Ending users", "Base credits/user", "Usage growth factor", "Credits/user", "Starting-user baseline credits", "Incremental user credits", "Usage uplift credits", "Total monthly credits", "Month-over-month credit change", "Prepaid credit drawdown", "PAYGO / additional credits"];
    heads.forEach(function (h, i) { fc.text(col(i + 1) + "6", h, S.head); });

    var pc = new Sheet("Prepaid Coverage");
    pc.cols = [[1, 1, 9], [2, 2, 12], [3, 9, 20], [10, 10, 28]];
    pc.text("A1", "Prepaid Credit Coverage and PAYGO Forecast", S.title);
    ["Total credit need", "", "Opening prepaid", "", "Planned prepaid purchases", "", "Prepaid credits used", "", "PAYGO / additional credits"].forEach(function (l, i) { if (l) pc.text(col(i + 1) + "3", l, S.kpiLabel); });
    pc.text("A6", "Ending prepaid balance", S.kpiLabel); pc.text("D6", "How it works", S.bold);
    pc.text("D7", "Your monthly credit need is paid from prepaid credits first. Any unused prepaid credits carry forward to the next month. If prepaid credits run out, the remaining amount is shown as PAYGO / additional credits needed.", S.note);
    pc.merges.push("D7:J8");
    ["Month #", "Month", "Monthly credit need", "Beginning prepaid balance", "Prepaid credits added", "Credits available", "Prepaid credits used", "Ending prepaid balance", "PAYGO / additional credits needed", "Coverage status"].forEach(function (h, i) { pc.text(col(i + 1) + "10", h, S.head); });

    var cache = [], prevF = plan.initialUsers, prevM = 0, bal = plan.openingPool || 0, lastCred = 0, lastUsers = 0, lastEnd = 0;
    var tot = { credits: 0, peak: 0, prepaid: 0, payg: 0, purchases: 0, need: 0, used: 0, payC: 0 };
    for (var k = 1; k <= MAX; k++) {
      var fr = FIRST + k - 1, pr = 11 + k - 1, on = k <= n, eng = months[k - 1], A = "A" + fr, Bc = "B" + fr;
      fc.num(A, k, S.int);
      var date = on ? serial(addMonths(start, k - 1)) : "";
      fc.f("B" + fr, "IF(A" + fr + "<=Inputs!$B$9,EDATE(Inputs!$B$10,A" + fr + "-1),\"\")", date, S.date);
      var prior = on ? (k === 1 ? plan.initialUsers : prevF) : "";
      fc.f("C" + fr, 'IF(B' + fr + '="","",IF(A' + fr + '=1,Inputs!$B$5,F' + (fr - 1) + "))", prior, S.dec);
      var growth = on ? Math.max(0, Math.min(Math.round(prior * plan.userGrowth), cap === null ? 1e99 : cap - prior)) : "";
      fc.f("D" + fr, "IF($A" + fr + '<=Inputs!$B$9,MAX(0,MIN(ROUND(C' + fr + "*Inputs!$B$7,0),IF(Inputs!$B$8=\"\",1E+99,Inputs!$B$8-C" + fr + "))),\"\")", growth, S.int);
      var step = on && steps[k] ? steps[k] : "";
      fc.f("E" + fr, 'IF(B' + fr + '="","",IF(INDEX(Inputs!$C$16:$C$51,A' + fr + ")>0,INDEX(Inputs!$C$16:$C$51,A" + fr + '),""))', step, S.int);
      var users = on ? eng.users : "";
      fc.f("F" + fr, "IF($A" + fr + '<=Inputs!$B$9,MIN(IF(Inputs!$B$8="",1E+99,Inputs!$B$8),IF(E' + fr + '<>"",E' + fr + ",C" + fr + "+D" + fr + ')),"")', users, S.int);
      var base = on ? plan.avgCredits : "", factor = on ? Math.pow(1 + plan.usageGrowth, k - 1) : "", per = on ? base * factor : "";
      fc.f("G" + fr, 'IF(B' + fr + '="","",Inputs!$B$4)', base, S.dec);
      fc.f("H" + fr, 'IF(B' + fr + '="","",(1+Inputs!$B$6)^(A' + fr + "-1))", factor, S.factor);
      fc.f("I" + fr, 'IF(B' + fr + '="","",G' + fr + "*H" + fr + ")", per, S.dec);
      var j = on ? plan.initialUsers * base : "", kk = on ? (users - plan.initialUsers) * base : "", l = on ? users * (per - base) : "", mm = on ? j + kk + l : "";
      fc.f("J" + fr, 'IF(B' + fr + '="","",Inputs!$B$5*G' + fr + ")", j, S.int);
      fc.f("K" + fr, 'IF(B' + fr + '="","",(F' + fr + "-Inputs!$B$5)*G" + fr + ")", kk, S.int);
      fc.f("L" + fr, 'IF(B' + fr + '="","",F' + fr + "*(I" + fr + "-G" + fr + "))", l, S.int);
      fc.f("M" + fr, 'IF(B' + fr + '="","",SUM(J' + fr + ":L" + fr + "))", mm, S.int);
      fc.f("N" + fr, 'IF(B' + fr + '="","",IF(A' + fr + "=1,0,M" + fr + "-M" + (fr - 1) + "))", on ? (k === 1 ? 0 : mm - prevM) : "", S.int);
      var added = on ? (buys[k] || 0) : "", beg = on ? bal : "", avail = on ? beg + added : "", used = on ? Math.min(mm, avail) : "", end = on ? Math.max(0, avail - mm) : "", over = on ? Math.max(0, mm - avail) : "";
      fc.f("O" + fr, 'IF(B' + fr + '="","",\'Prepaid Coverage\'!G' + pr + ")", used, S.int);
      fc.f("P" + fr, 'IF(B' + fr + '="","",MAX(0,M' + fr + "-O" + fr + "))", over, S.int);

      pc.f("A" + pr, "Forecast!A" + fr, k, S.int);
      pc.f("B" + pr, "Forecast!B" + fr, date, S.date);
      pc.f("C" + pr, "Forecast!M" + fr, mm, S.int);
      pc.f("D" + pr, 'IF(B' + pr + '="","",IF(A' + pr + "=1,Inputs!$B$11,H" + (pr - 1) + "))", beg, S.int);
      pc.f("E" + pr, 'IF(B' + pr + '="","",N(Inputs!E' + (SCHED_FIRST + k - 1) + "))", added, S.int);
      pc.f("F" + pr, 'IF(B' + pr + '="","",D' + pr + "+E" + pr + ")", avail, S.int);
      pc.f("G" + pr, 'IF(B' + pr + '="","",MIN(C' + pr + ",F" + pr + "))", used, S.int);
      pc.f("H" + pr, 'IF(B' + pr + '="","",MAX(0,F' + pr + "-C" + pr + "))", end, S.int);
      pc.f("I" + pr, 'IF(B' + pr + '="","",MAX(0,C' + pr + "-F" + pr + "))", over, S.int);
      pc.f("J" + pr, 'IF(B' + pr + '="","",IF(I' + pr + '>0,"PAYGO / purchase required","Covered by prepaid"))', on ? (over > 0 ? "PAYGO / purchase required" : "Covered by prepaid") : "", S.def);
      if (on) {
        prevF = users; prevM = mm; bal = end; lastCred = per; lastUsers = users; lastEnd = end;
        tot.credits += mm; tot.peak = Math.max(tot.peak, mm); tot.prepaid += used; tot.payg += over; tot.purchases += added;
      }
      cache.push({ on: on, date: date, used: used, over: over });
    }
    fc.f("A4", "SUM(M7:M42)", tot.credits, S.kpiInt); fc.f("C4", "MAX(M7:M42)", tot.peak, S.kpiInt);
    fc.f("E4", 'LOOKUP(2,1/(F7:F42<>""),F7:F42)', lastUsers, S.kpiInt); fc.f("G4", 'LOOKUP(2,1/(I7:I42<>""),I7:I42)', lastCred, S.kpiInt);
    fc.freeze = { x: 2, y: 6 };
    pc.f("A4", "SUM(C11:C46)", tot.credits, S.kpiInt); pc.f("C4", "Inputs!$B$11", plan.openingPool || 0, S.kpiInt);
    pc.f("E4", "SUM(E11:E46)", tot.purchases, S.kpiInt); pc.f("G4", "SUM(G11:G46)", tot.prepaid, S.kpiInt); pc.f("I4", "SUM(I11:I46)", tot.payg, S.kpiInt);
    pc.f("A7", 'LOOKUP(2,1/(H11:H46<>""),H11:H46)', lastEnd, S.kpiInt);
    pc.freeze = { y: 10 };

    // ---- Dashboard ----
    var db = new Sheet("Forecast Dashboard");
    db.cols = [[1, 1, 24], [2, 37, 14]];
    db.text("A1", "Credit Forecast Dashboard", S.title);
    var hasP = plan.prepaidRate != null, hasG = plan.paygRate != null, pr0 = plan.prepaidRate || 0, pg0 = plan.paygRate || 0;
    [["A", "Forecast months"], ["C", "Total credit need"], ["E", "Prepaid-funded credits"], ["G", "PAYGO / additional credits"], ["I", "Ending users"]].forEach(function (x) { db.text(x[0] + "3", x[1], S.kpiLabel); });
    db.f("A4", "Inputs!$B$9", n, S.kpiInt);
    db.f("C4", "SUM(Forecast!$M$7:INDEX(Forecast!$M:$M,6+Inputs!$B$9))", tot.credits, S.kpiInt);
    db.f("E4", "SUM(Forecast!$O$7:INDEX(Forecast!$O:$O,6+Inputs!$B$9))", tot.prepaid, S.kpiInt);
    db.f("G4", "SUM(Forecast!$P$7:INDEX(Forecast!$P:$P,6+Inputs!$B$9))", tot.payg, S.kpiInt);
    db.f("I4", "INDEX(Forecast!$F:$F,6+Inputs!$B$9)", lastUsers, S.kpiInt);
    [["A", "Total forecast cost"], ["C", "Prepaid-funded cost"], ["E", "PAYGO cost"], ["G", "Prepaid rate / credit"], ["I", "PAYGO rate / credit"], ["K", "Potential prefunding savings"]].forEach(function (x) { db.text(x[0] + "6", x[1], S.kpiLabel); });
    var last = col(1 + MAX);
    db.f("A7", 'IF(OR(Inputs!$B$12="",Inputs!$B$13=""),"",SUM(B15:' + last + "15))", hasP && hasG ? tot.prepaid * pr0 + tot.payg * pg0 : "", S.kpiUsd);
    db.f("C7", 'IF(Inputs!$B$12="","",SUM(B13:' + last + "13))", hasP ? tot.prepaid * pr0 : "", S.kpiUsd);
    db.f("E7", 'IF(Inputs!$B$13="","",SUM(B14:' + last + "14))", hasG ? tot.payg * pg0 : "", S.kpiUsd);
    db.f("G7", "Inputs!$B$12", hasP ? pr0 : "", S.kpiRate); db.f("I7", "Inputs!$B$13", hasG ? pg0 : "", S.kpiRate);
    db.f("K7", 'IF(OR(Inputs!$B$12="",Inputs!$B$13=""),"",SUM(Forecast!$P$7:INDEX(Forecast!$P:$P,6+Inputs!$B$9))*MAX(0,Inputs!$B$13-Inputs!$B$12))', hasP && hasG ? tot.payg * Math.max(0, pg0 - pr0) : "", S.kpiUsd);
    db.text("A9", "Monthly credits and cost by month are in the table below. Prepaid credits are used first; the remainder is PAYGO.", S.note);
    db.f("A10", 'IF(OR(Inputs!$B$12="",Inputs!$B$13=""),"Enter both rates on the Inputs sheet to display dollar values.","Dollar costs align to the same months shown in the table below.")', hasP && hasG ? "Dollar costs align to the same months shown in the table below." : "Enter both rates on the Inputs sheet to display dollar values.", S.note);
    db.text("A12", "Cost type", S.head);
    for (var c = 1; c <= MAX; c++) {
      var cl = col(c + 1), fr2 = FIRST + c - 1, ch = cache[c - 1];
      db.f(cl + "12", "Forecast!B" + fr2, ch.date, S.headDate);
      db.f(cl + "13", 'IF(OR(Inputs!$B$12="",Forecast!O' + fr2 + '=""),"",Forecast!O' + fr2 + "*Inputs!$B$12)", hasP && ch.on ? ch.used * pr0 : "", S.usd);
      db.f(cl + "14", 'IF(OR(Inputs!$B$13="",Forecast!P' + fr2 + '=""),"",Forecast!P' + fr2 + "*Inputs!$B$13)", hasG && ch.on ? ch.over * pg0 : "", S.usd);
      db.f(cl + "15", 'IF(OR(' + cl + '13="",' + cl + '14=""),"",' + cl + "13+" + cl + "14)", hasP && hasG && ch.on ? ch.used * pr0 + ch.over * pg0 : "", S.usd);
    }
    db.text("A13", "Prepaid cost", S.bold); db.text("A14", "PAYGO cost", S.bold); db.text("A15", "Total cost", S.bold);
    function kpiMerge(sheet, rows, cols) { rows.forEach(function (r) { cols.forEach(function (c) { sheet.merges.push(c + r + ":" + col(c.charCodeAt(0) - 63) + r); }); }); }
    db.merges.push("A9:K9", "A10:K10"); kpiMerge(db, [3, 4, 6, 7], ["A", "C", "E", "G", "I"]); kpiMerge(db, [6, 7], ["K"]);
    kpiMerge(fc, [3, 4], ["A", "C", "E", "G"]);
    kpiMerge(pc, [3, 4], ["A", "C", "E", "G", "I"]); kpiMerge(pc, [6, 7], ["A"]);

    db.text("A17", "Monthly credits: prepaid vs PAYGO", S.bold);
    db.drawing = true;
    var catCache = cache.slice(0, n).map(function (c, i) { return '<c:pt idx="' + i + '"><c:v>' + c.date + "</c:v></c:pt>"; }).join("");
    function ser(idx, name, colL, key, color) {
      var pts = cache.slice(0, n).map(function (c, i) { return '<c:pt idx="' + i + '"><c:v>' + (c[key] || 0) + "</c:v></c:pt>"; }).join("");
      return '<c:ser><c:idx val="' + idx + '"/><c:order val="' + idx + '"/><c:tx><c:v>' + name + '</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="' + color + '"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>' +
        '<c:cat><c:numRef><c:f>Forecast!$B$7:$B$' + (6 + n) + '</c:f><c:numCache><c:formatCode>mmm\\-yy</c:formatCode><c:ptCount val="' + n + '"/>' + catCache + "</c:numCache></c:numRef></c:cat>" +
        '<c:val><c:numRef><c:f>Forecast!$' + colL + "$7:$" + colL + "$" + (6 + n) + '</c:f><c:numCache><c:formatCode>#,##0</c:formatCode><c:ptCount val="' + n + '"/>' + pts + "</c:numCache></c:numRef></c:val></c:ser>";
    }
    var chartXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:roundedCorners val="0"/><c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="stacked"/><c:varyColors val="0"/>' +
      ser(0, "Prepaid credits used", "O", "used", "0F6CBD") + ser(1, "PAYGO / additional credits", "P", "over", "E8A33D") +
      '<c:gapWidth val="50"/><c:overlap val="100"/><c:axId val="111111"/><c:axId val="222222"/></c:barChart>' +
      '<c:catAx><c:axId val="111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="mmm\\-yy" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="222222"/><c:crosses val="autoZero"/><c:auto val="0"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="1"/></c:catAx>' +
      '<c:valAx><c:axId val="222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:title><c:tx><c:rich><a:bodyPr rot="-5400000" vert="horz"/><a:p><a:r><a:t>Credits</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:numFmt formatCode="#,##0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="111111"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>' +
      '</c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>';
    var drawingXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>17</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>12</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>38</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Credits chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>';
    var REL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';

    var sheets = [inp, db, fc, pc];
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") +
      '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/><Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>';
    var rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>' +
      sheets.map(function (s, i) { return '<sheet name="' + esc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + '</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>';
    var wrels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") +
      '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';

    var zip = new root.JSZip();
    zip.file("[Content_Types].xml", ct); zip.file("_rels/.rels", rels);
    zip.file("xl/workbook.xml", wb); zip.file("xl/_rels/workbook.xml.rels", wrels); zip.file("xl/styles.xml", stylesXml());
    sheets.forEach(function (s, i) { zip.file("xl/worksheets/sheet" + (i + 1) + ".xml", s.xml()); });
    zip.file("xl/charts/chart1.xml", chartXml); zip.file("xl/drawings/drawing1.xml", drawingXml);
    zip.file("xl/drawings/_rels/drawing1.xml.rels", REL + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/></Relationships>');
    zip.file("xl/worksheets/_rels/sheet2.xml.rels", REL + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
    return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
  }

  root.ExcelExport = { build: build };
  if (typeof module !== "undefined" && module.exports) module.exports = root.ExcelExport;
})(typeof globalThis !== "undefined" ? globalThis : this);
