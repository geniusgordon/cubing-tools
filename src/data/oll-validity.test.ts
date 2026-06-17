import { describe, expect, it } from 'vitest';
import { applyCase, SOLVED } from '@/lib/cube-render';
import { SLOTS } from '@/lib/cube-render/engine';
import { ollCases } from './oll';

// A genuine OLL algorithm only manipulates the last layer, so applying it to a
// solved cube must leave the first two layers (F2L) untouched. It does NOT
// preserve last-layer *permutation* — OLL orients; PLL permutes afterward — so
// we only assert F2L here. The yellow-orientation pattern (the part that
// actually matters for the OLL image) is verified in oll-distinct.test.ts.
//
// The last layer is the set of facelets whose cubie sits in the top layer
// (3D y-coordinate pos[1] === 1), derived from the engine's slot geometry.
const yOf = new Map(SLOTS.map((s) => [s.index, s.pos[1]]));
const isLastLayer = (i: number) => yOf.get(i) === 1;

describe('oll algs keep F2L solved', () => {
  for (const c of ollCases) {
    it(`OLL ${c.number} (${c.name})`, () => {
      const state = applyCase(c.alg);
      for (let i = 0; i < 54; i++) {
        if (isLastLayer(i)) continue;
        expect(state[i], `facelet ${i}`).toBe(SOLVED[i]);
      }
    });
  }
});
