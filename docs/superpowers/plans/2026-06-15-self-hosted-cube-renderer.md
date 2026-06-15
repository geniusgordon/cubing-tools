# Self-Hosted Cube Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead `visualcube.php` service with a client-side cube renderer that produces the same SVG cube images, keeping the `CubeImage` interface unchanged.

**Architecture:** A pure-logic pipeline under `src/lib/cube-render/`: tokenize an alg string → invert it (VisualCube `case` semantics) → apply moves to a solved 54-facelet cube via a geometric (axis/layer/rotation) engine → mask by stage → lay out polygons for the plan or 3D view → render inline `<svg>`. No network, no loading state.

**Tech Stack:** TypeScript, React 19, Vitest + @testing-library/react. Spec: `docs/superpowers/specs/2026-06-15-self-hosted-cube-renderer-design.md`.

---

## Background the engineer needs

The cube has 6 faces, 9 stickers each = 54 facelets. We model the solved cube geometrically: every cubie occupies an integer coordinate `(x,y,z)` with each component in `{-1,0,1}`. A **facelet slot** is `(position, normal)` where `position` is the cubie center and `normal` is the outward face direction. Axes: **X = right(+), Y = up(+), Z = front(+)**. Faces and normals: `U=+Y, R=+X, F=+Z, D=-Y, L=-X, B=-Z`.

A **move** rotates one or more layers (cubies sharing a coordinate on some axis) by quarter turns. Because every move is a geometric rotation of `(position, normal)` pairs, the permutation is computed, never hand-authored. Quarter-turn rotations about the positive axes (right-handed, +90° = counter-clockwise viewed from the +axis):

- `+90° about +X`: `(x,y,z) → (x, -z, y)`
- `+90° about +Y`: `(x,y,z) → (z, y, -x)`
- `+90° about +Z`: `(x,y,z) → (-y, x, z)`

A face turn **clockwise (as seen from outside the face)** equals `-90°` about the outward normal. For the three positive-axis faces (`U,R,F`) that is 3 quarter-turns about the positive axis; for the negative-axis faces (`D,L,B`) it is 1 quarter-turn about the positive axis. This is captured per-move as a "clockwise quarter count" `cwq`.

Every move in WCA 3×3 notation reduces to `(axis, layers, cwq)`:

| Move | axis | layers (coord on axis) | cwq |
|------|------|------------------------|-----|
| `R` | X | `{1}` | 3 |
| `L` | X | `{-1}` | 1 |
| `M` | X | `{0}` | 1 (follows L) |
| `r` | X | `{1,0}` | 3 |
| `l` | X | `{-1,0}` | 1 |
| `x` | X | `{1,0,-1}` | 3 (follows R) |
| `U` | Y | `{1}` | 3 |
| `D` | Y | `{-1}` | 1 |
| `E` | Y | `{0}` | 1 (follows D) |
| `u` | Y | `{1,0}` | 3 |
| `d` | Y | `{-1,0}` | 1 |
| `y` | Y | `{1,0,-1}` | 3 (follows U) |
| `F` | Z | `{1}` | 3 |
| `B` | Z | `{-1}` | 1 |
| `S` | Z | `{0}` | 3 (follows F) |
| `f` | Z | `{1,0}` | 3 |
| `b` | Z | `{-1,0}` | 1 |
| `z` | Z | `{1,0,-1}` | 3 (follows F) |

Applying a move with amount `a` (1=cw, 2=double, 3=prime/ccw) = rotate the selected layers `(cwq * a) mod 4` times by `+90°` about the positive axis.

**Facelet ordering** (must be identical everywhere): faces in order `U, R, F, D, L, B`; within a face, row-major `r=0..2, c=0..2`. The `(r,c) → (position, normal)` map per face:

| Face | position `(x,y,z)` | normal |
|------|--------------------|--------|
| U | `(c-1, 1, r-1)` | `(0,1,0)` |
| R | `(1, 1-r, 1-c)` | `(1,0,0)` |
| F | `(c-1, 1-r, 1)` | `(0,0,1)` |
| D | `(c-1, -1, 1-r)` | `(0,-1,0)` |
| L | `(-1, 1-r, c-1)` | `(-1,0,0)` |
| B | `(1-c, 1-r, -1)` | `(0,0,-1)` |

