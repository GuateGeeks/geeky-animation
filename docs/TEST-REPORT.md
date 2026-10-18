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

## Re-run locally

```sh
node tests/player.test.mjs
node tools/export-vectors.mjs
python3 tools/export-assets.py
python3 tools/validate-assets.py
```

Deterministic unit/render checks supplement live-browser and device testing; they do not replace it.
