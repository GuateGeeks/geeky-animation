/* Geeky Live playground wiring. Three.js loads only when 3-D is first requested. */
import {createGeekyAssistant, ACTION_LIST, GROUPS} from '../src/live/index.mjs';

const $ = s => document.querySelector(s);
const stage = $('#stage'), away = $('#away'), popout = $('#popout');

const geeky = createGeekyAssistant({
  dock: stage,
  greeting: false,
  THREE: () => import('../vendor/three/three.module.js'),
  storageKey: 'geeky-live-playground',
  answers: [
    {match: /download|asset|gif|webp|sprite/i, reply: 'The classic exports — SVG, GIF, WebP and sprite sheets — are on the home page under “Assets”.', action: 'point'},
    {match: /clippy|paperclip/i, reply: 'Never heard of him. I’m a pair of glasses. Totally different.', action: 'shrug'}
  ]
});
globalThis.geeky = geeky; // Say hi from the console: geeky.say('Hello!')

/* Renderer toggle. */
const seg = {svg: $('#r-svg'), three: $('#r-three')};
const syncRenderer = kind => { for (const k in seg) seg[k].setAttribute('aria-pressed', String(k === kind)); };
seg.svg.addEventListener('click', () => geeky.setRenderer('svg'));
seg.three.addEventListener('click', async () => { seg.three.textContent = 'Loading 3-D…'; try { await geeky.setRenderer('three'); } finally { seg.three.textContent = '3-D · Three.js'; } });
geeky.on('renderer', ({kind}) => syncRenderer(kind));

/* Dock / pop out. */
async function popOut() {
  const r = stage.getBoundingClientRect(), s = geeky.o.size;
  geeky.float(r.left + r.width / 2 - s / 2, r.top + r.height / 2 - s / 2);
  away.hidden = false; popout.textContent = 'Dock ↙';
  await geeky.moveTo(innerWidth - s - 24, innerHeight - s - 24);
  geeky.say('Free! Drag me anywhere. Long-press or right-click me for options.', {timeout: 3600});
}
function dockBack() {
  if (geeky.state.hidden) geeky.show();
  geeky.dock(stage); away.hidden = true; popout.textContent = 'Pop out ↗';
  geeky.play('greet', {blend: 0});
}
popout.addEventListener('click', () => geeky.floating ? dockBack() : popOut());
$('#dock-back').addEventListener('click', dockBack);
geeky.on('hide', () => { if (!geeky.floating) { away.hidden = false; away.querySelector('p').textContent = 'Geeky is taking a little break.'; } });
geeky.on('show', () => { if (!geeky.floating) away.hidden = true; });

$('#ask').addEventListener('click', () => geeky.ask());
$('#animate').addEventListener('click', () => geeky.animate());
$('#stop').addEventListener('click', () => { geeky.actor.setBase('idle'); geeky.actor.stop(); });

