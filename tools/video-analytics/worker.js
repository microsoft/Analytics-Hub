/* ============================================================================
   Video Analytics collector + private dashboard — Cloudflare Worker
   ----------------------------------------------------------------------------
   Routes:
     POST /collect      PUBLIC. Receives anonymous per-video beacons from the
                        Analytics Hub site: { video, plays?, seconds? }.
                        Increments per-day tallies in KV. No viewer identity is
                        ever stored — only counts.
     GET  /stats.json   PRIVATE (protect with Cloudflare Access). Returns the
                        last 30 day-docs so the dashboard can aggregate any
                        3/7/14/30-day window client-side.
     GET  /             PRIVATE (protect with Cloudflare Access). Serves the
                        dashboard page.

   Storage: KV namespace bound as VIDEO_STATS.
     Key   "day#<YYYY-MM-DD>"  (UTC)
     Value JSON { "<video-file>": { "plays": <n>, "secs": <n> }, ... }
   One doc per day keeps key count tiny (365/yr) and the read range cheap
   (<=30 gets). Volume here is a handful of events, so read-modify-write on the
   day doc is more than adequate.

   Cloudflare Access: create an Access application covering "/" and
   "/stats.json" and gate it to your email(s). Leave "/collect" UNPROTECTED so
   anonymous site visitors can still post counts.
   ============================================================================ */

const MAX_NAME = 80;
const KEEP_DAYS = 400; // safety cap for range scans

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}
function dateNDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}
function cleanVideo(s) {
  if (typeof s !== "string") return "";
  s = s.trim().slice(0, MAX_NAME);
  // allow only safe filename chars; reject anything that could be free text
  if (!/^[A-Za-z0-9._-]+$/.test(s)) return "";
  return s;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Max-Age": "86400",
};

async function handleCollect(request, env) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS });

  let payload;
  try { payload = JSON.parse(await request.text()); }
  catch (e) { return new Response("bad json", { status: 400, headers: CORS }); }

  const video = cleanVideo(payload && payload.video);
  if (!video) return new Response("bad video", { status: 400, headers: CORS });

  let plays = Number(payload.plays) || 0;
  let secs = Number(payload.seconds) || 0;
  // clamp to sane bounds so a bad actor can't inflate wildly in one call
  plays = Math.max(0, Math.min(5, Math.round(plays)));
  secs = Math.max(0, Math.min(36000, Math.round(secs)));
  if (!plays && !secs) return new Response(null, { status: 204, headers: CORS });

  const key = "day#" + todayUTC();
  const doc = (await env.VIDEO_STATS.get(key, "json")) || {};
  const row = doc[video] || { plays: 0, secs: 0 };
  row.plays += plays;
  row.secs += secs;
  doc[video] = row;
  await env.VIDEO_STATS.put(key, JSON.stringify(doc));

  return new Response(null, { status: 204, headers: CORS });
}

async function handleStats(env) {
  const days = [];
  for (let i = 0; i < 30; i++) days.push(dateNDaysAgo(i));
  const results = await Promise.all(
    days.map(async (date) => {
      const doc = (await env.VIDEO_STATS.get("day#" + date, "json")) || {};
      return { date, videos: doc };
    })
  );
  return new Response(
    JSON.stringify({ updated: new Date().toISOString(), days: results }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/collect") return handleCollect(request, env);
    if (url.pathname === "/stats.json") return handleStats(env);
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(DASHBOARD_HTML, {
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};

/* The dashboard is served inline so the whole thing deploys as one Worker with
   no static-asset config. It fetches /stats.json and aggregates client-side. */
const DASHBOARD_HTML = String.raw`__DASHBOARD_HTML__`;
