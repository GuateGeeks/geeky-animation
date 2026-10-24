/* GEEKY LIVE / action library.
   Each action writes onto a neutral pose with keyframe tracks and windows.
   Times are seconds. Principles in play: anticipation before big moves,
   overshoot and settle after them, overlapping action between lenses, brows
   and temples, and squash & stretch on every contact. One-shots start and
   end at rest so they blend cleanly; loops ramp in with `T` (unwrapped time). */
import {TAU, DEG, clamp, lerp, Ease, gate, kf, wobble, wrapDeg, armGeometry, lensPoint, rimRadius, RIM_R, GROUND, EYEBALL, CONFETTI} from './core.mjs';

import {registerLearningActions} from './learning-actions.mjs';
import {registerTechnologyActions} from './technology-actions.mjs';

export const ACTIONS = {};
export const GROUPS = {classic: 'Classic nine', assistant: 'Assistant', emotion: 'Feelings', fidget: 'Idle fidgets', transform: 'Transformations', technology: 'Technology lab · New', guategeeks: 'GuateGeeks learning · New'};
export const ALIASES = Object.freeze({
  'flutter-right': 'running-right', 'flutter-left': 'running-left', hello: 'waving', delight: 'jumping', oops: 'failed',
  orbit: 'running', 'closer-look': 'review', knock: 'get-attention', bike: 'bicycle', binoculars: 'searching',
  search: 'searching', think: 'thinking', write: 'writing', yes: 'nod', no: 'shake', bye: 'goodbye', hi: 'greet'
});

export function resolveAction(id) {
  const key = ALIASES[id] || id;
  if (!Object.hasOwn(ACTIONS, key)) throw new RangeError(`Unknown Geeky action: ${id}`);
  return ACTIONS[key];
}

const def = (id, o) => { ACTIONS[id] = {id, loop: false, hold: false, group: 'assistant', params: {}, desc: '', ...o, still: o.still ?? o.dur * .4}; };

/** A temple raised in a wave between t0 and t1, with a lagging hooked tip. */
function wave(c, i, t0, t1, k = 1) {
  const {p, t} = c, A = p.arm[i];
  const up = Ease.back((t - t0) / .38) * (1 - Ease.inOut((t - (t1 - .4)) / .4));
  const ph = TAU * 2.3 * (t - t0 - .25), on = gate(t, t0 + .2, t0 + .45, t1 - .55, t1 - .3);
  A.ext = Math.max(A.ext, up * k); A.ang = 66 + 30 * Math.sin(ph) * on; A.bend = 34 + 30 * Math.sin(ph - 1.1) * on;
  return {up: clamp(up, 0, 1.2), on, s: Math.sin(ph)};
}

/* ---------- The classic nine, re-choreographed ---------- */

def('idle', {label: 'Curious', group: 'classic', dur: 6, loop: true, still: 1.5, desc: 'Breathing, glancing and blinking: alive at rest.', run(c) {
  const {p, t, w} = c, ph = TAU * t / 6;
  p.body.rot += 1.3 * Math.sin(ph) * w;
  p.lens[0].y += .24 * Math.sin(2 * ph + .4) * w; p.lens[1].y += .24 * Math.sin(2 * ph + 2.1) * w;
  p.lens[0].rot -= 1.1 * Math.sin(ph + 1) * w; p.lens[1].rot += 1.2 * Math.sin(ph + .2) * w;
  const hm = gate(t, 3.1, 3.35, 3.95, 4.4) * w;
  p.brow[1].y += 1.1 * hm; p.brow[1].arch += .25 * hm; p.body.rot -= 2.2 * hm; p.lens[1].rot += 2 * hm;
}});

for (const [id, dir, label] of [['running-right', 1, 'Flutter right'], ['running-left', -1, 'Flutter left']]) {
  def(id, {label, group: 'classic', dur: 2, loop: true, still: 1, desc: 'Leans into the direction and glides there: no flapping, no wobble.', run(c) {
    // A small wind-up against the direction, then one smooth lean into a steady glide.
    const {p, T} = c, ant = gate(T, 0, .14, .14, .34), go = Ease.back(clamp((T - .2) / .5)), g = clamp(go);
    const rear = dir > 0 ? p.lens[0] : p.lens[1];
    p.body.x += -dir * 1.4 * ant + dir * 2.2 * go;
    p.body.y += .9 * ant - 1.6 * go;
    p.body.sx *= 1 + .05 * ant + .05 * g; p.body.sy *= 1 - .07 * ant - .03 * g;
    p.body.rot += -dir * 3 * ant + dir * 11 * go;
    p.body.turn += dir * 26 * go;
    rear.x -= dir * 1.3 * go; rear.y += .5 * go;
    for (const L of p.lens) L.turn += dir * 10 * go;
    for (const L of p.lid) { L.top += .14 * g; L.bot += .08 * g; }
    c.look(dir * 60, -2, g, 40); c.expr('happy', .3 * g);
    if (g > .5 && c.every(.08)) c.fx('speed', {x: -dir * c.rnd.range(17, 24), y: c.rnd.range(-10, 9), vx: -dir * 85, life: .32, size: c.rnd.range(.7, 1.1), color: 'lavender', layer: 'back', opacity: .75, pop: false});
    if (g > .5 && c.every(.3, .1)) c.fx('puff', {x: -dir * 16, y: c.rnd.range(-3, 5), vx: -dir * 25, size: .6, grow: 1.4, life: .45, drag: 2.5, opacity: .5, layer: 'back'});
    if (c.at(.2)) c.cue('whoosh');
  }});
}

def('waving', {label: 'Hello', group: 'classic', dur: 3.2, still: 1.2, desc: 'A cheerful wave, a lifted lens and a wink.', run(c) {
  const {p, t} = c, ant = gate(t, 0, .16, .16, .4), wv = wave(c, 1, .3, 2.75), R = p.lens[1];
  p.body.y += .9 * ant - 1.1 * wv.up; p.body.sy *= 1 - .07 * ant + .03 * wv.up; p.body.sx *= 1 + .05 * ant;
  R.y -= 3 * wv.up; R.x -= .5 * wv.up; R.rot += (7 + 5 * wv.s * wv.on) * wv.up;
  p.lens[0].rot -= 3 * wv.up; p.body.rot -= (2 + 1.4 * wv.s * wv.on) * wv.up;
  const joy = gate(t, .2, .45, 2.75, 3.15); c.expr('happy', joy); c.look(0, -2, joy, 60);
  const wk = gate(t, 1.7, 1.84, 2.06, 2.28);
  p.lid[0].top += .62 * wk; p.lid[0].bot += .38 * wk; p.lid[0].bc = lerp(p.lid[0].bc, 1.2, wk);
  p.brow[0].y -= .7 * wk; p.brow[1].y += .7 * wk; p.blush += .35 * wk; c.noBlink(gate(t, 1.5, 1.6, 2.3, 2.4));
  if (c.at(.62)) { c.cue('hello'); c.fx('sparkle', {x: 25, y: -15, n: 3, radial: true, speed: 7, drag: 2, life: .8, size: .5, color: 'yellow'}); }
}});

