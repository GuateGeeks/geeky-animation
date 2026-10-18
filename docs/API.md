# Geeky web player API

This is the classic, asset-matched player. For the interactive Clippy-style runtime (SVG and Three.js), see [LIVE.md](LIVE.md).

## Imports

```js
import {createGeeky, STATE_META, ALIASES} from '../src/geeky-player.mjs';
const player = createGeeky(document.querySelector('#avatar'), {
  state: 'idle', autoplay: true, reducedMotion: 'system'
});
```

Classic scripts expose the same API at `window.Geeky`. ESM imports are safe on a server, but creating the player requires a DOM element in a browser. Do not create two players on the same host. The player owns the host's contents until destroyed.

## Options

| Option | Default | Meaning |
|---|---|---|
| state | idle | Canonical ID or alias |
| autoplay | true | Start timeline immediately |
| loop | state default | Boolean; override repeat behavior |
| speed | 1 | Timeline multiplier, 0.1–4 |
| fps | 30 | Render cap, 1–60; requestAnimationFrame is used |
| reducedMotion | system | `system`, `true` or `false` |
| frameColor | #34314f | 3- or 6-digit hex; pupils remain black |
| onStateChange | none | Function called with `getState()` when `playState()` is invoked |

## Methods

`playState(id, {loop, transitionMs=180, onComplete})`

Switch state and resume. The transition blends pose properties, not rendered crossfade images. `transitionMs` is 0–2000. Interrupted transitions blend from the current pose. `onComplete` fires once for a non-looping timeline that actually reaches its end; it does not fire for loops, interruption or a frozen reduced-motion state. Never use animation completion to determine whether a business operation succeeded.

`pause()` freezes the current pose and cancels animation scheduling. `resume()` continues; a finished one-shot restarts from zero. `seek(seconds)` selects 0–4 seconds, clearing a transition; it does not pause. Use `pause().seek(1.5)` for deterministic inspection. Time 4 shows the neutral loop seam.

`setSpeed(rate)` accepts 0.1–4.

`gaze(degrees)` accepts any finite angle, normalized into 0–360. Zero is up, 90 right, 180 down, 270 left, clockwise as viewed. Sixteen provided presets are 22.5° apart. Gaze applies to the current state, including orbit eyes. `gaze(null)` restores natural gaze.

`setReducedMotion(value)` accepts `system`, `true` or `false`. Reduced motion uses the current state's representative still and stops requestAnimationFrame scheduling. `playing` still records the requested play intent; check `animating` for effective scheduling. The system preference is observed for changes.

`getState()` returns `{state,time,duration,playing,animating,loop,speed,reducedMotion,gaze}`. Duration is 4 seconds. It is a snapshot, not a mutable control object.

`toSVG()` returns the current transparent SVG snapshot. The returned string is static, not a recording. To save a runtime pose, create a Blob with MIME `image/svg+xml`.

`destroy()` cancels pending animation, removes listeners and restores the host's original contents. It is safe to call more than once. Other methods after destruction throw.

Methods return the player for chaining except `getState`, `toSVG` and `destroy`. Unknown state IDs or out-of-range values throw; validate messages at application boundaries. Page visibility pauses scheduling, and resuming visibility does not advance by hidden wall-clock time. The runtime caps an individual elapsed-time step to 0.1 seconds, so heavy throttling can lengthen playback in real time.

## State mapping

| ID | Human label | Default repeat | Aliases |
|---|---|---|---|
| idle | Curious | yes | |
| running-right | Flutter right | yes | flutter-right |
| running-left | Flutter left | yes | flutter-left |
| waving | Hello | no | hello |
| jumping | Delight | no | delight |
| failed | Oops | no | oops |
| waiting | Waiting | yes | |
| running | Orbit | yes | orbit |
| review | Closer look | yes | closer-look |

All states are four seconds. The names match the pet state taxonomy for convenience, but these vector exports are independent assets. `running` denotes active processing and does not travel; the direction variants flutter left/right.

## React

Copy `examples/react/Geeky.js`, adjusting its relative player import for your app. `examples/react/App.js` shows state, gaze and pause props. The wrapper initializes after mount and destroys the player in effect cleanup. Its JavaScript syntax was checked; React execution was not tested in a mounted React app. Run your app's lint, development/StrictMode and production tests.

## Extending the rig

Add a new branch to `statePose()` in `src/geeky-motion.mjs`. Keep its return shape (`p`, `g`, `lid`, `world`, `orbit`, `zoom`, `eyes`) consistent and all values finite. Add metadata to `STATE_META`, optionally an alias, then regenerate browser build/demos/assets. Export scripts enumerate `STATE_META`; update showcase presentation separately. Start and end at neutral for clean loops. Preserve eye contours, black pupils, both catchlights, a connected recognizable silhouette and fixed registration. Test 64px readability and frame bounds.

For CSP-controlled sites, use the external classic or module builds, not the inline demo. No user-provided HTML, external URLs or scripts are needed by the renderer. `frameColor` on the player is restricted to hex. Treat lower-level pure-render helpers as trusted authoring APIs rather than arbitrary untrusted template inputs.
