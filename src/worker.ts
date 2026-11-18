import { plan } from './seo/plan.mjs';
import publishedList from './seo/published-paths.json';

const published = new Set(publishedList);
const APEX_HOST = 'batterycalculators.com';

interface Env {
  ASSETS: {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  };
}

function locationFor(requestUrl: string, pathname: string, hostname: string): string {
  const dest = new URL(requestUrl);
  if (hostname === `www.${APEX_HOST}`) dest.hostname = APEX_HOST;
  dest.pathname = pathname;
  return dest.href;
}

async function errorResponse(request: Request, env: Env, status: 404 | 500, assetPath: string): Promise<Response> {
  const pageUrl = new URL(request.url);
  pageUrl.pathname = assetPath;
  let asset = await env.ASSETS.fetch(new Request(pageUrl.href, { method: 'GET' }));
  if (asset.status >= 300 && asset.status < 400) {
    const next = asset.headers.get('location');
    if (next) {
      asset = await env.ASSETS.fetch(new Request(new URL(next, pageUrl).href, { method: 'GET' }));
    }
  }
  const headers = new Headers(asset.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  headers.set('Cache-Control', 'no-store');
  return new Response(request.method === 'HEAD' ? null : asset.body, { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const decision = plan(
      {
        hostname: url.hostname,
        pathname: url.pathname,
        search: url.search,
        method: request.method,
      },
      published,
    );

    if (decision.action === 'redirect') {
      const location = locationFor(request.url, decision.pathname, url.hostname.toLowerCase());
      if (location !== url.href) return Response.redirect(location, decision.status);
    }

    if (decision.action === 'error') {
      return errorResponse(request, env, decision.status, decision.assetPath);
    }

    return env.ASSETS.fetch(request);
  },
};
