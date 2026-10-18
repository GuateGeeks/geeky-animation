import React, {useState} from 'react';
import Geeky from './Geeky.js';
export default function App(){const [state,setState]=useState('idle'),[paused,setPaused]=useState(false);return React.createElement('main',null,
 React.createElement(Geeky,{state,paused,size:220}),
 React.createElement('button',{onClick:()=>setState('orbit')},'Orbit'),
 React.createElement('button',{onClick:()=>setState('closer-look')},'Closer look'),
 React.createElement('button',{onClick:()=>setState('waving')},'Hello'),
 React.createElement('button',{onClick:()=>setPaused(v=>!v)},paused?'Resume':'Pause'))}
