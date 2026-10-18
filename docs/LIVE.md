# Geeky Live

Geeky Live is the interactive runtime for Geeky: a companion in the spirit of Office's Clippy, built from the original artwork. It breathes, glances, blinks, follows your cursor, reacts to pokes and drags, talks in speech balloons, and transforms into bikes, binoculars, magnifiers and atoms.

One choreography engine (the **brain**) drives two interchangeable bodies:

| Renderer | What it draws | Dependencies |
|---|---|---|
| `svg` | Retained-mode SVG from the original contours. Only attributes change per frame. | None |
| `three` | Real 3-D: rims extruded from the original contours, lens-shaped eyes seated in the frames (a front dome with pupils that rotate on the sphere and a flush back shell), eyelids with creases, and temples that appear only when an action uses them. | Your `THREE` namespace (r152+; tested with r186) |

Open [`live/index.html`](../live/index.html) for the playground. Every action, mood and control is there, plus a document editor that Geeky reads over your shoulder.

## Quick start

A single interactive character:

```js
import {createGeekyLive} from './src/live/index.mjs';

const geeky = createGeekyLive(document.querySelector('#stage'), {renderer: 'svg'});
geeky.play('waving');              // one-shot: returns to idle afterwards
geeky.play('bicycle');             // loops until something else plays
await geeky.play('celebrate');     // resolves {id, completed}
geeky.setMood('happy');            // persistent expression layer
```

Give the host element an explicit size. The SVG draws outside its box (`overflow: visible`) so jumps and confetti aren't clipped. The 3-D canvas bleeds 35% past the box on each side for the same reason, with `pointer-events: none`.

The Clippy-style assistant:

```js
import {createGeekyAssistant} from './src/live/index.mjs';

const assistant = createGeekyAssistant({
  THREE: () => import('three'),          // optional: enables “Switch to 3-D” in the menu
  tips: ['Press ? for keyboard shortcuts.'],
  answers: [{match: /pricing/i, reply: 'Plans are on the pricing page!', action: 'point'}]
});
assistant.say('It looks like you’re building something. Need a hand?', {
  buttons: [{label: 'Yes please', value: 'yes', primary: true}, {label: 'No thanks', value: 'no'}]
}).then(choice => { /* 'yes' | 'no' | null when dismissed */ });
```

Serve over HTTP. Module loading from `file://` is not reliable.

## 3-D

The Three.js renderer never imports `three` itself. Pass your app's namespace, so there is only ever one copy of the library:

```js
import * as THREE from 'three';
const geeky = createGeekyLive(el, {renderer: 'three', THREE});
geeky.setRenderer('svg');                 // swap bodies live; the brain keeps its state
geeky.setRenderer('three', {THREE});
```

The assistant also accepts a lazy loader (`THREE: () => import('three')`), so the library downloads only when someone switches to 3-D. The demo pages use the vendored, unmodified r186 build in [`vendor/three/`](../vendor/three/README.md). If WebGL is unavailable, the assistant falls back to SVG and says so.

## Actions

36 actions in five groups. The classic nine keep their v1 IDs and aliases, so `hello`, `delight`, `oops`, `orbit`, `closer-look` and `flutter-right` all still work.

| Group | IDs |
|---|---|
| Classic nine | `idle` ↻, `running-right` ↻, `running-left` ↻, `waving`, `jumping`, `failed`, `waiting` ↻, `running` ↻, `review` ↻ |
| Assistant | `greet`, `goodbye` (holds the vanished pose), `get-attention`, `thinking` ↻, `searching` ↻, `writing` ↻, `reading` ↻, `idea`, `point`, `listen` ↻ |
| Feelings | `celebrate`, `love`, `dizzy`, `sleep` ↻, `wake`, `surprised`, `confused`, `sad`, `giggle`, `shrug`, `nod`, `shake` |
| Idle fidgets | `look-around`, `yawn`, `polish`, `adjust` |
| Transformations | `bicycle` ↻ |

↻ loops until another action plays. Everything else plays once and returns to the base loop (`idle`, or whatever `setBase()` chose). Extra aliases: `knock`, `bike`, `binoculars`, `search`, `think`, `write`, `yes`, `no`, `bye`, `hi`.

Parameters: `point` takes `{params: {angle}}` in degrees, where 0 is right and 90 is up. `bicycle` and `jumping` take `{params: {dir: 1 | -1}}`. `ACTION_LIST` exports `{id, label, group, loop, duration, description}` for building menus.

`reading` and `writing` respond to `notify('key')`/`notify('enter')`: the eyes step along with each keystroke and the head nods.

## How the motion is built

Each frame the brain layers, in order:

