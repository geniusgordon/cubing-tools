import { describe, it, expect } from 'vitest';
import { renderCubeSvg } from './svg';

const T_PERM = "R U R' U' R' F R2 U' R' U' R U R' F'";
const UA_Y2 = "(y2) M2 U M U2 M' U M2"; // Ua with a leading whole-cube rotation
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('renderCubeSvg', () => {
  it('plan view → well-formed svg with 21 rects', () => {
    const svg = renderCubeSvg({ alg: '', view: 'plan', stage: 'full' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.includes('xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(count(svg, /<rect/g)).toBe(21);
  });

  it('3D view (default) → 27 polygons, no rects', () => {
    const svg = renderCubeSvg({ alg: '' });
    expect(count(svg, /<polygon/g)).toBe(27);
    expect(count(svg, /<rect/g)).toBe(0);
  });

  it('size is reflected in width/height', () => {
    const svg = renderCubeSvg({ alg: '', size: 512 });
    expect(svg.includes('width="512"')).toBe(true);
    expect(svg.includes('height="512"')).toBe(true);
  });

  it('arrows=pll on plan view → one line + explicit arrowhead polygons (no markers)', () => {
    const svg = renderCubeSvg({ alg: T_PERM, view: 'plan', stage: 'll', arrows: 'pll' });
    expect(svg.includes('<marker')).toBe(false); // arrowheads are drawn explicitly
    expect(count(svg, /<line/g)).toBe(2); // T-perm: corner + edge 2-cycle
    // plan stickers are <rect>, so every <polygon> here is an arrowhead;
    // 2 double-headed arrows → 2 heads each → 4 polygons.
    expect(count(svg, /<polygon/g)).toBe(4);
  });

  it('arrowheads point in distinct directions (not all the same)', () => {
    // A 3-cycle's three directed arrows must have three different head orientations.
    const svg = renderCubeSvg({ alg: UA_Y2, view: 'plan', stage: 'll', arrows: 'pll' });
    const heads = [...svg.matchAll(/<polygon points="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(heads).size).toBe(heads.length); // all distinct
  });

  it('strips a leading whole-cube rotation → clean Ua (3 directed arrows, no corner swaps)', () => {
    const svg = renderCubeSvg({ alg: UA_Y2, view: 'plan', stage: 'll', arrows: 'pll' });
    expect(count(svg, /<line/g)).toBe(3); // 3-edge cycle, not 5 (2 corner + 3 edge)
    expect(count(svg, /<polygon/g)).toBe(3); // 3 directed arrows → 1 head each
  });

  it('arrows ignored for 3D view', () => {
    const svg = renderCubeSvg({ alg: T_PERM, arrows: 'pll' });
    expect(svg.includes('<line')).toBe(false);
  });
});
