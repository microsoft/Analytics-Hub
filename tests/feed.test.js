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
function buildWith(mutate) {
  const backup = fs.readFileSync(SRC, 'utf8');
  const j = JSON.parse(backup);
  mutate(j);
  fs.writeFileSync(SRC, JSON.stringify(j, null, 2) + '\n');
  let code = 0;
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')],
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

console.log('\n=== drift guard ===');
// Drop the newest entry for a tool and the build should warn that the app's
// own changelog has moved ahead of the feed.
const backup = fs.readFileSync(SRC, 'utf8');
const j = JSON.parse(backup);
const newest = j.updates.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
j.updates = j.updates.filter((u) => u.id !== newest.id);
fs.writeFileSync(SRC, JSON.stringify(j, null, 2) + '\n');
const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')],
  { cwd: ROOT, encoding: 'utf8' });
fs.writeFileSync(SRC, backup);
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_updates.js')], { cwd: ROOT });
console.log('  build said: ' + out.split('\n').filter((l) => l.includes('!')).join(' '));
ok('warns when a changelog is ahead of the feed', /WARNING/.test(out));
ok('names the tool that drifted', out.includes(newest.tool));

console.log('\n' + (fails ? fails + ' FAILURE(S)' : 'ALL PASS'));
process.exit(fails ? 1 : 0);
