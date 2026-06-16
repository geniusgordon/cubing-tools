# Cube-Image Worker + PLL Arrows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve cube PNGs by URL from a Cloudflare Worker that reuses our existing SVG render engine, and add PLL permutation arrows to that engine.

**Architecture:** Add two pure modules to `src/lib/cube-render` (`arrows.ts` computes plan-view permutation arrows; `svg.ts` serializes the existing layouts to an SVG string). A standalone `worker/` Cloudflare Worker parses visualcube-style URL params, calls `renderCubeSvg`, and rasterizes to PNG with `@resvg/resvg-wasm`. The React `CubeImage` and the GitHub Pages app build are left untouched — geometry stays DRY because both consumers call the same `planLayout`/`cube3dLayout`.

**Tech Stack:** TypeScript, Vitest (jsdom, `globals: true`), Cloudflare Workers + Wrangler, `@resvg/resvg-wasm`, pnpm.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/cube-render/engine.ts` (modify) | Add `permuteSlots(alg)` — forward slot-identity permutation; generalize the internal `applyToken` to any array element type so it can permute id arrays as well as face labels. |
| `src/lib/cube-render/layout-plan.ts` (modify) | Add `planSlotCenter(index)` — center `[x,y]` of a U-face slot (0..8) in plan viewBox coords, reusing the existing `G`/`ORIGIN` constants. |
| `src/lib/cube-render/arrows.ts` (create) | `computePllArrows(alg): Arrow[]` — decompose the last-layer corner and edge permutations into cycles and emit directed/double arrows. |
| `src/lib/cube-render/svg.ts` (create) | `renderCubeSvg(opts): string` — serialize stickers (plan or 3D) plus optional PLL arrows to a complete SVG string. |
| `src/lib/cube-render/index.ts` (modify) | Re-export the new public symbols. |
| `worker/params.ts` (create) | `parseRenderRequest(url): { options, fmt }` — pure visualcube param parsing/validation (no wasm import, so it is unit-testable in vitest). |
| `worker/index.ts` (create) | Cloudflare `fetch` handler: parse → `renderCubeSvg` → return SVG or rasterize to PNG. |
| `worker/wasm.d.ts` (create) | Ambient `*.wasm` module declaration for editor type-checking. |
| `worker/wrangler.toml` (create) | Wrangler config: name, main, compatibility date, wasm module rule. |

**Note on the engine change:** `applyToken` currently has signature `(facelets: Facelets, token: Token): Facelets`. We make it generic `<T>(arr: T[], token: Token): T[]`. Its body only ever copies array elements between slots, so this is behavior-preserving for `applyAlg`/`applyCase` (which keep inferring `T = Face`), and lets `permuteSlots` reuse the exact same move geometry instead of re-deriving it.

---

### Task 1: `permuteSlots` in the engine

**Files:**
- Modify: `src/lib/cube-render/engine.ts:116-128` (`applyToken`) and append `permuteSlots` after `applyCase` (ends at line 144)
- Test: `src/lib/cube-render/engine.test.ts` (append a new `describe` block)

- [ ] **Step 1: Write the failing test**

Append to `src/lib/cube-render/engine.test.ts`. Add `permuteSlots` to the existing import on line 2 so it reads:
`import { SLOTS, SOLVED, applyAlg, applyCase, permuteSlots } from './engine';`

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/cube-render/engine.test.ts`
Expected: FAIL — `permuteSlots` is not exported (`"permuteSlots" is not defined` / import error).

- [ ] **Step 3: Generalize `applyToken`**

In `src/lib/cube-render/engine.ts`, replace the `applyToken` function (lines 116-128) with a generic version. Only the signature and the two element references change:

```ts
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
```

`applyAlg` (line 130) and `applyCase` (line 142) stay exactly as they are — they keep inferring `T = Face`.

- [ ] **Step 4: Add `permuteSlots`**

