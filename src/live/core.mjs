/* GEEKY LIVE / shared core.
   Math, easing, springs, noise, glyph paths and character geometry used by the
   brain and by both renderers (SVG and Three.js). Pure functions, no DOM. */
import {PATHS, C, FRAME} from '../geeky-motion.mjs';

export {PATHS, C, FRAME};
export const TAU = Math.PI * 2, DEG = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
export const lerp = (a, b, t) => a + (b - a) * t;
export const fmt = x => String(Math.abs(x) < 5e-4 ? 0 : Math.round(x * 1000) / 1000);

export const Ease = {
  linear: t => clamp(t),
  sine: t => .5 - .5 * Math.cos(Math.PI * clamp(t)),
  in: t => clamp(t) ** 3,
  out: t => 1 - (1 - clamp(t)) ** 3,
  inOut: t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2; },
  // Overshoot on arrival (follow-through) and pull-back before leaving (anticipation).
  back: t => { t = clamp(t); const c = 1.70158; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  backIn: t => { t = clamp(t); const c = 1.70158; return (c + 1) * t ** 3 - c * t * t; },
  elastic: t => { t = clamp(t); return t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - .75) * TAU / 3) + 1; },
  bounce: t => {
    t = clamp(t); const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
    return n * (t -= 2.625 / d) * t + .984375;
  }
};

/** Smooth window: rises over a→b, holds, falls over c→d. */
export const gate = (t, a, b, c, d, e = Ease.sine) =>
  (b > a ? e((t - a) / (b - a)) : t >= a ? 1 : 0) * (1 - (d > c ? e((t - c) / (d - c)) : t >= c ? 1 : 0));

/** Keyframe track. keys: [[time, value, easeName?], ...]; the ease shapes the segment arriving at that key. */
export function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k[0]) { const p = keys[i - 1]; return lerp(p[1], k[1], Ease[k[2] || 'inOut']((t - p[0]) / (k[0] - p[0]))); }
  }
  return keys[keys.length - 1][1];
}

/** Decaying oscillation started at t=0 — the "boing" after an impact. */
export const wobble = (t, freq = 3, decay = 4) => t < 0 ? 0 : Math.exp(-decay * t) * Math.sin(TAU * freq * t);
/** Wrap degrees into -180..180 so full spins blend back to rest without unwinding. */
export const wrapDeg = a => ((a % 360) + 540) % 360 - 180;

