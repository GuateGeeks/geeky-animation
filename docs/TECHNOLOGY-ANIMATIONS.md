# Technology & GuateGeeks animation pack

Fourteen new performances extend Geeky Live to **50 actions**. Each is newly choreographed on Geeky’s original glasses rig, with matte indigo frames, black pupils, both white catchlights, expressive lenses and temple arms. The original 36 actions, aliases, classic exports and player are preserved.

Open the [playground](../live/index.html), then choose **New · 14** in the animation library. Both SVG and Three.js use the same new choreography; no video playback is required. Watch the [full motion showcase](../previews/technology/showcase.mp4) or inspect its [action timeline](../previews/technology/showcase-index.json). A [pose overview](../previews/technology/contact-sheet.png) and [pack manifest](../previews/technology/manifest.json) provide the fourteen new SVG posters and source reference ranges.

## From reference to Geeky

The supplied `Clippy.mp4` is a 3:17 reference montage. The ranges below identify the movement ideas used for this pack, including their anticipation, main action and recovery. Repeated idle/emotion material and the atom/magnifier sequences already covered by Geeky’s existing repertoire were not added as duplicate actions. Source footage and its audio are not runtime assets. Separate, cropped reference clips and a timestamp index are delivered alongside this chat; the website contains Geeky’s new vector performances.

| Action | Reference range | Adaptation and suggested context |
|---|---|---|
| `tech-portal` · Browser portal | 00:06–00:12 | A frame transformation becomes a browser workspace: Geeky folds in, peeks through and springs out. Open a coding sandbox. |
| `tech-blueprint` · Project blueprint | 00:12–00:17.8 | Folded paper becomes an unfolding circuit plan. Plan a GuateGeeks maker project and check a milestone. |
| `tech-debug` · Debug & repair | 00:17.8–00:23 | Paper tearing becomes removing a bug and bridging a broken trace. Acknowledge an exercise repair. |
| `tech-reboot` · Gentle reboot | 00:23–00:29 | Ducking out and returning becomes a safe, friendly restart with three boot lights. Restart a sandbox. |
| `tech-connect` · Connect the stack | 00:31–00:41 | Coiling and stretching become a cable that plugs in and lights up. Connect a device or pair with a microcontroller. |
| `tech-network` · Route the network ↻ | 00:52.5–01:00 | The suspended mobile becomes a network of nodes carrying packets. Show background synchronization. |
| `tech-focus` · Focus mode ↻ | 01:10.8–01:19.5 | Headphones become a quiet coding rhythm. Mark a focused practice session; audio remains opt-in. |
| `tech-build` · Build a maker project | 01:24.5–01:35 | Springy stacking becomes assembling project layers. Build a maker prototype or finish a project step. |
| `tech-peek` · Peek at the code | 01:35–01:43.8 | Peeking over a sheet becomes scanning a code editor. Review a learner’s project. |
| `tech-compile` · Compile whirlwind | 01:43.8–01:49 | The paper whirlwind gathers code cards into a working chip. Compile a project. |
| `tech-compress` · Compress the archive | 01:53.5–02:02.2 | Flattening and coiling become squeezing and releasing an archive. Bundle learning materials. |
| `tech-deploy` · Deploy the code | 02:35.3–02:42 | The folded plane carries a code payload into flight. Publish a learner’s project. |
| `gg-certificate` · GuateGeeks certificate | 02:42.5–02:46 | The rolled sheet becomes an earned certificate. Celebrate a completed GuateGeeks lesson. |
| `gg-mentor` · GuateGeeks mentor | 03:06–03:17.03 | Holding and reading a sheet becomes guiding a learner through a lesson card. Explain the next practice steps. |

Ranges describe the source segments, not the shorter runtime durations. `tech-network` and `tech-focus` loop; the other twelve play once and return to the base action. Labels and descriptions are available from `ACTION_LIST` for localized UI.

## Use in a project

```js
import {createGeekyLive} from '../src/live/index.mjs';

const geeky = createGeekyLive(document.querySelector('#geeky'));
await geeky.play('tech-blueprint');
await geeky.play('tech-debug');
geeky.play('tech-network');       // stays active until another action plays
await geeky.play('gg-certificate');
```

These are expressive UI states, not operations: playing `tech-deploy` does not deploy code, and `gg-certificate` does not issue a credential. Trigger them after your application confirms the relevant result.

System reduced motion is respected. Every action includes a representative still with its essential prop; particles and choreography cues are suppressed. Give long-running loops a pause control. The mobile playground retains vertical scrolling over the docked character and touch-friendly controls.

## Editing and validation

New choreography lives in `src/live/learning-actions.mjs` and `src/live/technology-actions.mjs`. Shared, renderer-neutral props are in `src/live/technology-props.mjs`. `src/live/actions.mjs` appends their registrations after all original definitions. Neither renderer nor the original motion sources need replacement.

Run:

```sh
node tests/player.test.mjs
node tests/live.test.mjs
node tests/technology.test.mjs
python3 tools/build-pages.py
python3 tests/pages.test.py
```

The preservation fixture was captured before this pack was registered. It checks metadata and aliases, 354 deterministic sampled performances (including props, particles and lifecycle events), and all 36 original reduced-motion poses. Pack checks cover finite geometry, completion/interruption, deterministic motion, meaningful reduced-motion props and mixing with the existing actions. SVG and Three.js browser rendering are checked separately; these checks do not claim physical-device testing.
