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
  /** Accessible name; null makes the canvas decorative (aria-hidden). */
  label?: string | null;
  /** Headless: build into this Object3D of a host scene; no WebGL renderer, canvas, camera or DOM of its own. */
  scene?: THREE.Object3D;
  /** Add the renderer's own lights (default true). */
  lights?: boolean;
  /** Runs after the materials exist and before the geometry is built. */
  beforeBuild?: (renderer: ThreeRenderer) => void;
}
export class ThreeRenderer {
  /** `host` may be null when `scene` is given. */
  constructor(host: HTMLElement | null, options: ThreeRendererOptions);
  headless: boolean;
  kind: 'three';
  frame: string;
  zoom: number;
  canvas: HTMLCanvasElement;
  /** Null when headless. */
  gl: THREE.WebGLRenderer | null;
  scene: THREE.Object3D;
  camera: THREE.PerspectiveCamera;
  render(pose: GeekyPose, effects?: unknown[]): void;
  /** Recolours the frame materials in place (windowed and headless renderers; not createGeekyModel's). */
  setFrameColor(hex: string): void;
  setZoom(zoom: number): void;
  setLabel(text: string): void;
  resize(): void;
  screenToChar(x: number, y: number): { x: number; y: number };
  charToScreen(x: number, y: number): { x: number; y: number };
  pxPerUnit(): number;
  destroy(): void;
}
