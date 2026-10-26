import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from 'three';
import {createGeekyModel, MODEL_THREE_KEYS, MODEL_PALETTE, DETAIL} from '@guategeeks/geeky/model';
import {ThreeRenderer} from '@guategeeks/geeky/three';
import {FRAME} from '@guategeeks/geeky/core';

const meshes = group => { const out = []; group.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const rimColour = model => Array.from(model.renderer.lenses[0].spin.children[0].geometry.attributes.color.array.slice(0, 3));
const near = (actual, expected) => actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-6, `${actual} ≉ ${expected}`));

test('builds headless with two materials', () => {
  const model = createGeekyModel({THREE, reduced: true});
  assert.equal(model.materials().length, 2);
  assert.equal(model.group.name, 'geeky-model');
  assert.ok(meshes(model.group).length > 0);
  assert.equal(model.renderer.canvas, undefined);
  assert.equal(model.renderer.gl, null);
  model.dispose();
});

test('step keeps every mesh finite and the materials at two', () => {
  const model = createGeekyModel({THREE});
  model.brain.play('celebrate');
  for (let i = 0; i < 120; i++) model.step(1 / 60);
  for (const mesh of meshes(model.group)) for (const v of [...mesh.position.toArray(), ...mesh.scale.toArray()]) assert.ok(Number.isFinite(v));
  const used = new Set(meshes(model.group).map(m => m.material));
  assert.equal(used.size, 2);
  assert.deepEqual([...used].sort((a, b) => a.id - b.id), [...model.materials()].sort((a, b) => a.id - b.id));
  model.dispose();
});

test('default palette paints the rims FRAME', () => {
  const model = createGeekyModel({THREE, reduced: true});
  const c = new THREE.Color(FRAME);
  near(rimColour(model), [c.r, c.g, c.b]);
  assert.equal(MODEL_PALETTE.frame, FRAME);
  model.dispose();
});

test('palette.frame recolours the rims', () => {
  const model = createGeekyModel({THREE, reduced: true, palette: {frame: '#ff0000'}});
  near(rimColour(model), [1, 0, 0]);
  assert.equal(model.materials().length, 2);
  model.dispose();
});

test('rejects non-hex palette values and ignores unknown keys', () => {
  for (const frame of ['var(--x)', 'rgb(0,0,0)', undefined, 12]) {
    assert.throws(() => createGeekyModel({THREE, palette: {frame}}), {name: 'TypeError', message: /palette\.frame/});
  }
  createGeekyModel({THREE, palette: {costume: 'x', lid: '#abc'}}).dispose();
});

test('reports missing THREE members', () => {
  assert.throws(() => createGeekyModel({THREE: {...THREE, Color: undefined}}), {name: 'TypeError', message: /THREE\.Color is missing/});
  assert.throws(() => createGeekyModel({}), {name: 'TypeError', message: /THREE/});
});

test('MODEL_THREE_KEYS is sufficient', () => {
  const narrow = Object.fromEntries(MODEL_THREE_KEYS.map(k => [k, THREE[k]]));
  const model = createGeekyModel({THREE: narrow});
  model.brain.play('tech-deploy');
  for (let i = 0; i < 90; i++) model.step(1 / 30);
  model.dispose();
});

test('detail overrides the geometry budget', () => {
  const coarse = createGeekyModel({THREE, reduced: true, detail: {rimPoints: 12}});
  const fine = createGeekyModel({THREE, reduced: true});
  const verts = m => m.renderer.lenses[0].spin.children[0].geometry.attributes.position.count;
  assert.ok(verts(coarse) < verts(fine));
  assert.equal(DETAIL.rimPoints, 26);
  coarse.dispose(); fine.dispose();
});

test('dispose is idempotent and detaches the group', () => {
  const parent = new THREE.Group();
  const model = createGeekyModel({THREE, reduced: true});
  parent.add(model.group);
  model.dispose();
  model.dispose();
  assert.equal(model.group.parent, null);
  model.step(1 / 60); // a step after dispose is ignored
});

test('windowed ThreeRenderer still needs a browser', () => {
  assert.throws(() => new ThreeRenderer(null, {THREE}));
});