Row `r=0` of `F,R,B,L` is the row adjacent to U (the "petals" shown in plan view).

A **facelet's value** is its face label (`'U' | 'R' | 'F' | 'D' | 'L' | 'B'`), not a color — colors are applied at render time via the scheme. This lets stages compare a facelet to `'U'` and keeps the engine color-agnostic.

---

## File Structure

```
src/lib/cube-render/
  types.ts          # Face, Color, Facelets, FACES, Vec3, helpers
  engine.ts         # slot table, rotation, MOVES, tokenize, applyCase, SOLVED
  engine.test.ts
  scheme.ts         # face label -> hex color (+ gray)
  stages.ts         # stage -> { active positions, recolor }
  stages.test.ts
  layout-plan.ts    # facelets -> plan-view cells
  layout-3d.ts      # facelets -> 3D-view quads
  layout.test.ts
  index.ts          # barrel
src/components/cube-image.tsx   # rewritten (same props), renders <svg>
src/routes/home.tsx             # thumbnails migrated to <CubeImage>
src/lib/cube.ts                 # remove toQueryString
src/lib/cube.test.ts            # remove toQueryString test
```

---

## Task 1: Types and facelet slot table

**Files:**
- Create: `src/lib/cube-render/types.ts`
- Create: `src/lib/cube-render/engine.ts` (slots only this task)
- Test: `src/lib/cube-render/engine.test.ts`

- [ ] **Step 1: Create `types.ts`**

```ts
export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';
export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];

export type Vec3 = readonly [number, number, number];

/** 54 facelet labels, faces in FACES order, each row-major r=0..2,c=0..2. */
export type Facelets = Face[];

export interface Slot {
  face: Face;
  index: number; // 0..53 global index
  pos: Vec3; // cubie center
  normal: Vec3; // outward face direction
}
```

- [ ] **Step 2: Write the failing test for the slot table**

Add to `engine.test.ts`:

```ts
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
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `pnpm test src/lib/cube-render/engine.test.ts`
Expected: FAIL — `engine.ts` has no `SLOTS`/`SOLVED`.

- [ ] **Step 4: Implement the slot table in `engine.ts`**

```ts
import { Face, FACES, Facelets, Slot, Vec3 } from './types';

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
```

- [ ] **Step 5: Run the test to confirm it passes**

Run: `pnpm test src/lib/cube-render/engine.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/cube-render/types.ts src/lib/cube-render/engine.ts src/lib/cube-render/engine.test.ts
git commit -m "feat(cube-render): facelet slot table and solved state

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Rotation and move application

**Files:**
- Modify: `src/lib/cube-render/engine.ts`
- Test: `src/lib/cube-render/engine.test.ts`

- [ ] **Step 1: Write failing tests for rotations and a single face turn**

Add to `engine.test.ts`:

```ts
import { applyAlg } from './engine'; // add to the existing import line

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
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/lib/cube-render/engine.test.ts`
Expected: FAIL — `applyAlg` not defined.

- [ ] **Step 3: Implement rotation + move application + `applyAlg` in `engine.ts`**

Add below the slot table:

