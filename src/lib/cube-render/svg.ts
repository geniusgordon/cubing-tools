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
