import assert from 'node:assert/strict';
import {createGeeky,STATE_META,ALIASES} from '../src/geeky-player.mjs';
let tests=0;function test(name,fn){fn();tests++;console.log('PASS',name)}
let queue=new Map(),serial=0,now=0,mediaListeners=new Set(),docListeners=new Map();
const host={nodeType:1,innerHTML:'original',attributes:{},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]}};
const media={matches:false,addEventListener(t,fn){mediaListeners.add(fn)},removeEventListener(t,fn){mediaListeners.delete(fn)}};
globalThis.document={hidden:false,querySelector:s=>s==='#geeky'?host:null,addEventListener(t,fn){docListeners.set(fn,t)},removeEventListener(t,fn){docListeners.delete(fn)}};
globalThis.matchMedia=()=>media;globalThis.requestAnimationFrame=fn=>{let id=++serial;queue.set(id,fn);return id};globalThis.cancelAnimationFrame=id=>queue.delete(id);
function step(ms=40){now+=ms;const jobs=[...queue.values()];queue.clear();jobs.forEach(fn=>fn(now))}
let p=createGeeky('#geeky');
test('initial source rendering',()=>{assert.equal(p.getState().state,'idle');assert.match(host.innerHTML,/<svg/);assert.match(host.innerHTML,/#000000/);assert.ok(!host.innerHTML.includes('Gradient'));const h={...host,attributes:{},innerHTML:''};const other=createGeeky(h,{autoplay:false});assert.notEqual(p.toSVG().match(/id="([^"]+)/)[1],other.toSVG().match(/id="([^"]+)/)[1]);other.destroy()});
test('all canonical states',()=>{for(const state of Object.keys(STATE_META)){p.playState(state,{transitionMs:0}).pause().seek(1.5);assert.equal(p.getState().state,state);assert.ok(!/NaN|Infinity/.test(p.toSVG()))}});
test('aliases resolve',()=>{for(const [a,b] of Object.entries(ALIASES)){p.playState(a).pause();assert.equal(p.getState().state,b)}});
test('pause holds time',()=>{p.playState('idle',{transitionMs:0});step();step(80);p.pause();let t=p.getState().time;step(100);assert.equal(p.getState().time,t);assert.equal(queue.size,0)});
test('resume advances',()=>{p.resume();step();step(80);assert.ok(p.getState().time>0);p.pause()});
test('seek and speed bounds',()=>{p.seek(2);assert.equal(p.getState().time,2);assert.throws(()=>p.seek(4.1));p.setSpeed(2);assert.equal(p.getState().speed,2);assert.throws(()=>p.setSpeed(0));p.setSpeed(1)});
test('all16 gaze values and wrap',()=>{for(let i=0;i<16;i++){p.gaze(i*22.5);assert.equal(p.getState().gaze,i*22.5);assert.ok(!p.toSVG().includes('NaN'))}p.gaze(-90);assert.equal(p.getState().gaze,270);p.gaze(null);assert.equal(p.getState().gaze,null)});
test('one-shot completes exactly once',()=>{let n=0;p.playState('waving',{loop:false,transitionMs:0,onComplete:()=>n++});for(let i=0;i<50;i++)step(100);assert.equal(n,1);assert.equal(p.getState().playing,false);assert.equal(p.getState().time,4)});
test('loop wraps without completion',()=>{let n=0;p.playState('idle',{loop:true,transitionMs:0,onComplete:()=>n++});for(let i=0;i<55;i++)step(100);assert.equal(n,0);assert.ok(p.getState().time<4);p.pause()});
test('transition interruptions stay finite',()=>{p.playState('orbit',{transitionMs:0}).seek(1.5);p.playState('closer-look',{transitionMs:200});step();step(50);p.playState('flutter-left',{transitionMs:150});for(let i=0;i<8;i++)step(40);assert.ok(!/NaN|Infinity/.test(p.toSVG()));p.pause()});
test('reduced motion is static',()=>{p.setReducedMotion(true).playState('orbit');assert.equal(p.getState().reducedMotion,true);assert.equal(p.getState().time,STATE_META.running.stillTime);assert.equal(queue.size,0);assert.equal(p.getState().animating,false)});
test('system preference updates',()=>{p.setReducedMotion('system');media.matches=true;mediaListeners.forEach(fn=>fn({matches:true}));assert.equal(p.getState().reducedMotion,true);assert.equal(queue.size,0);media.matches=false;mediaListeners.forEach(fn=>fn({matches:false}));assert.equal(p.getState().reducedMotion,false);p.pause()});
test('hidden document stops scheduling',()=>{p.resume();document.hidden=true;docListeners.forEach((t,fn)=>fn());assert.equal(queue.size,0);document.hidden=false;docListeners.forEach((t,fn)=>fn());assert.equal(queue.size,1);p.pause()});
test('input guards',()=>{assert.throws(()=>p.playState('unknown'));assert.throws(()=>p.playState('idle',{loop:'yes'}));assert.throws(()=>p.gaze(NaN));assert.throws(()=>p.setReducedMotion('maybe'));assert.throws(()=>createGeeky('#missing'));assert.throws(()=>createGeeky(host,{frameColor:'red;url(x)'}))});
test('destroy is idempotent and cleans up',()=>{p.destroy();p.destroy();assert.equal(host.innerHTML,'original');assert.equal(queue.size,0);assert.equal(mediaListeners.size,0);assert.equal(docListeners.size,0);assert.throws(()=>p.resume())});
console.log(JSON.stringify({ok:true,tests,scope:'Mock DOM API/lifecycle tests; not a browser rendering test'}));
