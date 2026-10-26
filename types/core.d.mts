/* Shared geometry, palette and maths of the Live engine. Lower-level than the other entry points:
   prefer ./brain, ./actions and the renderers; these helpers follow the engine's internal shapes. */
export interface Point { x: number; y: number }
export const PATHS: string[];
export const C: { x: number; y: number; px: number; py: number; [key: string]: number }[];
export const FRAME: string;
export const TAU: number;
export const DEG: number;
export const EYE_R: number;
export const PUPIL_R: number;
export const RIM_R: number;
export const MAXR: number;
export const GROUND: number;
export const HEART: string;
export const SPIRAL: string;
export const ARM: Record<string, number>;
export const EYEBALL: { base: number; r: number; back: number; z: number; [key: string]: number };
export const BASE: object[];
export const REST: object[];
export const PUPIL_ORIGIN: Point[];
export const GLYPHS: Record<string, { d: string; fill: string; stroke?: string; [key: string]: unknown }[]>;
export const PALETTE: Record<'frame' | 'white' | 'paper' | 'lid' | 'lid3d' | 'pupil' | 'back' | 'lavender' | 'mist' | 'barrel' | 'pink' | 'heart' | 'blush' | 'yellow' | 'mint' | 'sky' | 'coral', string>;
export const CONFETTI: string[];
export const Ease: Record<string, (t: number) => number>;
/** Resolves a palette name ('frame' maps to `frame`) or returns the value unchanged. */
export function color(name: string, frame?: string): string;
export function clamp(value: number, min?: number, max?: number): number;
export function lerp(a: number, b: number, t: number): number;
export function wrapDeg(degrees: number): number;
export function rng(seed?: number): () => number;
export function noise(...args: number[]): number;
export function gate(...args: number[]): number;
export function kf(...args: any[]): any;
export function wobble(...args: number[]): number;
export function fmt(value: number): string;
export function parsePath(d: string): { segs: unknown[]; closed?: boolean; [key: string]: unknown }[];
export function samplePath(d: string, step?: number): { pts: Point[]; [key: string]: unknown }[];
export function smoothPath(points: Point[], closed?: boolean): string;
export function polyPath(points: Point[], closed?: boolean): string;
export function capsulePath(...args: number[]): string;
export function circlePath(...args: number[]): string;
export function ellipsePath(...args: number[]): string;
export function roundRectPath(...args: number[]): string;
export function coilPoints(...args: any[]): Point[];
export function lensPoint(...args: any[]): any;
export function rimRadius(...args: any[]): number;
export function armGeometry(...args: any[]): any;
export function armAttach(...args: any[]): any;
export function browGeometry(...args: any[]): any;
export function bridgeGeometry(...args: any[]): any;
export function reachArm(...args: any[]): any;
export function projectDepth(...args: any[]): any;
export class Dyn { constructor(...args: any[]); [key: string]: any }
export class Jiggle { constructor(...args: any[]); [key: string]: any }
