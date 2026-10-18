# Asset specifications

## Geometry and color

All reusable exports share viewBox `-30 -30 60 60` and a fixed center. Do not crop or rescale frames individually. Original asymmetric source paths are kept in `assets/original/Geeky-Original.svg` and in the rig's `PATHS`. Frame: `#34314f`; pupils: `#000000`; whites/highlights: `#ffffff`. There are no metallic gradients, textures or bicycle motions.

## Format choices

| Format | Use | Important limitation |
|---|---|---|
| SVG + JS player | Responsive web, interactive states/gaze | DOM runtime; not native view code |
| animation.svg | Scalable script-free SMIL loop | Image-context behavior varies; no player API or automatic reduced motion |
| animation.webp | Compact transparent raster loop | Test animated WebP decoding on target app/device |
| animation.gif | Widely portable preview loop | Binary alpha and palette edges; centisecond timing |
| sprites.png / .webp | Fixed-rate game/native/custom renderer | App supplies timer, texture cropping and state logic |
| poster.svg/.png/.webp | Reduced-motion or unsupported format fallback | Static pose |
| MP4 showcase | Review/share the full concept | Presentation background; not transparent |

The GIFs use a thresholded alpha channel and white edge matte. On dark backgrounds use SVG, PNG or WebP for smoother edges. PNG and lossless WebP sprites retain full alpha.

## State asset geometry

Each canonical state has its own folder with eight files. Posters and animated rasters are 256×256. Each animation has a four-second cycle.

- Animated rasters: 48 source samples at 12fps. GIF uses repeating 80/80/90ms timing; WebP uses 83/83/84ms. Both total exactly4000ms. Encoders merge repeated held frames, so stored frame counts differ by state; `manifest.json` lists actual counts and durations.
- SMIL: sampled transform/path keyframes at24fps, linearly interpolated; repeated identical values compressed. It contains no script, remote images or gradients. It repeats indefinitely.
- Sprite sheet:128×128 cells,8columns×12rows,1024×1536 texture. Exactly96cells,24fps,4seconds, row-major. Cell0 corresponds to0seconds; cell95 is95/24seconds. One RGBA sheet is about6MiB uncompressed GPU memory, regardless of PNG/WebP file size. Load only needed states on constrained devices.
- Static/gaze images:256×256. Gaze sheet:128×128 cells,4×4,512×512.

Sprite frame selection:

```js
const frame = Math.floor((elapsedMs % 4000) / 1000 * 24);
const sourceX = (frame % 8) * 128;
const sourceY = Math.floor(frame / 8) * 128;
// drawImage(sheet, sourceX, sourceY,128,128, destX,destY,size,size)
```

A non-looping application should clamp to frame95, then select neutral or another state according to its own logic. Add texture padding if your GPU's sampling/mipmap policy requires it; do not change the documented coordinates silently.

## Gaze semantics

Sixteen directions proceed clockwise, starting up:0°,22.5°,...337.5°. Files use three-digit integer angles and `_5` for the half degree, for example `gaze-000.svg`, `gaze-022_5.svg`, `gaze-090.svg`. The angle is viewer-relative. `manifest.json` includes exact sprite row/column and paths.

## Reproducibility

Run `node tools/export-vectors.mjs`, `python3 tools/export-assets.py`, then `python3 tools/validate-assets.py` from the kit root. The last command adds actual encoded frame counts/durations to the manifest. Rendering uses system librsvg/Cairo, then explicitly unpremultiplies RGBA before saving, avoiding dark alpha fringes. Export dependencies are development-only; none are needed by the browser player.

## Rights and boundaries

The original character artwork came from the user. The kit does not establish or alter rights to that artwork. No third-party character asset is embedded. The code and vector exports are provided as editable project deliverables. These sheets are not the separate image-generated dot pet upload format, and the package contains no Lottie JSON or prebuilt iOS/Android SDK.
