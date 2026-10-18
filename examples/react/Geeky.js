import React, {useEffect,useRef} from 'react';
import {createGeeky} from '../../src/geeky-player.mjs';
/** Copy into a React app and adjust the player import path. */
export default function Geeky({state='idle',gazeDegrees=null,paused=false,reducedMotion='system',size=160,className=''}){
 const host=useRef(null),player=useRef(null);
 useEffect(()=>{player.current=createGeeky(host.current,{autoplay:!paused,reducedMotion});return()=>{player.current?.destroy();player.current=null}},[]);
 useEffect(()=>{player.current?.playState(state);if(paused)player.current?.pause()},[state]);
 useEffect(()=>{if(paused)player.current?.pause();else player.current?.resume()},[paused]);
 useEffect(()=>{player.current?.gaze(gazeDegrees)},[gazeDegrees]);
 useEffect(()=>{player.current?.setReducedMotion(reducedMotion)},[reducedMotion]);
 return React.createElement('div',{ref:host,className,style:{width:size,height:size},'data-geeky-component':true});
}
