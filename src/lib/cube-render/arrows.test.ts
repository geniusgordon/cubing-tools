import { describe, it, expect } from 'vitest';
import { computePllArrows } from './arrows';
import { planSlotCenter } from './layout-plan';

const T_PERM = "R U R' U' R' F R2 U' R' U' R U R' F'";
const UA_PERM = "M2 U M U2 M' U M2";

const cornerCenters = [0, 2, 6, 8].map(planSlotCenter);
const edgeCenters = [1, 3, 5, 7].map(planSlotCenter);
const same = (p: [number, number], q: [number, number]) => p[0] === q[0] && p[1] === q[1];
const isCorner = (p: [number, number]) => cornerCenters.some((c) => same(p, c));
const isEdge = (p: [number, number]) => edgeCenters.some((c) => same(p, c));

describe('computePllArrows', () => {
  it('solved / identity alg → no arrows', () => {
    expect(computePllArrows('')).toEqual([]);
  });

  it('T-perm → one corner 2-cycle + one edge 2-cycle (two double-headed arrows)', () => {
    const arrows = computePllArrows(T_PERM);
    expect(arrows).toHaveLength(2);
    expect(arrows.every((a) => a.double)).toBe(true);
    const cornerArrow = arrows.find((a) => isCorner(a.from) && isCorner(a.to));
    const edgeArrow = arrows.find((a) => isEdge(a.from) && isEdge(a.to));
    expect(cornerArrow).toBeDefined();
    expect(edgeArrow).toBeDefined();
  });

  it('U-perm (Ua) → a single edge 3-cycle (three directed arrows), corners none', () => {
    const arrows = computePllArrows(UA_PERM);
    expect(arrows).toHaveLength(3);
    expect(arrows.every((a) => !a.double)).toBe(true);
    expect(arrows.every((a) => isEdge(a.from) && isEdge(a.to))).toBe(true);
  });

  it('arrow endpoints fall on plan-view slot centers', () => {
    const arrows = computePllArrows(T_PERM);
    for (const a of arrows) {
      expect(isCorner(a.from) || isEdge(a.from)).toBe(true);
      expect(isCorner(a.to) || isEdge(a.to)).toBe(true);
    }
  });
});