1. **Life:** breathing, value-noise drift and micro head tilt.
2. **Mood:** a persistent expression (brows, lids, pupil size, blush).
3. **Action:** keyframe tracks and windows written onto a neutral pose: anticipation before big moves, overshoot after, squash and stretch on contact.
4. **Cross-fade:** the outgoing action keeps playing while it blends out (default 0.24 s).
5. **Secondary physics:** springs make the lenses lag body acceleration, the frames swing like a pendulum when carried by hand, brows bounce, and pokes squish. The assistant's own flights skip the pendulum and just glide.
6. **Gaze:** saccades at rest; pursuit with second-order dynamics when tracking. The eyes lead and the head follows. Each eye aims separately, so near targets make it cross-eyed.
7. **Blinks:** random intervals, occasional doubles, a few milliseconds of left/right lag, extra blinks on big glances.

Eyebrows are shown only when an animation needs them. After the choreography runs, each brow is measured against rest (raised, knitted or arched). At rest the brows are hidden, and they grow in for real expression: surprise, worry, a wink, thinking, scrutiny, delight. A plain smile, gliding, riding, writing, nodding and sleeping use the eyes alone, and physics bounces never flash brows in. Use `brows: 'always'` to keep them visible or `brows: false` to remove them.

Pose channels include `body` (x, y, z, rot, sx, sy, turn, tilt), per-lens transforms plus wheel `spin`, detachable eyeballs, pupils (offset, size, heart, spiral), lids (top, bottom, tilt, crease curvature), brows, temple arms (extension, angle, hook bend, reach toward the viewer, fold, and an optional pinned attach angle), bridge (sag, coil), blush, props and particles. `turn` and `tilt` are true yaw and pitch in 3-D and foreshortening in 2-D. Positive tilt brings the bottom edge toward the viewer.

Temple arms always grow out of the frame. At rest they sit at the hinge on the outer side; as they extend, they slide around the rim and emerge radially in the direction they point. The rim position is sampled from the original contours, so the arms stay attached to the frame band even when a lens is scaled, squashed or turned. An action can pin the attach point instead, which is how the closer-look handle sits straight out from the lens centre like a real magnifier. In 3-D the same rim point is the root, and an arm reaching toward the viewer is sized so its tip lands where the 2-D tip is drawn. The 3-D glasses show no temples at rest. When an action extends one, it grows out of the rim as a single smooth curve, shaft and hook together.

In 3-D the eye is a lens-shaped shell rather than a full sphere. A front dome and a flatter back shell share a base circle that sits inside the frame band at mid-depth. From any angle the eye meets the frame with no gap, and from behind the shell starts exactly where the frame does. Pupils, catchlights, heart and spiral pupils, and lids are layered on the dome's sphere with fixed clearances, and the camera's depth range hugs the character so those layers never flicker through one another. The bridge's ends also sit in the middle of the frame band.

Props are renderer-neutral: `ring` (tilted orbit), `line` (stroke, optionally with depth), `blob` (filled path), `glyph` (from the glyph library) and `cyl`, a tapered cylinder between two depth points. The binocular barrels, eyecups, hinge and focus wheel are `cyl` props. 3-D draws real cylinders, and 2-D projects them with the same yaw, pitch and slightly-from-above view as the 3-D camera.

## `createGeekyLive(target, options)`

| Option | Default | Meaning |
|---|---|---|
| renderer | `'svg'` | `'svg'` or `'three'` |
| THREE | none | Three.js namespace (required for `'three'`) |
| followPointer | true | Eyes and head track the cursor |
| interactive | true | Tap to poke, double-click to animate |
| dragMode | `'spin'` | `'spin'` rotates by hand with inertia; `'none'` disables it |
| reactions | true | Built-in poke reactions (giggle, surprise…); five fast taps make it dizzy |
| autonomous | true | Idle fidgets (look around, polish lenses, push up glasses, yawn) |
| reducedMotion | `'system'` | `'system'`, `true` or `false` |
| zoom | 1 | 1 frames a 64-unit stage; smaller values leave more room |
| brows | `'auto'` | `'auto'` shows brows only while an expression uses them; `'always'` or `true` keeps them; `false` removes them |
| frameColor, shadow, label, seed | | Appearance, accessible name and deterministic randomness |

Methods: `play(id, {loop, params, blend, then, restart})` → Promise, `stop()`, `animate()` (random crowd-pleaser), `setMood(name)`, `setBase(id)`, `lookAt(element | {x, y} | 'user' | null)`, `angleTo(element | point)`, `notify(signal)`, `poke(x?, y?)`, `setDrag(active, vxPx, vyPx)`, `impact(speed)`, `hit(clientX, clientY)`, `anchor()`, `setRenderer(kind, {THREE})`, `setZoom(z)`, `setSpeed(0.1–4)`, `pause()`, `resume()`, `setReducedMotion(v)`, `setFollowPointer(bool)`, `getState()`, `toSVG()` (SVG renderer), `on(event, fn)` → unsubscribe, `destroy()`.

Events: `start`, `end`, `cue` (sound or sync points such as `jump`, `land`, `tap` and `ding`), `poke`, `dblclick`, `hover`, `spin`, `renderer`.

Moods (`EXPRESSIONS`): `neutral`, `happy`, `joy`, `surprised`, `curious`, `worried`, `sad`, `angry`, `focused`, `sleepy`, `skeptical`, `love`, `dizzy`, `smug`, `shy`.

