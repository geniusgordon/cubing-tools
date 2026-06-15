import { describe, it, expect } from 'vitest';
import {
  inverseAlg,
  formatTime,
  averageOfN,
  caseToString,
  generateCrossScramble,
} from './cube';
import { ColorNeutrality } from '@/data/types';

describe('inverseAlg', () => {
  it('inverts and reverses a sequence', () => {
    expect(inverseAlg("R U R'")).toBe("R U' R'");
  });
  it('keeps double turns and strips parens', () => {
    expect(inverseAlg("(R U2 R')")).toBe("R U2 R'");
  });
});

describe('formatTime', () => {
  it('formats centiseconds as s.cc', () => {
    expect(formatTime(1234)).toBe('12.34');
    expect(formatTime(5)).toBe('0.05');
  });
});

describe('averageOfN', () => {
  it('returns null when not enough samples', () => {
    expect(averageOfN([1, 2], 3)).toBeNull();
  });
  it('averages the last n samples', () => {
    expect(averageOfN([10, 20, 30, 40], 2)).toBe(35);
  });
});

describe('caseToString', () => {
  it('concatenates auf + alg + rotations', () => {
    const s = caseToString({
      alg: { name: 'T', alg: 'X' },
      preAuf: 1,
      postAuf: 0,
      yRotation: 0,
      cnRotation: 0,
    });
    expect(s).toBe('UX');
  });
});

describe('generateCrossScramble', () => {
  it('returns null for out-of-range level', () => {
    expect(generateCrossScramble(0)).toBeNull();
    expect(generateCrossScramble(8)).toBeNull();
  });
  it('decodes a scramble into face moves for a valid level', () => {
    const s = generateCrossScramble(1);
    expect(Array.isArray(s)).toBe(true);
    expect(s!.length).toBeGreaterThan(0);
    expect(s!.every((m) => /^[RLUDFB]2?'?$/.test(m))).toBe(true);
  });
});

// references ColorNeutrality enum to ensure import is wired
describe('ColorNeutrality', () => {
  it('has the three modes', () => {
    expect(Object.values(ColorNeutrality)).toEqual(['CN', 'D_CN', 'NON_CN']);
  });
});
