/* The classic matte rig: pose builders and SVG renderers for the nine four-second states. */
export const FRAME: string;
export const PATHS: string[];
export const C: { x: number; y: number; px: number; py: number; [key: string]: number }[];
export const base: object[];
export const defs: string;
export const states: { id?: string; name: string; sub: string; tab: string; [key: string]: unknown }[];
export function statePose(state: string | number, time: number): object;
export function pose(...args: any[]): object;
export function character(pose: object): string;
export function render(...args: any[]): string;
