/* GEEKY LIVE / embeddable 3-D model.
   Geeky inside another three.js scene: the brain, the pose-to-mesh code and the shapes of ThreeRenderer,
   built headless into a Group of the host scene. The host's lights and its single WebGL context are used;
   THREE is injected (pass the namespace or just the MODEL_THREE_KEYS members) so the host controls the
   version and the bundle. Units are the character's own (a 64-unit stage); scale `group` to fit.

   Budget: exactly two materials at every moment, whatever the pose.
     M1  MeshStandardMaterial, matte, vertex colours: frame, eyes, pupils, back shells, lids, creases, hearts, brows.
         A tiny patch lets the lid shells be clipped per eye with a plane carried in a vertex attribute
         (the windowed renderer uses one clipped material per eye, which costs more materials).
     M2  MeshBasicMaterial, vertex colours with alpha: catchlights, blush and the particles' fade.
   Everything else the renderer creates (its own materials, outlines) is released at build time.
   First written as embedded.js for GuateGeeks/cotizador and the design system. */
import {ThreeRenderer} from './three-renderer.mjs';
import {GeekyBrain} from './brain.mjs';
import {FRAME, PALETTE, PATHS, C, EYEBALL, PUPIL_R, GLYPHS, color, parsePath} from './core.mjs';

/** Every THREE member the model touches; a namespace with just these is enough. */
export const MODEL_THREE_KEYS = Object.freeze([
  'Group', 'Mesh', 'Vector3', 'Plane', 'Shape', 'Path', 'ShapeUtils', 'ExtrudeGeometry', 'SphereGeometry', 'CylinderGeometry',
  'TorusGeometry', 'MeshStandardMaterial', 'MeshPhysicalMaterial', 'MeshBasicMaterial', 'DoubleSide', 'Color', 'Float32BufferAttribute'
]);

/** Geometry detail of the model, lower than the windowed renderer's. */
export const DETAIL = Object.freeze({
  rimPoints: 26, rimBevel: 1, dome: 22, domeRows: 4, lid: 22, lidRows: 4, crease: 18, cap: 14, radial: 5, ball: 3,
  glyphCurve: 2, maxFx: 8, armPoints: 5, browPoints: 3, bridgePoints: 5
});

/** Default colours; `palette` overrides any of them with a hex string. */
export const MODEL_PALETTE = Object.freeze({frame: FRAME, back: PALETTE.back, lid: PALETTE.lid3d, heart: PALETTE.heart, blush: PALETTE.blush});

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function checkThree(T) {
  if (!T || typeof T !== 'object') throw new TypeError('createGeekyModel: THREE is required');
  for (const key of MODEL_THREE_KEYS) if (T[key] === undefined) throw new TypeError(`createGeekyModel: THREE.${key} is missing`);
}

function mergePalette(palette) {
  const out = {...MODEL_PALETTE};
  for (const key of Object.keys(MODEL_PALETTE)) {
    if (!Object.hasOwn(palette, key)) continue;
    const value = palette[key];
    if (typeof value !== 'string' || !HEX.test(value)) throw new TypeError(`createGeekyModel: palette.${key} must be a hex colour, got ${String(value)}`);
    out[key] = value;
  }
  return out;
}

