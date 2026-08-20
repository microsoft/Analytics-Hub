# Privacy Policy - Copilot Cowork Credit Chargeback

**Last updated:** 2026

## The short version

This application runs **entirely in your web browser**. It has no backend, no
server, and no database. The CSV files you select are read, parsed, joined, and
turned into a report using JavaScript that executes locally on your own device.
**Your files never leave your device.**

## What data the app handles

- **Entra user export (CSV):** organizational attributes such as user principal
  name, display name, department, business unit, job family, job title, cost
  center, country, and manager.
- **Copilot credit / Cost Management export (CSV):** usage data such as credits
  used, credit limit, Microsoft 365 Copilot license status, last activity date,
  and session count.

These files are read in-memory to compute the chargeback report. They are **not
uploaded, transmitted, logged, or shared** with anyone.

## Where processing happens

All parsing, joining, computation, charting, and export generation happen
client-side in your browser. There is no network request that carries your data
off the page. You can verify this: load the page, open your browser's developer
tools Network tab, generate a report, and observe that no data is sent.

## What is stored locally

The app uses your browser's `localStorage` only to remember two small
preferences so your next visit is convenient:

- `cowork_rate` - the rate per credit you last used.
- `cowork_sliceBy` - the dimension you last sliced by.

**No uploaded row data is ever stored.** These preferences stay in your browser
and can be cleared at any time by clearing site data.

## Offline / service worker

An optional service worker (`sw.js`) caches the application's own static files
(HTML, CSS, JavaScript, and the bundled libraries) so the app can run offline.
It caches **only application assets** - never your data. The service worker is
registered only when the page is served over `http`/`https`; it is not used when
you open the file directly from disk (`file://`).

## Third-party libraries

The app bundles the following libraries locally (no CDN, no external calls):

- **PptxGenJS** and **JSZip** - to build PowerPoint (`.pptx`) exports.
- **jsPDF** and **html2canvas** - to build PDF exports.

All exports are generated in your browser and saved directly to your device via
the browser's download mechanism.

## No telemetry, analytics, or tracking

This application contains **no analytics, no telemetry, no cookies for
tracking, and no advertising**. Nothing about your usage is measured or sent
anywhere.

## GDPR / CCPA

Because no personal data is collected, transmitted, or stored on any server,
the app does not act as a data processor or controller of your information in
the cloud. You retain full control of your files at all times. To remove any
locally saved preferences, clear this site's data in your browser.

## Demo data

The "View Demo Report" feature uses **synthetic, fictional data** embedded in
the app. It contains no real people and must not be used for real decisions.

## Contact

This is a self-contained, client-side tool. Because it collects no data, there
is nothing to request, export, or delete from a server. For questions about how
it works, review the source files (`app.js`, `sw.js`) directly.
