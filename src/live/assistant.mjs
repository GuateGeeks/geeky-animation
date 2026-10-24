/* GEEKY LIVE / assistant.
   A Clippy-style desktop companion built on the actor: floats in a corner (or
   docks inside an element), can be dragged and flung, talks in speech balloons
   with buttons, answers an "Ask Geeky" box, opens a context menu, and reacts to
   what happens on the page — typing, letters, scrolling, copying, selections,
   idling, coming back, hovering [data-geeky-tip] elements. Every unsolicited
   reaction has a cooldown, "quiet" mode silences the chatter, and reduced motion
   is respected throughout. */
import {GeekyActor} from './actor.mjs';
import {ACTION_LIST} from './actions.mjs';

const STYLE_ID = 'geeky-assistant-style';
const CSS = `
.gk-root{--gk-ink:#34314f;--gk-muted:#6f6787;--gk-card:#fffdf3;--gk-line:#34314f;--gk-soft:#efeaf8;--gk-accent:#8e80bd;--gk-shadow:0 10px 30px rgba(52,49,79,.18);--gk-safe-top:env(safe-area-inset-top,0px);--gk-safe-right:env(safe-area-inset-right,0px);--gk-safe-bottom:env(safe-area-inset-bottom,0px);--gk-safe-left:env(safe-area-inset-left,0px);font:14px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--gk-ink)}
@media (prefers-color-scheme:dark){.gk-root.gk-auto{--gk-ink:#f1eefb;--gk-muted:#b7aed0;--gk-card:#25223a;--gk-line:#cfc6ef;--gk-soft:#34304f;--gk-shadow:0 10px 30px rgba(0,0,0,.45)}}
.gk-float{position:fixed;z-index:2147483000;width:var(--gk-size);height:var(--gk-size);pointer-events:none;touch-action:none}
.gk-docked{position:absolute;inset:0;pointer-events:none}
.gk-stage{position:absolute;inset:0;pointer-events:none}
.gk-hit{position:absolute;left:12%;top:24%;width:76%;height:48%;border-radius:45%;pointer-events:auto;cursor:grab;outline:none;touch-action:none;-webkit-tap-highlight-color:transparent}
.gk-docked .gk-hit{touch-action:pan-y}
.gk-hit:focus-visible{box-shadow:0 0 0 3px var(--gk-accent)}
.gk-hit.gk-grabbing{cursor:grabbing}
.gk-balloon{position:fixed;z-index:2147483001;display:flex;flex-direction:column;box-sizing:border-box;width:max-content;max-width:min(332px,calc(100vw - 24px));min-width:min(180px,calc(100vw - 24px));background:var(--gk-card);color:var(--gk-ink);border:1.5px solid var(--gk-line);border-radius:16px;padding:18px 16px 14px;box-shadow:var(--gk-shadow);transform-origin:var(--gk-origin,50% 100%);animation:gk-pop .22s cubic-bezier(.3,1.6,.5,1)}
.gk-balloon-content{min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y}
.gk-balloon[hidden],.gk-menu[hidden],.gk-restore[hidden],.gk-ask[hidden],.gk-root[hidden]{display:none}
.gk-balloon .gk-tail{position:absolute;width:14px;height:14px;background:var(--gk-card);border-right:1.5px solid var(--gk-line);border-bottom:1.5px solid var(--gk-line);transform:rotate(45deg);left:var(--gk-tail,50%);margin-left:-7px}
.gk-balloon.gk-above .gk-tail{bottom:-8px}.gk-balloon.gk-below .gk-tail{top:-8px;transform:rotate(225deg)}
.gk-text{min-height:22px;margin:0 30px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.gk-close{position:absolute;top:3px;right:3px;width:44px;height:44px;border:0;border-radius:50%;background:transparent;color:var(--gk-muted);font:22px/1 system-ui;cursor:pointer;touch-action:manipulation}
.gk-close:hover{background:var(--gk-soft);color:var(--gk-ink)}
.gk-buttons{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.gk-buttons button,.gk-ask button{min-height:44px;font:inherit;font-size:14px;text-align:left;padding:9px 11px;border:1px solid var(--gk-line);border-radius:10px;background:transparent;color:var(--gk-ink);cursor:pointer;touch-action:manipulation}
.gk-buttons button::before{content:"●";color:var(--gk-accent);font-size:9px;margin-right:8px;vertical-align:2px}
.gk-buttons button:hover,.gk-buttons button:focus-visible,.gk-ask button:hover{background:var(--gk-soft);outline:none}
.gk-buttons button.gk-primary{background:var(--gk-ink);color:var(--gk-card)}
.gk-ask{display:flex;gap:6px;margin-top:10px}
.gk-ask input{flex:1;min-width:0;min-height:44px;box-sizing:border-box;font:inherit;font-size:16px;padding:9px 10px;border:1px solid var(--gk-line);border-radius:10px;background:var(--gk-card);color:var(--gk-ink)}
.gk-ask input:focus{outline:2px solid var(--gk-accent);outline-offset:1px}
.gk-menu{position:fixed;z-index:2147483002;box-sizing:border-box;min-width:min(200px,calc(100vw - 24px));padding:6px;background:var(--gk-card);border:1.5px solid var(--gk-line);border-radius:12px;box-shadow:var(--gk-shadow);animation:gk-pop .16s ease-out;overflow:auto;overscroll-behavior:contain;touch-action:pan-y}
.gk-menu button{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;min-height:44px;font:inherit;font-size:14px;text-align:left;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:var(--gk-ink);cursor:pointer;touch-action:manipulation}
.gk-menu button:hover,.gk-menu button:focus{background:var(--gk-soft);outline:none}
.gk-menu button span{min-width:0;overflow-wrap:anywhere}
.gk-menu kbd{font:11px ui-monospace,monospace;color:var(--gk-muted)}
.gk-menu hr{border:0;border-top:1px solid var(--gk-soft);margin:4px 2px}
.gk-restore{position:fixed;z-index:2147483000;right:max(16px,env(safe-area-inset-right,0px));bottom:max(16px,env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:6px;min-height:44px;padding:6px 12px 6px 8px;border:1.5px solid var(--gk-line);border-radius:999px;background:var(--gk-card);color:var(--gk-ink);font:600 12px system-ui;cursor:pointer;box-shadow:var(--gk-shadow);touch-action:manipulation}
.gk-restore svg{width:26px;height:16px}
.gk-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes gk-pop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
@media (max-width:600px){.gk-balloon,.gk-menu{font-size:15px}}
@media (prefers-reduced-motion:reduce){.gk-balloon,.gk-menu{animation:none}}
`;

