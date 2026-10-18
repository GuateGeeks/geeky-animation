const player=Geeky.createGeeky('#geeky',{state:'idle',reducedMotion:'system'});
document.querySelector('#orbit').onclick=()=>player.playState('orbit');
document.querySelector('#closer').onclick=()=>player.playState('closer-look');
document.querySelector('#hello').onclick=()=>player.playState('waving',{loop:false,onComplete:()=>player.playState('idle')});
document.querySelector('#pause').onclick=()=>player.pause();
document.querySelector('#resume').onclick=()=>player.resume();
// Call player.destroy() when this component/page is permanently removed.