def('jumping', {label: 'Delight', group: 'classic', dur: 2.6, still: .95, params: {dir: 1}, desc: 'Squash, launch, a full flip and a bouncy landing.', run(c) {
  const {p, t} = c, dir = c.params.dir ?? 1;
  p.body.y += kf(t, [[0, 0], [.34, 2.5, 'sine'], [.46, 2.3], [.9, -13, 'out'], [1.0, -13.2, 'linear'], [1.4, 0, 'in'], [1.48, 1.7, 'out'], [1.68, 0], [1.84, -1.6, 'out'], [2.0, 0, 'in'], [2.1, .35, 'out'], [2.3, 0]]);
  const sq = kf(t, [[0, 0], [.34, 1, 'sine'], [.44, 1], [.52, -.9, 'out'], [.75, 0], [1.25, 0], [1.4, -.5, 'in'], [1.48, 1.1, 'out'], [1.62, -.3], [1.78, 0], [2.0, .3], [2.12, 0]]);
  p.body.sy *= 1 - .2 * sq; p.body.sx *= 1 + .15 * sq;
  p.body.rot += wrapDeg(dir * 360 * Ease.inOut((t - .52) / .78));
  const arms = gate(t, .62, .8, 1.12, 1.32);
  for (const A of p.arm) { A.ext = .85 * arms; A.ang = 38 + 8 * Math.sin(t * 20); A.bend = 55; }
  c.expr('focused', .8 * gate(t, 0, .2, .36, .5)); c.expr('joy', gate(t, .48, .62, 2.15, 2.55));
  if (c.at(.46)) c.cue('jump');
  if (c.at(.95)) c.fx('sparkle', {x: 0, y: -2, n: 9, radial: true, speed: 22, drag: 3, life: .8, size: .55, colors: ['yellow', 'lavender', 'pink']});
  if (c.at(1.42)) { c.cue('land'); for (const s of [-1, 1]) c.fx('puff', {x: s * 9, y: 13.5, n: 3, vx: s * 14, vy: -3, spread: 1.5, life: .6, size: 1.5, grow: 1.2, drag: 3}); }
}});

def('failed', {label: 'Oops', group: 'classic', dur: 3.6, still: 1.1, desc: 'A startle, crooked glasses, a sweat drop, then a brave recovery.', run(c) {
  const {p, t} = c, L = p.lens[0], R = p.lens[1];
  const st = gate(t, 0, .08, .14, .34), droop = gate(t, .3, .75, 1.95, 2.6), fix = gate(t, 2.55, 2.75, 3.05, 3.4);
  const shake = t > 1.9 && t < 2.8 ? wobble(t - 1.9, 4.2, 3.2) : 0, push = gate(t, 2.82, 2.9, 2.96, 3.2);
  p.body.y += -1.6 * st + 1.4 * droop - 1.1 * push;
  p.body.rot += -4 * droop + 7 * shake;
  L.y += 1.4 * droop; R.y += 3.8 * droop; L.rot -= 9 * droop; R.rot += 14 * droop; R.x -= .8 * droop;
  L.sy *= 1 - .08 * droop; R.sy *= 1 - .08 * droop;
  const sigh = kf(t, [[1.1, 0], [1.35, 1, 'sine'], [1.7, -.6, 'sine'], [1.95, 0]]);
  p.body.sy *= 1 - .05 * sigh; p.body.sx *= 1 + .03 * sigh;
  c.expr('surprised', st); c.expr('worried', droop * (1 - fix * .6)); c.expr('happy', .45 * gate(t, 2.9, 3.1, 3.35, 3.6));
  c.pupils(-1.2, 3, droop * (1 - gate(t, 1.9, 2, 2.6, 2.7)));
  c.reach(1, 1.5, -4.2 + 1.2 * push, fix, .4); p.arm[1].bend = 25;
  if (c.at(.1)) c.cue('oops');
  if (c.at(.62)) c.fx('drop', {x: 22, y: -12, vy: 2, gravity: 16, life: 1.1, size: .7, drag: .5, color: 'sky'});
  if (c.at(2.9)) { c.cue('click'); c.fx('sparkle', {x: 0, y: -5, life: .45, size: .45}); }
}});

def('waiting', {label: 'Waiting', group: 'classic', dur: 8, loop: true, still: 3, desc: 'Toe-tapping, a glance at the watch, an eye roll and a tiny doze.', run(c) {
  const {p, t, w} = c;
  p.body.rot += 3 * Math.sin(TAU * t / 4) * w; p.body.y += .3 * Math.sin(TAU * t / 2) * w;
  const tap = gate(t, .1, .4, 2.3, 2.6) * w, A = p.arm[0];
  A.ext = .55 * tap; A.ang = -62; A.bend = 40 + 30 * Math.max(0, Math.sin(TAU * 3 * t));
  if (tap > .5 && c.every(1 / 3, .1)) c.fx('puff', {x: -19, y: 13, size: .5, life: .35, grow: 1.5, opacity: .6});
  const watch = gate(t, 2.6, 2.85, 3.55, 3.8) * w;
  c.reach(1, 7, 10, watch, .45); c.look(7, 10, watch, 16); p.brow[1].y += .9 * watch;
  const roll = gate(t, 3.75, 3.85, 4.55, 4.7) * w, ra = Math.PI * (1 + Ease.inOut((t - 3.8) / .75));
  c.pupils(Math.cos(ra) * 3.8, Math.sin(ra) * 3.2 - .4, roll);
  p.body.sy *= 1 - .04 * gate(t, 3.8, 4, 4.2, 4.5);
  const doze = gate(t, 4.7, 6.2, 6.55, 6.65, Ease.inOut) * w, jolt = gate(t, 6.55, 6.62, 6.75, 7.1) * w;
  p.lid[0].top += .7 * doze; p.lid[1].top += .66 * doze; p.lid[0].bot += .2 * doze; p.lid[1].bot += .22 * doze;
  p.body.rot += 5 * doze; p.body.y += 1.3 * doze - 1.6 * jolt; c.noBlink(doze);
  c.expr('surprised', jolt); c.expr('sleepy', .35 * w * (1 - jolt) * (1 - doze));
  if (c.at(5.7)) c.fx('zee', {x: 14, y: -14, vx: 3, vy: -5, life: 1.4, size: .45, wave: 2, drag: .3});
  if (c.at(6.58)) c.cue('startle');
}});

