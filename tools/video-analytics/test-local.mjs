/* Local test of the Worker with an in-memory KV. Node 18+ (global fetch/Request/Response).
   Run: node test-local.mjs */
import worker from "./worker.bundled.js";

// minimal KV mock
const store = new Map();
const env = {
  VIDEO_STATS: {
    async get(k, type) { const v = store.get(k); if (v == null) return null; return type === "json" ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); },
  },
};

function post(body) {
  return worker.fetch(new Request("https://x/collect", { method: "POST", body: JSON.stringify(body) }), env);
}
let fail = 0;
function assert(cond, msg) { console.log((cond ? "PASS" : "FAIL") + " — " + msg); if (!cond) fail++; }

const r1 = await post({ video: "ValueLens-Demo", plays: 1 });
assert(r1.status === 204, "collect play -> 204");
await post({ video: "ValueLens-Demo", seconds: 40 });
await post({ video: "ValueLens-Demo", seconds: 20 });
await post({ video: "AI-in-One-Overview", plays: 1 });
await post({ video: "AI-in-One-Overview", seconds: 100 });

// rejects bad video names (potential free text / injection)
const bad = await post({ video: "some name with spaces", plays: 1 });
assert(bad.status === 400, "rejects unsafe video name");

// clamps absurd values
await post({ video: "ESS_Insights_Overview", plays: 999, seconds: 9999999 });

// stats
const sres = await worker.fetch(new Request("https://x/stats.json"), env);
const stats = await sres.json();
const today = stats.days.find(d => Object.keys(d.videos).length);
assert(today.videos["ValueLens-Demo"].plays === 1, "ValueLens plays = 1");
assert(today.videos["ValueLens-Demo"].secs === 60, "ValueLens secs = 60 (40+20)");
assert(today.videos["AI-in-One-Overview"].plays === 1, "AI-in-One plays = 1");
assert(today.videos["ESS_Insights_Overview"].plays === 5, "plays clamped to 5");
assert(today.videos["ESS_Insights_Overview"].secs === 36000, "secs clamped to 36000");

// dashboard served
const dres = await worker.fetch(new Request("https://x/"), env);
const dhtml = await dres.text();
assert(dres.headers.get("content-type").includes("text/html"), "dashboard is html");
assert(dhtml.includes("Video Analytics") && dhtml.includes("stats.json"), "dashboard references stats.json");
assert(dhtml.includes("Last 30 days"), "dashboard has 30-day toggle");

console.log(fail === 0 ? "\nALL TESTS PASSED" : "\n" + fail + " TEST(S) FAILED");
process.exit(fail ? 1 : 0);
