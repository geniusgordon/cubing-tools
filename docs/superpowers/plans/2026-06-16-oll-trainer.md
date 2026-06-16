# OLL Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a free-recall OLL flashcard trainer (show case → reveal name/number + alg → self-grade), with a category filter and spaced-repetition weighting.

**Architecture:** Extract the spaced-repetition logic from `RecognitionTrainer` into a generic `useDeficiencyDeck<T>` hook (storing the existing `Record<string, FlashCard<T>>` shape, so COLL/PLL keep their localStorage data unchanged). Build a new `OllTrainer` route on top of the hook. A new `src/data/oll.ts` dataset holds all 57 cases, guarded by automated validity + distinctness tests.

**Tech Stack:** React 19, react-router 7, TypeScript, Vitest + @testing-library/react, Tailwind, existing self-hosted cube SVG renderer (`@/lib/cube-render`).

---

## Background: how the existing renderer/trainer work

Read these before starting — the plan relies on their exact behavior:

- `src/lib/cube-render/engine.ts` — `applyCase(alg)` returns the facelet array for the state that `alg` *solves* (this is what `CubeImage` renders). `SOLVED` is the solved facelet array. `applyAlg(facelets, alg)` applies moves. Facelet index layout (faces in order U,R,F,D,L,B, each 9 facelets row-major): `U=0-8, R=9-17, F=18-26, D=27-35, L=36-44, B=45-53`.
- `src/lib/cube-render/stages.ts` — already has a `'oll'` stage: shows the last-layer region and grays every facelet whose color isn't `U` (yellow). This is exactly the OLL orientation view. **No change needed here.**
- `src/components/cube-image.tsx` — `<CubeImage alg={...} stage="oll" view="plan" size={...} />`. `view="plan"` gives the flat top-down chart used by COLL.
- `src/routes/recognition-trainer.tsx` — current spaced-repetition trainer (multiple choice). Holds a `Record<string, FlashCard<AlgWithAuf>>` in `useLocalStorage`, picks via `randomChoice` weighted by `deficiency`, and on each guess multiplies `deficiency` by `(1 − gamma)` (correct) or `(1 + gamma)` (wrong). We will extract this into a hook.
- `src/lib/cube.ts` — `generateCase(alg, {cn, preAuf?})` builds a `TestCase` with random AUF/y-rotation; `caseToString(case)` serializes it to a scramble string for `CubeImage`. `randomChoice(choices, weights)`.
- `src/data/types.ts` — `Alg { name, alg }`, `FlashCard<T> { data: T; deficiency: number }`, `ColorNeutrality` enum, `TestCase`.

---

## Task 1: OLL dataset

**Files:**
- Create: `src/data/oll.ts`
- Test: `src/data/oll.test.ts`

The dataset below is a best-effort transcription of standard algorithms. It is the **starting point** — Tasks 2 and 3 add automated gates that prove each alg is a valid, distinct OLL, and Task 1's manual step checks labels against a reference chart. Fix any flagged row against a single canonical source: **algdb.net/oll** (use the first listed algorithm per case).

- [ ] **Step 1: Write the data-integrity test (failing)**

Create `src/data/oll.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ollCases, ollCategories } from './oll';

describe('oll dataset', () => {
  it('has all 57 cases with unique numbers 1..57', () => {
    expect(ollCases).toHaveLength(57);
    const numbers = ollCases.map((c) => c.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 57 }, (_, i) => i + 1));
  });

  it('has unique case names', () => {
    const names = new Set(ollCases.map((c) => c.name));
    expect(names.size).toBe(57);
  });

  it('assigns every case a category from ollCategories', () => {
    for (const c of ollCases) {
      expect(ollCategories).toContain(c.category);
    }
  });

  it('uses every declared category at least once', () => {
    const used = new Set(ollCases.map((c) => c.category));
    for (const cat of ollCategories) {
      expect(used).toContain(cat);
    }
  });

  it('has a non-empty alg for every case', () => {
    for (const c of ollCases) {
      expect(c.alg.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- src/data/oll.test.ts`
