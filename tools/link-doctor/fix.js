#!/usr/bin/env node
/* fix.js - Link Doctor: apply high-confidence link repairs produced by scan.js.
 *
 * Reads reports/latest.json (run scan.js first) and, for every broken link whose
 * suggested fix is HIGH confidence, rewrites the old URL to the suggested URL in the
 * exact source file. If the old path also appears as visible anchor text
 * (e.g. ">3. Fabric/notebooks/<"), that display text is updated too.
 *
 * Dry-run by default - it prints what WOULD change and writes nothing. Pass --write
 * to apply. Pass --all to also apply 'review'/'medium' suggestions (not recommended
 * unattended). The operation is idempotent: once applied, the old URL is gone, so a
 * second run is a no-op.
 *
 * Usage:
 *   node fix.js                 dry-run, show planned edits
 *   node fix.js --write         apply high-confidence fixes
 *   node fix.js --write --all   also apply review/medium (needs human eyes)
 *   node fix.js --report <path> use a specific report json
 *
 * Zero dependencies. No network calls - operates only on local files + the report.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const REPO_ROOT = path.resolve(ROOT, '..', '..');
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const ALL = args.includes('--all');
const repIdx = args.indexOf('--report');
const REPORT = repIdx !== -1 && args[repIdx + 1]
  ? path.resolve(args[repIdx + 1])
  : path.join(ROOT, 'reports', 'latest.json');

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function ampVariants(s) { return [s, s.replace(/&/g, '&amp;')]; }

function applyToFile(absFile, fixes) {
  let content = fs.readFileSync(absFile, 'utf8');
  const changes = [];
  for (const f of fixes) {
    let fileHits = 0;
    // 1. the URL itself (href/src/raw text). Require a terminator so a path link
    //    can't be partially matched inside a longer URL (e.g. .../scripts vs .../scripts/x).
    for (const oldU of ampVariants(f.url)) {
      const newU = f.suggestedUrl;                       // suggestedUrl has no '&' for these paths
      const re = new RegExp(esc(oldU) + '(?=["\'<\\s)]|$)', 'g');
      content = content.replace(re, () => { fileHits++; return newU; });
    }
    // 2. visible anchor text that spells out the old path (">old path<").
    if (f.path && f.suggestedPath) {
      for (const oldP of ampVariants(f.path)) {
        const newP = f.suggestedPath;
        // match the decoded path with optional trailing slash, bounded by > and <
        const re = new RegExp('>(\\s*)' + esc(oldP) + '(/?)(\\s*)<', 'g');
        content = content.replace(re, (_m, a, slash, b) => { fileHits++; return `>${a}${newP}${slash}${b}<`; });
      }
    }
    changes.push({ ...f, hits: fileHits });
  }
  if (WRITE) fs.writeFileSync(absFile, content);
  return changes;
}

function main() {
  if (!fs.existsSync(REPORT)) {
    console.error('No report found at ' + REPORT + ' - run scan.js first.');
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
  const wanted = (report.broken || []).filter(b => b.suggestedUrl &&
    (b.confidence === 'high' || (ALL && (b.confidence === 'review' || b.confidence === 'medium'))));

  if (!wanted.length) {
    console.log('Nothing to apply (' + (report.broken || []).length + ' broken, 0 match the confidence filter).');
    return;
  }

  // group by file
  const byFile = new Map();
  for (const b of wanted) {
    if (!byFile.has(b.file)) byFile.set(b.file, []);
    byFile.get(b.file).push(b);
  }

  console.log(`${WRITE ? 'APPLYING' : 'DRY-RUN'} ${wanted.length} fix(es) across ${byFile.size} file(s)${ALL ? ' (incl. review/medium)' : ' (high-confidence only)'}\n`);
  let totalHits = 0, zeroHit = 0;
  for (const [file, fixes] of byFile) {
    const abs = path.join(REPO_ROOT, file);
    const changes = applyToFile(abs, fixes);
    console.log(`  ${file}`);
    for (const c of changes) {
      totalHits += c.hits;
      if (c.hits === 0) zeroHit++;
      const flag = c.hits === 0 ? ' [!! no match in file]' : '';
      console.log(`    ${c.confidence.toUpperCase().padEnd(6)} ${c.hits}x  ${c.path}`);
      console.log(`             -> ${c.suggestedPath}${flag}`);
    }
  }
  console.log(`\n  ${WRITE ? 'Wrote' : 'Would write'} ${totalHits} replacement(s).` +
    (zeroHit ? `  ${zeroHit} fix(es) matched nothing (URL may already be fixed or differently encoded).` : '') +
    (WRITE ? '' : '  Re-run with --write to apply.'));
}

main();
