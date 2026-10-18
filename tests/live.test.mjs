import assert from 'node:assert/strict';
import {GeekyBrain, EXPRESSIONS, neutralPose} from '../src/live/brain.mjs';
import {ACTIONS, ACTION_LIST, ALIASES, GROUPS, resolveAction} from '../src/live/actions.mjs';
import {PATHS, GLYPHS, SPIRAL, HEART, parsePath, samplePath, capsulePath, ellipsePath, coilPoints, armGeometry, armAttach, rimRadius, reachArm, projectDepth, BASE, DEG} from '../src/live/core.mjs';
import {STATE_META, ALIASES as V1_ALIASES} from '../src/geeky-player.mjs';
import '../src/live/three-renderer.mjs';
import '../src/live/svg-renderer.mjs';

let tests = 0;
async function test(name, fn) { await fn(); tests++; console.log('PASS', name); }
const finite = (v, path = 'pose') => {
  if (typeof v === 'number') assert.ok(Number.isFinite(v), `${path} is not finite`);
  else if (Array.isArray(v)) v.forEach((x, i) => finite(x, `${path}[${i}]`));
  else if (v && typeof v === 'object') for (const k in v) if (typeof v[k] !== 'string') finite(v[k], `${path}.${k}`);
};
const run = (brain, seconds, dt = 1 / 60) => { let p; for (let i = 0; i < Math.round(seconds / dt); i++) p = brain.update(dt); return p; };

await test('classic nine states and v1 aliases carry over', () => {
  for (const id of Object.keys(STATE_META)) assert.ok(ACTIONS[id], `missing classic state ${id}`);
  for (const [alias, id] of Object.entries(V1_ALIASES)) assert.equal(resolveAction(alias).id, id);
  for (const id of Object.values(ALIASES)) assert.ok(ACTIONS[id]);
  assert.throws(() => resolveAction('nope'), RangeError);
});

await test('every action has metadata and a known group', () => {
  assert.ok(ACTION_LIST.length >= 36);
  for (const a of ACTION_LIST) {
    assert.ok(a.label && a.description, a.id);
    assert.ok(GROUPS[a.group], `${a.id} group ${a.group}`);
    assert.ok(a.duration > 0 && a.duration <= 10);
  }
});

await test('every action stays finite, bounded and ends correctly', () => {
  for (const a of ACTION_LIST) {
    const b = new GeekyBrain({seed: 11, autonomous: false});
    b.lookAt(14, -9);
    b.play(a.id);
    for (let i = 0; i < Math.round((a.duration + .8) * 60); i++) {
      const p = b.update(1 / 60); finite(p, a.id); finite(b.fx(), `${a.id}.fx`);
      for (const L of p.lens) assert.ok(Math.abs(L.x + p.body.x) < 70 && Math.abs(L.y + p.body.y) < 70, `${a.id} lens out of bounds`);
      for (const q of p.pupil) assert.ok(Math.hypot(q.x, q.y) <= 6.5, `${a.id} pupil escaped the eye`);
      for (const L of p.lid) assert.ok(L.top + L.bot <= 1.0001);
    }
    const s = b.getState();
    if (a.loop) assert.equal(s.action, a.id, `${a.id} should keep looping`);
    else if (ACTIONS[a.id].hold) assert.equal(s.action, a.id, `${a.id} should hold its last frame`);
    else assert.equal(s.action, 'idle', `${a.id} should return to idle`);
  }
});

await test('one-shots resolve their promise as completed', async () => {
  const b = new GeekyBrain({seed: 2, autonomous: false});
  let result = null; b.play('nod').then(r => { result = r; });
  run(b, 1.5); await Promise.resolve();
  assert.deepEqual(result, {id: 'nod', completed: true});
  let interrupted = null; b.play('celebrate').then(r => { interrupted = r; }); run(b, .2); b.play('sad'); await Promise.resolve();
  assert.deepEqual(interrupted, {id: 'celebrate', completed: false});
});

await test('same seed, same performance', () => {
  const a = new GeekyBrain({seed: 42}), b = new GeekyBrain({seed: 42});
  for (const x of [a, b]) { x.play('jumping'); x.lookAt(5, 5); }
  for (let i = 0; i < 240; i++) assert.deepEqual(a.update(1 / 60), b.update(1 / 60));
});

await test('rapid interruptions mid-blend stay finite', () => {
  const b = new GeekyBrain({seed: 5});
  const ids = ACTION_LIST.map(a => a.id);
  for (let i = 0; i < 200; i++) { if (i % 7 === 0) b.play(ids[i % ids.length]); finite(b.update(1 / 60)); }
});

