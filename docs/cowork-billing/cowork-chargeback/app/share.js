window.__CWK_SHARE_DATA__ = {"name": "Cowork Chargeback", "accent": "#0b5cff", "accent2": "#0a3fb0", "isSuite": false, "homeUrl": "https://microsoft.github.io/Analytics-Hub/cowork-billing/", "barLabel": "Share this tool with a colleague — sends the page you’re on plus the Cowork Billing hub", "barBtn": "Share this tool", "subject": "Cowork Chargeback — turn Copilot Cowork usage into a finance-ready chargeback", "tagline": "Turn your Copilot Cowork consumption and org exports into a finance-ready, invoice-reconciled chargeback &mdash; per cost center and per person, in dollars.", "taglineText": "Turn Copilot Cowork consumption and org exports into a finance-ready, invoice-reconciled chargeback — per cost center and per person, in dollars.", "glance": "It runs entirely client-side &mdash; open it, drop in two CSV exports, and it produces a per-unit and per-person chargeback you can reconcile against your Microsoft invoice.", "load": [{"t": "Entra user export(s) &middot; CSV", "d": "Org attributes (Department, Cost Center, Business Unit) used to allocate each person to a unit. Multiple files allowed."}, {"t": "Copilot credit / Cost Management export &middot; CSV", "d": "One row per user with the credits they consumed. Priced to dollars at your contracted rate."}], "source": "<strong>Where to get them:</strong> Entra admin center &rarr; Identity &rarr; Users &rarr; All users &rarr; <em>Download users</em>. Microsoft 365 admin center &rarr; Copilot &rarr; Cost management &rarr; Consumption &rarr; <em>Export CSV</em>. Column names are auto-detected, so most export layouts work as-is.", "features": ["Compare three billing models &mdash; PAYGO, Prepaid pack, and Hybrid &mdash; side by side per department.", "Drill from any unit down to the individual people who make up its charge.", "Enter your Microsoft invoice total to reconcile the chargeback against the actual bill.", "Set spending-policy credit limits and flag over- and under-utilization.", "Scope the whole report to selected units with an RLS-style &ldquo;view as&rdquo; filter."], "exports": [{"n": "Workbook", "tag": "XLSX", "d": "An interactive Excel tool: pick a billing model, add adjustments, and the Final $ recomputes with live formulas. Tabs: Summary, Allocation, Users, Model comparison. Best for running and sharing the allocation with finance."}, {"n": "Journal", "tag": "CSV", "d": "A per-department snapshot &mdash; one row per unit with PAYGO / Prepaid / Hybrid dollars, a TOTAL row, and invoice reconciliation. Drop straight into the GL."}, {"n": "Line items", "tag": "CSV", "d": "A per-person snapshot &mdash; every user with Department / Cost Center / Business Unit and all three model dollars. Ideal for audit or pivot tables."}]};