/** Deterministic PRNG (mulberry32) so tests and exports are reproducible. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.pick = list => list[Math.floor(next() * list.length) % list.length];
  return next;
}

/** Smooth 1-D value noise in -1..1. */
export function noise(x, seed = 0) {
  const h = n => { n = Math.imul((n + seed * 1013) ^ 0x5bd1e995, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296 * 2 - 1; };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}

/** Second-order dynamics (frequency f, damping z, response r): springy following with overshoot and anticipation. */
export class Dyn {
  constructor(f = 2, z = .6, r = 0, x0 = 0) { this.set(f, z, r); this.reset(x0); }
  set(f, z, r) { this.k1 = z / (Math.PI * f); this.k2 = 1 / ((TAU * f) ** 2); this.k3 = r * z / (TAU * f); return this; }
  reset(x) { this.xp = x; this.y = x; this.yd = 0; return this; }
  update(dt, x) {
    if (dt <= 0) return this.y;
    const xd = (x - this.xp) / dt; this.xp = x;
    const k2 = Math.max(this.k2, dt * dt / 2 + dt * this.k1 / 2, dt * this.k1);
    this.y += dt * this.yd;
    this.yd += dt * (x + this.k3 * xd - this.y - this.k1 * this.yd) / k2;
    return this.y;
  }
}

/** Damped spring around zero, kicked by impulses (jiggle after pokes and drops). */
export class Jiggle {
  constructor(k = 220, c = 9) { this.k = k; this.c = c; this.x = 0; this.v = 0; }
  kick(v) { this.v += v; return this; }
  update(dt, force = 0) {
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
    for (let i = 0; i < n; i++) { this.v += (force - this.k * this.x - this.c * this.v) * h; this.x += this.v * h; }
    return this.x;
  }
}

/* ---------- Character geometry (character units, SVG orientation: y down) ---------- */

/** Neutral lens centres in character space and their source-path centres. */
export const BASE = [{x: -12.497, y: 2.557}, {x: 12.497, y: -2.557}];
/** Original pupil centres relative to each lens centre: the slight inward glance of the source art. */
export const REST = [{x: 2.452, y: -.696}, {x: -2.607, y: .34}];
export const PUPIL_ORIGIN = [{x: 12.102, y: 14.068}, {x: 32.037, y: 9.99}];
export const EYE_R = 8.95, RIM_R = 9.75, PUPIL_R = 3.12, MAXR = 4.9;
export const ARM = {len: 10, hook: 2.6, hinge: [-173.4, -9.6]};
export const GROUND = 16.2;
/**
 * 3-D eye: a dome whose base circle (radius `base`, centred on the aperture) sits inside the frame
 * band at the rim's mid-depth, bulging `h` toward the viewer. `r`/`z` are its sphere radius and
 * centre depth, so pupils and lids still move on a true sphere.
 */
export const EYEBALL = (() => { const base = 8.9, h = 2.9, r = (base * base + h * h) / (2 * h); return {base, h, r, z: h - r, back: 1.5}; })();

/** Lens-local offset (unscaled, from lens centre) → character/body space, as projected in 2-D. */
export function lensPoint(L, u, v) {
  const sx = L.s * L.sx * Math.cos(L.turn * DEG), sy = L.s * L.sy * Math.cos(L.tilt * DEG);
  const r = L.rot * DEG, c = Math.cos(r), s = Math.sin(r), x = u * sx, y = v * sy;
  return {x: L.x + x * c - y * s, y: L.y + x * s + y * c};
}

const lerpAngle = (a, b, t) => a + ((((b - a) % TAU) + 3 * Math.PI) % TAU - Math.PI) * t;

/** Radius of the frame band (between the original inner and outer contours) every 5°, per lens. */
const RIM_BAND = [0, 1].map(i => {
  const ray = (d, a) => {
    const pts = samplePath(d, 12)[0].pts.map(q => ({x: q.x - C[i].x, y: q.y - C[i].y})), ux = Math.cos(a), uy = Math.sin(a);
    let best = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const p = pts[k], q = pts[k + 1], ex = q.x - p.x, ey = q.y - p.y, den = ux * ey - uy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = (p.x * ey - p.y * ex) / den, u = (p.x * uy - p.y * ux) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
    }
    return best;
  };
  return Array.from({length: 72}, (_, k) => { const a = k * 5 * DEG; return (ray(PATHS[i * 2], a) + ray(PATHS[i * 2 + 1], a)) / 2; });
});
/** Middle of the frame band at a lens-local angle (radians): where a temple-arm grows from. */
export function rimRadius(i, a) {
  const f = ((a / DEG / 5) % 72 + 72) % 72, k = Math.floor(f), w = f - k;
  return lerp(RIM_BAND[i][k], RIM_BAND[i][(k + 1) % 72], w);
}

/**
 * Where a temple-arm attaches, in lens-local units. At rest it sits at the temple hinge on the
 * outer side; as it extends it slides around the rim to emerge radially in the direction it
 * points, so it always grows out of the frame. `pin` (0–1) locks it to `at` degrees instead.
 */
export function armAttach(A, i) {
  const side = i ? 1 : -1, a = A.ang * DEG, dir = Math.atan2(-Math.sin(a), side * Math.cos(a));
  let t = lerpAngle(ARM.hinge[i] * DEG, dir, Ease.sine(A.ext * 2.4));
  if (A.pin > 0) t = lerpAngle(t, (A.at || 0) * DEG, clamp(A.pin));
  const r = rimRadius(i, t);
  return {u: r * Math.cos(t), v: r * Math.sin(t), angle: t};
}

/** Temple-arm polyline in body space: start, end of the main segment and the hooked tip. */
export function armGeometry(L, A, i) {
  const side = i ? 1 : -1, at = armAttach(A, i), S = lensPoint(L, at.u, at.v);
  const base = L.rot * DEG, a = A.ang * DEG;
  let dx = side * Math.cos(a), dy = -Math.sin(a);
  [dx, dy] = [dx * Math.cos(base) - dy * Math.sin(base), dx * Math.sin(base) + dy * Math.cos(base)];
  const len = ARM.len * A.ext * (1 - .55 * A.fwd) * L.s;
  const E = {x: S.x + dx * len, y: S.y + dy * len};
  const b = side * A.bend * DEG, hx = dx * Math.cos(b) - dy * Math.sin(b), hy = dx * Math.sin(b) + dy * Math.cos(b);
  const hl = ARM.hook * Math.min(1, A.ext * 1.6) * L.s;
  const bow = .12 * len * Math.sin(b * .5);
  return {S, E, H: {x: E.x + hx * hl, y: E.y + hy * hl}, M: {x: (S.x + E.x) / 2 - dy * bow, y: (S.y + E.y) / 2 + dx * bow}, dir: {x: dx, y: dy}, len, attach: at};
}

