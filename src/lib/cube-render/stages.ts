import { applyAlg } from './engine';
import type { Face, Facelets } from './types';
import { GRAY, SCHEME } from './scheme';

export interface ResolvedStage {
  active: Set<number>;
  recolor?: (label: Face) => boolean; // true => force gray even if active
  setup?: string; // optional rotation applied to the case before masking
}

function range(start: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => start + i);
}

const ALL = new Set(range(0, 54));
const U_FACE = range(0, 9);
const SIDE_TOPS = [9, 10, 11, 18, 19, 20, 45, 46, 47, 36, 37, 38]; // R,F,B,L top rows
const LL = new Set([...U_FACE, ...SIDE_TOPS]);
const D_FACE = range(27, 9);
const SIDE_BOTTOMS = [15, 16, 17, 24, 25, 26, 51, 52, 53, 42, 43, 44]; // R,F,B,L bottom rows
const CROSS = new Set([...D_FACE, ...SIDE_BOTTOMS]);

export function resolveStage(stage: string | undefined): ResolvedStage {
  switch (stage) {
    case 'll':
      return { active: LL };
    case 'coll':
      return { active: LL };
    case 'oll':
      return { active: LL, recolor: (label) => label !== 'U' };
    case 'cross':
      return { active: CROSS };
    case 'cross-x2':
      return { active: CROSS, setup: 'x2' };
    case 'full':
    default:
      return { active: ALL };
  }
}

/** Apply a stage to facelet labels and produce per-facelet hex colors. */
export function maskedColors(facelets: Facelets, stage: string | undefined): string[] {
  const s = resolveStage(stage);
  const labels = s.setup ? applyAlg(facelets, s.setup) : facelets;
  return labels.map((label, i) => {
    if (!s.active.has(i)) return GRAY;
    if (s.recolor && s.recolor(label)) return GRAY;
    return SCHEME[label];
  });
}
