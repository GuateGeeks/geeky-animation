# geeky-animation

## Geeky animation kit · Matte edition

A reusable, editable animation system built from the original Geeky SVG. The original offset glasses, black pupils and two white catchlights are retained. The frames are matte dark indigo. The closer-look coil, orbital loops and flutter transformations are included.

## Geeky Live (new)

A Clippy-style, highly interactive Geeky in **plain SVG** and **Three.js**, driven by one shared animation brain: 36 actions (the classic nine re-choreographed, plus assistant behaviours, feelings, fidgets and a bicycle transformation), eyebrows that appear only when an expression needs them, temple-arms, a cursor-following gaze with saccades and convergence, blinks, secondary physics, pokes, flings, hand-spins, speech balloons, a context menu, an “Ask Geeky” box, and page awareness — including *“It looks like you’re writing a letter.”*

- Play: [**live/index.html**](live/index.html) · API: [**docs/LIVE.md**](docs/LIVE.md) · Entry: `src/live/index.mjs`

```js
import {createGeekyAssistant, createGeekyLive} from './src/live/index.mjs';
createGeekyAssistant({THREE: () => import('./vendor/three/three.module.js')}); // floating companion
createGeekyLive(document.querySelector('#stage')).play('bicycle');            // one interactive character
```

The classic player and every exported asset below are unchanged.

## Start here

1. Open [**demo/index.html**](demo/index.html) for the self-contained interactive demo. It has state, gaze, speed, pause, scrub, size and reduced-motion controls.
2. Read [**docs/Geeky-Animation-Guide.pdf**](docs/Geeky-Animation-Guide.pdf). The editable guide is beside it as DOCX.
3. Use **src/geeky-player.mjs** in a web app, or **dist/geeky-player.js** as a classic browser script.
4. Select **assets/states/** for drop-in animated SVG, GIF or WebP files, or transparent sprite sheets.
5. Read **manifest.json** for exact state IDs, paths, dimensions, timing and gaze directions.

## GitHub Pages

A responsive landing page is included at [index.html](index.html), with the interactive demo, asset downloads and guide links. The [Pages deployment guide](docs/GITHUB-PAGES.md) covers setup, local preview and troubleshooting.

After pushing the Pages changes, select **Settings → Pages → Source → GitHub Actions**, then run **Deploy Geeky to GitHub Pages** from the Actions tab. The workflow validates and publishes an explicit static-site allowlist using official pinned actions; no custom secret is required.

Expected URL after deployment: `https://guategeeks.github.io/geeky-animation/`. This is not a live-status claim; use the URL in the successful `github-pages` deployment.

## Contents

- 9 four-second state animations: curious, flutter right/left, hello, delight, oops, waiting, orbit and closer look
- 9 transparent animated SVGs; 9 GIFs; 9 animated WebPs
- 9 state posters in SVG, PNG and WebP
- 9 PNG and 9 lossless WebP sprite sheets, 96 fixed-registration frames each
- 16 directional gazes in SVG, PNG and WebP, plus a gaze sprite sheet in PNG/WebP
- Static neutral avatar in SVG, PNG and WebP; unmodified original SVG
- Editable motion rig, dependency-free web player, vanilla JS and React examples
- Self-contained mobile WebView demo with a JSON command bridge
- 36-second MP4 showcase, guide, API reference and test report

## Web quick start

```html
<div id="geeky" style="width:160px;height:160px"></div>
<script src="./dist/geeky-player.js"></script>
<script>
  const geeky = Geeky.createGeeky('#geeky', {reducedMotion: 'system'});
  geeky.playState('orbit');
  // geeky.gaze(90); geeky.pause(); geeky.resume();
</script>
```

ES module:

```js
import {createGeeky} from './src/geeky-player.mjs';
const geeky = createGeeky(document.querySelector('#geeky'));
geeky.playState('closer-look');
// On unmount: geeky.destroy();
```

To try the module example locally, run `python3 -m http.server 8000` from the repository root and open `http://localhost:8000/examples/vanilla/`.

Serve module examples over HTTP in development; browser module loading from file URLs is not a reliable deployment path. The inline demo has no external dependencies. Give the host an explicit width and height.

## Editing and rebuilding

The canonical editable sources are **src/geeky-motion.mjs** and **src/geeky-player.mjs**. `statePose(state,time)` builds a pose; `character(pose)` renders it. `PATHS` contains the original contours. Change motion poses rather than redrawing the eyes. Keep pupil fills black and preserve both highlight paths.

Run the lightweight player checks with `node tests/player.test.mjs`, and the Geeky Live engine checks with `node tests/live.test.mjs`.

Rebuild the distributed assets from the repository root:

```sh
python3 tools/build-browser.py
python3 tools/build-demos.py
node tools/export-vectors.mjs
python3 tools/export-assets.py
python3 tools/validate-assets.py
node tests/player.test.mjs
```

Runtime: a modern DOM browser with SVG and requestAnimationFrame, no packages or network requests. Export tooling: Node.js, Python 3, Pillow, NumPy, system librsvg-2 and Cairo shared libraries. React examples assume React is already installed in your app. Export scripts create a disposable `.export/` cache. The showcase MP4 and formatted guide are presentation deliverables, not rebuilt by these scripts.

## Accessibility and deployment

The player defaults to the system reduced-motion preference and switches to a meaningful still without a running animation loop. Always give users a pause control for long-running decorative motion. Use the static poster for reduced motion when embedding an animated image; GIF/WebP/SMIL image files do not implement the player API. Mark decorative host content appropriately and expose important status as ordinary text outside the avatar.

The mobile HTML is a WebView starting point, not a prebuilt native SDK. Test your chosen iOS/Android shell, bridge and asset-loading policy on devices. There is no Lottie file in this kit.

**Validation:** 15 automated player API/lifecycle tests, 864 rendered frame bounds checks and 72 numerical SMIL-to-rig raster comparisons passed. Live-browser control testing and native device testing were not completed because the available preview runtime could not be reached. See **docs/TEST-REPORT.md** for precise scope.

## Artwork and licensing

This repository preserves the supplied original Geeky artwork in `assets/original/Geeky-Original.svg`. No license is currently declared in this repository. Contact the repository owner about permission to reuse the artwork or code.