Append to `src/lib/cube-render/engine.ts` after `applyCase`:

```ts
/** Forward permutation of slot identities under `alg`.
 *  Returns dest→origin: out[d] is the index of the slot whose sticker now sits at d. */
export function permuteSlots(alg: string): number[] {
  const ids = SLOTS.map((s) => s.index); // [0..53]
  return tokenize(alg).reduce(applyToken, ids);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/lib/cube-render/engine.test.ts`
Expected: PASS (all existing engine tests plus the 4 new ones).

- [ ] **Step 6: Commit**

```bash
git add src/lib/cube-render/engine.ts src/lib/cube-render/engine.test.ts
git commit -m "feat(cube-render): add permuteSlots for forward slot permutation"
```

---

### Task 2: `planSlotCenter` plan-view geometry

**Files:**
- Modify: `src/lib/cube-render/layout-plan.ts` (append after `planLayout`, ends at line 47)
- Test: `src/lib/cube-render/layout.test.ts` (append a new `describe` block)

- [ ] **Step 1: Write the failing test**

Append to `src/lib/cube-render/layout.test.ts`. Ensure `planSlotCenter` is imported from `./layout-plan` (add it to the existing import if one exists, otherwise add `import { planSlotCenter } from './layout-plan';`).

```ts
describe('planSlotCenter — U-face slot centers', () => {
  // Geometry from layout-plan.ts: G=24, U_SIZE=72, ORIGIN=(100-72)/2=14.
  // Slot 0 = top-left U cell, center at ORIGIN + G/2 = 14 + 12 = 26.
  it('slot 0 (top-left) center is [26, 26]', () => {
    expect(planSlotCenter(0)).toEqual([26, 26]);
  });

  it('slot 4 (center) is the viewBox center [50, 50]', () => {
    expect(planSlotCenter(4)).toEqual([50, 50]);
  });

  it('slot 8 (bottom-right) center is [74, 74]', () => {
    // r=2,c=2 → 14 + 2*24 + 12 = 74.
    expect(planSlotCenter(8)).toEqual([74, 74]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/cube-render/layout.test.ts`
Expected: FAIL — `planSlotCenter` is not exported.

- [ ] **Step 3: Add `planSlotCenter`**

Append to `src/lib/cube-render/layout-plan.ts` (it can see the file-private `G` and `ORIGIN`):

```ts
/** Center (x,y) of a U-face slot (index 0..8) in plan viewBox coords. */
export function planSlotCenter(index: number): [number, number] {
  const r = Math.floor(index / 3);
  const c = index % 3;
  return [ORIGIN + c * G + G / 2, ORIGIN + r * G + G / 2];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/cube-render/layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube-render/layout-plan.ts src/lib/cube-render/layout.test.ts
git commit -m "feat(cube-render): add planSlotCenter for U-face slot geometry"
```

---

### Task 3: `arrows.ts` — PLL permutation arrows

**Files:**
- Create: `src/lib/cube-render/arrows.ts`
- Test: `src/lib/cube-render/arrows.test.ts`

**Background:** `permuteSlots(alg)` returns `out` where `out[d]` is the slot whose sticker now occupies slot `d` (dest→origin). Inverting it gives `dest[s]` = where slot `s`'s sticker went. PLL preserves U orientation, so U-corner stickers (slots 0,2,6,8) permute only among corner slots, and U-edge stickers (slots 1,3,5,7) only among edge slots. We decompose each into cycles: a 2-cycle becomes one double-headed arrow; a longer cycle becomes one directed arrow per edge.

- [ ] **Step 1: Write the failing test**

Create `src/lib/cube-render/arrows.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/cube-render/arrows.test.ts`
Expected: FAIL — cannot resolve `./arrows`.

- [ ] **Step 3: Implement `arrows.ts`**

Create `src/lib/cube-render/arrows.ts`:

