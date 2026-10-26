# Using Geeky as a package

geeky-animation is the lab where Geeky is made: actions, poses, rig, artwork, renderers and demos. Products and the GuateGeeks design system consume it as the package `@guategeeks/geeky`, pinned to a release tag.

## Install

```sh
npm i github:GuateGeeks/geeky-animation#v1.1.0
```

npm installs it as `@guategeeks/geeky` and records the tag's commit in the lockfile. Only source, types, the manifest, the static and original artwork, gaze SVGs and state posters are installed: no GIFs, sprite sheets, video, docs or the Pages site. Geeky never imports `three`; the host injects it.

## Entry points

| Import | What it gives you |
|---|---|
| `@guategeeks/geeky` | Geeky Live: `createGeekyLive`, `GeekyActor`, `createGeekyAssistant`, `GeekyAssistant`, the brain, the action catalogue and both renderers |
| `@guategeeks/geeky/actions` | `ACTIONS`, `ACTION_LIST`, `ALIASES`, `GROUPS`, `resolveAction` |
| `@guategeeks/geeky/brain` | `GeekyBrain`, `EXPRESSIONS`, pose helpers |
| `@guategeeks/geeky/core` | Shared geometry, palette and maths (low level) |
| `@guategeeks/geeky/three` | `ThreeRenderer` (windowed, or headless with `scene`) |
| `@guategeeks/geeky/model` | `createGeekyModel`, `MODEL_THREE_KEYS`, `MODEL_PALETTE`, `DETAIL` |
| `@guategeeks/geeky/svg` | `SvgRenderer` |
| `@guategeeks/geeky/player` | The classic nine-state player: `createGeeky`, `STATE_META`, `characterSVG` |
| `@guategeeks/geeky/motion` | The classic matte rig: `statePose`, `character` |
| `@guategeeks/geeky/manifest.json` | State ids, files, timing and gaze directions |
| `@guategeeks/geeky/assets/*` | `assets/static/*`, `assets/original/*`, `assets/gaze/*.svg`, `assets/states/<id>/poster.{svg,webp}` |

Every code entry ships TypeScript declarations.

## Geeky inside your own three.js scene

```js
import {Group, Mesh, Vector3, Plane, Shape, Path, ShapeUtils, ExtrudeGeometry, SphereGeometry, CylinderGeometry, TorusGeometry,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, DoubleSide, Color, Float32BufferAttribute} from 'three';
import {createGeekyModel} from '@guategeeks/geeky/model';

// Pass the whole namespace, or only the members in MODEL_THREE_KEYS to keep the bundle small.
const THREE = {Group, Mesh, Vector3, Plane, Shape, Path, ShapeUtils, ExtrudeGeometry, SphereGeometry, CylinderGeometry, TorusGeometry,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, DoubleSide, Color, Float32BufferAttribute};
const geeky = createGeekyModel({THREE, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, palette: {frame: '#34314f'}});
geeky.group.scale.setScalar(.027); // character units (a 64-unit stage) to your world units
scene.add(geeky.group);
geeky.brain.play('greet');
// Each frame you render: geeky.step(dt); renderer.render(scene, camera);
// On teardown: geeky.dispose();
```

- Exactly two materials at every moment (`geeky.materials()`), lit by your scene's lights.
- `palette` takes hex colours for `frame`, `back`, `lid`, `heart` and `blush`; any other value throws a `TypeError` naming the key. Colours are fixed at creation: dispose and create again to change them.
- `step(dt)` only poses meshes; you render. Skip it while nothing moves to render on demand.

## Versioning contract

Products cue Geeky by action id and import names from the entry points, so both are versioned:

| Change | Release |
|---|---|
| Remove or rename an export, an entry point or an action id; change a function's meaning | **major** |
| Add an action, an export, an option or an entry point | **minor** |
| Tune motion, poses, timing or geometry; fix a bug | **patch** |

`tests/package.test.mjs` enforces it: the exported names must match `tests/fixtures/api.json`, every id in `tests/fixtures/action-ids.json` must still resolve, `package.json`, `manifest.json` and `CHANGELOG.md` must agree, and the package must stay small.

- **Changing the API on purpose:** run `node tools/snapshot-api.mjs --write`, commit the new `tests/fixtures/api.json` and bump the version accordingly.
- **Adding actions:** append the new ids to `tests/fixtures/action-ids.json`. Never remove an id from it to make a test pass: that hides a breaking change.

## Releasing

1. On a branch: set the new version in `package.json` and `manifest.json`, add a `## [X.Y.Z] - YYYY-MM-DD` section to `CHANGELOG.md`, run `npm test` and `npm run typecheck`, open a pull request and merge it.
2. Tag the merge: `git tag vX.Y.Z && git push origin vX.Y.Z`.
3. The **Release Geeky** workflow checks the tag against the versions, runs the tests, creates the GitHub Release from the changelog section and notifies GuateGeeks/design-system (when the `DESIGN_SYSTEM_DISPATCH_TOKEN` secret is set: a fine-grained token for GuateGeeks/design-system with Contents read and write).
4. The design system's **update-geeky** workflow bumps `@guategeeks/mascot` to the new tag, runs its unit, end-to-end and visual suites, and opens a pull request for review. Without the secret it finds the release on its weekly run.