def('running', {label: 'Orbit', group: 'classic', dur: 3, loop: true, still: 1, desc: 'Geeky becomes an atom: slim orbits round a glowing nucleus, the lenses riding in front.', run(c) {
  const {p, t, T} = c, pre = gate(T, 0, .12, .12, .3), m = Ease.back(clamp((T - .15) / .65)), mc = clamp(m);
  p.body.sy *= 1 - .1 * pre; p.body.sx *= 1 + .08 * pre; p.body.y -= m;
  const R = 12.6, tilt = 68, prec = TAU * t / 3, rots = [-56 + 4 * Math.sin(prec), 56 + 4 * Math.sin(prec + 2), 4 * Math.sin(prec + 4)];
  rots.forEach((rot, k) => c.prop({t: 'ring', key: 'orbit' + k, x: 0, y: 0, r: R * (k === 2 ? 1.12 : 1) * (.35 + .65 * mc), rot, tilt, w: .5, o: mc, layer: 'back'}));
  c.prop({t: 'glyph', key: 'nucleus', kind: 'dot', x: 0, y: 0, s: 2.1 * (1 + .14 * Math.sin(TAU * t * 2)) * mc, color: 'lavender', o: clamp(m * 2), layer: 'back'});
  for (let i = 0; i < 2; i++) {
    // Each lens, frame and all, rides its own orbit and stays in front of the rings.
    const L = p.lens[i], a = TAU * t / 1.5 + i * Math.PI, rr = rots[i] * DEG;
    const ex = R * Math.cos(a), ey = R * Math.sin(a) * Math.cos(tilt * DEG);
    L.x = lerp(L.x, ex * Math.cos(rr) - ey * Math.sin(rr), m); L.y = lerp(L.y, ex * Math.sin(rr) + ey * Math.cos(rr), m);
    L.s = lerp(1, .46 * (1 + .1 * Math.sin(a)), m); L.rot *= 1 - mc; L.z = (4 + 2 * Math.sin(a)) * mc;
    p.brow[i].o = 1 - clamp(m * 1.5);
  }
  p.bridge.o = 1 - clamp(m * 1.5); p.steady = mc;
  c.look(0, 0, mc, 70);
  if (m > .6 && c.every(.045)) for (const L of p.lens) c.fx('dot', {x: L.x, y: L.y, size: .38, life: .4, color: 'lavender', opacity: .5, pop: false, layer: 'back'});
  if (c.at(.1)) c.cue('whoosh');
}});

/** Points on a lens glass in body space, with 3-D depth on the eyeball's surface. */
function glassArc(L, a0, a1, r = 6.5, n = 8) {
  const z = L.z + (EYEBALL.z + Math.sqrt(EYEBALL.r ** 2 - r * r)) * L.s + .35;
  return Array.from({length: n + 1}, (_, k) => { const a = lerp(a0, a1, k / n) * DEG; return {...lensPoint(L, r * Math.cos(a), r * Math.sin(a)), z}; });
}

def('review', {label: 'Closer look', group: 'classic', dur: 4, loop: true, still: 1.5, desc: 'One lens becomes a magnifying glass, handle and all, for some careful reading.', run(c) {
  const {p, t, T} = c, m = Ease.back(clamp(T / .6)), mc = clamp(m), L = p.lens[0], R = p.lens[1], found = gate(t, 3.0, 3.1, 3.3, 3.6);
  const line = t < 2 ? 0 : 1, lt = (t % 2) / 2, step = lt / .8 * 5;
  const sx = lt < .8 ? -3.3 + 6.6 * (Math.floor(step) / 5 + Ease.out(step % 1) / 5) : lerp(3.3, -3.3, Ease.inOut((lt - .8) / .2));
  L.x = lerp(L.x, -19.5, m); L.y = lerp(L.y, 2.4, m); L.s = lerp(1, .56, m);
  R.x = lerp(R.x, 6.4, m); R.y = lerp(R.y, -4.2, m); R.s = lerp(1, 1.42, m) + .08 * found; R.z = 6 * m; R.rot *= 1 - mc;
  p.bridge.coil = m;
  // The right temple becomes the handle: pinned to the rim, pointing straight out from the lens centre.
  const H = 52, A = p.arm[1];
  A.pin = mc; A.at = H; A.ang = -H; A.ext = .95 * m; A.bend = 0; A.fwd = 0; A.w = lerp(1, 2.7, mc);
  const rr = rimRadius(1, H * DEG), cu = Math.cos(H * DEG), sv = Math.sin(H * DEG);
  const c0 = lensPoint(R, (rr + .3) * cu, (rr + .3) * sv), c1 = lensPoint(R, (rr + 2.8) * cu, (rr + 2.8) * sv);
  c.prop({t: 'line', key: 'collar', pts: [{...c0, z: R.z}, {...c1, z: R.z}], w: 1.4 * A.w * R.s, color: 'frame', o: mc});
  c.prop({t: 'line', key: 'glint', pts: glassArc(R, 200, 248), w: .55 * R.s, color: 'white', o: .85 * mc});
  p.shadow = 1 - .5 * mc;
  // Hold the glass steady: no lens lag, almost no head-follow, no idle sway on the long handle.
  p.steady = mc; p.follow = 1 - .85 * mc; p.body.rot = lerp(p.body.rot, 0, mc);
  p.brow[1].y += 1.6 * m + .8 * found; p.brow[0].y -= .5 * m; p.brow[0].rot += 10 * m; p.lid[0].top += .32 * m;
  c.pupil(1, sx, line ? 1.4 : -1.2, m * (1 - found)); c.pupil(0, 3.2, -.8, m);
  p.pupil[1].size = lerp(p.pupil[1].size, 1.3, mc);
  if (c.at(1.62) || c.at(3.62)) c.blink();
  p.body.x -= m; p.body.y -= .4 * m;
  if (c.at(.8)) c.fx('sparkle', {x: R.x - 7.5, y: R.y - 8.5, size: .55, life: .6});
  if (c.at(3.05)) { c.cue('spot'); c.fx('bang', {x: R.x + 10, y: R.y - 15, size: .55, life: .9, vy: -3}); }
}});

/* ---------- Assistant behaviours (Clippy's repertoire, Geeky's way) ---------- */

def('greet', {label: 'Greet', dur: 2.4, still: 1.4, desc: 'Pops into view with a flip and a wave.', run(c) {
  const {p, t} = c, pop = Ease.elastic(clamp((t - .02) / .8)), R = p.lens[1];
  p.body.sx *= pop; p.body.sy *= pop; p.body.turn += 180 * (1 - Ease.out(t / .55)); p.body.y += 6 * (1 - Ease.out(t / .45));
  const wv = wave(c, 1, .75, 2.2); R.y -= 2.4 * wv.up; R.rot += (6 + 4 * wv.s * wv.on) * wv.up;
  c.expr('happy', gate(t, .2, .4, 2, 2.4)); c.look(0, -2, gate(t, .3, .5, 2, 2.3), 60);
  if (c.at(.1)) { c.cue('pop'); c.fx('sparkle', {n: 10, radial: true, speed: 26, drag: 3.5, life: .7, size: .5, colors: ['yellow', 'lavender', 'mint']}); }
}});