/**
 * Inverse of armGeometry for reaching: the arm grows from the rim point facing the target and
 * its tip lands on (tx, ty). Honours a pinned attach point.
 */
export function reachArm(L, i, tx, ty, fwd = 0, A = {}) {
  const side = i ? 1 : -1, r = -L.rot * DEG, cr = Math.cos(r), sr = Math.sin(r);
  let lx = tx - L.x, ly = ty - L.y; [lx, ly] = [lx * cr - ly * sr, lx * sr + ly * cr];
  const sx = L.s * L.sx * Math.cos(L.turn * DEG) || 1e-3, sy = L.s * L.sy * Math.cos(L.tilt * DEG) || 1e-3;
  let t = Math.atan2(ly / sy, lx / sx);
  if (A.pin > 0) t = lerpAngle(t, (A.at || 0) * DEG, clamp(A.pin));
  const rr = rimRadius(i, t), S = lensPoint(L, rr * Math.cos(t), rr * Math.sin(t));
  let dx = tx - S.x, dy = ty - S.y; const d = Math.hypot(dx, dy) || 1e-6;
  [dx, dy] = [dx * cr - dy * sr, dx * sr + dy * cr];
  return {ang: Math.atan2(-dy, side * dx) / DEG, ext: clamp(d / (ARM.len * (1 - .55 * fwd) * L.s), 0, 1.8)};
}

/** 2-D projection of a body-space point with depth, matching the 3-D camera: yaw/pitch plus a slight top-down view. */
export function projectDepth(x, y, z, turn = 0, tilt = 0) {
  const tt = clamp(Math.tan(turn * DEG), -2.5, 2.5), tp = clamp(Math.tan(tilt * DEG), -2.5, 2.5);
  return {x: x + z * tt, y: y - z * tp + z * .15};
}

/** Eyebrow as a quadratic curve {a, c, b} in body space. */
export function browGeometry(L, B, i) {
  const side = i ? 1 : -1, r = L.rot * .7 * DEG, s = L.s, lift = (12.3 + B.y) * s;
  const cx = L.x + Math.sin(r) * lift, cy = L.y - Math.cos(r) * lift;
  const a = r + (i ? -B.rot : B.rot) * DEG, hw = 4.3 * s, ux = Math.cos(a), uy = Math.sin(a);
  const arch = (B.arch * 2.3 + .2) * s;
  return {a: {x: cx - ux * hw, y: cy - uy * hw}, b: {x: cx + ux * hw, y: cy + uy * hw}, c: {x: cx + uy * arch, y: cy - ux * arch}, side};
}

/** Bridge as a quadratic curve between the lenses (used by 3-D; 2-D bends the original contour). */
const BRIDGE_ENDS = [Math.atan2(-4.65, 7.9), Math.atan2(-1.2, -9.05)];
export function bridgeGeometry(p) {
  // Both ends sit in the middle of the frame band, so the bar never pokes past the rims.
  const ra = rimRadius(0, BRIDGE_ENDS[0]), rb = rimRadius(1, BRIDGE_ENDS[1]);
  const a = lensPoint(p.lens[0], ra * Math.cos(BRIDGE_ENDS[0]), ra * Math.sin(BRIDGE_ENDS[0]));
  const b = lensPoint(p.lens[1], rb * Math.cos(BRIDGE_ENDS[1]), rb * Math.sin(BRIDGE_ENDS[1]));
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(b.x - a.x, b.y - a.y);
  return {a, b, c: {x: mx - .05 * (b.y - a.y), y: my - .2 * d + p.bridge.sag}};
}

/** Projected helix between two points: the elastic coil of "closer look". Returns [{x,y,z}]. */
export function coilPoints(A, B, turns = 4.5, amp = 2.3, n = 96) {
  const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, pts = [];
  for (let k = 0; k <= n; k++) {
    const s = k / n, ph = TAU * turns * s, e = Math.sin(Math.PI * s) ** .35, sn = Math.sin(ph) * amp * e, cs = (Math.cos(ph) - 1) * amp * e;
    pts.push({x: A.x + dx * s - uy * sn + ux * cs * .42, y: A.y + dy * s + ux * sn + uy * cs * .42, z: Math.cos(ph) * amp * e});
  }
  return pts;
}

