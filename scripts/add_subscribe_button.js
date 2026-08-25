#!/usr/bin/env node
/* One-off: put a "Stay Up To Date" button in the primary nav on every page.
 *
 * Idempotent, so re-running after adding a new page is safe. Inserted before
 * the GitHub call to action, which is always the last item in the nav, so the
 * new button reads as site content rather than an outbound link.
 *
 * The href carries ?from=nav. Feed readers do not run JavaScript, so a click
 * on the feed itself is invisible; the only thing measurable is arrival at the
 * updates page, and the query string is what separates people who came via the
 * nav from those who came from the hero or a shared link. Clarity records the
 * full URL including the query string, and the nightly snapshot already
 * collects it, so this needs no new instrumentation.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

let touched = 0, already = 0, skipped = 0;

for (const file of walk(DOCS)) {
  let html = fs.readFileSync(file, 'utf8');
  if (!/<nav class="primary-nav">/.test(html)) { skipped++; continue; }
  if (/nav-subscribe/.test(html)) { already++; continue; }

  // Depth from docs/ decides how many ../ the link needs.
  const rel = path.relative(DOCS, file).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1;
  const prefix = depth === 0 ? '' : '../'.repeat(depth);
  const href = `${prefix}updates/?from=nav`;

  // Anchor on the GitHub CTA. Matching the line rather than a bare tag keeps
  // this from firing on some other anchor that happens to carry nav-cta.
  // \r? because these files are checked out with CRLF endings.
  const anchor = /([ \t]*<a class="nav-cta"[^>]*>GitHub[^<]*<\/a>\r?\n)/;
  const eol = /\r\n/.test(html) ? '\r\n' : '\n';
  const button = `      <a class="nav-subscribe" href="${href}">Stay Up To Date</a>${eol}`;
  if (!anchor.test(html)) {
    console.log('  ! no GitHub CTA found, skipped: ' + rel);
    skipped++;
    continue;
  }
  html = html.replace(anchor, button + '$1');
  fs.writeFileSync(file, html, 'utf8');
  console.log('  + ' + rel + '  ->  ' + href);
  touched++;
}

console.log(`\n${touched} updated, ${already} already had it, ${skipped} without a primary nav`);
