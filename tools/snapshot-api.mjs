/* The package's public API as data: every code entry point and the names it exports.
   tests/package.test.mjs compares it with tests/fixtures/api.json. After an intended API change:
     node tools/snapshot-api.mjs --write
   and version the change (docs/PACKAGE.md: removing or renaming an export is a major release). */
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const root = new URL('../', import.meta.url);

export async function snapshotApi() {
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  const out = {};
  for (const [entry, target] of Object.entries(pkg.exports)) {
    if (typeof target === 'string') continue; // JSON and asset paths, not modules
    const specifier = entry === '.' ? pkg.name : `${pkg.name}/${entry.slice(2)}`;
    out[entry] = Object.keys(await import(specifier)).sort();
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const api = JSON.stringify(await snapshotApi(), null, 2) + '\n';
  if (process.argv.includes('--write')) await writeFile(new URL('tests/fixtures/api.json', root), api);
  else process.stdout.write(api);
}
