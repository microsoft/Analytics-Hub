# Privacy Policy - M365 Copilot ROI Calculator

## Last Updated: September 4, 2026

## Overview

This application is designed with privacy as a core principle. **All data processing happens locally in your web browser.** Your CSV file and its contents are never uploaded or transmitted anywhere.

There are two ways to run this tool, and the distinction matters:

- **Hosted version** (github.io) - your data still stays in your browser, but the site loads Microsoft Clarity for product analytics. See [Product Analytics](#product-analytics-hosted-version-only) below.
- **Downloaded local version** - makes **zero external requests**. No analytics, no CDNs, no network traffic of any kind.

## Data Collection

**We never collect your business data.** Specifically:

- ❌ No CSV data uploads sent to servers
- ❌ No form inputs transmitted externally
- ❌ No personal information requested or entered — we never ask for names, emails, or credentials
- ❌ No accounts, logins, or authentication of any kind
- ❌ No database, no server-side storage

The hosted version does use a third-party product analytics tool. That is disclosed in full in the next section.

## Product Analytics (Hosted Version Only)

The hosted site uses **Microsoft Clarity** to understand how the tool is used and where it can be improved.

What that means, plainly:

- Clarity performs **session replay** - it captures page interactions (clicks, scrolls, navigation) and snapshots of the **rendered page content**.
- Clarity records standard web telemetry, including **IP-derived location**, browser and user-agent details, screen size, and referring page.
- Clarity **sets cookies** in your browser.
- The application also sends a small number of named events (for example, `download_local_package`) that contain no data other than the event name.

What this does **not** mean:

- **Your uploaded CSV file is never transmitted.** It is read into browser memory and never sent to Microsoft Clarity, to us, or to anyone else.
- However, because session replay captures what is **rendered on screen**, figures and labels displayed in the results view - including values derived from your CSV - can appear inside a session recording.

If your data is sensitive enough that on-screen figures must not be captured, **use the downloaded local version**, which does not load Clarity and makes no external requests at all.

Microsoft Clarity is operated by Microsoft as a sub-processor and is governed by Microsoft's terms: <https://learn.microsoft.com/clarity/setup-and-installation/privacy-disclosure>

## How Your Data is Handled

### CSV File Processing
- Files are processed **entirely in your browser's memory**
- No files are uploaded to any server
- No files are stored by the application
- Files are cleared from memory when you close the browser tab

### Calculations & Reports
- All calculations happen **client-side** in JavaScript
- Generated reports (PDF, DOCX, PPTX) are created in your browser
- Export files are saved directly to your device
- No calculation data is sent anywhere

### Local Storage
The application may use browser localStorage for:
- Saving your configuration preferences (license cost, hourly rate, etc.)
- Remembering your last-used settings for convenience

This data:
- Stays on your device only
- Can be cleared via browser settings
- Is never transmitted

## Third-Party Services

### External Libraries Used
All third-party libraries are **bundled locally** with the application - none are loaded from a CDN:

- **JSZip** - Creating ZIP archives
- **jsPDF** - Generating PDF files
- **html2canvas** - Capturing screenshots
- **html2pdf.js** - Rendering HTML to PDF
- **docx.js** - Creating Word documents
- **PptxGenJS** - Creating PowerPoint presentations

These libraries run **entirely in your browser** and do not send data externally.

### CDN Usage
As of the current build there are **zero CDN requests**. Every library, stylesheet, and font is served from the application's own files, in both the hosted and the local version.

On the hosted version, the **only** external request the application makes is to Microsoft Clarity (see [Product Analytics](#product-analytics-hosted-version-only)). The downloaded local version makes no external requests at all.

## Email Functionality

The "Email Report" button:
- Opens your default email client (e.g., Outlook, Gmail)
- Pre-fills a mailto: link with suggested content
- **Does NOT send any data through our servers**
- You control what gets sent

## Offline Functionality

When you download and run the local version:
- ✅ **100% offline** - No internet connection required after download
- ✅ **Zero external requests** - All libraries bundled locally
- ✅ **No analytics** - Microsoft Clarity does not load outside the hosted site
- ✅ **Complete privacy** - Your data never leaves your computer
- ✅ **No CDN tracking** - All resources are local files

## Your Control

You have complete control over your data:

- ✅ **Delete anytime** - Close the browser tab to clear memory
- ✅ **Clear localStorage** - Browser settings → Clear browsing data
- ✅ **Use offline** - Download the local package for maximum privacy
- ✅ **Inspect code** - All source code is visible and can be audited

## Security

### Data Security Measures
- No server-side data storage = No data breach risk
- All processing in your browser's secure sandbox
- No authentication system = No password security concerns
- No database = No SQL injection or data leak risks

### Recommendations
- Use the **offline local version** for maximum security
- Don't share generated reports if they contain sensitive data
- Use browser incognito/private mode if on a shared computer
- Clear browser cache/localStorage periodically

## Compliance

This application's architecture is built to sit comfortably inside privacy regulations:

- ✅ **GDPR** - Your CSV data is never collected or processed by us. The hosted version uses Microsoft Clarity, which processes limited personal data (IP-derived location, device/browser details, cookies) as a Microsoft sub-processor under Microsoft's terms. The local version processes no personal data externally at all.
- ✅ **CCPA** - We do not sell or share personal information. Hosted analytics data is processed by Microsoft Clarity solely to improve this tool.
- ✅ **HIPAA Compatible** - No PHI is stored or transmitted by the application. For any workflow involving PHI, use the local version so nothing is rendered into a session recording.
- ✅ **SOC 2 Friendly** - No customer CSV data is retained, stored, or shared with third parties. Hosted product analytics are processed by Microsoft Clarity; the local version sends nothing.

If your organization requires that **no** third-party telemetry is involved, use the downloaded local version.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected with an updated "Last Updated" date at the top of this document.

## Contact

For questions about privacy or data handling:
- Email: jordanking@microsoft.com
- Purpose: This tool is intended for Microsoft 365 Copilot ROI analysis

## Summary

**🔒 Your CSV data stays on your device.**

This calculator is built on the principle that sensitive business data should never leave your control. Your CSV file is read in your browser, calculated in your browser, and exported from your browser - it is never uploaded.

The hosted site uses Microsoft Clarity for product analytics, and we say so plainly rather than pretending otherwise. **If you want zero external requests, download and run the local version** - it loads no analytics and talks to no one.