/* Library. */
const lib = $('#library'), buttons = new Map(), libraryGroups = new Map();
const newActionGroups = new Set(['technology', 'guategeeks']);
const isNewAction = a => newActionGroups.has(a.group);
const collectionMatchers = {all: () => true, new: isNewAction, original: a => !isNewAction(a)};
const collectionButtons = [...document.querySelectorAll('[data-collection]')];
let scrollWatchTimer = null, previousScrollWatch;
for (const [group, title] of Object.entries(GROUPS)) {
  const items = ACTION_LIST.filter(a => a.group === group);
  if (!items.length) continue;
  const box = document.createElement('div'); box.className = 'group';
  box.innerHTML = '<h3></h3><div class="acts"></div>'; box.firstChild.textContent = title;
  for (const a of items) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'act'; b.title = a.description; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<strong></strong><small></small>';
    b.firstChild.textContent = a.label; b.lastChild.textContent = a.loop ? `${a.id} ↻` : a.id;
    b.addEventListener('click', () => {
      if (isNewAction(a) && innerWidth < 960) {
        if (scrollWatchTimer === null) previousScrollWatch = geeky.watch.scroll;
        clearTimeout(scrollWatchTimer);
        geeky.watch.scroll = false;
        // This intentional preview scroll should not interrupt the chosen action.
        $('#stage-title').scrollIntoView({behavior: 'instant', block: 'start'});
        scrollWatchTimer = setTimeout(() => {
          geeky.watch.scroll = previousScrollWatch;
          scrollWatchTimer = null;
        }, 250);
        geeky.play(a.id);
        return;
      }
      if (a.id === 'point') geeky.play('point', {params: {angle: 35}});
      else if (a.id === 'goodbye') geeky.play('goodbye').then(() => setTimeout(() => geeky.play('greet', {blend: 0}), 700));
      else geeky.play(a.id);
    });
    buttons.set(a.id, b); box.lastChild.appendChild(b);
  }
  lib.appendChild(box);
  libraryGroups.set(group, {box, items});
}
function setCollection(collection) {
  const matches = collectionMatchers[collection];
  for (const b of collectionButtons) b.setAttribute('aria-pressed', String(b.dataset.collection === collection));
  for (const a of ACTION_LIST) buttons.get(a.id).hidden = !matches(a);
  for (const {box, items} of libraryGroups.values()) box.hidden = !items.some(matches);
  const visibleCount = ACTION_LIST.filter(matches).length;
  $('#count').textContent = collection === 'all' ? `${visibleCount} actions` : `${visibleCount} of ${ACTION_LIST.length} actions`;
}
for (const b of collectionButtons) {
  const collection = b.dataset.collection;
  b.querySelector('[data-collection-count]').textContent = ACTION_LIST.filter(collectionMatchers[collection]).length;
  b.addEventListener('click', () => setCollection(collection));
}
const requestedCollection = new URLSearchParams(location.search).get('collection');
setCollection(Object.hasOwn(collectionMatchers, requestedCollection) ? requestedCollection : 'all');
geeky.actor.on('start', ({id, loop}) => {
  for (const [k, b] of buttons) b.setAttribute('aria-pressed', String(k === id));
  const a = ACTION_LIST.find(x => x.id === id);
  $('#now').textContent = a ? `${a.label}${loop ? ' · looping' : ''}` : id;
  const useCase = $('#action-use-case');
  useCase.textContent = a && isNewAction(a) ? a.description : '';
  useCase.hidden = !useCase.textContent;
});

/* Moods. */
const moods = ['neutral', 'happy', 'curious', 'focused', 'sleepy', 'worried', 'sad', 'angry', 'skeptical', 'smug', 'shy', 'love'];
const moodBox = $('#moods');
for (const m of moods) {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = m; b.setAttribute('aria-pressed', String(m === 'neutral'));
  b.addEventListener('click', () => { geeky.setMood(m); moodBox.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
  moodBox.appendChild(b);
}

/* Controls. */
const speed = $('#speed'), out = $('#speed-out');
speed.addEventListener('input', () => { geeky.actor.setSpeed(Number(speed.value)); out.textContent = `${Number(speed.value).toFixed(2).replace(/\.?0+$/, '')}×`; });
$('#motion').addEventListener('change', e => { const v = e.target.value; geeky.actor.setReducedMotion(v === 'system' ? 'system' : v === 'true'); });
const sound = $('#sound'); sound.checked = geeky.sfx.on; sound.addEventListener('change', () => geeky.setSound(sound.checked));
$('#follow').addEventListener('change', e => geeky.actor.setFollowPointer(e.target.checked));
$('#say-form').addEventListener('submit', e => { e.preventDefault(); const v = $('#say').value.trim(); if (v) { geeky.say(v, {action: 'nod'}); $('#say').value = ''; } });

// The page introduces Geeky; keep the stage clear until a visitor asks for help.
geeky.play('greet', {blend: 0});
