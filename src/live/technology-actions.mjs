/* GEEKY LIVE / additive technology and GuateGeeks performances.
   Reference beats: Clippy.mp4 00:31, 00:53, 01:11, 01:25, 01:54,
   02:35, 02:43 and 03:07. Only props and the existing temples perform:
   the original frame contours, eyes and pupil highlights stay intact. */
import {TAU, clamp, lerp, Ease, gate, kf, wobble} from './core.mjs';
import {line, rect, dot, code, check, chip, panel} from './technology-props.mjs';

// Props live in body space in both renderers. Keep that space upright and
// damp idle lag while Geeky handles something in front of the lenses.
function upright(c, w) {
  const {p} = c;
  p.follow *= 1 - w;
  p.steady = Math.max(p.steady, w);
  p.body.rot *= 1 - w;
  p.body.turn *= 1 - w;
  p.body.tilt *= 1 - w;
}

function hand(c, i, x, y, w, fwd = .1) {
  c.reach(i, x, y, w, fwd);
  c.p.arm[i].bend = lerp(c.p.arm[i].bend, 18, w);
}

// An open-ended cable coil, independent of the character's bridge geometry.
function spring(c, key, ax, ay, bx, by, amp, turns, o, opts = {}) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const pts = Array.from({length: 49}, (_, i) => {
    const u = i / 48, a = TAU * turns * u;
    const offset = Math.sin(a) * Math.sin(Math.PI * u) * amp;
    return [ax + dx * u - dy / len * offset, ay + dy * u + dx / len * offset];
  });
  line(c, key, pts, {w: .65, o, ...opts});
}

function halo(c, key, x, y, r, o, color = 'mint', tilt = 0) {
  c.prop({t: 'ring', key: 'tech:' + key, x, y, r, tilt, rot: 0, w: .5, color, o, layer: 'front'});
}

