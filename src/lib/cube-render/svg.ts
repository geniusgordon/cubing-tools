import { applyCase, stripOuterRotations } from './engine';
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
  const isPlan = view === 'plan';
  const withArrows = isPlan && arrows === 'pll';
  // For PLL arrows, render the case in canonical orientation (rotations stripped)
  // so the stickers stay consistent with the rotation-free arrows. computePllArrows
  // strips rotations internally too.
  const colorAlg = withArrows ? stripOuterRotations(alg) : alg;
  const colors = maskedColors(applyCase(colorAlg), stage);
  const viewBox = isPlan ? PLAN_VIEWBOX : CUBE3D_VIEWBOX;
  const body = isPlan ? planBody(colors) : cube3dBody(colors);
  const overlay = withArrows ? arrowsSvg(computePllArrows(alg)) : '';
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

const HEAD_LEN = 7; // arrowhead length in viewBox units (0..100)
const HEAD_HALF = 4; // arrowhead half-width
const round = (n: number) => Math.round(n * 100) / 100;

/** A filled triangle at `tip`, pointing along the direction from `from` → `tip`.
 *  Drawn explicitly (not via SVG <marker>) so the orientation is correct in every
 *  renderer — resvg, which rasterizes the PNG, ignores `marker` `orient`. */
function arrowHead(tip: [number, number], from: [number, number]): string {
  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const bx = tip[0] - ux * HEAD_LEN; // base-center, pulled back from the tip
  const by = tip[1] - uy * HEAD_LEN;
  const px = -uy * HEAD_HALF; // perpendicular offset
  const py = ux * HEAD_HALF;
  const p1 = `${round(bx + px)},${round(by + py)}`;
  const p2 = `${round(bx - px)},${round(by - py)}`;
  return `<polygon points="${round(tip[0])},${round(tip[1])} ${p1} ${p2}" fill="${ARROW_COLOR}"/>`;
}

function arrowsSvg(arrows: Arrow[]): string {
  return arrows
    .map((a) => {
      const line =
        `<line x1="${a.from[0]}" y1="${a.from[1]}" x2="${a.to[0]}" y2="${a.to[1]}" ` +
        `stroke="${ARROW_COLOR}" stroke-width="2"/>`;
      const head = arrowHead(a.to, a.from);
      const tail = a.double ? arrowHead(a.from, a.to) : '';
      return line + head + tail;
    })
    .join('');
}
