/* Additive GuateGeeks pack: small renderer-neutral props, drawn with the existing rig. */
export function line(c, key, pts, {color = 'frame', w = .7, o = 1, layer = 'front', closed = false, z = layer === 'back' ? -4 : 6} = {}) {
  c.prop({t: 'line', key: 'tech:' + key, pts: pts.map(q => Array.isArray(q) ? {x: q[0], y: q[1], z: q[2] ?? z} : {...q, z: q.z ?? z}), color, w, o, layer, closed});
}
export function rect(c, key, x, y, width, height, opts = {}) {
  line(c, key, [[x - width / 2, y - height / 2], [x + width / 2, y - height / 2], [x + width / 2, y + height / 2], [x - width / 2, y + height / 2]], {...opts, closed: true});
}
export function dot(c, key, x, y, r, {color = 'mint', o = 1, layer = 'front', z = layer === 'back' ? -4 : 6} = {}) {
  c.prop({t: 'glyph', key: 'tech:' + key, kind: 'dot', x, y, z, s: r, color, o, layer});
}
export function code(c, key, x, y, s, o = 1) {
  line(c, key + '-left', [[x - 2 * s, y - 2 * s], [x - 4 * s, y], [x - 2 * s, y + 2 * s]], {o, color: 'sky'});
  line(c, key + '-right', [[x + 2 * s, y - 2 * s], [x + 4 * s, y], [x + 2 * s, y + 2 * s]], {o, color: 'sky'});
  line(c, key + '-slash', [[x + .7 * s, y - 2.6 * s], [x - .7 * s, y + 2.6 * s]], {o, color: 'lavender'});
}
export function check(c, key, x, y, s, o = 1) {
  line(c, key, [[x - 2 * s, y], [x - .5 * s, y + 1.5 * s], [x + 2.7 * s, y - 2 * s]], {w: 1, color: 'mint', o});
}
export function panel(c, key, x, y, width, height, o = 1) {
  rect(c, key, x, y, width, height, {w: .8, o});
  line(c, key + '-bar', [[x - width / 2, y - height / 2 + 3], [x + width / 2, y - height / 2 + 3]], {w: .45, o});
  for (let i = 0; i < 3; i++) dot(c, key + '-dot' + i, x - width / 2 + 2 + i * 1.6, y - height / 2 + 1.5, .33, {o, color: i === 2 ? 'mint' : 'lavender'});
}
export function chip(c, key, x, y, s, o = 1) {
  rect(c, key, x, y, 8 * s, 8 * s, {w: .9, o});
  rect(c, key + '-core', x, y, 4 * s, 4 * s, {w: .6, color: 'mint', o});
  for (let i = 0; i < 3; i++) {
    const a = (i - 1) * 2 * s;
    for (const sign of [-1, 1]) {
      line(c, key + '-h' + i + sign, [[x + sign * 4 * s, y + a], [x + sign * 6 * s, y + a]], {w: .6, o});
      line(c, key + '-v' + i + sign, [[x + a, y + sign * 4 * s], [x + a, y + sign * 6 * s]], {w: .6, o});
    }
  }
}
