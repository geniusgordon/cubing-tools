# OLL Trainer — Design

**Date:** 2026-06-16
**Status:** Approved, pending implementation plan

## Goal

Add an OLL recognition trainer modeled on the existing COLL trainer, but using a
**free-recall flashcard** interaction instead of multiple choice (57 OLL cases do
not fit a flat multiple-choice UI).

The user is shown an OLL case (yellow orientation pattern on top), recalls the
algorithm mentally, reveals the answer, and self-grades. A spaced-repetition
weighting surfaces missed cases more often. A category dropdown filters which
cases are drilled.

## Key decisions

- **Interaction:** free-recall flashcard — show cube → reveal name/number + alg →
  self-grade (Missed / Got it). Not multiple choice.
- **Case selection:** a category dropdown (default "All", plus standard OLL shape
  groups). No per-case picker in v1.
- **No color-neutrality selector.** OLL recognition is shape-based (yellow vs
  not-yellow), so it is color- and rotation-invariant. The existing `cnRotation`
  (x/z rotations) would tilt yellow off the top face and break the `'oll'` render
  stage, so CN is forced off. AUF / y-rotation are still randomized so each case
  appears from a random angle.
- **Architecture:** extract the shared spaced-repetition logic into a
  `useDeficiencyDeck` hook; build a new `OllTrainer` on top. `RecognitionTrainer`
  is refactored to consume the same hook (behavior unchanged).

## Components

### 1. Data — `src/data/oll.ts`

A full 57-case dataset. Each case:

```ts
interface OllCase {
  number: number;   // 1–57, standard OLL numbering
  name: string;     // common name, e.g. "Sune", "Anti-Sune", "Headlights"
  alg: string;      // standard alg; applied to solved → produces this OLL state
  category: string; // standard shape group (see below)
}
```

- `alg` applied to a solved cube produces the OLL state that the `'oll'` render
  stage displays as the yellow pattern. **Main correctness risk:** a wrong alg
  renders a wrong case. The implementation plan must include verifying each
  rendered case against a reference OLL chart.
- `category` values: the standard OLL shape groups — Dot, Cross / All-Edges
  (OCLL), Line, T, Square, C, W, P, Fish/Knight, L / Awkward, Lightning (exact
  taxonomy finalized during implementation against a canonical source). Exported
  alongside an `ollCategories` list used to build the dropdown ("All" + groups).

### 2. Hook — `src/hooks/use-deficiency-deck.ts`

Extract the spaced-repetition logic currently inlined in `RecognitionTrainer`:

- Holds the `localStorage` deficiency map (via `useLocalStorage`).
- Picks the next case via `randomChoice` weighted by per-case deficiency, drawing
  only from the currently-enabled set of case names.
- Exposes `recordResult(name, correct)` → multiplies deficiency by `(1 − γ)` on
  correct, `(1 + γ)` on wrong.
- Tolerates a stale persisted map missing keys (fall back to default deficiency),
  matching current `RecognitionTrainer` behavior.

`RecognitionTrainer` is refactored to consume this hook with no behavior change.

### 3. Component — `src/routes/oll/index.tsx` (route `/trainers/oll`)

- Category dropdown (`native-select`) filters the deck (default "All").
- `CubeImage` with `stage="oll"`, generated from the picked case with random
  AUF / y-rotation, non-CN forced.
- **Hidden state:** cube + "press Space / click to reveal" hint.
- **Revealed state:** OLL number + name + algorithm, plus Missed / Got it actions.
- Keyboard: `Space` reveals when hidden; when revealed, grade keys (and the
  buttons) call `recordResult` and advance to the next case. Clicking the cube
  advances.
- No CN selector, no session-history panel in v1 (deficiency weighting is the
  only persistence, same as COLL).

### 4. Wiring

- `src/App.tsx`: add route `/trainers/oll` → `OllTrainer`.
- `src/routes/home.tsx`: add an "OLL Trainer" card with `stage="oll"` and a sample
  alg for the thumbnail.

## Data flow

```
category select
  → useDeficiencyDeck (filtered deck)
  → weighted pick
  → generateCase (non-CN, random AUF)
  → caseToString
  → CubeImage stage="oll"
reveal → self-grade → recordResult → deficiency map (localStorage) → next pick
```

## Testing

- Unit-test `useDeficiencyDeck`: weighting behavior and localStorage persistence.
- Data integrity test: 57 unique OLL cases, each with a valid category; categories
  match the exported `ollCategories` list.
- Extend the existing routes smoke test to cover `/trainers/oll`.
- Render verification (manual or scripted) of each OLL alg against a reference
  chart during implementation.

## Out of scope (v1)

- Per-case selection picker (only category filter).
- Session history / timing stats.
- Color-neutrality training for OLL.
- An on-screen OLL reference chart.