def('goodbye', {label: 'Goodbye', dur: 1.9, hold: true, still: .5, desc: 'Waves, spins up and vanishes in a puff.', run(c) {
  const {p, t} = c, wave1 = wave(c, 1, 0, .95), crouch = gate(t, .85, 1.0, 1.0, 1.12), go = Ease.in((t - 1.05) / .75);
  p.lens[1].y -= 2 * wave1.up;
  p.body.y += .9 * crouch - 11 * go; p.body.sy *= 1 - .12 * crouch + .18 * go * (1 - go); p.body.sx *= 1 + .08 * crouch;
  const k = 1 - Ease.inOut((t - 1.15) / .65); p.body.sx *= k; p.body.sy *= k; p.body.turn += 540 * go;
  c.expr('happy', gate(t, 0, .2, 1, 1.3));
  if (c.at(1.0)) c.cue('whoosh');
  if (c.at(1.72)) c.fx('puff', {y: -10, n: 7, radial: true, speed: 12, drag: 3, life: .6, size: 1.4, grow: 1});
}});

def('get-attention', {label: 'Knock knock', dur: 2.6, still: 1, desc: 'Leans in close and taps on the glass of your screen.', run(c) {
  const {p, t} = c, near = gate(t, 0, .45, 1.75, 2.25, Ease.inOut), A = p.arm[1], taps = [.72, 1.0, 1.28];
  const s = 1 + .12 * near; p.body.sx *= s; p.body.sy *= s; p.body.z += 20 * near; p.body.y -= 1.2 * near; p.body.tilt -= 4 * near;
  const tap = taps.reduce((v, x) => v + gate(t, x - .12, x - .02, x, x + .1), 0);
  A.ext = .85 * gate(t, .35, .55, 1.55, 1.8); A.ang = 12 - 14 * tap; A.fwd = .55 + .4 * tap; A.bend = 50;
  c.expr('surprised', .5 * near); c.expr('happy', .5 * near); c.look(0, 0, near, 90);
  for (const q of p.pupil) q.size = lerp(q.size, 1.15, near);
  p.body.x += .35 * tap;
  for (const x of taps) if (c.at(x)) { const g = armGeometry(p.lens[1], A, 1); c.cue('tap'); c.fx('ring', {x: g.E.x, y: g.E.y, size: 1, grow: 9, life: .55, color: 'lavender', pop: false}); }
  p.body.y -= 1.2 * gate(t, 2.0, 2.15, 2.2, 2.45);
}});

def('thinking', {label: 'Thinking', dur: 4, loop: true, still: 1.6, desc: 'Eyes up, a chin tap and thought bubbles rising.', run(c) {
  const {p, t, T} = c, m = Ease.inOut(T / .5);
  p.body.rot -= 4 * m + 1.2 * Math.sin(TAU * t / 4) * m; p.body.y -= .5 * m;
  c.pupils(2.6, -3.4, m); p.brow[1].y += 1.6 * m; p.brow[1].arch += .3 * m; p.brow[0].y -= .3 * m; p.brow[0].rot += 6 * m;
  p.lid[0].top += .12 * m; p.lid[1].bot += .12 * m;
  const tap = Math.max(0, Math.sin(TAU * 2 * t)); c.reach(1, 13.6, 11.4 + .7 * tap, m, .2); p.arm[1].bend = 125 + 20 * tap;
  const hm = gate(t, 2.2, 2.4, 2.8, 3.0); p.lid[1].top += .25 * hm; p.brow[1].y -= .6 * hm;
  [[0, .4], [1, .75], [2, 1.1]].forEach(([k, x]) => { if (c.at(x)) c.fx('dot', {x: 15 + k * 3.5, y: -13 - k * 4.5, size: .55 + k * .35, life: 1.6 - k * .2, vy: -1.5, drag: .2, color: 'mist'}); });
  if (c.at(1.5)) c.cue('think');
}});

def('searching', {label: 'Searching', dur: 5, loop: true, still: 1.2, desc: 'The frames snap into binoculars: sweep, focus, spot, double-take.', run(c) {
  const {p, t, T} = c, m = Ease.back(clamp(T / .55)), mc = clamp(m), L = p.lens[0], R = p.lens[1];
  const scan = kf(t, [[0, -1], [.5, -1], [1.9, 1], [3.3, 1], [4.6, -1], [5, -1]]);
  const focus = gate(t, 1.95, 2.05, 2.35, 2.5), spot = gate(t, 2.05, 2.15, 2.5, 2.75), take = gate(t, 2.8, 2.92, 3.02, 3.25);
  const s = .8 + .05 * spot, gap = 8.4;
  L.x = lerp(L.x, -gap, m); L.y = lerp(L.y, 0, m); R.x = lerp(R.x, gap, m); R.y = lerp(R.y, 0, m);
  L.s = R.s = lerp(1, s, m); L.rot *= 1 - mc; R.rot *= 1 - mc;
  p.bridge.o = 1 - mc;
  p.body.turn += 26 * scan * mc; p.body.rot += 2 * scan * mc; p.body.y -= (1 + 1.4 * take) * m;
  c.pupils(2.8 * scan, -.3, mc); for (const q of p.pupil) q.size = lerp(q.size, 1.4 + .25 * spot, mc);
  for (const b of p.brow) b.y += 1.9 * spot * mc;
  c.expr('surprised', .7 * take);
  // Binocular body, back to front. The farther barrel is drawn first.
  const len = 11 * mc * (1 - .55 * take), wz = -len * .45, wy = -RIM_R * s * .62;
  for (const k of (p.body.turn >= 0 ? [1, 0] : [0, 1])) {
    const Ln = p.lens[k], sd = k ? 1 : -1, r = RIM_R * Ln.s * 1.03, back = {x: Ln.x + sd * .4, y: Ln.y - .5, z: -.4 - len};
    c.prop({t: 'cyl', key: 'cup' + k, a: back, b: {x: back.x, y: back.y - .2, z: back.z - 3 * mc}, r1: r * .6, r2: r * .64, color: 'frame', o: mc, layer: 'back'});
    c.prop({t: 'cyl', key: 'barrel' + k, a: {x: Ln.x, y: Ln.y, z: -.4}, b: back, r1: r, r2: r * .8, color: 'barrel', o: mc, layer: 'back'});
  }
  c.prop({t: 'cyl', key: 'hinge', a: {x: -2.6, y: -.8, z: wz}, b: {x: 2.6, y: -.8, z: wz}, r1: 2.1, r2: 2.1, color: 'frame', o: mc, layer: 'back'});
  c.prop({t: 'cyl', key: 'wheel', a: {x: -1.9, y: wy, z: wz}, b: {x: 1.9, y: wy, z: wz}, r1: 2.3, r2: 2.3, color: 'lavender', o: mc, layer: 'back'});
  const turnPhase = t * .2 + focus * .9;
  for (let k = 0; k < 6; k++) {
    const a = ((k / 6 + turnPhase) % 1) * TAU, ry = wy - 2.35 * Math.sin(a), rz = wz + 2.35 * Math.cos(a);
    c.prop({t: 'line', key: 'ridge' + k, depth: true, pts: [{x: -1.5, y: ry, z: rz}, {x: 1.5, y: ry, z: rz}], w: .4, color: 'frame', o: mc * clamp(Math.cos(a) * 3)});
  }
  // Glass glints slide across the lenses as they sweep.
  [L, R].forEach((Ln, k) => { const a0 = 212 - 34 * scan; c.prop({t: 'line', key: 'glint' + k, pts: glassArc(Ln, a0, a0 + 40, 6.4), w: .5, color: 'white', o: .8 * mc}); });
  if (c.at(2.08)) { c.cue('spot'); c.fx('bang', {x: 14, y: -17, size: .5, life: .8, vy: -3}); c.fx('sparkle', {x: R.x - 3.5, y: R.y - 4.5, size: .5, life: .5}); }
  if (c.at(2.85)) c.cue('surprise');
}});

