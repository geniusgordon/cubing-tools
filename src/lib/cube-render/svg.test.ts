import { describe, it, expect } from 'vitest';
import { renderCubeSvg } from './svg';

const T_PERM = "R U R' U' R' F R2 U' R' U' R U R' F'";
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

  it('arrows=pll on plan view → a marker and one line per arrow', () => {
    const svg = renderCubeSvg({ alg: T_PERM, view: 'plan', stage: 'll', arrows: 'pll' });
    expect(svg.includes('<marker')).toBe(true);
    expect(count(svg, /<line/g)).toBe(2); // T-perm: corner + edge 2-cycle
  });

  it('arrows ignored for 3D view', () => {
    const svg = renderCubeSvg({ alg: T_PERM, arrows: 'pll' });
    expect(svg.includes('<line')).toBe(false);
    expect(svg.includes('<marker')).toBe(false);
  });
});