/* ---------- Path helpers ---------- */

export function circlePath(cx, cy, r, ry = r) {
  const k = .5523, f = fmt;
  return `M${f(cx + r)} ${f(cy)}C${f(cx + r)} ${f(cy + ry * k)} ${f(cx + r * k)} ${f(cy + ry)} ${f(cx)} ${f(cy + ry)}C${f(cx - r * k)} ${f(cy + ry)} ${f(cx - r)} ${f(cy + ry * k)} ${f(cx - r)} ${f(cy)}C${f(cx - r)} ${f(cy - ry * k)} ${f(cx - r * k)} ${f(cy - ry)} ${f(cx)} ${f(cy - ry)}C${f(cx + r * k)} ${f(cy - ry)} ${f(cx + r)} ${f(cy - ry * k)} ${f(cx + r)} ${f(cy)}Z`;
}

export function ellipsePath(cx, cy, rx, ry, rotDeg = 0) {
  const r = rotDeg * DEG, c = Math.cos(r), s = Math.sin(r), k = .5523;
  const P = (x, y) => `${fmt(cx + x * c - y * s)} ${fmt(cy + x * s + y * c)}`;
  return `M${P(rx, 0)}C${P(rx, ry * k)} ${P(rx * k, ry)} ${P(0, ry)}C${P(-rx * k, ry)} ${P(-rx, ry * k)} ${P(-rx, 0)}C${P(-rx, -ry * k)} ${P(-rx * k, -ry)} ${P(0, -ry)}C${P(rx * k, -ry)} ${P(rx, -ry * k)} ${P(rx, 0)}`;
}

export function roundRectPath(x, y, w, h, r) {
  const f = fmt, k = r * .4477;
  return `M${f(x + r)} ${f(y)}H${f(x + w - r)}C${f(x + w - k)} ${f(y)} ${f(x + w)} ${f(y + k)} ${f(x + w)} ${f(y + r)}V${f(y + h - r)}C${f(x + w)} ${f(y + h - k)} ${f(x + w - k)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)}H${f(x + r)}C${f(x + k)} ${f(y + h)} ${f(x)} ${f(y + h - k)} ${f(x)} ${f(y + h - r)}V${f(y + r)}C${f(x)} ${f(y + k)} ${f(x + k)} ${f(y)} ${f(x + r)} ${f(y)}Z`;
}

export function polyPath(pts, closed = false) {
  return pts.map((q, i) => `${i ? 'L' : 'M'}${fmt(q.x)} ${fmt(q.y)}`).join('') + (closed ? 'Z' : '');
}

/** Catmull-Rom through points, emitted as cubic Béziers. */
export function smoothPath(pts) {
  if (pts.length < 3) return polyPath(pts);
  let d = `M${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += `C${fmt(p1.x + (p2.x - p0.x) / 6)} ${fmt(p1.y + (p2.y - p0.y) / 6)} ${fmt(p2.x - (p3.x - p1.x) / 6)} ${fmt(p2.y - (p3.y - p1.y) / 6)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d;
}

/** Convex hull of two circles: a binocular barrel or a capsule. */
export function capsulePath(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
  if (d <= Math.abs(r1 - r2) + 1e-3) return r1 >= r2 ? circlePath(x1, y1, r1) : circlePath(x2, y2, r2);
  const a = Math.atan2(dy, dx), b = Math.acos((r1 - r2) / d), f = fmt;
  const P = (x, y, r, t) => `${f(x + r * Math.cos(t))} ${f(y + r * Math.sin(t))}`;
  const big2 = 2 * b > Math.PI ? 1 : 0;
  return `M${P(x1, y1, r1, a + b)}L${P(x2, y2, r2, a + b)}A${f(r2)} ${f(r2)} 0 ${big2} 0 ${P(x2, y2, r2, a - b)}L${P(x1, y1, r1, a - b)}A${f(r1)} ${f(r1)} 0 ${1 - big2} 0 ${P(x1, y1, r1, a + b)}Z`;
}

function starPath(n, r1, r2, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = (rot + i * 180 / n) * DEG; pts.push({x: r * Math.cos(a), y: r * Math.sin(a)}); }
  return polyPath(pts, true);
}

