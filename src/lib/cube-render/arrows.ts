import { permuteSlots, applyAlg, SOLVED } from './engine';
import { planSlotCenter } from './layout-plan';

export interface Arrow {
  from: [number, number];
  to: [number, number];
  /** true = a 2-cycle swap drawn as one double-headed arrow; false = one directed arrow. */
  double: boolean;
}

// Last-layer U-face slots: corners and edges permute within their own group.
const CORNER_SLOTS = [0, 2, 8, 6];
const EDGE_SLOTS = [1, 5, 7, 3];

// Where each slot's sticker travels under a single y (U-axis) cube rotation.
const Y_MOVE_TO = ((): number[] => {
  const out = permuteSlots('y'); // out[d] = origin slot whose sticker now sits at d
  const moveTo = new Array<number>(54);
  out.forEach((origin, d) => {
    moveTo[origin] = d;
  });
  return moveTo;
})();

function rotateY(slot: number, times: number): number {
  let s = slot;
  const n = ((times % 4) + 4) % 4;
  for (let i = 0; i < n; i++) s = Y_MOVE_TO[s];
  return s;
}

// Net whole-cube U-axis rotation baked into `alg`, as a count of y turns (0..3).
// A valid last-layer alg leaves U on top, so its net reorientation is a y^k; the
// F-center's final face tells us k (y sends R→F, y2 sends B→F, y' sends L→F).
const FACE_TO_Y_TURNS: Record<string, number> = { F: 0, R: 1, B: 2, L: 3 };
function netUTurns(alg: string): number {
  const centers = applyAlg(SOLVED, alg);
  if (centers[4] !== 'U') return 0; // U left the top — not a clean LL orientation
  return FACE_TO_Y_TURNS[centers[22]] ?? 0;
}

/** Permutation arrows for a PLL case, in plan-view viewBox coords (0..100).
 *  Only meaningful for the plan view of a last-layer (orientation-preserving) case.
 *  The alg's net whole-cube rotation (e.g. a leading `y2`) is factored out so the
 *  arrows show the clean LL exchange relative to the cube's own centers — staying
 *  consistent with the rendered case (which keeps its true orientation) without
 *  picking up spurious swaps from the rotation. */
export function computePllArrows(alg: string): Arrow[] {
  const origin = permuteSlots(alg); // origin[d] = slot whose sticker now sits at d
  const dest = new Array<number>(54); // dest[s] = where slot s's sticker went
  origin.forEach((src, d) => {
    dest[src] = d;
  });
  // Un-rotate the destinations by the net reorientation (R^-1 ∘ P_alg).
  const k = netUTurns(alg);
  const cleanDest = dest.map((d) => rotateY(d, -k));
  return [...cyclesToArrows(CORNER_SLOTS, cleanDest), ...cyclesToArrows(EDGE_SLOTS, cleanDest)];
}

function cyclesToArrows(slots: number[], dest: number[]): Arrow[] {
  const group = new Set(slots);
  // Arrows are only meaningful when the group permutes within itself
  // (true for orientation-preserving last-layer cases). A non-PLL input
  // (e.g. a net cube rotation moving U off the top) escapes the group —
  // degrade to no arrows rather than emit off-canvas coordinates.
  if (slots.some((s) => !group.has(dest[s]))) return [];
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
