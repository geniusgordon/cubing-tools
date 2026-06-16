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

// Last-resort fallback so the image endpoint never 500s (always return an image).
const FALLBACK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 100 100">' +
  '<rect width="100" height="100" fill="#808080"/></svg>';

/** Render a cube image (PNG or SVG) from the request's query params. Never throws. */
async function renderImage(url: URL): Promise<Response> {
  try {
    const { options, fmt } = parseRenderRequest(url);
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
}

const USAGE_HTML =
  '<!doctype html><meta charset="utf-8"><title>cubing-tools worker</title>' +
  '<style>body{font:14px/1.6 system-ui,sans-serif;max-width:46rem;margin:3rem auto;padding:0 1rem}' +
  'code{background:#f2f2f2;padding:.1em .3em;border-radius:3px}h1{font-size:1.3rem}h2{font-size:1rem}</style>' +
  '<h1>cubing-tools worker</h1>' +
  '<p>Render Rubik’s cube images by URL (for Google Sheets <code>=IMAGE()</code>).</p>' +
  '<h2>GET /image</h2>' +
  '<p>Params: <code>case</code> (alg; <code>alg</code> alias), <code>stage</code> ' +
  '(full·ll·oll·coll·cross·cross-x2), <code>view</code> (plan, else 3D), ' +
  '<code>size</code> (32–1024), <code>arrows</code> (pll, plan only), <code>fmt</code> (png·svg).</p>' +
  '<p>Examples:<br>' +
  '<a href="/image?fmt=png&view=plan&stage=oll&case=R%20U%20R%27%20U%20R%20U2%20R%27">' +
  '/image?…&stage=oll&case=R U R’ U R U2 R’</a> (Sune)<br>' +
  '<a href="/image?fmt=svg&view=plan&stage=ll&arrows=pll&case=R%20U%20R%27%20U%27%20R%27%20F%20R2%20U%27%20R%27%20U%27%20R%20U%20R%27%20F%27">' +
  '/image?…&arrows=pll&case=… (T-perm with arrows)</a></p>';

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/image') {
      return renderImage(url);
    }
    if (url.pathname === '/') {
      return new Response(USAGE_HTML, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=3600',
        },
      });
    }
    return new Response('Not found. See / for usage.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
