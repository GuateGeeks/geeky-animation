/* GEEKY LIVE / brain.
   A renderer-agnostic animation core. Every frame it layers:
   life (breathing, drift) → mood → action choreography → transition blend →
   secondary physics (lag, swing, jiggle) → gaze (saccades, pursuit) → blinks.
   The output pose is consumed unchanged by the SVG and Three.js renderers. */
import {TAU, DEG, clamp, lerp, Ease, Dyn, Jiggle, rng, noise, reachArm, BASE, REST, MAXR, PUPIL_R} from './core.mjs';
import {ACTIONS, resolveAction} from './actions.mjs';

export const EXPRESSIONS = {
  neutral: {},
  happy: {brow: {y: .35, rot: -2, arch: .6}, lid: {bot: .3, bc: .9}, size: 1.05},
  joy: {brow: {y: 1.1, rot: -4, arch: .85}, lid: {top: .42, bot: .58, bc: 1.8, tc: 0}, size: 1},
  surprised: {brow: {y: 2.3, rot: -5, arch: .95}, lid: {top: 0, bot: 0}, size: .76},
  curious: {brow: [{y: .2}, {y: 1.8, arch: .85}], lid: [{top: .12}, {top: 0}], size: 1.1},
  worried: {brow: {y: .7, rot: -17, arch: .25}, lid: {top: .2, tilt: -12}, size: 1},
  sad: {brow: {y: -.1, rot: -21, arch: .15}, lid: {top: .34, tilt: -14, bot: .1}, size: 1.14},
  angry: {brow: {y: -1.2, rot: 19, arch: .05}, lid: {top: .3, tilt: 15}, size: .88},
  focused: {brow: {y: -.5, rot: 8, arch: .3}, lid: {top: .22, bot: .14}, size: .94},
  sleepy: {brow: {y: -.7, rot: -5, arch: .4}, lid: {top: .6, bot: .12, tilt: -4}, size: 1},
  skeptical: {brow: [{y: -.9, rot: 12}, {y: 1.7, rot: -4, arch: .9}], lid: [{top: .42, bot: .12}, {top: .04}], size: .96},
  love: {brow: {y: 1, rot: -9, arch: .8}, lid: {bot: .22, bc: .9}, size: 1.1, heart: 1, blush: .85},
  dizzy: {brow: [{y: .9, rot: -12}, {y: .2, rot: 10}], spiral: 1},
  smug: {brow: [{y: -.4, rot: 6}, {y: 1.3, rot: -2}], lid: {top: .32, bot: .18, bc: .6}, blush: .2},
  shy: {brow: {y: .5, rot: -12}, lid: {top: .28, bot: .22, bc: .8}, blush: 1, size: 1.08}
};

const side = i => i ? 1 : -1;

export function neutralPose() {
  const lens = i => ({x: BASE[i].x, y: BASE[i].y, z: 0, rot: 0, s: 1, sx: 1, sy: 1, turn: 0, tilt: 0, spin: 0});
  const two = f => [f(0), f(1)];
  return {
    body: {x: 0, y: 0, z: 0, rot: 0, sx: 1, sy: 1, turn: 0, tilt: 0},
    lens: two(lens),
    eye: two(i => ({detach: 0, x: BASE[i].x, y: BASE[i].y, z: 0, s: 1})),
    pupil: two(i => ({x: REST[i].x, y: REST[i].y, size: 1, heart: 0, spiral: 0, spin: 0})),
    lid: two(() => ({top: 0, bot: 0, tilt: 0, tc: .5, bc: .15})),
    brow: two(() => ({y: 0, rot: 0, arch: .45, o: 1})),
    arm: two(() => ({ext: 0, ang: 0, bend: 35, fwd: 0, w: 1, fold: 0, at: 0, pin: 0})),
    bridge: {sag: 0, coil: 0, o: 1},
    blush: 0, noBlink: 0, follow: 1, shadow: 1, steady: 0,
    look: {x: 0, y: 0, z: 40, w: 0},
    pov: two(() => ({x: 0, y: 0, w: 0})),
    props: []
  };
}

