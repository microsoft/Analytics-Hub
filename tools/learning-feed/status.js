/*
 * status.js — Change-status manifest generator for the MS Learn Watcher landing page.
 *
 * The landing page (docs/community/learning-feed/index.html) shows a card per
 * feed. Each card's top-right pill used to read "Updated <date>", which only
 * told a reader that the daily job ran — not whether the underlying Microsoft
 * documentation actually CHANGED. This module derives, for every feed, the most
 * recent real change and classifies it as MAJOR or MINOR, then writes a small
 * status.json the page reads at load time so the pill says, at a glance:
 *
 *     ● Major change · 17 Sep 2026      (a section was added/removed, or the body
 *                                         changed with no date bump — a silent edit,
 *                                         or a brand-new page appeared)
 *     ● Minor change · 12 Sep 2026      (a normal, dated documentation revision)
 *     ○ No change since 1 Jul            (nothing has moved in the tracking window)
 *
 * It never fetches the network. It reads the snapshots scan.js already wrote:
 *   - <feed>-latest.json                  (the current run)
 *   - the most recent OTHER <feed>-snapshot-YYYY-MM-DD.json (the prior run)
 * and recomputes the day-over-day delta from the exact same signals scan.js uses
 * (ms.date, git commit, body hash, section headings, new-page flag). When a run
 * detects no change, the feed's last known change is carried forward from the
 * previous status.json so the card keeps showing the last thing that actually
 * moved, with its date — instead of resetting to "nothing" every quiet day.
 *
 * Severity mapping (two tiers, deliberately conservative):
 *   MAJOR = section added/removed, silent body edit (content changed, date did
 *           NOT), a newly discovered page, a roadmap item that shipped/changed
 *           status, or a new spec release. These are the high-stakes, catch-you-
 *           off-guard changes the feeds exist to surface.
 *   MINOR = a documented revision (ms.date moved / body changed with a date bump
 *           / description updated). Routine, but still a change.
 * When a feed is first seeded and we have no live catch yet, we only claim what
 * the metadata proves: Microsoft's own ms.date within the window = a documented
 * (MINOR) update. We escalate to MAJOR only when we actually catch a structural
 * or silent change on a scan.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FEED_DIR = path.join(ROOT, 'feeds');
const SNAP_DIR = path.join(ROOT, 'snapshots');
// Published location the landing page fetches from (same directory as its HTML).
const OUT = path.join(ROOT, '..', '..', 'docs', 'community', 'learning-feed', 'status.json');

function loadJson(p, fb) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return fb; } }
function dstr(d) { return d ? String(d).slice(0, 10) : null; }
function maxDate(a, b) { if (!a) return b; if (!b) return a; return a >= b ? a : b; }

/* Find the most recent dated snapshot that is NOT the "current" one, so we can
   diff day-over-day. Falls back to null when only one run exists (fresh feed). */
function priorSnapshot(feedId, currentRunAt) {
  const files = fs.readdirSync(SNAP_DIR)
    .filter(f => f.startsWith(feedId + '-snapshot-') && f.endsWith('.json'))
    .sort(); // lexical sort == chronological for YYYY-MM-DD
  const snaps = files.map(f => loadJson(path.join(SNAP_DIR, f), null)).filter(Boolean);
  // Drop any snapshot with the same runAt as current; take the newest remaining.
  const prior = snaps.filter(s => s.runAt !== currentRunAt);
  return prior.length ? prior[prior.length - 1] : null;
}

/* Classify the day-over-day delta for an HTML (page-based) feed. */
function classifyDocDelta(curr, prev, noMsDate, runDate) {
  const prevById = {};
  (prev.pages || []).forEach(p => { prevById[p.id] = p; });
  let major = false, minor = false, date = null, count = 0;
  for (const p of (curr.pages || [])) {
    if (!p.ok) continue;
    const b = prevById[p.id];
    let pMajor = false, pMinor = false, pDate = null;
    if (p.isNew) { pMajor = true; pDate = dstr(p.msDate) || runDate; }
    else if (!b) { /* first observation, not a proven doc change */ continue; }
    else if (!b.ok) { /* recovered from a fetch failure — not a content change */ continue; }
    else {
      const added = (p.sections || []).filter(s => (b.sections || []).indexOf(s) < 0);
      const gone = (b.sections || []).filter(s => (p.sections || []).indexOf(s) < 0);
      const bodyChanged = p.bodyHash !== b.bodyHash;
      const dateMoved = p.msDate !== b.msDate;
      if (added.length || gone.length) { pMajor = true; pDate = runDate; }
      else if (bodyChanged && !noMsDate && !dateMoved) { pMajor = true; pDate = runDate; } // silent edit: content moved, published date did NOT (Learn ground truth)
      else if (bodyChanged || dateMoved || p.gitCommit !== b.gitCommit) { pMinor = true; pDate = dstr(p.msDate) || runDate; } // documented revision, or GitHub body change with no date to rank it
    }
    if (pMajor || pMinor) { count++; date = maxDate(date, pDate); }
    if (pMajor) major = true; else if (pMinor) minor = true;
  }
  // A newly published spec release (e.g. a new FOCUS version) is a headline,
  // high-stakes change for the reports that conform to it.
  const prevTags = new Set((prev.releases || []).map(r => r.tag));
  (curr.releases || []).forEach(r => {
    if (!prevTags.has(r.tag)) { major = true; count++; date = maxDate(date, dstr(r.published) || runDate); }
  });
  return { severity: major ? 'major' : (minor ? 'minor' : 'none'), date, count };
}