(function () {
  "use strict";
  if (window.__cwkShareLoaded) return; window.__cwkShareLoaded = true;
  var D = window.__CWK_SHARE_DATA__;
  var A = D.accent, A2 = D.accent2;
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function pageUrl(){ return location.origin + location.pathname; }

  function sheetCss(){
    return "*{box-sizing:border-box}body{margin:0;background:#eef1f6;font-family:'Inter',-apple-system,Segoe UI,Roboto,sans-serif;color:#16233a}"
    + ".actionbar{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;background:#0f1b30;color:#fff;padding:10px 18px}"
    + ".actionbar .ab-title{font-weight:700;font-size:13px;margin-right:auto;font-family:'Space Grotesk','Inter',sans-serif}"
    + ".ab-btn{background:#26344f;color:#fff;border:none;border-radius:8px;padding:8px 14px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}"
    + ".ab-btn:hover{background:#33456a}.ab-primary{background:" + A + "}.ab-primary:hover{background:" + A + "}"
    + ".ab-msg{font-size:11.5px;color:#9fb0cc}"
    + ".mailwrap{max-width:720px;margin:22px auto;padding:0 12px}"
    + ".body{background:#fff;border:1px solid #e2e8f4;border-radius:12px;overflow:hidden}"
    + ".hero{background:linear-gradient(135deg," + A2 + "," + A + ");color:#fff;padding:26px 28px}"
    + ".hero .kick{font-size:10px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;opacity:.85;margin:0 0 6px}"
    + ".hero h1{font-family:'Space Grotesk','Inter',sans-serif;font-size:26px;margin:0 0 8px;letter-spacing:-.01em}"
    + ".hero p{margin:0;font-size:13.5px;line-height:1.55;color:#eef2ff;max-width:60ch}"
    + ".hero .chip{display:inline-block;margin-top:12px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:4px 11px;font-size:9.5px;font-weight:700;letter-spacing:.03em}"
    + ".pad{padding:22px 28px}.lead{font-size:13px;color:#33425c;line-height:1.55;margin:0 0 4px}"
    + ".cta{display:flex;gap:12px;flex-wrap:wrap;margin:2px 0 6px}"
    + ".btn{display:inline-block;text-decoration:none;font-weight:700;font-size:13px;padding:11px 18px;border-radius:9px}"
    + ".btn-primary{background:" + A + ";color:#fff}.btn-ghost{background:#eef2fb;color:" + A2 + ";border:1px solid #d6e0f7}"
    + "h2{font-family:'Space Grotesk','Inter',sans-serif;font-size:14px;margin:20px 0 8px;color:#0f1b30;padding-bottom:6px;border-bottom:2px solid " + A + "}"
    + ".load{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media(max-width:560px){.load{grid-template-columns:1fr}}"
    + ".card{border:1px solid #e2e8f4;border-radius:10px;padding:12px 14px;background:#f9fbff}"
    + ".card .t{font-weight:700;font-size:12.5px;color:#14233d;margin:0 0 3px}.card .d{font-size:11.6px;color:#4a5a73;line-height:1.5;margin:0}"
    + ".feat{margin:0;padding:0;list-style:none}.feat li{font-size:12.6px;color:#33425c;line-height:1.5;padding:4px 0 4px 18px;position:relative}"
    + ".feat li:before{content:'';position:absolute;left:2px;top:9px;width:7px;height:7px;border-radius:2px;background:" + A + "}"
    + ".exp{border-bottom:1px solid #eef1f7;padding:9px 0}.exp:last-child{border-bottom:none}"
    + ".exp .n{font-weight:700;font-size:12.6px;color:#14233d}"
    + ".exp .n .tag{display:inline-block;font-size:8px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;background:#e9f8f1;color:#0b7a53;border-radius:999px;padding:1.5px 7px;margin-left:8px;vertical-align:middle}"
    + ".exp .n a{color:" + A2 + ";text-decoration:none}.exp .d{font-size:11.8px;color:#4a5a73;line-height:1.5;margin:3px 0 0}"
    + ".foot{padding:14px 28px 22px;font-size:10.5px;color:#8a93a6;border-top:1px solid #e2e8f4}.foot a{color:" + A2 + "}"
    + ".src{font-size:11px;color:#7a869c;margin:6px 0 0;line-height:1.5}";
  }

  function inner(page, home){
    var mid = "";
    if (D.isSuite) {
      var tools = (D.tools||[]).map(function(x){
        return "<div class='exp'><div class='n'><a href='" + x.href + "'>" + esc(x.n) + "</a></div><p class='d'>" + esc(x.d) + "</p></div>";
      }).join("");
      mid = "<h2>What&rsquo;s inside</h2>" + tools;
    } else {
      var load = (D.load||[]).map(function(x){ return "<div class='card'><p class='t'>" + x.t + "</p><p class='d'>" + x.d + "</p></div>"; }).join("");
      var feat = (D.features||[]).map(function(x){ return "<li>" + x + "</li>"; }).join("");
      var exps = (D.exports||[]).map(function(x){ return "<div class='exp'><div class='n'>" + x.n + " <span class='tag'>" + x.tag + "</span></div><p class='d'>" + x.d + "</p></div>"; }).join("");
      mid = "<h2>What to load</h2><div class='load'>" + load + "</div>"
          + (D.source ? "<p class='src'>" + D.source + "</p>" : "")
          + "<h2>What you can do with it</h2><ul class='feat'>" + feat + "</ul>"
          + "<h2>Exports &amp; what they&rsquo;re for</h2>" + exps;
    }
    var openHref = D.isSuite ? home : page;
    var openLabel = D.isSuite ? "Browse the Cowork Billing tools" : ("Open " + esc(D.name));
    var cta = "<div class='cta'><a class='btn btn-primary' href='" + openHref + "'>" + openLabel + " \u203A</a>"
      + (D.isSuite ? "" : "<a class='btn btn-ghost' href='" + home + "'>Explore the Cowork Billing suite \u203A</a>") + "</div>";
    var intro = "<p class='lead'>" + (D.isSuite
      ? "Sharing the Cowork Billing hub &mdash; a set of browser tools and templates for Copilot credit consumption and cost."
      : "I thought this would be useful for you. " + D.glance) + "</p>";
    return "<div class='hero'><p class='kick'>Shared from the Cowork Billing suite</p><h1>" + esc(D.name)
      + "</h1><p>" + D.tagline + "</p><span class='chip'>100% in your browser &middot; your files never leave your device</span></div>"
      + "<div class='pad'>" + intro + cta + mid + "</div>"
      + "<div class='foot'>100% client-side &middot; no uploads, no servers, no telemetry &middot; part of the <a href='" + home + "'>Cowork Billing</a> suite on Analytics Hub.</div>";
  }

  function buildSheet(){
    var page = pageUrl(), home = D.homeUrl;
    var bodyInner = inner(page, home);
    var subject = D.subject;
    var bodyText = D.name + " \u2014 " + D.taglineText + "\n\nOpen the tool: " + (D.isSuite ? home : page)
      + "\nExplore the Cowork Billing suite: " + home + "\n\nRuns 100% in your browser; your files never leave your device.";
    var doc = "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>"
      + "<title>Share \u2014 " + esc(D.name) + "</title>"
      + "<link rel='preconnect' href='https://fonts.googleapis.com'><link href='https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Space+Grotesk:wght@500;700&display=swap' rel='stylesheet'>"
      + "<style>" + sheetCss() + "</style></head><body>"
      + "<div class='actionbar'><span class='ab-title'>Share this</span>"
      + "<button id='cwkCopy' class='ab-btn'>Copy for email</button>"
      + "<button id='cwkMail' class='ab-btn ab-primary'>Open in email</button>"
      + "<span id='cwkMsg' class='ab-msg'></span></div>"
      + "<div class='mailwrap'><div class='body' id='cwkEmailBody'>" + bodyInner + "</div></div>"
      + "<script>var SUBJ=" + JSON.stringify(subject) + ",BODY=" + JSON.stringify(bodyText) + ";"
      + "document.getElementById('cwkMail').onclick=function(){location.href='mailto:?subject='+encodeURIComponent(SUBJ)+'&body='+encodeURIComponent(BODY);};"
      + "document.getElementById('cwkCopy').onclick=function(){var h=document.getElementById('cwkEmailBody').outerHTML;var ok=function(){document.getElementById('cwkMsg').textContent='Copied \u2014 paste into your email';};"
      + "try{navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([h],{type:'text/html'}),'text/plain':new Blob([BODY],{type:'text/plain'})})]).then(ok,function(){navigator.clipboard.writeText(BODY).then(ok);});}"
      + "catch(e){navigator.clipboard.writeText(BODY).then(ok);}};"
      + "</" + "script></body></html>";
    return doc;
  }

  function openShare(){
    try {
      var url = URL.createObjectURL(new Blob([buildSheet()], {type:'text/html'}));
      window.open(url, '_blank');
    } catch (e) { alert('Could not open the share sheet.'); }
  }

  function injectBar(){
    if (document.getElementById('cwkShareBar')) return;
    var css = "#cwkShareBar{background:linear-gradient(90deg," + A2 + "," + A + ");color:#fff;font-family:'Inter',-apple-system,Segoe UI,Roboto,sans-serif}"
      + "#cwkShareBar .cwk-inner{max-width:1200px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 18px}"
      + "#cwkShareBar .cwk-label{font-size:12.5px;font-weight:600;opacity:.96;line-height:1.3}"
      + "#cwkShareBar .cwk-btn{flex:0 0 auto;background:#fff;color:" + A2 + ";border:none;border-radius:999px;padding:6px 15px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}"
      + "#cwkShareBar .cwk-btn:hover{background:#eef2ff}"
      + "@media(max-width:600px){#cwkShareBar .cwk-label{display:none}#cwkShareBar .cwk-inner{justify-content:flex-end}}";
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var bar = document.createElement('div'); bar.id = 'cwkShareBar';
    bar.innerHTML = "<div class='cwk-inner'><span class='cwk-label'>" + esc(D.barLabel)
      + "</span><button type='button' class='cwk-btn' id='cwkShareBtn'>" + esc(D.barBtn) + " \u203A</button></div>";
    document.body.insertBefore(bar, document.body.firstChild);
    document.getElementById('cwkShareBtn').addEventListener('click', openShare);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectBar);
  else injectBar();
})();
