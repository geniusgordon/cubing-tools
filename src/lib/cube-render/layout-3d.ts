import type { Vec3 } from './types';

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