/** Spiral pupil (dizzy) as a polyline, centred on 0. */
export const SPIRAL = (() => { const pts = []; for (let i = 0; i <= 90; i++) { const t = i / 90, a = t * TAU * 3.2, r = .25 + 3.4 * t; pts.push({x: r * Math.cos(a), y: r * Math.sin(a)}); } return polyPath(pts); })();
export const HEART = 'M0 3.2C-1.2 2.2-4.4 0-4.4-1.9C-4.4-3.6-3.1-4.6-1.9-4.6C-1-4.6-.3-4.1 0-3.4C.3-4.1 1-4.6 1.9-4.6C3.1-4.6 4.4-3.6 4.4-1.9C4.4 0 1.2 2.2 0 3.2Z';

/** FX and prop glyphs: lists of filled parts centred near 0, roughly 8 units tall. */
export const GLYPHS = {
  heart: [{d: HEART, fill: 'pink'}],
  star: [{d: starPath(5, 4.6, 2.05), fill: 'yellow'}],
  sparkle: [{d: 'M0-4.6C.45-1.1 1.1-.45 4.6 0C1.1.45.45 1.1 0 4.6C-.45 1.1-1.1.45-4.6 0C-1.1-.45-.45-1.1 0-4.6Z', fill: 'yellow'}],
  zee: [{d: 'M-2.4-2.8H2.6V-1.6L-.7 1.6H2.6V2.8H-2.8V1.6L.5-1.6H-2.4Z', fill: 'lavender'}],
  bang: [{d: 'M-1.05-4.8H1.05L.62 1.1H-.62Z' + circlePath(0, 3, 1.05), fill: 'frame'}],
  question: [{d: 'M-3-2C-3-4.4-1.4-5.4.2-5.4C2.2-5.4 3.4-4.1 3.4-2.5C3.4-.6 1-.1 1 1.4V1.9H-1V1.2C-1-.9 1.3-1.2 1.3-2.5C1.3-3.2.8-3.6.1-3.6C-.6-3.6-1.1-3.1-1.1-2Z' + circlePath(0, 3.7, 1.1), fill: 'frame'}],
  note: [{d: circlePath(-1.3, 2.7, 1.75, 1.35) + 'M-.05 2.5V-4.8H1.2V2.5Z' + 'M1.2-4.8C2.2-3.7 3.7-3.3 3.4-.9C3-2.1 2.2-2.6 1.2-2.6Z', fill: 'frame'}],
  drop: [{d: 'M0-3.4C1.5-1.3 2.2-.2 2.2 1C2.2 2.3 1.2 3.2 0 3.2C-1.2 3.2-2.2 2.3-2.2 1C-2.2-.2-1.5-1.3 0-3.4Z', fill: 'sky'}],
  dot: [{d: circlePath(0, 0, 1), fill: 'lavender'}],
  puff: [{d: circlePath(0, 0, 1), fill: 'mist'}],
  confetti: [{d: 'M-1-.55H1V.55H-1Z', fill: 'pink'}],
  speed: [{d: 'M-4-.28H4V.28H-4Z', fill: 'lavender'}],
  ring: [{d: circlePath(0, 0, 1), fill: 'none', stroke: 'lavender'}],
  bulb: [
    {d: 'M0-6C3.4-6 5.2-3.6 5.2-1.2C5.2 1.2 3.4 2.4 2.6 3.6V4.6H-2.6V3.6C-3.4 2.4-5.2 1.2-5.2-1.2C-5.2-3.6-3.4-6 0-6Z', fill: 'yellow'},
    {d: 'M-2.5 5.1H2.5V6.1H-2.5ZM-1.9 6.6H1.9V7.6H-1.9Z', fill: 'frame'}
  ],
  pencil: [
    {d: 'M-.95-6H.95V2.6H-.95Z', fill: 'yellow'},
    {d: 'M-.95 2.6H.95L0 5.1Z', fill: 'frame'},
    {d: 'M-.95-7.3H.95V-6H-.95Z', fill: 'pink'}
  ],
  paper: [{d: roundRectPath(-8, -5.5, 16, 11, 1.1), fill: 'white', stroke: 'frame'}]
};

