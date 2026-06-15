# Cube-Image Worker + PLL Arrows — Design

**Status:** Approved (design); pending implementation plan.
**Date:** 2026-06-15

## Problem

Google Sheets `=IMAGE()` needs a URL that returns a raster image. The user's sheets used the now-dead `visualcube.php` (`fmt=png … &case=ENCODEURL(C3)`) for OLL previews and a static GIF with permutation arrows for PLL. We have a self-hosted, client-side SVG renderer (`src/lib/cube-render`), but GitHub Pages is static-only and can't render an arbitrary alg per request.

Build a small **Cloudflare Worker** that reuses our render engine to serve cube PNGs by URL (for arbitrary algs), and add **PLL permutation arrows** to the renderer.

## Goals

- A public endpoint `https://cube.<account>.workers.dev/?…` returning `image/png` (and `image/svg+xml` if asked).
- URL params mirror visualcube so the user's formulas need only a domain swap.
- PLL arrows: permutation arrows on the plan view, opt-in via `arrows=pll`.
- App on GitHub Pages stays unchanged; the Worker is a separate free deploy.

## Non-goals

- Arrows in the in-app trainer (the arrows module is built reusably, but wiring it into the app is out of scope here).
- Arrows for 3D view or for OLL (OLL is orientation, not permutation).
- A custom domain (the default `*.workers.dev` subdomain is fine).
- Server-side fonts (we render only shapes — stickers + arrows — no text).

## URL schema (matches visualcube)

`GET /?case=<alg>&stage=<stage>&view=<view>&size=<px>&arrows=<arrows>&fmt=<fmt>`

| Param | Values | Default | Notes |
|---|---|---|---|
| `case` | WCA alg string | empty → solved | Rendered as a case (inverse applied), same as our `applyCase` and the old `case=`. `alg` accepted as an alias. |
| `stage` | `full` `ll` `oll` `coll` `cross` `cross-x2` | `full` | Unknown → `full`. |
| `view` | `plan` (anything else → 3D) | 3D | |
| `size` | integer px | 200 | Clamped to a sane range (e.g. 32–1024). |
| `arrows` | `pll` | none | Only honored for `view=plan`. |
| `fmt` | `png` `svg` | `png` | `=IMAGE()` needs `png`. |

The user's migrated formulas:
```
OLL:  =IMAGE("https://cube.<acct>.workers.dev/?fmt=png&size=200&view=plan&stage=oll&case=" & ENCODEURL(C3))
PLL:  =IMAGE("https://cube.<acct>.workers.dev/?fmt=png&size=200&view=plan&stage=ll&arrows=pll&case=" & ENCODEURL(C3))
```

## Architecture

```
GET …/?case=…&arrows=pll
   │  worker/index.ts (Cloudflare Worker)
   ├─ parse + validate params
   ├─ renderCubeSvg(opts) ──► SVG string   [src/lib/cube-render]
   ├─ fmt=svg? → return svg
   └─ else: resvg-wasm rasterize → PNG bytes
   ▼  image/png  + Cache-Control: public, max-age=31536000, immutable
```

### New library pieces (in `src/lib/cube-render`, pure, tree-shaken from the app build)

1. **`arrows.ts` — `computePllArrows(alg: string): Arrow[]`.**
   - Last-layer pieces: 4 corners (U-face slots 0,2,6,8) and 4 edges (slots 1,3,5,7).
   - Tag a solved cube with unique per-facelet ids, apply the alg **forward**, and read which slot each U-face piece sticker moved to → the LL permutation among corner slots and among edge slots. (PLL preserves orientation, so U-face stickers stay on U.)
   - Decompose into cycles; emit an `Arrow` per directed edge of each cycle. 2-cycles render double-headed; longer cycles render directed. Corner cycles and edge cycles are computed independently.
   - `Arrow = { from: [x,y]; to: [x,y]; double: boolean }` in plan-view viewBox coords (0..100), where each slot's center is taken from the plan layout geometry (reuse the `layout-plan` constants).
   - Arrows are defined only for the plan view.
   - Arrow direction convention: matches the alg's forward permutation (validated visually against a known U-perm during implementation).

2. **`svg.ts` — `renderCubeSvg(opts): string`.**
   - `opts = { alg, view?, stage?, size?, arrows? }`.
   - Computes `maskedColors(applyCase(alg), stage)`, picks `planLayout`/`cube3dLayout`, serializes stickers to `<rect>`/`<polygon>` strings (same shapes the React `CubeImage` draws), and — when `arrows==='pll'` and `view==='plan'` — appends `<defs>` with an arrowhead `<marker>` and one `<path>`/`<line>` per `Arrow`.
   - Returns a complete `<svg xmlns…>` string. No text nodes (no fonts needed).
   - The React `CubeImage` is left as-is; this serializer exists for the Worker. (Geometry stays DRY because both consume the same `planLayout`/`cube3dLayout`.)

### Worker (`worker/`)

- `worker/index.ts`: a `fetch` handler. Parses params, calls `renderCubeSvg`, returns SVG directly for `fmt=svg`, otherwise rasterizes with `@resvg/resvg-wasm` to PNG at the requested `size`. Always returns an image (invalid input degrades to defaults; never 500). Long-lived `Cache-Control` so each unique URL rasterizes once at Cloudflare's edge.
- resvg-wasm is initialized once at module scope (`initWasm` with the imported `.wasm`).
- `worker/wrangler.toml`: `name`, `main`, `compatibility_date`, and the wasm module rule so wrangler bundles the resvg `.wasm`.
- Imports the render lib via a relative path (`../src/lib/cube-render` — the lib uses only relative internal imports and has no DOM/React deps, so it ports cleanly).

### Deploy

- Separate from GitHub Pages. The user runs (once) `wrangler login`, then `wrangler deploy` from `worker/`. The deploy is interactive (Cloudflare auth) so it is a manual step the user performs; the implementation provides all code/config and the exact commands. The app's existing Pages workflow is untouched.
- Risk to verify during implementation: the Free-plan Worker size limit (1 MiB gzipped). resvg-wasm is widely used on Workers Free (e.g. `workers-og`), so it is expected to fit; the plan includes a size check, with the $5 paid plan as the fallback if it doesn't.

## Error handling

- Missing/empty `case` → solved cube.
- Unknown `stage` → `full`; non-`plan` `view` → 3D; `arrows` ignored unless `pll` + plan.
- `size` clamped to 32–1024.
- Unparseable alg → lenient tokenizer already skips unknown tokens; worst case a partially-applied or solved cube, never a crash.

## Testing

- **`arrows.ts`:** solved/identity alg → no arrows; T-perm → exactly one corner 2-cycle + one edge 2-cycle (two double-headed arrows); a U-perm (e.g. Ua) → a single edge 3-cycle (three directed arrows), corners none; arrow endpoints fall on the correct plan-view slot centers.
- **`svg.ts`:** `renderCubeSvg` returns a well-formed `<svg>` with the expected count of `<rect>`/`<polygon>`; with `arrows=pll` it includes a `<marker>` and the right number of arrow paths; `fmt`-agnostic (it always returns SVG).
- **Worker:** a `vitest` test importing the handler (or `wrangler dev` smoke) asserts a sample request returns `image/png` with PNG magic bytes (`\x89PNG`), and `fmt=svg` returns `image/svg+xml`. Validate arrow direction visually (rasterize a U-perm via the same approach used for the renderer and eyeball it against the speedsolving reference).

## Open items deferred

- Wiring arrows into the in-app PLL trainer (trivial follow-on once `arrows.ts` exists).
- Custom domain / vanity URL for the Worker.
