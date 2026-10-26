/* Release gate and notes for a tag: node tools/release-notes.mjs vX.Y.Z
   Fails unless the tag matches package.json and manifest.json, then prints that version's CHANGELOG.md section. */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The version a tag releases; throws unless it is vX.Y.Z and matches both version fields. */
export function checkTag(tag, pkgVersion, manifestVersion) {
  const m = /^v(\d+\.\d+\.\d+)$/.exec(tag);
  if (!m) throw new Error(`tag ${tag} is not vX.Y.Z`);
  if (m[1] !== pkgVersion) throw new Error(`tag ${tag} does not match package.json ${pkgVersion}`);
  if (m[1] !== manifestVersion) throw new Error(`tag ${tag} does not match manifest.json ${manifestVersion}`);
  return m[1];
}

/** The body of the `## [version]` section of a changelog; throws if it is missing or empty. */
export function notesFor(changelog, version) {
  const head = new RegExp(`^## \\[${escape(version)}\\].*$`, 'm').exec(changelog);
  if (!head) throw new Error(`CHANGELOG.md has no "## [${version}]" section`);
  const rest = changelog.slice(head.index + head[0].length);
  const next = rest.search(/^## \[/m);
  const notes = (next < 0 ? rest : rest.slice(0, next)).trim();
  if (!notes) throw new Error(`CHANGELOG.md section ${version} is empty`);
  return notes;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  try {
    const version = checkTag(process.argv[2] ?? '', JSON.parse(read('package.json')).version, JSON.parse(read('manifest.json')).version);
    process.stdout.write(notesFor(read('CHANGELOG.md'), version) + '\n');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
