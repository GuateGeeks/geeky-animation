import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GeekyActor} from '../src/live/actor.mjs';
import {GeekyBrain} from '../src/live/brain.mjs';
import {resolveAction} from '../src/live/actions.mjs';
import {SvgRenderer} from '../src/live/svg-renderer.mjs';

// Actors are built without a DOM, as in live.test.mjs: the prototype with stub renderer and mount.
function stubActor(opts = {}) {
  const mounts = [], labels = [];
  const actor = Object.assign(Object.create(GeekyActor.prototype), {
    opts: {renderer: 'svg', label: 'Geeky', frameColor: '#34314f', ...opts}, listeners: new Map(), _destroyed: false,
    brain: new GeekyBrain({seed: 3, autonomous: true}),
    renderer: {kind: 'svg', destroy() {}, setLabel: t => labels.push(t)},
    _kick() {}
  });
  actor._mount = kind => { mounts.push({kind, frameColor: actor.opts.frameColor}); actor.renderer = {kind, destroy() {}, setLabel: t => labels.push(t)}; };
  return {actor, mounts, labels};
}

test('setFrameColor remounts with the new colour and keeps the action', () => {
  const {actor, mounts} = stubActor();
  actor.brain.play('celebrate');
  actor.brain.update(1 / 60);
  assert.equal(actor.setFrameColor('#ff0000'), actor);
  assert.deepEqual(mounts, [{kind: 'svg', frameColor: '#ff0000'}]);
  assert.equal(actor.brain.act.id, 'celebrate');
  actor.setFrameColor('#ff0000');
  assert.equal(mounts.length, 1, 'the same colour does not remount');
});

test('action labels are appended by default', () => {
  const {actor, labels} = stubActor();
  actor._onStart({id: 'celebrate'});
  assert.deepEqual(labels, [`Geeky: ${resolveAction('celebrate').label}`]);
});

test('actionLabels false keeps the label as given', () => {
  const {actor, labels} = stubActor({label: 'Geeky celebra', actionLabels: false});
  actor._onStart({id: 'celebrate'});
  assert.deepEqual(labels, ['Geeky celebra']);
});

test('null label stays decorative', () => {
  const {actor, labels} = stubActor({label: null});
  actor._onStart({id: 'celebrate'});
  assert.deepEqual(labels, []);
});

test('setAutonomous toggles the brain', () => {
  const {actor} = stubActor();
  assert.equal(actor.setAutonomous(false), actor);
  assert.equal(actor.brain.autonomous, false);
  actor.setAutonomous(true);
  assert.equal(actor.brain.autonomous, true);
});

test('loadRenderer resolves a loader before switching', async () => {
  const {actor} = stubActor();
  const ns = {marker: true}, calls = [];
  actor.setRenderer = (kind, o) => { calls.push([kind, o.THREE]); return actor; };
  assert.equal(await actor.loadRenderer('three', {THREE: async () => ns}), actor);
  assert.deepEqual(calls, [['three', ns]]);
});

test('loadRenderer keeps the current body when loading fails', async () => {
  const {actor} = stubActor();
  const events = [];
  actor.on('renderer', d => events.push(d));
  await actor.loadRenderer('three', {THREE: async () => { throw new Error('no three'); }});
  assert.equal(actor.renderer.kind, 'svg');
  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'svg');
  assert.match(events[0].error.message, /no three/);
});

test('SvgRenderer with a null label is decorative', () => {
  const made = [];
  const node = () => { const n = {attrs: {}, children: [], style: {}, setAttribute(k, v) { this.attrs[k] = String(v); }, appendChild(c) { this.children.push(c); return c; }}; made.push(n); return n; };
  const previous = globalThis.document;
  globalThis.document = {createElementNS: node};
  try {
    const host = node();
    const r = new SvgRenderer(host, {label: null});
    assert.equal(r.svg.attrs['aria-hidden'], 'true');
    assert.equal(r.svg.attrs['aria-label'], undefined);
    assert.equal(r.svg.attrs.role, undefined);
    const named = new SvgRenderer(node(), {label: 'Geeky'});
    assert.equal(named.svg.attrs['aria-label'], 'Geeky');
    assert.equal(named.svg.attrs.role, 'img');
  } finally { globalThis.document = previous; }
});

test('setFrameColor recolours in place when the renderer can (no new WebGL context)', () => {
  const {actor, mounts} = stubActor();
  const recoloured = [];
  actor.renderer = {kind: 'three', destroy() { throw new Error('must not remount'); }, setFrameColor: hex => recoloured.push(hex)};
  actor.setFrameColor('#00ff00');
  assert.deepEqual(recoloured, ['#00ff00']);
  assert.deepEqual(mounts, []);
});

test('setFrameColor falls back to SVG when the remount fails', () => {
  const {actor} = stubActor();
  const events = [];
  actor.on('renderer', d => events.push(d));
  actor.renderer = {kind: 'three', destroy() {}};
  actor._mount = kind => { if (kind === 'three') throw new Error('no context'); actor.renderer = {kind, destroy() {}}; };
  actor.setFrameColor('#123456');
  assert.equal(actor.renderer.kind, 'svg');
  assert.equal(events.length, 1);
  assert.match(events[0].error.message, /no context/);
});
