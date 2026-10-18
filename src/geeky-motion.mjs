const PATHS=["M19.102 12.829 C20.17 18.05 16.803 23.148 11.584 24.216 C6.364 25.284 1.266 21.917 0.198 16.697 C-0.871 11.477 2.497 6.379 7.717 5.312 C12.936 4.242 18.036 7.611 19.102 12.829 Z", "M18.655 13.181 C19.614 17.869 16.588 22.448 11.901 23.409 C7.211 24.367 2.631 21.344 1.672 16.655 C0.713 11.964 3.739 7.386 8.426 6.427 C13.116 5.468 17.696 8.489 18.655 13.181 Z", "M25.194 11.584 C26.26 16.804 31.358 20.17 36.579 19.103 C41.799 18.034 45.165 12.936 44.096 7.716 C43.03 2.497 37.932 -0.87 32.711 0.197 C27.491 1.265 24.125 6.364 25.194 11.584 Z", "M25.743 11.732 C26.702 16.42 31.28 19.445 35.971 18.486 C40.661 17.527 43.684 12.947 42.723 8.257 C41.766 3.568 37.186 0.544 32.497 1.503 C27.807 2.462 24.782 7.042 25.743 11.732 Z", "M15.202 13.433 C15.553 15.146 14.448 16.818 12.737 17.167 C11.024 17.517 9.352 16.413 9.002 14.702 C8.651 12.989 9.756 11.316 11.467 10.968 C13.18 10.616 14.852 11.72 15.202 13.433 Z", "M13.831 12.916 C13.934 13.418 13.61 13.907 13.11 14.01 C12.608 14.113 12.118 13.789 12.016 13.288 C11.913 12.786 12.237 12.298 12.737 12.195 C13.239 12.093 13.729 12.416 13.831 12.916 Z", "M12.112 12.233 C12.143 12.384 12.045 12.532 11.893 12.564 C11.741 12.595 11.592 12.497 11.561 12.345 C11.53 12.193 11.627 12.044 11.78 12.013 C11.932 11.982 12.081 12.079 12.112 12.233 Z", "M35.137 9.356 C35.487 11.067 34.383 12.739 32.67 13.09 C30.959 13.441 29.286 12.335 28.936 10.624 C28.584 8.911 29.69 7.239 31.403 6.889 C33.114 6.538 34.786 7.643 35.137 9.356 Z", "M33.766 8.839 C33.868 9.34 33.545 9.83 33.043 9.933 C32.542 10.035 32.053 9.712 31.95 9.21 C31.848 8.709 32.17 8.22 32.672 8.117 C33.174 8.015 33.663 8.337 33.766 8.839 Z", "M32.045 8.155 C32.077 8.306 31.979 8.455 31.827 8.486 C31.674 8.518 31.526 8.42 31.495 8.267 C31.463 8.114 31.561 7.967 31.715 7.936 C31.866 7.904 32.014 8.002 32.045 8.155 Z", "M17.954 10.472 C18.969 9.686 20.168 9.107 21.512 8.831 C22.854 8.557 24.184 8.618 25.428 8.942 C25.417 8.601 25.5 8.277 25.655 7.989 C24.278 7.633 22.805 7.566 21.317 7.87 C19.829 8.175 18.499 8.816 17.372 9.686 C17.625 9.89 17.829 10.155 17.954 10.472 Z"];
/* GEEKY / matte personality system. Original source contours; black pupils.
   No textures or gradients. Pure statePose() + SVG rendering. */