## `createGeekyAssistant(options)`

| Option | Default | Meaning |
|---|---|---|
| renderer / THREE | `'svg'` / none | `THREE` may be a namespace or a lazy loader |
| size | 150 | Floating box size in px |
| corner, margin | `'bottom-right'`, 24 | Initial placement (a dragged position is remembered) |
| dock | none | Element to live inside instead of floating; `dockZoom` (0.8) applies there |
| greeting | true | Pop-in greeting with a short guided tour |
| tips | built-in | Strings for “Show me a tip” |
| answers | `[]` | `{match: RegExp | string, reply: string | fn, action?, buttons?}`, checked before built-in intents |
| chatty | `'normal'` | `'quiet'` (animates, never interrupts), `'normal'` or `'chatty'` |
| sound | false | Tiny synthesized sound effects; no audio files |
| watch | all on | `{typing, letter, scroll, copy, selection, idle, visibility, tips, shake, forms, konami}` |
| menu | `[]` | Extra context-menu items `{label, run(assistant)}` |
| persist, storageKey | true, `'geeky-assistant'` | Remembers position, hidden state, sound, quiet mode and renderer in `localStorage` (fails safe without it) |

Methods: `say(text, {buttons, input, timeout, action, mood})` → Promise of the choice, the typed text, or `null`; `ask()` (Clippy's “What would you like to do?”); `respond(query)`; `tip()`; `pointAt(element, text?)`; `moveTo(x, y, {action, speed})`; `ride()`; `play()`, `animate()`, `setMood()`; `openMenu()`, `closeMenu()`, `closeBalloon()`; `hide()` and `show()` (the user's preference, persisted) versus `tuck()` and `untuck()` (temporary, for example while a hero stage holds Geeky); `dock(el)` and `float(x?, y?)`; `setRenderer(kind)`; `setSound(bool)`; `setChatty(level)`; `on(event, fn)`; `destroy()`. The underlying actor is `assistant.actor`.

Events: `say`, `answer`, `ask`, `hide`, `show`, `drop`, `renderer`.

### What Geeky notices

| Trigger | Reaction | Cooldown |
|---|---|---|
| Typing in any input, textarea or contenteditable | Reads along; nods per key, brows on Enter | none |
| A text box that starts with “Dear”, “Hi”, “Hello”… | “It looks like you’re writing a letter. Would you like help?” (can be switched off for good) | 10 min |
| Hovering `[data-geeky-tip]` | Points at it and says the tip; `data-geeky-action` plays an action too | 40 s per tip |
| Copy | Nods: “Copied!” | 8 s |
| Text selection | Takes a closer look | 20 s |
| Scrolling | Eyes follow the direction; offers “Back to top” at the bottom | 2 min |
| 35 s idle, then 75 s idle | Waiting, then asleep; any input wakes it with a start | |
| Returning to the tab after 20 s+ | “Welcome back!” | 1 min |
| Form submit | Celebrates | 5 s |
| Shaking the cursor around it, a hard fling or 5 quick taps | Dizzy | 12–15 s |
| ↑↑↓↓←→←→BA | Rides a bicycle across the screen | |

### Interaction and accessibility

- Pointer: tap to poke (then “What would you like to do?”), drag to carry with physics, fling, double-click to animate, right-click or long-press for the menu. When docked, dragging spins Geeky by hand.
- Keyboard: Geeky is a focusable button. **Enter** asks, **Space** animates, **Shift+F10** or the Menu key opens the menu, the **arrow keys** move it (Shift for bigger steps), and **Escape** closes balloons. Menus are navigable with ↑/↓.
- Balloon text goes to a polite live region in full, even while it types on screen.
- Reduced motion: no animation loop (a 200 ms still-frame tick), no particles, no flights or rides, and balloons appear without typing.
- Quiet mode and `watch` let you turn off any unsolicited behaviour. Hidden stays hidden across visits, with a small “Show Geeky” pill to bring it back.
- The assistant injects one `<style id="geeky-assistant-style">`. Under a strict `style-src` CSP, copy that CSS into your stylesheet and keep the ID so it isn't injected twice.

## Relationship to the classic kit

`src/geeky-player.mjs`, `dist/geeky-player.js` and every exported GIF, WebP, SMIL SVG and sprite sheet are unchanged. They remain frame-exact, four-second, asset-matched playback. Geeky Live is the interactive runtime. Its classic nine are re-choreographed and are not frame-identical to the exports.

## Tests

`node tests/live.test.mjs` checks every action for finite, bounded poses, correct loop, hold and return behaviour, determinism by seed, interruption storms, reduced motion, physics settling, gaze convergence, particle caps and geometry parsing. It also checks that arms always start on the frame band and point radially once extended, that the flutter glide doesn't wobble, that the magnifier handle is radial, and that the binoculars' depth geometry projects consistently. The renderers were checked in headless Chromium (SwiftShader WebGL) with scripted pointer, keyboard and typing input. Test on your target browsers and devices before shipping.
