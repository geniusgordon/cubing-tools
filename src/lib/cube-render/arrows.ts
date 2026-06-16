import { permuteSlots } from './engine';
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