const FRAME='#34314f', PAPER='#f8f7fc', DURATION=36;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x)};
const gate=(t,a,b,c,d)=>ease((t-a)/(b-a))*(1-ease((t-c)/(d-c)));
const mix=(a,b,w)=>a+(b-a)*w;
const fmt=x=>(Math.abs(x)<.00005?0:x).toFixed(4);
const attrs=o=>Object.entries(o).map(([k,v])=>`${k}="${typeof v==='number'?fmt(v):v}"`).join(' ');
const path=(d,a={})=>`<path d="${d}" ${attrs(a)}/>`;
const C=[{x:9.65,y:14.764,px:12.102,py:14.068},{x:34.644,y:9.65,px:32.037,py:9.99}];
const base=[{x:-12.497,y:2.557,sx:1,sy:1,r:0},{x:12.497,y:-2.557,sx:1,sy:1,r:0}];
const states=[
 {id:'idle',name:'Curious, always.',sub:'A small glance. A soft blink. A little personality.',tab:'Curious'},
 {id:'running-right',name:'A flutter of ideas.',sub:'The lens rings become wings, with the eyes leading the way.',tab:'Flutter right'},
 {id:'running-left',name:'And back again.',sub:'A soft banking turn and a playful little glide.',tab:'Flutter left'},
 {id:'waving',name:'Oh, hello!',sub:'One lens waves while the other gives a conspiratorial wink.',tab:'Hello'},
 {id:'jumping',name:'Can’t contain it.',sub:'Squash, spring, airtime, then a soft landing.',tab:'Delight'},
 {id:'failed',name:'A little “oops.”',sub:'A worried tilt, a downward glance, and a gentle recovery.',tab:'Oops'},
 {id:'waiting',name:'No rush.',sub:'A patient sway slowly becomes a tiny doze.',tab:'Waiting'},
 {id:'running',name:'A mind in orbit.',sub:'The frames unfold into loops. Geeky’s own eyes ride along.',tab:'Orbit'},
 {id:'review',name:'A closer look.',sub:'An elastic coil, one magnifying eye, and unmistakably Geeky.',tab:'Closer look'}
];
function blinkAt(t,c,w=.16){return gate(t,c-w,c-.03,c+.03,c+w)}
function statePose(state,t){
 t=((t%4)+4)%4;let w=gate(t,.15,.65,3.35,3.85),p=base.map(q=>({...q})),g=[{x:0,y:0},{x:0,y:0}],lid=[0,0],world={x:0,y:0,r:0,sx:1,sy:1},orbit=0,zoom=0,eyes=base.map(q=>({...q}));
 if(state==='idle'){
  let look=Math.sin((t-.5)*1.8)*w;g.forEach(q=>{q.x=look*1.7;q.y=-.3*w});p[0].r=-2.5*w;p[1].r=2*w;world.y=-.35*Math.sin(t*Math.PI)*w;lid=[blinkAt(t,2.1),blinkAt(t,2.26)];
 }else if(state==='running-right'||state==='running-left'){
  let dir=state==='running-right'?1:-1,beat=Math.sin(t*7.5),flap=.5+.5*Math.sin(t*7.5+.4);
  p[0].x+=2.3*w;p[1].x-=2.3*w;p[0].y-=1.6*w;p[1].y+=1.6*w;
  p[0].sx=1-w*(.20+.48*flap);p[1].sx=1-w*(.20+.48*(1-flap));p[0].sy=1+w*.18;p[1].sy=1+w*.18;
  p[0].r=-w*(12+9*beat);p[1].r=w*(12-9*beat);world.x=dir*3.8*Math.sin(t*.8)*w;world.y=-2.4*w+beat*.65*w;world.r=-dir*9*w;
  g.forEach(q=>{q.x=dir*2*w;q.y=-.4*w});lid=[blinkAt(t,3.2),blinkAt(t,3.25)];
 }else if(state==='waving'){
  let wave=Math.sin((t-.5)*8.2)*w;p[1].y-=4*w;p[1].x-=1*w;p[1].r=wave*18;p[1].sx=1-.08*w;p[1].sy=1+.07*w;p[0].r=-3*w;world.r=-2*w;g[0].x=1.4*w;g[0].y=-1.3*w;g[1].y=-.3*w;lid[0]=blinkAt(t,2.1,.25);lid[1]=blinkAt(t,3.3);
 }else if(state==='jumping'){
  let crouch=gate(t,.25,.5,.62,.82),air=gate(t,.68,1.18,2.08,2.6),land=gate(t,2.5,2.65,2.76,3.15);
  world.y=1.8*crouch-8.4*air+1.9*land;world.sx=1+.13*crouch+.13*land-.04*air;world.sy=1-.22*crouch-.22*land+.10*air;world.r=Math.sin(t*3)*2*air;g.forEach(q=>q.y=-1.5*air);lid=[.65*crouch,.65*crouch];
 }else if(state==='failed'){
  p[0].r=-10*w;p[1].r=11*w;p[0].y+=1.3*w;p[1].y+=4*w;p[0].sy=1-.12*w;p[1].sy=1-.12*w;world.y=1.1*w;world.r=-3*w;
  g.forEach(q=>{q.y=2.6*w;q.x=-.5*w});lid=[.46*w,.32*w];
 }else if(state==='waiting'){
  world.r=Math.sin(t*1.5)*4*w;world.y=.6*w;p[0].y+=.3*w;p[1].y+=1.5*w;g.forEach(q=>q.y=1.5*w);
  let sleepy=gate(t,.7,1.4,2.7,3.35);lid=[.86*sleepy+.14*blinkAt(t,2),.86*sleepy+.14*blinkAt(t,2.1)];
 }else if(state==='running'){
  orbit=w;let angle=(t-.65)*2,tilt=Math.sin(angle)*8;
  p[0]={x:mix(base[0].x,0,w),y:mix(base[0].y,0,w),sx:mix(1,1.7,w),sy:mix(1,.53,w),r:mix(0,-48+tilt,w)};
  p[1]={x:mix(base[1].x,0,w),y:mix(base[1].y,0,w),sx:mix(1,1.7,w),sy:mix(1,.53,w),r:mix(0,48+tilt,w)};
  let ex=17.2*Math.cos(angle),ey=5.1*Math.sin(angle);
  eyes=[{x:mix(base[0].x,ex,w),y:mix(base[0].y,ey,w),sx:mix(1,.46,w),sy:mix(1,.46,w),r:0},{x:mix(base[1].x,-ex,w),y:mix(base[1].y,-ey,w),sx:mix(1,.46,w),sy:mix(1,.46,w),r:0}];
  world.y=-w;world.r=Math.sin(angle)*3*w;
 }else if(state==='review'){
  zoom=w;let pulse=gate(t,1.3,1.5,1.8,2.1);
  p[0]={x:mix(base[0].x,-19,w),y:mix(base[0].y,3,w),sx:mix(1,.55,w),sy:mix(1,.55,w),r:0};
  p[1]={x:mix(base[1].x,8,w),y:mix(base[1].y,-1,w),sx:mix(1,1.4+.1*pulse,w),sy:mix(1,1.4+.1*pulse,w),r:0};
  g[0]={x:w,y:-.5*w};g[1]={x:Math.sin(t*3)*2*w,y:Math.cos(t*2)*.7*w};lid=[blinkAt(t,2.35),blinkAt(t,2.65)];world.x=-w;
 }
 return{p,g,lid,world,state,t,orbit,zoom,eyes};
}
function transformPoint(i,x,y,p){let q=p[i],r=q.r*Math.PI/180,c=C[i],xx=(x-c.x)*q.sx,yy=(y-c.y)*q.sy;return{x:q.x+xx*Math.cos(r)-yy*Math.sin(r),y:q.y+xx*Math.sin(r)+yy*Math.cos(r)}}
function bridge(p){let nums=0,lastx=0;return PATHS[10].replace(/[-+]?\d*\.?\d+/g,(v)=>{let n=Number(v);if(nums++%2===0){lastx=n;return '@'+n+'@'}let x=lastx,w=clamp((x-17.372)/(25.655-17.372)),l=transformPoint(0,x,n,p),r=transformPoint(1,x,n,p);return `${fmt(mix(l.x,r.x,w))},${fmt(mix(l.y,r.y,w))}`}).replace(/@[^@]+@\s*/g,'')}
function pupil(i,g,tag=''){let ind=i===0?4:7;return `<g id="pupil${i}${tag}" transform="translate(${fmt(g.x)} ${fmt(g.y)})">${path(PATHS[ind],{fill:'#000000'})}${path(PATHS[ind+1],{fill:'#ffffff'})}${path(PATHS[ind+2],{fill:'#ffffff'})}</g>`}
function lens(i,p,g,lid,tag='',eyeOpacity=1){let c=C[i],ii=i*2,edge=c.y-10+10.7*lid,bot=c.y+10-10.7*lid,soft=1.3*lid;let top=`M ${c.x-11} ${c.y-12} H ${c.x+11} V ${fmt(edge)} Q ${c.x} ${fmt(edge+soft)} ${c.x-11} ${fmt(edge)} Z`,bottom=`M ${c.x-11} ${c.y+12} H ${c.x+11} V ${fmt(bot)} Q ${c.x} ${fmt(bot-soft)} ${c.x-11} ${fmt(bot)} Z`;
 return `<g id="lens${i}${tag}" transform="translate(${fmt(p.x)} ${fmt(p.y)}) rotate(${fmt(p.r)}) scale(${fmt(p.sx)} ${fmt(p.sy)}) translate(${-c.x} ${-c.y})">${path(PATHS[ii]+' '+PATHS[ii+1],{fill:FRAME,'fill-rule':'evenodd'})}${path(PATHS[ii+1],{id:'white'+i+tag,fill:'#ffffff',opacity:eyeOpacity})}<g id="eyeContents${i}${tag}" clip-path="url(#eye${i})" opacity="${eyeOpacity}">${pupil(i,g,tag)}${path(top,{id:'lidTop'+i+tag,fill:'#ffffff'})}${path(bottom,{id:'lidBottom'+i+tag,fill:'#ffffff'})}${path(`M ${c.x-11} ${fmt(edge)} Q ${c.x} ${fmt(edge+soft)} ${c.x+11} ${fmt(edge)}`,{id:'lidLine'+i+tag,fill:'none',stroke:FRAME,'stroke-width':.4,'stroke-linecap':'round',opacity:clamp((lid-.25)/.5)})}</g></g>`}