Expected: FAIL (cannot import `./oll`).

- [ ] **Step 3: Create the dataset**

Create `src/data/oll.ts`:

```ts
export interface OllCase {
  number: number; // 1..57, standard OLL numbering
  name: string;
  alg: string; // applied to a solved cube via applyCase() -> this OLL state
  category: OllCategory;
}

export type OllCategory =
  | 'Dot'
  | 'Square'
  | 'Lightning'
  | 'Fish'
  | 'Knight'
  | 'OCLL'
  | 'Awkward'
  | 'P'
  | 'T'
  | 'C'
  | 'W'
  | 'L'
  | 'Line'
  | 'Special';

export const ollCategories: OllCategory[] = [
  'Dot', 'Square', 'Lightning', 'Fish', 'Knight', 'OCLL',
  'Awkward', 'P', 'T', 'C', 'W', 'L', 'Line', 'Special',
];

export const ollCases: OllCase[] = [
  { number: 1, name: 'Dot 1', category: 'Dot', alg: "R U2 R2 F R F' U2 R' F R F'" },
  { number: 2, name: 'Dot 2', category: 'Dot', alg: "F R U R' U' F' f R U R' U' f'" },
  { number: 3, name: 'Dot 3', category: 'Dot', alg: "f R U R' U' f' U' F R U R' U' F'" },
  { number: 4, name: 'Dot 4', category: 'Dot', alg: "f R U R' U' f' U F R U R' U' F'" },
  { number: 5, name: 'Square 5', category: 'Square', alg: "r' U2 R U R' U r" },
  { number: 6, name: 'Square 6', category: 'Square', alg: "r U2 R' U' R U' r'" },
  { number: 7, name: 'Lightning 7', category: 'Lightning', alg: "r U R' U R U2 r'" },
  { number: 8, name: 'Lightning 8', category: 'Lightning', alg: "r' U' R U' R' U2 r" },
  { number: 9, name: 'Fish 9', category: 'Fish', alg: "R U R' U' R' F R2 U R' U' F'" },
  { number: 10, name: 'Fish 10', category: 'Fish', alg: "R U R' U R' F R F' R U2 R'" },
  { number: 11, name: 'Lightning 11', category: 'Lightning', alg: "r U R' U R' F R F' R U2 r'" },
  { number: 12, name: 'Lightning 12', category: 'Lightning', alg: "M' R' U' R U' R' U2 R U' M" },
  { number: 13, name: 'Knight 13', category: 'Knight', alg: "F U R U' R2 F' R U R U' R'" },
  { number: 14, name: 'Knight 14', category: 'Knight', alg: "R' F R U R' F' R F U' F'" },
  { number: 15, name: 'Knight 15', category: 'Knight', alg: "r' U' r R' U' R U r' U r" },
  { number: 16, name: 'Knight 16', category: 'Knight', alg: "r U r' R U R' U' r U' r'" },
  { number: 17, name: 'Dot 17', category: 'Dot', alg: "R U R' U R' F R F' U2 R' F R F'" },
  { number: 18, name: 'Dot 18', category: 'Dot', alg: "r U R' U R U2 r' r' U' R U' R' U2 r" },
  { number: 19, name: 'Dot 19', category: 'Dot', alg: "M U R U R' U' M' R' F R F'" },
  { number: 20, name: 'Dot 20', category: 'Dot', alg: "r U R' U' M2 U R U' R' U' M'" },
  { number: 21, name: 'Double Sune', category: 'OCLL', alg: "R U2 R' U' R U R' U' R U' R'" },
  { number: 22, name: 'Pi', category: 'OCLL', alg: "R U2 R2 U' R2 U' R2 U2 R" },
  { number: 23, name: 'Headlights', category: 'OCLL', alg: "R2 D R' U2 R D' R' U2 R'" },
  { number: 24, name: 'Chameleon', category: 'OCLL', alg: "r U R' U' r' F R F'" },
  { number: 25, name: 'Bowtie', category: 'OCLL', alg: "F' r U R' U' r' F R" },
  { number: 26, name: 'Anti-Sune', category: 'OCLL', alg: "R U2 R' U' R U' R'" },
  { number: 27, name: 'Sune', category: 'OCLL', alg: "R U R' U R U2 R'" },
  { number: 28, name: 'Special 28', category: 'Special', alg: "r U R' U' M U R U' R'" },
  { number: 29, name: 'Awkward 29', category: 'Awkward', alg: "R U R' U' R U' R' F' U' F R U R'" },
  { number: 30, name: 'Awkward 30', category: 'Awkward', alg: "F R' F R2 U' R' U' R U R' F2" },
  { number: 31, name: 'P 31', category: 'P', alg: "R' U' F U R U' R' F' R" },
  { number: 32, name: 'P 32', category: 'P', alg: "R U B' U' R' U R B R'" },
  { number: 33, name: 'T 33', category: 'T', alg: "R U R' U' R' F R F'" },
  { number: 34, name: 'C 34', category: 'C', alg: "R U R' U' B' R' F R F' B" },
  { number: 35, name: 'Fish 35', category: 'Fish', alg: "R U2 R2 F R F' R U2 R'" },
  { number: 36, name: 'W 36', category: 'W', alg: "L' U' L U' L' U L U L F' L' F" },
  { number: 37, name: 'Fish 37', category: 'Fish', alg: "F R' F' R U R U' R'" },
  { number: 38, name: 'W 38', category: 'W', alg: "R U R' U R U' R' U' R' F R F'" },
  { number: 39, name: 'Lightning 39', category: 'Lightning', alg: "L F' L' U' L U F U' L'" },
  { number: 40, name: 'Lightning 40', category: 'Lightning', alg: "R' F R U R' U' F' U R" },
  { number: 41, name: 'Awkward 41', category: 'Awkward', alg: "R U R' U R U2 R' F R U R' U' F'" },
  { number: 42, name: 'Awkward 42', category: 'Awkward', alg: "R' U' R U' R' U2 R F R U R' U' F'" },
  { number: 43, name: 'P 43', category: 'P', alg: "R' U' F' U F R" },
  { number: 44, name: 'P 44', category: 'P', alg: "F U R U' R' F'" },
  { number: 45, name: 'T 45', category: 'T', alg: "F R U R' U' F'" },
  { number: 46, name: 'C 46', category: 'C', alg: "R' U' R' F R F' U R" },
  { number: 47, name: 'L 47', category: 'L', alg: "R' U' R' F R F' R' F R F' U R" },
  { number: 48, name: 'L 48', category: 'L', alg: "F R U R' U' R U R' U' F'" },
  { number: 49, name: 'L 49', category: 'L', alg: "R B' R2 F R2 B R2 F' R" },
  { number: 50, name: 'L 50', category: 'L', alg: "R' F R2 B' R2 F' R2 B R'" },
  { number: 51, name: 'Line 51', category: 'Line', alg: "F U R U' R' U R U' R' F'" },
  { number: 52, name: 'Line 52', category: 'Line', alg: "R U R' U R d' R U' R' F'" },
  { number: 53, name: 'L 53', category: 'L', alg: "r' U2 R U R' U' R U R' U r" },
  { number: 54, name: 'L 54', category: 'L', alg: "r U2 R' U' R U R' U' R U' r'" },
  { number: 55, name: 'Line 55', category: 'Line', alg: "R U2 R2 U' R U' R' U2 F R F'" },
  { number: 56, name: 'Line 56', category: 'Line', alg: "r' U' r U' R' U R U' R' U R r' U r" },
  { number: 57, name: 'Special 57', category: 'Special', alg: "R U R' U' M' U R U' r'" },
];
```

