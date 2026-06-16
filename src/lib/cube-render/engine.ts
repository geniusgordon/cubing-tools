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

type Axis = 0 | 1 | 2; // X, Y, Z

// +90° (CCW about +axis) quarter rotation of a vector.
function rot90(v: Vec3, axis: Axis): Vec3 {
  const [x, y, z] = v;
  if (axis === 0) return [x, -z, y]; // about +X
  if (axis === 1) return [z, y, -x]; // about +Y
  return [-y, x, z]; // about +Z
}

function rotN(v: Vec3, axis: Axis, times: number): Vec3 {
  let out = v;
  const t = ((times % 4) + 4) % 4;
  for (let i = 0; i < t; i++) out = rot90(out, axis);
  return out;
}

function keyOf(pos: Vec3, normal: Vec3): string {
  return pos.join(',') + '|' + normal.join(',');
}

// Map (pos|normal) -> global slot index, for destination lookup.
const SLOT_BY_KEY = new Map<string, number>(
  SLOTS.map((s) => [keyOf(s.pos, s.normal), s.index]),
);

interface MoveDef {
  axis: Axis;
  layers: number[]; // which coordinate values on `axis` are turned
  cwq: number; // quarter-turns (about +axis) for ONE clockwise outer turn
}

const MOVES: Record<string, MoveDef> = {
  R: { axis: 0, layers: [1], cwq: 3 },
  L: { axis: 0, layers: [-1], cwq: 1 },
  M: { axis: 0, layers: [0], cwq: 1 },
  r: { axis: 0, layers: [1, 0], cwq: 3 },
  l: { axis: 0, layers: [-1, 0], cwq: 1 },
  x: { axis: 0, layers: [1, 0, -1], cwq: 3 },
  U: { axis: 1, layers: [1], cwq: 3 },
  D: { axis: 1, layers: [-1], cwq: 1 },
  E: { axis: 1, layers: [0], cwq: 1 },
  u: { axis: 1, layers: [1, 0], cwq: 3 },
  d: { axis: 1, layers: [-1, 0], cwq: 1 },
  y: { axis: 1, layers: [1, 0, -1], cwq: 3 },
  F: { axis: 2, layers: [1], cwq: 3 },
  B: { axis: 2, layers: [-1], cwq: 1 },
  S: { axis: 2, layers: [0], cwq: 3 },
  f: { axis: 2, layers: [1, 0], cwq: 3 },
  b: { axis: 2, layers: [-1, 0], cwq: 1 },
  z: { axis: 2, layers: [1, 0, -1], cwq: 3 },
};

export interface Token {
  move: string;
  amount: number; // 1, 2, or 3
}

/** Tokenize WCA notation; ignores spaces, parens, and unknown chars. */
// Note: only single-letter moves are recognized. Wide moves use the lowercase
// forms (r,u,f,l,d,b); `Rw`-style notation and numeric prefixes (e.g. 3Rw) are
// not in our data and are silently ignored char-by-char.
export function tokenize(alg: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < alg.length) {
    const ch = alg[i];
    if (MOVES[ch]) {
      // consume any trailing modifiers in any order, e.g. R2, R', R2' (== R2)
      let double = false;
      let prime = false;
      let j = i + 1;
      while (j < alg.length) {
        const m = alg[j];
        if (m === '2') double = true;
        else if (m === "'" || m === '’' || m === '′') prime = true;
        else break;
        j++;
      }
      const amount = double ? 2 : prime ? 3 : 1;
      tokens.push({ move: ch, amount });
      i = j;
    } else {
      i++; // skip spaces, parens, digits-without-move, unknown
    }
  }
  return tokens;
}

function applyToken<T>(arr: T[], token: Token): T[] {
  const def = MOVES[token.move];
  const quarters = (def.cwq * token.amount) % 4;
  if (quarters === 0) return arr.slice();
  const next = arr.slice();
  for (const s of SLOTS) {
    if (!def.layers.includes(s.pos[def.axis])) continue;
    const destKey = keyOf(rotN(s.pos, def.axis, quarters), rotN(s.normal, def.axis, quarters));
    const dest = SLOT_BY_KEY.get(destKey)!;
    next[dest] = arr[s.index];
  }
  return next;
}

export function applyAlg(facelets: Facelets, alg: string): Facelets {
  return tokenize(alg).reduce(applyToken, facelets);
}

/** Reverse the token list and invert each amount (1<->3, 2 stays). */
export function invert(alg: string): Token[] {
  return tokenize(alg)
    .map((t) => ({ move: t.move, amount: t.amount === 2 ? 2 : t.amount === 1 ? 3 : 1 }))
    .reverse();
}

/** Render a "case": the state that `alg` solves = inverse(alg) on solved. */
export function applyCase(alg: string): Facelets {
  return invert(alg).reduce(applyToken, SOLVED);
}

/** Forward permutation of slot identities under `alg`.
 *  Returns dest→origin: out[d] is the index of the slot whose sticker now sits at d. */
export function permuteSlots(alg: string): number[] {
  const ids = SLOTS.map((s) => s.index); // [0..53]
  return tokenize(alg).reduce(applyToken, ids);
}
