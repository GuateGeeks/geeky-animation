/* GEEKY LIVE / plain SVG renderer.
   Builds the character once from the original contours and then only updates
   attributes each frame (no innerHTML churn). Draws props and particles from
   the shared glyph library, so the 2-D and 3-D versions stay in sync. */
import {PATHS, C, FRAME, DEG, clamp, lerp, fmt, PUPIL_ORIGIN, GROUND, GLYPHS, SPIRAL, HEART, PALETTE, color,
  lensPoint, armGeometry, browGeometry, coilPoints, ellipsePath, capsulePath, polyPath, smoothPath, projectDepth} from './core.mjs';

const NS = 'http://www.w3.org/2000/svg';
const LID_E = 9.4;
let serial = 0;

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}
/** Write an attribute only when it changed. */
function set(n, k, v) { const c = n._gk || (n._gk = {}); if (c[k] !== v) { c[k] = v; n.setAttribute(k, v); } }

function lensTransform(L, spin = L.spin || 0) {
  const depth = 1 + (L.z || 0) * .012;
  let sx = L.s * L.sx * Math.cos(L.turn * DEG) * depth, sy = L.s * L.sy * Math.cos(L.tilt * DEG) * depth;
  if (Math.abs(sx) < .02) sx = sx < 0 ? -.02 : .02;
  if (Math.abs(sy) < .02) sy = sy < 0 ? -.02 : .02;
  return {str: `translate(${fmt(L.x)} ${fmt(L.y)}) rotate(${fmt(L.rot)}) scale(${fmt(sx)} ${fmt(sy)}) rotate(${fmt(spin)}) translate(${-C[L.i].x} ${-C[L.i].y})`, sign: Math.sign(sx * sy)};
}

export class SvgRenderer {
  constructor(host, {frameColor = FRAME, brows = true, shadow = true, label = 'Geeky', zoom = 1} = {}) {
    this.kind = 'svg'; this.host = host; this.frame = frameColor; this.showBrows = brows; this.showShadow = shadow; this.zoom = zoom;
    this.prefix = `geeky-live-${++serial}-`;
    this.props = new Map(); this.fxPool = {front: [], back: []};
    this._build(label);
  }

