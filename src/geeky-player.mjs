import {FRAME,C,defs,statePose,character} from './geeky-motion.mjs';
const mix=(a,b,w)=>a+(b-a)*w; const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
const STATE_META=Object.freeze({
 idle:{label:'Curious',loop:true,stillTime:1.5},
 'running-right':{label:'Flutter right',loop:true,stillTime:1.5},
 'running-left':{label:'Flutter left',loop:true,stillTime:1.5},
 waving:{label:'Hello',loop:false,stillTime:1.5},
 jumping:{label:'Delight',loop:false,stillTime:1.5},
 failed:{label:'Oops',loop:false,stillTime:1.5},
 waiting:{label:'Waiting',loop:true,stillTime:1.5},
 running:{label:'Orbit',loop:true,stillTime:1},
 review:{label:'Closer look',loop:true,stillTime:1.5}
});
const ALIASES=Object.freeze({'flutter-right':'running-right','flutter-left':'running-left',hello:'waving',delight:'jumping',oops:'failed',orbit:'running','closer-look':'review'});
const STATE_DURATION=4;
const VIEWBOX='-30 -30 60 60';
const resolveState=s=>{s=ALIASES[s]||s;if(!Object.hasOwn(STATE_META,s))throw new RangeError(`Unknown Geeky state: ${s}`);return s};
const number=(v,name,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw new RangeError(`${name} must be a number from ${min} to ${max}`);return v};
const reducedValue=v=>{if(v!=='system'&&v!==true&&v!==false)throw new TypeError('reducedMotion must be "system", true or false');return v};
const copyPose=q=>JSON.parse(JSON.stringify(q));
function blendPose(a,b,w){const q=copyPose(b);for(const key of ['p','g','eyes'])q[key]=b[key].map((v,i)=>Object.fromEntries(Object.keys(v).map(k=>[k,mix(a[key][i][k],v[k],w)])));q.lid=b.lid.map((v,i)=>mix(a.lid[i],v,w));for(const k of Object.keys(b.world))q.world[k]=mix(a.world[k],b.world[k],w);q.orbit=mix(a.orbit,b.orbit,w);q.zoom=mix(a.zoom,b.zoom,w);return q}
function applyGaze(q,angle){if(angle===null)return q;const r=angle*Math.PI/180,g=C.map(c=>({x:c.x-c.px+Math.sin(r)*2.75,y:c.y-c.py-Math.cos(r)*2.75}));q.g=g;q.orbitGaze=g;return q}
function characterSVG(q,{frameColor=FRAME,label='Geeky'}={}){const safe=String(label).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}" width="100%" height="100%" role="img" aria-label="${safe}" preserveAspectRatio="xMidYMid meet">${defs}${character(q)}</svg>`.replaceAll(FRAME,frameColor)}
let nextPlayerId=0;
/** Dependency-free browser SVG player. Create only after a DOM container exists. */
class GeekyPlayer{
 constructor(target,options={}){
  this._doc=globalThis.document;if(!this._doc)throw new Error('Create Geeky in a browser after the DOM is available. Importing the module on a server is safe.');
  this.host=typeof target==='string'?this._doc.querySelector(target):target;if(!this.host||this.host.nodeType!==1)throw new TypeError('Geeky needs a valid DOM element or matching selector');
  this._prefix=`geeky${++nextPlayerId}-`;this._original=this.host.innerHTML;this._state=resolveState(options.state||'idle');this._time=0;this._loop=options.loop??STATE_META[this._state].loop;this._speed=number(options.speed??1,'speed',.1,4);this._fps=number(options.fps??30,'fps',1,60);this._reduced=reducedValue(options.reducedMotion??'system');this._frameColor=options.frameColor||FRAME;if(!/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(this._frameColor))throw new TypeError('frameColor must be a 3- or 6-digit hex color');
  if(typeof this._loop!=='boolean')throw new TypeError('loop must be boolean');
  this._playing=options.autoplay!==false;this._gaze=null;this._transition=null;this._raf=null;this._last=null;this._lastRender=-Infinity;this._destroyed=false;this._onStateChange=typeof options.onStateChange==='function'?options.onStateChange:null;this._onComplete=null;
  this._media=typeof globalThis.matchMedia==='function'?globalThis.matchMedia('(prefers-reduced-motion: reduce)'):null;
  this._mediaChange=()=>{if(this._reduced==='system'){if(this._isReduced()){this._time=STATE_META[this._state].stillTime;this._transition=null;this._cancel()}this._render();this._schedule()}};
  this._media?.addEventListener?.('change',this._mediaChange);
  this._visibility=()=>{this._last=null;if(this._doc.hidden)this._cancel();else this._schedule()};this._doc.addEventListener('visibilitychange',this._visibility);
  if(this._isReduced())this._time=STATE_META[this._state].stillTime;this._render();this._schedule();
 }
 _assert(){if(this._destroyed)throw new Error('This Geeky player has been destroyed')}
 _isReduced(){return this._reduced===true||(this._reduced==='system'&&Boolean(this._media?.matches))}
 _cancel(){if(this._raf!==null){globalThis.cancelAnimationFrame(this._raf);this._raf=null}this._last=null}
 _schedule(){if(!this._destroyed&&this._playing&&!this._isReduced()&&!this._doc.hidden&&this._raf===null)this._raf=globalThis.requestAnimationFrame(t=>this._tick(t))}
 _tick(now){this._raf=null;if(this._destroyed||!this._playing||this._isReduced()||this._doc.hidden)return;const dt=this._last===null?0:Math.min((now-this._last)/1000,.1);this._last=now;this._time+=dt*this._speed;if(this._transition){this._transition.elapsed+=dt;if(this._transition.elapsed>=this._transition.duration)this._transition=null}
  let complete=false;if(this._time>=STATE_DURATION){if(this._loop)this._time%=STATE_DURATION;else{this._time=STATE_DURATION;this._playing=false;complete=true}}
  if(now-this._lastRender>=1000/this._fps||complete){this._render();this._lastRender=now}
  if(complete){const callback=this._onComplete;this._onComplete=null;callback?.(this.getState())}this._schedule();
 }
 _pose(){let q=statePose(this._state,this._time);if(this._transition)q=blendPose(this._transition.from,q,ease(this._transition.elapsed/this._transition.duration));return applyGaze(q,this._gaze)}
 _render(){this._currentPose=this._pose();this.host.innerHTML=this._svg();this.host.setAttribute('data-geeky-state',this._state)}
 playState(state,{loop,transitionMs=180,onComplete}={}){this._assert();state=resolveState(state);number(transitionMs,'transitionMs',0,2000);if(loop!==undefined&&typeof loop!=='boolean')throw new TypeError('loop must be boolean');if(onComplete!==undefined&&typeof onComplete!=='function')throw new TypeError('onComplete must be a function');const from=copyPose(this._currentPose);this._state=state;this._loop=loop??STATE_META[state].loop;this._time=this._isReduced()?STATE_META[state].stillTime:0;this._onComplete=onComplete||null;this._playing=true;this._last=null;this._transition=transitionMs>0&&!this._isReduced()?{from,elapsed:0,duration:transitionMs/1000}:null;this._render();this._onStateChange?.(this.getState());this._schedule();return this}
 pause(){this._assert();this._playing=false;this._cancel();return this}
 resume(){this._assert();if(this._time>=STATE_DURATION)this._time=0;this._playing=true;this._last=null;this._schedule();return this}
 seek(seconds){this._assert();number(seconds,'seconds',0,STATE_DURATION);this._time=seconds;this._transition=null;this._render();return this}
 setSpeed(rate){this._assert();this._speed=number(rate,'speed',.1,4);return this}
 gaze(degrees=null){this._assert();if(degrees!==null){if(typeof degrees!=='number'||!Number.isFinite(degrees))throw new TypeError('gaze must be a finite degree value or null');degrees=((degrees%360)+360)%360}this._gaze=degrees;this._render();return this}
 setReducedMotion(value){this._assert();this._reduced=reducedValue(value);if(this._isReduced()){this._time=STATE_META[this._state].stillTime;this._transition=null;this._cancel()}this._render();this._schedule();return this}
 getState(){this._assert();return{state:this._state,time:this._time,duration:STATE_DURATION,playing:this._playing,animating:this._playing&&!this._isReduced()&&!this._doc.hidden,loop:this._loop,speed:this._speed,reducedMotion:this._isReduced(),gaze:this._gaze}}
 _svg(){return characterSVG(this._currentPose,{frameColor:this._frameColor,label:`Geeky: ${STATE_META[this._state].label}`}).replace(/id="([^"]+)"/g,(_,id)=>`id="${this._prefix}${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${this._prefix}${id})`)}
 toSVG(){this._assert();return this._svg()}
 destroy(){if(this._destroyed)return;this._cancel();this._media?.removeEventListener?.('change',this._mediaChange);this._doc.removeEventListener('visibilitychange',this._visibility);this.host.innerHTML=this._original;this.host.removeAttribute('data-geeky-state');this._destroyed=true}
}
function createGeeky(target,options){return new GeekyPlayer(target,options)}

export {GeekyPlayer,createGeeky,STATE_META,ALIASES,STATE_DURATION,VIEWBOX,characterSVG};
