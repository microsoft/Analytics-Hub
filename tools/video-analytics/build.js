/* Inlines dashboard.html into worker.js -> worker.bundled.js
   Run: node build.js  (or: npm run build) */
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const worker = fs.readFileSync(path.join(dir, "worker.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "dashboard.html"), "utf8");

// dashboard is embedded inside a String.raw`...` template, so backticks and
// ${ must be neutralised; there should be none, but guard anyway.
const safe = html.replace(/`/g, "\\`").replace(/\$\{/g, "$\\{");

// use a replacer function so $-sequences in `safe` are not interpreted
const out = worker.replace("__DASHBOARD_HTML__", () => safe);

fs.writeFileSync(path.join(dir, "worker.bundled.js"), out);
console.log("Wrote worker.bundled.js (" + out.length + " bytes)");