- [ ] **Step 4: Run the integrity test to verify it passes**

Run: `pnpm test -- src/data/oll.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/oll.ts src/data/oll.test.ts
git commit -m "feat(data): add 57-case OLL dataset with categories"
```

---

## Task 2: OLL validity verifier (catches wrong algs)

A genuine OLL case = F2L solved + last-layer permutation solved + only orientation varies. This test proves both invariants for every alg, independent of any external source. It catches typos that disturb F2L or mis-permute the last layer.

**Files:**
- Test: `src/data/oll-validity.test.ts`

- [ ] **Step 1: Write the validity test (failing if any alg is wrong)**

Create `src/data/oll-validity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyCase, SOLVED } from '@/lib/cube-render';
import { ollCases } from './oll';

// Facelet index layout: U=0-8, R=9-17, F=18-26, D=27-35, L=36-44, B=45-53.
const U_FACE = [0, 1, 2, 3, 4, 5, 6, 7, 8];
// Top row of each side face (the non-U stickers of last-layer pieces).
const SIDE_TOPS = [9, 10, 11, 18, 19, 20, 45, 46, 47, 36, 37, 38];
const LL = new Set([...U_FACE, ...SIDE_TOPS]);
// Each side-top index -> the face color that index must be (or 'U' if twisted).
const SIDE_TOP_HOME: Record<number, string> = {
  9: 'R', 10: 'R', 11: 'R',
  18: 'F', 19: 'F', 20: 'F',
  45: 'B', 46: 'B', 47: 'B',
  36: 'L', 37: 'L', 38: 'L',
};

describe('oll algs are valid OLL cases', () => {
  for (const c of ollCases) {
    it(`OLL ${c.number} (${c.name}) keeps F2L solved`, () => {
      const state = applyCase(c.alg);
      for (let i = 0; i < 54; i++) {
        if (LL.has(i)) continue;
        expect(state[i], `facelet ${i}`).toBe(SOLVED[i]);
      }
    });

    it(`OLL ${c.number} (${c.name}) keeps last-layer permutation solved`, () => {
      const state = applyCase(c.alg);
      for (const [idx, home] of Object.entries(SIDE_TOP_HOME)) {
        const color = state[Number(idx)];
        expect([home, 'U'], `facelet ${idx} = ${color}`).toContain(color);
      }
    });
  }
});
```

