import { describe, it, expect } from 'vitest';
import { SLOTS, SOLVED, applyAlg, applyCase, permuteSlots, stripOuterRotations } from './engine';
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

describe('move engine — slice/rotation direction identities', () => {
  // These standard cube identities pin the M/E/S slice and x/y/z rotation
  // directions directly, so a wrong cwq sign would fail here even when the
  // order-4 structural tests still pass.
  it("x = R M' L'", () => {
    expect(applyAlg(SOLVED, 'x')).toEqual(applyAlg(SOLVED, "R M' L'"));
  });
  it("y = U E' D'", () => {
    expect(applyAlg(SOLVED, 'y')).toEqual(applyAlg(SOLVED, "U E' D'"));
  });
  it("z = F S B'", () => {
    expect(applyAlg(SOLVED, 'z')).toEqual(applyAlg(SOLVED, "F S B'"));
  });
});

describe('move engine — structural identities', () => {
  const solved = SOLVED;
  it('U^4 = identity', () => {
    expect(applyAlg(solved, 'U U U U')).toEqual(solved);
  });
  it('x^4 = identity', () => {
    expect(applyAlg(solved, 'x x x x')).toEqual(solved);
  });
  it('y^4 = identity', () => {
    expect(applyAlg(solved, 'y y y y')).toEqual(solved);
  });
  it('sexy move (R U R\' U\') x6 = identity', () => {
    expect(applyAlg(solved, "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'")).toEqual(solved);
  });
  it('r r\' = identity', () => {
    expect(applyAlg(solved, "r r'")).toEqual(solved);
  });
  it('M M\' = identity', () => {
    expect(applyAlg(solved, "M M'")).toEqual(solved);
  });
  it('S S\' = identity', () => {
    expect(applyAlg(solved, "S S'")).toEqual(solved);
  });
});

describe('move engine — physical direction (ground truth)', () => {
  // After x (whole-cube rotation following R, clockwise), the Front face
  // rotates up to the top, so every U facelet now shows F's color.
  it('x brings F to U', () => {
    const after = applyAlg(SOLVED, 'x');
    for (let i = 0; i < 9; i++) expect(after[i]).toBe('F'); // U face = indices 0..8
  });
  // After y (whole-cube rotation following U, clockwise from top), the Right
  // face comes to the Front, so every F facelet shows R's color.
  it('y brings R to F', () => {
    const after = applyAlg(SOLVED, 'y');
    for (let i = 18; i < 27; i++) expect(after[i]).toBe('R'); // F face = indices 18..26
  });
});

describe('applyCase = inverse applied to solved', () => {
  it('applyCase(X) equals applyAlg(SOLVED, inverse(X))', () => {
    // A case and the forward alg are inverses: applying the forward alg
    // to a case-state returns to solved.
    const caseState = applyCase("R U R' U'");
    const back = applyAlg(caseState, "R U R' U'");
    expect(back).toEqual(SOLVED);
  });
  it('PLL preserves U orientation: T-perm case keeps the U face all U', () => {
    const t = applyCase("R U R' U' R' F R2 U' R' U' R U R' F'");
    for (let i = 0; i < 9; i++) expect(t[i]).toBe('U');
  });
  it('a non-trivial case is not solved', () => {
    expect(applyCase("R U R' U'")).not.toEqual(SOLVED);
  });
});

describe('permuteSlots — forward slot-identity permutation', () => {
  it('identity alg leaves every slot in place', () => {
    expect(permuteSlots('')).toEqual(SLOTS.map((s) => s.index));
  });

  it('is always a permutation of 0..53', () => {
    const out = permuteSlots("R U R' U'");
    expect([...out].sort((a, b) => a - b)).toEqual(SLOTS.map((s) => s.index));
  });

  it('U^4 returns to identity', () => {
    expect(permuteSlots('U U U U')).toEqual(SLOTS.map((s) => s.index));
  });

  it('out[d] is dest→origin: applying U moves slot 0 off its home', () => {
    // After a single U, the sticker at U-slot 0 is no longer slot 0's own.
    const out = permuteSlots('U');
    expect(out[0]).not.toBe(0);
  });
});

describe('stripOuterRotations', () => {
  it('drops a leading whole-cube rotation', () => {
    expect(stripOuterRotations("(y2) M2 U M U2 M' U M2")).toBe("M2 U M U2 M' U M2");
  });

  it('drops trailing rotations and normalizes amounts', () => {
    expect(stripOuterRotations("y R U R' y'")).toBe("R U R'");
  });

  it('leaves a rotation-free alg unchanged', () => {
    expect(stripOuterRotations("R U R' U'")).toBe("R U R' U'");
  });

  it('keeps mid-alg rotations (only outer ones are stripped)', () => {
    expect(stripOuterRotations('R y R')).toBe('R y R');
  });

  it('an all-rotation alg collapses to empty', () => {
    expect(stripOuterRotations('x y2 z')).toBe('');
  });

  it('the stripped Ua has the same forward permutation as the rotation-free Ua', () => {
    expect(permuteSlots(stripOuterRotations("(y2) M2 U M U2 M' U M2"))).toEqual(
      permuteSlots("M2 U M U2 M' U M2"),
    );
  });
});