```ts
import { permuteSlots } from './engine';
import { planSlotCenter } from './layout-plan';

export interface Arrow {
  from: [number, number];
  to: [number, number];
  double: boolean;
}

// Last-layer U-face slots: corners and edges permute within their own group.
const CORNER_SLOTS = [0, 2, 8, 6];
const EDGE_SLOTS = [1, 5, 7, 3];

/** Permutation arrows for a PLL case, in plan-view viewBox coords (0..100).
 *  Only meaningful for the plan view of a last-layer (orientation-preserving) case. */
export function computePllArrows(alg: string): Arrow[] {
  const origin = permuteSlots(alg); // origin[d] = slot whose sticker now sits at d
  const dest = new Array<number>(54); // dest[s] = where slot s's sticker went
  origin.forEach((src, d) => {
    dest[src] = d;
  });
  return [...cyclesToArrows(CORNER_SLOTS, dest), ...cyclesToArrows(EDGE_SLOTS, dest)];
}

function cyclesToArrows(slots: number[], dest: number[]): Arrow[] {
  const arrows: Arrow[] = [];
  const seen = new Set<number>();
  for (const start of slots) {
    if (seen.has(start) || dest[start] === start) {
      seen.add(start);
      continue;
    }
    const cycle: number[] = [];
    let cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      cycle.push(cur);
      cur = dest[cur];
    }
    if (cycle.length === 2) {
      arrows.push({ from: planSlotCenter(cycle[0]), to: planSlotCenter(cycle[1]), double: true });
    } else {
      for (let i = 0; i < cycle.length; i++) {
        const a = cycle[i];
        const b = cycle[(i + 1) % cycle.length];
        arrows.push({ from: planSlotCenter(a), to: planSlotCenter(b), double: false });
      }
    }
  }
  return arrows;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/cube-render/arrows.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube-render/arrows.ts src/lib/cube-render/arrows.test.ts
git commit -m "feat(cube-render): compute PLL permutation arrows"
```

---

### Task 4: `svg.ts` — SVG string serializer

**Files:**
- Create: `src/lib/cube-render/svg.ts`
- Test: `src/lib/cube-render/svg.test.ts`

**Background:** This mirrors what the React `CubeImage` (`src/components/cube-image.tsx`) draws — `planLayout` → `<rect>` (21 cells: 9 U + 4×3 petals), `cube3dLayout` → `<polygon>` (27 quads) — but emits a plain string for the Worker. Arrows are appended only for `view === 'plan'` and `arrows === 'pll'`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/cube-render/svg.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { renderCubeSvg } from './svg';