// ---------------------------------------------------------------- vertex colours
/** Vertex colour (RGB for M1, RGBA for M2); M1 geometries also carry `aPlane` (clip plane, inert by default). */
function tint(T, geometry, hex, alpha = null) {
  const c = new T.Color(hex), n = geometry.attributes.position.count, size = alpha === null ? 3 : 4, data = new Float32Array(n * size);
  for (let i = 0; i < n; i++) { data[i * size] = c.r; data[i * size + 1] = c.g; data[i * size + 2] = c.b; if (size === 4) data[i * size + 3] = alpha; }
  geometry.setAttribute('color', new T.Float32BufferAttribute(data, size));
  if (alpha === null) {
    const plane = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) plane[i * 4 + 3] = 1; // dot(0, p) + 1 >= 0: nothing is clipped
    geometry.setAttribute('aPlane', new T.Float32BufferAttribute(plane, 4));
  }
  return geometry;
}
function setAlpha(geometry, alpha) {
  const a = geometry.attributes.color;
  for (let i = 3; i < a.array.length; i += 4) a.array[i] = alpha;
  a.needsUpdate = true;
}
function setColor(T, geometry, hex) {
  const c = new T.Color(hex), a = geometry.attributes.color;
  for (let i = 0; i < a.array.length; i += 4) { a.array[i] = c.r; a.array[i + 1] = c.g; a.array[i + 2] = c.b; }
  a.needsUpdate = true;
}
function setPlane(geometry, plane) {
  const a = geometry.attributes.aPlane;
  for (let i = 0; i < a.array.length; i += 4) { a.array[i] = plane.normal.x; a.array[i + 1] = plane.normal.y; a.array[i + 2] = plane.normal.z; a.array[i + 3] = plane.constant; }
  a.needsUpdate = true;
}

function makeMaterials(T) {
  const m1 = new T.MeshStandardMaterial({vertexColors: true, roughness: .6, metalness: 0, side: T.DoubleSide});
  m1.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aPlane;\nvarying vec4 vPlane;\nvarying vec3 vWorldP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPlane = aPlane;\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vPlane;\nvarying vec3 vWorldP;')
      .replace('#include <clipping_planes_fragment>', 'if (dot(vPlane.xyz, vWorldP) + vPlane.w < 0.0) discard;\n#include <clipping_planes_fragment>');
  };
  m1.customProgramCacheKey = () => 'geeky-lid-plane';
  const m2 = new T.MeshBasicMaterial({vertexColors: true, transparent: true, depthWrite: false});
  return {m1, m2};
}

/** Before `_build()`: the renderer reads `this.mat.*`, `geoCache` and `unit` while it builds. */
function prepare(renderer, {m1, m2}, pal, D) {
  const T = renderer.T, own = x => renderer._own(x);
  own(m1); own(m2);
  const {base, r, back} = EYEBALL;
  const front = new T.SphereGeometry(r, D.dome, D.domeRows, 0, Math.PI * 2, 0, Math.asin(base / r)); front.rotateX(Math.PI / 2);
  const rb = (base * base + back * back) / (2 * back);
  const rear = new T.SphereGeometry(rb, D.dome, 2, 0, Math.PI * 2, 0, Math.asin(base / rb)); rear.rotateX(-Math.PI / 2); rear.translate(0, 0, rb - back);
  renderer.geoCache.set('dome:front', own(tint(T, front, '#ffffff')));
  renderer.geoCache.set('dome:back', own(tint(T, rear, pal.back)));
  renderer.geoCache.set('lidT', own(tint(T, new T.SphereGeometry(r + .6, D.lid, D.lidRows, 0, Math.PI * 2, 0, Math.PI / 2), pal.lid)));
  renderer.geoCache.set('lidB', own(tint(T, new T.SphereGeometry(r + .6, D.lid, D.lidRows, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), pal.lid)));
  renderer.geoCache.set('crease', own(tint(T, new T.TorusGeometry(r + .6 + .06, .17, 4, D.crease), pal.frame)));
  renderer._cap = function (size) {
    const key = 'cap' + Math.round(size * 20);
    if (!this.geoCache.has(key)) {
      const a = Math.asin(Math.min(.95, PUPIL_R * Math.round(size * 20) / 20 / r));
      const g = new T.SphereGeometry(r + .05, D.cap, 3, 0, Math.PI * 2, 0, a); g.rotateX(Math.PI / 2);
      this.geoCache.set(key, own(tint(T, g, '#000000')));
    }
    return this.geoCache.get(key);
  };
  renderer.unit.cyl.dispose(); renderer.unit.sph.dispose();
  renderer.unit.cyl = own(tint(T, new T.CylinderGeometry(1, 1, 1, D.radial, 1, true), pal.frame));
  renderer.unit.sph = own(tint(T, new T.SphereGeometry(1, D.radial, D.ball), pal.frame));
  Object.assign(renderer.mat, {frame: m1, white: m1, pupil: m1, back: m1, heart: m1, lid: m1, shine: m2, blush: m2});
}

