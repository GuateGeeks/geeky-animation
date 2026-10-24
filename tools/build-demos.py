from pathlib import Path
p=Path(__file__).resolve().parents[1];bundle=(p/'dist/geeky-player.js').read_text(encoding='utf-8')
head='''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f8f7fc">
<title>Geeky Animation Kit</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#f8f7fc;color:#34314f;font:16px/1.5 system-ui,sans-serif}
main{max-width:1120px;margin:0 auto;padding:24px max(16px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
header{margin-bottom:20px}
.eyebrow{margin:0 0 8px;color:#79648f;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
h1{font-size:clamp(28px,6vw,40px);line-height:1.12;letter-spacing:-1px;margin:0}
header p:last-child{max-width:42ch;margin:12px 0 0;color:#756a84}
.layout{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
.stage{--stage-size:clamp(260px,82vw,400px);height:var(--stage-size);display:grid;place-items:center;padding:20px;overflow:clip;background:#eeeaf8;border:1px solid #dfd8ed;border-radius:24px}
#geeky{width:var(--preview-size,320px);max-width:min(100%,calc(var(--stage-size) - 40px));height:auto;aspect-ratio:1}
#geeky svg{display:block;width:100%;height:100%}
.panel{min-width:0;padding:18px;background:white;border:1px solid #e2ddeb;border-radius:24px}
h2{margin:0 0 12px;font-size:16px;line-height:1.4}
.states{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.states button:last-child{grid-column:1/-1}
button,select{min-height:48px;max-width:100%;font:inherit;line-height:1.3;padding:11px 12px;border:1px solid #d6cde5;border-radius:12px;background:#fbfaff;color:#34314f;cursor:pointer;touch-action:manipulation}
button{white-space:normal;overflow-wrap:anywhere}
button:active{background:#eee8f7}
button[aria-pressed="true"]{background:#dcd1f2;border-color:#9e88c4;font-weight:600}
button:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible{outline:3px solid #9e88c4;outline-offset:3px}
.control-group{margin-top:24px;padding-top:20px;border-top:1px solid #eee8f5}
.playback{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.loop{display:flex;align-items:center;gap:10px;min-height:48px;margin-top:8px;color:#51465f;cursor:pointer}
input[type=checkbox]{width:22px;height:22px;margin:0;accent-color:#8c72b2}
.fields{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
.field{display:grid;gap:6px;min-width:0;color:#756a84;font-size:13px;font-weight:500}
.field select{width:100%;min-width:0;font-size:16px;font-weight:400}
.scrub{margin-top:16px}
input[type=range]{width:100%;min-width:0;min-height:44px;margin:0;accent-color:#8c72b2;cursor:pointer}
.export{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;align-items:end;margin-top:16px}
.note{margin:16px 0 0;color:#756a84;font-size:13px;line-height:1.6}
.status-details{margin-top:20px;border-top:1px solid #eee8f5}
summary{min-height:48px;display:list-item;align-content:center;padding:12px 0;color:#756a84;font-size:13px;cursor:pointer;touch-action:manipulation}
#status{max-width:100%;margin:0;background:#f3f0f8;border-radius:12px;padding:14px;font:12px/1.6 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere}
footer{margin:24px 0 0;color:#756a84;font-size:13px;line-height:1.6;overflow-wrap:anywhere}
@media(hover:hover){button:hover{background:#eee8f7}}
@media(min-width:480px){.states{grid-template-columns:repeat(3,minmax(0,1fr))}.states button:last-child{grid-column:auto}.fields,.export{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(min-width:900px){main{padding-top:40px;padding-right:32px;padding-left:32px}header{margin-bottom:28px}.layout{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:24px;align-items:start}.stage{--stage-size:440px;position:sticky;top:24px}.panel{padding:24px}}
</style>
</head>
<body>
<main>
<header><p class="eyebrow">Classic player</p><h1>Geeky, ready to play.</h1><p>Original eyes. Matte frames. Nine expressive states and sixteen gaze directions.</p></header>
<div class="layout">
<section class="stage" aria-label="Animation preview"><div id="geeky"></div></section>
<section class="panel" aria-label="Animation controls">
<h2>Choose an expression</h2>
<nav class="states" aria-label="Choose animation"></nav>
<div class="control-group">
<h2>Playback</h2>
<div class="playback"><button id="pause">Pause</button><button id="resume">Resume</button></div>
<label class="loop"><input id="loop" type="checkbox" checked> Loop state</label>
</div>
<div class="control-group">
<h2>Make it your own</h2>
<div class="fields">
<label class="field">Speed <select id="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
<label class="field">Gaze <select id="gaze"><option value="">Natural</option></select></label>
<label class="field">Motion <select id="reduced"><option value="system">System setting</option><option value="true">Reduced</option><option value="false">Full</option></select></label>
<label class="field">Size <select id="size"><option value="64">64 px</option><option value="128">128 px</option><option value="256">256 px</option><option value="320" selected>320 px</option></select></label>
</div>
<label class="field scrub" for="seek">Scrub (pauses motion)<input id="seek" type="range" min="0" max="4" step="0.01" value="0"></label>
<div class="export"><button id="snapshot">Save current SVG</button></div>
<p class="note">A reduced-motion preference shows a meaningful still pose. “Full” is an explicit override for testing.</p>
</div>
<details class="status-details"><summary>Player state</summary><pre id="status" aria-live="off"></pre></details>
</section>
</div>
<footer>This self-contained demo runs offline. See docs/API.md and manifest.json for integration details.</footer>
</main>
<script>'''
script='''
const labels={idle:'Curious','running-right':'Flutter right','running-left':'Flutter left',waving:'Hello',jumping:'Delight',failed:'Oops',waiting:'Waiting',running:'Orbit',review:'Closer look'};
const player=Geeky.createGeeky('#geeky',{onStateChange:update});window.demoPlayer=player;
function update(){if(typeof player==='undefined')return;let s=player.getState();document.querySelector('#status').textContent=JSON.stringify(s,null,2);document.querySelector('#loop').checked=s.loop;document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.state===s.state));document.querySelector('#seek').value=s.time;}
Object.entries(labels).forEach(([id,label])=>{let b=document.createElement('button');b.textContent=label;b.dataset.state=id;b.onclick=()=>{player.playState(id);update()};document.querySelector('.states').append(b)});
for(let i=0;i<16;i++){let o=document.createElement('option');o.value=i*22.5;o.textContent=`${i*22.5}°${i===0?' · up':i===4?' · right':i===8?' · down':i===12?' · left':''}`;document.querySelector('#gaze').append(o)}
document.querySelector('#pause').onclick=()=>{player.pause();update()};document.querySelector('#resume').onclick=()=>{player.resume();update()};document.querySelector('#loop').onchange=e=>{player.playState(player.getState().state,{loop:e.target.checked});update()};document.querySelector('#speed').onchange=e=>{player.setSpeed(Number(e.target.value));update()};document.querySelector('#gaze').onchange=e=>{player.gaze(e.target.value===''?null:Number(e.target.value));update()};document.querySelector('#reduced').onchange=e=>{player.setReducedMotion(e.target.value==='system'?'system':e.target.value==='true');update()};document.querySelector('#seek').oninput=e=>{player.pause().seek(Number(e.target.value));update()};document.querySelector('#size').onchange=e=>{document.querySelector('#geeky').style.setProperty('--preview-size',e.target.value+'px')};
document.querySelector('#snapshot').onclick=()=>{let a=document.createElement('a'),url=URL.createObjectURL(new Blob([player.toSVG()],{type:'image/svg+xml'}));a.href=url;a.download='Geeky-pose.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)};update();setInterval(update,300);window.addEventListener('pagehide',()=>player.pause());
'''
(p/'demo/index.html').write_text(head+bundle+script+'</script></body></html>',encoding='utf-8')
mobile='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Geeky WebView</title><style>*{box-sizing:border-box}html,body{margin:0;width:100%;background:transparent;color:#34314f;font:16px/1.5 system-ui}body{min-height:100vh;min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}#geeky{width:min(78vw,320px);max-width:100%;height:auto;aspect-ratio:1;flex-shrink:0}#geeky svg{display:block;width:100%;height:100%}nav{width:100%;max-width:480px;display:flex;flex-wrap:wrap;justify-content:center;gap:8px}button{min-height:48px;max-width:100%;font:inherit;border:1px solid #d6cde5;border-radius:12px;background:#f8f7fc;color:#34314f;padding:10px 16px;cursor:pointer;touch-action:manipulation}button:focus-visible{outline:3px solid #9e88c4;outline-offset:3px}button:active{background:#eee8f7}small{max-width:320px;text-align:center;color:#756a84;font-size:12px;overflow-wrap:anywhere}@media(orientation:landscape) and (max-height:500px){#geeky{width:min(46vh,220px)}}</style></head><body><div id="geeky"></div><nav aria-label="Animation controls"><button data-state="idle">Idle</button><button data-state="orbit">Orbit</button><button data-state="closer-look">Closer look</button><button id="pause">Pause</button><button id="resume">Resume</button></nav><small>Offline WebView example. Host commands use window.GeekyBridge.receive(command).</small><script>'''+bundle+'''
function emit(payload){const message=JSON.stringify(payload);if(typeof window.ReactNativeWebView?.postMessage==='function')window.ReactNativeWebView.postMessage(message);else if(typeof window.webkit?.messageHandlers?.geeky?.postMessage==='function')window.webkit.messageHandlers.geeky.postMessage(payload);else if(typeof window.GeekyNative?.postMessage==='function')window.GeekyNative.postMessage(message)}
const player=Geeky.createGeeky('#geeky',{onStateChange:state=>emit({type:'statechange',state})});window.mobilePlayer=player;
window.GeekyBridge={receive(command){if(typeof command==='string')command=JSON.parse(command);if(!command||typeof command.type!=='string')throw new TypeError('A command object with a type is required');switch(command.type){case'playState':player.playState(command.state,{loop:command.loop,transitionMs:command.transitionMs??180,onComplete:state=>emit({type:'complete',state})});break;case'pause':player.pause();break;case'resume':player.resume();break;case'gaze':player.gaze(command.degrees??null);break;case'reducedMotion':player.setReducedMotion(command.value);break;case'speed':player.setSpeed(command.value);break;case'seek':player.pause().seek(command.seconds);break;default:throw new RangeError('Unknown command type')}return player.getState()},getState(){return player.getState()}};
document.querySelectorAll('[data-state]').forEach(b=>b.onclick=()=>player.playState(b.dataset.state));document.querySelector('#pause').onclick=()=>player.pause();document.querySelector('#resume').onclick=()=>player.resume();emit({type:'ready',state:player.getState()});window.addEventListener('pagehide',()=>player.pause());
</script></body></html>'''
(p/'examples/mobile-webview/geeky-webview.html').write_text(mobile,encoding='utf-8')
