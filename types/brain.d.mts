export interface GeekyLens { x: number; y: number; z: number; rot: number; s: number; sx: number; sy: number; turn: number; tilt: number; spin: number; outline?: number; [key: string]: unknown }
export interface GeekyPose {
  lens: GeekyLens[];
  eyeT?: GeekyLens[];
  brow: { y: number; rot: number; arch: number; o: number }[];
  body: { x: number; y: number; [key: string]: unknown };
  [key: string]: unknown;
}
export type GeekyExpression = { [key: string]: unknown };
export { ACTIONS } from './actions.mjs';
export const EXPRESSIONS: Record<string, GeekyExpression>;
export function neutralPose(): GeekyPose;
export function browNeed(brow: GeekyPose['brow'][number]): number;
export function applyExpression(pose: GeekyPose, name: string, weight: number): void;
/** Mutates and returns `to`: weight 0 keeps `from`, weight 1 reaches `to`. */
export function blendPose(to: GeekyPose, from: GeekyPose, weight: number): GeekyPose;

export interface GeekyBrainOptions { seed?: number; autonomous?: boolean; reduced?: boolean; brows?: 'auto' | 'always' | 'never' }
export interface GeekyPlayOptions { loop?: boolean; blend?: number; restart?: boolean; params?: object; then?: string }
export class GeekyBrain {
  constructor(options?: GeekyBrainOptions);
  speed: number;
  reduced: boolean;
  /** Current attention toward a `lookAt` target, 0–1. */
  att: number;
  /** Id of the resting action the brain returns to. */
  base: string;
  /** The action being played. */
  act: { id: string; T: number; loop: boolean; [key: string]: unknown };
  /** The action being blended out, if any. */
  from: unknown;
  blinkState: { t: number; dbl: boolean; [key: string]: unknown };
  particles: unknown[];
  last: GeekyPose | null;
  on(type: 'cue' | 'start' | 'end' | string, listener: (data: any) => void): () => boolean | undefined;
  play(action: string, options?: GeekyPlayOptions): Promise<{ id: string; completed: boolean }>;
  stop(): Promise<{ id: string; completed: boolean }>;
  setBase(action: string): this;
  update(seconds: number): GeekyPose;
  fx(): unknown[];
  setMood(mood?: string): this;
  lookAt(x: number | null, y?: number, z?: number): this;
  setHover(value: boolean): this;
  notify(signal: string): this;
  blinkNow(): this;
  poke(x?: number, y?: number, strength?: number): number;
  setDrag(active: boolean, vx?: number, vy?: number): this;
  impact(speed?: number): this;
  spinBy(dyaw: number, dpitch: number, dt?: number): this;
  releaseSpin(): this;
  getState(): { action: string; time: number; loop: boolean; mood: string; base: string; particles: number };
}