const T_PERM = "R U R' U' R' F R2 U' R' U' R U R' F'";
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('renderCubeSvg', () => {
  it('plan view → well-formed svg with 21 rects', () => {
    const svg = renderCubeSvg({ alg: '', view: 'plan', stage: 'full' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.includes('xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(count(svg, /<rect/g)).toBe(21);
  });

  it('3D view (default) → 27 polygons, no rects', () => {
    const svg = renderCubeSvg({ alg: '' });
    expect(count(svg, /<polygon/g)).toBe(27);
    expect(count(svg, /<rect/g)).toBe(0);
  });

  it('size is reflected in width/height', () => {
    const svg = renderCubeSvg({ alg: '', size: 512 });
    expect(svg.includes('width="512"')).toBe(true);
    expect(svg.includes('height="512"')).toBe(true);
  });

  it('arrows=pll on plan view → a marker and one line per arrow', () => {
    const svg = renderCubeSvg({ alg: T_PERM, view: 'plan', stage: 'll', arrows: 'pll' });
    expect(svg.includes('<marker')).toBe(true);
    expect(count(svg, /<line/g)).toBe(2); // T-perm: corner + edge 2-cycle
  });

  it('arrows ignored for 3D view', () => {
    const svg = renderCubeSvg({ alg: T_PERM, arrows: 'pll' });
    expect(svg.includes('<line')).toBe(false);
    expect(svg.includes('<marker')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/cube-render/svg.test.ts`
Expected: FAIL — cannot resolve `./svg`.

- [ ] **Step 3: Implement `svg.ts`**

Create `src/lib/cube-render/svg.ts`:

```ts
import { applyCase } from './engine';
import { maskedColors } from './stages';
import { planLayout, PLAN_VIEWBOX } from './layout-plan';
import { cube3dLayout, CUBE3D_VIEWBOX } from './layout-3d';
import { computePllArrows, type Arrow } from './arrows';

export interface RenderOptions {
  alg: string;
  view?: 'plan' | 'trans';
  stage?: string;
  size?: number;
  arrows?: 'pll';
}

const STROKE = '#222';
const ARROW_COLOR = '#111';

/** Render a cube case to a complete, self-contained SVG string (no fonts/text). */
export function renderCubeSvg(opts: RenderOptions): string {
  const { alg, view, stage, size = 200, arrows } = opts;
  const colors = maskedColors(applyCase(alg), stage);
  const isPlan = view === 'plan';
  const viewBox = isPlan ? PLAN_VIEWBOX : CUBE3D_VIEWBOX;
  const body = isPlan ? planBody(colors) : cube3dBody(colors);
  const overlay = isPlan && arrows === 'pll' ? arrowsSvg(computePllArrows(alg)) : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${viewBox} ${viewBox}">${body}${overlay}</svg>`
  );
}

function planBody(colors: string[]): string {
  return planLayout(colors)
    .map(
      (c) =>
        `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="1" ` +
        `fill="${c.fill}" stroke="${STROKE}" stroke-width="0.6"/>`,
    )
    .join('');
}

function cube3dBody(colors: string[]): string {
  return cube3dLayout(colors)
    .map(
      (q) =>
        `<polygon points="${q.points.map(([x, y]) => `${x},${y}`).join(' ')}" ` +
        `fill="${q.fill}" stroke="${STROKE}" stroke-width="0.6" stroke-linejoin="round"/>`,
    )
    .join('');
}

function arrowsSvg(arrows: Arrow[]): string {
  if (arrows.length === 0) return '';
  const defs =
    `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" ` +
    `markerWidth="6" markerHeight="6" orient="auto-start-reverse">` +
    `<path d="M0,0 L10,5 L0,10 z" fill="${ARROW_COLOR}"/></marker></defs>`;
  const lines = arrows
    .map((a) => {
      const markerStart = a.double ? ' marker-start="url(#ah)"' : '';
      return (
        `<line x1="${a.from[0]}" y1="${a.from[1]}" x2="${a.to[0]}" y2="${a.to[1]}" ` +
        `stroke="${ARROW_COLOR}" stroke-width="2" marker-end="url(#ah)"${markerStart}/>`
      );
    })
    .join('');
  return defs + lines;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/cube-render/svg.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/cube-render/svg.ts src/lib/cube-render/svg.test.ts
git commit -m "feat(cube-render): add renderCubeSvg string serializer"
```

---

### Task 5: Export new symbols from the barrel

**Files:**
- Modify: `src/lib/cube-render/index.ts`

- [ ] **Step 1: Add exports**

Replace the contents of `src/lib/cube-render/index.ts` with:

```ts
export { applyCase, applyAlg, permuteSlots, SOLVED } from './engine';
export { maskedColors } from './stages';
export { planLayout, planSlotCenter, PLAN_VIEWBOX, type Cell } from './layout-plan';
export { cube3dLayout, CUBE3D_VIEWBOX, type Quad } from './layout-3d';
export { renderCubeSvg, type RenderOptions } from './svg';
export { computePllArrows, type Arrow } from './arrows';
export { SCHEME, GRAY } from './scheme';
```

- [ ] **Step 2: Verify the whole suite and the app build are green**

Run: `pnpm test`
Expected: PASS (all cube-render tests).

Run: `pnpm build`
Expected: `tsc -b` succeeds and `vite build` completes — confirms the new exports don't break the app's type-check (the app build only includes `src`, so the worker is untouched).

- [ ] **Step 3: Commit**

```bash
git add src/lib/cube-render/index.ts
git commit -m "feat(cube-render): export renderCubeSvg, computePllArrows, planSlotCenter"
```

---

### Task 6: Worker param parser (pure, unit-tested)

**Files:**
- Create: `worker/params.ts`
- Test: `worker/params.test.ts`

**Background:** This is the visualcube-compatible URL contract. Keeping it in a separate file with **no** `@resvg/resvg-wasm` import means vitest (node/jsdom, no wasm) can exercise all the validation/clamping/default logic. It imports only the `RenderOptions` *type* from the render lib.

- [ ] **Step 1: Write the failing test**

Create `worker/params.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseRenderRequest } from './params';

const parse = (qs: string) => parseRenderRequest(new URL('https://cube.example.workers.dev/?' + qs));

describe('parseRenderRequest', () => {
  it('defaults: empty case, 3D view, full stage, png, size 200, no arrows', () => {
    const { options, fmt } = parseRenderRequest(new URL('https://cube.example.workers.dev/'));
    expect(options.alg).toBe('');
    expect(options.view).toBe('trans');
    expect(options.stage).toBe('full');
    expect(options.size).toBe(200);
    expect(options.arrows).toBeUndefined();
    expect(fmt).toBe('png');
  });

  it('reads case; falls back to alg alias; case wins when both present', () => {
    expect(parse("case=R%20U%20R'").options.alg).toBe("R U R'");
    expect(parse('alg=U2').options.alg).toBe('U2');
    expect(parse('case=A&alg=B').options.alg).toBe('A');
  });

  it('clamps size to 32..1024 and falls back to 200 on garbage', () => {
    expect(parse('size=10').options.size).toBe(32);
    expect(parse('size=5000').options.size).toBe(1024);
    expect(parse('size=abc').options.size).toBe(200);
  });

  it('view=plan → plan, anything else → trans (3D)', () => {
    expect(parse('view=plan').options.view).toBe('plan');
    expect(parse('view=whatever').options.view).toBe('trans');
  });

  it('arrows=pll honored only on the plan view', () => {
    expect(parse('view=plan&arrows=pll').options.arrows).toBe('pll');
    expect(parse('arrows=pll').options.arrows).toBeUndefined(); // 3D
    expect(parse('view=plan&arrows=foo').options.arrows).toBeUndefined();
  });

  it('fmt=svg recognized, otherwise png', () => {
    expect(parse('fmt=svg').fmt).toBe('svg');
    expect(parse('fmt=png').fmt).toBe('png');
    expect(parse('fmt=bogus').fmt).toBe('png');
  });

  it('passes stage through unchanged (downstream maps unknown → full)', () => {
    expect(parse('stage=oll').options.stage).toBe('oll');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run worker/params.test.ts`
Expected: FAIL — cannot resolve `./params`.

- [ ] **Step 3: Implement `params.ts`**

Create `worker/params.ts`:

```ts
import type { RenderOptions } from '../src/lib/cube-render/svg';

export interface ParsedRequest {
  options: RenderOptions;
  fmt: 'png' | 'svg';
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Parse a visualcube-compatible request URL into render options + output format.
 *  Invalid input degrades to defaults; this never throws. */
export function parseRenderRequest(url: URL): ParsedRequest {
  const p = url.searchParams;
  const alg = p.get('case') ?? p.get('alg') ?? '';
  const stage = p.get('stage') ?? 'full';
  const view: RenderOptions['view'] = p.get('view') === 'plan' ? 'plan' : 'trans';
  const sizeRaw = parseInt(p.get('size') ?? '', 10);
  const size = clamp(Number.isNaN(sizeRaw) ? 200 : sizeRaw, 32, 1024);
  const arrows: RenderOptions['arrows'] =
    view === 'plan' && p.get('arrows') === 'pll' ? 'pll' : undefined;
  const fmt: 'png' | 'svg' = p.get('fmt') === 'svg' ? 'svg' : 'png';
  return { options: { alg, stage, view, size, arrows }, fmt };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run worker/params.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add worker/params.ts worker/params.test.ts
git commit -m "feat(worker): visualcube-compatible URL param parser"
```

---

### Task 7: Worker fetch handler + Wrangler config

**Files:**
- Create: `worker/index.ts`
- Create: `worker/wasm.d.ts`
- Create: `worker/wrangler.toml`
- Modify: `package.json` (add dev dependencies)

**Background:** No automated test here — `@resvg/resvg-wasm` needs the wasm binary bundled by Wrangler, which vitest's node environment doesn't provide. The handler is exercised via a `wrangler dev` smoke check in Task 8. The risky behavior (param parsing) is already covered by Task 6.

- [ ] **Step 1: Add the toolchain dependencies**

Run:
```bash
pnpm add -D @resvg/resvg-wasm wrangler
```
Expected: both appear under `devDependencies` in `package.json`; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Add the wasm module type declaration**

Create `worker/wasm.d.ts`:

```ts
declare module '*.wasm' {
  const mod: WebAssembly.Module;
  export default mod;
}
```

- [ ] **Step 3: Write the fetch handler**

Create `worker/index.ts`:

```ts
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import { renderCubeSvg } from '../src/lib/cube-render/svg';
import { parseRenderRequest } from './params';

// Initialize the wasm module once per isolate.
let wasmReady: Promise<unknown> | null = null;
function ensureWasm(): Promise<unknown> {
  if (!wasmReady) wasmReady = initWasm(resvgWasm);
  return wasmReady;
}

const CACHE = 'public, max-age=31536000, immutable';

export default {
  async fetch(request: Request): Promise<Response> {
    const { options, fmt } = parseRenderRequest(new URL(request.url));
    const svg = renderCubeSvg(options);

    if (fmt === 'svg') {
      return new Response(svg, {
        headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': CACHE },
      });
    }

    await ensureWasm();
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: options.size ?? 200 } });
    const png = resvg.render().asPng();
    return new Response(png, {
      headers: { 'content-type': 'image/png', 'cache-control': CACHE },
    });
  },
};
```

- [ ] **Step 4: Write the Wrangler config**

Create `worker/wrangler.toml`:

```toml
name = "cube"
main = "index.ts"
compatibility_date = "2026-06-01"

# Bundle imported .wasm files as WebAssembly modules.
[[rules]]
type = "CompiledWasm"
globs = ["**/*.wasm"]
fallthrough = true
```

- [ ] **Step 5: Verify it bundles and check the Free-plan size budget**

Run (from the repo root):
```bash
pnpm exec wrangler deploy --config worker/wrangler.toml --dry-run --outdir worker/.dryrun
```
Expected: bundles with no errors and prints `Total Upload: … / gzip: … KiB`. Confirm the **gzip** figure is under **1024 KiB** (Workers Free limit). resvg-wasm is known to fit on Free (e.g. `workers-og`); if it somehow exceeds, note it for Task 8 (the $5 paid plan removes the limit). Clean up: `rm -rf worker/.dryrun`.

> If `--config` path resolution complains, `cd worker && pnpm exec wrangler deploy --dry-run --outdir .dryrun` from inside `worker/` is equivalent.

- [ ] **Step 6: Confirm the app build is still unaffected**

Run: `pnpm build`
Expected: PASS — `tsc -b` only compiles `src` (per `tsconfig.app.json` `include: ["src"]`), so the new `worker/` files don't enter the Pages build.

- [ ] **Step 7: Commit**

```bash
git add worker/index.ts worker/wasm.d.ts worker/wrangler.toml package.json pnpm-lock.yaml
git commit -m "feat(worker): cloudflare worker rasterizing cube SVGs to PNG"
```

---

### Task 8: Deploy + smoke verification (manual, user-run)

**Files:** none (operational task). Cloudflare login is interactive, so these commands are run by the user.

- [ ] **Step 1: Local smoke test with `wrangler dev`**

From `worker/`, start a local dev server:
```bash
cd worker && pnpm exec wrangler dev
```
In another terminal, verify each output type:
```bash
# PNG magic bytes (\x89PNG) on a plan-view OLL preview:
curl -s "http://localhost:8787/?fmt=png&size=200&view=plan&stage=oll&case=R%20U%20R'%20U'" | head -c 4 | xxd
# Expected first bytes: 89 50 4e 47  (\x89PNG)

# Content types:
curl -sI "http://localhost:8787/?fmt=png&view=plan&case=R%20U%20R'" | grep -i content-type
# Expected: content-type: image/png
curl -sI "http://localhost:8787/?fmt=svg&view=plan&case=R%20U%20R'" | grep -i content-type
# Expected: content-type: image/svg+xml; charset=utf-8

# PLL arrows present in SVG output for a T-perm:
curl -s "http://localhost:8787/?fmt=svg&view=plan&stage=ll&arrows=pll&case=R%20U%20R'%20U'%20R'%20F%20R2%20U'%20R'%20U'%20R%20U%20R'%20F'" | grep -c "<line"
# Expected: 2
```
Expected: all assertions hold. Stop the dev server (Ctrl-C).

- [ ] **Step 2: Visually validate arrow direction**

Open the T-perm and a Ua-perm SVG (from Step 1's `fmt=svg` URLs, swapping the `case=`) in a browser. Compare the arrow directions against a known speedsolving PLL reference (T-perm = adjacent corner swap + adjacent edge swap; Ua = a 3-cycle of edges). The arrows follow the alg's forward permutation; if a direction looks reversed versus the reference, that is expected to be a global convention choice — confirm it reads correctly for at least the T-perm and one U-perm before deploying.

- [ ] **Step 3: Authenticate and deploy**

```bash
cd worker
pnpm exec wrangler login      # opens a browser for Cloudflare OAuth
pnpm exec wrangler deploy
```
Expected: deploy prints the public URL `https://cube.<account>.workers.dev`.

- [ ] **Step 4: Verify the deployed endpoint**

```bash
curl -sI "https://cube.<account>.workers.dev/?fmt=png&size=200&view=plan&stage=oll&case=R%20U%20R'%20U'" | grep -iE 'content-type|cache-control'
# Expected: content-type: image/png  and  cache-control: public, max-age=31536000, immutable
```

- [ ] **Step 5: Migrate the sheet formulas**

In the user's Google Sheet, swap the dead `visualcube.php` domain for the Worker URL (only the domain changes; params already match):
```
OLL:  =IMAGE("https://cube.<account>.workers.dev/?fmt=png&size=200&view=plan&stage=oll&case=" & ENCODEURL(C3))
PLL:  =IMAGE("https://cube.<account>.workers.dev/?fmt=png&size=200&view=plan&stage=ll&arrows=pll&case=" & ENCODEURL(C3))
```
Expected: OLL previews and PLL arrow diagrams render in the sheet.

---

## Notes for the executor

- The app on GitHub Pages is intentionally untouched: no changes to `src/components/cube-image.tsx`, routes, or the Pages workflow.
- Out of scope per the spec: wiring arrows into the in-app trainer, arrows for 3D/OLL, a custom domain, and any server-side fonts (the SVG has no text nodes).
- If `wrangler dev`/`deploy` reports a wasm import error, double-check the `[[rules]]` `CompiledWasm` glob in `wrangler.toml` and that the import is `@resvg/resvg-wasm/index_bg.wasm`.
