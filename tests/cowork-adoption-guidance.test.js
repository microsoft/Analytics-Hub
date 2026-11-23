const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const docs = path.resolve(__dirname, '..', 'docs');
const source = fs.readFileSync(path.join(docs, 'choose-report', 'index.html'), 'utf8');
const template = id => source.match(new RegExp('<template id="' + id + '">([\\s\\S]*?)</template>'))[1];
const tools = JSON.parse(source.match(/<script id="mk-data" type="application\/json">([\s\S]*?)<\/script>/)[1]).TOOLS;
const offering = tools.find(tool => tool.id === 'cowork-adoption');

test('Cowork Adoption keeps Testing and paired PAX prerequisites explicit', () => {
  const guide = template('caStep4');
  assert.equal(offering.version, '8.0.0-testing');
  assert.equal(offering.incubating, true);
  assert.match(offering.blurb, /not production-supported/);
  assert.match(guide, /PAX v2/);
  assert.match(guide, /Cowork Adoption Purview File/);
  assert.match(guide, /Cowork Adoption Users File/);
  assert.match(guide, /_Entity/);
  assert.match(guide, /_RowId/);
  assert.match(guide, /Do not use raw audit exports/);
  assert.match(guide, /Keep existing exports, history and working deployments/);
  assert.match(guide, /StartDate is inclusive and EndDate exclusive in UTC/);
  assert.doesNotMatch(guide, /PreprocessedOutputPath|path-a-try|path-b-connect|tree\/main\/scripts/);
  assert.match(guide, /not measured human attention/);
  assert.match(guide, /not performance, compensation or disciplinary ratings/);
});

test('Cowork Adoption ordered preview bytes match the public synthetic provenance, not assumed V8 QA', () => {
  const hero = template('caHero');
  const files = hero.match(/data-files="([^"]+)"/)[1].split(',');
  const directory = path.join(docs, 'choose-report', 'ca-v8-preview');
  const provenance = JSON.parse(fs.readFileSync(path.join(directory, 'SYNTHETIC_PROVENANCE.json'), 'utf8'));
  assert.equal(files.length, 8);
  assert.deepEqual(files, provenance.files.map(file => file.path));
  assert.match(hero, /data-frames="8"/);
  assert.match(hero, /1 \/ 8/);
  assert.equal([...hero.matchAll(/class="ca-dot"/g)].length, files.length);
  assert.match(hero, /labeled V7/);
  assert.match(hero, /do not prove V8 rendering/);
  assert.equal(provenance.validation.customerDataUsed, false);
  for (const file of provenance.files) {
    const bytes = fs.readFileSync(path.join(directory, file.path));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(), file.sha256);
  }
});

test('Cowork Adoption manifest player uses named images and keeps numbered fallback', () => {
  const player = source.match(/<script id="ca-player">([\s\S]*?)<\/script>/)[1];
  new vm.Script(player);
  assert.match(player, /files \? files\.length : parseInt/);
  assert.match(player, /st\.files \? st\.files\[st\.i\] : 'frame_'/);
});
