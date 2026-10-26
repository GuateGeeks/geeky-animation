import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {ACTION_LIST, resolveAction} from '@guategeeks/geeky/actions';
import {snapshotApi} from '../tools/snapshot-api.mjs';

const read = async path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const pkg = await json('package.json');

test('exported API matches the snapshot', async () => {
  assert.deepEqual(await snapshotApi(), await json('tests/fixtures/api.json'),
    'intended API change? run node tools/snapshot-api.mjs --write and bump the version per docs/PACKAGE.md');
});

// Ids are a contract with every product that cues Geeky: never regenerate this fixture to hide a removal.
test('no action id disappears', async () => {
  const ids = new Set(ACTION_LIST.map(a => a.id));
  for (const id of await json('tests/fixtures/action-ids.json')) {
    assert.ok(ids.has(id), `action "${id}" was removed or renamed: that is a major release`);
    assert.equal(resolveAction(id).id, id);
  }
});

test('versions agree', async () => {
  const manifest = await json('manifest.json');
  assert.equal(manifest.version, pkg.version, 'manifest.json and package.json versions differ');
  assert.ok((await read('CHANGELOG.md')).includes(`## [${pkg.version}]`), `CHANGELOG.md has no "## [${pkg.version}]" section`);
});

test('every export target exists and ships, nothing heavy does', () => {
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {cwd: new URL('..', import.meta.url), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}));
  const files = new Set(packed.files.map(f => f.path));
  const targets = Object.values(pkg.exports).flatMap(t => typeof t === 'string' ? [t] : Object.values(t)).filter(t => !t.includes('*'));
  for (const target of targets) assert.ok(files.has(target.replace(/^\.\//, '')), `${target} is exported but not packed`);
  const heavy = [...files].filter(f => /\.(gif|mp4)$|sprites|^previews\/|^_site\/|^vendor\/|^docs\/|^tests\/|^tools\/|^node_modules\//.test(f));
  assert.deepEqual(heavy, []);
  assert.ok(packed.unpackedSize < 3_000_000, `unpacked size ${packed.unpackedSize} ≥ 3 MB`);
});