def('writing', {label: 'Writing', dur: 3, loop: true, still: 1.5, desc: 'Scribbles notes on a little pad, Clippy style.', run(c) {
  const {p, t, T} = c, m = Ease.out(T / .45), mc = clamp(m), pad = {x: 9, y: 15.2}, u = t / 3;
  const spot = (row, lu) => ({x: pad.x - 5 + 10 * lu, y: pad.y - 2.4 + row * 2.3 + .55 * Math.sin(lu * TAU * 7)});
  const row = Math.min(2, Math.floor(u * 3)), lu = u * 3 - row, tip = spot(row, lu);
  c.prop({t: 'glyph', key: 'pad', kind: 'paper', x: pad.x, y: pad.y, s: .85 * m, o: mc});
  for (let r = 0; r <= row; r++) {
    const end = r < row ? 1 : lu, n = Math.max(2, Math.ceil(end * 28)), pts = [];
    for (let k = 0; k <= n; k++) pts.push(spot(r, end * k / n));
    if (end > .01) c.prop({t: 'line', key: 'ink' + r, pts, w: .32, color: 'frame', o: mc});
  }
  const pr = 28 * DEG, ps = .55;
  c.prop({t: 'glyph', key: 'pencil', kind: 'pencil', x: tip.x + Math.sin(pr) * 5.1 * ps, y: tip.y - Math.cos(pr) * 5.1 * ps, rot: 28, s: ps * mc, o: mc});
  c.reach(1, tip.x + 2.2, tip.y - 3.6, m, .3); p.arm[1].bend = 70;
  c.look(tip.x, tip.y, m, 22); for (const L of p.lid) { L.top += .2 * m; L.bot += .12 * m; }
  p.body.rot += 2 * m; p.body.y += .3 * Math.sin(TAU * t * 3) * m + .5 * Math.max(0, wobble(c.since('key'), 3, 6));
  if (c.every(.5)) c.cue('scribble');
}});

def('reading', {label: 'Reading along', dur: 4, loop: true, still: 1, desc: 'Follows your typing word by word and nods along.', run(c) {
  const {p, T} = c, m = Ease.out(T / .4), keys = c.count('key'), line = c.count('enter') % 3;
  const idle = clamp((c.since('key') - 1.2) / .8), col = (keys % 26) / 26;
  c.pupils(-3.3 + 6.6 * col, -1.4 + 1.4 * line, m * (1 - idle)); c.look(0, 0, m * idle, 60);
  p.body.tilt -= 6 * m; p.body.y += .4 * m;
  p.body.y += .45 * Math.max(0, wobble(c.since('key'), 3.2, 7)); p.body.rot += .6 * wobble(c.since('key'), 2.5, 6);
  const enter = Math.max(0, wobble(c.since('enter'), 2, 5)); for (const b of p.brow) b.y += 1.2 * enter;
  c.expr('focused', .35 * m); c.expr('happy', .25 * m);
}});

def('idea', {label: 'Idea!', dur: 2.4, still: .9, desc: 'A light bulb pops on: eureka.', run(c) {
  const {p, t} = c, ant = gate(t, .05, .2, .2, .32), pop = Ease.back(clamp((t - .3) / .3)) * (1 - Ease.in((t - 1.9) / .4));
  p.body.y += .8 * ant - 1.4 * gate(t, .3, .42, .6, .9); p.body.sy *= 1 - .06 * ant + .05 * gate(t, .3, .4, .5, .7);
  c.expr('surprised', gate(t, .28, .36, .6, .9)); c.expr('happy', gate(t, .6, .9, 2, 2.4)); c.look(0, -24, gate(t, .3, .45, 1.5, 1.9), 20);
  for (const q of p.pupil) q.size = lerp(q.size, 1.2, clamp(pop));
  const by = -22 - 1.2 * pop, glow = .5 + .5 * Math.sin(TAU * 3 * t), pc = clamp(pop);
  c.prop({t: 'glyph', key: 'bulb', kind: 'bulb', x: 0, y: by, s: .85 * pop, o: clamp(pop * 2)});
  for (let k = 0; k < 5; k++) {
    const a = (-90 + (k - 2) * 34) * DEG, r1 = 7.6 * pc, r2 = (9.6 + glow) * pc;
    c.prop({t: 'line', key: 'ray' + k, pts: [{x: Math.cos(a) * r1, y: by - 1 + Math.sin(a) * r1}, {x: Math.cos(a) * r2, y: by - 1 + Math.sin(a) * r2}], w: .65, color: 'yellow', o: pc * (.6 + .4 * glow)});
  }
  const A = p.arm[1]; A.ext = .8 * gate(t, .3, .5, 1.6, 2); A.ang = 80; A.bend = -25;
  if (c.at(.32)) { c.cue('ding'); c.fx('sparkle', {y: by, n: 6, radial: true, speed: 16, drag: 3, life: .6, size: .45}); }
}});

def('point', {label: 'Point', dur: 2.2, still: 1, params: {angle: 20}, desc: 'Points a temple at something worth seeing.', run(c) {
  const {p, t, T} = c, ang = c.params.angle, right = Math.cos(ang * DEG) >= 0, i = right ? 1 : 0;
  const k = c.loop ? Ease.back(clamp(T / .4)) : Ease.back(clamp(t / .4)) * (1 - Ease.inOut((t - 1.75) / .4));
  const nudge = c.loop ? .5 + .5 * Math.sin(TAU * T / 1.4) : gate(t, .55, .65, .75, .9);
  const A = p.arm[i]; A.ext = (.95 + .12 * nudge) * k; A.ang = right ? ang : 180 - ang; A.bend = 10;
  const dx = Math.cos(ang * DEG), dy = -Math.sin(ang * DEG);
  p.body.rot += dx * 5 * k; p.body.x += dx * 1.2 * k; p.body.y += dy * .8 * k; p.body.turn += dx * 14 * k;
  c.look(dx * 60, dy * 60, k, 30); c.expr('happy', .6 * clamp(k));
}});

def('listen', {label: 'Listening', dur: 3, loop: true, still: 1, desc: 'Leans in, all ears (well, all eyes).', run(c) {
  const {p, t, T} = c, m = Ease.out(T / .4), nod = gate(t, 1.6, 1.75, 1.85, 2.05);
  p.body.tilt -= 8 * m + 6 * nod; p.body.y += .3 * m + .5 * nod; p.body.sx *= 1 + .03 * m; p.body.sy *= 1 + .03 * m;
  c.expr('curious', .8 * m); c.look(0, 0, m, 60); for (const q of p.pupil) q.size = lerp(q.size, 1.15, clamp(m));
}});

