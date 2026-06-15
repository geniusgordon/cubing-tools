import { describe, it, expect } from 'vitest';
import { planLayout } from './layout-plan';
import { maskedColors } from './stages';
import { SOLVED } from './engine';
import { SCHEME } from './scheme';

describe('planLayout', () => {
  const colors = maskedColors(SOLVED, 'full');
  const cells = planLayout(colors);

  it('emits 21 cells (9 U + 4×3 petals)', () => {
    expect(cells).toHaveLength(21);
  });
  it('the 9 U cells are all U-color for a solved cube', () => {
    const u = cells.slice(0, 9);
    expect(u.every((c) => c.fill === SCHEME.U)).toBe(true);
  });
  it('every cell is within the viewBox', () => {
    for (const c of cells) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.y).toBeGreaterThanOrEqual(0);
      expect(c.x + c.w).toBeLessThanOrEqual(100);
      expect(c.y + c.h).toBeLessThanOrEqual(100);
    }
  });
  it('bottom petal shows F color on a solved cube', () => {
    // last 12 cells are petals; find one with F fill
    expect(cells.some((c) => c.fill === SCHEME.F)).toBe(true);
  });
});

import { cube3dLayout } from './layout-3d';

describe('cube3dLayout', () => {
  const colors = maskedColors(SOLVED, 'full');
  const quads = cube3dLayout(colors);

  it('emits 27 quads (U+F+R, 9 each)', () => {
    expect(quads).toHaveLength(27);
  });
  it('each quad has 4 points and a fill', () => {
    for (const q of quads) {
      expect(q.points).toHaveLength(4);
      expect(typeof q.fill).toBe('string');
    }
  });
  it('solved cube → 9 U-color, 9 F-color, 9 R-color quads', () => {
    const count = (hex: string) => quads.filter((q) => q.fill === hex).length;
    expect(count(SCHEME.U)).toBe(9);
    expect(count(SCHEME.F)).toBe(9);
    expect(count(SCHEME.R)).toBe(9);
  });
  it('all points are within the viewBox', () => {
    for (const q of quads)
      for (const [x, y] of q.points) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      }
  });
});