/** After `_build()`: rims, lids, catchlights and blush on the shared materials; outlines out. */
function finish(renderer, {m1, m2}, pal, D) {
  const T = renderer.T;
  renderer.lenses.forEach(({spin}, i) => {
    // Evenly spaced points keep the Bézier outline of the source and cost far fewer triangles.
    const outline = renderer._shape(parsePath(PATHS[i * 2])[0], C[i].x, C[i].y).getSpacedPoints(D.rimPoints);
    let inner = renderer._shape(parsePath(PATHS[i * 2 + 1])[0], C[i].x, C[i].y, T.Path).getSpacedPoints(D.rimPoints);
    if (T.ShapeUtils.isClockWise(outline) === T.ShapeUtils.isClockWise(inner)) inner = inner.reverse(); // hole winds opposite its outline
    const shape = new T.Shape(outline);
    shape.holes.push(new T.Path(inner));
    const geometry = new T.ExtrudeGeometry(shape, {depth: 1.3, bevelEnabled: true, bevelThickness: .45, bevelSize: .32, bevelSegments: D.rimBevel, curveSegments: 1});
    geometry.translate(0, 0, -.65);
    const mesh = spin.children[0];
    mesh.geometry.dispose(); mesh.geometry = renderer._own(tint(T, geometry, pal.frame)); mesh.material = m1;
  });
  const catchlight = renderer._own(tint(T, new T.SphereGeometry(1, 7, 4), '#ffffff', 1));
  const blush = renderer._own(tint(T, new T.SphereGeometry(1, 8, 5), pal.blush, .8));
  renderer.eyes.forEach(eye => {
    eye.shines.forEach(mesh => { mesh.geometry = catchlight; mesh.material = m2; });
    if (!eye.heart.geometry.attributes.color) tint(T, eye.heart.geometry, pal.heart);
    eye.heart.material = m1;
    // Lids are clipped per eye: each eye owns its lid and crease geometry, which carry that eye's plane.
    const crease = renderer._own(eye.lidT.children[0].geometry.clone());
    eye.planeGeometries = [eye.lidT, eye.lidB].map(lid => {
      lid.geometry = renderer._own(lid.geometry.clone()); lid.material = m1;
      const ring = lid.children[0]; ring.geometry = crease; ring.material = m1;
      return lid.geometry;
    }).concat(crease);
    eye.outline.removeFromParent(); eye.outline = {visible: false}; eye.outlineMat = {opacity: 0};
  });
  renderer.blush.forEach(mesh => { mesh.geometry = blush; mesh.material = m2; });
  renderer.mat.blush = {set opacity(v) { if (blush.userData.alpha !== v) { blush.userData.alpha = v; setAlpha(blush, v); } }};
  // Release every other material and texture the renderer made while building.
  renderer.owned = renderer.owned.filter(x => {
    if ((x.isMaterial && x !== m1 && x !== m2) || x.isTexture) { x.dispose(); return false; }
    return true;
  });
}

/**
 * Effects and tube curves cost draw calls: glyphs become flat-coloured meshes of the shared M2 with per-instance
 * vertex colour and alpha, at most `maxFx` at once (oldest first), tubes keep fewer points, props stay off.
 */