const JOKES = [
  'Why did the glasses go to school? To improve their focus.',
  'I tried to read a book on anti-gravity. Couldn’t put it down. Well — I couldn’t put it on.',
  'There are 10 kinds of people: those who read binary and those who wear glasses to read binary.',
  'My optometrist says I have a stigma. I told him it’s astig-ma-tic.',
  'I’m not saying I’m the best assistant ever. But I’ve never once asked about your letter twice. Recently.'
];
const DEFAULT_TIPS = [
  'Double-click me for a random animation. Right-click (or long-press) for my menu.',
  'Drag me anywhere. Give me a fling — I don’t mind. Much.',
  'Shake your cursor around me if you want to see me dizzy.',
  'Type “Dear …” in any text box. I have a feeling about letters.',
  'Ask me to “ride a bike”, “dance”, “tell a joke” or “switch to 3D”.',
  'Elements with data-geeky-tip get a little commentary when you hover them.'
];
const GLASSES_ICON = '<svg viewBox="0 0 44.3 24.4" aria-hidden="true"><path fill="currentColor" d="M19.1 12.8a9.6 9.6 0 1 1-18.9 3.9 9.6 9.6 0 0 1 18.9-3.9Zm6.1-1.2a9.6 9.6 0 1 0 18.9-3.9 9.6 9.6 0 0 0-18.9 3.9ZM17.95 10.47a8.4 8.4 0 0 1 7.48-1.53c-.01-.34.07-.66.23-.95a9.4 9.4 0 0 0-8.28 1.7c.25.2.45.47.57.78Z"/></svg>';

/** Tiny synthesized sound kit (off by default; no audio files). */
class Sfx {
  constructor() { this.on = false; this.ac = null; }
  _ctx() { if (!this.ac) { const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return null; this.ac = new AC(); } if (this.ac.state === 'suspended') this.ac.resume(); return this.ac; }
  tone(f0, f1, dur, {type = 'sine', gain = .08, delay = 0} = {}) {
    const ac = this._ctx(); if (!ac) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + .02);
  }
  noise(dur, {gain = .05, freq = 1200, delay = 0} = {}) {
    const ac = this._ctx(); if (!ac) return;
    const t = ac.currentTime + delay, len = Math.ceil(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(freq * 2.5, t + dur);
    g.gain.value = gain; s.connect(f).connect(g).connect(ac.destination); s.start(t);
  }
  play(name) {
    if (!this.on) return;
    const T = (...a) => this.tone(...a);
    ({
      pop: () => { T(520, 980, .09, {gain: .07}); },
      hello: () => { T(660, 880, .08); T(880, 1320, .1, {delay: .09}); },
      jump: () => T(300, 900, .22, {type: 'triangle'}),
      land: () => T(180, 70, .14, {type: 'triangle', gain: .1}),
      whoosh: () => this.noise(.32, {freq: 500}),
      tap: () => { T(240, 160, .06, {type: 'square', gain: .05}); },
      ding: () => { T(1320, 1320, .5, {gain: .06}); T(1980, 1980, .4, {gain: .03, delay: .01}); },
      celebrate: () => [523, 659, 784, 1047].forEach((f, i) => T(f, f, .14, {delay: i * .08, type: 'triangle', gain: .06})),
      love: () => { T(587, 587, .12, {gain: .06}); T(880, 880, .2, {delay: .14, gain: .06}); },
      giggle: () => [0, 1, 2, 3].forEach(i => T(900 + i * 90, 1100 + i * 90, .05, {delay: i * .07, gain: .04})),
      startle: () => T(500, 1400, .12, {type: 'square', gain: .04}),
      surprise: () => T(400, 1200, .14, {type: 'triangle'}),
      click: () => T(1800, 1200, .03, {type: 'square', gain: .03}),
      oops: () => T(700, 220, .35, {type: 'triangle', gain: .07}),
      think: () => T(220, 200, .3, {gain: .05}),
      spot: () => T(1400, 1400, .12, {gain: .05}),
      dizzy: () => [0, 1, 2, 3, 4].forEach(i => T(600 + (i % 2) * 200, 500 + (i % 2) * 200, .08, {delay: i * .08, gain: .04})),
      ring: () => { T(2100, 2100, .25, {gain: .04}); T(2100, 2100, .25, {gain: .04, delay: .18}); },
      yawn: () => T(420, 200, .7, {type: 'triangle', gain: .05}),
      huff: () => this.noise(.25, {freq: 300, gain: .04}),
      scribble: () => this.noise(.08, {freq: 2500, gain: .02}),
      menu: () => T(880, 990, .05, {gain: .04})
    })[name]?.();
  }
}

