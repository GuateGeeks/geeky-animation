import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {ACTIONS, ACTION_LIST, ALIASES, GROUPS, resolveAction} from '../src/live/actions.mjs';
import {GeekyBrain} from '../src/live/brain.mjs';
import {GLYPHS, samplePath} from '../src/live/core.mjs';

// Captured before the technology expansion. Never regenerate this fixture from
// the expanded action library: it protects the user's existing performances.
const baseline = JSON.parse(await readFile(new URL('./fixtures/original-live-actions.json', import.meta.url), 'utf8'));
const ORIGINAL_IDS = [
  'idle', 'running-right', 'running-left', 'waving', 'jumping', 'failed',
  'waiting', 'running', 'review', 'greet', 'goodbye', 'get-attention',
  'thinking', 'searching', 'writing', 'reading', 'idea', 'point', 'listen',
  'celebrate', 'love', 'dizzy', 'sleep', 'wake', 'surprised', 'confused',
  'sad', 'giggle', 'shrug', 'nod', 'shake', 'look-around', 'yawn', 'polish',
  'adjust', 'bicycle'
];
const originalIds = new Set(ORIGINAL_IDS);
const TECHNOLOGY_IDS = [
  'tech-portal', 'tech-blueprint', 'tech-debug', 'tech-reboot', 'tech-connect',
  'tech-network', 'tech-focus', 'tech-build', 'tech-peek', 'tech-compile',
  'tech-compress', 'tech-deploy', 'gg-certificate', 'gg-mentor'
];
const LOOP_IDS = new Set(['tech-network', 'tech-focus']);
const additions = ACTION_LIST.filter(a => !originalIds.has(a.id));
const {sampling} = baseline;
const normalize = value => JSON.parse(JSON.stringify(value, (_, v) => typeof v === 'number' ? Number(v.toFixed(sampling.decimalPlaces)) : v));
const step = (brain, frames, visit = () => {}) => {
  for (let frame = 1; frame <= frames; frame++) visit(brain.update(1 / sampling.fps), frame);
};
const framesFor = seconds => Math.ceil(seconds * sampling.fps);
const finite = (value, path) => {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `${path} is not finite`);
  else if (Array.isArray(value)) value.forEach((v, i) => finite(v, `${path}[${i}]`));
  else if (value && typeof value === 'object') for (const [key, v] of Object.entries(value)) finite(v, `${path}.${key}`);
};

test('the immutable baseline covers all 36 original IDs and their public metadata', () => {
  assert.equal(baseline.schemaVersion, 1);
  assert.deepEqual(baseline.actions.map(a => a.metadata.id), ORIGINAL_IDS);
  assert.deepEqual(ACTION_LIST.filter(a => originalIds.has(a.id)).map(a => a.id), ORIGINAL_IDS);
  for (const entry of baseline.actions) {
    const id = entry.metadata.id;
    const {run, ...metadata} = ACTIONS[id];
    assert.equal(typeof run, 'function', `${id} must remain playable`);
    assert.deepEqual(normalize(metadata), entry.metadata, `${id}: original action metadata changed`);
    assert.deepEqual(ACTION_LIST.find(a => a.id === id), entry.publicMetadata, `${id}: public metadata changed`);
    assert.equal(resolveAction(id), ACTIONS[id]);
  }
  for (const [alias, id] of Object.entries(baseline.aliases)) {
    assert.equal(ALIASES[alias], id, `${alias}: original alias was changed`);
    assert.equal(resolveAction(alias).id, id);
  }
  for (const [id, label] of Object.entries(baseline.groups)) assert.equal(GROUPS[id], label, `${id}: original group label changed`);
});