/* Classify the day-over-day delta for the roadmap (item-based) feed. */
function classifyRoadmapDelta(curr, prev, runDate) {
  const prevById = {};
  (prev.items || []).forEach(i => { prevById[i.id] = i; });
  let major = false, minor = false, date = null, count = 0;
  for (const it of (curr.items || [])) {
    const b = prevById[it.id];
    let iMajor = false, iMinor = false, iDate = dstr(it.modified) || runDate;
    if (!b) { iMinor = true; }                        // new item = informational
    else if (it.status !== b.status) { iMajor = true; } // shipped / status moved = headline
    else if (it.descHash !== b.descHash) { iMinor = true; }
    if (iMajor || iMinor) { count++; date = maxDate(date, iDate); }
    if (iMajor) major = true; else if (iMinor) minor = true;
  }
  return { severity: major ? 'major' : (minor ? 'minor' : 'none'), date, count };
}

/* Seed a feed's status from what the metadata alone proves, used only when we
   have no live catch and nothing carried forward. Conservative by design. */
function seedDoc(curr, windowStart, noMsDate) {
  // Release-tracking feeds (e.g. FOCUS): the latest published spec release is the
  // headline signal even when the prose pages are stable, so surface its date.
  const rel = (curr.releases || []).filter(r => !r.prerelease).sort((a, b) => (a.published || '').localeCompare(b.published || '')).pop();
  const relDate = rel ? dstr(rel.published) : null;
  if (noMsDate) {
    return relDate
      ? { severity: 'minor', date: relDate, count: 1, seeded: true }
      : { severity: 'none', date: null, count: 0, seeded: true };
  }
  const inWin = (curr.pages || []).filter(p => p.ok && p.msDate && dstr(p.msDate) >= windowStart);
  if (inWin.length) {
    const date = maxDate(inWin.map(p => dstr(p.msDate)).sort().pop(), relDate);
    return { severity: 'minor', date, count: inWin.length, seeded: true };
  }
  if (relDate) return { severity: 'minor', date: relDate, count: 1, seeded: true };
  return { severity: 'none', date: null, count: 0, seeded: true };
}
function seedRoadmap(curr, windowStart) {
  const inWin = (curr.items || []).filter(i => i.modified && dstr(i.modified) >= windowStart);
  if (!inWin.length) return { severity: 'none', date: null, count: 0, seeded: true };
  const date = inWin.map(i => dstr(i.modified)).sort().pop();
  return { severity: 'minor', date, count: inWin.length, seeded: true };
}

function generate() {
  const existing = loadJson(OUT, { feeds: {} });
  const prevStatus = existing.feeds || {};
  const feedFiles = fs.readdirSync(FEED_DIR)
    .filter(f => f.endsWith('.json') && !f.endsWith('.discovered.json') && !f.endsWith('.wayback.json'));

  const feeds = {};
  for (const ff of feedFiles) {
    const feed = loadJson(path.join(FEED_DIR, ff), null);
    if (!feed || !feed.slug) continue;
    const curr = loadJson(path.join(SNAP_DIR, feed.id + '-latest.json'), null);
    if (!curr) continue;
    const runDate = dstr(curr.runAt) || dstr(new Date().toISOString());
    const isRoadmap = feed.mode === 'roadmap' || feed.mode === 'messagecenter';
    const noMsDate = !!feed.noMsDate;

    // 1) Day-over-day delta from the two most recent snapshots.
    const prior = priorSnapshot(feed.id, curr.runAt);
    let delta = { severity: 'none', date: null, count: 0 };
    if (prior) delta = isRoadmap ? classifyRoadmapDelta(curr, prior, runDate) : classifyDocDelta(curr, prior, noMsDate, runDate);

    // 2) Decide the card's lastChange: a fresh delta wins; otherwise carry the
    //    prior status forward; otherwise seed from what the metadata proves.
    let lastChange;
    if (delta.severity !== 'none') {
      lastChange = { severity: delta.severity, date: delta.date || runDate, count: delta.count, detectedAt: runDate };
    } else if (prevStatus[feed.slug] && prevStatus[feed.slug].lastChange && prevStatus[feed.slug].lastChange.severity !== 'none') {
      lastChange = prevStatus[feed.slug].lastChange; // carry forward last real change
    } else {
      const seed = isRoadmap ? seedRoadmap(curr, feed.windowStart) : seedDoc(curr, feed.windowStart, noMsDate);
      lastChange = { severity: seed.severity, date: seed.date, count: seed.count, seeded: true };
    }

    const pagesWatched = isRoadmap ? (curr.items || []).length : (curr.pages || []).filter(p => p.ok).length;
    const updatedInWindow = isRoadmap
      ? (curr.items || []).filter(i => i.modified && dstr(i.modified) >= feed.windowStart).length
      : (curr.pages || []).filter(p => p.ok && p.msDate && dstr(p.msDate) >= feed.windowStart).length;

    feeds[feed.slug] = {
      feedId: feed.id,
      title: feed.title,
      windowStart: feed.windowStart,
      noMsDate: noMsDate,
      mode: isRoadmap ? 'roadmap' : 'doc',
      lastScan: curr.runAt,
      pagesWatched: pagesWatched,
      updatedInWindow: updatedInWindow,
      lastChange: lastChange
    };
  }

  const manifest = { generatedAt: new Date().toISOString(), feeds: feeds };
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2));
  return manifest;
}

if (require.main === module) {
  const m = generate();
  const rows = Object.entries(m.feeds).map(([slug, f]) =>
    `  ${slug.padEnd(34)} ${String(f.lastChange.severity).padEnd(6)} ${f.lastChange.date || '(none)'}  (${f.lastChange.count} changed${f.lastChange.seeded ? ', seeded' : ''})`);
  console.log('status.json written: ' + Object.keys(m.feeds).length + ' feeds\n' + rows.join('\n'));
}

module.exports = { generate };