const store = {
  get(k, fallback) { try { const v = globalThis.localStorage?.getItem(k); return v === null || v === undefined ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { globalThis.localStorage?.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } }
};

const isTyping = el => el && (el.isContentEditable || (el.tagName === 'TEXTAREA') || (el.tagName === 'INPUT' && /^(text|search|email|url|tel|password|)$/i.test(el.type || '')));
const textOf = el => el.isContentEditable ? el.innerText : el.value || '';

export class GeekyAssistant {
  constructor(options = {}) {
    const doc = globalThis.document;
    if (!doc) throw new Error('Create the Geeky assistant in a browser.');
    this.o = {
      renderer: 'svg', THREE: null, size: 150, corner: 'bottom-right', margin: 24, dock: null, dockZoom: .8, greeting: true,
      tips: DEFAULT_TIPS, answers: [], chatty: 'normal', sound: false, storageKey: 'geeky-assistant', name: 'Geeky',
      reducedMotion: 'system', persist: true, theme: 'auto', watch: {}, menu: [], ...options
    };
    this.watch = {typing: true, letter: true, scroll: true, copy: true, selection: true, idle: true, visibility: true, tips: true, shake: true, forms: true, konami: true, ...this.o.watch};
    const saved = this.o.persist ? store.get(this.o.storageKey, {}) : {};
    this.state = {hidden: false, sound: this.o.sound, chatty: this.o.chatty, noLetterTip: false, renderer: this.o.renderer, pos: null, ...saved};
    this.sfx = new Sfx(); this.sfx.on = !!this.state.sound;
    this.listeners = new Map(); this.cool = {}; this.tipIndex = 0; this.lastInput = performance.now(); this.mode = 'idle';
    this._injectStyle();
    this._build();
    this.actor = new GeekyActor(this.stage, {
      renderer: 'svg', interactive: false, reactions: false,
      dragMode: 'none', reducedMotion: this.o.reducedMotion, label: this.o.name, autonomous: true, shadow: true
    });
    this.actor.on('cue', d => this.sfx.play(d.name));
    this.actor.on('renderer', d => { this.state.renderer = d.kind; this._save(); this._emit('renderer', d); });
    this._bindPage();
    if (this.o.dock) this.dock(this.o.dock); else this._placeFloating();
    if (this.state.renderer === 'three' && this.o.THREE) this.setRenderer('three').catch(() => {});
    if (this.state.hidden) { this.root.hidden = true; this.restore.hidden = false; this.actor.pause(); }
    else if (this.o.greeting) this._greet();
  }

  /* ---------- public API ---------- */

  get reducedMotion() { return this.actor.brain.reduced; }
  play(id, opts) { return this.actor.play(id, opts); }
  animate() { return this.actor.animate(); }
  setMood(m) { this.actor.setMood(m); return this; }
  on(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); return () => this.listeners.get(type)?.delete(fn); }

  /**
   * Show a speech balloon. Resolves with the chosen button value, the typed text
   * for {input: true}, or null when dismissed or replaced.
   */
  say(text, {buttons = [], input = false, placeholder = 'Type a question…', timeout, action, mood} = {}) {
    if (this.state.hidden || this.tucked) return Promise.resolve(null);
    this._resolveBalloon(null);
    this.closeMenu();
    if (action) this.play(action);
    if (mood) this.setMood(mood);
    const b = this.balloon;
    b.hidden = false; b.classList.remove('gk-above', 'gk-below');
    this.bText.textContent = ''; this.bButtons.replaceChildren(); this.bAsk.hidden = !input;
    this.live.textContent = text;
    this._typewriter(text);
    buttons.forEach(btn => {
      const el = document.createElement('button'); el.type = 'button'; el.textContent = btn.label;
      if (btn.primary) el.classList.add('gk-primary');
      el.addEventListener('click', () => this._resolveBalloon(btn.value ?? btn.label, true));
      this.bButtons.appendChild(el);
    });
    if (input) { this.bInput.value = ''; this.bInput.placeholder = placeholder; setTimeout(() => this.bInput.focus({preventScroll: true}), 30); }
    this._positionBalloon(); this._followBalloon();
    this.sfx.play('pop');
    clearTimeout(this._balloonTimer);
    const auto = timeout ?? (buttons.length || input ? 0 : Math.min(9000, 2600 + text.length * 55));
    if (auto) this._balloonTimer = setTimeout(() => this._resolveBalloon(null), auto);
    this._emit('say', {text});
    return new Promise(res => { this._balloonResolve = res; });
  }
  closeBalloon() { this._resolveBalloon(null); return this; }
  /** Clippy's "What would you like to do?" */
  async ask() {
    const q = await this.say('What would you like to do?', {input: true, action: 'listen', buttons: [{label: 'Animate!', value: '#animate'}, {label: 'Show me a tip', value: '#tip'}, {label: 'Tell me a joke', value: '#joke'}]});
    if (q === null) { this.actor.stop(); return null; }
    return this.respond(q);
  }
  tip() { const tips = this.o.tips; if (!tips.length) return null; const t = tips[this.tipIndex++ % tips.length]; return this.say(t, {action: 'idea'}); }
  /** Point a temple at an element and (optionally) explain it. */
  async pointAt(el, text) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) return null;
    this.actor.lookAt(el);
    this.play('point', {loop: true, params: {angle: this.actor.angleTo(el)}});
    const r = text ? await this.say(text) : null;
    this.actor.lookAt(null); this.actor.stop();
    return r;
  }
  /** Fly (or ride) to a viewport position. Resolves on arrival. */
  moveTo(x, y, {action, speed = 520, free = false} = {}) {
    if (!this.floating) return Promise.resolve();
    const from = {...this.pos}, to = free ? {x, y} : this._clamp(x, y), dist = Math.hypot(to.x - from.x, to.y - from.y);
    if (this.reducedMotion || dist < 2) { this._setPos(to.x, to.y, free); return Promise.resolve(); }
    const dir = to.x >= from.x ? 1 : -1, dur = Math.max(.35, dist / speed);
    this.play(action || (dir > 0 ? 'running-right' : 'running-left'), action === 'bicycle' ? {params: {dir}} : undefined);
    cancelAnimationFrame(this._moveRaf);
    return new Promise(res => {
      // The glide pose carries the motion; no drag physics, so flights stay steady instead of swinging.
      const t0 = performance.now();
      const step = now => {
        const k = Math.min(1, (now - t0) / 1000 / dur), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
        this._setPos(from.x + (to.x - from.x) * e, from.y + (to.y - from.y) * e, free);
        if (k < 1) this._moveRaf = requestAnimationFrame(step);
        else { this.actor.impact(.35); this.actor.stop(); this._save(); res(); }
      };
      this._moveRaf = requestAnimationFrame(step);
    });
  }
  /** Bicycle across the screen and back: the easter egg. */
  async ride() {
    if (!this.floating || this.reducedMotion) { this.play('bicycle'); setTimeout(() => this.actor.stop(), 2600); return; }
    const home = {...this.pos}, s = this.o.size, W = innerWidth;
    this.say('Wheee!', {timeout: 1600});
    await this.moveTo(W + s, home.y, {action: 'bicycle', speed: 700, free: true});
    this._setPos(-s * 1.5, home.y, true);
    await this.moveTo(home.x, home.y, {action: 'bicycle', speed: 700});
  }
  hide() {
    if (this.state.hidden) return Promise.resolve();
    this._resolveBalloon(null); this.closeMenu();
    this.state.hidden = true; this._save(); this._emit('hide', {});
    return this.actor.play('goodbye').then(() => { if (this.state.hidden) { this.root.hidden = true; this.restore.hidden = false; this.actor.pause(); } });
  }
  show() {
    if (!this.state.hidden && !this.root.hidden) return this;
    this.state.hidden = false; this._save();
    this.root.hidden = false; this.restore.hidden = true; this.actor.resume();
    this.actor.play('greet', {blend: 0}); this._emit('show', {});
    return this;
  }
  /** Step aside without changing the user's show/hide preference (e.g. while a hero stage holds Geeky). */
  async tuck() {
    if (this.tucked) return; this.tucked = true;
    this._resolveBalloon(null); this.closeMenu();
    if (!this.root.hidden && !this.reducedMotion) await this.actor.play('goodbye');
    if (this.tucked) { this.root.hidden = true; this.actor.pause(); }
  }
  untuck() {
    if (!this.tucked) return this; this.tucked = false;
    if (this.state.hidden) return this;
    this.root.hidden = false; this.actor.resume(); this.actor.play('greet', {blend: 0});
    return this;
  }
  /** Switch bodies. `THREE` may be the namespace or a lazy loader such as () => import('three'). */
  async setRenderer(kind) {
    if (kind === 'three') {
      if (!this.o.THREE) throw new Error('Pass THREE (or a loader function) to the assistant to enable 3-D');
      if (typeof this.o.THREE === 'function') this.o.THREE = await this.o.THREE();
    }
    try { this.actor.setRenderer(kind, {THREE: this.o.THREE}); } catch (e) { console.error(e); this.actor.setRenderer('svg'); this.say('No 3-D here, sorry — your browser said no to WebGL.'); }
    this.actor.play('greet', {blend: 0});
    return this;
  }
  setSound(on) { this.state.sound = this.sfx.on = !!on; this._save(); if (on) this.sfx.play('pop'); return this; }
  setChatty(level) { this.state.chatty = level; this._save(); return this; }
  /** Live inside an element (a hero, a stage) instead of floating. */
  dock(el) {
    if (typeof el === 'string') el = document.querySelector(el);
    this.floating = false; this.dockEl = el;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    this.root.className = `gk-root ${this.o.theme === 'auto' ? 'gk-auto' : ''} gk-docked`; this.root.style.cssText = '';
    el.appendChild(this.root); this.actor.setZoom(this.o.dockZoom); this.actor.renderer.resize(); this._positionBalloon();
    return this;
  }
  /** Float above the page (default). */
  float(x, y) {
    this.floating = true; this.dockEl = null;
    this.root.className = `gk-root ${this.o.theme === 'auto' ? 'gk-auto' : ''} gk-float`;
    this.root.style.setProperty('--gk-size', this.o.size + 'px');
    document.body.appendChild(this.root);
    this._placeFloating(x, y); this.actor.setZoom(1); this.actor.renderer.resize();
    return this;
  }
  destroy() {
    this._resolveBalloon(null); clearTimeout(this._balloonTimer); cancelAnimationFrame(this._moveRaf); cancelAnimationFrame(this._followRaf);
    this._unbindPage?.(); this.actor.destroy();
    for (const n of [this.root, this.balloon, this.menu, this.restore, this.live]) n.remove();
    this.listeners.clear();
  }

  /** Answer a typed question with built-in intents, then custom `answers`. */
  async respond(raw) {
    const q = String(raw).trim(), low = q.toLowerCase();
    this._emit('ask', {query: q});
    for (const a of this.o.answers) {
      const hit = a.match instanceof RegExp ? a.match.test(q) : low.includes(String(a.match).toLowerCase());
      if (hit) { const reply = typeof a.reply === 'function' ? a.reply(q, this) : a.reply; return reply ? this.say(reply, {action: a.action, buttons: a.buttons}) : (a.action && this.play(a.action)); }
    }
    const is = re => re.test(low);
    if (low === '#animate') return this.animate();
    if (low === '#tip') return this.tip();
    if (low === '#joke' || is(/\bjoke|funny|laugh/)) return this.say(JOKES[Math.floor(Math.random() * JOKES.length)], {action: 'giggle'});
    if (is(/\b(hello|hi|hey|hola|howdy)\b/)) return this.say('Hi there! Nice to see you.', {action: 'waving'});
    if (is(/\b(dance|party|celebrate|yay)\b/)) return this.say('Let’s go!', {action: 'celebrate'});
    if (is(/\b(bike|bicycle|ride|cycle)\b/)) return this.ride();
    if (is(/\b(love|heart|cute)\b/)) return this.say('Aww. You’re making me blush.', {action: 'love'});
    if (is(/\b(sleep|nap|tired|rest)\b/)) { this.actor.setBase('sleep'); this.play('sleep'); return this.say('Zzz… (click me to wake me up)'); }
    if (is(/\b(idea|think|thought)\b/)) return this.say('Hmm… ooh! I’ve got one.', {action: 'idea'});
    if (is(/\b(search|find|look for|where)\b/)) return this.say('Searching… I’m a pair of glasses, not a search engine, but I’ll look really hard.', {action: 'searching'});
    if (is(/\b(3d|three|webgl)\b/)) { if (this.o.THREE) { this.setRenderer('three'); return this.say('Welcome to the third dimension.'); } return this.say('3-D isn’t enabled on this page.', {action: 'shrug'}); }
    if (is(/\b(2d|svg|flat)\b/)) { this.setRenderer('svg'); return this.say('Back to crisp, flat vectors.'); }
    if (is(/\b(spin|dizzy)\b/)) return this.say('Wheee— oh no.', {action: 'dizzy'});
    if (is(/\b(orbit|atom|busy|loading)\b/)) { this.play('running'); return this.say('Thinking at the speed of orbit.'); }
    if (is(/\b(read|closer|zoom|magnif)/)) { this.play('review'); return this.say('Let me take a closer look.'); }
    if (is(/\b(hide|go away|bye|goodbye|leave)\b/)) { await this.say('Okay! Bye for now.', {timeout: 1200}); return this.hide(); }
    if (is(/\b(help|what can you do|commands|options)\b/)) {
      const v = await this.say('I can wave, dance, ride a bike, take a closer look, fall asleep, tell jokes and switch dimensions. Pick one:', {buttons: [
        {label: 'Dance', value: 'dance'}, {label: 'Ride a bike', value: 'ride a bike'}, {label: 'Tell me a joke', value: 'joke'}, {label: 'Go 3-D', value: '3d'}]});
      return v ? this.respond(v) : null;
    }
    const known = ACTION_LIST.find(a => low.includes(a.id) || low.includes(a.label.toLowerCase()));
    if (known) { this.play(known.id); return this.say(`${known.label}! ${known.description}`); }
    return this.say('Hmm, I don’t know that one yet. Try “dance”, “ride a bike”, “tell me a joke” or “switch to 3D”.', {action: 'confused'});
  }

  /* ---------- menu ---------- */

  openMenu(x, y) {
    this._resolveBalloon(null);
    const items = [
      ['Animate!', 'Space', () => this.animate()],
      ['Ask Geeky…', 'Enter', () => this.ask()],
      ['Show me a tip', '', () => this.tip()],
      null,
      ...(this.o.THREE ? [[this.actor.rendererKind === 'three' ? 'Switch to 2-D (SVG)' : 'Switch to 3-D (Three.js)', '', () => this.setRenderer(this.actor.rendererKind === 'three' ? 'svg' : 'three')]] : []),
      [this.sfx.on ? 'Sound: on' : 'Sound: off', '', () => this.setSound(!this.sfx.on)],
      [this.state.chatty === 'quiet' ? 'Quiet mode: on' : 'Quiet mode: off', '', () => this.setChatty(this.state.chatty === 'quiet' ? 'normal' : 'quiet')],
      ...this.o.menu.map(m => [m.label, '', () => m.run(this)]),
      null,
      ['Hide Geeky', '', () => this.hide()]
    ];
    const menu = this.menu;
    menu.replaceChildren();
    for (const it of items) {
      if (!it) { menu.appendChild(document.createElement('hr')); continue; }
      const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = '<span></span><kbd></kbd>'; b.firstChild.textContent = it[0]; b.lastChild.textContent = it[1];
      b.addEventListener('click', () => { this.closeMenu(); it[2](); });
      menu.appendChild(b);
    }
    menu.hidden = false;
    this._menuAnchor = {x, y}; this._positionMenu();
    menu.querySelector('button')?.focus({preventScroll: true});
    this.sfx.play('menu');
    this.actor.lookAt(menu);
  }
  closeMenu() { if (!this.menu.hidden) { this.menu.hidden = true; this.actor.lookAt(null); } }

  /* ---------- internals ---------- */

  _emit(type, data) { this.listeners.get(type)?.forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
  _save() { if (this.o.persist) store.set(this.o.storageKey, {hidden: this.state.hidden, sound: this.state.sound, chatty: this.state.chatty, noLetterTip: this.state.noLetterTip, renderer: this.state.renderer, pos: this.state.pos}); }
  _ready(key, seconds) { const now = performance.now(); if ((this.cool[key] || 0) > now) return false; this.cool[key] = now + seconds * 1000; return true; }
  _chatty(level = 'normal') { const rank = {quiet: 0, normal: 1, chatty: 2}; return (rank[this.state.chatty] ?? 1) >= rank[level]; }

  _injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = CSS; document.head.appendChild(s);
  }

  _build() {
    const theme = this.o.theme === 'auto' ? 'gk-auto' : '';
    const mk = (tag, cls, parent) => { const n = document.createElement(tag); if (cls) n.className = cls; parent?.appendChild(n); return n; };
    this.root = mk('div', `gk-root ${theme} gk-float`);
    this.root.style.setProperty('--gk-size', this.o.size + 'px');
    this.stage = mk('div', 'gk-stage', this.root);
    this.hit = mk('div', 'gk-hit', this.root);
    this.hit.tabIndex = 0; this.hit.setAttribute('role', 'button'); this.hit.setAttribute('aria-haspopup', 'menu');
    this.hit.setAttribute('aria-label', `${this.o.name}, your assistant. Enter to ask, Space to animate, Shift+F10 for the menu, arrow keys to move.`);
    this.balloon = mk('div', `gk-root ${theme} gk-balloon`); this.balloon.hidden = true; this.balloon.setAttribute('role', 'dialog'); this.balloon.setAttribute('aria-label', `${this.o.name} says`);
    const close = mk('button', 'gk-close', this.balloon); close.type = 'button'; close.setAttribute('aria-label', 'Close'); close.textContent = '×';
    close.addEventListener('click', () => this._resolveBalloon(null, true));
    const content = mk('div', 'gk-balloon-content', this.balloon);
    this.bText = mk('p', 'gk-text', content);
    this.bAsk = mk('form', 'gk-ask', content); this.bAsk.hidden = true;
    this.bInput = mk('input', '', this.bAsk); this.bInput.setAttribute('aria-label', `Ask ${this.o.name}`); this.bInput.autocomplete = 'off';
    const go = mk('button', '', this.bAsk); go.type = 'submit'; go.textContent = 'Ask';
    this.bAsk.addEventListener('submit', e => { e.preventDefault(); const v = this.bInput.value.trim(); if (v) this._resolveBalloon(v, true); });
    this.bInput.addEventListener('input', () => { this.actor.notify('key'); if (this.actor.brain.act.id !== 'listen') this.play('listen', {loop: true}); });
    this.bButtons = mk('div', 'gk-buttons', content);
    mk('div', 'gk-tail', this.balloon);
    this.menu = mk('div', `gk-root ${theme} gk-menu`); this.menu.hidden = true; this.menu.setAttribute('role', 'menu'); this.menu.setAttribute('aria-label', `${this.o.name} menu`);
    this.restore = mk('button', `gk-root ${theme} gk-restore`); this.restore.type = 'button'; this.restore.hidden = true;
    this.restore.innerHTML = GLASSES_ICON + '<span></span>'; this.restore.lastChild.textContent = `Show ${this.o.name}`;
    this.restore.addEventListener('click', () => this.show());
    this.live = mk('div', 'gk-sr'); this.live.setAttribute('aria-live', 'polite');
    for (const n of [this.root, this.balloon, this.menu, this.restore, this.live]) document.body.appendChild(n);
    this.floating = true;
  }

  _greet() {
    this.actor.play('greet', {blend: 0});
    if (!this._chatty('normal')) return;
    setTimeout(async () => {
      if (this.state.hidden) return;
      const v = await this.say(`Hi! I’m ${this.o.name}. It looks like you’re exploring. Would you like a hand?`, {buttons: [
        {label: 'Show me what you can do', value: 'tour', primary: true}, {label: 'Just let me explore', value: 'explore'}, {label: 'Hide Geeky', value: 'hide'}]});
      if (v === 'tour') this._tour(); else if (v === 'explore') this.say('Okay! Double-click me any time. I’ll be right here.', {action: 'nod'}); else if (v === 'hide') this.hide();
    }, this.reducedMotion ? 300 : 1500);
  }

  async _tour() {
    const steps = [
      ['I follow your cursor — try moving it around me.', 'look-around'],
      ['Poke me. Go on.', 'giggle'],
      ['I can transform, too.', 'bicycle'],
      ['And when I’m busy, my frames turn into orbits.', 'running'],
      ['Right-click me for options, or press Enter on me to ask a question. That’s the tour!', 'waving']
    ];
    for (const [text, action] of steps) {
      this.play(action);
      const v = await this.say(text, {buttons: [{label: 'Next', value: 'next', primary: true}]});
      if (v !== 'next') break;
    }
    this.actor.stop();
  }

  _typewriter(text) {
    clearInterval(this._typeTimer);
    if (this.reducedMotion) { this.bText.textContent = text; return; }
    let i = 0; const el = this.bText;
    this._typeTimer = setInterval(() => {
      i = Math.min(text.length, i + 2); el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(this._typeTimer);
      this._positionBalloon();
    }, 28);
  }

  _resolveBalloon(value, user = false) {
    clearTimeout(this._balloonTimer); clearInterval(this._typeTimer);
    if (!this.balloon.hidden) { this.balloon.hidden = true; if (this.actor.brain.act.id === 'listen') this.actor.stop(); }
    const res = this._balloonResolve; this._balloonResolve = null;
    if (res) { res(value); if (user) this._emit('answer', {value}); }
  }

  _positionBalloon() {
    if (this.balloon.hidden) return;
    const b = this.balloon, v = this._viewportBounds();
    b.style.minWidth = Math.min(180, v.right - v.left) + 'px';
    b.style.maxWidth = Math.min(332, v.right - v.left) + 'px';
    b.style.maxHeight = v.bottom - v.top + 'px';
    const a = this.actor.anchor(), r = this.hit.getBoundingClientRect(), w = b.offsetWidth, h = b.offsetHeight;
    const above = r.top - h - 18 > v.top || r.bottom + h + 18 > v.bottom;
    const left = Math.max(v.left, Math.min(v.right - w, a.x - w * .62));
    const desiredTop = above ? Math.min(r.top, a.y + 10) - h - 14 : r.bottom + 14;
    const top = Math.max(v.top, Math.min(v.bottom - h, desiredTop));
    b.classList.toggle('gk-above', above); b.classList.toggle('gk-below', !above);
    b.style.left = left + 'px'; b.style.top = top + 'px';
    const tail = Math.max(18, Math.min(w - 18, a.x - left));
    b.style.setProperty('--gk-tail', tail + 'px'); b.style.setProperty('--gk-origin', `${tail}px ${above ? '100%' : '0'}`);
  }
  _followBalloon() {
    cancelAnimationFrame(this._followRaf);
    const loop = () => { if (this.balloon.hidden) return; this._positionBalloon(); this._followRaf = requestAnimationFrame(loop); };
    this._followRaf = requestAnimationFrame(loop);
  }

  _viewportBounds() {
    // The visual viewport also shrinks above a mobile keyboard.
    const v = globalThis.visualViewport, s = getComputedStyle(this.root);
    const inset = side => Math.max(10, parseFloat(s.getPropertyValue('--gk-safe-' + side)) || 0);
    const x = v?.offsetLeft || 0, y = v?.offsetTop || 0;
    return {left: x + inset('left'), top: y + inset('top'), right: x + (v?.width || innerWidth) - inset('right'), bottom: y + (v?.height || innerHeight) - inset('bottom')};
  }

  _positionMenu() {
    if (this.menu.hidden) return;
    const menu = this.menu, v = this._viewportBounds(), a = this.hit.getBoundingClientRect();
    menu.style.minWidth = Math.min(200, v.right - v.left) + 'px';
    menu.style.maxWidth = v.right - v.left + 'px'; menu.style.maxHeight = v.bottom - v.top + 'px';
    // Layout dimensions stay stable while the opening animation scales the menu.
    const w = menu.offsetWidth, h = menu.offsetHeight, mx = this._menuAnchor?.x ?? a.left, my = this._menuAnchor?.y ?? a.top;
    menu.style.left = Math.max(v.left, Math.min(v.right - w, mx - w / 2)) + 'px';
    menu.style.top = Math.max(v.top, Math.min(v.bottom - h, my - h - 8)) + 'px';
  }

  _clamp(x, y) { const s = this.o.size, v = this._viewportBounds(); return {x: Math.max(v.left - s * .1, Math.min(v.right - s * .9, x)), y: Math.max(v.top - s * .15, Math.min(v.bottom - s * .85, y))}; }
  _setPos(x, y, raw = false) { const p = raw ? {x, y} : this._clamp(x, y); this.pos = p; this.root.style.left = p.x + 'px'; this.root.style.top = p.y + 'px'; this.state.pos = {x: p.x / innerWidth, y: p.y / innerHeight}; }
  _placeFloating(x, y) {
    const s = this.o.size, m = this.o.margin, c = this.o.corner;
    let px = c.includes('left') ? m : innerWidth - s - m, py = c.includes('top') ? m : innerHeight - s - m;
    if (this.state.pos && x === undefined) { px = this.state.pos.x * innerWidth; py = this.state.pos.y * innerHeight; }
    this._setPos(x ?? px, y ?? py);
  }

  _bindPage() {
    const doc = document, win = window, add = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); this._offs.push(() => t.removeEventListener(ev, fn, o)); };
    this._offs = [];
    /* Pointer on Geeky: tap = poke, drag = carry with physics, long-press / right-click = menu. */
    let P = null;
    this._offs.push(() => {
      if (!P) return;
      clearTimeout(P.long); const id = P.id; P = null;
      this.hit.classList.remove('gk-grabbing');
      if (this.hit.hasPointerCapture?.(id)) this.hit.releasePointerCapture(id);
      this.actor.brain.releaseSpin(); this.actor.setDrag(false);
    });
    add(this.hit, 'pointerdown', e => {
      if (e.button !== 0 || P) return;
      this.hit.setPointerCapture(e.pointerId);
      P = {id: e.pointerId, x: e.clientX, y: e.clientY, ox: e.clientX - (this.pos?.x || 0), oy: e.clientY - (this.pos?.y || 0), t: performance.now(), moved: false, vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now()};
      P.long = setTimeout(() => { if (P && !P.moved) { P.menu = true; this.openMenu(e.clientX, e.clientY); } }, 600);
    });
    add(this.hit, 'pointermove', e => {
      if (!P || P.id !== e.pointerId) return;
      if (!P.moved && Math.hypot(e.clientX - P.x, e.clientY - P.y) > 6) { P.moved = true; clearTimeout(P.long); this.hit.classList.add('gk-grabbing'); this._resolveBalloon(null); this.closeMenu(); }
      if (!P.moved) return;
      const now = performance.now(), dt = Math.max(8, now - P.lt) / 1000, dx = e.clientX - P.lx, dy = e.clientY - P.ly;
      P.vx = dx / dt * .5 + P.vx * .5; P.vy = dy / dt * .5 + P.vy * .5; P.lx = e.clientX; P.ly = e.clientY; P.lt = now;
      if (this.floating) { this._setPos(e.clientX - P.ox, e.clientY - P.oy); this.actor.setDrag(true, P.vx, P.vy); }
      else { this.actor.brain.spinBy(dx * .7, -dy * .45, dt); }
    });
    const end = e => {
      if (!P || P.id !== e.pointerId) return;
      clearTimeout(P.long); this.hit.classList.remove('gk-grabbing');
      const was = P; P = null;
      if (this.hit.hasPointerCapture?.(e.pointerId)) this.hit.releasePointerCapture(e.pointerId);
      if (e.type === 'pointercancel' || e.type === 'lostpointercapture') { this.actor.brain.releaseSpin(); this.actor.setDrag(false); return; }
      if (was.menu) return;
      if (!was.moved) return this._tap(e);
      this.actor.brain.releaseSpin();
      if (this.floating) { this.actor.setDrag(false); this.actor.impact(Math.min(1.6, Math.hypot(was.vx, was.vy) / 900)); this._save(); this._emit('drop', {...this.pos}); if (Math.hypot(was.vx, was.vy) > 1800 && this._ready('fling', 12)) { this.play('dizzy'); if (this._chatty()) this.say('Whoa — gentle with the frames!'); } }
    };
    add(this.hit, 'pointerup', end); add(this.hit, 'pointercancel', end); add(this.hit, 'lostpointercapture', end);
    add(this.hit, 'dblclick', e => { e.preventDefault(); this.animate(); });
    add(this.hit, 'contextmenu', e => { e.preventDefault(); this.openMenu(e.clientX, e.clientY); });
    add(this.hit, 'keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.ask(); }
      else if (e.key === ' ') { e.preventDefault(); this.animate(); }
      else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { e.preventDefault(); this.openMenu(); }
      else if (e.key === 'Escape') { this._resolveBalloon(null); this.closeMenu(); }
      else if (this.floating && e.key.startsWith('Arrow')) {
        e.preventDefault(); const d = e.shiftKey ? 60 : 16, dx = {ArrowLeft: -d, ArrowRight: d}[e.key] || 0, dy = {ArrowUp: -d, ArrowDown: d}[e.key] || 0;
        this._setPos(this.pos.x + dx, this.pos.y + dy); this.actor.setDrag(true, dx * 30, dy * 30); setTimeout(() => this.actor.setDrag(false), 60); this._save();
      }
    });
    add(this.menu, 'keydown', e => {
      const items = [...this.menu.querySelectorAll('button')], i = items.indexOf(doc.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { this.closeMenu(); this.hit.focus(); }
    });
    add(this.balloon, 'keydown', e => { if (e.key === 'Escape') { this._resolveBalloon(null, true); this.hit.focus(); } });
    add(doc, 'pointerdown', e => { if (!this.menu.hidden && !this.menu.contains(e.target)) this.closeMenu(); }, true);
    const resize = () => { if (this.floating && this.pos) this._setPos(this.pos.x, this.pos.y); this._positionBalloon(); this._positionMenu(); };
    add(win, 'resize', resize);
    if (win.visualViewport) { add(win.visualViewport, 'resize', resize); add(win.visualViewport, 'scroll', resize); }

    /* Page awareness. */
    const activity = () => {
      const now = performance.now(), idle = now - this.lastInput; this.lastInput = now;
      if (this.mode === 'sleep' || this.mode === 'waiting') {
        const was = this.mode; this.mode = 'idle'; this.actor.setBase('idle');
        if (was === 'sleep') { this.play('wake'); if (this._chatty() && this._ready('wake', 30)) this.say('Huh? I’m awake! Totally awake.', {timeout: 2600}); } else this.actor.stop();
      }
      return idle;
    };
    add(doc, 'pointermove', activity, {passive: true}); add(doc, 'keydown', activity); add(win, 'wheel', activity, {passive: true});
    this._idleTimer = setInterval(() => {
      if (!this.watch.idle || this.state.hidden || this.actor.brain.act.id !== this.actor.brain.base) return;
      const idle = (performance.now() - this.lastInput) / 1000;
      if (idle > 75 && this.mode !== 'sleep') { this.mode = 'sleep'; this.actor.setBase('sleep'); this.play('sleep'); }
      else if (idle > 35 && this.mode === 'idle') { this.mode = 'waiting'; this.actor.setBase('waiting'); this.play('waiting'); }
    }, 1000);
    this._offs.push(() => clearInterval(this._idleTimer));

    // Typing: read along, nod per keystroke, and the famous letter tip.
    let typingTimer = null;
    add(doc, 'input', e => {
      const el = e.target;
      if (!this.watch.typing || this.state.hidden || !isTyping(el) || this.balloon.contains(el)) return;
      this.actor.lookAt(el); this.actor.notify('key');
      if (this.actor.brain.act.id !== 'reading' && !this._letterOpen) this.play('reading', {loop: true});
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { this.actor.lookAt(null); if (this.actor.brain.act.id === 'reading') this.actor.stop(); }, 2600);
      if (this.watch.letter && !this.state.noLetterTip && this._chatty('normal')) {
        const txt = textOf(el);
        if (/^\s*(dear|hi|hello|hey|hola|to whom)\b/i.test(txt) && txt.trim().length > 8 && this._ready('letter', 600)) this._letterTip(el);
      }
    }, true);
    add(doc, 'keydown', e => { if (e.key === 'Enter' && isTyping(e.target) && !this.balloon.contains(e.target)) this.actor.notify('enter'); }, true);
    add(doc, 'focusin', e => { if (this.watch.typing && isTyping(e.target) && !this.balloon.contains(e.target) && !this.state.hidden) { this.actor.lookAt(e.target); setTimeout(() => { if (doc.activeElement !== e.target) this.actor.lookAt(null); }, 1800); } });

    // Scrolling: eyes follow the direction; a cheeky remark at the bottom.
    let lastY = scrollY, lastT = performance.now(), scrollStop = null;
    add(win, 'scroll', () => {
      if (!this.watch.scroll || this.state.hidden) return;
      const now = performance.now(), v = (scrollY - lastY) / Math.max(1, now - lastT) * 1000; lastY = scrollY; lastT = now;
      const r = this.hit.getBoundingClientRect();
      this.actor.lookAt({x: r.left + r.width / 2, y: r.top + r.height / 2 + Math.sign(v) * 400});
      clearTimeout(scrollStop); scrollStop = setTimeout(() => this.actor.lookAt(null), 700);
      if (Math.abs(v) > 6000 && this._ready('fast-scroll', 25)) { this.play('surprised'); if (this._chatty('chatty')) this.say('Whoa, slow down!', {timeout: 1800}); }
      const bottom = innerHeight + scrollY >= doc.documentElement.scrollHeight - 4;
      if (bottom && this._chatty() && this._ready('bottom', 120) && doc.documentElement.scrollHeight > innerHeight * 1.6) {
        this.play('look-around');
        this.say('You made it to the bottom! Want to go back up?', {buttons: [{label: 'Back to top', value: 'top', primary: true}, {label: 'No thanks', value: 'no'}]})
          .then(v => { if (v === 'top') { win.scrollTo({top: 0, behavior: this.reducedMotion ? 'auto' : 'smooth'}); this.play('running-right'); setTimeout(() => this.actor.stop(), 1400); } });
      }
    }, {passive: true});

    add(doc, 'copy', () => { if (this.watch.copy && !this.state.hidden && this._ready('copy', 8)) { this.play('nod'); if (this._chatty()) this.say('Copied! I saw that.', {timeout: 1600}); } });
    let selTimer = null;
    add(doc, 'selectionchange', () => {
      if (!this.watch.selection || this.state.hidden) return;
      clearTimeout(selTimer);
      selTimer = setTimeout(() => {
        const s = doc.getSelection(); if (!s || s.isCollapsed || s.toString().trim().length < 4 || !s.rangeCount) return;
        const r = s.getRangeAt(0).getBoundingClientRect(); if (!r.width) return;
        this.actor.lookAt({x: r.left + r.width / 2, y: r.top + r.height / 2});
        if (this._ready('select', 20)) { this.play('review'); setTimeout(() => { if (this.actor.brain.act.id === 'review') this.actor.stop(); this.actor.lookAt(null); }, 3200); }
      }, 500);
    });
    let hiddenAt = 0;
    add(doc, 'visibilitychange', () => {
      if (!this.watch.visibility || this.state.hidden) return;
      if (doc.hidden) { hiddenAt = performance.now(); return; }
      if (hiddenAt && performance.now() - hiddenAt > 20000 && this._ready('back', 60)) { this.play('waving'); if (this._chatty()) this.say('Welcome back!', {timeout: 2200}); }
    });
    add(doc, 'submit', e => { if (this.watch.forms && !this.balloon.contains(e.target) && !this.state.hidden && this._ready('submit', 5)) { this.play('celebrate'); if (this._chatty()) this.say('Sent! Nicely done.', {timeout: 2000}); } }, true);

    // Hover tips on [data-geeky-tip] elements, Clippy-style contextual help.
    let tipTimer = null, tipEl = null;
    add(doc, 'pointerover', e => {
      if (!this.watch.tips || this.state.hidden || !this._chatty()) return;
      const el = e.target.closest?.('[data-geeky-tip]');
      if (el === tipEl) return;
      tipEl = el; clearTimeout(tipTimer);
      if (!el) return;
      tipTimer = setTimeout(() => {
        const key = 'tip:' + el.dataset.geekyTip;
        if (tipEl !== el || !this._ready(key, 40) || !this.balloon.hidden) return;
        if (el.dataset.geekyAction) this.play(el.dataset.geekyAction);
        this.pointAt(el, el.dataset.geekyTip);
      }, 750);
    });

    // Shake the cursor around Geeky: dizzy.
    let shake = [], lastX = 0, lastDir = 0;
    add(doc, 'pointermove', e => {
      if (!this.watch.shake || this.state.hidden) return;
      const r = this.hit.getBoundingClientRect();
      if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > 170) { shake = []; return; }
      const dir = Math.sign(e.clientX - lastX); lastX = e.clientX;
      if (dir && dir !== lastDir) { lastDir = dir; const now = performance.now(); shake = shake.filter(t => now - t < 1300); shake.push(now); }
      if (shake.length >= 8 && this._ready('shake', 15)) { shake = []; this.play('dizzy'); if (this._chatty()) this.say('Whoa… I’m seeing double. Quadruple?', {timeout: 2200}); }
    }, {passive: true});

    // ↑↑↓↓←→←→BA
    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; let ci = 0;
    add(doc, 'keydown', e => {
      if (!this.watch.konami || this.state.hidden || isTyping(e.target)) return;
      ci = e.key === code[ci] || e.key.toLowerCase() === code[ci] ? ci + 1 : (e.key === code[0] ? 1 : 0);
      if (ci === code.length) { ci = 0; this.ride(); }
    });
    this._unbindPage = () => this._offs.forEach(f => f());
  }

  async _letterTip(el) {
    this.actor.lookAt(el);
    this.play('get-attention'); this._letterOpen = true;
    const v = await this.say('It looks like you’re writing a letter.\n\nWould you like help?', {buttons: [
      {label: 'Get help with writing the letter', value: 'help', primary: true},
      {label: 'Just type the letter without help', value: 'alone'},
      {label: 'Don’t show me this tip again', value: 'never'}]});
    this.actor.lookAt(null); this._letterOpen = false;
    if (v === 'help') { this.play('writing'); this.say('Great letters start with a greeting, end with a smile, and never mention paperclips.', {timeout: 6000}); setTimeout(() => this.actor.stop(), 6000); }
    else if (v === 'alone') this.play('nod');
    else if (v === 'never') { this.state.noLetterTip = true; this._save(); this.play('sad'); this.say('Okay. I’ll… just be over here.', {timeout: 2200}); }
  }

  _tap(e) {
    const c = this.actor.renderer.screenToChar(e.clientX, e.clientY);
    this.actor.brain.poke(c.x, c.y);
    const now = performance.now(); this._taps = (this._taps || []).filter(t => now - t < 2200); this._taps.push(now);
    if (this.mode !== 'idle') { this.lastInput = now; this.mode = 'idle'; this.actor.setBase('idle'); this.play('wake'); return; }
    if (this._taps.length >= 5) { this._taps = []; this.play('dizzy'); if (this._chatty()) this.say('Okay, okay! I’m awake!', {timeout: 1800}); return; }
    if (this._taps.length >= 3) { this.play('giggle'); return; }
    if (!this.balloon.hidden) { this.play('giggle'); return; }
    this.play(Math.random() < .7 ? 'giggle' : 'surprised');
    setTimeout(() => { if (this.balloon.hidden && (this._taps || []).length === 1) this.ask(); }, 450);
  }
}

export function createGeekyAssistant(options) { return new GeekyAssistant(options); }