/* ---------- Feelings ---------- */

def('celebrate', {label: 'Celebrate', group: 'emotion', dur: 2.6, still: .8, desc: 'Confetti, a spin and both temples up.', run(c) {
  const {p, t} = c;
  p.body.y += kf(t, [[0, 0], [.25, 1.8, 'sine'], [.62, -7.5, 'out'], [.95, 0, 'in'], [1.03, 1, 'out'], [1.2, 0], [1.5, -3, 'out'], [1.8, 0, 'in'], [1.9, .5], [2.1, 0]]);
  const sq = kf(t, [[0, 0], [.25, 1], [.36, -.8], [.6, 0], [.9, -.3], [1.0, .9], [1.12, 0], [1.75, -.2], [1.84, .6], [2, 0]]);
  p.body.sy *= 1 - .18 * sq; p.body.sx *= 1 + .13 * sq;
  p.body.turn += wrapDeg(360 * Ease.inOut((t - .3) / .65));
  const up = gate(t, .3, .5, 2.0, 2.4);
  p.arm.forEach((A, i) => { A.ext = .95 * up; A.ang = 72 + 12 * Math.sin(TAU * 3 * t + i * Math.PI); A.bend = 40 + 25 * Math.sin(TAU * 3 * t + i); });
  c.expr('joy', gate(t, .25, .4, 2.1, 2.5)); p.blush += .3 * up;
  if (c.at(.5)) { c.cue('celebrate'); c.fx('confetti', {y: -8, n: 30, dir: -90, spreadAng: 150, speed: 46, gravity: 38, drag: 1.4, life: 1.8, size: .75, spin: 540, colors: CONFETTI}); }
  if (c.at(1.5)) c.fx('sparkle', {y: -6, n: 6, radial: true, speed: 18, drag: 3, life: .6, size: .45, colors: ['yellow', 'pink']});
}});

def('love', {label: 'Love', group: 'emotion', dur: 3.2, still: 1, desc: 'Heart eyes, a happy heartbeat and floating hearts.', run(c) {
  const {p, t} = c, w = gate(t, 0, .35, 2.7, 3.2);
  const beat = x => Math.max(gate(t, x, x + .06, x + .08, x + .2), .7 * gate(t, x + .24, x + .3, x + .32, x + .46));
  const b = beat(.4) + beat(1.3) + beat(2.2);
  c.expr('love', w);
  for (const L of p.lens) L.s *= 1 + .1 * b;
  p.lens[0].rot += 8 * w; p.lens[1].rot -= 8 * w; p.lens[0].x += w; p.lens[1].x -= w;
  p.body.rot += 3 * Math.sin(TAU * t / 1.6) * w; p.body.y -= .6 * w + .4 * b;
  for (const x of [.5, 1.0, 1.5, 2.0, 2.4]) if (c.at(x)) c.fx('heart', {x: c.rnd.range(-6, 6), y: -12, vy: -9, vx: c.rnd.range(-3, 3), drag: .4, wave: 3, life: 1.5, size: c.rnd.range(.45, .75), color: 'pink'});
  if (c.at(.4)) c.cue('love');
}});

def('dizzy', {label: 'Dizzy', group: 'emotion', dur: 3.2, still: 1.2, desc: 'Spiral eyes, wobbly frames and circling stars.', run(c) {
  const {p, t} = c, w = gate(t, 0, .3, 2.5, 3.1), ph = TAU * 1.3 * t;
  c.expr('dizzy', w); for (const q of p.pupil) q.spin = t * 540;
  p.body.rot += 9 * Math.sin(ph) * w; p.body.x += 1.6 * Math.sin(ph) * w; p.body.y += 1.1 * Math.cos(ph) * w;
  p.lens[0].y += .9 * Math.sin(ph * 1.7) * w; p.lens[1].y += .9 * Math.sin(ph * 1.7 + Math.PI) * w;
  p.lens[0].rot += 6 * Math.sin(ph * 1.3) * w; p.lens[1].rot -= 6 * Math.sin(ph * 1.3 + 1) * w;
  p.brow[0].rot += 8 * Math.sin(ph * 2) * w; p.brow[1].rot -= 8 * Math.sin(ph * 2 + 1) * w;
  for (let k = 0; k < 3; k++) {
    const a = TAU * (t * .9 + k / 3);
    c.prop({t: 'glyph', key: 'star' + k, kind: 'star', x: 12 * Math.cos(a), y: -17 + 2.8 * Math.sin(a), z: 6 * Math.sin(a), s: (.42 + .08 * Math.sin(a)) * w, rot: t * 200, o: w});
  }
  p.body.turn += 18 * (t > 2.45 ? wobble(t - 2.45, 5, 4) : 0);
  if (c.at(.05)) c.cue('dizzy');
}});

def('sleep', {label: 'Sleep', group: 'emotion', dur: 4, loop: true, still: 2, desc: 'Eyes shut, slow breaths and drifting Zzz.', run(c) {
  const {p, t, T} = c, m = Ease.inOut(T / 1.2), br = Math.sin(TAU * t / 4);
  for (const L of p.lid) { L.top = lerp(L.top, .6, m); L.bot = lerp(L.bot, .42, m); L.bc = lerp(L.bc, -.7, m); }
  c.noBlink(m);
  p.body.y += 1.6 * m + .5 * br * m; p.body.rot += 5 * m; p.body.sy *= 1 + .035 * br * m; p.body.sx *= 1 - .02 * br * m;
  p.lens[0].y += .5 * m; p.lens[1].y += 1.1 * m; p.lens[1].rot += 3 * m;
  for (const A of p.arm) A.fold = m;
  p.follow = 1 - m;
  [[.9, .38], [1.5, .52], [2.1, .66]].forEach(([x, s], k) => { if (c.at(x)) c.fx('zee', {x: 15 + k, y: -14 - k, vx: 3.5 + k * .5, vy: -5.5 - k * .5, drag: .3, wave: 2.5, life: 1.9, size: s}); });
}});

def('wake', {label: 'Wake up', group: 'emotion', dur: 1.6, still: .4, desc: 'A startled jolt awake, then a shake-off.', run(c) {
  const {p, t} = c, jolt = kf(t, [[0, 0], [.08, 1, 'out'], [.35, 1], [.8, 0]]);
  p.body.y -= 3 * kf(t, [[0, 0], [.1, 1, 'out'], [.3, .8], [.55, 0, 'in'], [.62, -.2], [.75, 0]]);
  p.body.sy *= 1 + .1 * gate(t, 0, .08, .12, .3) - .1 * gate(t, .55, .6, .62, .75);
  c.expr('surprised', jolt); for (const q of p.pupil) q.size = lerp(q.size, .7, jolt);
  p.body.turn += 16 * (t > .8 ? wobble(t - .8, 3.5, 4) : 0);
  if (c.at(.04)) { c.cue('startle'); c.fx('bang', {x: 14, y: -18, vy: -4, size: .55, life: .8}); }
  if (c.at(.95)) c.blink();
}});

