/* GEEKY LIVE / Three.js renderer.
   The same brain pose, in 3-D: rims extruded from the original contours,
   eyeballs whose pupils rotate on the sphere, eyelid shells, temples that rest
   behind the frames and swing forward as arms, and props/particles extruded
   from the shared glyph library. THREE is injected, so the host app controls
   the version and there is never a second copy of the library. */
import {PATHS, C, FRAME, DEG, clamp, lerp, Ease, EYE_R, PUPIL_R, GROUND, ARM, EYEBALL, GLYPHS, HEART, SPIRAL, PALETTE, color,
  parsePath, samplePath, lensPoint, armGeometry, armAttach, browGeometry, bridgeGeometry, coilPoints} from './core.mjs';

const SPIRAL_PTS = samplePath(SPIRAL, 1)[0].pts;
/** Lids and creases are clipped at the rim's mid-depth (ball space), where the eye dome meets the frame. */
const EYE_CLIP = -EYEBALL.z + .3;
/** Layers on the eye surface, as offsets above the dome: pupil < catchlights / heart / spiral < lids. */
const LAYER = {pupil: .05, shine: .12, sticker: .02, lid: .26};
const ER = EYEBALL.r, EZ = EYEBALL.z, LID_K = EYEBALL.base / EYEBALL.r, SHINES = [{x: .82, y: -.97, r: .92}, {x: -.26, y: -1.78, r: .28}];

/** A chain of cylinders and spheres: smooth tubes that update with transforms only. */
class Chain {
  constructor(T, mat, parent, unit) {
    this.T = T; this.mat = mat; this.unit = unit; this.g = new T.Group(); parent.add(this.g);
    this.segs = []; this.joints = []; this.v = new T.Vector3(); this.up = new T.Vector3(0, 1, 0);
  }
  set(pts, r) {
    const T = this.T, n = pts.length;
    this.g.visible = n > 1 && r > .002;
    if (!this.g.visible) return;
    for (let i = 0; i < n; i++) {
      if (i < n - 1) {
        let m = this.segs[i]; if (!m) { m = this.segs[i] = new T.Mesh(this.unit.cyl, this.mat); this.g.add(m); }
        const a = pts[i], b = pts[i + 1]; this.v.set(b.x - a.x, b.y - a.y, b.z - a.z); const len = this.v.length();
        m.visible = true; m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
        if (len > 1e-6) m.quaternion.setFromUnitVectors(this.up, this.v.multiplyScalar(1 / len));
        m.scale.set(r, Math.max(len, 1e-4), r);
      }
      let j = this.joints[i]; if (!j) { j = this.joints[i] = new T.Mesh(this.unit.sph, this.mat); this.g.add(j); }
      j.visible = true; j.position.set(pts[i].x, pts[i].y, pts[i].z); j.scale.setScalar(r);
    }
    for (let i = n - 1; i < this.segs.length; i++) this.segs[i].visible = false;
    for (let i = n; i < this.joints.length; i++) this.joints[i].visible = false;
  }
}

const quad = (a, c, b, n, z = 0) => Array.from({length: n + 1}, (_, k) => { const t = k / n, u = 1 - t; return {x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: -(u * u * a.y + 2 * u * t * c.y + t * t * b.y), z}; });

