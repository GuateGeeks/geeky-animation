import type { GeekyPose } from './brain.mjs';
export class SvgRenderer {
  constructor(host: HTMLElement, options?: { frameColor?: string; brows?: boolean; shadow?: boolean; zoom?: number; label?: string | null; bleed?: number });
  kind: 'svg';
  frame: string;
  svg: SVGSVGElement;
  render(pose: GeekyPose, effects?: unknown[]): void;
  setZoom(zoom: number): void;
  setLabel(text: string): void;
  toSVG(): string;
  destroy(): void;
}