/** b ← lerp(a, b, w) for every numeric channel; props cross-fade by opacity. */
export function blendPose(b, a, w) {
  const walk = (B, A) => {
    for (const k in B) {
      if (k === 'props') continue;
      const vb = B[k];
      if (typeof vb === 'number') B[k] = A[k] + (vb - A[k]) * w;
      else if (vb && typeof vb === 'object' && A[k]) walk(vb, A[k]);
    }
  };
  walk(b, a);
  const keep = new Set(b.props.map(q => q.key));
  b.props.forEach(q => { if (!a.props.some(o => o.key === q.key)) q.o *= w; });
  a.props.forEach(q => { if (!keep.has(q.key)) b.props.push({...q, o: q.o * (1 - w)}); });
  return b;
}

export function applyExpression(p, name, w) {
  const e = EXPRESSIONS[name];
  if (!e || w <= 0) return;
  for (let i = 0; i < 2; i++) {
    const br = Array.isArray(e.brow) ? e.brow[i] : e.brow, ld = Array.isArray(e.lid) ? e.lid[i] : e.lid;
    if (br) for (const k in br) p.brow[i][k] = lerp(p.brow[i][k], br[k], w);
    if (ld) for (const k in ld) p.lid[i][k] = lerp(p.lid[i][k], ld[k], w);
    for (const k of ['size', 'heart', 'spiral']) if (e[k] !== undefined) p.pupil[i][k] = lerp(p.pupil[i][k], e[k], w);
  }
  if (e.blush !== undefined) p.blush = lerp(p.blush, e.blush, w);
}

/**
 * How much a brow is actually saying something: 0 at rest, 1 once it is raised, knitted or arched.
 * In 'auto' mode brows only appear while an action or mood uses them.
 */
export function browNeed(b) {
  const e = Math.max(Math.abs(b.y) / .9, Math.abs(b.rot) / 10, Math.abs(b.arch - .45) / .5);
  return Ease.sine((e - .4) / .25);
}

export class GeekyBrain {
  constructor({seed, autonomous = true, reduced = false, brows = 'auto'} = {}) {
    this.brows = brows;
    this.rnd = rng(seed ?? (Math.random() * 2 ** 31) >>> 0);
    this.autonomous = autonomous; this.reduced = reduced; this.speed = 1;
    this.time = 0; this.base = 'idle';
    this.listeners = new Map(); this.particles = []; this.signals = {}; this.counts = {};
    this.moodW = {neutral: 1}; this.mood = 'neutral';
    this.target = null; this.targetT = -99; this.hover = false; this.att = 0; this.attDyn = new Dyn(1.1, 1, 0, 0);
    this.head = {turn: new Dyn(1.4, .5), tilt: new Dyn(1.4, .6), rot: new Dyn(1.1, .6), x: new Dyn(1.1, .7)};
    this.pd = [0, 1].map(i => [new Dyn(6.5, .85, 0, REST[i].x), new Dyn(6.5, .85, 0, REST[i].y)]);
    this.sacc = {x: 0, y: 0, t: 0, next: 1.2};
    this.blinkState = {t: -1, next: 1.6, dbl: false};
    this.phys = {
      swing: new Jiggle(55, 5), squash: new Jiggle(260, 11), brow: new Jiggle(170, 8),
      lens: [0, 1].map(i => ({x: new Jiggle(150 - i * 30, 7), y: new Jiggle(150 - i * 30, 7), r: new Jiggle(120, 6)})),
      poke: [new Jiggle(320, 9), new Jiggle(320, 9)]
    };
    this.drag = {active: false, vx: 0, vy: 0, pvx: 0, pvy: 0, ax: 0, ay: 0};
    this.spin = {yaw: 0, pitch: 0, vy: 0, vp: 0, active: false};
    this.motion = {px: 0, py: 0, vx: 0, vy: 0, ax: 0, ay: 0, init: false};
    this.idleClock = 0; this.nextFidget = 9;
    this.from = null; this.last = null;
    this.act = this._make('idle', {});
  }