/** Matte palette shared by every renderer. */
export const PALETTE = {
  frame: FRAME, white: '#ffffff', paper: '#f8f7fc', lid: '#fdfcff', lid3d: '#e7e1f4', pupil: '#000000', back: '#d9d3ea',
  lavender: '#a398d5', mist: '#d9d2ee', barrel: '#55506f', pink: '#f08fb0', heart: '#e0457b', blush: '#f6a3bf',
  yellow: '#f7c64f', mint: '#79cfb4', sky: '#86bff0', coral: '#f49a7e'
};
export const color = (name, frame = FRAME) => name === 'frame' ? frame : PALETTE[name] || name;
export const CONFETTI = ['pink', 'yellow', 'mint', 'sky', 'lavender', 'coral'];

/* ---------- Path parsing (Three.js shapes, tube sampling, tests) ---------- */

/** Parse absolute M/L/H/V/C/Q/A/Z path data into subpaths of segments. */
export function parsePath(d) {
  const tok = d.match(/[MLHVCQAZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
  const subs = []; let i = 0, cmd = '', cur = null, x = 0, y = 0, sx = 0, sy = 0;
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/^[A-Za-z]$/.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'Z') { if (cur) { cur.closed = true; x = sx; y = sy; } cur = null; continue; }
    if (cmd === 'M') { x = num(); y = num(); sx = x; sy = y; cur = {start: {x, y}, segs: [], closed: false}; subs.push(cur); cmd = 'L'; continue; }
    if (!cur) { cur = {start: {x, y}, segs: [], closed: false}; subs.push(cur); }
    if (cmd === 'L') { x = num(); y = num(); cur.segs.push({t: 'L', x, y}); }
    else if (cmd === 'H') { x = num(); cur.segs.push({t: 'L', x, y}); }
    else if (cmd === 'V') { y = num(); cur.segs.push({t: 'L', x, y}); }
    else if (cmd === 'C') { const s = {t: 'C', x1: num(), y1: num(), x2: num(), y2: num(), x: num(), y: num()}; cur.segs.push(s); x = s.x; y = s.y; }
    else if (cmd === 'Q') { const s = {t: 'Q', x1: num(), y1: num(), x: num(), y: num()}; cur.segs.push(s); x = s.x; y = s.y; }
    else if (cmd === 'A') { const s = {t: 'A', rx: num(), ry: num(), rot: num(), large: num(), sweep: num(), x: num(), y: num(), x0: x, y0: y}; cur.segs.push(s); x = s.x; y = s.y; }
    else throw new SyntaxError(`Unsupported path command ${cmd}`);
  }
  return subs;
}

/** Arc segment (SVG endpoint form, circular arcs only) → centre parameterisation. */
function arcCenter(s) {
  const r = s.rx, dx = (s.x0 - s.x) / 2, dy = (s.y0 - s.y) / 2, d2 = dx * dx + dy * dy;
  const rr = Math.max(r, Math.sqrt(d2)), sign = s.large === s.sweep ? -1 : 1;
  const k = sign * Math.sqrt(Math.max(0, (rr * rr - d2) / d2));
  const cx = (s.x0 + s.x) / 2 + k * dy, cy = (s.y0 + s.y) / 2 - k * dx;
  const a0 = Math.atan2(s.y0 - cy, s.x0 - cx); let a1 = Math.atan2(s.y - cy, s.x - cx), da = a1 - a0;
  if (s.sweep && da < 0) da += TAU; if (!s.sweep && da > 0) da -= TAU;
  return {cx, cy, r: rr, a0, da};
}

/** Sample every subpath into point lists (used for tubes, shapes and bounds tests). */
export function samplePath(d, perSeg = 8) {
  return parsePath(d).map(sp => {
    const pts = [{...sp.start}]; let p = sp.start;
    for (const s of sp.segs) {
      if (s.t === 'L') pts.push({x: s.x, y: s.y});
      else for (let k = 1; k <= perSeg; k++) {
        const t = k / perSeg, u = 1 - t;
        if (s.t === 'C') pts.push({x: u * u * u * p.x + 3 * u * u * t * s.x1 + 3 * u * t * t * s.x2 + t * t * t * s.x, y: u * u * u * p.y + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y});
        else if (s.t === 'Q') pts.push({x: u * u * p.x + 2 * u * t * s.x1 + t * t * s.x, y: u * u * p.y + 2 * u * t * s.y1 + t * t * s.y});
        else { const a = arcCenter(s), ang = a.a0 + a.da * t; pts.push({x: a.cx + a.r * Math.cos(ang), y: a.cy + a.r * Math.sin(ang)}); }
      }
      p = {x: s.x, y: s.y};
    }
    return {pts, closed: sp.closed};
  });
}
