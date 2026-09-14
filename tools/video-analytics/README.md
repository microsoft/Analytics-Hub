# Video Analytics — private live dashboard

A tiny Cloudflare Worker that counts **how many people play each demo video on the
Analytics Hub site, and how long they watch** — then shows it on a private
dashboard with a 3 / 7 / 14 / 30-day toggle.

- **Anonymous & aggregate.** Only per-video, per-day counts are stored. No viewer
  identity, IP, or personal data — same privacy stance as the site's Clarity setup.
- **Free.** Runs on Cloudflare's free Worker + KV tiers. No credit card.
- **Private.** The dashboard and its data are gated behind Cloudflare Access
  (email sign-in). The public site only sends anonymous counts.

## How the pieces fit

```
Visitor plays a video on microsoft.github.io/Analytics-Hub
        │  (docs/clarity-events.js beacon: { video, plays } / { video, seconds })
        ▼
POST /collect   ──►  Worker  ──►  KV  "day#<date>" = { <video>: {plays, secs} }
                                   │
you open the dashboard  ◄── GET / (+ /stats.json)  [behind Cloudflare Access]
```

## One-time deploy (~5 min)

Prereqs: a free Cloudflare account, and Node installed.

```bash
cd tools/video-analytics
npm install

# 1) Log in to Cloudflare
npx wrangler login

# 2) Create the KV namespace, then paste the printed id into wrangler.toml
npx wrangler kv namespace create VIDEO_STATS

# 3) Build + deploy
npm run deploy
```

`wrangler deploy` prints your Worker URL, e.g.
`https://analytics-hub-video-stats.<your-subdomain>.workers.dev`.

### 4) Point the site at the collector
In `docs/clarity-events.js`, set:

```js
var VIDEO_COLLECT_URL = "https://analytics-hub-video-stats.<your-subdomain>.workers.dev/collect";
```

Bump the `?v=` cache-buster on the `clarity-events.js` includes and deploy the site
(the existing Analytics-Hub PR does this). Until this URL is set, the site still
tracks plays in Clarity — it just doesn't also send counts here.

### 5) Lock the dashboard down (Cloudflare Access)
In the Cloudflare dashboard → **Zero Trust → Access → Applications → Add**:

- **Application**: Self-hosted, your Worker hostname.
- **Paths to protect**: `/` and `/stats.json`  (leave **`/collect` public** so
  anonymous visitors can still post counts).
- **Policy**: Allow → emails ending in `@microsoft.com`, or specific addresses.

Now only allowed people can open the dashboard; everyone else gets a sign-in prompt.

## Where you see it
Bookmark your Worker root URL:
`https://analytics-hub-video-stats.<your-subdomain>.workers.dev/`

Open it any time — daily or weekly — and flip the 3 / 7 / 14 / 30-day toggle. It
auto-refreshes every 2 minutes.

## Files
| File | Purpose |
|------|---------|
| `worker.js` | Worker source (routes + KV logic). Dashboard HTML is injected at build. |
| `dashboard.html` | The dashboard page (edit here; `build.js` inlines it into the Worker). |
| `build.js` | Inlines `dashboard.html` → `worker.bundled.js`. |
| `wrangler.toml` | Worker + KV config (paste your KV id). |
| `test-local.mjs` | `node test-local.mjs` — offline tests with a mock KV. |

## Notes
- KV uses read-modify-write on one small doc per day. Fine for this low volume.
- `/collect` clamps values (max 5 plays / 36000 s per beacon) and rejects any
  video name that isn't a plain `[A-Za-z0-9._-]` file slug, so the counts can't be
  trivially spammed or injected.
