import { describe, it, expect } from 'vitest';
import { SLOTS, SOLVED } from './engine';
import { FACES } from './types';

describe('slot table', () => {
  it('has 54 slots, 9 per face in FACES order', () => {
    expect(SLOTS).toHaveLength(54);
    FACES.forEach((face, f) => {
      for (let i = 0; i < 9; i++) {
        expect(SLOTS[f * 9 + i].face).toBe(face);
      }
    });
  });

  it('every slot position has all coords in {-1,0,1} and a unit normal', () => {
    for (const s of SLOTS) {
      for (const c of s.pos) expect([-1, 0, 1]).toContain(c);
      const mag = Math.abs(s.normal[0]) + Math.abs(s.normal[1]) + Math.abs(s.normal[2]);
      expect(mag).toBe(1);
    }
  });

  it('center facelets (one per face) are unique and match the face normal axis', () => {
    // The center of each face has pos equal to its normal.
    FACES.forEach((_, f) => {
      const center = SLOTS[f * 9 + 4]; // r=1,c=1 is the center
      expect(center.pos).toEqual(center.normal);
    });
  });

  it('SOLVED labels each facelet with its own face', () => {
    expect(SOLVED).toHaveLength(54);
    FACES.forEach((face, f) => {
      for (let i = 0; i < 9; i++) expect(SOLVED[f * 9 + i]).toBe(face);
    });
  });
});
