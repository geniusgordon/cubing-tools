import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
import { renderCubeSvg } from '../src/lib/cube-render/svg';
import { parseRenderRequest } from './params';

// Initialize the wasm module once per isolate.
let wasmReady: Promise<unknown> | null = null;
function ensureWasm(): Promise<unknown> {
  if (!wasmReady) wasmReady = initWasm(resvgWasm);
  return wasmReady;
}

const CACHE = 'public, max-age=31536000, immutable';

// Last-resort fallback so the endpoint never 500s (spec: always return an image).
const FALLBACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100">' +
  '<rect width="100" height="100" fill="#808080"/></svg>';

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const { options, fmt } = parseRenderRequest(new URL(request.url));
      const svg = renderCubeSvg(options);

      if (fmt === 'svg') {
        return new Response(svg, {
          headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': CACHE },
        });
      }

      await ensureWasm();
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: options.size ?? 200 } });
      const png = resvg.render().asPng();
      return new Response(png, {
        headers: { 'content-type': 'image/png', 'cache-control': CACHE },
      });
    } catch {
      return new Response(FALLBACK_SVG, {
        headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': CACHE },
      });
    }
  },
};