test('all original choreographies, props, particles and lifecycle events match the pre-expansion poses', () => {
  let sampled = 0;
  for (const entry of baseline.actions) {
    const id = entry.metadata.id;
    const brain = new GeekyBrain({seed: sampling.seed, autonomous: false});
    brain.lookAt(...sampling.gaze);
    step(brain, sampling.preRollFrames);
    const events = [];
    let currentFrame = 0;
    for (const type of ['start', 'end', 'cue']) brain.on(type, data => events.push({frame: currentFrame, type, data}));
    brain.play(id, {restart: true});
    const expected = new Map(entry.samples.map(sample => [sample.frame, sample]));
    assert.ok(expected.size >= 8, `${id}: baseline needs early, middle, end and post-duration samples`);
    for (currentFrame = 1; currentFrame <= entry.samples.at(-1).frame; currentFrame++) {
      const pose = brain.update(1 / sampling.fps);
      if (!expected.has(currentFrame)) continue;
      const actual = normalize({frame: currentFrame, pose, particles: brain.fx(), state: brain.getState(), events});
      assert.deepEqual(actual, expected.get(currentFrame), `${id}: performance changed at frame ${currentFrame}`);
      sampled++;
    }
  }
  assert.equal(sampled, 354, 'Every pre-expansion sampled pose must be checked');
});

test('all original reduced-motion poses match the pre-expansion poses', () => {
  for (const entry of baseline.actions) {
    const id = entry.metadata.id;
    const brain = new GeekyBrain({seed: sampling.seed, autonomous: false, reduced: true});
    brain.lookAt(...sampling.gaze); brain.play(id, {restart: true});
    assert.deepEqual(normalize(brain.update(1 / sampling.fps)), entry.reducedPose, `${id}: reduced-motion pose changed`);
    assert.equal(brain.particles.length, 0);
  }
});

test('the technology expansion adds unique playable actions with complete metadata', () => {
  assert.equal(ACTION_LIST.length, 50, 'The expansion must preserve 36 actions and add 14');
  assert.deepEqual(new Set(additions.map(a => a.id)), new Set(TECHNOLOGY_IDS), 'All 14 technology and GuateGeeks IDs must be discoverable');
  assert.equal(new Set(ACTION_LIST.map(a => a.id)).size, ACTION_LIST.length, 'Duplicate IDs replace or hide existing actions');
  assert.deepEqual(new Set(Object.keys(ACTIONS)), new Set(ACTION_LIST.map(a => a.id)), 'Every action must be discoverable');
  for (const a of additions) {
    assert.ok(a.label && a.description && GROUPS[a.group], `${a.id}: complete public metadata`);
    assert.equal(a.group, a.id.startsWith('gg-') ? 'guategeeks' : 'technology', `${a.id}: intended group`);
    assert.equal(a.loop, LOOP_IDS.has(a.id), `${a.id}: intended loop behavior`);
    assert.ok(a.duration > 0 && a.duration <= 6, `${a.id}: sensible duration`);
    assert.ok(ACTIONS[a.id].still > 0 && ACTIONS[a.id].still < a.duration, `${a.id}: meaningful reduced-motion frame`);
    assert.equal(resolveAction(a.id), ACTIONS[a.id]);
  }
});

test('every new action keeps the Geeky rig, poses and particles finite and bounded', () => {
  for (const a of additions) {
    const brain = new GeekyBrain({seed: 37, autonomous: false});
    brain.lookAt(14, -9); brain.play(a.id);
    step(brain, framesFor(a.duration * 2 + .8), (pose, frame) => {
      finite(pose, `${a.id}@${frame}`); finite(brain.fx(), `${a.id}.particles@${frame}`);
      assert.equal(pose.lens.length, 2, `${a.id}: preserves both frame lenses`);
      assert.equal(pose.arm.length, 2, `${a.id}: preserves both temples`);
      for (const lens of pose.lens) {
        assert.ok(Math.abs(lens.x + pose.body.x) < 70 && Math.abs(lens.y + pose.body.y) < 70, `${a.id}: lens out of bounds`);
        assert.ok(lens.s > 0 && lens.s < 3, `${a.id}: recognisable lens scale`);
      }
      for (const pupil of pose.pupil) assert.ok(Math.hypot(pupil.x, pupil.y) <= 6.5, `${a.id}: pupil escaped its lens`);
      for (const lid of pose.lid) assert.ok(lid.top >= 0 && lid.bot >= 0 && lid.top + lid.bot <= 1.000001, `${a.id}: invalid eyelids`);
      assert.ok(brain.particles.length <= 160, `${a.id}: particle cap`);
    });
  }
});