  _build(label) {
    const F = this.frame, id = this.prefix;
    const svg = this.svg = el('svg', {xmlns: NS, viewBox: this._viewBox(), width: '100%', height: '100%', role: 'img', 'aria-label': label, overflow: 'visible', preserveAspectRatio: 'xMidYMid meet'});
    svg.style.cssText = 'display:block;overflow:visible;touch-action:none';
    const defs = el('defs', {}, svg);
    for (let i = 0; i < 2; i++) el('path', {d: PATHS[i * 2 + 1]}, el('clipPath', {id: `${id}eye${i}`}, defs));
    this.shadow = el('ellipse', {cx: 0, cy: GROUND + .3, rx: 13, ry: 1.5, fill: F, opacity: .12}, svg);
    this.fxBack = el('g', {}, svg);
    const body = this.body = el('g', {}, svg);
    this.propsBack = el('g', {}, body);
    const strokeArm = {fill: 'none', stroke: F, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'};
    this.armBack = [el('path', strokeArm, body), el('path', strokeArm, body)];
    this.bridge = el('path', {fill: F}, body);
    this.coil = el('path', {fill: 'none', stroke: F, 'stroke-width': .95, 'stroke-linecap': 'round'}, body);
    this.frames = [0, 1].map(i => { const g = el('g', {}, body); el('path', {d: PATHS[i * 2] + ' ' + PATHS[i * 2 + 1], fill: F, 'fill-rule': 'evenodd'}, g); return g; });
    this.eyes = [0, 1].map(i => {
      const g = el('g', {}, body), c = C[i];
      const white = el('path', {d: PATHS[i * 2 + 1], fill: PALETTE.white}, g);
      const clip = el('g', {'clip-path': `url(#${id}eye${i})`}, g);
      const upright = el('g', {}, clip);
      const pupil = el('g', {}, upright);
      const round = el('g', {transform: `translate(${-PUPIL_ORIGIN[i].x} ${-PUPIL_ORIGIN[i].y})`}, pupil);
      const base = i * 3 + 4;
      el('path', {d: PATHS[base], fill: PALETTE.pupil}, round);
      el('path', {d: PATHS[base + 1], fill: PALETTE.white}, round);
      el('path', {d: PATHS[base + 2], fill: PALETTE.white}, round);
      const heart = el('g', {opacity: 0}, pupil);
      el('path', {d: HEART, fill: PALETTE.heart, transform: 'scale(.8)'}, heart);
      el('ellipse', {cx: -1.4, cy: -2.2, rx: .75, ry: .55, fill: PALETTE.white}, heart);
      const spiral = el('g', {opacity: 0}, pupil);
      el('path', {d: SPIRAL, fill: 'none', stroke: PALETTE.pupil, 'stroke-width': .8, 'stroke-linecap': 'round'}, spiral);
      // Lids match the eye white; only the crease line reads. Bottom lid paints over the top crease.
      const lineStyle = {fill: 'none', stroke: F, 'stroke-width': .7, 'stroke-linecap': 'round'};
      const lidT = el('path', {fill: PALETTE.lid}, upright), lineT = el('path', lineStyle, upright);
      const lidB = el('path', {fill: PALETTE.lid}, upright), lineB = el('path', lineStyle, upright);
      const outline = el('path', {d: PATHS[i * 2 + 1], fill: 'none', stroke: F, 'stroke-width': 1.2, opacity: 0}, g);
      return {g, c, white, clip, upright, pupil, round, heart, spiral, lidT, lidB, lineT, lineB, outline};
    });
    this.blush = [0, 1].map(() => el('ellipse', {fill: PALETTE.blush, opacity: 0}, body));
    this.brows = [0, 1].map(() => el('path', {fill: 'none', stroke: F, 'stroke-linecap': 'round'}, body));
    this.armFront = [el('path', strokeArm, body), el('path', strokeArm, body)];
    this.propsFront = el('g', {}, body);
    this.fxFront = el('g', {}, svg);
    this.host.appendChild(svg);
  }

  render(p, fx = []) {
    const B = p.body, F = this.frame;
    // Ground shadow shrinks and fades as Geeky leaves the ground.
    const k = clamp(1 - Math.max(0, -B.y) / 22, .25, 1) * (this.showShadow ? p.shadow : 0);
    set(this.shadow, 'cx', fmt(B.x)); set(this.shadow, 'rx', fmt(13 * k * Math.abs(B.sx))); set(this.shadow, 'ry', fmt(1.5 * k)); set(this.shadow, 'opacity', fmt(.12 * k));
    const depth = 1 + (B.z || 0) * .012;
    let bsx = B.sx * Math.cos(B.turn * DEG) * depth, bsy = B.sy * Math.cos(B.tilt * DEG) * depth;
    if (Math.abs(bsx) < .02) bsx = bsx < 0 ? -.02 : .02;
    if (Math.abs(bsy) < .02) bsy = bsy < 0 ? -.02 : .02;
    set(this.body, 'transform', `translate(${fmt(B.x)} ${fmt(B.y)}) rotate(${fmt(B.rot)}) scale(${fmt(bsx)} ${fmt(bsy)})`);
    const bodySign = Math.sign(bsx * bsy);

    for (let i = 0; i < 2; i++) {
      const L = {...p.lens[i], i}, E = {...p.eyeT[i], i, spin: L.spin}, e = this.eyes[i];
      set(this.frames[i], 'transform', lensTransform(L).str);
      const et = lensTransform(E);
      set(e.g, 'transform', et.str);
      const back = bodySign * et.sign < 0;
      set(e.white, 'fill', back ? PALETTE.back : PALETTE.white);
      set(e.clip, 'opacity', back ? '0' : '1');
      set(e.outline, 'opacity', fmt(E.outline));
      set(e.outline, 'stroke-width', fmt(1.2 / Math.max(.3, E.s)));
      set(e.upright, 'transform', `rotate(${fmt(-L.spin)} ${e.c.x} ${e.c.y})`);
      const q = p.pupil[i];
      set(e.pupil, 'transform', `translate(${fmt(e.c.x + q.x)} ${fmt(e.c.y + q.y)}) scale(${fmt(q.size)})`);
      set(e.round, 'opacity', fmt(1 - Math.max(q.heart, q.spiral)));
      set(e.heart, 'opacity', fmt(q.heart));
      set(e.spiral, 'opacity', fmt(q.spiral));
      if (q.spiral > 0) set(e.spiral, 'transform', `rotate(${fmt(q.spin % 360)})`);
      this._lids(e, p.lid[i], i);
      // Blush sits just under each frame.
      const bl = lensPoint(L, (i ? 1 : -1) * 3.2, 11.6);
      set(this.blush[i], 'cx', fmt(bl.x)); set(this.blush[i], 'cy', fmt(bl.y));
      set(this.blush[i], 'rx', fmt(2.8 * L.s)); set(this.blush[i], 'ry', fmt(1.2 * L.s)); set(this.blush[i], 'opacity', fmt(.8 * p.blush));
      // Eyebrows.
      const bw = browGeometry(L, p.brow[i], i);
      set(this.brows[i], 'd', `M${fmt(bw.a.x)} ${fmt(bw.a.y)}Q${fmt(bw.c.x)} ${fmt(bw.c.y)} ${fmt(bw.b.x)} ${fmt(bw.b.y)}`);
      // Brows grow in (thicker and more opaque) as an expression needs them.
      const bo = this.showBrows ? p.brow[i].o : 0;
      set(this.brows[i], 'stroke-width', fmt(1.55 * L.s * Math.sqrt(bo)));
      set(this.brows[i], 'opacity', fmt(Math.min(1, bo * 1.5)));
      // Temple arms: behind the frames unless reaching toward the viewer.
      const A = p.arm[i], front = A.fwd > .5, show = A.ext > .02;
      const [on, off] = front ? [this.armFront[i], this.armBack[i]] : [this.armBack[i], this.armFront[i]];
      set(off, 'opacity', '0');
      set(on, 'opacity', show ? '1' : '0');
      if (show) {
        const g = armGeometry(L, A, i), h = .5 * Math.hypot(g.H.x - g.E.x, g.H.y - g.E.y);
        set(on, 'd', `M${fmt(g.S.x)} ${fmt(g.S.y)}Q${fmt(g.M.x)} ${fmt(g.M.y)} ${fmt(g.E.x)} ${fmt(g.E.y)}Q${fmt(g.E.x + g.dir.x * h)} ${fmt(g.E.y + g.dir.y * h)} ${fmt(g.H.x)} ${fmt(g.H.y)}`);
        set(on, 'stroke-width', fmt(A.w * L.s));
      }
    }
    // Bridge: the original contour, bent between the two lens transforms.
    set(this.bridge, 'opacity', fmt(p.bridge.o * (1 - p.bridge.coil)));
    if (p.bridge.o * (1 - p.bridge.coil) > .01) set(this.bridge, 'd', this._bridge(p));
    set(this.coil, 'opacity', fmt(p.bridge.coil));
    if (p.bridge.coil > .01) {
      const a = lensPoint(p.lens[0], 9.2, -.5), b = lensPoint(p.lens[1], -9.4, .4);
      set(this.coil, 'd', smoothPath(coilPoints(a, b, 4.5, 2.3, 72)));
    }
    this._props(p, B);
    this._fx(fx);
  }

  _lids(e, L, i) {
    const c = e.c, yt = c.y - LID_E + L.top * 2 * LID_E, yb = c.y + LID_E - L.bot * 2 * LID_E, kt = L.tc * 4, kb = L.bc * 4;
    const tilt = i ? -L.tilt : L.tilt, rot = `rotate(${fmt(tilt)} ${c.x} ${fmt(yt)})`;
    const x0 = c.x - 12, x1 = c.x + 12;
    set(e.lidT, 'd', `M${x0} ${c.y - 14}H${x1}V${fmt(yt)}Q${c.x} ${fmt(yt + kt)} ${x0} ${fmt(yt)}Z`); set(e.lidT, 'transform', rot);
    set(e.lineT, 'd', `M${x0} ${fmt(yt)}Q${c.x} ${fmt(yt + kt)} ${x1} ${fmt(yt)}`); set(e.lineT, 'transform', rot);
    set(e.lineT, 'opacity', fmt(clamp((L.top - .03) / .08)));
    set(e.lidB, 'd', `M${x0} ${c.y + 14}H${x1}V${fmt(yb)}Q${c.x} ${fmt(yb - kb)} ${x0} ${fmt(yb)}Z`);
    set(e.lineB, 'd', `M${x0} ${fmt(yb)}Q${c.x} ${fmt(yb - kb)} ${x1} ${fmt(yb)}`);
    set(e.lineB, 'opacity', fmt(clamp((L.bot - .03) / .08)));
    const crease = fmt(.7 + .55 * clamp((L.top + L.bot - .55) / .4));
    set(e.lineT, 'stroke-width', crease); set(e.lineB, 'stroke-width', crease);
  }

  _bridge(p) {
    const L0 = p.lens[0], L1 = p.lens[1], sag = p.bridge.sag;
    let n = 0, lastx = 0;
    return PATHS[10].replace(/[-+]?\d*\.?\d+/g, v => {
      const num = Number(v);
      if (n++ % 2 === 0) { lastx = num; return '@'; }
      const X = lastx, w = clamp((X - 17.372) / (25.655 - 17.372));
      const a = lensPoint(L0, X - C[0].x, num - C[0].y), b = lensPoint(L1, X - C[1].x, num - C[1].y);
      return `${fmt(lerp(a.x, b.x, w))} ${fmt(lerp(a.y, b.y, w) + sag * Math.sin(Math.PI * w))}`;
    }).replace(/@\s*/g, '');
  }

  _props(p, B) {
    const seen = new Set();
    for (const q of p.props) {
      const key = q.key || q.t, type = q.t === 'glyph' ? 'g:' + q.kind : q.t;
      seen.add(key);
      let rec = this.props.get(key);
      if (!rec || rec.type !== type) {
        rec?.node.remove();
        const parent = q.layer === 'back' ? this.propsBack : this.propsFront;
        const node = q.t === 'glyph' ? this._glyph(q.kind, parent) : el('path', {'stroke-linecap': 'round', 'stroke-linejoin': 'round'}, parent);
        rec = {type, node}; this.props.set(key, rec);
      }
      const n = rec.node;
      set(n, 'opacity', fmt(clamp(q.o)));
      if (q.t === 'glyph') {
        const depth = 1 + (q.z || 0) * .02;
        set(n, 'transform', `translate(${fmt(q.x)} ${fmt(q.y)}) rotate(${fmt(q.rot || 0)}) scale(${fmt(Math.max(.001, q.s * depth))})`);
        if (q.color) set(n.firstChild, 'fill', color(q.color, this.frame));
      } else if (q.t === 'ring') {
        set(n, 'd', ellipsePath(q.x, q.y, q.r, q.r * Math.cos(q.tilt * DEG), q.rot));
        set(n, 'fill', 'none'); set(n, 'stroke', color(q.color || 'frame', this.frame)); set(n, 'stroke-width', fmt(q.w || 1));
      } else if (q.t === 'line') {
        const pts = q.depth ? q.pts.map(v => projectDepth(v.x, v.y, v.z || 0, B.turn, B.tilt)) : q.pts;
        set(n, 'd', pts.length > 6 ? smoothPath(pts) : polyPath(pts, q.closed));
        set(n, 'fill', 'none'); set(n, 'stroke', color(q.color || 'frame', this.frame)); set(n, 'stroke-width', fmt(q.w || 1));
      } else if (q.t === 'blob') {
        set(n, 'd', q.d); set(n, 'fill', color(q.fill || 'frame', this.frame));
      } else if (q.t === 'cyl') {
        // A (tapered) cylinder between two depth points: projected like the 3-D camera sees it.
        const a = projectDepth(q.a.x, q.a.y, q.a.z || 0, B.turn, B.tilt), b = projectDepth(q.b.x, q.b.y, q.b.z || 0, B.turn, B.tilt);
        set(n, 'd', capsulePath(a.x, a.y, q.r1, b.x, b.y, q.r2)); set(n, 'fill', color(q.color || 'frame', this.frame));
      }
    }
    for (const [key, rec] of this.props) if (!seen.has(key)) { rec.node.remove(); this.props.delete(key); }
  }

  _glyph(kind, parent) {
    const g = el('g', {}, parent);
    for (const part of GLYPHS[kind] || GLYPHS.dot) {
      const a = {d: part.d, fill: part.fill === 'none' ? 'none' : color(part.fill, this.frame)};
      if (part.stroke) { a.stroke = color(part.stroke, this.frame); a['stroke-width'] = part.fill === 'none' ? .35 : .3; }
      el('path', a, g);
    }
    g._kind = kind;
    return g;
  }

  _fx(list) {
    const used = {front: 0, back: 0};
    for (const q of list) {
      const layer = q.layer === 'back' ? 'back' : 'front', pool = this.fxPool[layer], idx = used[layer]++;
      let g = pool[idx];
      if (!g || g._kind !== q.kind) {
        const parent = layer === 'back' ? this.fxBack : this.fxFront, fresh = this._glyph(q.kind, parent);
        if (g) { parent.replaceChild(fresh, g); } pool[idx] = g = fresh;
      }
      set(g, 'transform', `translate(${fmt(q.x)} ${fmt(q.y)}) rotate(${fmt(q.rot)}) scale(${fmt(Math.max(.001, q.s))})`);
      set(g, 'opacity', fmt(clamp(q.o)));
      set(g, 'display', 'inline');
      const first = g.firstChild;
      if (q.kind === 'ring') { set(first, 'stroke', color(q.color || 'lavender', this.frame)); set(first, 'stroke-width', fmt(.45 / Math.max(.2, q.s))); }
      else if (q.color) set(first, 'fill', color(q.color, this.frame));
    }
    for (const layer of ['front', 'back']) for (let i = used[layer]; i < this.fxPool[layer].length; i++) set(this.fxPool[layer][i], 'display', 'none');
  }

  _viewBox() { const h = 32 / this.zoom; return `${fmt(-h)} ${fmt(-h)} ${fmt(2 * h)} ${fmt(2 * h)}`; }
  /** Zoom 1 frames the 64-unit stage; smaller values leave more room around Geeky. */
  setZoom(z) { this.zoom = z; set(this.svg, 'viewBox', this._viewBox()); }
  setLabel(text) { set(this.svg, 'aria-label', text); }
  /** Client pixels → stage (character) units. */
  screenToChar(x, y) {
    const m = this.svg.getScreenCTM(); if (!m) return {x: 0, y: 0};
    const pt = new DOMPoint(x, y).matrixTransform(m.inverse());
    return {x: pt.x, y: pt.y};
  }
  charToScreen(x, y) {
    const m = this.svg.getScreenCTM(); if (!m) return {x: 0, y: 0};
    const pt = new DOMPoint(x, y).matrixTransform(m);
    return {x: pt.x, y: pt.y};
  }
  pxPerUnit() { const m = this.svg.getScreenCTM(); return m ? Math.hypot(m.a, m.b) : 1; }
  resize() {}
  /** Current SVG as a standalone string (static snapshot). */
  toSVG() { return new XMLSerializer().serializeToString(this.svg); }
  destroy() { this.svg.remove(); this.props.clear(); }
}
