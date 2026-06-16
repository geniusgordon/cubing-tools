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

export default {
  async fetch(request: Request): Promise<Response> {
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
  },
};
