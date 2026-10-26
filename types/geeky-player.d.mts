export type GeekyState = 'idle' | 'running-right' | 'running-left' | 'waving' | 'jumping' | 'failed' | 'waiting' | 'running' | 'review';
/** Friendly names: flutter-right, flutter-left, hello, delight, oops, orbit, closer-look. */
export type GeekyStateAlias = 'flutter-right' | 'flutter-left' | 'hello' | 'delight' | 'oops' | 'orbit' | 'closer-look';
export const STATE_META: Readonly<Record<GeekyState, { label: string; loop: boolean; stillTime: number; [key: string]: unknown }>>;
export const ALIASES: Readonly<Record<GeekyStateAlias, GeekyState>>;
/** Seconds per state loop. */
export const STATE_DURATION: number;
export const VIEWBOX: string;
export interface PlayerOptions {
  state?: GeekyState | GeekyStateAlias;
  autoplay?: boolean;
  loop?: boolean;
  fps?: number;
  speed?: number;
  gaze?: number | null;
  reducedMotion?: boolean | 'system';
  frameColor?: string;
  label?: string;
}
export interface PlayOptions { loop?: boolean; transitionMs?: number; onComplete?: () => void }
export class GeekyPlayer {
  constructor(target: HTMLElement | string, options?: PlayerOptions);
  playState(state: GeekyState | GeekyStateAlias, options?: PlayOptions): this;
  pause(): this;
  resume(): this;
  seek(seconds: number): this;
  setSpeed(rate: number): this;
  gaze(degrees: number | null): this;
  setReducedMotion(value: boolean | 'system'): this;
  getState(): { state: GeekyState; time: number; speed: number; gaze: number | null; playing: boolean; [key: string]: unknown };
  toSVG(): string;
  destroy(): void;
}
export function createGeeky(target: HTMLElement | string, options?: PlayerOptions): GeekyPlayer;
export function characterSVG(pose: object, options?: { frameColor?: string; label?: string }): string;
