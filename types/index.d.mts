import type * as THREE from 'three';
import type { GeekyBrain, GeekyPlayOptions } from './brain.mjs';

export { GeekyBrain, EXPRESSIONS, neutralPose } from './brain.mjs';
export type { GeekyPose, GeekyLens, GeekyBrainOptions, GeekyPlayOptions } from './brain.mjs';
export { ACTIONS, ACTION_LIST, ALIASES, GROUPS, resolveAction } from './actions.mjs';
export type { GeekyAction, GeekyActionEntry } from './actions.mjs';
export { SvgRenderer } from './svg-renderer.mjs';
export { ThreeRenderer } from './three-renderer.mjs';

type ThreeSource = typeof THREE | Record<string, any> | (() => Promise<typeof THREE | Record<string, any>>);
type Played = Promise<{ id: string; completed: boolean }>;

export interface GeekyLiveOptions {
  renderer?: 'svg' | 'three';
  THREE?: ThreeSource | null;
  followPointer?: boolean;
  interactive?: boolean;
  dragMode?: 'spin' | 'move' | 'none';
  reactions?: boolean;
  reducedMotion?: boolean | 'system';
  autonomous?: boolean;
  brows?: boolean | 'auto' | 'always';
  shadow?: boolean;
  /** Accessible name; null makes Geeky decorative (aria-hidden). */
  label?: string | null;
  /** Append the current action's label to `label` on each action (default true). */
  actionLabels?: boolean;
  /** Frame colour (hex); change it later with setFrameColor. */
  frameColor?: string;
  seed?: number;
  zoom?: number;
}
export class GeekyActor {
  constructor(target: HTMLElement | string, options?: GeekyLiveOptions);
  brain: GeekyBrain;
  play(action: string, options?: GeekyPlayOptions): Played;
  stop(): Played;
  animate(): Played;
  setMood(mood: string): this;
  setBase(action: string): this;
  notify(signal: string): this;
  poke(x?: number, y?: number): this;
  lookAt(target: Element | { x: number; y: number } | null): this;
  angleTo(target: Element | { x: number; y: number }): number;
  setRenderer(kind: 'svg' | 'three', options?: { THREE?: typeof THREE | Record<string, any> }): this;
  /** Like setRenderer, but THREE may be a loader; a failed load keeps the current body and emits 'renderer' with `error`. */
  loadRenderer(kind: 'svg' | 'three', options?: { THREE?: ThreeSource }): Promise<this>;
  /** Recolours the frame; the current action carries on. */
  setFrameColor(hex: string): this;
  /** Idle fidgets on or off. */
  setAutonomous(on: boolean): this;
  readonly rendererKind: 'svg' | 'three' | undefined;
  setZoom(zoom: number): this;
  setSpeed(rate: number): this;
  pause(): this;
  resume(): this;
  setReducedMotion(value: boolean | 'system'): this;
  setFollowPointer(value: boolean): this;
  setDrag(active: boolean, vxPx?: number, vyPx?: number): this;
  impact(speed?: number): this;
  hit(x: number, y: number): boolean;
  anchor(): { x: number; y: number };
  getState(): { action: string; time: number; loop: boolean; mood: string; renderer: 'svg' | 'three'; paused: boolean; reducedMotion: boolean; [key: string]: unknown };
  on(type: string, listener: (data: any) => void): () => boolean | undefined;
  toSVG(): string | null;
  destroy(): void;
}
export function createGeekyLive(target: HTMLElement | string, options?: GeekyLiveOptions): GeekyActor;

export interface GeekyAssistantOptions {
  renderer?: 'svg' | 'three';
  THREE?: ThreeSource | null;
  size?: number;
  corner?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  margin?: number;
  dock?: Element | null;
  dockZoom?: number;
  greeting?: boolean;
  tips?: string[];
  answers?: { match: RegExp | string; reply: string; action?: string }[];
  chatty?: 'quiet' | 'normal' | 'chatty';
  sound?: boolean;
  storageKey?: string;
  name?: string;
  reducedMotion?: boolean | 'system';
  persist?: boolean;
  theme?: 'auto' | 'light' | 'dark';
  watch?: Record<string, boolean>;
  menu?: { label: string; action: () => void }[];
}
export interface SayOptions { buttons?: string[]; input?: boolean; placeholder?: string; timeout?: number; action?: string; mood?: string }
export class GeekyAssistant {
  constructor(options?: GeekyAssistantOptions);
  actor: GeekyActor;
  readonly reducedMotion: boolean;
  play(action: string, options?: GeekyPlayOptions): Played;
  animate(): Played;
  setMood(mood: string): this;
  on(type: string, listener: (data: any) => void): () => boolean | undefined;
  say(text: string, options?: SayOptions): Promise<string | null>;
  closeBalloon(): this;
  tip(): Promise<string | null> | null;
  moveTo(x: number, y: number, options?: { action?: string; speed?: number; free?: boolean }): Promise<unknown>;
  hide(): unknown;
  show(): unknown;
  untuck(): unknown;
  setSound(on: boolean): this;
  setChatty(level: 'quiet' | 'normal' | 'chatty'): this;
  dock(element: Element): unknown;
  float(x?: number, y?: number): unknown;
  setRenderer(kind: 'svg' | 'three'): Promise<unknown>;
  openMenu(x: number, y: number): void;
  closeMenu(): void;
  destroy(): void;
}
export function createGeekyAssistant(options?: GeekyAssistantOptions): GeekyAssistant;
