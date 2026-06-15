# Self-Hosted Cube Renderer — Design

**Status:** Approved (design); pending implementation plan.
**Date:** 2026-06-15

## Problem

The app renders cube images by hitting `https://cube.crider.co.uk/visualcube.php` (the VisualCube service), which is no longer available. Every cube image in the app is therefore broken: the four Home thumbnails (raw `<img>` tags) and all five `CubeImage` call sites (PLL/COLL recognition, COLL cards, ZBLL tiles/groups, ZBLL session history).

We will replace the external dependency with a self-hosted renderer that produces the cube SVGs client-side, preserving the existing `CubeImage` interface so nothing else in the app changes.

## Observed usage (what we must reproduce)

`CubeImage` props: `{ alg: string; size?: number; view?: 'plan' | 'trans'; stage?: string }`.

Call sites:
- `recognition-trainer.tsx`: `alg={caseToString(currentCase)} size={200}` — no view (→ 3D), no stage (full).
- `coll-card.tsx`: `size={100} view="plan" stage="coll"`.
- `zbll-case.tsx`: `size={80} view="plan"` (no stage).
- `alg-group.tsx`: `size={100} view="plan" stage={stage}` where stage ∈ {`oll`, `coll`}.
- `session-history.tsx`: `alg={selected.alg.alg} size={160}` — no view (→ 3D), no stage.
- Home thumbnails (raw `<img>`, to be migrated to `CubeImage`): stages `ll`, `coll`, `cross-x2`, and an `ll` + example ZBLL alg.

Views needed: **plan** (2D top-down) and **3D** (oblique). `view` undefined → 3D (matches old default). `view="trans"` is never used; treat as 3D.

Stages needed: `full` (none), `ll`, `oll`, `coll`, `cross`, `cross-x2`.

Move vocabulary in algs (full WCA 3×3 notation): face turns `R U F L D B`; wide moves `r u f l d b`; slices `M E S`; rotations `x y z`; modifiers `'` and `2` (including `2'` which equals `2`); parentheses and spaces to ignore. Strings may be space-less where AUF/rotation tokens are concatenated by `caseToString` (e.g. `U'y2x`).

## Key decisions

1. **`case` semantics — render the inverse.** VisualCube's `case=<alg>` renders the state that the algorithm *solves*, i.e. it applies `inverse(alg)` to a solved cube. The app passes its case strings as `case`, and the ZBLL scramble text is already `inverseAlg(alg)`. So `CubeImage`'s `alg` prop is applied as `inverse(tokens)` to a solved cube. This keeps every image identical to the old behavior and consistent with the displayed scrambles.

2. **Color scheme (CFOP last-layer convention):** U = yellow, F = red, R = green, B = orange, L = blue, D = white, masked = gray. Centralized and configurable. Exact hexes chosen to resemble the old diagrams (see `scheme.ts` in the plan).

3. **Both views built** (plan + 3D), full fidelity to the original mix.

4. **Lenient parsing:** unknown tokens skipped; unknown `stage` → `full`; unknown/`trans` `view` → 3D. A malformed alg yields a possibly-wrong but never-crashing cube.

## Architecture

Pure-logic pipeline under `src/lib/cube-render/`, consumed by a rewritten `CubeImage`. No network, no loading state; SVG computed synchronously.

```
alg string ─▶ tokenize ─▶ invert (case) ─▶ apply moves to solved facelets
                                                  │
                                  54-facelet color array
                                                  │
                          stage mask (gray out / recolor)
                                                  ▼
              view layout (plan | 3D) ─▶ [{ polygon, fill }] ─▶ <svg>
```

### Modules (each independently testable)

