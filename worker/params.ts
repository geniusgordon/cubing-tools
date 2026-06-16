import type { RenderOptions } from '../src/lib/cube-render/svg';

export interface ParsedRequest {
  options: RenderOptions;
  fmt: 'png' | 'svg';
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Parse a visualcube-compatible request URL into render options + output format.
 *  Invalid input degrades to defaults; this never throws. */
export function parseRenderRequest(url: URL): ParsedRequest {
  const p = url.searchParams;
  const alg = p.get('case') ?? p.get('alg') ?? '';
  const stage = p.get('stage') ?? 'full';
  const view: RenderOptions['view'] = p.get('view') === 'plan' ? 'plan' : 'trans';
  const sizeRaw = parseInt(p.get('size') ?? '', 10);
  const size = clamp(Number.isNaN(sizeRaw) ? 200 : sizeRaw, 32, 1024);
  const arrows: RenderOptions['arrows'] =
    view === 'plan' && p.get('arrows') === 'pll' ? 'pll' : undefined;
  const fmt: 'png' | 'svg' = p.get('fmt') === 'svg' ? 'svg' : 'png';
  return { options: { alg, stage, view, size, arrows }, fmt };
}
