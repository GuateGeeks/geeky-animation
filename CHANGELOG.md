# Changelog

All notable changes to `@guategeeks/geeky` (GuateGeeks/geeky-animation). Versions follow [semver](https://semver.org) with the contract in [docs/PACKAGE.md](docs/PACKAGE.md): removing or renaming an export or an action id is major, adding one is minor, motion and geometry tweaks are patch.

## [1.2.0] - 2026-10-26

### Added

- Live actor (`createGeekyLive`, `GeekyActor`) for embedding in product screens:
  - `setFrameColor(hex)` recolours the frame live (theme or colour-scheme changes) while the current action carries on; `frameColor` is now in the option types.
  - `actionLabels: false` keeps the accessible name exactly as given instead of appending the action's (English) label; `label: null` makes Geeky decorative (`aria-hidden`, no role or name), also on `SvgRenderer` and `ThreeRenderer`.
  - `loadRenderer(kind, {THREE})` accepts a loader such as `() => import('three')`; `renderer: 'three'` with a loader starts in SVG and switches when three.js arrives, keeping SVG (and emitting `renderer` with `error`) if it cannot.
  - `setAutonomous(on)` turns idle fidgets on or off.

### Fixed

- `GeekyActor#setRenderer` is typed as returning the actor (it never returned a Promise).

## [1.1.0] - 2026-10-26

### Added

- The repository is an installable package, `@guategeeks/geeky` (`npm i github:GuateGeeks/geeky-animation#v1.1.0`), with entry points `.`, `./actions`, `./brain`, `./core`, `./three`, `./model`, `./svg`, `./player`, `./motion`, `./manifest.json` and `./assets/*`, and TypeScript declarations for each.
- `createGeekyModel({THREE, seed, reduced, palette, detail})` (`./model`): Geeky built into a Group of a host three.js scene with exactly two materials, the host's lights and no WebGL context of its own. Replaces the `embedded.js` copies in GuateGeeks/cotizador and GuateGeeks/design-system.
- `palette` option (`frame`, `back`, `lid`, `heart`, `blush`, hex colours) for the embedded model.
- `ThreeRenderer` headless mode: `scene`, `lights` and `beforeBuild` options.
- Contract tests for the exported API, the action ids, the version and the package contents; CI on pull requests; a tag-driven release workflow that notifies GuateGeeks/design-system.
- Apache-2.0 license.

### Changed

- `ThreeRenderer` with `shadow: false` no longer builds the hidden contact-shadow texture.
- `manifest.json` carries the package version.

## [1.0.0] - 2026-10-24

### Added

- Geeky matte animation kit: nine four-second states as animated SVG, GIF and WebP, posters, sprite sheets, sixteen gazes, the editable rig (`src/geeky-motion.mjs`) and the dependency-free player (`src/geeky-player.mjs`).
- Geeky Live: one animation brain driving SVG and Three.js renderers, 50 actions (36 originals plus 14 technology and GuateGeeks performances), the floating assistant and the playground.