- **`engine.ts`** — the move engine.
  - 54-sticker facelet model: faces in order U, R, F, D, L, B, each 9 stickers row-major (indices U 0–8, R 9–17, F 18–26, D 27–35, L 36–44, B 45–53).
  - Single source of truth: six face quarter-turn permutations (`U R F D L B`, clockwise looking at the face) + three whole-cube rotation permutations (`x y z`), hand-written as permutation arrays over the 54 facelets.
  - Derived moves via standard identities (so we don't hand-write error-prone tables): `X2 = X·X`, `X' = X·X·X`; wide moves expressed as `face + rotation` (e.g. `r = x` then `L`, `u = y` then `D`, `f = z` then `B`, and the opposite-face analogues `l/d/b` with the inverse rotation); slices expressed as `rotation` sandwiched by the two faces (e.g. `M` from `x` with `R`/`L`, `E` from `y` with `U`/`D`, `S` from `z` with `F`/`B`). The exact composition order and signs are pinned down and **locked by unit tests** during implementation (each derived move is checked against its known effect on specific stickers, not just self-inverse). The point of the identity approach is that only nine base permutations (`U R F D L B x y z`) are hand-authored; everything else is composed.
  - Tokenizer: scans a string, emitting `{ face, amount }` tokens; recognizes a move letter optionally followed by `2` and/or `'`; ignores whitespace, parentheses, and any unrecognized character.
  - `applyCase(alg: string): Facelets` — tokenize, invert the token list, apply to the solved state.

- **`scheme.ts`** — the six face colors + gray, as the default color scheme.

- **`stages.ts`** — `stageMask(stage)` returns, for a stage, the set of *active facelet positions* plus an optional per-facelet recolor rule:
  - `full`: all 54 active.
  - `ll`: U face (0–8) + the top row of each side (the 3 facelets of F, R, B, L adjacent to U). Rest masked (gray).
  - `oll`: the `ll` active set, but recolor any active facelet whose color ≠ U-color to gray (shows orientation only).
  - `coll`: the `ll` active set, full color.
  - `cross`: the D face (27–35) + the bottom row of each side adjacent to D. Rest masked.
  - `cross-x2`: apply an `x2` setup rotation, then the `cross` mask.
  - Masking operates on facelet *positions* after the case is applied; masked positions render gray.

- **`layout-plan.ts`** — pure function `planLayout(colors, stage, size)` → `[{ points | rect, fill }]` for the 2D plan view: the U face as a 3×3 grid centered, with the four "petals" (top row of each side) drawn around it.

- **`layout-3d.ts`** — pure function `cube3dLayout(colors, stage, size)` → `[{ points, fill }]` for the oblique view: the three visible faces (U top, F front-left, R front-right) projected as parallelograms, 9 quads each (27 total).

- **`cube-image.tsx`** — rewritten. Same props. Runs `applyCase(alg)`, applies the stage mask, picks the layout by `view`, and renders an inline `<svg width=size height=size>` of `<polygon>`/`<rect>` elements. No `<img>`, no Skeleton, no loading state. Memoized by `(alg, view, stage, size)`.

### Consumers

- The five `CubeImage` call sites are unchanged.
- Home thumbnails migrate from raw `<img src=visualcube…>` to `<CubeImage>` with the appropriate `alg`/`view`/`stage`.
- `toQueryString` in `src/lib/cube.ts` and its test become dead code; remove both.

## Error handling

- Tokenizer skips unknown characters (never throws).
- `applyCase` on an empty/garbage alg returns the solved (or partially-applied) state.
- Unknown `stage` → `full`; `view` `undefined`/`trans` → 3D.

## Testing

- **Engine (highest risk):** identities — `x⁴ = id`, `y⁴ = id`, `U⁴ = id`, sexy `(R U R' U')⁶ = id`, `r·r' = id`, `M·M' = id`, `S·S' = id`; derived-move checks (e.g. `r = x·L` matches a direct check that `r` moves the expected stickers); solved state is per-face uniform; a known PLL (e.g. T-perm) applied as a case yields the expected U-face + side pattern.
- **Stages:** active-set membership and sizes per stage; `oll` recolor leaves only U-colored stickers active.
- **Layouts:** solved cube → plan view has 9 U-color squares plus correctly-colored petals; 3D view emits 27 polygons with expected solved fills. Assert structural properties (counts, key fills), not brittle full-SVG snapshots.

## Out of scope

- PNG output, animation, interactive twisting, alternate color schemes UI, arrow/annotation overlays, non-3×3 puzzles.