export function registerTechnologyActions(def) {
  // 00:31–00:41: the loose coil straightens into two plug leads.
  def('tech-connect', {
    label: 'Connect the stack', group: 'technology', dur: 4.8, still: 2.65,
    desc: 'Geeky uncoils two cable leads, joins their plugs and confirms a live technology connection.',
    run(c) {
      const {p, t} = c, on = gate(t, .12, .5, 4, 4.7);
      const wind = gate(t, .1, .42, .5, .86);
      const join = Ease.inOut((t - .85) / 1.15);
      const gap = lerp(9, 1.6, join) + .65 * wobble(t - 2, 4, 6);
      const cy = 20 + .65 * wind;
      upright(c, on);
      p.body.y += .65 * wind - .55 * gate(t, 2, 2.25, 3.7, 4.3);
      p.body.sy *= 1 - .035 * wind;
      spring(c, 'connect-left-lead', -22, 13, -gap - 2.6, cy,
        3.2 * (1 - join) + .35, 2.5, on);
      spring(c, 'connect-right-lead', 22, 11, gap + 2.6, cy,
        3.2 * (1 - join) + .35, 2.5, on);
      for (const s of [-1, 1]) {
        rect(c, 'connect-plug' + s, s * (gap + 1.3), cy, 2.6, 4, {o: on, w: .85});
        line(c, 'connect-contact' + s, [[s * gap, cy - .8], [s * (gap - 1.6), cy - .8],
          [s * (gap - 1.6), cy + .8], [s * gap, cy + .8]], {o: on, color: 'sky', w: .6});
      }
      hand(c, 0, -gap - 2.6, cy, on);
      hand(c, 1, gap + 2.6, cy, on);
      const live = gate(t, 2.02, 2.3, 3.9, 4.5);
      dot(c, 'connect-led', 0, cy, .65, {o: live, color: 'mint'});
      check(c, 'connect-ok', 0, 14.5, .72, live);
      const ping = gate(t, 2.03, 2.12, 2.5, 2.8);
      halo(c, 'connect-ping', 0, cy, 2 + 4 * Ease.out((t - 2.03) / .75), .55 * ping);
      c.look(0, cy, on, 32);
      c.expr('focused', .45 * on * (1 - live));
      c.expr('happy', .65 * live);
      if (c.at(2.05)) c.cue('connected');
    }
  });

  // 00:53–01:00: a hanging mobile becomes a little packet-routing tree.
  def('tech-network', {
    label: 'Route the network', group: 'technology', dur: 5, loop: true, still: 2.2,
    desc: 'A balanced network mobile sends packets between connected nodes while Geeky follows their route.',
    run(c) {
      const {p, t, T} = c, on = Ease.inOut(T / .7), phase = TAU * t / 5;
      const sway = .95 * Math.sin(phase), lag = .65 * Math.sin(phase - .55);
      const top = [0, -28], left = [-18 + sway, -18.5 + .35 * Math.sin(phase)];
      const right = [18 + lag, -19.5 - .35 * Math.sin(phase)];
      const hub = [0, -23.7], lower = [1 + .5 * Math.sin(phase + .4), -16.5];
      upright(c, on);
      p.body.y += .25 * (1 - Math.cos(phase)) * on + .45 * gate(T, .05, .2, .25, .55);
      line(c, 'network-stem', [[0, -30], top, hub], {o: on, layer: 'back'});
      line(c, 'network-beam', [[left[0], -23.7 + .4 * Math.sin(phase)], hub,
        [right[0], -23.7 - .4 * Math.sin(phase)]], {o: on, layer: 'back'});
      for (const [i, node] of [left, lower, right].entries()) {
        const hinge = i === 1 ? hub : [node[0], -23.7 + (i === 0 ? 1 : -1) * .4 * Math.sin(phase)];
        line(c, 'network-drop' + i, [hinge, node], {o: on, color: 'lavender', layer: 'back'});
        halo(c, 'network-node' + i, node[0], node[1], 1.6, on, i === 1 ? 'mint' : 'sky');
        dot(c, 'network-core' + i, node[0], node[1], .38, {o: on, color: 'frame'});
        // A packet crosses each link; fading at both ends keeps loop seams clean.
        const u = (t / 5 + i / 3) % 1, leg = u < .5 ? u * 2 : (u - .5) * 2;
        const from = u < .5 ? hub : hinge, to = u < .5 ? hinge : node;
        dot(c, 'network-packet' + i, lerp(from[0], to[0], leg), lerp(from[1], to[1], leg), .5,
          {o: on * Math.sin(Math.PI * u) ** 2, color: 'mint'});
      }
      c.look(10 * Math.sin(phase), -24, .75 * on, 48);
      c.expr('curious', .35 * on);
      hand(c, 0, -24, -8 + .35 * Math.sin(phase), .5 * on);
      hand(c, 1, 24, -10 - .35 * Math.sin(phase), .5 * on);
    }
  });

  // 01:11–01:19: headphones settle over the original glasses, then a quiet beat.
  def('tech-focus', {
    label: 'Focus mode', group: 'technology', dur: 4, loop: true, still: 1.7,
    desc: 'Geeky settles into a coding session with headphones, a gentle rhythm and code-shaped audio bars.',
    run(c) {
      const {p, t, T} = c, on = Ease.inOut(T / .75), phase = TAU * t / 4;
      const seat = -5 * (1 - on) + .55 * wobble(T - .58, 4, 7);
      upright(c, on);
      p.body.y += .22 * Math.sin(phase * 2) * on;
      const band = Array.from({length: 41}, (_, i) => {
        const a = Math.PI + i / 40 * Math.PI, x = 24 * Math.cos(a);
        return [x, -.5 - x / 24 * 2.5 + 20 * Math.sin(a) + seat];
      });
      line(c, 'focus-band', band, {o: on, w: 1.3, layer: 'back'});
      for (const [i, x, y] of [[0, -24, 3], [1, 24, -2]]) {
        rect(c, 'focus-cup' + i, x, y + seat, 3.1, 8, {o: on, w: 1.3});
        line(c, 'focus-cushion' + i, [[x, y - 2.3 + seat], [x, y + 2.3 + seat]],
          {o: on, color: 'lavender', w: 1.25});
        hand(c, i, x, y + seat, gate(T, .12, .4, .8, 1.15), .55);
      }
      panel(c, 'focus-terminal', 0, 22, 25, 11, on);
      code(c, 'focus-code', -6.5, 23, .6, on);
      for (let i = 0; i < 5; i++) {
        const h = 1.1 + 2.6 * (.5 + .5 * Math.sin(phase * 2 + i * .85));
        line(c, 'focus-bar' + i, [[.5 + i * 2, 25], [.5 + i * 2, 25 - h]],
          {o: on, color: i % 2 ? 'sky' : 'mint', w: .85});
      }
      c.look(-4 + 2 * Math.sin(phase), 22, .8 * on, 38);
      c.expr('focused', .45 * on);
    }
  });

  // 01:25–01:35: the spring stack becomes the layers of a maker project.
  def('tech-build', {
    label: 'Build a maker project', group: 'technology', dur: 5, still: 3.35,
    desc: 'Geeky lifts a spring stack into a base, circuit layer and processor, assembling a GuateGeeks maker project.',
    run(c) {
      const {p, t} = c, on = gate(t, .12, .5, 4.15, 4.9);
      const wind = gate(t, .18, .45, .5, .8), lift = Ease.inOut((t - .65) / 1.8);
      upright(c, on);
      p.body.y += .8 * wind - .5 * gate(t, 2.8, 3.1, 4, 4.6);
      p.body.sy *= 1 - .04 * wind;
      spring(c, 'build-lift', 0, 28, 0, 25 - 9 * lift, 5.2, 3.5,
        on * (1 - Ease.inOut((t - 2.7) / .65)), {color: 'lavender', layer: 'back'});
      const levels = [26, 22, 18];
      for (let i = 0; i < levels.length; i++) {
        const start = .65 + i * .64, u = Ease.inOut((t - start) / .65);
        const x = (i % 2 ? 18 : -18) * (1 - u);
        const y = levels[i] - 3 * (1 - u) + .7 * wobble(t - start - .65, 4.5, 7);
        const visible = on * Ease.sine((t - start) / .25);
        line(c, 'build-layer' + i, [[x - 10, y], [x, y - 2.5], [x + 10, y], [x, y + 2.5]],
          {closed: true, w: .8, o: visible, color: i === 1 ? 'sky' : 'frame'});
        line(c, 'build-edge' + i, [[x - 10, y], [x - 10, y + 1], [x, y + 3.5], [x + 10, y + 1], [x + 10, y]],
          {w: .5, o: visible, color: 'lavender'});
        if (i === 1) {
          line(c, 'build-circuit', [[x - 5, y], [x - 2, y], [x - 2, y - 1], [x + 4, y - 1]], {o: visible, w: .6, color: 'mint'});
          dot(c, 'build-circuit-pad', x + 4, y - 1, .4, {o: visible, color: 'mint'});
        }
      }
      const cap = on * Ease.back((t - 2.55) / .6);
      chip(c, 'build-processor', 0, 17, .45, clamp(cap));
      const done = gate(t, 3.05, 3.3, 4.05, 4.65);
      check(c, 'build-tested', 15, 19, .85, done);
      hand(c, 0, -10, 25, on);
      hand(c, 1, 10, lerp(25, 18, lift), on);
      c.look(0, 20, on, 36);
      c.expr('focused', .45 * on * (1 - done));
      c.expr('happy', .6 * done);
      if (c.at(3.1)) c.cue('assembled');
    }
  });

  // 01:54–02:02: a collapsed coil gives an archive its squeeze and rebound.
  def('tech-compress', {
    label: 'Compress the archive', group: 'technology', dur: 4.6, still: 2.3,
    desc: 'Geeky presses a stack of project files into a zipped archive, then releases it with a soft spring rebound.',
    run(c) {
      const {p, t} = c, on = gate(t, .1, .45, 3.95, 4.55);
      const wind = gate(t, .15, .45, .55, .9);
      const squeeze = kf(t, [[0, 0], [.75, 0], [1.8, 1], [2.6, 1], [2.95, .28, 'out'], [3.25, .65], [3.65, .55]]);
      const width = 25 - 10 * squeeze, height = 10 - 4 * squeeze, cy = 22 + squeeze;
      upright(c, on);
      p.body.y += .55 * wind + .7 * squeeze * on;
      p.body.sy *= 1 - .045 * squeeze * on;
      p.body.sx *= 1 + .025 * squeeze * on;
      rect(c, 'compress-archive', 0, cy, width, height, {o: on, w: .85});
      for (let i = 0; i < 3; i++) {
        const yy = cy - height * .26 + i * height * .26;
        line(c, 'compress-file' + i, [[-width / 2 + 2, yy], [-2.7, yy]], {o: on, color: 'lavender', w: .6});
      }
      for (let i = 0; i < 5; i++) {
        const yy = cy - height * .35 + i * height * .175, x = i % 2 ? .45 : -.45;
        line(c, 'compress-zip' + i, [[x - .6, yy], [x + .6, yy]], {o: on, color: 'sky', w: .7});
      }
      rect(c, 'compress-pull', 0, cy + height * .28, 1.5, 1.8, {o: on, w: .55, color: 'sky'});
      spring(c, 'compress-coil', -width / 2, 28, width / 2, 28,
        1.5 - .9 * squeeze, 4, on * .8, {color: 'lavender', layer: 'back'});
      hand(c, 0, -width / 2, cy, on);
      hand(c, 1, width / 2, cy, on);
      const done = gate(t, 1.9, 2.15, 3.75, 4.2);
      check(c, 'compress-saved', 11, 16, .75, done);
      c.look(0, cy, on, 36);
      c.expr('focused', .5 * on * (1 - done));
      c.expr('happy', .55 * done);
      if (c.at(1.95)) c.cue('compressed');
    }
  });

  // 02:35–02:42: a folded sheet carries a code packet into a deployment.
  def('tech-deploy', {
    label: 'Deploy the code', group: 'technology', dur: 5, still: 2.9,
    desc: 'Geeky folds a code sheet into a paper plane, winds up and launches a verified deployment packet.',
    run(c) {
      const {p, t} = c, on = gate(t, .1, .45, 4.15, 4.9);
      const fold = Ease.inOut((t - .75) / .95);
      const launch = Ease.in((t - 2.2) / 1.25);
      const wind = gate(t, 1.65, 1.95, 2.1, 2.35);
      const px = -2.2 * wind + 17 * launch, py = 21 + wind - 35 * launch;
      const packet = on * (1 - Ease.sine((t - 3.35) / .25));
      upright(c, on);
      p.body.x -= .6 * wind;
      p.body.y += .55 * wind - .65 * gate(t, 2.25, 2.5, 3.1, 3.8);
      const sheet = [[-9, -4.5], [9, -4.5], [9, 4.5], [-9, 4.5]];
      const plane = [[-10, 4], [11, -5], [-3, 7], [-3, .5]];
      const pts = sheet.map((q, i) => [px + lerp(q[0], plane[i][0], fold), py + lerp(q[1], plane[i][1], fold)]);
      line(c, 'deploy-sheet', pts, {o: packet, closed: true, w: .85});
      line(c, 'deploy-fold', [[px - 3, py + lerp(-4.5, .5, fold)], [px + 11 * fold, py - 5 * fold]],
        {o: packet * fold, color: 'lavender', w: .65});
      code(c, 'deploy-code', px - 1.5, py, .45, packet);
      const hold = on * (1 - Ease.inOut((t - 2.25) / .3));
      hand(c, 0, px - 9, py + 2, hold);
      hand(c, 1, px + 6, py + 1, hold);
      const trail = gate(t, 2.35, 2.65, 3.4, 3.7);
      line(c, 'deploy-trail', [[-5, 24], [-2, 23], [3, 18], [px - 6, py + 5]], {o: .55 * trail, color: 'sky', w: .55, layer: 'back'});
      const done = gate(t, 3.4, 3.65, 4.1, 4.65);
      halo(c, 'deploy-target', 21, -19, 3.4, done, 'sky');
      check(c, 'deploy-live', 21, -19, .85, done);
      c.look(px, py, on, 40);
      c.expr('focused', .4 * on * (1 - launch));
      c.expr('happy', .55 * on * clamp(launch + done));
      if (c.at(2.3)) c.cue('deployed');
    }
  });

  // 02:43–02:46: an unrolled sheet becomes an earned learning certificate.
  def('gg-certificate', {
    label: 'GuateGeeks certificate', group: 'guategeeks', dur: 5, still: 3.1,
    desc: 'Geeky unrolls a certificate and stamps its seal to celebrate a completed GuateGeeks technology course.',
    run(c) {
      const {p, t} = c, on = gate(t, .1, .45, 4.1, 4.9);
      const unroll = Ease.inOut((t - .55) / 1.2);
      const height = 2.3 + 10.7 * unroll, cy = 22, top = cy - height / 2;
      const wind = gate(t, .15, .4, .45, .75);
      upright(c, on);
      p.body.y += .5 * wind - .65 * gate(t, 2.55, 2.85, 3.8, 4.55);
      rect(c, 'certificate-sheet', 0, cy, 26, height, {o: on, w: .8});
      // Rolled ends soften as the certificate opens; no new glyphs required.
      for (const s of [-1, 1]) {
        halo(c, 'certificate-roll' + s, s * 13, top + .6, 1.15 - .4 * unroll, on, 'lavender', 35);
        line(c, 'certificate-band' + s, [[s * 12, top + 1], [s * 12, cy + height / 2 - 1]], {o: on * unroll, color: 'sky', w: .7});
      }
      const print = on * Ease.inOut((t - 1.2) / .65);
      code(c, 'certificate-course', -7, 20.2, .55, print);
      line(c, 'certificate-title', [[-2.5, 18.5], [8, 18.5]], {o: print, w: .8});
      line(c, 'certificate-earned', [[-2.5, 20.7], [5, 20.7]], {o: print, color: 'lavender', w: .55});
      line(c, 'certificate-name', [[-9, 24.7], [1.5, 24.7]], {o: print, color: 'lavender', w: .55});
      const stamp = gate(t, 2.15, 2.5, 4, 4.7), pop = clamp(Ease.back((t - 2.15) / .4), 0, 1.15);
      halo(c, 'certificate-seal', 7.5, 23.7, 2.25 * Math.max(.01, pop), stamp);
      check(c, 'certificate-pass', 7.5, 23.7, .53 * pop, stamp);
      line(c, 'certificate-ribbon', [[6.2, 25.4], [5.8, 27.6], [7.5, 26.9], [9.2, 27.6], [8.8, 25.4]], {o: stamp, w: .65, color: 'sky'});
      hand(c, 0, -13, cy, on);
      hand(c, 1, 13, cy, on);
      c.look(0, 22, on * (1 - .5 * stamp), 40);
      c.expr('happy', .7 * stamp);
      if (c.at(2.45)) c.cue('certificate-earned');
    }
  });

  // 03:07–03:17: read, find the next step, then guide a learner through it.
  def('gg-mentor', {
    label: 'GuateGeeks mentor', group: 'guategeeks', dur: 6, still: 3.8,
    desc: 'Geeky reads a GuateGeeks lesson card, points through its three coding steps and checks the learner’s progress.',
    run(c) {
      const {p, t} = c, on = gate(t, .12, .55, 5.1, 5.9);
      const present = Ease.back((t - .3) / .7), cy = 20 + 4 * (1 - clamp(present));
      const guide = gate(t, 1.7, 2.1, 4.8, 5.3);
      const step = kf(t, [[0, 0], [2.1, 0], [2.7, 1], [3.3, 1], [3.9, 2], [4.8, 2]]);
      const rows = [17.5, 20.5, 23.5], pointY = cy - 20 + lerp(rows[0], rows[2], step / 2);
      upright(c, on);
      p.body.y += .45 * gate(t, .12, .35, .4, .7);
      p.lens[1].y -= .45 * guide;
      panel(c, 'mentor-lesson', 0, cy, 28, 15, on);
      for (let i = 0; i < 3; i++) {
        const y = cy - 20 + rows[i], highlight = guide * clamp(1 - Math.abs(step - i));
        dot(c, 'mentor-step' + i, -10.5, y, .45, {o: on, color: 'sky'});
        line(c, 'mentor-row' + i, [[-8.5, y], [i === 1 ? 4 : 7, y]], {o: on, color: 'lavender', w: .55});
        line(c, 'mentor-active' + i, [[-8.5, y + .9], [7, y + .9]], {o: on * highlight, color: 'mint', w: .6});
      }
      // The right temple is the pointer; the left one supports the lesson.
      hand(c, 0, -14, cy + 1, on);
      hand(c, 1, 10.5, pointY, guide);
      line(c, 'mentor-pointer', [[8.5, pointY], [10, pointY]], {o: guide, color: 'mint', w: .85});
      const readX = kf(t, [[0, -8], [.9, -8], [1.4, 6], [1.65, -6], [2, 7]]);
      c.look(lerp(readX, 8, guide), lerp(cy - 2, pointY, guide), on, 36);
      c.expr('focused', .35 * on * (1 - guide));
      c.expr('happy', .4 * guide);
      const done = gate(t, 4.15, 4.45, 5.05, 5.65);
      check(c, 'mentor-understood', 10.5, cy - 4.5, .65, done);
      if (c.at(4.3)) c.cue('lesson-complete');
    }
  });
}