- [ ] **Step 2: Run the validity test**

Run: `pnpm test -- src/data/oll-validity.test.ts`
Expected: PASS for all 57. If any case FAILS, the listed alg is wrong — replace it with the first algorithm for that OLL number from **algdb.net/oll**, then re-run until green. Do not weaken the test.

- [ ] **Step 3: Commit**

```bash
git add src/data/oll-validity.test.ts src/data/oll.ts
git commit -m "test(data): verify every OLL alg is a valid OLL case"
```

---

## Task 3: OLL coverage/distinctness verifier

Proves all 57 algs are genuinely different OLL cases (no duplicates, full coverage) by comparing AUF-normalized yellow-orientation signatures.

**Files:**
- Test: `src/data/oll-distinct.test.ts`

- [ ] **Step 1: Write the distinctness test**

Create `src/data/oll-distinct.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyCase, applyAlg } from '@/lib/cube-render';
import { ollCases } from './oll';

// Last-layer facelets, fixed order: U face then each side's top row.
const LL_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18, 19, 20, 45, 46, 47, 36, 37, 38];

// Yellow (== 'U') pattern over LL, normalized over the 4 AUF rotations.
function signature(alg: string): string {
  const base = applyCase(alg);
  let best: string | null = null;
  let rotated = base;
  for (let k = 0; k < 4; k++) {
    const bits = LL_INDICES.map((i) => (rotated[i] === 'U' ? '1' : '0')).join('');
    if (best === null || bits < best) best = bits;
    rotated = applyAlg(rotated, 'U');
  }
  return best as string;
}

describe('oll cases are all distinct', () => {
  it('produces 57 unique AUF-normalized orientation signatures', () => {
    const sigs = new Set(ollCases.map((c) => signature(c.alg)));
    expect(sigs.size).toBe(57);
  });
});
```