```ts
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

interface Token {
  move: string;
  amount: number; // 1, 2, or 3
}

/** Tokenize WCA notation; ignores spaces, parens, and unknown chars. */
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

function applyToken(facelets: Facelets, token: Token): Facelets {
  const def = MOVES[token.move];
  const quarters = (def.cwq * token.amount) % 4;
  if (quarters === 0) return facelets.slice();
  const next = facelets.slice();
  for (const s of SLOTS) {
    if (!def.layers.includes(s.pos[def.axis])) continue;
    const destKey = keyOf(rotN(s.pos, def.axis, quarters), rotN(s.normal, def.axis, quarters));
    const dest = SLOT_BY_KEY.get(destKey)!;
    next[dest] = facelets[s.index];
  }
  return next;
}

export function applyAlg(facelets: Facelets, alg: string): Facelets {
  return tokenize(alg).reduce(applyToken, facelets);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `pnpm test src/lib/cube-render/engine.test.ts`
Expected: PASS (all structural + both physical-direction tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube-render/engine.ts src/lib/cube-render/engine.test.ts
git commit -m "feat(cube-render): geometric move engine + tokenizer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `applyCase` (VisualCube `case` = inverse)

**Files:**
- Modify: `src/lib/cube-render/engine.ts`
- Test: `src/lib/cube-render/engine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { applyCase } from './engine'; // add to imports

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
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/lib/cube-render/engine.test.ts`
Expected: FAIL — `applyCase` not defined.

- [ ] **Step 3: Implement `applyCase` and `invert`**

```ts
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
```

Make sure `Token` is exported or `invert`'s return type is acceptable; if `Token` is not exported, change `invert` to return `Token[]` with `Token` exported, OR have `applyCase` inline the reduce. Simplest: keep `Token` internal and have `invert` return `Token[]` by exporting `Token` as a type. Add `export interface Token { move: string; amount: number }` (replace the existing non-exported declaration).

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test src/lib/cube-render/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube-render/engine.ts src/lib/cube-render/engine.test.ts
git commit -m "feat(cube-render): applyCase (inverse) for VisualCube case semantics

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Color scheme

**Files:**
- Create: `src/lib/cube-render/scheme.ts`

- [ ] **Step 1: Create `scheme.ts`**

```ts
import { Face } from './types';

/** CFOP last-layer convention; hexes chosen to resemble the old diagrams. */
export const SCHEME: Record<Face, string> = {
  U: '#fefe00', // yellow
  R: '#00d800', // green
  F: '#ee0000', // red
  D: '#ffffff', // white
  L: '#0000f2', // blue
  B: '#ffa100', // orange
};

export const GRAY = '#808080';
```

- [ ] **Step 2: Commit** (no behavior to test yet — a constant map)

```bash
git add src/lib/cube-render/scheme.ts
git commit -m "feat(cube-render): color scheme

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Stage masking

**Files:**
- Create: `src/lib/cube-render/stages.ts`
- Test: `src/lib/cube-render/stages.test.ts`

Stage masking decides, per facelet position, whether it shows its color or gray, and (for `oll`) recolors non-U facelets to gray. Positions are global indices into the `FACES`-ordered facelet array. Helpful index ranges: U = 0–8, R = 9–17, F = 18–26, D = 27–35, L = 36–44, B = 45–53. The "top row" of a side face (adjacent to U) is its indices `+0,+1,+2`. The "bottom row" (adjacent to D) is `+6,+7,+8`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/lib/cube-render/stages.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `stages.ts`**

```ts
import { applyAlg } from './engine';
import { Face, Facelets } from './types';
import { GRAY, SCHEME } from './scheme';

export interface ResolvedStage {
  active: Set<number>;
  recolor?: (label: Face) => boolean; // true => force gray even if active
  setup?: string; // optional rotation applied to the case before masking
}

function range(start: number, n: number): number[] {
  return Array.from({ length: n }, (_, i) => start + i);
}

const ALL = new Set(range(0, 54));
const U_FACE = range(0, 9);
const SIDE_TOPS = [9, 10, 11, 18, 19, 20, 45, 46, 47, 36, 37, 38]; // R,F,B,L top rows
const LL = new Set([...U_FACE, ...SIDE_TOPS]);
const D_FACE = range(27, 9);
const SIDE_BOTTOMS = [15, 16, 17, 24, 25, 26, 51, 52, 53, 42, 43, 44]; // R,F,B,L bottom rows
const CROSS = new Set([...D_FACE, ...SIDE_BOTTOMS]);

export function resolveStage(stage: string | undefined): ResolvedStage {
  switch (stage) {
    case 'll':
      return { active: LL };
    case 'coll':
      return { active: LL };
    case 'oll':
      return { active: LL, recolor: (label) => label !== 'U' };
    case 'cross':
      return { active: CROSS };
    case 'cross-x2':
      return { active: CROSS, setup: 'x2' };
    case 'full':
    default:
      return { active: ALL };
  }
}

/** Apply a stage to facelet labels and produce per-facelet hex colors. */
export function maskedColors(facelets: Facelets, stage: string | undefined): string[] {
  const s = resolveStage(stage);
  const labels = s.setup ? applyAlg(facelets, s.setup) : facelets;
  return labels.map((label, i) => {
    if (!s.active.has(i)) return GRAY;
    if (s.recolor && s.recolor(label)) return GRAY;
    return SCHEME[label];
  });
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test src/lib/cube-render/stages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube-render/stages.ts src/lib/cube-render/stages.test.ts
git commit -m "feat(cube-render): stage masking (ll/oll/coll/cross)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Plan-view layout

**Files:**
- Create: `src/lib/cube-render/layout-plan.ts`
- Test: `src/lib/cube-render/layout.test.ts`

Plan view: the U face as a centered 3×3, with four "petals" (the top rows of F, R, B, L) placed below, right, above, and left. Output is a list of axis-aligned cells `{ x, y, w, h, fill }` in an SVG viewBox of `[0..VB] × [0..VB]`. `CubeImage` scales the viewBox to `size`.

Petal sticker ordering relative to the cube's geometry (so colors land correctly):
- **Bottom (F)**, left→right: F top row `c=0,1,2` → indices `18,19,20`.
- **Right (R)**, top→bottom: `R[2],R[1],R[0]` → indices `11,10,9`.
- **Top (B)**, left→right: `B[2],B[1],B[0]` → indices `47,46,45`.
- **Left (L)**, top→bottom: `L[0],L[1],L[2]` → indices `36,37,38`.

- [ ] **Step 1: Write the failing test**

Create `layout.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/lib/cube-render/layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `layout-plan.ts`**