function lighten(renderer, {m2}, D) {
  const T = renderer.T;
  renderer._props = () => {};
  renderer._glyphGeometry = function (kind) {
    const key = 'glyph:' + kind;
    if (this.geoCache.has(key)) return this.geoCache.get(key);
    let parts;
    if (kind === 'puff' || kind === 'dot') parts = [{geo: this._own(new T.SphereGeometry(1, 8, 5)), fill: GLYPHS[kind][0].fill}];
    else if (kind === 'ring') parts = [{geo: this._own(new T.TorusGeometry(1, .07, 4, 20)), fill: 'lavender'}];
    else parts = (GLYPHS[kind] || GLYPHS.dot).map(part => {
      const shapes = parsePath(part.d).map(sp => this._shape(sp));
      const geo = this._own(new T.ExtrudeGeometry(shapes, {depth: .7, bevelEnabled: false, curveSegments: D.glyphCurve}));
      geo.translate(0, 0, -.35);
      return {geo, fill: part.fill === 'none' ? part.stroke : part.fill};
    });
    this.geoCache.set(key, parts);
    return parts;
  };
  renderer._glyph = function (kind, parent) {
    const g = new T.Group();
    g.userData.kind = kind;
    g.userData.mats = this._glyphGeometry(kind).map(part => {
      const geo = tint(T, part.geo.clone(), color(part.fill, this.frame), 1);
      g.add(new T.Mesh(geo, m2));
      // Stand-in for the per-glyph material the windowed renderer creates: `_fx` sets opacity and colour on it.
      return {set opacity(v) { setAlpha(geo, v); }, color: {set: hex => setColor(T, geo, hex)}, dispose: () => geo.dispose()};
    });
    parent.add(g);
    return g;
  };
  const drawFx = renderer._fx.bind(renderer);
  renderer._fx = list => drawFx(list.length > D.maxFx ? list.slice(0, D.maxFx) : list);
  const thin = (chain, keep) => {
    const set = chain.set.bind(chain);
    chain.set = (pts, r) => {
      if (pts.length <= keep) return set(pts, r);
      const out = [];
      for (let i = 0; i < keep; i++) out.push(pts[Math.round(i * (pts.length - 1) / (keep - 1))]);
      return set(out, r);
    };
  };
  thin(renderer.bridge, D.bridgePoints);
  renderer.arms.forEach(chain => thin(chain, D.armPoints));
  renderer.brows.forEach(chain => thin(chain, D.browPoints));
}

/**
 * Geeky as a Group for a host scene. `step(dt)` advances the brain and poses the meshes (no GPU work;
 * the host renders). The palette is fixed at creation: to change colours, dispose and create again.
 */
export function createGeekyModel({THREE, seed = 7, reduced = false, palette = {}, detail = {}} = {}) {
  checkThree(THREE);
  const T = THREE, pal = mergePalette(palette ?? {}), D = {...DETAIL, ...detail};
  const group = new T.Group();
  group.name = 'geeky-model';
  const shared = makeMaterials(T);
  const renderer = new ThreeRenderer(null, {
    THREE: T, scene: group, lights: false, shadow: false, bleed: 0, frameColor: pal.frame,
    beforeBuild: r => prepare(r, shared, pal, D)
  });
  finish(renderer, shared, pal, D);
  // Frame colours live in vertex colours of shared materials here: recolouring needs a new model.
  renderer.setFrameColor = () => { throw new Error('createGeekyModel: the palette is fixed at creation; dispose the model and create it again'); };
  lighten(renderer, shared, D);
  // The pose code computes each eye's world-space lid plane at the end of render(); copy it to that eye's lid geometries.
  const draw = renderer.render.bind(renderer);
  renderer.render = (pose, fx) => {
    draw(pose, fx);
    for (const eye of renderer.eyes) if (eye.lidT.visible || eye.lidB.visible) eye.planeGeometries.forEach(g => setPlane(g, eye.clip));
  };

  const brain = new GeekyBrain({seed, autonomous: false, reduced});
  let disposed = false;
  return {
    group, brain, renderer,
    /** Advance the brain and redraw the pose into `group`. */
    step(dt) { if (!disposed) renderer.render(brain.update(dt), brain.fx()); },
    /** The only materials Geeky owns, at every moment. */
    materials: () => [shared.m1, shared.m2],
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const g of renderer.fxPool) renderer._dropGlyph(g);
      renderer.fxPool.length = 0;
      group.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
      renderer.owned.forEach(x => x.dispose?.());
      renderer.geoCache.clear();
      group.removeFromParent();
    }
  };
}
