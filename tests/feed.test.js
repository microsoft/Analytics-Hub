/* Guards the update feed.
 *
 * A broken feed is a silent failure. Nobody complains that they stopped
 * receiving updates; they just quietly stop hearing about the work. So the
 * things asserted here are the ones whose breakage would go unnoticed:
 *
 *  - guids stay stable, because a changed guid re-notifies every subscriber
 *    with an item they have already seen
 *  - pubDate is real RFC 822 with English day and month names, because a
 *    locale-dependent date is silently dropped by strict readers
 *  - the XML parses and escapes correctly, because a single raw ampersand
 *    makes the whole feed unreadable rather than degrading gracefully
 *  - the feed is discoverable from the hub, because a feed nobody can find
 *    is the same as no feed
 *  - the drift guard actually fires, since it is the thing that catches a
 *    human forgetting to add an entry
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { JSDOM } = require('jsdom');

const ROOT = 'C:/Studio proj/Analytics-Hub';
const FEED = path.join(ROOT, 'docs/feed.xml');
const SRC = path.join(ROOT, 'docs/data/updates.json');

let fails = 0;
const ok = (n, c) => { if (!c) { fails++; console.log('  FAIL ' + n); } else console.log('  ok   ' + n); };

// Always build first so the test reflects the source, not a stale artefact.
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')], { cwd: ROOT });

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const xml = fs.readFileSync(FEED, 'utf8');

console.log('=== feed structure ===');
const doc = new JSDOM(xml, { contentType: 'text/xml' }).window.document;
ok('XML parses without error', !doc.querySelector('parsererror'));

const items = [...doc.querySelectorAll('item')];
ok('one item per update', items.length === src.updates.length);
ok('channel has a self link',
  !!doc.querySelector('link[rel="self"]') || /rel="self"/.test(xml));
ok('declares rss version 2.0', /<rss version="2\.0"/.test(xml));

const text = (el, tag) => {
  const n = el.getElementsByTagName(tag)[0];
  return n ? n.textContent : null;
};

console.log('\n=== guid stability ===');
const guids = items.map((i) => text(i, 'guid'));
ok('every item has a guid', guids.every(Boolean));
ok('guids are unique', new Set(guids).size === guids.length);
// The guid must derive from the id and nothing else. If it ever picked up the
// title or the date, editing a typo would re-notify every subscriber.
const byId = src.updates.every((u) => guids.includes('analytics-hub:' + u.id));
ok('guid is derived from the id alone', byId);

console.log('\n=== dates ===');
const RFC822 = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;
const dates = items.map((i) => text(i, 'pubDate'));
ok('every pubDate is RFC 822', dates.every((d) => RFC822.test(d)));

// Weekday names must match the actual calendar, which catches a hand-rolled
// formatter drifting off by a day.
const weekdayOk = src.updates.every((u) => {
  const item = items.find((i) => text(i, 'guid') === 'analytics-hub:' + u.id);
  const expect = new Date(u.date + 'T16:00:00Z')
    .toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
  return text(item, 'pubDate').startsWith(expect + ',');
});
ok('weekday names match the calendar', weekdayOk);

const asDates = items.map((i) => new Date(text(i, 'pubDate')).getTime());
ok('items are newest first',
  asDates.every((d, idx) => idx === 0 || asDates[idx - 1] >= d));

console.log('\n=== escaping ===');
// An unescaped & is the classic way a feed silently stops parsing.
ok('no raw unescaped ampersands', !/&(?!amp;|lt;|gt;|quot;|#\d+;|apos;)/.test(xml));
const emdash = src.updates.some((u) => /—/.test(u.title) || /—/.test(u.summary));
if (emdash) ok('non-ascii survives round trip', /—/.test(xml));

console.log('\n=== links ===');
const links = items.map((i) => text(i, 'link'));
ok('every link is absolute https', links.every((l) => /^https:\/\//.test(l)));
ok('links point at the published site',
  links.every((l) => l.startsWith('https://microsoft.github.io/Analytics-Hub/')));

console.log('\n=== discoverability ===');
for (const page of ['docs/index.html', 'docs/cowork-billing/index.html']) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
  ok(page + ' advertises the feed',
    /rel="alternate"[^>]*application\/rss\+xml/.test(html));
}
const upIndex = fs.readFileSync(path.join(ROOT, 'docs/updates/index.html'), 'utf8');
ok('updates page was generated', upIndex.length > 500);
ok('updates page advertises the feed',
  /rel="alternate"[^>]*application\/rss\+xml/.test(upIndex));
// New Outlook has no RSS support at all, so the instructions must not send
// people hunting for a menu that does not exist.
ok('subscribe steps name classic Outlook specifically', /classic<\/em> Outlook|classic Outlook/.test(upIndex));
ok('subscribe steps warn that new Outlook cannot do this', /do not support RSS/.test(upIndex));
ok('subscribe steps name the real Teams template',
  /Post to a channel when a webfeed item is published/.test(upIndex));

console.log('\n=== validation refuses bad input ===');
function buildWith(mutate, args) {
  const backup = fs.readFileSync(SRC, 'utf8');
  const j = JSON.parse(backup);
  mutate(j);
  fs.writeFileSync(SRC, JSON.stringify(j, null, 2) + '\n');
  let code = 0;
  try {
    execFileSync(process.execPath,
      [path.join(ROOT, 'scripts/build_updates.js'), ...(args || [])],
      { cwd: ROOT, stdio: 'pipe' });
  } catch (e) { code = e.status || 1; }
  fs.writeFileSync(SRC, backup);
  return code;
}

ok('duplicate ids fail the build',
  buildWith((j) => { j.updates.push({ ...j.updates[0] }); }) !== 0);
ok('a malformed date fails the build',
  buildWith((j) => { j.updates[0].date = '24-08-2026'; }) !== 0);
ok('a missing title fails the build',
  buildWith((j) => { delete j.updates[0].title; }) !== 0);
ok('an absolute link fails the build',
  buildWith((j) => { j.updates[0].link = 'https://example.com/x'; }) !== 0);
ok('an unknown status fails the build',
  buildWith((j) => { j.updates[0].status = 'maybe'; }) !== 0);
// An empty feed would look broken to anyone already subscribed, so refuse to
// write one rather than quietly emptying it.
ok('a feed with nothing published fails the build',
  buildWith((j) => { j.updates.forEach((u) => { u.status = 'draft'; delete u.date; }); }) !== 0);

console.log('\n=== drafts stay out of the feed ===');
const backupDraft = fs.readFileSync(SRC, 'utf8');
{
  const j = JSON.parse(backupDraft);
  const publishedCount = j.updates.filter((u) => u.status === 'published').length;
  j.updates.unshift({
    id: 'test-draft-should-not-appear',
    status: 'draft',
    drafted: '2026-01-01',
    tool: 'Analytics Hub',
    link: 'updates/',
    tags: ['Added'],
    title: 'This draft must not reach anyone',
    summary: 'If this string appears in the feed or on the page, the draft gate is broken and every work-in-progress note is being pushed to subscribers.',
  });
  fs.writeFileSync(SRC, JSON.stringify(j, null, 2) + '\n');
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')],
    { cwd: ROOT, encoding: 'utf8' });

  const feedNow = fs.readFileSync(FEED, 'utf8');
  const pageNow = fs.readFileSync(path.join(ROOT, 'docs/updates/index.html'), 'utf8');
  ok('draft is absent from the feed', !feedNow.includes('test-draft-should-not-appear'));
  ok('draft is absent from the page', !pageNow.includes('must not reach anyone'));
  ok('published count is unchanged',
    (feedNow.match(/<item>/g) || []).length === publishedCount);
  ok('the build says a draft is being held', /draft.*held back/i.test(out));

  // Publishing must stamp today, not the drafted date. A backdated item lands
  // in a reader already old, where it sorts below things already read.
  const today = new Date().toISOString().slice(0, 10);
  execFileSync(process.execPath,
    [path.join(ROOT, 'scripts/build_updates.js'), '--publish', 'test-draft-should-not-appear'],
    { cwd: ROOT, encoding: 'utf8' });
  const after = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  const pub = after.updates.find((u) => u.id === 'test-draft-should-not-appear');
  console.log('  drafted 2026-01-01, published as ' + pub.date);
  ok('publish flips status', pub.status === 'published');
  ok('publish stamps today, not the drafted date', pub.date === today);
  ok('the drafted field is cleared', pub.drafted === undefined);
  const feedPub = fs.readFileSync(FEED, 'utf8');
  ok('now it is in the feed', feedPub.includes('test-draft-should-not-appear'));
}
fs.writeFileSync(SRC, backupDraft);
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')], { cwd: ROOT });

console.log('\n=== drift guard ===');
// Drop the newest entry for a tool and the build should warn that the app's
// own changelog has moved ahead of the feed. Must target a tool that actually
// has a changelog: dropping an entry for something like the hub itself proves
// nothing, since there is no changelog to compare against.
const CHECKED = ['Cowork Chargeback', 'Cowork Policy Helper', 'Multi-Budget Chargeback Report'];
const backup = fs.readFileSync(SRC, 'utf8');
const j = JSON.parse(backup);
const newest = j.updates
  .filter((u) => CHECKED.includes(u.tool) && u.status === 'published')
  .sort((a, b) => b.date.localeCompare(a.date))[0];
ok('found a tool with a changelog to test against', !!newest);
// Remove every entry for that tool, so there is nothing left to satisfy the
// comparison and the warning has to fire.
j.updates = j.updates.filter((u) => u.tool !== newest.tool);
fs.writeFileSync(SRC, JSON.stringify(j, null, 2) + '\n');
const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')],
  { cwd: ROOT, encoding: 'utf8' });
fs.writeFileSync(SRC, backup);
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')], { cwd: ROOT });
console.log('  dropped all entries for: ' + newest.tool);
console.log('  build said: ' + out.split('\n').filter((l) => l.includes('!')).join(' ').trim());
ok('warns when a changelog is ahead of the feed', /WARNING/.test(out));
ok('names the tool that drifted', out.includes(newest.tool));

/* A held draft must silence the warning. A draft means the entry exists and is
   being withheld on purpose, which is not the same failure as forgetting to
   write one, and warning about it every build would train people to ignore
   the warning that matters. */
{
  const k = JSON.parse(backup);
  k.updates = k.updates.filter((u) => u.tool !== newest.tool);
  k.updates.unshift({
    id: 'test-drift-draft',
    status: 'draft',
    drafted: '2026-01-01',
    tool: newest.tool,
    link: newest.link,
    tags: ['Changed'],
    title: 'Held back on purpose',
    summary: 'A draft covering this tool, deliberately not published yet.',
  });
  fs.writeFileSync(SRC, JSON.stringify(k, null, 2) + '\n');
  const out2 = execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')],
    { cwd: ROOT, encoding: 'utf8' });
  fs.writeFileSync(SRC, backup);
  execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')], { cwd: ROOT });
  ok('a waiting draft silences the drift warning', !out2.includes(newest.tool + ': changelog has'));
}

console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PASS'));
process.exit(fails ? 1 : 0);
