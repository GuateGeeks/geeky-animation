// Type-checks every entry point through the package name, as a consumer imports it.
import {ACTION_LIST, GeekyActor, GeekyAssistant, createGeekyLive, createGeekyAssistant, EXPRESSIONS, neutralPose as neutral} from '@guategeeks/geeky';
import {ACTIONS, ALIASES, GROUPS, resolveAction, type GeekyAction} from '@guategeeks/geeky/actions';
import {GeekyBrain, neutralPose, blendPose, type GeekyPose} from '@guategeeks/geeky/brain';
import {FRAME, PALETTE, color, parsePath} from '@guategeeks/geeky/core';
import {ThreeRenderer} from '@guategeeks/geeky/three';
import {SvgRenderer} from '@guategeeks/geeky/svg';
import {createGeeky, STATE_META, type GeekyPlayer} from '@guategeeks/geeky/player';
import {statePose, character, PATHS} from '@guategeeks/geeky/motion';
import {createGeekyModel, MODEL_THREE_KEYS, type GeekyModel} from '@guategeeks/geeky/model';
import * as THREE from 'three';

const brain = new GeekyBrain({seed: 1, reduced: true});
const pose: GeekyPose = brain.update(1 / 60);
blendPose(neutralPose(), pose, .5) satisfies GeekyPose;
neutral() satisfies GeekyPose;
resolveAction('greet').dur satisfies number;
ACTIONS.greet satisfies GeekyAction;
ACTION_LIST[0].duration satisfies number;
ALIASES satisfies Readonly<Record<string, string>>;
GROUPS satisfies Record<string, string>;
EXPRESSIONS satisfies Record<string, object>;
FRAME satisfies string;
color('frame', PALETTE.frame) satisfies string;
parsePath('M0 0 L1 1').length satisfies number;
PATHS.length satisfies number;
character(statePose('idle', 1)) satisfies string;
STATE_META.idle.loop satisfies boolean;

declare const host: HTMLElement;
const player: GeekyPlayer = createGeeky(host, {reducedMotion: 'system'});
player.playState('waving').pause();
new ThreeRenderer(host, {THREE}).render(pose);
new SvgRenderer(host).render(pose);
const actor: GeekyActor = createGeekyLive(host, {renderer: 'svg'});
actor.play('celebrate').then(r => r.completed satisfies boolean);
const assistant: GeekyAssistant = createGeekyAssistant({});
assistant.say('Hola') satisfies Promise<unknown>;

const model: GeekyModel = createGeekyModel({THREE, palette: {frame: '#123456'}, reduced: true});
model.step(1 / 60);
model.group.add(new THREE.Group());
model.materials()[0].roughness satisfies number;
MODEL_THREE_KEYS satisfies readonly string[];
new ThreeRenderer(null, {THREE, scene: new THREE.Group(), lights: false}).headless satisfies boolean;
