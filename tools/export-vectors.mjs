import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defs,character,statePose,C,PATHS} from '../src/geeky-motion.mjs';
import {STATE_META,ALIASES,VIEWBOX} from '../src/geeky-player.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'.export');fs.mkdirSync(out,{recursive:true});
const svg=(q,label='Geeky')=>`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="${VIEWBOX}" role="img" aria-label="${label}">${defs}${character(q)}</svg>`;
const put=(file,text)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text)};
put(path.join(root,'assets/static/Geeky.svg'),svg(statePose('idle',0)));
const states=[];
for(const [id,meta] of Object.entries(STATE_META)){
 const dir=path.join(root,'assets/states',id);fs.mkdirSync(dir,{recursive:true});
 const frames=Array.from({length:97},(_,i)=>character(statePose(id,i/24)));
 put(path.join(out,id+'.json'),JSON.stringify({defs,frames}));
 put(path.join(dir,'poster.svg'),svg(statePose(id,meta.stillTime),`Geeky: ${meta.label}`));
 states.push({id,label:meta.label,durationMs:4000,defaultLoop:meta.loop,posterTimeMs:meta.stillTime*1000,aliases:Object.keys(ALIASES).filter(a=>ALIASES[a]===id),files:Object.fromEntries(['animation.svg','animation.gif','animation.webp','poster.svg','poster.png','poster.webp','sprites.png','sprites.webp'].map(f=>[f.replaceAll('.','_'),`assets/states/${id}/${f}`])),sprite:{frameWidth:128,frameHeight:128,columns:8,rows:12,frameCount:96,fps:24,order:'row-major',width:1024,height:1536},animatedRaster:{width:256,height:256,frameCount:48,fps:12,loop:true}});
}
const gazes=[];
for(let i=0;i<16;i++){
 const angle=i*22.5,rad=angle*Math.PI/180,name='gaze-'+String(Math.floor(angle)).padStart(3,'0')+(angle%1?'_5':'');
 const q=statePose('idle',0);q.g=C.map(c=>({x:c.x-c.px+Math.sin(rad)*2.75,y:c.y-c.py-Math.cos(rad)*2.75}));
 put(path.join(root,'assets/gaze',name+'.svg'),svg(q,`Geeky looking ${angle} degrees clockwise from up`));
 gazes.push({index:i,degrees:angle,svg:`assets/gaze/${name}.svg`,png:`assets/gaze/${name}.png`,webp:`assets/gaze/${name}.webp`,sprite:{column:i%4,row:Math.floor(i/4)}});
}
const manifest={schema:'geeky-animation-kit',version:'1.0.0',character:'Geeky',style:{frame:'#34314f',pupils:'#000000',eyes:'#ffffff',originalEyePaths:true,metallic:false},coordinates:{viewBox:[-30,-30,60,60],registration:'fixed center, identical across every exported frame',gaze:{units:'degrees',zero:'up',positive:'clockwise as viewed',right:90,down:180,left:270,steps:16,stepDegrees:22.5,null:'natural animation gaze'}},source:{original:'assets/original/Geeky-Original.svg',rig:'src/geeky-motion.mjs',player:'src/geeky-player.mjs',browserBuild:'dist/geeky-player.js'},static:{svg:'assets/static/Geeky.svg',png:'assets/static/Geeky.png',webp:'assets/static/Geeky.webp'},states,gazes,gazeSprite:{png:'assets/gaze/gaze-sprites.png',webp:'assets/gaze/gaze-sprites.webp',frameWidth:128,frameHeight:128,columns:4,rows:4,frameCount:16,width:512,height:512,order:'row-major'},preview:'previews/Geeky-Matte-Showcase.mp4',docs:{guide:'docs/Geeky-Animation-Guide.pdf',editableGuide:'docs/Geeky-Animation-Guide.docx',api:'docs/API.md',assets:'docs/ASSETS.md',tests:'docs/TEST-REPORT.md'},notes:['Animated SVG, GIF and WebP assets repeat indefinitely; runtime state defaults are separate.','GIF uses binary transparency and centisecond timing; SVG/PNG/WebP preserve smooth alpha.','This reusable vector kit is separate from the image-generated dot pet sprite sheet.','Native WebView shells and native sprite playback are integration work, not prebuilt SDKs.']};
put(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Wrote 9 state sequences, 16 gazes, static SVG and manifest');