def('surprised', {label: 'Surprised', group: 'emotion', dur: 1.6, still: .35, desc: 'Eyes wide, a hop back and an exclamation.', run(c) {
  const {p, t} = c, k = kf(t, [[0, 0], [.07, 1, 'out'], [.9, 1], [1.5, 0]]), s = lerp(1, .92, k);
  p.body.y -= 2.2 * kf(t, [[0, 0], [.1, 1, 'out'], [.3, .6], [.5, 0, 'in'], [.58, -.15], [.7, 0]]);
  p.body.sx *= s * (1 - .05 * k); p.body.sy *= s * (1 + .05 * k);
  c.expr('surprised', k); for (const q of p.pupil) q.size = lerp(q.size, .72, k); c.look(0, 0, k, 80);
  if (c.at(.05)) { c.cue('surprise'); c.fx('bang', {x: 13, y: -19, vy: -4, size: .6, life: .9}); }
}});

def('confused', {label: 'Confused', group: 'emotion', dur: 2.8, still: .9, desc: 'Head tilts, mismatched brows and a question mark.', run(c) {
  const {p, t} = c, w = gate(t, 0, .3, 2.3, 2.8), tl = kf(t, [[0, 0], [.4, -1], [1.1, -1], [1.5, 1], [2.2, 1], [2.7, 0]]);
  p.body.rot += 8 * tl * w; p.body.x += .8 * tl * w;
  p.brow[0].y += lerp(-.5, 1.6, (1 - tl) / 2) * w; p.brow[1].y += lerp(-.5, 1.6, (1 + tl) / 2) * w;
  p.brow[0].rot += 8 * clamp(tl) * w; p.brow[1].rot += 8 * clamp(-tl) * w;
  c.pupil(0, -2.6, -2.8 * tl, w); c.pupil(1, 2.8, 2.6 * tl, w);
  const sh = gate(t, 1.8, 1.95, 2.2, 2.45);
  p.arm.forEach((A, i) => { p.lens[i].y -= 1.4 * sh; A.ext = .5 * sh; A.ang = -35; A.bend = -30; });
  if (c.at(.3)) c.fx('question', {x: 15, y: -17, vy: -2.5, size: .6, life: 1.3, rot: 10, wave: 1.5});
  if (c.at(1.5)) c.fx('question', {x: -15, y: -14, vy: -2.5, size: .45, life: 1, rot: -10, wave: 1.5});
}});

def('sad', {label: 'Sad', group: 'emotion', dur: 3.2, still: 1.4, desc: 'Droopy brows, a tear and a brave sniff.', run(c) {
  const {p, t} = c, w = gate(t, 0, .5, 2.6, 3.2), sniff = gate(t, 2.0, 2.08, 2.14, 2.3);
  c.expr('sad', w); c.pupils(-.8, 2.2, w * .8);
  p.body.y += 1.2 * w - .8 * sniff; p.body.rot += 2 * Math.sin(TAU * t / 3.2) * w; p.body.sy *= (1 - .04 * w) * (1 + .04 * sniff);
  p.lens[0].y += .8 * w; p.lens[1].y += 1.6 * w; p.lens[0].rot -= 4 * w; p.lens[1].rot += 6 * w;
  if (c.at(.9)) c.fx('drop', {x: -15, y: 7, vy: 1, gravity: 14, drag: .4, life: 1.2, size: .5, color: 'sky'});
}});

def('giggle', {label: 'Giggle', group: 'emotion', dur: 1.3, still: .5, desc: 'That tickles! Happy jiggles and a blush.', run(c) {
  const {p, t} = c, w = gate(t, 0, .08, .9, 1.3), sh = Math.sin(TAU * 7.5 * t) * w;
  c.expr('joy', w); p.blush += .6 * w; p.body.rot += 3.5 * sh; p.body.y -= .6 * Math.abs(sh) + .4 * w;
  p.lens[0].y += .5 * sh; p.lens[1].y -= .5 * sh; p.body.sy *= 1 + .03 * Math.abs(sh);
  if (c.at(.08)) c.cue('giggle');
}});

def('shrug', {label: 'Shrug', group: 'emotion', dur: 1.7, still: .7, desc: 'Who knows? Lenses up, temples out.', run(c) {
  const {p, t} = c, k = kf(t, [[0, 0], [.12, -.25], [.4, 1, 'back'], [1.15, 1], [1.5, 0]]), kc = clamp(k);
  p.lens.forEach((L, i) => { const A = p.arm[i]; L.y -= 1.6 * k; L.rot += (i ? -5 : 5) * k; A.ext = .62 * kc; A.ang = -30; A.bend = -35; });
  p.body.sy *= 1 - .05 * k; c.expr('skeptical', .5 * kc); c.pupils(-2.2, -2.6, kc); p.brow[0].y += .8 * k; p.brow[1].y += 1.4 * k;
}});

def('nod', {label: 'Yes', group: 'emotion', dur: 1.1, still: .3, desc: 'An eager double nod.', run(c) {
  const {p, t} = c, n = kf(t, [[0, 0], [.15, 1], [.32, -.3], [.48, 1], [.66, -.2], [.85, 0]]);
  p.body.tilt -= 16 * n; p.body.y += 1.1 * n; c.expr('happy', gate(t, 0, .15, .8, 1.1)); c.look(0, 0, gate(t, 0, .1, .9, 1.1), 60);
}});

def('shake', {label: 'No', group: 'emotion', dur: 1.2, still: .3, desc: 'A polite head shake.', run(c) {
  const {p, t} = c, w = gate(t, 0, .08, .85, 1.2), s = Math.sin(TAU * 2.6 * t) * w;
  p.body.turn += 20 * s; p.body.x += .8 * s; c.pupils(-2.4 * s, .4, w * .8); c.expr('worried', .25 * w);
}});

/* ---------- Idle fidgets ---------- */

const lookX = t => kf(t, [[0, 0], [.2, -1], [1.0, -1], [1.25, 1], [2.0, 1], [2.25, 0], [2.4, 0]]);
const lookY = t => kf(t, [[0, 0], [2.2, 0], [2.45, -1], [3.0, -1], [3.3, 0]]);
def('look-around', {label: 'Look around', group: 'fidget', dur: 3.6, still: .8, desc: 'Left, right, up: what was that?', run(c) {
  const {p, t} = c, x = lookX(t), y = lookY(t), w = gate(t, 0, .15, 3.2, 3.6);
  c.pupils(3.8 * x, -3.4 * y + .4 * Math.abs(x), w);
  p.body.turn += 16 * lookX(t - .15) * w; p.body.tilt += 8 * lookY(t - .15) * w;
  p.brow[0].y += .5 * Math.abs(x) * w; p.brow[1].y += (.5 * Math.abs(x) + y) * w;
  if (c.at(1.15)) c.blink();
}});