- [ ] **Step 2: Run the distinctness test**

Run: `pnpm test -- src/data/oll-distinct.test.ts`
Expected: PASS. If `sigs.size < 57`, two algs render the same OLL — at least one number is mislabeled. Cross-check the duplicates against algdb.net/oll and fix.

- [ ] **Step 3: Manual label spot-check**

Run the dev server (`pnpm dev`), and after Task 6 is done open `/trainers/oll`. For at least the 7 OCLL cases (21–27) plus 5 random others, reveal each and confirm the rendered yellow pattern matches the standard chart at algdb.net/oll for that number. Note: this step is rechecked at the end of Task 6; record it here as the source of truth for label correctness.

- [ ] **Step 4: Commit**

```bash
git add src/data/oll-distinct.test.ts
git commit -m "test(data): verify all 57 OLL cases are distinct"
```

---

## Task 4: `useDeficiencyDeck` hook

Generic spaced-repetition deck: owns the `localStorage` `Record<string, FlashCard<T>>` map, picks weighted by deficiency from a caller-supplied enabled set, and updates deficiency on each result. Same math as the current `RecognitionTrainer`.

**Files:**
- Create: `src/hooks/use-deficiency-deck.ts`
- Modify: `src/hooks/index.ts`
- Test: `src/hooks/use-deficiency-deck.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/use-deficiency-deck.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useDeficiencyDeck from './use-deficiency-deck';
import type { FlashCard } from '@/data/types';

afterEach(() => window.localStorage.clear());

const defaultMap: Record<string, FlashCard<{ alg: string }>> = {
  a: { data: { alg: 'Ra' }, deficiency: 1 },
  b: { data: { alg: 'Rb' }, deficiency: 1 },
};

describe('useDeficiencyDeck', () => {
  it('pick returns a name+data from the enabled set', () => {
    const { result } = renderHook(() => useDeficiencyDeck('deck-test-1', defaultMap, 0.5));
    const picked = result.current.pick(['a']);
    expect(picked).toEqual({ name: 'a', data: { alg: 'Ra' } });
  });

  it('record(correct) shrinks deficiency, record(wrong) grows it, persisted to localStorage', () => {
    const { result } = renderHook(() => useDeficiencyDeck('deck-test-2', defaultMap, 0.5));
    act(() => result.current.record('a', true)); // 1 * (1 - 0.5) = 0.5
    act(() => result.current.record('b', false)); // 1 * (1 + 0.5) = 1.5
    const stored = JSON.parse(
      window.localStorage.getItem('@cubing-tools/deck-test-2') as string,
    );
    expect(stored.a.deficiency).toBeCloseTo(0.5);
    expect(stored.b.deficiency).toBeCloseTo(1.5);
  });

  it('tolerates a stale stored map missing keys', () => {
    window.localStorage.setItem(
      '@cubing-tools/deck-test-3',
      JSON.stringify({ a: { data: { alg: 'Ra' }, deficiency: 4 } }),
    );
    const { result } = renderHook(() => useDeficiencyDeck('deck-test-3', defaultMap, 0.5));
    // 'b' is missing from storage -> falls back to default without throwing.
    expect(result.current.pick(['b'])).toEqual({ name: 'b', data: { alg: 'Rb' } });
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- src/hooks/use-deficiency-deck.test.ts`
Expected: FAIL (cannot import `./use-deficiency-deck`).

- [ ] **Step 3: Implement the hook**

Create `src/hooks/use-deficiency-deck.ts`:

```ts
import { useCallback } from 'react';
import useLocalStorage from './use-local-storage';
import { randomChoice } from '@/lib/cube';
import type { FlashCard } from '@/data/types';

export interface DeficiencyDeck<T> {
  pick(enabledNames: string[]): { name: string; data: T };
  record(name: string, correct: boolean): void;
}

export default function useDeficiencyDeck<T>(
  storageKey: string,
  defaultMap: Record<string, FlashCard<T>>,
  gamma = 0.5,
): DeficiencyDeck<T> {
  const [map, setMap] =
    useLocalStorage<Record<string, FlashCard<T>>>(storageKey, defaultMap);

  const pick = useCallback(
    (enabledNames: string[]) => {
      const names = enabledNames.length ? enabledNames : Object.keys(defaultMap);
      const weights = names.map((n) => map[n]?.deficiency ?? 1);
      const name = randomChoice(names, weights);
      // Data (alg identity) is static — always read it from defaultMap so a
      // partial/stale persisted map can never break consumers. Only the
      // deficiency weight is sourced from the stored map.
      const data = defaultMap[name].data;
      return { name, data };
    },
    [map, defaultMap],
  );

  const record = useCallback(
    (name: string, correct: boolean) => {
      const card = map[name] ?? defaultMap[name];
      if (!card) return;
      const deficiency = correct
        ? card.deficiency * (1 - gamma)
        : card.deficiency * (1 + gamma);
      setMap({ ...map, [name]: { ...card, deficiency } });
    },
    [map, defaultMap, gamma, setMap],
  );

  return { pick, record };
}
```

- [ ] **Step 4: Export it**

Add to `src/hooks/index.ts`:

```ts
export { default as useDeficiencyDeck } from './use-deficiency-deck';
export type { DeficiencyDeck } from './use-deficiency-deck';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- src/hooks/use-deficiency-deck.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-deficiency-deck.ts src/hooks/use-deficiency-deck.test.ts src/hooks/index.ts
git commit -m "feat(hooks): add useDeficiencyDeck spaced-repetition hook"
```

---

## Task 5: Refactor `RecognitionTrainer` onto the hook

Behavior- and data-preserving: same localStorage keys (`coll-recognition`, `pll-recognition`) and same `Record<string, FlashCard<AlgWithAuf>>` shape, so existing decks are untouched. The smoke tests are the guard.

**Files:**
- Modify: `src/routes/recognition-trainer.tsx`

- [ ] **Step 1: Confirm current tests pass (baseline)**

Run: `pnpm test -- src/routes/routes.smoke.test.tsx`
Expected: PASS.

- [ ] **Step 2: Replace the inline deck logic with the hook**

In `src/routes/recognition-trainer.tsx`:

Replace the `useLocalStorage` map + `cases` + `pickCaseFromFlashCards` + the deficiency math inside `takeGuess` with the hook. Concretely:

- Add import: `import { useDeficiencyDeck } from '@/hooks';` (keep other hook imports).
- Remove the `useLocalStorage<Record<string, FlashCard<AlgWithAuf>>>(...)` line and the `cases` `useMemo`.
- Add: `const deck = useDeficiencyDeck(flashCardName, defaultFlashCardMap, gamma);`
  - The hook shrinks deficiency on correct by `(1 - gammaArg)` and grows on wrong by `(1 + gammaArg)` — identical to the current component when `gammaArg = gamma`. So pass `gamma` directly (default `0.5`).
- Replace `pickCaseFromFlashCards` body with:

```ts
const pickCaseFromFlashCards = useCallback(
  (cn: ColorNeutrality) => {
    const { data } = deck.pick(Object.keys(defaultFlashCardMap));
    return generateCase(data, { cn, preAuf: data.preAuf });
  },
  [deck, defaultFlashCardMap],
);
```

- In `takeGuess`, replace the deficiency-map update with:

```ts
const takeGuess = useCallback(
  (guess: string) => {
    setCurrentGuess(guess);
    deck.record(currentCase.alg.name, checkIsCorrect(currentCase, guess));
  },
  [currentCase, deck, checkIsCorrect],
);
```

- Remove now-unused imports (`randomChoice`, `FlashCard` type if unused, `useMemo` if unused) — let the linter guide you.

- [ ] **Step 3: Run the smoke tests + lint**

Run: `pnpm test -- src/routes/routes.smoke.test.tsx && pnpm lint`
Expected: PASS, no lint errors. COLL/PLL trainers still mount and guess.

- [ ] **Step 4: Commit**