```ts
export interface Cell {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
}

export const PLAN_VIEWBOX = 100;

// Geometry: U grid is 3x3 of size G centered; petals are thin strips of depth P.
const G = 24; // U sticker side
const P = 8; // petal depth
const GAP = 1.5;
const U_SIZE = G * 3; // 72
const ORIGIN = (PLAN_VIEWBOX - U_SIZE) / 2; // center the U block

function cell(x: number, y: number, w: number, h: number, fill: string): Cell {
  return { x: x + GAP / 2, y: y + GAP / 2, w: w - GAP, h: h - GAP, fill };
}

export function planLayout(colors: string[]): Cell[] {
  const cells: Cell[] = [];
  // U face 3x3
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      cells.push(cell(ORIGIN + c * G, ORIGIN + r * G, G, G, colors[r * 3 + c]));
    }
  }
  // Bottom petal (F top row), left->right indices 18,19,20
  [18, 19, 20].forEach((idx, c) => {
    cells.push(cell(ORIGIN + c * G, ORIGIN + U_SIZE, G, P, colors[idx]));
  });
  // Right petal (R), top->bottom indices 11,10,9
  [11, 10, 9].forEach((idx, r) => {
    cells.push(cell(ORIGIN + U_SIZE, ORIGIN + r * G, P, G, colors[idx]));
  });
  // Top petal (B), left->right indices 47,46,45
  [47, 46, 45].forEach((idx, c) => {
    cells.push(cell(ORIGIN + c * G, ORIGIN - P, G, P, colors[idx]));
  });
  // Left petal (L), top->bottom indices 36,37,38
  [36, 37, 38].forEach((idx, r) => {
    cells.push(cell(ORIGIN - P, ORIGIN + r * G, P, G, colors[idx]));
  });
  return cells;
}
```

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test src/lib/cube-render/layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube-render/layout-plan.ts src/lib/cube-render/layout.test.ts
git commit -m "feat(cube-render): plan-view layout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: 3D-view layout

**Files:**
- Create: `src/lib/cube-render/layout-3d.ts`
- Modify: `src/lib/cube-render/layout.test.ts`

3D view: an oblique projection showing faces U, F, R as parallelograms, 9 quads each. We project 3D points with an isometric map and generate sticker corner quads per face. Each face is parametrized by grid coordinates `(u, v) ∈ [0..3]`; we map the four corners of each cell into 3D, then project to 2D.

Face parametrization (so colors match the engine ordering): for sticker `(r, c)` the cell spans grid `u ∈ [c, c+1]`, `v ∈ [r, r+1]`. Convert a face grid point `(u, v)` to a 3D coordinate on the cube surface (cube spans `[-1.5, 1.5]` per axis; grid `0..3` maps to `-1.5..1.5`):