await test('reduced motion is static and particle-free', () => {
  const b = new GeekyBrain({seed: 1, reduced: true});
  b.play('celebrate');
  const first = JSON.stringify(b.update(1 / 60));
  for (let i = 0; i < 30; i++) assert.equal(JSON.stringify(b.update(1 / 60)), first);
  assert.equal(b.particles.length, 0);
  run(b, 3); assert.equal(b.getState().action, 'idle');
});

await test('poke, drag, impact and hand-spin settle back to rest', () => {
  const b = new GeekyBrain({seed: 9, autonomous: false});
  run(b, .5); b.poke(-12, 2); b.setDrag(true, 800, -300); run(b, .3); b.setDrag(false); b.impact(1.5);
  b.spinBy(250, 30); b.releaseSpin();
  const p = run(b, 4);
  finite(p); assert.ok(Math.abs(b.spin.yaw) < .5 && Math.abs(b.spin.pitch) < .5, 'spin should settle');
  assert.ok(Math.abs(p.body.rot) < 4, 'swing should settle');
});

await test('expressions and moods apply cleanly', () => {
  for (const name of Object.keys(EXPRESSIONS)) {
    const b = new GeekyBrain({seed: 3, autonomous: false}); b.setMood(name); finite(run(b, 1), name);
  }
  assert.throws(() => new GeekyBrain().setMood('grumpy'), RangeError);
});

await test('gaze follows a target and converges on near points', () => {
  const b = new GeekyBrain({seed: 4, autonomous: false});
  b.lookAt(40, 0); let p = run(b, 1);
  assert.ok(p.pupil[0].x > 2 && p.pupil[1].x > 2, 'both pupils look right');
  b.lookAt(0, -2, 6); p = run(b, 1);
  assert.ok(p.pupil[0].x > 0 && p.pupil[1].x < 0, 'pupils cross for a point between the eyes');
});

await test('particles are capped', () => {
  const b = new GeekyBrain({seed: 6});
  for (let i = 0; i < 12; i++) { b.play('celebrate', {restart: true}); run(b, .55); }
  assert.ok(b.particles.length <= 160);
});

await test('autonomous idle plays fidgets and returns', () => {
  const b = new GeekyBrain({seed: 8, autonomous: true});
  const seen = new Set(); b.on('fidget', d => seen.add(d.id));
  run(b, 60, 1 / 30);
  assert.ok(seen.size >= 1, 'at least one fidget');
});

await test('shared geometry and glyph paths parse and sample', () => {
  const all = [...PATHS, SPIRAL, HEART, capsulePath(0, 0, 4, 9, 2, 3), ellipsePath(0, 0, 10, 4, 30), ...Object.values(GLYPHS).flatMap(g => g.map(p => p.d))];
  for (const d of all) for (const sp of samplePath(d)) { assert.ok(sp.pts.length >= 2); finite(sp.pts); }
  assert.equal(parsePath(PATHS[0]).length, 1);
  assert.equal(coilPoints({x: 0, y: 0}, {x: 10, y: 0}).length, 97);
  const L = {...BASE[1], z: 0, rot: 10, s: 1, sx: 1, sy: 1, turn: 0, tilt: 0}, A = {ext: 0, ang: 0, bend: 30, fwd: 0, w: 1};
  const r = reachArm(L, 1, 26, -14); Object.assign(A, r);
  const g = armGeometry(L, A, 1);
  assert.ok(Math.hypot(g.E.x - 26, g.E.y + 14) < .01, 'reach puts the temple tip on target');
  finite(neutralPose());
});

