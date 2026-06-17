import { describe, expect, it } from 'vitest';
import { applyCase, applyAlg } from '@/lib/cube-render';
import { ollCases } from './oll';

// Last-layer facelets, fixed order: U face then each side's top row.
const LL_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 45, 46, 47, 36, 37, 38];

// The yellow (== 'U') orientation pattern over the last layer, normalized over
// the 4 AUF rotations. This uniquely identifies an OLL case regardless of
// permutation or angle, so 57 distinct signatures == all 57 OLLs, no duplicates.
function signature(alg: string): string {
  let best: string | null = null;
  let rotated = applyCase(alg);
  for (let k = 0; k < 4; k++) {
    const bits = LL_INDICES.map((i) => (rotated[i] === 'U' ? '1' : '0')).join('');
    if (best === null || bits < best) best = bits;
    rotated = applyAlg(rotated, 'U');
  }
  return best as string;
}

describe('oll cases are all distinct', () => {
  it('produces 57 unique AUF-normalized orientation signatures', () => {
    const sigs = new Set(ollCases.map((c) => signature(c.alg)));
    expect(sigs.size).toBe(57);
  });
});