```bash
git add src/routes/recognition-trainer.tsx
git commit -m "refactor(trainer): RecognitionTrainer uses useDeficiencyDeck"
```

---

## Task 6: `OllTrainer` component + route

**Files:**
- Create: `src/routes/oll/index.tsx`
- Modify: `src/App.tsx`
- Test: `src/routes/routes.smoke.test.tsx`

- [ ] **Step 1: Add a failing smoke test for the new route**

In `src/routes/routes.smoke.test.tsx`, add an import and a test:

```ts
import OllTrainer from '@/routes/oll';
```

```ts
it('renders OLL trainer without throwing', () => {
  expect(() => renderRoute(<OllTrainer />)).not.toThrow();
});

it('renders OLL trainer with a stored deck without throwing', () => {
  window.localStorage.setItem(
    '@cubing-tools/oll-trainer',
    JSON.stringify({ '21': { data: { number: 21 }, deficiency: 2 } }),
  );
  expect(() => renderRoute(<OllTrainer />)).not.toThrow();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm test -- src/routes/routes.smoke.test.tsx`
Expected: FAIL (cannot import `@/routes/oll`).

- [ ] **Step 3: Implement the trainer**

Create `src/routes/oll/index.tsx`:

```tsx
import { useCallback, useState } from 'react';
import { AppHeader } from '@/components/app-header';
import { CubeImage } from '@/components/cube-image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { useDeficiencyDeck, useEventListener } from '@/hooks';
import { generateCase, caseToString } from '@/lib/cube';
import { ColorNeutrality, type FlashCard, type TestCase } from '@/data/types';
import { ollCases, ollCategories, type OllCase } from '@/data/oll';

const ALL = 'All';

// One deck entry per OLL case, keyed by its number (as string).
const defaultDeck: Record<string, FlashCard<OllCase>> = {};
ollCases.forEach((c) => {
  defaultDeck[String(c.number)] = { data: c, deficiency: 1 };
});

function namesForCategory(category: string): string[] {
  return ollCases
    .filter((c) => category === ALL || c.category === category)
    .map((c) => String(c.number));
}

export default function OllTrainer() {
  const deck = useDeficiencyDeck('oll-trainer', defaultDeck);
  const [category, setCategory] = useState<string>(ALL);
  const [revealed, setRevealed] = useState(false);

  const nextCase = useCallback((): { case_: TestCase; data: OllCase } => {
    const { data } = deck.pick(namesForCategory(category));
    // OLL recognition is color/orientation-based: force non-CN, random AUF.
    const case_ = generateCase(
      { name: data.name, alg: data.alg },
      { cn: ColorNeutrality.NON_CN },
    );
    return { case_, data };
  }, [deck, category]);

  const [current, setCurrent] = useState(() => nextCase());

  const advance = useCallback(() => {
    setCurrent(nextCase());
    setRevealed(false);
  }, [nextCase]);

  const grade = useCallback(
    (correct: boolean) => {
      deck.record(String(current.data.number), correct);
      advance();
    },
    [deck, current, advance],
  );

  const handleKeyup = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === ' ') {
        if (revealed) advance();
        else setRevealed(true);
        return;
      }
      if (!revealed) return;
      if (e.key === '1' || e.key.toLowerCase() === 'f') grade(false);
      if (e.key === '2' || e.key.toLowerCase() === 'j') grade(true);
    },
    [revealed, advance, grade],
  );

  useEventListener('keyup', handleKeyup);

  function handleCategoryChange(value: string) {
    setCategory(value);
    setRevealed(false);
    setCurrent(() => {
      const { data } = deck.pick(namesForCategory(value));
      const case_ = generateCase(
        { name: data.name, alg: data.alg },
        { cn: ColorNeutrality.NON_CN },
      );
      return { case_, data };
    });
  }

  return (
    <>
      <AppHeader title="OLL Trainer" showBack />
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 p-6">
        <div className="flex flex-col items-center gap-2">
          <Label htmlFor="oll-category">Category</Label>
          <NativeSelect
            id="oll-category"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <NativeSelectOption value={ALL}>All ({ollCases.length})</NativeSelectOption>
            {ollCategories.map((cat) => (
              <NativeSelectOption key={cat} value={cat}>
                {cat} ({namesForCategory(cat).length})
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <button
          type="button"
          className="cursor-pointer"
          onClick={() => (revealed ? advance() : setRevealed(true))}
          aria-label={revealed ? 'Next case' : 'Reveal answer'}
        >
          <CubeImage alg={caseToString(current.case_)} stage="oll" view="plan" size={200} />
        </button>

        {revealed ? (
          <div className="flex flex-col items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-medium">
                OLL {current.data.number} — {current.data.name}
              </div>
              <div className="font-mono text-sm text-muted-foreground">
                {current.data.alg}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => grade(false)}>
                ✗ Missed (1/F)
              </Button>
              <Button onClick={() => grade(true)}>✓ Got it (2/J)</Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Press Space or click the cube to reveal
          </p>
        )}
      </main>
    </>
  );
}
```