const angDiff = (a, b) => Math.abs(((a - b) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
const armDir = (A, i) => Math.atan2(-Math.sin(A.ang * DEG), (i ? 1 : -1) * Math.cos(A.ang * DEG));

await test('arms always grow out of the frame band, radially once extended', () => {
  for (let i = 0; i < 2; i++) {
    const outer = samplePath(PATHS[i * 2])[0].pts, inner = samplePath(PATHS[i * 2 + 1])[0].pts;
    for (let k = 0; k < 72; k++) {
      const r = rimRadius(i, k * 5 * DEG);
      assert.ok(r > 8.4 && r < 10.2, `lens ${i} band radius ${r}`);
    }
    assert.ok(outer.length && inner.length);
  }
  for (const a of ACTION_LIST) {
    const b = new GeekyBrain({seed: 12, autonomous: false}); b.play(a.id);
    for (let f = 0; f < Math.round(a.duration * 60); f++) {
      const p = b.update(1 / 60);
      p.arm.forEach((A, i) => {
        const at = armAttach(A, i), r = Math.hypot(at.u, at.v);
        assert.ok(Math.abs(r - rimRadius(i, at.angle)) < 1e-6, `${a.id}: attach off the rim`);
        if (A.ext >= .45 && A.pin < .01) assert.ok(angDiff(at.angle, armDir(A, i)) < 1 * DEG, `${a.id}: arm not radial`);
        if (A.pin > .999) assert.ok(angDiff(at.angle, A.at * DEG) < .5 * DEG, `${a.id}: pinned attach moved`);
      });
    }
  }
});

await test('flutter glides without wobble once under way', () => {
  for (const id of ['running-right', 'running-left']) {
    const b = new GeekyBrain({seed: 1, autonomous: false}); b.play(id); run(b, 1.2);
    const span = {rot: [], y: [], x: [], turn: []};
    for (let f = 0; f < 120; f++) { const p = b.update(1 / 60); span.rot.push(p.body.rot); span.y.push(p.body.y); span.x.push(p.body.x); span.turn.push(p.lens[0].turn); }
    const range = v => Math.max(...v) - Math.min(...v);
    assert.ok(range(span.rot) < 2.5 && range(span.y) < .6 && range(span.x) < .4 && range(span.turn) < .5, `${id} wobbles: ${JSON.stringify(Object.fromEntries(Object.entries(span).map(([k, v]) => [k, range(v).toFixed(2)])))}`);
    assert.ok(Math.sign(b.last.body.turn) === (id === 'running-right' ? 1 : -1), 'faces the direction of travel');
  }
});

await test('closer look holds a magnifier handle straight out from the lens centre', () => {
  const b = new GeekyBrain({seed: 2, autonomous: false}); b.play('review'); const p = run(b, 1.5), A = p.arm[1];
  const at = armAttach(A, 1), g = armGeometry(p.lens[1], A, 1);
  assert.ok(A.pin > .99 && A.ext > .9 && A.w > 2.5);
  assert.ok(angDiff(at.angle, armDir(A, 1)) < .5 * DEG, 'handle is radial');
  const fromCentre = Math.atan2(g.E.y - p.lens[1].y, g.E.x - p.lens[1].x);
  assert.ok(angDiff(fromCentre, at.angle) < 2 * DEG, 'handle points away from the lens centre');
});

await test('closer look stays steady while the cursor moves', () => {
  const b = new GeekyBrain({seed: 4, autonomous: false}); b.play('review'); run(b, 1.2);
  const tips = [];
  for (let f = 0; f < 180; f++) {
    b.lookAt(40 * Math.sin(f / 9), 25 * Math.cos(f / 7));
    const p = b.update(1 / 60), g = armGeometry(p.lens[1], p.arm[1], 1);
    tips.push({x: p.body.x + g.E.x, y: p.body.y + g.E.y, turn: p.body.turn});
  }
  const range = k => Math.max(...tips.map(q => q[k])) - Math.min(...tips.map(q => q[k]));
  assert.ok(range('x') < 1.6 && range('y') < 1.6, `handle tip drifts ${range('x').toFixed(2)}, ${range('y').toFixed(2)}`);
  assert.ok(range('turn') < 6, `head turns ${range('turn').toFixed(1)} degrees`);
});

await test('orbit lenses ride compact orbits in front of the rings', () => {
  const b = new GeekyBrain({seed: 4, autonomous: false}); b.play('running'); run(b, 1.2);
  for (let f = 0; f < 180; f++) {
    const p = b.update(1 / 60);
    for (const L of p.lens) { assert.ok(L.z > 0, 'lens in front of the orbit plane'); assert.ok(Math.hypot(L.x, L.y) < 14.5, 'compact orbit'); assert.ok(L.s < .56); }
    for (const q of p.props.filter(q => q.t === 'ring')) assert.ok(q.r <= 14.2 && q.w <= .6, 'slim, compact rings');
  }
});

await test('binoculars build depth geometry that projects consistently', () => {
  const b = new GeekyBrain({seed: 2, autonomous: false}); b.play('searching'); const p = run(b, 1.2);
  const cyl = p.props.filter(q => q.t === 'cyl');
  assert.deepEqual(new Set(cyl.map(q => q.key.replace(/\d$/, ''))), new Set(['cup', 'barrel', 'hinge', 'wheel']));
  for (const q of cyl) { finite(q); assert.ok(q.b.z <= q.a.z + 1e-9 || q.key === 'hinge' || q.key === 'wheel'); }
  const front = projectDepth(0, 0, 0, 0, 0), back = projectDepth(0, 0, -10, 0, 0);
  assert.ok(back.y < front.y, 'farther points sit higher, as seen from slightly above');
  assert.ok(projectDepth(0, 0, -10, 30, 0).x < 0, 'turning right swings the back of the barrels left');
});

console.log(JSON.stringify({ok: true, tests, scope: 'Node checks of the Geeky Live brain, actions and geometry; renderers are verified in a browser'}));
