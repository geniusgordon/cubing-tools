import { describe, it, expect } from 'vitest';
import { resolveStage, maskedColors } from './stages';
import { SOLVED } from './engine';
import { SCHEME, GRAY } from './scheme';

const LL_ACTIVE = new Set<number>([
  0, 1, 2, 3, 4, 5, 6, 7, 8, // U
  9, 10, 11, // R top
  18, 19, 20, // F top
  45, 46, 47, // B top
  36, 37, 38, // L top
]);

describe('resolveStage', () => {
  it('full → all 54 active, no recolor', () => {
    const s = resolveStage('full');
    expect(s.active.size).toBe(54);
  });
  it('ll → U face + 4 side top rows (21 active)', () => {
    const s = resolveStage('ll');
    expect(s.active).toEqual(LL_ACTIVE);
  });
  it('coll → same active set as ll', () => {
    expect(resolveStage('coll').active).toEqual(LL_ACTIVE);
  });
  it('oll → ll set with a recolor predicate', () => {
    const s = resolveStage('oll');
    expect(s.active).toEqual(LL_ACTIVE);
    expect(typeof s.recolor).toBe('function');
  });
  it('unknown stage falls back to full', () => {
    expect(resolveStage('nope').active.size).toBe(54);
    expect(resolveStage(undefined).active.size).toBe(54);
  });
});

describe('maskedColors', () => {
  it('full solved → every facelet its own color', () => {
    const colors = maskedColors(SOLVED, 'full');
    expect(colors[0]).toBe(SCHEME.U);
    expect(colors[18]).toBe(SCHEME.F);
  });
  it('ll solved → non-LL facelets are gray', () => {
    const colors = maskedColors(SOLVED, 'll');
    expect(colors[0]).toBe(SCHEME.U); // U active
    expect(colors[26]).toBe(GRAY); // F bottom-right, not LL
  });
  it('oll solved → side LL stickers (not U-color) become gray', () => {
    const colors = maskedColors(SOLVED, 'oll');
    expect(colors[0]).toBe(SCHEME.U); // U face stays yellow
    expect(colors[18]).toBe(GRAY); // F top row is F-color, recolored gray
  });
});