- **U** (top, y = 1.5): `(x,y,z) = (g(u), 1.5, g(v))` where `g(t) = t - 1.5`. Matches U index `r*3+c` with x from c, z from r.
- **F** (front, z = 1.5): `(x,y,z) = (g(u), -g(v) , 1.5)` → wait, F index `18 + r*3 + c` has `y = 1-r` so top row r=0 is y high. Use `y = 1.5 - v` shifted: corners `(g(u), 1.5 - v, 1.5)`. (See code.)
- **R** (right, x = 1.5): R index `9 + r*3 + c` has `z = 1-c`, `y = 1-r`. Corners `(1.5, 1.5 - v, 1.5 - u)`.

- [ ] **Step 1: Write the failing test** (append to `layout.test.ts`)

```ts
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
```

- [ ] **Step 2: Run to confirm failure**

Run: `pnpm test src/lib/cube-render/layout.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `layout-3d.ts`**

```ts
import { Vec3 } from './types';

export interface Quad {
  points: [number, number][];
  fill: string;
}

export const CUBE3D_VIEWBOX = 100;

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = Math.sin(Math.PI / 6);
// Visible-face corners span sx = CX ± 2.6·SCALE and sy = CY ± 3·SCALE;
// SCALE=15, CX=CY=50 keeps everything inside [0,100] with margin.
const SCALE = 15;
const CX = 50;
const CY = 50;

/** Isometric projection of a 3D point to 2D screen (y down). */
function project([x, y, z]: Vec3): [number, number] {
  const sx = CX + (x - z) * COS30 * SCALE;
  const sy = CY + ((x + z) * SIN30 - y) * SCALE;
  return [sx, sy];
}

type FaceCorner = (u: number, v: number) => Vec3;

const U_CORNER: FaceCorner = (u, v) => [u - 1.5, 1.5, v - 1.5];
const F_CORNER: FaceCorner = (u, v) => [u - 1.5, 1.5 - v, 1.5];
const R_CORNER: FaceCorner = (u, v) => [1.5, 1.5 - v, 1.5 - u];

function faceQuads(corner: FaceCorner, baseIndex: number, colors: string[]): Quad[] {
  const out: Quad[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const pts: [number, number][] = [
        project(corner(c, r)),
        project(corner(c + 1, r)),
        project(corner(c + 1, r + 1)),
        project(corner(c, r + 1)),
      ];
      out.push({ points: pts, fill: colors[baseIndex + r * 3 + c] });
    }
  }
  return out;
}

export function cube3dLayout(colors: string[]): Quad[] {
  return [
    ...faceQuads(U_CORNER, 0, colors), // U faces, indices 0..8
    ...faceQuads(F_CORNER, 18, colors), // F faces, indices 18..26
    ...faceQuads(R_CORNER, 9, colors), // R faces, indices 9..17
  ];
}
```

If the "within viewBox" test fails because the projection overflows, adjust `SCALE` down (it is the single tuning knob); `SCALE=15` with `CX=CY=50` is computed to fit `[0,100]` with margin.

- [ ] **Step 4: Run to confirm pass**

Run: `pnpm test src/lib/cube-render/layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube-render/layout-3d.ts src/lib/cube-render/layout.test.ts
git commit -m "feat(cube-render): 3D oblique-view layout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Barrel export

**Files:**
- Create: `src/lib/cube-render/index.ts`

- [ ] **Step 1: Create `index.ts`**

```ts
export { applyCase, applyAlg, SOLVED } from './engine';
export { maskedColors } from './stages';
export { planLayout, PLAN_VIEWBOX, type Cell } from './layout-plan';
export { cube3dLayout, CUBE3D_VIEWBOX, type Quad } from './layout-3d';
export { SCHEME, GRAY } from './scheme';
```

- [ ] **Step 2: Type-check and commit**

Run: `pnpm exec tsc -b`
Expected: PASS.

```bash
git add src/lib/cube-render/index.ts
git commit -m "feat(cube-render): barrel export

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Rewrite `CubeImage` to render SVG

**Files:**
- Modify: `src/components/cube-image.tsx`

- [ ] **Step 1: Replace `src/components/cube-image.tsx` entirely**

```tsx
import { useMemo } from 'react';
import {
  applyCase,
  maskedColors,
  planLayout,
  PLAN_VIEWBOX,
  cube3dLayout,
  CUBE3D_VIEWBOX,
} from '@/lib/cube-render';

