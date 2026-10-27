/* GEEKY LIVE / actor.
   Runs one brain through one renderer (plain SVG or Three.js) and wires the
   pointer: eyes follow the cursor, a tap is a poke, a drag spins Geeky by hand,
   a double-tap asks for a random animation. Renderers can be swapped live. */
import {GeekyBrain, EXPRESSIONS} from './brain.mjs';
import {ACTION_LIST, resolveAction} from './actions.mjs';
import {SvgRenderer} from './svg-renderer.mjs';
import {ThreeRenderer} from './three-renderer.mjs';
import {RIM_R, clamp} from './core.mjs';

const ANIMATE_POOL = ['waving', 'jumping', 'celebrate', 'love', 'idea', 'get-attention', 'thinking', 'searching', 'running', 'review', 'bicycle', 'dizzy', 'confused', 'polish', 'adjust', 'look-around', 'running-right', 'shrug'];
const POKE_REACTIONS = [['giggle', 5], ['surprised', 1.4], ['nod', 1], ['love', .8], ['confused', .6], ['shrug', .5]];

export class GeekyActor {
  constructor(target, options = {}) {
    const doc = globalThis.document;
    if (!doc) throw new Error('Create Geeky Live in a browser after the DOM is available.');
    this.host = typeof target === 'string' ? doc.querySelector(target) : target;
    if (!this.host || this.host.nodeType !== 1) throw new TypeError('Geeky Live needs a DOM element or matching selector');
    this.opts = {renderer: 'svg', THREE: null, followPointer: true, interactive: true, dragMode: 'spin', reactions: true,
      reducedMotion: 'system', autonomous: true, brows: 'auto', shadow: true, label: 'Geeky', ...options};
    const b = this.opts.brows;
    this.brain = new GeekyBrain({seed: options.seed, autonomous: this.opts.autonomous, brows: b === false ? 'never' : b === true || b === 'always' ? 'always' : 'auto'});
    this.listeners = new Map(); this._raf = null; this._timer = null; this._last = null; this._paused = false; this._destroyed = false;
    this._clicks = []; this._lookEl = null; this._ptr = null;
    this._media = typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia('(prefers-reduced-motion: reduce)') : null;
    this._applyReduced();
    // A THREE loader function (e.g. () => import('three')) starts in SVG and switches once it resolves.
    const lazyThree = this.opts.renderer === 'three' && typeof this.opts.THREE === 'function';
    this._mount(lazyThree ? 'svg' : this.opts.renderer);
    this._bind();
    this.brain.on('cue', d => this._emit('cue', d));
    this.brain.on('start', d => this._onStart(d));
    this.brain.on('end', d => this._emit('end', d));
    this._schedule();
    if (lazyThree) this.loadRenderer('three');
  }

  /* ---------- public API ---------- */