- [ ] **Step 4: Wire the route**

In `src/App.tsx`, add the import next to the other route imports and a route entry next to the recognition routes:

```tsx
import OllTrainer from '@/routes/oll';
```

```tsx
{ path: '/trainers/oll', element: <OllTrainer /> },
```

- [ ] **Step 5: Run the smoke tests + lint**

Run: `pnpm test -- src/routes/routes.smoke.test.tsx && pnpm lint`
Expected: PASS (including the two new OLL tests), no lint errors.

- [ ] **Step 6: Manual label check (completes Task 3 Step 3)**

Run `pnpm dev`, open `/trainers/oll`. Reveal cases and confirm the rendered yellow pattern matches algdb.net/oll for the shown number. Walk the OCLL group (21–27) and 5 random others. Fix any mismatched alg in `src/data/oll.ts` and re-run Tasks 2 and 3.

- [ ] **Step 7: Commit**

```bash
git add src/routes/oll/index.tsx src/App.tsx src/routes/routes.smoke.test.tsx
git commit -m "feat(oll): add free-recall OLL trainer route"
```

---

## Task 7: Home page card

**Files:**
- Modify: `src/routes/home.tsx`

- [ ] **Step 1: Add the OLL trainer card**

In `src/routes/home.tsx`, add an entry to the `TRAINERS` array (use a recognizable OLL alg for the thumbnail, e.g. Sune):

```tsx
{
  title: 'OLL Trainer',
  to: '/trainers/oll',
  alg: "R U R' U R U2 R'",
  view: 'plan' as const,
  stage: 'oll',
},
```

- [ ] **Step 2: Verify Home still renders**

Run: `pnpm test -- src/routes/routes.smoke.test.tsx`
Expected: PASS.

- [ ] **Step 3: Manual check**

Run `pnpm dev`, open `/`. Confirm the "OLL Trainer" card shows a yellow OLL thumbnail and links to `/trainers/oll`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/home.tsx
git commit -m "feat(home): add OLL trainer card"
```

---

## Final verification

- [ ] **Run the full suite**

Run: `pnpm test && pnpm lint && pnpm build`
Expected: all tests pass, no lint errors, build succeeds.

- [ ] **Final commit (if any cleanup remains)**

```bash
git add -A
git commit -m "chore(oll): finalize OLL trainer"
```

---

## Notes / known risks

- **Alg label correctness is not fully test-covered.** Tasks 2–3 prove every alg is a *valid, distinct* OLL, but the alg labeled "OLL N" could in principle render a different shape than the conventional N. The manual chart check (Task 3 Step 3 / Task 6 Step 6) against algdb.net/oll is the gate for this; fix any mismatch in `src/data/oll.ts`.
- **No CN, no per-case picker, no session history** in v1 — deliberate (see spec, Out of scope).
- The OLL deck uses a fresh localStorage key (`oll-trainer`); it does not touch COLL/PLL data.