interface CubeImageProps {
  size?: number;
  alg: string;
  view?: 'plan' | 'trans';
  stage?: string;
}

export function CubeImage({ size = 200, alg, view, stage }: CubeImageProps) {
  const svg = useMemo(() => {
    const colors = maskedColors(applyCase(alg), stage);
    if (view === 'plan') {
      return { viewBox: PLAN_VIEWBOX, kind: 'plan' as const, cells: planLayout(colors) };
    }
    return { viewBox: CUBE3D_VIEWBOX, kind: '3d' as const, quads: cube3dLayout(colors) };
  }, [alg, view, stage]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${svg.viewBox} ${svg.viewBox}`}
      role="img"
      aria-label="cube"
    >
      {svg.kind === 'plan'
        ? svg.cells.map((c, i) => (
            <rect
              key={i}
              x={c.x}
              y={c.y}
              width={c.w}
              height={c.h}
              rx={1}
              fill={c.fill}
              stroke="#222"
              strokeWidth={0.6}
            />
          ))
        : svg.quads.map((q, i) => (
            <polygon
              key={i}
              points={q.points.map(([x, y]) => `${x},${y}`).join(' ')}
              fill={q.fill}
              stroke="#222"
              strokeWidth={0.6}
              strokeLinejoin="round"
            />
          ))}
    </svg>
  );
}
```

- [ ] **Step 2: Type-check + build + run the existing route smoke tests**

Run: `pnpm exec tsc -b`
Expected: PASS.

Run: `pnpm test`
Expected: PASS (engine/stages/layout tests + the existing route smoke tests, which mount `CubeImage` — they must still render without throwing).

Run: `pnpm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/cube-image.tsx
git commit -m "feat(cube-render): render CubeImage as inline SVG (no network)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Migrate Home thumbnails + remove dead `toQueryString`

**Files:**
- Modify: `src/routes/home.tsx`
- Modify: `src/lib/cube.ts` (remove `toQueryString`)
- Modify: `src/lib/cube.test.ts` (remove its test)

- [ ] **Step 1: Replace the four Home thumbnails with `<CubeImage>`**

In `src/routes/home.tsx`, replace the `<img src={t.image} … />` usage and the `image` URLs. Update the `TRAINERS` array to carry render props instead of an image URL, and render a `CubeImage`. Use these per-trainer props (matching the old thumbnails):

```tsx
import { CubeImage } from '@/components/cube-image';

const TRAINERS = [
  { title: 'PLL Recognition Trainer', to: '/trainers/recognition/pll',
    alg: '', view: undefined as 'plan' | undefined, stage: 'll' },
  { title: 'COLL Recognition Trainer', to: '/trainers/recognition/coll',
    alg: '', view: 'plan' as const, stage: 'coll' },
  { title: 'Cross Trainer', to: '/trainers/cross',
    alg: '', view: undefined as 'plan' | undefined, stage: 'cross-x2' },
  { title: 'ZBLL Trainer', to: '/trainers/zbll',
    alg: "(R U R' U') (R U' R U2 R2) (U' R U R' U') (R2 U' R2 U')",
    view: 'plan' as const, stage: 'll' },
];
```

And in the map body, replace the `<img>` with:

```tsx
<CubeImage alg={t.alg} view={t.view} stage={t.stage} size={128} />
```

(The PLL and Cross thumbnails keep the default 3D view by leaving `view` undefined; COLL and ZBLL use `plan` as before. The ZBLL example shows a sample case.)

- [ ] **Step 2: Remove `toQueryString` from `src/lib/cube.ts`**

Delete the entire `toQueryString` function (the `export function toQueryString(...) { ... }` block). It has no remaining callers after Task 9.

- [ ] **Step 3: Remove its test from `src/lib/cube.test.ts`**

Delete the `describe('toQueryString', ...)` block and remove `toQueryString` from the import line in that test file.

- [ ] **Step 4: Type-check, build, full test run**

Run: `pnpm exec tsc -b`
Expected: PASS (no dangling `toQueryString` references — if tsc reports one, that file also needs updating).

Run: `pnpm test`
Expected: PASS.

Run: `pnpm run build`
Expected: PASS, produces `dist/404.html`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/home.tsx src/lib/cube.ts src/lib/cube.test.ts
git commit -m "feat(cube-render): render Home thumbnails locally; drop toQueryString

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Visual verification + final gate

**Files:** none (verification + any small fixes)

- [ ] **Step 1: Generate reference SVGs to eyeball against known cube images**

Create a throwaway script `scripts/dump-cubes.mjs` is overkill; instead add a temporary Vitest that writes a few SVGs, OR (preferred) start the dev server and visually inspect. Run:

```bash
pnpm dev
```

Open the printed URL (served under `/cubing-tools/`). Verify against your memory of the old images / any online cubing reference:
- **Home**: four thumbnails render (PLL 3D last-layer, COLL plan, Cross 3D cross, ZBLL plan with a recognizable case).
- **PLL trainer** (`/cubing-tools/trainers/recognition/pll`): the 3D cube shows a solved-looking top (yellow) with a scrambled last layer; pressing Space changes it.
- **COLL trainer**: plan-view cards show distinct COLL cases; the top diagram updates.
- **ZBLL trainer**: the Select-Cases dialog shows OLL/COLL/ZBLL plan thumbnails; the main case shows a last-layer plan.

Stop the server (Ctrl-C).

- [ ] **Step 2: Confirm the well-known sanity case**

The simplest unambiguous visual check: a **solved** cube. In any plan-view spot (e.g. a COLL card before interaction, or temporarily render `<CubeImage alg="" view="plan" />`), the U face must be a 3×3 of yellow with petals red(F, bottom)/green(R, right)/orange(B, top)/blue(L, left). If the petal colors are on the wrong sides, the petal index mapping in `layout-plan.ts` (Task 6) is wrong — fix the four index arrays and re-run `layout.test.ts`.

If a real PLL/OLL diagram looks mirrored or rotated vs a reference chart, the likely cause is a move-direction convention; re-check the two physical-direction tests in `engine.test.ts` against a physical cube and adjust `cwq` signs only if a test's expectation is genuinely wrong (the tests are the source of truth).

- [ ] **Step 3: Final gate**

```bash
pnpm exec tsc -b
pnpm run lint
pnpm test
pnpm run build
```
Expected: all green; `dist/404.html` present; lint shows only the known pre-existing `react-hooks/set-state-in-effect` warnings (0 errors). Note: `CubeImage` no longer uses an effect, so its previous `set-state-in-effect` warning is gone.

- [ ] **Step 4: Commit any fixes from Steps 1–2**

```bash
git add -A
git commit -m "fix(cube-render): visual-verification adjustments

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

(If no fixes were needed, skip this commit.)

---

## Self-Review Notes (spec coverage)

- **`case` = inverse** → Task 3 (`applyCase`), used by `CubeImage` (Task 9).
- **Move vocabulary (faces/wide/slice/rotations, `'`/`2`, parens/space-less)** → Task 2 (`MOVES` table + tokenizer); lenient parsing (skip unknowns) covered there.
- **Color scheme** → Task 4.
- **Stages full/ll/oll/coll/cross/cross-x2** → Task 5 (`resolveStage`/`maskedColors`).
- **Plan + 3D views** → Tasks 6 and 7.
- **`CubeImage` interface unchanged; no network/loading** → Task 9.
- **Home thumbnails migrated; `toQueryString` removed** → Task 10.
- **Testing strategy (engine identities + physical direction, stage sets, layout structure)** → Tasks 2,3,5,6,7; visual confirmation → Task 11.
- **Out of scope** (PNG, animation, arrows, alt-scheme UI) → not built.

**Consistency check:** facelet index ranges (U 0–8, R 9–17, F 18–26, D 27–35, L 36–44, B 45–53) are used identically in `stages.ts`, `layout-plan.ts`, and `layout-3d.ts`. `maskedColors(facelets, stage)`, `planLayout(colors)`, `cube3dLayout(colors)`, and `applyCase(alg)` signatures match their call sites in `CubeImage`. `view` undefined → 3D and unknown `stage` → full are handled in `CubeImage`/`resolveStage` respectively.
