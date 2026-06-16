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

/** Center (x,y) of a U-face slot (index 0..8) in plan viewBox coords. */
export function planSlotCenter(index: number): [number, number] {
  const r = Math.floor(index / 3);
  const c = index % 3;
  return [ORIGIN + c * G + G / 2, ORIGIN + r * G + G / 2];
}