  /* ---------- public API ---------- */

  on(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); return () => this.listeners.get(type)?.delete(fn); }
  emit(type, data) { this.listeners.get(type)?.forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

  /** Play an action. Resolves {id, completed} when it ends or is interrupted. */
  play(id, {loop, params, blend = .24, then, restart = false} = {}) {
    const def = resolveAction(id);
    const cur = this.act;
    if (!restart && cur.id === def.id && cur.loop && (loop ?? def.loop) && !params) return cur.promise;
    cur.resolve?.({id: cur.id, completed: false}); cur.resolve = null;
    if (blend > 0 && !this.reduced && this.last) {
      // Continue the outgoing action live during the cross-fade; freeze it if a fade is already running.
      this.from = this.from ? {pose: this.last, k: 0, dur: blend} : {act: cur, k: 0, dur: blend};
    } else this.from = null;
    const a = this._make(def.id, {loop, params, then});
    this.act = a; this.idleClock = 0;
    this.emit('start', {id: a.id, loop: a.loop});
    return a.promise;
  }

  /** Return to the base loop (idle unless changed). */
  stop() { return this.play(this.base); }
  setBase(id) { this.base = resolveAction(id).id; return this; }
  setMood(name = 'neutral') { if (!EXPRESSIONS[name]) throw new RangeError(`Unknown Geeky mood: ${name}`); this.mood = name; if (!(name in this.moodW)) this.moodW[name] = 0; return this; }
  /** Look at a point in stage space (character units). z is the distance toward the viewer. */
  lookAt(x, y, z = 45) { if (x === null || x === undefined) { this.target = null; return this; } this.target = {x, y, z}; this.targetT = this.time; return this; }
  setHover(v) { this.hover = !!v; if (v) this.targetT = this.time; return this; }
  notify(signal) { this.signals[signal] = this.time; this.counts[signal] = (this.counts[signal] || 0) + 1; return this; }
  blinkNow() { const b = this.blinkState; if (b.t < 0) { b.t = 0; b.dbl = false; } return this; }

  /** Physical poke at a stage-space point: the nearest lens squishes, brows jump, that eye blinks. */
  poke(x = 0, y = 0, strength = 1) {
    const p = this.last || neutralPose();
    const d = [0, 1].map(i => Math.hypot(x - (p.body.x + p.lens[i].x), y - (p.body.y + p.lens[i].y)));
    const i = d[0] < d[1] ? 0 : 1;
    this.phys.poke[i].kick(-34 * strength); this.phys.squash.kick(26 * strength); this.phys.brow.kick(14 * strength);
    this.phys.lens[i].x.kick((p.body.x + p.lens[i].x - x) * 4 * strength); this.phys.lens[i].y.kick((p.body.y + p.lens[i].y - y) * 4 * strength);
    this.blinkNow(); this.emit('poke', {lens: i, x, y});
    return i;
  }
  /** Being carried: velocity in character units per second. */
  setDrag(active, vx = 0, vy = 0) { const D = this.drag; D.active = active; D.vx = vx; D.vy = vy; return this; }
  /** Landing after a drop: impact squash proportional to speed. */
  impact(speed = 1) { this.phys.squash.kick(-40 * clamp(speed, .2, 2)); this.phys.brow.kick(-16 * speed); return this; }
  /** Rotate by hand (3-D stage or 2-D card flip). Deltas in degrees. */
  spinBy(dyaw, dpitch, dt = 1 / 60) {
    const s = this.spin; s.active = true; s.yaw += dyaw; s.pitch = clamp(s.pitch + dpitch, -55, 55);
    s.vy = clamp(lerp(s.vy, dyaw / Math.max(dt, 1e-3), .5), -1440, 1440); s.vp = clamp(lerp(s.vp, dpitch / Math.max(dt, 1e-3), .5), -720, 720); return this;
  }
  releaseSpin() { this.spin.active = false; return this; }

  getState() { return {action: this.act.id, time: this.act.T, loop: this.act.loop, mood: this.mood, base: this.base, particles: this.particles.length}; }

  /* ---------- frame update ---------- */

  update(dt) {
    dt = clamp(dt, 0, .1) * this.speed;
    this.time += dt;
    const a = this.act; a.T += dt;
    let p;
    if (this.reduced) {
      p = this._evaluate(a, true, a.def.still);
      this._gaze(p, 0, true); this._finalize(p); this.particles.length = 0; this.from = null;
    } else {
      p = this._evaluate(a, false);
      if (this.from) {
        const f = this.from; f.k += dt / f.dur;
        let q = f.pose;
        if (f.act) { f.act.T += dt; q = this._evaluate(f.act, true); }
        blendPose(p, q, Ease.inOut(f.k));
        if (f.k >= 1) this.from = null;
      }
      this._attention(dt);
      this._physics(p, dt);
      this._gaze(p, dt, false);
      this._blink(p, dt);
      this._finalize(p);
      this._particles(dt);
      this._autonomy(dt);
    }
    this.last = p;
    this._checkEnd();
    return p;
  }

  /** Output particles in stage space, ready to draw. */
  fx() {
    return this.particles.map(q => {
      const k = q.age / q.life, pop = q.pop ? Ease.back(q.age / .18) : 1;
      const o = q.o * clamp(q.age / .08) * (1 - Ease.sine((k - .55) / .45));
      const rot = q.kind === 'speed' ? Math.atan2(q.vy, q.vx) / DEG : q.rot;
      return {kind: q.kind, x: q.x, y: q.y, z: q.z, rot, s: q.size * pop * (1 + q.grow * q.age), o, color: q.color, layer: q.layer};
    });
  }

  /* ---------- internals ---------- */

  _make(id, {loop, params, then}) {
    const def = ACTIONS[id];
    const a = {id, def, T: 0, prevT: -1e-6, loop: loop ?? def.loop, params: {...def.params, ...params}, then, ended: false, resolve: null};
    a.promise = new Promise(res => { a.resolve = res; });
    return a;
  }

  _evaluate(a, quiet, fixedT) {
    const p = neutralPose(), def = a.def, dur = def.dur;
    const T = fixedT ?? a.T, t = fixedT ?? (a.loop ? T % dur : Math.min(T, dur));
    if (!this.reduced) this._life(p);
    this._applyMood(p);
    def.run(this._ctx(a, p, t, T, quiet || fixedT !== undefined));
    // Decided before secondary physics, so bounces never flash the brows in.
    if (this.brows === 'auto') for (const b of p.brow) b.o *= browNeed(b);
    else if (this.brows === 'never') for (const b of p.brow) b.o = 0;
    if (fixedT === undefined) a.prevT = T;
    return p;
  }

  _ctx(a, p, t, T, quiet) {
    const brain = this, dur = a.def.dur, prevT = a.prevT;
    const crossed = abs => prevT < abs && T >= abs;
    return {
      p, t, T, dur, u: t / dur, loop: a.loop, params: a.params, rnd: this.rnd, brain, att: this.att, time: this.time,
      w: a.loop ? Ease.inOut(T / .35) : Math.min(Ease.sine(T / .3), 1 - Ease.sine((T - dur + .4) / .4)),
      expr: (name, k = 1) => applyExpression(p, name, clamp(k)),
      look: (x, y, k = 1, z = 40) => { if (k <= 0) return; const L = p.look; L.x = x; L.y = y; L.z = z; L.w = Math.max(L.w, clamp(k)); },
      pupil: (i, x, y, k = 1) => { if (k <= 0) return; const o = p.pov[i]; o.x = x; o.y = y; o.w = clamp(k); },
      pupils(x, y, k = 1) { this.pupil(0, x, y, k); this.pupil(1, x, y, k); },
      noBlink: (k = 1) => { p.noBlink = Math.max(p.noBlink, clamp(k)); },
      blink: () => { if (!quiet) brain.blinkNow(); },
      at: time => {
        if (quiet) return false;
        if (!a.loop) return crossed(time);
        for (let k = Math.floor(prevT / dur); k <= Math.floor(T / dur); k++) if (crossed(k * dur + time)) return true;
        return false;
      },
      every: (period, phase = 0) => !quiet && T >= phase && Math.floor((T - phase) / period) > Math.floor((prevT - phase) / period),
      since: s => brain.time - (brain.signals[s] ?? -1e9),
      count: s => brain.counts[s] || 0,
      fx: (kind, o) => { if (!quiet) brain._spawn(kind, o, p.body); },
      cue: name => { if (!quiet) brain.emit('cue', {name, action: a.id}); },
      reach: (i, x, y, k = 1, fwd = 0) => {
        if (k <= 0) return;
        const A = p.arm[i], r = reachArm(p.lens[i], i, x, y, fwd, A);
        A.ang = lerp(A.ang, r.ang, k); A.ext = lerp(A.ext, r.ext, k); A.fwd = lerp(A.fwd, fwd, k);
      },
      prop: o => { p.props.push({o: 1, layer: 'front', ...o}); }
    };
  }

  _life(p) {
    const t = this.time, br = Math.sin(TAU * t / 4.2);
    p.body.sy *= 1 + .014 * br; p.body.sx *= 1 - .007 * br; p.body.y -= .16 * br;
    p.body.rot += .8 * noise(t * .35, 1);
    p.bridge.sag += .12 * br;
    for (let i = 0; i < 2; i++) {
      p.lens[i].x += .12 * noise(t * .5, 3 + i); p.lens[i].y += .12 * noise(t * .5, 7 + i); p.lens[i].rot += .6 * noise(t * .4, 11 + i);
      p.brow[i].y += .08 * noise(t * .7, 13 + i);
    }
  }

  _applyMood(p) {
    for (const k in this.moodW) {
      const target = k === this.mood ? 1 : 0;
      this.moodW[k] = this.reduced ? target : lerp(this.moodW[k], target, .08);
      if (k !== 'neutral' && this.moodW[k] > .002) applyExpression(p, k, this.moodW[k] * .7);
    }
  }

  _attention(dt) {
    const fresh = this.hover || this.time - this.targetT < 2.8;
    this.att = clamp(this.attDyn.update(dt, this.target && fresh ? 1 : 0));
  }

  _physics(p, dt) {
    const B = p.body, D = this.drag, M = this.motion, P = this.phys;
    // Body motion produced by the choreography (finite differences, lightly smoothed).
    if (!M.init) { M.px = B.x; M.py = B.y; M.init = true; }
    const vx = (B.x - M.px) / Math.max(dt, 1e-3), vy = (B.y - M.py) / Math.max(dt, 1e-3);
    const ax = clamp((vx - M.vx) / Math.max(dt, 1e-3), -900, 900), ay = clamp((vy - M.vy) / Math.max(dt, 1e-3), -900, 900);
    M.ax = lerp(M.ax, ax, .35); M.ay = lerp(M.ay, ay, .35); M.vx = vx; M.vy = vy; M.px = B.x; M.py = B.y;
    // Being carried: acceleration swings the frames like a pendulum; speed stretches them.
    D.ax = lerp(D.ax, (D.vx - D.pvx) / Math.max(dt, 1e-3), .3); D.ay = lerp(D.ay, (D.vy - D.pvy) / Math.max(dt, 1e-3), .3); D.pvx = D.vx; D.pvy = D.vy;
    if (!D.active) { D.vx *= Math.exp(-10 * dt); D.vy *= Math.exp(-10 * dt); }
    const axAll = M.ax + D.ax, ayAll = M.ay + D.ay;
    B.rot += clamp(P.swing.update(dt, clamp(-D.ax * .06, -260, 260)), -40, 40) + clamp(-D.vx * .025, -16, 16);
    const speed = Math.hypot(D.vx, D.vy), st = clamp(speed / 900, 0, .16);
    if (st > .002) {
      const c = Math.abs(D.vx) / (speed || 1), s = Math.abs(D.vy) / (speed || 1);
      B.sx *= 1 + st * c - st * .5 * s; B.sy *= 1 + st * s - st * .5 * c;
      applyExpression(p, 'surprised', clamp(speed / 500) * .8);
      p.look.x = D.vx; p.look.y = D.vy; p.look.z = 120; p.look.w = Math.max(p.look.w, clamp(speed / 300));
    } else if (D.active) applyExpression(p, 'happy', .6);
    // Impact squash, poke squish.
    const sq = clamp(P.squash.update(dt), -3, 3); B.sy *= 1 + sq * .05; B.sx *= 1 - sq * .035;
    for (let i = 0; i < 2; i++) {
      const L = p.lens[i], J = P.lens[i], k = clamp(P.poke[i].update(dt), -3, 3);
      L.s *= 1 + k * .06; L.sy *= 1 - k * .02;
      // Lenses lag behind body acceleration (overlapping action).
      // `steady` holds a lens still (a magnifier handle, riding an orbit) instead of letting it lag.
      const loose = 1 - clamp(p.steady);
      L.x += clamp(J.x.update(dt, -axAll * .55), -2.4, 2.4) * loose; L.y += clamp(J.y.update(dt, -ayAll * .55), -2.4, 2.4) * loose;
      L.rot += clamp(J.r.update(dt, -axAll * side(i) * .2), -14, 14) * loose;
    }
    const bl = clamp(P.brow.update(dt, -ayAll * .3), -2, 2); p.brow.forEach(b => { b.y += bl; });
    // Hand spin with inertia, settling on the nearest full turn.
    const S = this.spin;
    if (!S.active) {
      if (Math.abs(S.vy) > 260) { S.vy *= Math.exp(-2.2 * dt); S.yaw += S.vy * dt; }
      else { const goal = Math.round(S.yaw / 360) * 360; S.vy += (-38 * (S.yaw - goal) - 7 * S.vy) * dt; S.yaw += S.vy * dt; }
      S.vp += (-46 * S.pitch - 8 * S.vp) * dt; S.pitch += S.vp * dt;
      if (Math.abs(((S.yaw % 360) + 540) % 360 - 180) < .05 && Math.abs(S.vy) < .05) { S.yaw = 0; S.vy = 0; }
    }
    B.turn += S.yaw; B.tilt += S.pitch;
  }

  _towards(p, i, tx, ty, tz) {
    const L = p.lens[i], E = p.eye[i], d = clamp(E.detach);
    const ex = lerp(L.x, E.x, d), ey = lerp(L.y, E.y, d);
    let dx = tx - ex, dy = ty - ey; const m = Math.hypot(dx, dy, tz) || 1, g = MAXR * 1.3 / m;
    dx *= g; dy *= g;
    const r = -L.rot * (1 - d) * DEG; [dx, dy] = [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)];
    const n = Math.hypot(dx, dy); if (n > MAXR) { dx *= MAXR / n; dy *= MAXR / n; }
    return {x: dx, y: dy};
  }

  _gaze(p, dt, still) {
    const B = p.body;
    let tgt = null;
    if (this.target && !still) {
      const r = -B.rot * DEG; let x = this.target.x - B.x, y = this.target.y - B.y;
      [x, y] = [x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)];
      tgt = {x: x / (B.sx || 1), y: y / (B.sy || 1), z: this.target.z};
    }
    if (!still) {
      // The head follows the eyes, a little later and a little less.
      const f = this.att * p.follow * (1 - .7 * clamp(p.steady)), hx = tgt ? clamp(tgt.x / 40, -1, 1) * f : 0, hy = tgt ? clamp(tgt.y / 40, -1, 1) * f : 0;
      B.turn += this.head.turn.update(dt, hx * 16); B.tilt += this.head.tilt.update(dt, -hy * 9);
      B.rot += this.head.rot.update(dt, hx * 2.5); B.x += this.head.x.update(dt, hx * .9);
      this._saccade(dt);
    }
    for (let i = 0; i < 2; i++) {
      let nx = REST[i].x + (still ? 0 : this.sacc.x), ny = REST[i].y + (still ? 0 : this.sacc.y);
      if (tgt && this.att > 0) { const v = this._towards(p, i, tgt.x, tgt.y, tgt.z); nx = lerp(nx, v.x, this.att); ny = lerp(ny, v.y, this.att); }
      if (p.look.w > 0) { const v = this._towards(p, i, p.look.x, p.look.y, p.look.z); nx = lerp(nx, v.x, p.look.w); ny = lerp(ny, v.y, p.look.w); }
      const o = p.pov[i]; if (o.w > 0) { nx = lerp(nx, o.x, o.w); ny = lerp(ny, o.y, o.w); }
      let x = still ? nx : this.pd[i][0].update(dt, nx), y = still ? ny : this.pd[i][1].update(dt, ny);
      if (still) { this.pd[i][0].reset(nx); this.pd[i][1].reset(ny); }
      const lim = MAXR + (1 - p.pupil[i].size) * PUPIL_R * .9, m = Math.hypot(x, y);
      if (m > lim) { x *= lim / m; y *= lim / m; }
      p.pupil[i].x = x; p.pupil[i].y = y;
    }
  }

  _saccade(dt) {
    const s = this.sacc; s.t += dt;
    if (s.t < s.next) return;
    s.t = 0; s.next = this.rnd.range(.6, 2.6);
    const home = this.rnd() < .3, big = this.rnd() < .28, a = this.rnd() * TAU, r = home ? 0 : big ? this.rnd.range(1.8, 3.4) : this.rnd.range(.3, 1.2);
    const nx = Math.cos(a) * r, ny = Math.sin(a) * r * .7;
    if (Math.hypot(nx - s.x, ny - s.y) > 2.2 && this.rnd() < .4) this.blinkNow();
    s.x = nx; s.y = ny;
  }

  _blink(p, dt) {
    const b = this.blinkState, D = .17;
    if (b.t < 0 && this.time >= b.next && p.noBlink < .5) { b.t = 0; b.dbl = this.rnd() < .18; }
    if (b.t < 0) return;
    b.t += dt;
    const curve = x => x < 0 || x > D ? 0 : x < .065 ? Ease.out(x / .065) : 1 - Ease.inOut((x - .065) / (D - .065));
    const v = i => { const x = b.t - i * .018; return Math.max(curve(x), b.dbl ? curve(x - D - .07) : 0); };
    for (let i = 0; i < 2; i++) {
      const k = v(i) * (1 - p.noBlink), L = p.lid[i], g = Math.max(0, 1 - L.top - L.bot);
      if (k > 0) { L.top += g * k * .66; L.bot += g * k * .34; }
    }
    if (b.t > (b.dbl ? 2 * D + .12 : D + .04)) { b.t = -1; b.next = this.time + this.rnd.range(1.8, 5.2); }
  }

  _finalize(p) {
    p.eyeT = [0, 1].map(i => {
      const L = p.lens[i], E = p.eye[i], d = clamp(E.detach);
      return {x: lerp(L.x, E.x, d), y: lerp(L.y, E.y, d), z: lerp(L.z, E.z, d), rot: L.rot * (1 - d), s: lerp(L.s, E.s, d),
        sx: lerp(L.sx, 1, d), sy: lerp(L.sy, 1, d), turn: L.turn * (1 - d), tilt: L.tilt * (1 - d), spin: 0, outline: d};
    });
    for (const L of p.lid) {
      L.top = clamp(L.top); L.bot = clamp(L.bot);
      const s = L.top + L.bot; if (s > 1) { L.top /= s; L.bot /= s; }
    }
    for (const b of p.brow) b.o = clamp(b.o);
    p.blush = clamp(p.blush); p.bridge.coil = clamp(p.bridge.coil); p.bridge.o = clamp(p.bridge.o);
    for (const q of p.pupil) { q.heart = clamp(q.heart); q.spiral = clamp(q.spiral); }
    for (const A of p.arm) { A.ext = clamp(A.ext, 0, 1.8); A.fwd = clamp(A.fwd); A.fold = clamp(A.fold); A.pin = clamp(A.pin); }
    p.props = p.props.filter(q => q.o > .003);
  }

  _spawn(kind, o = {}, B = {x: 0, y: 0, rot: 0, sx: 1, sy: 1}) {
    const r = this.rnd, n = o.n ?? 1, br = B.rot * DEG;
    for (let k = 0; k < n; k++) {
      const ang = o.radial ? (k / n) * TAU + r() * .4 : (o.dir ?? -90) * DEG + (r() - .5) * (o.spreadAng ?? 0) * DEG;
      const sp = (o.speed ?? 0) * (1 + (r() - .5) * .4);
      let x = (o.x ?? 0) + (r() - .5) * (o.spread ?? 0) * 2, y = (o.y ?? 0) + (r() - .5) * (o.spread ?? 0) * 2;
      x *= B.sx; y *= B.sy; [x, y] = [B.x + x * Math.cos(br) - y * Math.sin(br), B.y + x * Math.sin(br) + y * Math.cos(br)];
      this.particles.push({
        kind, x, y, z: o.z ?? 0, vx: (o.vx ?? 0) + Math.cos(ang) * sp, vy: (o.vy ?? 0) + Math.sin(ang) * sp,
        g: o.gravity ?? 0, drag: o.drag ?? 1.2, age: 0, life: (o.life ?? 1) * (1 + (r() - .5) * .25),
        size: (o.size ?? 1) * (1 + (r() - .5) * .3), rot: o.rot ?? (o.spin ? r() * 360 : 0), vr: o.spin ? (r() - .5) * o.spin * 2 : 0,
        color: o.colors ? r.pick(o.colors) : o.color, wave: o.wave ?? 0, phase: r() * TAU, grow: o.grow ?? 0,
        layer: o.layer || 'front', o: o.opacity ?? 1, pop: o.pop ?? true
      });
    }
    if (this.particles.length > 160) this.particles.splice(0, this.particles.length - 160);
  }

  _particles(dt) {
    const list = this.particles;
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i]; q.age += dt;
      if (q.age >= q.life) { list.splice(i, 1); continue; }
      const k = Math.exp(-q.drag * dt); q.vx *= k; q.vy *= k; q.vy += q.g * dt;
      q.x += q.vx * dt + q.wave * Math.cos(q.age * 4 + q.phase) * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
    }
  }

  _autonomy(dt) {
    if (!this.autonomous || this.act.id !== 'idle' || this.base !== 'idle' || this.from) { this.idleClock = 0; return; }
    this.idleClock += dt; this.idleTotal = (this.idleTotal || 0) + dt;
    if (this.idleClock < this.nextFidget) return;
    this.idleClock = 0; this.nextFidget = this.rnd.range(9, 18);
    const pool = [['look-around', 3], ['adjust', 2], ['polish', 1.4], ['shrug', .4], ['yawn', this.idleTotal > 45 ? 1.2 : 0]];
    let pick = this.rnd() * pool.reduce((s, x) => s + x[1], 0);
    const id = pool.find(([, w]) => (pick -= w) < 0)?.[0] || 'look-around';
    this.play(id); this.emit('fidget', {id});
  }

  _checkEnd() {
    const a = this.act;
    if (a.loop || a.ended || a.T < a.def.dur) return;
    a.ended = true;
    const res = a.resolve; a.resolve = null;
    this.emit('end', {id: a.id});
    if (!a.def.hold) {
      const next = a.then || this.base;
      this.play(next, {blend: .35, restart: true});
    }
    res?.({id: a.id, completed: true});
  }
}

export {ACTIONS};
