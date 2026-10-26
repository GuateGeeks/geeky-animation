import type * as THREE from 'three';
import type { GeekyBrain } from './brain.mjs';
import type { ThreeRenderer } from './three-renderer.mjs';

export type ModelThreeKey =
  | 'Group' | 'Mesh' | 'Vector3' | 'Plane' | 'Shape' | 'Path' | 'ShapeUtils' | 'ExtrudeGeometry' | 'SphereGeometry'
  | 'CylinderGeometry' | 'TorusGeometry' | 'MeshStandardMaterial' | 'MeshPhysicalMaterial' | 'MeshBasicMaterial'
  | 'DoubleSide' | 'Color' | 'Float32BufferAttribute';
/** The three.js members the model needs: the whole namespace, or a narrow object with just these. */
export type GeekyModelThree = Pick<typeof THREE, ModelThreeKey>;
/** Every THREE member the model touches; a namespace with just these is enough. */
export const MODEL_THREE_KEYS: readonly ModelThreeKey[];

export interface GeekyPalette {
  /** Rims, bridge, arms, brows and lid creases. */
  frame?: string;
  /** Back shells of the eyes. */
  back?: string;
  /** Eyelids. */
  lid?: string;
  heart?: string;
  blush?: string;
}
/** Default colours (hex strings). */
export const MODEL_PALETTE: Readonly<Required<GeekyPalette>>;

export interface GeekyModelDetail {
  rimPoints: number; rimBevel: number; dome: number; domeRows: number; lid: number; lidRows: number; crease: number; cap: number;
  radial: number; ball: number; glyphCurve: number; maxFx: number; armPoints: number; browPoints: number; bridgePoints: number;
}
export const DETAIL: Readonly<GeekyModelDetail>;

export interface GeekyModelOptions {
  THREE: GeekyModelThree;
  seed?: number;
  /** Reduced motion: the brain keeps calm poses. */
  reduced?: boolean;
  /** Hex colours (#rgb or #rrggbb); any other value throws a TypeError naming the key. Unknown keys are ignored. */
  palette?: GeekyPalette;
  detail?: Partial<GeekyModelDetail>;
}
export interface GeekyModel {
  /** Add this to the host scene; units are the character's (a 64-unit stage), so scale it to fit. */
  group: THREE.Group;
  brain: GeekyBrain;
  renderer: ThreeRenderer;
  /** Advance the brain by `dt` seconds and pose the meshes; the host renders. Ignored after dispose(). */
  step(dt: number): void;
  /** The two materials Geeky owns, at every moment. */
  materials(): [THREE.MeshStandardMaterial, THREE.MeshBasicMaterial];
  /** Releases geometries and materials and removes `group` from its parent. Safe to call twice. */
  dispose(): void;
}
/** Geeky built headless into a Group of a host scene, with exactly two materials. */
export function createGeekyModel(options: GeekyModelOptions): GeekyModel;
