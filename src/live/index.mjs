/* GEEKY LIVE — public entry point.
   createGeekyLive(el, opts)   one interactive character (SVG or Three.js)
   createGeekyAssistant(opts)  the Clippy-style floating companion */
export {GeekyActor, createGeekyLive} from './actor.mjs';
export {GeekyAssistant, createGeekyAssistant} from './assistant.mjs';
export {GeekyBrain, EXPRESSIONS, neutralPose} from './brain.mjs';
export {ACTIONS, ACTION_LIST, ALIASES, GROUPS, resolveAction} from './actions.mjs';
export {SvgRenderer} from './svg-renderer.mjs';
export {ThreeRenderer} from './three-renderer.mjs';
