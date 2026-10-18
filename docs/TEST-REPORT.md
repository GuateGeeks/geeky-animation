# Validation report

Kit version1.0.0 ·18 October2026

## Passed

- JavaScript syntax: ES modules, classic browser build, vanilla and React example source; scripts extracted from standalone demos.
-15 automated player tests using a mock DOM and deterministic animation clock: initialization,9canonical states,aliases,pause,resume,seek/speed bounds,16gazes and wrapping,one-shot completion,looping,interrupted transitions,reduced motion,system preference changes,document visibility,input guards,destroy cleanup.
-864 source frames rendered:96perstate; every visible character stays inside the fixed256×256 viewport with transparent border.
-72 SMIL comparisons:8times perstate. Animation values were evaluated numerically and rendered with librsvg/Cairo, then compared against corresponding rig frames. Mean absolute RGBA error was below0.05/255 in all cases.
-9animatedSVGs parse as XML and contain no scripts,raster images,metallic gradients or non-finite geometry.
-All9GIFs and9animatedWebPs decode and have4000ms total duration. Encoded repeated frames may be merged; actual counts are in manifest.json.
-All9PNG/WebP state sheets have1024×1536 dimensions and transparent RGBA; each contains96fixed128×128cells. Gaze sheets are512×512 with16cells.
-16gazeSVG/PNG/WebP sets exist and their manifest paths resolve.
-State-poster contact sheet and sampled SMIL motion contact sheet visually inspected. Original eye shapes, black pupils and highlights remain recognizable in orbit and closer-look transformations.
-Guide PDF and DOCX were rendered and inspected separately across all8pages.

Machine-readable details: `tests/asset-results.json`, `tests/render-results.json`, `tests/player-results.json`. Readable test log: `tests/player-output.txt`.

## Not completed / limitations

- No successful live-browser render or interactive-controls test. The available cloud preview could not connect to the local HTTP server; browser launch and elevated execution also hit runtime infrastructure restrictions. This is a testing boundary, not evidence of a working browser session.
- React examples were syntax-checked, not mounted in a React application.
- Native iOS/Android/React Native/Flutter shells and physical-device WebView behavior were not built or tested.
- No full browser/device compatibility matrix, screen-reader audit, production performance benchmark or application CSP audit was completed.

Before shipping, run the demo in your supported browsers, mount the React wrapper if used, test multiple avatar instances, pause/reduced motion, small-size readability, background/foreground lifecycle, state interruptions, native bridge messages,local asset loading and texture memory on target devices. Use posters if an animation format is unsupported.

## Geeky Live (interactive SVG + Three.js runtime)

Added after the 1.0.0 kit. Verified on 18 October 2026:

- 17 Node tests (`tests/live.test.mjs`): all 36 actions run frame by frame with finite, bounded poses; pupils stay inside the eyes and lids never overlap; loops keep looping, one-shots return to idle, `goodbye` holds; promises report completion and interruption; seeded runs are identical; random interruption storms stay finite; reduced motion is static and particle-free; poke, drag, impact and hand-spin settle back to rest; every mood applies; gaze converges on near targets; particles are capped; idle fidgets fire; shared path and glyph geometry parses. Temple arms start on the frame band in every frame of every action and point radially once extended (pinned arms stay pinned). The flutter glide holds steady after its wind-up (body rotation range under 2.5°, height under 0.6 units, no lens flapping). The closer-look handle points straight out from the lens centre. The binocular cylinders project consistently with the 3-D camera.
- Headless Chromium 153 with SwiftShader WebGL, driven over the DevTools protocol with real pointer, keyboard and text input: playground and landing load without console errors. The greeting, guided-tour buttons, cursor gaze, poke, context menu, Enter/Space keyboard control, 2-D ↔ 3-D switching, hand-spin with spring-back, pop-out flight, dragging, the letter tip, the hero-to-corner handoff on scroll, `prefers-reduced-motion` (animation loop stops, no particles) and all 36 actions played back to back in the live 3-D renderer all worked. No horizontal scroll at 390 px wide.
- Frame grids of every action were rendered and inspected in both renderers.

Not covered: real GPUs, Safari and Firefox, touch hardware (long-press and flings were only exercised with mouse input), screen readers, and sound output (the Web Audio code ran, but nothing was listened to).

## Re-run locally

```sh
node tests/player.test.mjs
node tests/live.test.mjs
node tools/export-vectors.mjs
python3 tools/export-assets.py
python3 tools/validate-assets.py
```

Deterministic unit/render checks supplement live-browser and device testing; they do not replace it.
