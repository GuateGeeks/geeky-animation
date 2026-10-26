import type * as THREE from 'three';
import type { GeekyPose } from './brain.mjs';

export interface ThreeRendererOptions {
  /** The host's three.js namespace (or the members Geeky uses): Geeky never imports three itself. */
  THREE: typeof THREE | Record<string, any>;
  frameColor?: string;
  brows?: boolean;
  shadow?: boolean;
  bleed?: number;
  zoom?: number;
  label?: string;
}
export class ThreeRenderer {
  constructor(host: HTMLElement, options: ThreeRendererOptions);
  kind: 'three';
  frame: string;
  zoom: number;
  canvas: HTMLCanvasElement;
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  render(pose: GeekyPose, effects?: unknown[]): void;
  setZoom(zoom: number): void;
  setLabel(text: string): void;
  resize(): void;
  screenToChar(x: number, y: number): { x: number; y: number };
  charToScreen(x: number, y: number): { x: number; y: number };
  pxPerUnit(): number;
  destroy(): void;
}
