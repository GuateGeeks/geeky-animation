import assert from 'node:assert/strict';
import {GeekyBrain, EXPRESSIONS, neutralPose} from '../src/live/brain.mjs';
import {ACTIONS, ACTION_LIST, ALIASES, GROUPS, resolveAction} from '../src/live/actions.mjs';
import {PATHS, GLYPHS, SPIRAL, HEART, parsePath, samplePath, capsulePath, ellipsePath, coilPoints, armGeometry, reachArm, BASE} from '../src/live/core.mjs';
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

console.log(JSON.stringify({ok: true, tests, scope: 'Node checks of the Geeky Live brain, actions and geometry; renderers are verified in a browser'}));
