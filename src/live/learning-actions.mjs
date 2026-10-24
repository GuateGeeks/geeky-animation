/* New video-inspired choreography. Existing action definitions are never reused or replaced. */
import {TAU, Ease, gate, kf, lerp, clamp} from './core.mjs';
import {line, rect, dot, code, check, chip, panel} from './technology-props.mjs';

export function registerLearningActions(def) {
  def('tech-portal', {label: 'Browser portal', group: 'technology', dur: 4.8, still: 2.15,
    desc: 'Geeky folds into a browser window, peeks through, then springs back out. Use for opening a workspace.', run(c) {
    const {p, t} = c, m = gate(t, .15, .9, 3.1, 4.55), folded = gate(t, .5, 1.2, 2.65, 3.8);
    panel(c, 'portal', 0, 0, 53, 37, m); code(c, 'portal-code', 0, 11, .7, m * gate(t, 1.4, 1.7, 2.7, 3.1));
    p.body.y += kf(t, [[0, 0], [.3, 1.3], [1.15, 4], [1.5, -2], [2.2, 1], [3.4, -5], [3.7, 1.2], [4.8, 0]]);
    p.body.turn += kf(t, [[0, 0], [.65, -18], [1.3, 0], [2.5, 0], [3.3, 24], [4.3, 0]]);
    p.body.sx *= 1 - .29 * folded; p.body.sy *= 1 - .23 * folded;
    for (let i = 0; i < 2; i++) { p.lens[i].y -= 2 * folded; p.lens[i].rot += (i ? 1 : -1) * 5 * folded; }
    c.reach(0, -25, 6, m); c.reach(1, 25, 6, m); c.expr('curious', folded); c.look(5 * Math.sin(t * 2), 1, folded);
    if (c.at(3.35)) { c.cue('pop'); c.fx('sparkle', {x: 0, y: -8, n: 5, radial: true, speed: 14, life: .65, size: .45, colors: ['mint', 'sky']}); }
  }});

  def('tech-blueprint', {label: 'Project blueprint', group: 'technology', dur: 5.4, still: 2.8,
    desc: 'Unfolds a project plan, traces its circuit, and checks the first milestone. Use for GuateGeeks maker planning.', run(c) {
    const {p, t} = c, show = gate(t, .25, 1, 4.25, 5.2), fold = Ease.inOut((t - .6) / .8), x = 0, y = 17;
    p.body.y -= 4 * show; p.body.rot -= 3 * show; c.expr('focused', .6 * show);
    const w = 30 * (.12 + .88 * fold); rect(c, 'plan', x, y, w, 15, {color: 'sky', o: show});
    line(c, 'plan-fold', [[0, 9.5], [0, 24.5]], {color: 'lavender', w: .4, o: show});
    line(c, 'plan-circuit', [[-11, 21], [-11, 16], [-4, 16], [-4, 13], [6, 13], [6, 20], [11, 20]], {w: .6, color: 'sky', o: show * fold});
    for (const [i, a, b] of [[0, -11, 21], [1, -4, 13], [2, 11, 20]]) dot(c, 'plan-node' + i, a, b, .6, {o: show * fold, color: i === 2 ? 'mint' : 'lavender'});
    const progress = Ease.inOut((t - 1.8) / 1.4), px = lerp(-11, 11, progress);
    c.reach(0, -14, 19, show); c.reach(1, px, 15, show); c.look(px, 16, show, 23);
    check(c, 'plan-done', 10, 11, .75, show * Ease.out((t - 3.4) / .4));
    if (c.at(3.55)) { c.cue('ding'); c.fx('sparkle', {x: 10, y: 8, n: 3, life: .6, size: .4, color: 'mint'}); }
  }});

  def('tech-debug', {label: 'Debug & repair', group: 'technology', dur: 5.6, still: 3.9,
    desc: 'Finds a broken circuit, pulls out the bug, and reconnects the trace. Use for fixing a coding exercise.', run(c) {
    const {p, t} = c, show = gate(t, .2, .7, 4.55, 5.4), fix = Ease.inOut((t - 2.4) / .7);
    p.body.y -= 4 * show; p.body.rot += 3 * Math.sin(t * 4) * gate(t, .7, 1, 2.3, 2.8); c.expr('worried', show * (1 - fix)); c.expr('happy', show * fix);
    panel(c, 'debug-board', 0, 17, 33, 15, show);
    line(c, 'debug-left', [[-12, 19], [-7, 19], [-7, 15], [-2, 15]], {color: 'sky', o: show});
    line(c, 'debug-right', [[2, 15], [7, 15], [7, 19], [12, 19]], {color: fix > .5 ? 'mint' : 'pink', o: show});
    line(c, 'debug-patch', [[-2, 15], [2, 15]], {color: 'mint', w: 1, o: fix * show});
    const bug = show * (1 - Ease.inOut((t - 2.2) / .85)), by = 15 - 10 * Ease.out((t - 2.2) / .8);
    dot(c, 'bug', 0, by, 1.4, {color: 'pink', o: bug});
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) line(c, 'bug-leg' + s + i, [[s, by + i - 1], [s * 2.8, by + (i - 1) * 1.7]], {o: bug, color: 'pink', w: .45});
    c.reach(0, -12, 17, show); c.reach(1, 0, by, show); c.look(0, 15, show, 23); check(c, 'debug-check', 11, 16, .8, show * fix);
    if (c.at(3.1)) { c.cue('click'); c.fx('sparkle', {x: 0, y: 15, n: 5, radial: true, speed: 9, size: .35, life: .6, color: 'mint'}); }
  }});

  def('tech-reboot', {label: 'Gentle reboot', group: 'technology', dur: 4.8, still: 2.8,
    desc: 'Ducks into a power ring, restores three system lights, then bounces back ready. Use for restarting a sandbox.', run(c) {
    const {p, t} = c, show = gate(t, .1, .45, 4, 4.65), duck = gate(t, .45, 1.2, 1.8, 2.6), wake = gate(t, 2.4, 2.7, 3.7, 4.2);
    c.prop({t: 'ring', key: 'tech:reboot-ring', x: 0, y: 13, r: 17 * show, tilt: 67, rot: 0, w: .8, color: 'lavender', o: show, layer: 'back'});
    p.body.sy *= 1 - .68 * duck; p.body.sx *= 1 + .1 * duck; p.body.y += 7 * duck - 4 * wake;
    p.lid[0].top += .85 * duck; p.lid[1].top += .85 * duck;
    const boot = Ease.inOut((t - 1.4) / 1.2);
    for (let i = 0; i < 3; i++) dot(c, 'boot-led' + i, (i - 1) * 5, 22, .8, {o: show, color: boot > (i + 1) / 4 ? 'mint' : 'lavender'});
    const mark = show * gate(t, .4, .75, 3.4, 3.8);
    line(c, 'power-stem', [[0, -16], [0, -21]], {o: mark, color: 'sky'});
    const arc = Array.from({length: 17}, (_, i) => { const a = (.2 + i / 16 * 1.6) * Math.PI; return [Math.sin(a) * 4.5, -16 - Math.cos(a) * 4.5]; });
    line(c, 'power-ring', arc, {o: mark, color: 'sky'});
    c.expr('happy', .7 * wake); c.look(0, -5, wake);
    if (c.at(2.55)) { c.cue('pop'); c.fx('ring', {x: 0, y: 13, size: 4, grow: 3, life: .6, color: 'mint'}); }
  }});

  def('tech-peek', {label: 'Peek at the code', group: 'technology', dur: 5.2, still: 2.4,
    desc: 'Peeks over a code editor, scans a few lines, then slides the panel aside. Use for reviewing a learner’s project.', run(c) {
    const {p, t} = c, show = gate(t, .2, .9, 3.9, 5), peek = gate(t, .6, 1.3, 3.2, 4.2);
    p.body.y -= 6.5 * peek; p.body.sy *= 1 - .08 * show; p.body.rot += 2 * Math.sin(t * 3) * peek;
    panel(c, 'peek-editor', 0, 16, 41, 23, show);
    for (let i = 0; i < 4; i++) line(c, 'code-line' + i, [[-14 + i % 2 * 3, 12 + i * 3], [10 - i % 2 * 5, 12 + i * 3]], {o: show, w: .65, color: i % 2 ? 'sky' : 'lavender'});
    const scan = Math.sin(t * 4) * 7; c.look(scan, 14 + (Math.floor(t * 1.8) % 3) * 2, peek, 22); c.expr('curious', .65 * peek);
    c.reach(0, -20, 11, show); c.reach(1, 20, 11, show); check(c, 'peek-ok', 14, 22, .7, show * gate(t, 2.8, 3.1, 3.7, 4.1));
    if (c.at(3.05)) c.cue('spot');
  }});

  def('tech-compile', {label: 'Compile whirlwind', group: 'technology', dur: 5.8, still: 3.8,
    desc: 'Sweeps loose code cards into a miniature compiler, then presents a working chip. Use for building a project.', run(c) {
    const {p, t} = c, show = gate(t, .3, .8, 4.8, 5.6), swirl = gate(t, .65, 1.2, 3, 3.75), result = gate(t, 3.1, 3.6, 4.8, 5.5);
    p.body.y -= 3 * show; p.body.rot += 7 * Math.sin(t * 6) * swirl; p.body.sx *= 1 - .12 * swirl; p.body.sy *= 1 + .08 * swirl;
    for (let i = 0; i < 4; i++) {
      const a = t * 5 + i * TAU / 4, r = 18 * (1 - Ease.inOut((t - 2.6) / 1.1)), x = Math.cos(a) * r, y = 11 + Math.sin(a) * r * .45;
      rect(c, 'compile-card' + i, x, y, 5, 4, {o: swirl, color: i % 2 ? 'sky' : 'lavender', layer: 'back'});
      line(c, 'compile-card-mark' + i, [[x - 1, y], [x + 1, y]], {o: swirl, color: 'mint', layer: 'back', w: .4});
    }
    for (let i = 0; i < 3; i++) c.prop({t: 'ring', key: 'tech:compile-vortex' + i, x: 0, y: 12 + i * 3.5, r: (17 - i * 4) * swirl, tilt: 76, rot: 0, w: .4, o: swirl * .65, color: 'lavender', layer: 'back'});
    chip(c, 'compiled-chip', 0, 18, 1.1, result); check(c, 'compiled-ok', 13, 17, 1, result);
    c.reach(0, -8, 18, result); c.reach(1, 8, 18, result); c.expr('focused', .7 * swirl); c.expr('happy', .8 * result); c.look(0, 17, show, 25);
    if (c.at(3.55)) { c.cue('ding'); c.fx('sparkle', {x: 0, y: 17, n: 8, radial: true, speed: 16, size: .45, life: .8, colors: ['mint', 'sky', 'yellow']}); }
  }});
}