  play(id, opts) { this._assert(); const pr = this.brain.play(id, opts); this._kick(); return pr; }
  stop() { return this.play(this.brain.base); }
  /** Random crowd-pleaser, like Clippy's "Animate!". */
  animate() { const pool = ANIMATE_POOL.filter(id => id !== this.brain.act.id); return this.play(pool[Math.floor(Math.random() * pool.length)]); }
  setMood(name) { this._assert(); this.brain.setMood(name); this._kick(); return this; }
  setBase(id) { this.brain.setBase(id); return this; }
  notify(signal) { this.brain.notify(signal); return this; }
  poke(x, y) { const p = this.brain.last; this.brain.poke(x ?? p?.body.x ?? 0, y ?? p?.body.y ?? 0); this._kick(); return this; }
  /** Look at an element, a client-space point {x, y}, 'user' (straight out of the screen) or null (natural gaze). */
  lookAt(target) {
    this._lookEl = null;
    if (target === null || target === undefined) { this.brain.lookAt(null); return this; }
    if (target === 'user') { const b = this.brain.last?.body; this.brain.lookAt(b?.x || 0, b?.y || 0, 90); this.brain.targetT = Infinity; return this; }
    if (target.nodeType === 1) { this._lookEl = target; this._trackElement(); return this; }
    const c = this.renderer.screenToChar(target.x, target.y); this.brain.lookAt(c.x, c.y); return this;
  }
  /** Angle in degrees (0 = right, 90 = up) from Geeky to a client point or element: handy for 'point'. */
  angleTo(target) {
    const r = target.nodeType === 1 ? target.getBoundingClientRect() : null;
    const x = r ? r.left + r.width / 2 : target.x, y = r ? r.top + r.height / 2 : target.y;
    const c = this.renderer.screenToChar(x, y), b = this.brain.last?.body || {x: 0, y: 0};
    return Math.atan2(-(c.y - b.y), c.x - b.x) * 180 / Math.PI;
  }
  setRenderer(kind, {THREE} = {}) {
    this._assert();
    if (THREE) this.opts.THREE = THREE;
    const prev = this.renderer?.kind;
    if (kind === prev) return this;
    this.renderer?.destroy(); this.renderer = null;
    // Without WebGL (or THREE) keep a working body rather than none.
    try { this._mount(kind); } catch (e) { this._mount(prev && prev !== kind ? prev : 'svg'); this._kick(); throw e; }
    this._kick(); this._emit('renderer', {kind}); return this;
  }
  /** Like setRenderer, but THREE may be a loader function; a failed load keeps the current body and emits 'renderer' with the error. */
  async loadRenderer(kind, {THREE} = {}) {
    this._assert();
    try {
      let ns = THREE ?? this.opts.THREE;
      if (typeof ns === 'function') ns = await ns();
      if (!this._destroyed) this.setRenderer(kind, {THREE: ns});
    } catch (error) {
      if (!this._destroyed) this._emit('renderer', {kind: this.renderer?.kind ?? 'svg', error});
    }
    return this;
  }
  /** Recolour the frame (rims, bridge, arms, brows); the brain and its action carry on. The 3-D body recolours its
      materials in place (no new WebGL context); the SVG body is rebuilt. A failed rebuild falls back to SVG. */
  setFrameColor(hex) {
    this._assert();
    if (this.opts.frameColor === hex) return this;
    this.opts.frameColor = hex;
    if (this.renderer?.setFrameColor) { this.renderer.setFrameColor(hex); this._kick(); return this; }
    const kind = this.renderer?.kind ?? 'svg';
    this.renderer?.destroy(); this.renderer = null;
    try { this._mount(kind); } catch (error) {
      this._mount('svg');
      this._emit('renderer', {kind: 'svg', error});
    }
    this._kick();
    return this;
  }
  /** Idle fidgets on or off (look-around, yawn, polish… while resting). */
  setAutonomous(on) { this.brain.autonomous = !!on; return this; }
  get rendererKind() { return this.renderer?.kind; }
  setZoom(z) { this.opts.zoom = clamp(Number(z) || 1, .3, 3); this.renderer.setZoom(this.opts.zoom); this._kick(); return this; }
  setSpeed(rate) { this.brain.speed = clamp(Number(rate) || 1, .1, 4); return this; }
  pause() { this._paused = true; this._cancel(); return this; }
  resume() { this._paused = false; this._last = null; this._schedule(); return this; }
  setReducedMotion(v) { this.opts.reducedMotion = v; this._applyReduced(); this._cancel(); this._schedule(); this._kick(); return this; }
  setFollowPointer(v) { this.opts.followPointer = !!v; if (!v) this.brain.lookAt(null); return this; }
  setDrag(active, vxPx = 0, vyPx = 0) { const k = this.renderer.pxPerUnit() || 1; this.brain.setDrag(active, vxPx / k, vyPx / k); return this; }
  impact(speed) { this.brain.impact(speed); return this; }
  /** Is a client-space point on the character? */
  hit(x, y) {
    const c = this.renderer.screenToChar(x, y), p = this.brain.last;
    if (!p) return false;
    return p.lens.some((L, i) => Math.hypot(c.x - (p.body.x + p.eyeT[i].x), c.y - (p.body.y + p.eyeT[i].y)) < RIM_R * L.s * 1.15 * Math.max(p.body.sx, .4))
      || Math.hypot(c.x - p.body.x, c.y - p.body.y + 3) < 5;
  }
  /** Client-space anchor above the character, for speech balloons. */
  anchor() { const p = this.brain.last || {body: {x: 0, y: 0}}; return this.renderer.charToScreen(p.body.x, p.body.y - 14); }
  getState() { return {...this.brain.getState(), renderer: this.renderer.kind, paused: this._paused, reducedMotion: this.brain.reduced}; }
  on(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); return () => this.listeners.get(type)?.delete(fn); }
  toSVG() { return this.renderer.toSVG?.() ?? null; }
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true; this._cancel(); this._unbind?.(); this.renderer?.destroy(); this.listeners.clear();
  }

  /* ---------- internals ---------- */

  _assert() { if (this._destroyed) throw new Error('This Geeky Live actor has been destroyed'); }
  /** Accessible name on each action: `label` alone with actionLabels:false, nothing when label is null (decorative). */
  _onStart(d) {
    const label = this.opts.label;
    if (label !== null) this.renderer?.setLabel?.(this.opts.actionLabels === false ? label : `${label}: ${resolveAction(d.id).label}`);
    this._emit('start', d); this._kick();
  }
  _emit(type, data) { this.listeners.get(type)?.forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }

  _mount(kind) {
    const o = {frameColor: this.opts.frameColor, brows: this.opts.brows !== false, shadow: this.opts.shadow, label: this.opts.label, zoom: this.opts.zoom ?? 1};
    if (kind === 'three') {
      if (!this.opts.THREE) throw new Error('The Three.js renderer needs the THREE namespace: createGeekyLive(el, {renderer: "three", THREE})');
      this.renderer = new ThreeRenderer(this.host, {...o, THREE: this.opts.THREE});
    } else if (kind === 'svg') this.renderer = new SvgRenderer(this.host, o);
    else throw new RangeError(`Unknown Geeky renderer: ${kind}`);
    // Keep vertical page scrolling available when a touch starts on the stage.
    if (this.renderer.svg) this.renderer.svg.style.touchAction = 'pan-y';
    this.renderer.render(this.brain.last || this.brain.update(0), []);
  }

  _applyReduced() {
    const v = this.opts.reducedMotion;
    this.brain.reduced = v === true || (v === 'system' && Boolean(this._media?.matches));
  }

  _schedule() {
    if (this._destroyed || this._paused || globalThis.document.hidden) return;
    if (this.brain.reduced) { if (!this._timer) this._timer = setTimeout(() => { this._timer = null; this._frame(performance.now()); }, 200); return; }
    if (this._raf === null) this._raf = requestAnimationFrame(t => { this._raf = null; this._frame(t); });
  }
  _cancel() { if (this._raf !== null) cancelAnimationFrame(this._raf); if (this._timer) clearTimeout(this._timer); this._raf = null; this._timer = null; this._last = null; }
  /** Render right away (reduced motion has no running loop). */
  _kick() { if (this.brain.reduced && this.renderer) { const p = this.brain.update(0); this.renderer.render(p, []); } }

  _frame(now) {
    if (this._destroyed || this._paused) return;
    const dt = this._last === null ? 1 / 60 : Math.min((now - this._last) / 1000, .1);
    this._last = now;
    if (this._lookEl) this._trackElement();
    const p = this.brain.update(dt);
    this.renderer.render(p, this.brain.reduced ? [] : this.brain.fx());
    this._schedule();
  }

  _trackElement() {
    const el = this._lookEl;
    if (!el.isConnected) { this._lookEl = null; this.brain.lookAt(null); return; }
    const r = el.getBoundingClientRect(), c = this.renderer.screenToChar(r.left + r.width / 2, r.top + r.height / 2);
    this.brain.lookAt(c.x, c.y); this.brain.targetT = this.brain.time;
  }

  _bind() {
    const host = this.host, win = globalThis.window, doc = globalThis.document;
    const previousTouchAction = host.style.touchAction;
    host.style.touchAction = 'pan-y';
    const move = e => {
      if (!this.opts.followPointer || this._lookEl || this.brain.reduced) return;
      const c = this.renderer.screenToChar(e.clientX, e.clientY);
      this.brain.lookAt(c.x, c.y);
      const over = this.opts.interactive && this.hit(e.clientX, e.clientY);
      if (over !== this._hover) { this._hover = over; this.brain.setHover(over); host.style.cursor = over ? (this.opts.dragMode === 'spin' ? 'grab' : 'pointer') : ''; this._emit('hover', {over}); }
    };
    const leave = () => { if (!this._lookEl) this.brain.targetT = this.brain.time - 2; };
    const down = e => {
      if (!this.opts.interactive || e.button !== 0 || this._ptr || !this.hit(e.clientX, e.clientY)) return;
      this._ptr = {id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false};
      if (this.opts.dragMode === 'spin') { host.setPointerCapture?.(e.pointerId); host.style.cursor = 'grabbing'; }
    };
    const drag = e => {
      const P = this._ptr; if (!P || P.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - P.x, e.clientY - P.y) > 5) P.moved = true;
      if (P.moved && this.opts.dragMode === 'spin') {
        const now = performance.now(), dt = Math.max(1, now - (P.lt || P.t)) / 1000;
        this.brain.spinBy((e.clientX - P.lx) * .7, -(e.clientY - P.ly) * .45, dt); P.lt = now;
      }
      P.lx = e.clientX; P.ly = e.clientY;
    };
    const up = e => {
      const P = this._ptr; if (!P || P.id !== e.pointerId) return;
      this._ptr = null; this.brain.releaseSpin(); host.style.cursor = this._hover ? 'grab' : '';
      if (host.hasPointerCapture?.(e.pointerId)) host.releasePointerCapture(e.pointerId);
      if (e.type === 'pointercancel' || e.type === 'lostpointercapture') return;
      if (!P.moved) this._tap(e);
      else this._emit('spin', {});
    };
    const dbl = e => { if (this.opts.interactive && this.hit(e.clientX, e.clientY)) { this._emit('dblclick', {}); if (this.opts.reactions) this.animate(); } };
    const vis = () => { this._last = null; if (doc.hidden) this._cancel(); else this._schedule(); };
    const media = () => { if (this.opts.reducedMotion === 'system') { this._applyReduced(); this._cancel(); this._schedule(); this._kick(); } };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.renderer?.resize()) : null;
    win.addEventListener('pointermove', move, {passive: true});
    doc.documentElement.addEventListener('pointerleave', leave);
    host.addEventListener('pointerdown', down); win.addEventListener('pointermove', drag, {passive: true});
    win.addEventListener('pointerup', up); win.addEventListener('pointercancel', up); host.addEventListener('lostpointercapture', up); host.addEventListener('dblclick', dbl);
    doc.addEventListener('visibilitychange', vis); this._media?.addEventListener?.('change', media); ro?.observe(host);
    this._unbind = () => {
      win.removeEventListener('pointermove', move); doc.documentElement.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointerdown', down); win.removeEventListener('pointermove', drag);
      win.removeEventListener('pointerup', up); win.removeEventListener('pointercancel', up); host.removeEventListener('lostpointercapture', up); host.removeEventListener('dblclick', dbl);
      doc.removeEventListener('visibilitychange', vis); this._media?.removeEventListener?.('change', media); ro?.disconnect();
      const pointer = this._ptr; this._ptr = null;
      if (pointer) { this.brain.releaseSpin(); if (host.hasPointerCapture?.(pointer.id)) host.releasePointerCapture(pointer.id); }
      host.style.touchAction = previousTouchAction;
    };
  }

  _tap(e) {
    const c = this.renderer.screenToChar(e.clientX, e.clientY), now = performance.now();
    this.brain.poke(c.x, c.y);
    this._clicks = this._clicks.filter(t => now - t < 2200); this._clicks.push(now);
    this._emit('poke', {x: e.clientX, y: e.clientY, count: this._clicks.length});
    if (!this.opts.reactions) return;
    if (this._clicks.length >= 5) { this._clicks = []; this.play('dizzy'); return; }
    const cur = this.brain.act;
    if (cur.id !== this.brain.base && !cur.loop) return;
    let pick = Math.random() * POKE_REACTIONS.reduce((s, r) => s + r[1], 0);
    this.play(POKE_REACTIONS.find(([, w]) => (pick -= w) < 0)?.[0] || 'giggle');
  }
}

export function createGeekyLive(target, options) { return new GeekyActor(target, options); }
export {ACTION_LIST, EXPRESSIONS};