const defs=`<defs><clipPath id="eye0">${path(PATHS[1])}</clipPath><clipPath id="eye1">${path(PATHS[3])}</clipPath></defs>`;
function character(q){let a=q.orbit||0,z=q.zoom||0,eyes=q.eyes||base;
 return `<g id="character" transform="translate(${fmt(q.world.x)} ${fmt(q.world.y)}) rotate(${fmt(q.world.r)}) scale(${fmt(q.world.sx)} ${fmt(q.world.sy)})">
 <ellipse id="orbit-ring" cx="0" cy="0" rx="17.2" ry="5.1" fill="none" stroke="${FRAME}" stroke-width="1" opacity="${fmt(a)}"/>
 ${path(bridge(q.p),{id:'bridge',fill:FRAME,opacity:1-Math.max(a,z)})}
 ${path('M -14 2 C -13.7 -3 -12.3 -3 -12 1 C -11.7 5 -10.3 5 -10 0 C -9.7 -5 -8.3 -5 -8 0 C -7.7 5 -6.3 5 -6 0 L -5.2 -1',{id:'coil',fill:'none',stroke:FRAME,'stroke-width':.95,'stroke-linecap':'round',opacity:z})}
 ${lens(0,q.p[0],q.g[0],q.lid[0],'',a>0?0:1)}${lens(1,q.p[1],q.g[1],q.lid[1],'',a>0?0:1)}
 <g id="orbit-eyes" opacity="${a>0?1:0}">${lens(0,eyes[0],q.orbitGaze?.[0]||{x:0,y:0},0,'orbit')}${lens(1,eyes[1],q.orbitGaze?.[1]||{x:0,y:0},0,'orbit')}</g></g>`}