def('yawn', {label: 'Yawn', group: 'fidget', dur: 3, still: 1, desc: 'A big stretch, squeezed eyes and a sleepy tear.', run(c) {
  const {p, t} = c, st = gate(t, .3, .9, 1.6, 2.2, Ease.inOut);
  p.body.sy *= 1 + .13 * st; p.body.sx *= 1 - .06 * st; p.body.y -= 1.2 * st; p.body.tilt += 10 * st;
  p.arm.forEach((A, i) => { A.ext = .9 * st; A.ang = 78 + 6 * Math.sin(TAU * t * 1.5); A.bend = 50; p.lens[i].x += (i ? 1 : -1) * 1.2 * st; });
  for (const L of p.lid) { L.top = lerp(L.top, .56, st); L.bot = lerp(L.bot, .5, st); L.tc = lerp(L.tc, -.4, st); }
  for (const b of p.brow) { b.y += 1.3 * st; b.rot -= 10 * st; }
  c.noBlink(st); c.expr('sleepy', gate(t, 2, 2.4, 2.7, 3));
  if (c.at(.4)) c.cue('yawn');
  if (c.at(1.7)) c.fx('drop', {x: -20, y: 2, vy: .5, gravity: 10, size: .35, life: 1, color: 'sky'});
}});

def('polish', {label: 'Polish lenses', group: 'fidget', dur: 3.4, still: 1.4, desc: 'Fogs a lens, wipes it in circles, admires the shine.', run(c) {
  const {p, t} = c, L = p.lens[0], w = gate(t, .2, .5, 2.6, 3.0);
  const fog = gate(t, .4, .6, 1.0, 2.3);
  c.prop({t: 'glyph', key: 'fog', kind: 'puff', x: L.x, y: L.y, s: 6.6 * fog, color: 'mist', o: .75 * fog});
  const ang = TAU * 2.2 * (t - .9), rub = gate(t, .9, 1.1, 2.2, 2.4);
  const tx = L.x + 3.2 * Math.cos(ang) * rub, ty = L.y + 2.6 * Math.sin(ang) * rub;
  p.arm[0].pin = w; p.arm[0].at = 140; c.reach(0, tx, ty, w, .55); p.arm[0].bend = 60;
  p.lid[0].top += .62 * rub; p.lid[0].bot += .38 * rub; c.pupil(1, -3.6, 1.5, rub);
  p.body.rot += 1.5 * Math.sin(ang) * rub; L.rot += 4 * Math.sin(ang) * rub;
  if (rub > .5 && c.every(.28, 1)) c.fx('sparkle', {x: tx, y: ty, size: .3, life: .35});
  if (c.at(2.5)) c.fx('sparkle', {x: L.x - 4, y: L.y - 5, size: .7, life: .7, spin: 180});
  c.expr('happy', gate(t, 2.45, 2.55, 2.75, 3.1));
  if (c.at(.45)) c.cue('huff');
}});

def('adjust', {label: 'Push up glasses', group: 'fidget', dur: 1.8, still: .9, desc: 'The classic move: slip, push, click.', run(c) {
  const {p, t} = c, slip = kf(t, [[0, 0], [.6, 1], [.9, 1], [.98, -.5, 'out'], [1.15, 0]]);
  p.body.y += 1.3 * slip; p.body.rot += 1.5 * slip;
  c.reach(1, -.2, -4.6 + 1.2 * slip, gate(t, .45, .75, 1.05, 1.4), .45); p.arm[1].bend = 30;
  c.expr('smug', gate(t, 1, 1.15, 1.5, 1.8)); p.brow[1].y += gate(t, .95, 1.05, 1.3, 1.6);
  if (c.at(.97)) { c.cue('click'); c.fx('sparkle', {x: -.5, y: -5, size: .45, life: .4}); }
}});

/* ---------- Transformations ---------- */

def('bicycle', {label: 'Bicycle', group: 'transform', dur: 2, loop: true, still: .6, params: {dir: 1}, desc: 'Lenses become wheels, the bridge becomes a frame: off we go.', run(c) {
  const {p, t, T} = c, dir = c.params.dir ?? 1, m = Ease.back(clamp(T / .6)), mc = clamp(m), L = p.lens[0], R = p.lens[1];
  const hy = GROUND - RIM_R * .86, bump = Math.abs(Math.sin(TAU * 2 * t)) * .5;
  L.x = lerp(L.x, -11.5, m); L.y = lerp(L.y, hy, m); R.x = lerp(R.x, 11.5, m); R.y = lerp(R.y, hy, m);
  L.s = R.s = lerp(1, .86, m); L.rot *= 1 - mc; R.rot *= 1 - mc;
  const roll = wrapDeg(dir * T * 400) * mc; L.spin = roll; R.spin = roll;
  p.bridge.o = 1 - clamp(m * 1.6);
  p.body.y -= bump * m; p.body.rot -= dir * 1.5 * mc;
  const P = (x, y) => ({x: dir * x, y: hy + y});
  const H1 = P(-11.5, 0), BB = P(-.5, 1), S = P(-4.5, -11), HT = P(7.2, -11.6), H2 = P(11.5, 0), ST = P(6.6, -14.8), HB = P(9.8, -15.2);
  const line = (key, pts, w = 1.1) => c.prop({t: 'line', key, pts, w, color: 'frame', o: mc, layer: 'back'});
  line('bk-rear', [H1, BB, S, H1]); line('bk-top', [S, HT]); line('bk-down', [BB, HT]); line('bk-fork', [HT, H2]);
  line('bk-stem', [HT, ST, HB], 1.2); line('bk-seat', [P(-7.2, -12), P(-2.2, -12)], 1.6);
  const ca = dir * T * 240 * DEG, cx = Math.cos(ca) * 2.6, cy = Math.sin(ca) * 2.6;
  line('bk-crank', [{x: BB.x - cx, y: BB.y - cy}, {x: BB.x + cx, y: BB.y + cy}], .8);
  line('bk-pedal1', [{x: BB.x + cx - 1.2, y: BB.y + cy}, {x: BB.x + cx + 1.2, y: BB.y + cy}], .9);
  line('bk-pedal2', [{x: BB.x - cx - 1.2, y: BB.y - cy}, {x: BB.x - cx + 1.2, y: BB.y - cy}], .9);
  c.look(dir * 40, -2, mc, 40); c.expr('happy', .45 * mc);
  p.follow = 1 - mc;
  if (c.every(.15)) c.fx('speed', {x: -dir * 22, y: c.rnd.range(-12, 8), vx: -dir * 70, life: .3, layer: 'back', opacity: .6, pop: false});
  if (c.every(.22)) c.fx('puff', {x: -dir * 13, y: GROUND - 1.5, vx: -dir * 12, vy: -3, size: .7, grow: 1.2, life: .5, drag: 2, opacity: .7});
  if (c.at(.05)) c.cue('ring');
}});

// Additions are registered after all original performances; no old ID is replaced.
registerLearningActions(def);
registerTechnologyActions(def);

export const ACTION_LIST = Object.values(ACTIONS).map(({id, label, group, loop, dur, desc}) => ({id, label, group, loop, duration: dur, description: desc}));
