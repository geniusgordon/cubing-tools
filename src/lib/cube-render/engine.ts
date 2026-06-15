import type { Face, Facelets, Slot, Vec3 } from './types';
import { FACES } from './types';

// (r,c) -> position for each face; normal is constant per face.
const FACE_GEOM: Record<Face, { normal: Vec3; pos: (r: number, c: number) => Vec3 }> = {
  U: { normal: [0, 1, 0], pos: (r, c) => [c - 1, 1, r - 1] },
  R: { normal: [1, 0, 0], pos: (r, c) => [1, 1 - r, 1 - c] },
  F: { normal: [0, 0, 1], pos: (r, c) => [c - 1, 1 - r, 1] },
  D: { normal: [0, -1, 0], pos: (r, c) => [c - 1, -1, 1 - r] },
  L: { normal: [-1, 0, 0], pos: (r, c) => [-1, 1 - r, c - 1] },
  B: { normal: [0, 0, -1], pos: (r, c) => [1 - c, 1 - r, -1] },
};

export const SLOTS: Slot[] = FACES.flatMap((face, f) => {
  const g = FACE_GEOM[face];
  const out: Slot[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out.push({ face, index: f * 9 + r * 3 + c, pos: g.pos(r, c), normal: g.normal });
    }
  }
  return out;
});

export const SOLVED: Facelets = SLOTS.map((s) => s.face);