function pose(t){t=((t%DURATION)+DURATION)%DURATION;let i=Math.floor(t/4),q=statePose(states[i].id,t%4);return{...q,character:character(q),index:i,fullTime:t}}
function render(t,manual=null,gaze=null){let q=manual?statePose(manual,t):pose(t);let i=manual?states.findIndex(s=>s.id===manual):q.index;let st=states[i];if(gaze!==null){let angle=gaze*Math.PI/180;q=statePose('idle',0);q.g=C.map(c=>({x:c.x-c.px+Math.sin(angle)*2.75,y:c.y-c.py-Math.cos(angle)*2.75}));st={name:'Eyes on it.',sub:`A natural gaze at ${gaze}° clockwise from up.`}}
let char=character(q),tick=manual?t%4/4:(t%DURATION)/DURATION;
return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-label="Geeky expressive matte vector animation">${defs}<rect width="1080" height="1080" fill="${PAPER}"/><circle cx="540" cy="474" r="330" fill="#f0edf9"/><ellipse cx="540" cy="734" rx="220" ry="17" fill="#34314f" opacity=".055"/><g transform="translate(540 480) scale(15)">${char}</g><g font-family="DejaVu Sans,Arial,sans-serif" fill="${FRAME}"><text x="72" y="76" font-size="23" font-weight="700" letter-spacing="5">GEEKY</text><circle cx="190" cy="68" r="5" fill="#a398d5"/><text x="1008" y="75" text-anchor="end" font-size="15" letter-spacing="1" fill="#9890a7">A LITTLE MORE PERSONALITY</text><path d="M72 108 H1008" stroke="#ded9e8"/><text x="72" y="160" font-size="13" letter-spacing="2" fill="#9890a7">${String(i+1).padStart(2,'0')} / ${states[i].tab.toUpperCase()}</text><text x="540" y="850" text-anchor="middle" font-size="42" font-weight="500" letter-spacing="-1.4">${st.name}</text><text x="540" y="890" text-anchor="middle" font-size="17" fill="#91869d">${st.sub}</text><path d="M72 966 H1008" stroke="#ded9e8" stroke-width="2"/><path d="M72 966 H${fmt(72+tick*936)}" stroke="#8e80bd" stroke-width="3"/><text x="72" y="1002" font-size="13" fill="#9890a7">9 EXPRESSIVE STATES · ORIGINAL SVG · BLACK PUPILS</text><text x="1008" y="1002" text-anchor="end" font-size="13" fill="#9890a7">MATTE EDITION</text></g></svg>`}

export { FRAME, PATHS, C, base, defs, states, statePose, character, pose, render };