export class ThreeRenderer {
  constructor(host, {THREE, frameColor = FRAME, brows = true, shadow = true, label = 'Geeky', bleed = .35, zoom = 1} = {}) {
    if (!THREE) throw new Error('ThreeRenderer needs the THREE namespace');
    const T = this.T = THREE;
    this.kind = 'three'; this.host = host; this.frame = frameColor; this.showBrows = brows; this.showShadow = shadow; this.bleed = bleed; this.zoom = zoom;
    this.owned = []; this.matCache = new Map(); this.geoCache = new Map(); this.props = new Map(); this.fxPool = [];
    const gl = this.gl = new T.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'low-power'});
    gl.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    gl.outputColorSpace = T.SRGBColorSpace; gl.setClearColor(0x000000, 0); gl.localClippingEnabled = true;
    const cv = this.canvas = gl.domElement;
    cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', label);
    cv.style.cssText = `position:absolute;left:${-bleed * 100}%;top:${-bleed * 100}%;width:${100 + bleed * 200}%;height:${100 + bleed * 200}%;pointer-events:none;display:block`;
    if (getComputedStyle(host).position === 'static') { host.style.position = 'relative'; this._restorePosition = true; }
    host.appendChild(cv);
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(26, 1, 5, 4000);
    this.ray = new T.Raycaster(); this.plane = new T.Plane(new T.Vector3(0, 0, 1), 0); this.tmp = new T.Vector3(); this.tmp2 = new T.Vector3();
    this.unit = {cyl: this._own(new T.CylinderGeometry(1, 1, 1, 14, 1, true)), sph: this._own(new T.SphereGeometry(1, 14, 10))};
    this._lights(); this._materials(); this._build();
    this.resize();
  }

  _own(x) { this.owned.push(x); return x; }
  _std(o) { return this._own(new this.T.MeshStandardMaterial({roughness: .55, metalness: 0, ...o})); }
  _matFor(name) {
    if (name === 'white') return this.mat.shine;
    const key = color(name, this.frame);
    if (!this.matCache.has(key)) this.matCache.set(key, this._std({color: key, roughness: .5}));
    return this.matCache.get(key);
  }

  _lights() {
    const T = this.T, s = this.scene;
    s.add(new T.HemisphereLight(0xffffff, 0xcfc6ea, 1.5));
    const key = new T.DirectionalLight(0xffffff, 2.3); key.position.set(-40, 60, 90); s.add(key);
    const rim = new T.DirectionalLight(0xd9ccff, 1.4); rim.position.set(50, -10, -70); s.add(rim);
    const fill = new T.DirectionalLight(0xfff4e8, .5); fill.position.set(60, 20, 40); s.add(fill);
  }

  _materials() {
    const T = this.T;
    this.mat = {
      frame: this._std({color: this.frame, roughness: .46}),
      white: this._own(new T.MeshPhysicalMaterial({color: '#ffffff', roughness: .32, clearcoat: .7, clearcoatRoughness: .2})),
      pupil: this._own(new T.MeshPhysicalMaterial({color: '#000000', roughness: .25, clearcoat: 1, clearcoatRoughness: .08})),
      shine: this._own(new T.MeshBasicMaterial({color: '#ffffff'})),
      lid: this._std({color: PALETTE.lid3d, roughness: .6, side: T.DoubleSide}),
      back: this._std({color: PALETTE.back, roughness: .5}),
      heart: this._std({color: PALETTE.heart, roughness: .35}),
      blush: this._std({color: PALETTE.blush, transparent: true, opacity: .8, depthWrite: false})
    };
  }

  /** One absolute-coordinate subpath → THREE.Shape (or Path), centred on (ox, oy) and flipped to y-up. */
  _shape(sub, ox = 0, oy = 0, Ctor = this.T.Shape) {
    const s = new Ctor(), f = (x, y) => [x - ox, -(y - oy)];
    s.moveTo(...f(sub.start.x, sub.start.y));
    let px = sub.start.x, py = sub.start.y;
    for (const g of sub.segs) {
      if (g.t === 'L') s.lineTo(...f(g.x, g.y));
      else if (g.t === 'C') s.bezierCurveTo(...f(g.x1, g.y1), ...f(g.x2, g.y2), ...f(g.x, g.y));
      else if (g.t === 'Q') s.quadraticCurveTo(...f(g.x1, g.y1), ...f(g.x, g.y));
      else for (const q of samplePath(`M${px} ${py}A${g.rx} ${g.ry} ${g.rot} ${g.large} ${g.sweep} ${g.x} ${g.y}`, 10)[0].pts.slice(1)) s.lineTo(...f(q.x, q.y));
      px = g.x; py = g.y;
    }
    return s;
  }

  _glyphGeometry(kind) {
    const key = 'glyph:' + kind;
    if (this.geoCache.has(key)) return this.geoCache.get(key);
    const T = this.T;
    let parts;
    if (kind === 'puff' || kind === 'dot') parts = [{geo: this.unit.sph, fill: GLYPHS[kind][0].fill}];
    else if (kind === 'ring') parts = [{geo: this._own(new T.TorusGeometry(1, .07, 8, 40)), fill: 'lavender'}];
    else parts = (GLYPHS[kind] || GLYPHS.dot).map(part => {
      const shapes = parsePath(part.d).map(sp => this._shape(sp));
      const geo = this._own(new T.ExtrudeGeometry(shapes, {depth: .7, bevelEnabled: true, bevelThickness: .18, bevelSize: .14, bevelSegments: 2, curveSegments: 10}));
      geo.translate(0, 0, -.35);
      return {geo, fill: part.fill === 'none' ? part.stroke : part.fill};
    });
    this.geoCache.set(key, parts);
    return parts;
  }

  /** A glyph group with its own materials, so colour and opacity can vary per instance. */
  _glyph(kind, parent) {
    const T = this.T, g = new T.Group();
    g.userData.kind = kind;
    g.userData.mats = this._glyphGeometry(kind).map(part => {
      const m = new T.MeshStandardMaterial({color: color(part.fill, this.frame), roughness: .5, transparent: true, depthWrite: false});
      g.add(new T.Mesh(part.geo, m)); return m;
    });
    parent.add(g);
    return g;
  }
  _dropGlyph(g) { g.parent?.remove(g); g.userData.mats.forEach(m => m.dispose()); }

  _cap(size) {
    const key = 'cap' + Math.round(size * 20);
    if (!this.geoCache.has(key)) {
      const a = Math.asin(Math.min(.95, PUPIL_R * Math.round(size * 20) / 20 / ER));
      const g = this._own(new this.T.SphereGeometry(ER + LAYER.pupil, 40, 8, 0, Math.PI * 2, 0, a)); g.rotateX(Math.PI / 2);
      this.geoCache.set(key, g);
    }
    return this.geoCache.get(key);
  }

  _build() {
    const T = this.T, root = this.root = new T.Group(); this.scene.add(root);
    // Soft contact shadow.
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const cx = cv.getContext('2d'), gr = cx.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(52,49,79,.55)'); gr.addColorStop(.55, 'rgba(52,49,79,.18)'); gr.addColorStop(1, 'rgba(52,49,79,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
    const tex = this._own(new T.CanvasTexture(cv));
    this.shadow = new T.Mesh(this._own(new T.PlaneGeometry(1, 1)), this._own(new T.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false})));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = -(GROUND + .6); root.add(this.shadow);

    const body = this.body = new T.Group(); root.add(body);
    this.lenses = [0, 1].map(i => {
      const g = new T.Group(), spin = new T.Group(); g.add(spin); body.add(g);
      const shape = this._shape(parsePath(PATHS[i * 2])[0], C[i].x, C[i].y);
      let hole = this._shape(parsePath(PATHS[i * 2 + 1])[0], C[i].x, C[i].y, T.Path);
      // The source contours wind the same way; a hole must wind opposite to its outline or the
      // frame's inner wall faces inward, gets culled, and the rim looks hollow from an angle.
      if (T.ShapeUtils.isClockWise(shape.getPoints(64)) === T.ShapeUtils.isClockWise(hole.getPoints(64))) hole = new T.Path(hole.getPoints(96).reverse());
      shape.holes.push(hole);
      const geo = this._own(new T.ExtrudeGeometry(shape, {depth: 1.3, bevelEnabled: true, bevelThickness: .45, bevelSize: .32, bevelSegments: 4, curveSegments: 40}));
      geo.translate(0, 0, -.65);
      spin.add(new T.Mesh(geo, this.mat.frame));
      return {g, spin};
    });
    const heartShape = this._shape(parsePath(HEART)[0]);
    const heartGeo = this._own(new T.ExtrudeGeometry(heartShape, {depth: .14, bevelEnabled: false, curveSegments: 18}));
    heartGeo.scale(.8, .8, 1); heartGeo.translate(0, 0, ER + LAYER.sticker);
    this.eyes = [0, 1].map(i => {
      const g = new T.Group(); body.add(g);
      const pts = samplePath(PATHS[i * 2 + 1])[0].pts, n = pts.length;
      const c = {x: pts.reduce((s, q) => s + q.x, 0) / n - C[i].x, y: pts.reduce((s, q) => s + q.y, 0) / n - C[i].y};
      const ball = new T.Group(); ball.position.set(c.x, -c.y, EZ); g.add(ball);
      // The eye is a lens-shaped shell: a front dome and a flatter back dome whose edges meet
      // inside the frame band at mid-depth. No gap shows at any angle, and from behind the shell
      // starts exactly where the frame does.
      const white = new T.Mesh(this._dome('front'), this.mat.white); ball.add(white);
      const backShell = new T.Mesh(this._dome('back'), this.mat.back); backShell.position.set(c.x, -c.y, 0); g.add(backShell);
      const clip = new T.Plane(), clipMats = {lid: this.mat.lid.clone(), crease: this.mat.frame.clone()};
      for (const m of Object.values(clipMats)) { m.clippingPlanes = [clip]; this._own(m); }
      const pivot = new T.Group(); ball.add(pivot);
      const pupil = new T.Mesh(this._cap(1), this.mat.pupil); pivot.add(pupil);
      const shines = SHINES.map(() => { const m = new T.Mesh(this.unit.sph, this.mat.shine); pivot.add(m); return m; });
      const heart = new T.Mesh(heartGeo, this.mat.heart); pivot.add(heart);
      const spiral = new Chain(T, this.mat.pupil, pivot, this.unit);
      const lidGeoT = this.geoCache.get('lidT') || this._own(new T.SphereGeometry(ER + LAYER.lid, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2));
      const lidGeoB = this.geoCache.get('lidB') || this._own(new T.SphereGeometry(ER + LAYER.lid, 48, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2));
      this.geoCache.set('lidT', lidGeoT); this.geoCache.set('lidB', lidGeoB);
      const lidT = new T.Mesh(lidGeoT, clipMats.lid), lidB = new T.Mesh(lidGeoB, clipMats.lid); ball.add(lidT, lidB);
      // A thin crease along each lid edge, like the 2-D lid line.
      const creaseGeo = this.geoCache.get('crease') || this._own(new T.TorusGeometry(ER + LAYER.lid + .06, .17, 6, 96)); this.geoCache.set('crease', creaseGeo);
      for (const lid of [lidT, lidB]) { const c = new T.Mesh(creaseGeo, clipMats.crease); c.rotation.x = Math.PI / 2; lid.add(c); }
      const outlineMat = this._std({color: this.frame, transparent: true, opacity: 0});
      const outline = new T.Mesh(this._own(new T.TorusGeometry(EYEBALL.base, .55, 10, 56)), outlineMat); outline.position.set(c.x, -c.y, 0); g.add(outline);
      return {g, ball, white, backShell, pivot, pupil, shines, heart, spiral, lidT, lidB, outline, outlineMat, c, capKey: 1, clip};
    });
    this.bridge = new Chain(T, this.mat.frame, body, this.unit);
    this.coil = new Chain(T, this.mat.frame, body, this.unit);
    this.brows = [0, 1].map(() => new Chain(T, this.mat.frame, body, this.unit));
    this.arms = [0, 1].map(() => new Chain(T, this.mat.frame, body, this.unit));
    this.blush = [0, 1].map(() => { const m = new T.Mesh(this.unit.sph, this.mat.blush); body.add(m); return m; });
    this.propsGroup = new T.Group(); body.add(this.propsGroup);
    this.fxGroup = new T.Group(); root.add(this.fxGroup);
  }

  /** Spherical cap whose base circle is the eye's rim seat: 'front' bulges toward the viewer, 'back' away. */
  _dome(side) {
    const key = 'dome:' + side;
    if (!this.geoCache.has(key)) {
      const T = this.T, {base, r, back} = EYEBALL;
      let g;
      if (side === 'front') { g = new T.SphereGeometry(r, 64, 18, 0, Math.PI * 2, 0, Math.asin(base / r)); g.rotateX(Math.PI / 2); }
      else { const rb = (base * base + back * back) / (2 * back); g = new T.SphereGeometry(rb, 64, 8, 0, Math.PI * 2, 0, Math.asin(base / rb)); g.rotateX(-Math.PI / 2); g.translate(0, 0, rb - back); }
      this.geoCache.set(key, this._own(g));
    }
    return this.geoCache.get(key);
  }

  _place(obj, L) {
    obj.position.set(L.x, -L.y, L.z || 0);
    obj.rotation.set(-L.tilt * DEG, L.turn * DEG, -L.rot * DEG, 'ZYX');
    const s = L.s ?? 1; obj.scale.set(s * (L.sx ?? 1), s * (L.sy ?? 1), s);
  }

  render(p, fx = []) {
    const T = this.T, B = p.body;
    this.body.position.set(B.x, -B.y, B.z || 0);
    this.body.rotation.set(-B.tilt * DEG, B.turn * DEG, -B.rot * DEG, 'ZYX');
    this.body.scale.set(B.sx, B.sy, (Math.abs(B.sx) + Math.abs(B.sy)) / 2);
    const k = clamp(1 - Math.max(0, -B.y) / 22, .25, 1) * (this.showShadow ? p.shadow : 0);
    this.shadow.visible = k > .01; this.shadow.position.x = B.x; this.shadow.scale.set(36 * k * Math.abs(B.sx), 14 * k, 1); this.shadow.material.opacity = .8 * k;

    for (let i = 0; i < 2; i++) {
      const L = p.lens[i], lens = this.lenses[i], e = this.eyes[i], E = p.eyeT[i];
      this._place(lens.g, L); lens.spin.rotation.z = -(L.spin || 0) * DEG; lens.g.updateMatrix();
      this._place(e.g, E);
      e.outline.visible = E.outline > .02; e.outlineMat.opacity = E.outline;
      this._eye(e, p.pupil[i], p.lid[i], i);
      // Blush under the frame.
      const bl = lensPoint(L, (i ? 1 : -1) * 3.2, 11.6), m = this.blush[i];
      m.visible = p.blush > .02; m.position.set(bl.x, -bl.y, 1.4 + (L.z || 0)); m.scale.set(2.8 * L.s, 1.2 * L.s, .5);
      // Brows float just in front of the rim plane.
      const bw = browGeometry(L, p.brow[i], i), bo = this.showBrows ? p.brow[i].o : 0;
      this.brows[i].set(quad(bw.a, bw.c, bw.b, 8, 1.6 + (L.z || 0)), .8 * L.s * Math.sqrt(clamp(bo)));
      this._arm(i, L, p.arm[i], lens.g);
    }
    this.mat.blush.opacity = .8 * p.blush;
    const bo = p.bridge.o * (1 - p.bridge.coil), zb = (p.lens[0].z + p.lens[1].z) / 2;
    if (bo > .02) { const g = bridgeGeometry(p); this.bridge.set(quad(g.a, g.c, g.b, 12, zb), .46 * clamp(bo * 1.5)); } else this.bridge.set([], 0);
    if (p.bridge.coil > .02) {
      const a = lensPoint(p.lens[0], 9.2, -.5), b = lensPoint(p.lens[1], -9.4, .4);
      this.coil.set(coilPoints(a, b, 4.5, 2.3, 90).map(q => ({x: q.x, y: -q.y, z: q.z + zb})), .45 * clamp(p.bridge.coil * 1.5));
    } else this.coil.set([], 0);
    this._props(p);
    this._fx(fx);
    this.scene.updateMatrixWorld();
    for (const e of this.eyes) e.clip.set(this.tmp.set(0, 0, 1), -EYE_CLIP).applyMatrix4(e.ball.matrixWorld);
    this.gl.render(this.scene, this.camera);
  }

  _eye(e, q, L, i) {
    const R = ER, round = 1 - Math.max(q.heart, q.spiral), size = q.size * (.35 + .65 * round);
    // Pupil direction on the sphere from the 2-D pupil offset.
    const dx = q.x - e.c.x, dy = q.y - e.c.y, dz = Math.sqrt(Math.max(1, R * R - dx * dx - dy * dy));
    this.tmp.set(dx, -dy, dz).normalize(); e.pivot.quaternion.setFromUnitVectors(this.tmp2.set(0, 0, 1), this.tmp);
    const key = Math.round(size * 20);
    if (key !== e.capKey) { e.pupil.geometry = this._cap(size); e.capKey = key; }
    e.pupil.visible = round > .05;
    SHINES.forEach((s, k) => {
      const m = e.shines[k], x = s.x * size, y = -s.y * size, z = Math.sqrt(Math.max(1, R * R - x * x - y * y)) + LAYER.shine - .03;
      m.visible = round > .3; m.position.set(x, y, z); this.tmp.set(x, y, z).normalize(); m.quaternion.setFromUnitVectors(this.tmp2.set(0, 0, 1), this.tmp);
      m.scale.set(s.r * size, s.r * size, .05);
    });
    const hk = q.heart * q.size; e.heart.visible = q.heart > .02; e.heart.scale.set(hk, hk, 1);
    if (q.spiral > .02) {
      const sp = SPIRAL_PTS, rot = -q.spin * DEG, cs = Math.cos(rot), sn = Math.sin(rot), Rr = R - .2;
      const pts = sp.filter((_, k) => k % 2 === 0).map(v => { const x = (v.x * cs - v.y * sn) * q.size, y = -(v.x * sn + v.y * cs) * q.size; return {x, y, z: Math.sqrt(Math.max(1, Rr * Rr - x * x - y * y))}; });
      e.spiral.set(pts, .3 * q.spiral);
    } else e.spiral.set([], 0);
    // Lid shells: the visible lid edge sits at height ∓R·sin(angle).
    const tilt = -(i ? -L.tilt : L.tilt) * DEG;
    e.lidT.visible = L.top > .03; e.lidB.visible = L.bot > .03;
    e.lidT.rotation.set(Math.asin(clamp((2 * L.top - 1) * LID_K * 1.08, -1, 1)), 0, tilt, 'ZXY');
    e.lidB.rotation.set(Math.asin(clamp((1 - 2 * L.bot) * LID_K * 1.08, -1, 1)), 0, 0, 'ZXY');
  }

  _arm(i, L, A, lensGroup) {
    // Temples exist only while an action uses them; at rest the glasses show no legs at all.
    if (A.ext < .03) { this.arms[i].set([], 0); return; }
    const T = this.T, at = armAttach(A, i), g = armGeometry(L, A, i);
    // The root is the same rim point the 2-D arm grows from, inside the frame's thickness.
    const S = new T.Vector3().copy(this.tmp.set(at.u, -at.v, 0).applyMatrix4(lensGroup.matrix));
    const f = A.fwd * Math.PI / 2, cf = Math.cos(f), v = new T.Vector3(g.dir.x * cf, -g.dir.y * cf, Math.sin(f)).normalize();
    // Length chosen so the tip lands where the 2-D tip is drawn, however far it reaches toward the viewer.
    const len = Math.max(g.len / Math.max(cf, .3), .5), E = S.clone().addScaledVector(v, len);
    const mid = S.clone().add(E).multiplyScalar(.5).add(new T.Vector3(g.M.x - (g.S.x + g.E.x) / 2, -(g.M.y - (g.S.y + g.E.y) / 2), 0));
    const H = E.clone().add(new T.Vector3(g.H.x - g.E.x, -(g.H.y - g.E.y), 0)), hc = E.clone().addScaledVector(v, E.distanceTo(H) * .5);
    // One smooth curve: shaft (S → E) then the hooked tip (E → H). No kinks, no visible joints.
    const bez = (a, c, b, n, from = 0) => Array.from({length: n + 1 - from}, (_, k) => { const t = (k + from) / n, u = 1 - t; return {x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y, z: u * u * a.z + 2 * u * t * c.z + t * t * b.z}; });
    const pts = bez(S, mid, E, 10).concat(bez(E, hc, H, 6, 1));
    this.arms[i].set(pts, .5 * A.w * L.s * Ease.out(clamp(A.ext * 4)));
  }

  _props(p) {
    const T = this.T, seen = new Set();
    for (const q of p.props) {
      const key = q.key || q.t, type = q.t === 'glyph' ? 'g:' + q.kind : q.t;
      seen.add(key);
      let rec = this.props.get(key);
      if (!rec || rec.type !== type) {
        if (rec) this._dropProp(rec);
        rec = {type};
        if (q.t === 'glyph') rec.node = this._glyph(q.kind, this.propsGroup);
        else if (q.t === 'line') rec.chain = new Chain(T, this._matFor(q.color || 'frame'), this.propsGroup, this.unit);
        else if (q.t === 'ring') {
          // Orbits never hide what rides on them: drawn first and without writing depth.
          const m = this._matFor(q.color || 'frame').clone(); m.depthWrite = false; rec.mat = m;
          rec.node = new T.Mesh(this.unit.sph, m); rec.node.renderOrder = -1; this.propsGroup.add(rec.node);
        }
        else if (q.t === 'cyl') { rec.node = new T.Mesh(this.unit.sph, this._matFor(q.color || 'frame')); this.propsGroup.add(rec.node); }
        else if (q.t === 'blob') rec.node = null;
        this.props.set(key, rec);
      }
      const o = clamp(q.o);
      if (q.t === 'glyph') {
        const n = rec.node; n.position.set(q.x, -q.y, (q.z || 0) + 1); n.rotation.set(0, 0, -(q.rot || 0) * DEG); n.scale.setScalar(Math.max(.001, q.s));
        n.userData.mats.forEach((m, k) => { m.opacity = o; if (k === 0 && q.color) m.color.set(color(q.color, this.frame)); });
      } else if (q.t === 'line') {
        const pts = q.pts.map(v => ({x: v.x, y: -v.y, z: v.z ?? -.6}));
        rec.chain.set(q.closed ? pts.concat([pts[0]]) : pts, (q.w || 1) / 2 * o);
      } else if (q.t === 'ring') {
        const ratio = Math.round(clamp((q.w || 1) / 2 / Math.max(q.r, .1), .01, .25) * 400) / 400, gk = 'ring:' + ratio;
        if (!this.geoCache.has(gk)) this.geoCache.set(gk, this._own(new T.TorusGeometry(1, ratio, 12, 120)));
        rec.node.geometry = this.geoCache.get(gk);
        rec.node.position.set(q.x, -q.y, 0); rec.node.rotation.set(-q.tilt * DEG, 0, -q.rot * DEG, 'ZYX'); rec.node.scale.setScalar(Math.max(.001, q.r));
        rec.mat.transparent = o < .999; rec.mat.opacity = o;
      } else if (q.t === 'cyl') {
        // Tapered cylinder from a to b; geometry is shared per taper ratio.
        const n = rec.node, taper = Math.round(clamp(q.r2 / (q.r1 || 1), .05, 4) * 20) / 20, gk = 'cyl:' + taper;
        if (!this.geoCache.has(gk)) this.geoCache.set(gk, this._own(new T.CylinderGeometry(taper, 1, 1, 44, 1, false)));
        n.geometry = this.geoCache.get(gk);
        const a = this.tmp.set(q.a.x, -q.a.y, q.a.z || 0), b = this.tmp2.set(q.b.x, -q.b.y, q.b.z || 0);
        n.position.addVectors(a, b).multiplyScalar(.5);
        const d = b.sub(a), len = d.length();
        if (len > 1e-4) n.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.multiplyScalar(1 / len));
        n.scale.set(q.r1 * o || .001, Math.max(len, .01), q.r1 * o || .001);
      } else if (q.t === 'blob') {
        if (rec.d !== q.d) {
          if (rec.node) { this.propsGroup.remove(rec.node); rec.node.geometry.dispose(); }
          const geo = new T.ExtrudeGeometry(parsePath(q.d).map(sp => this._shape(sp)), {depth: 1, bevelEnabled: true, bevelThickness: .2, bevelSize: .15, bevelSegments: 2});
          rec.node = new T.Mesh(geo, this._matFor(q.fill || 'frame')); rec.d = q.d; this.propsGroup.add(rec.node);
        }
        rec.node.position.z = -1.2; rec.node.scale.setScalar(Math.max(.001, o));
      }
    }
    for (const [key, rec] of this.props) if (!seen.has(key)) { this._dropProp(rec); this.props.delete(key); }
  }
  _dropProp(rec) {
    if (rec.chain) this.propsGroup.remove(rec.chain.g);
    else if (rec.type.startsWith('g:')) this._dropGlyph(rec.node);
    else if (rec.node) { this.propsGroup.remove(rec.node); if (rec.type === 'blob') rec.node.geometry.dispose(); rec.mat?.dispose(); }
  }

  _fx(list) {
    let i = 0;
    for (const q of list) {
      let g = this.fxPool[i];
      if (!g || g.userData.kind !== q.kind) { if (g) this._dropGlyph(g); g = this.fxPool[i] = this._glyph(q.kind, this.fxGroup); }
      g.visible = true;
      g.position.set(q.x, -q.y, (q.layer === 'back' ? -7 : 5) + (q.z || 0));
      g.rotation.set(0, Math.sin(q.rot * DEG) * .6, -q.rot * DEG);
      g.scale.setScalar(Math.max(.001, q.s));
      g.userData.mats.forEach((m, k) => { m.opacity = clamp(q.o); if (k === 0 && q.color) m.color.set(color(q.color, this.frame)); });
      i++;
    }
    for (; i < this.fxPool.length; i++) this.fxPool[i].visible = false;
  }

  setZoom(z) { this.zoom = z; this.resize(); }
  setLabel(text) { this.canvas.setAttribute('aria-label', text); }
  resize() {
    const w = Math.max(1, this.host.clientWidth), h = Math.max(1, this.host.clientHeight), f = 1 + this.bleed * 2;
    this.gl.setSize(Math.round(w * f), Math.round(h * f), false);
    const aspect = w / h, H = 64 / this.zoom * f / Math.min(1, aspect), D = H / (2 * Math.tan(13 * DEG));
    // A tight near/far range around the character keeps the thin eye layers free of depth fighting.
    this.camera.near = Math.max(1, D - 140); this.camera.far = D + 240;
    this.camera.aspect = aspect; this.camera.position.set(0, D * .085, D); this.camera.lookAt(0, -1.5, 0); this.camera.updateProjectionMatrix();
  }
  screenToChar(x, y) {
    const r = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(new this.T.Vector2((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height * 2 - 1)), this.camera);
    const hit = this.ray.ray.intersectPlane(this.plane, this.tmp);
    return hit ? {x: hit.x, y: -hit.y} : {x: 0, y: 0};
  }
  charToScreen(x, y) {
    const r = this.canvas.getBoundingClientRect(), v = this.tmp.set(x, -y, 0).project(this.camera);
    return {x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height};
  }
  pxPerUnit() { const a = this.charToScreen(0, 0), b = this.charToScreen(10, 0); return Math.hypot(b.x - a.x, b.y - a.y) / 10; }
  destroy() {
    for (const rec of this.props.values()) this._dropProp(rec);
    this.fxPool.forEach(g => this._dropGlyph(g));
    this.owned.forEach(x => x.dispose?.());
    this.gl.dispose(); this.canvas.remove();
    if (this._restorePosition) this.host.style.position = '';
  }
}