test('new loops persist and every new action can complete or report interruption', async () => {
  for (const a of additions) {
    const brain = new GeekyBrain({seed: 13, autonomous: false});
    const completed = [];
    brain.on('end', event => completed.push(event.id));
    let result;
    brain.play(a.id).then(value => { result = value; });
    step(brain, framesFor(a.duration + .8));
    await Promise.resolve();
    if (a.loop) {
      assert.equal(brain.getState().action, a.id, `${a.id}: loop must persist`);
      assert.equal(result, undefined, `${a.id}: a loop must not complete early`);
      assert.deepEqual(completed, []);
      brain.play(a.id, {restart: true, loop: false});
      await Promise.resolve();
      assert.deepEqual(result, {id: a.id, completed: false}, `${a.id}: interrupted loop result`);
    } else {
      assert.deepEqual(result, {id: a.id, completed: true}, `${a.id}: default completion result`);
      assert.equal(brain.getState().action, ACTIONS[a.id].hold ? a.id : 'idle', `${a.id}: default completion state`);
    }
    let oneShot;
    brain.play(a.id, {restart: true, loop: false}).then(value => { oneShot = value; });
    step(brain, framesFor(a.duration + .8));
    await Promise.resolve();
    assert.deepEqual(oneShot, {id: a.id, completed: true}, `${a.id}: one-shot completion promise`);
    assert.equal(brain.getState().action, ACTIONS[a.id].hold ? a.id : 'idle', `${a.id}: completion state`);
    assert.ok(completed.includes(a.id), `${a.id}: completion event`);
    let interrupted;
    brain.play(a.id, {restart: true}).then(value => { interrupted = value; });
    step(brain, 6); brain.play('waving'); await Promise.resolve();
    assert.deepEqual(interrupted, {id: a.id, completed: false}, `${a.id}: interruption result`);
  }
});

test('every new reduced-motion performance stays static and particle-free, then completes', async () => {
  for (const a of additions) {
    const brain = new GeekyBrain({seed: 29, autonomous: false, reduced: true});
    const cues = [];
    brain.on('cue', value => cues.push(value));
    let result;
    brain.play(a.id, {loop: false}).then(value => { result = value; });
    const pose = normalize(brain.update(1 / sampling.fps));
    finite(pose, `${a.id}.reduced`);
    step(brain, Math.max(1, framesFor(a.duration) - 2), actual => {
      assert.deepEqual(normalize(actual), pose, `${a.id}: reduced motion must stay static`);
      assert.deepEqual(brain.fx(), [], `${a.id}: reduced motion particles`);
    });
    step(brain, framesFor(.8)); await Promise.resolve();
    assert.deepEqual(result, {id: a.id, completed: true}, `${a.id}: reduced-motion completion`);
    assert.equal(brain.getState().action, ACTIONS[a.id].hold ? a.id : 'idle');
    assert.deepEqual(cues, [], `${a.id}: reduced motion must suppress action cues`);
  }
});

test('new action particles and motion remain deterministic with a fixed seed', () => {
  for (const a of additions) {
    const brains = [0, 1].map(() => new GeekyBrain({seed: 57, autonomous: false}));
    for (const brain of brains) { brain.lookAt(7, -11); brain.play(a.id); }
    for (let frame = 0; frame < framesFor(a.duration + .8); frame++) {
      assert.deepEqual(brains[0].update(1 / sampling.fps), brains[1].update(1 / sampling.fps), `${a.id}@${frame}: deterministic pose`);
      assert.deepEqual(brains[0].fx(), brains[1].fx(), `${a.id}@${frame}: deterministic particles`);
    }
  }
});

