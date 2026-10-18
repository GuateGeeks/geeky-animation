/* Landing page: a live Geeky in the hero that hands over to the corner assistant on scroll. */
import {createGeekyLive, createGeekyAssistant, resolveAction} from './src/live/index.mjs';

const art = document.querySelector('#hero-geeky'), label = document.querySelector('#hero-label');
const host = document.createElement('div');
host.className = 'hero-live';
art.prepend(host);
art.querySelector('img')?.remove();

const hero = createGeekyLive(host, {renderer: 'svg', dragMode: 'spin', label: 'Geeky, interactive. Click to poke, drag to spin.', zoom: .9});
const reel = ['waving', 'review', 'jumping', 'running', 'searching', 'love', 'bicycle', 'idea', 'celebrate', 'thinking'];
let step = 0, lastTouch = performance.now();
const showLabel = id => { const a = resolveAction(id); label.textContent = id === 'idle' ? 'Move your cursor. Click me.' : a.desc; };
hero.on('start', ({id}) => showLabel(id));
hero.on('poke', () => { lastTouch = performance.now(); });
hero.on('spin', () => { lastTouch = performance.now(); });
showLabel('idle');
setInterval(() => {
  if (performance.now() - lastTouch < 6000 || hero.getState().action !== 'idle' || document.hidden) return;
  const id = reel[step++ % reel.length];
  hero.play(id).then(() => {});
  if (resolveAction(id).loop) setTimeout(() => { if (hero.getState().action === resolveAction(id).id) hero.stop(); }, 3800);
}, 5200);

// The corner assistant appears once the hero scrolls away, and steps aside when it returns.
let assistant = null;
new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) { assistant?.tuck(); hero.resume(); hero.play('greet', {blend: 0}); return; }
  hero.play('running-right'); setTimeout(() => hero.pause(), 900);
  if (!assistant) {
    assistant = createGeekyAssistant({
      greeting: false, storageKey: 'geeky-site', THREE: () => import('./vendor/three/three.module.js'),
      answers: [
        {match: /download|asset|gif|webp|sprite|svg file/i, reply: 'Scroll to “Ready for your next idea” — every state has SVG, WebP, GIF and sprite downloads.', action: 'point'},
        {match: /playground|demo|play/i, reply: 'The playground has every animation, both renderers and a writer that I like to read over your shoulder.', action: 'idea'}
      ]
    });
    globalThis.geeky = assistant;
    if (!assistant.state.hidden) { assistant.play('greet', {blend: 0}); setTimeout(() => assistant.say('I’ll tag along while you scroll. Double-click me for tricks, or hover a download.', {timeout: 5200}), 1400); }
  } else assistant.untuck();
}, {threshold: .15}).observe(art);
