# three.js r186 (vendored)

Unmodified `build/three.module.js` and `build/three.core.js` from the official npm package
[`three@0.186.1`](https://www.npmjs.com/package/three/v/0.186.1). MIT licensed; see [LICENSE.md](LICENSE.md).

Only the Geeky Live demo pages load these files. The renderer in `src/live/three-renderer.mjs`
never imports three.js itself: pass your app's own `THREE` namespace to `createGeekyLive(el, {renderer: 'three', THREE})`.

To update, replace both files from a newer npm release and keep this note's version in sync.