// Test that props contain drawable content, rather than just a transparent
// record, a named key, or decorative particles. Browser review verifies
// appearance; these checks guard the shared renderer input.
const supportedProp = prop => {
  assert.ok(['line', 'ring', 'glyph', 'cyl', 'blob'].includes(prop.t), `${prop.key}: unsupported prop type ${prop.t}`);
  if (prop.t === 'glyph') assert.ok(GLYPHS[prop.kind], `${prop.key}: unknown glyph ${prop.kind}`);
  if (prop.t === 'line') {
    assert.ok(prop.pts?.length >= 2, `${prop.key}: a line needs points`);
    assert.ok((prop.w ?? 1) > 0, `${prop.key}: a line needs a visible stroke`);
  }
  if (prop.t === 'blob') assert.ok(prop.d && samplePath(prop.d).some(path => path.pts.length >= 3), `${prop.key}: a blob needs drawable geometry`);
};
const hasContent = prop => {
  if (prop.o < .2) return false;
  if (prop.t === 'line') return prop.pts.some(p => Math.hypot(p.x - prop.pts[0].x, p.y - prop.pts[0].y, (p.z || 0) - (prop.pts[0].z || 0)) > 1);
  if (prop.t === 'ring') return prop.r > .75 && (prop.w ?? 1) > .1;
  if (prop.t === 'cyl') return prop.r1 > .2 && prop.r2 > .2 && Math.hypot(prop.a.x - prop.b.x, prop.a.y - prop.b.y, (prop.a.z || 0) - (prop.b.z || 0)) > .5;
  if (prop.t === 'blob') return samplePath(prop.d).some(path => path.pts.some(p => Math.hypot(p.x - path.pts[0].x, p.y - path.pts[0].y) > 1));
  return prop.t === 'glyph' && (prop.s ?? 1) > .25 && !['dot', 'sparkle', 'star', 'heart', 'bang', 'zee', 'drop', 'puff'].includes(prop.kind);
};

test('new performances and their reduced-motion stills expose visible drawable props', () => {
  for (const a of additions) {
    const brain = new GeekyBrain({seed: 23, autonomous: false});
    brain.play(a.id);
    let contentFrames = 0;
    step(brain, framesFor(a.duration), pose => {
      const keys = new Set();
      for (const prop of pose.props) {
        assert.ok(prop.key, `${a.id}: props need stable keys during animation`);
        assert.ok(!keys.has(prop.key), `${a.id}: duplicate prop key ${prop.key}`);
        keys.add(prop.key); supportedProp(prop);
      }
      if (pose.props.some(hasContent)) contentFrames++;
    });
    assert.ok(contentFrames >= framesFor(.3), `${a.id}: meaningful props should remain visible for more than a flash`);
    const still = new GeekyBrain({seed: 23, autonomous: false, reduced: true});
    still.play(a.id);
    const pose = still.update(1 / sampling.fps);
    for (const prop of pose.props) supportedProp(prop);
    assert.ok(pose.props.some(hasContent), `${a.id}: reduced motion must retain a meaningful prop`);
  }
});

// Required visual concepts, without freezing artistic coordinates or helper
// implementations. A generic panel must not stand in for every new action.
test('rapid blends between the additions and original actions stay finite', () => {
  const brain = new GeekyBrain({seed: 71, autonomous: false});
  const sequence = TECHNOLOGY_IDS.flatMap((id, i) => [id, ORIGINAL_IDS[i * 2], id]);
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const id of sequence) {
      brain.play(id, {restart: true});
      step(brain, 5, pose => { finite(pose, `${id}.blend`); finite(brain.fx(), `${id}.blend.particles`); });
    }
  }
  brain.stop(); step(brain, framesFor(2));
  assert.equal(brain.getState().action, 'idle');
});
