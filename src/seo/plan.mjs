/**
 * Canonical-URL planner for Battery Calculators.
 *
 * Cloudflare Workers static assets can only emit 307 for trailing-slash
 * normalization. Search Console treats that as a temporary redirect, so
 * host, slash, and missing-locale canonicalization are decided here and
 * applied as 301 (GET/HEAD) or 308 (other methods on the www host).
 */

/** @typedef {'en' | 'pt' | 'zh'} LocaleCode */

export const APEX_HOST = 'batterycalculators.com';
const LOCALES = /** @type {const} */ (['pt', 'zh']);

/**
 * @param {string} pathname
 * @returns {string}
 */
export function ensureSlash(pathname) {
  if (!pathname || pathname === '/') return '/';
  const withLeading = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

/**
 * @param {string} pathname
 * @returns {string}
 */
export function stripLocale(pathname) {
  const path = ensureSlash(pathname);
  for (const locale of LOCALES) {
    if (path === `/${locale}/`) return '/';
    const prefix = `/${locale}/`;
    if (path.startsWith(prefix)) return ensureSlash(path.slice(prefix.length - 1));
  }
  return path;
}

/**
 * @param {string} pathname
 * @param {LocaleCode} locale
 * @returns {string}
 */
export function localePath(pathname, locale) {
  const base = stripLocale(pathname);
  if (locale === 'en') return base;
  if (base === '/') return `/${locale}/`;
  return `/${locale}${base}`;
}

/**
 * @param {string} file
 * @returns {string | null}
 */
export function fileToRoute(file) {
  const normalized = file.replaceAll('\\', '/');
  const marker = 'src/pages/';
  const index = normalized.lastIndexOf(marker);
  if (index === -1) return null;
  let rel = normalized.slice(index + marker.length);
  if (!rel.endsWith('.astro') || rel.includes('[')) return null;
  rel = rel.slice(0, -'.astro'.length);
  if (rel === 'index') return '/';
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  if (!rel) return '/';
  return `/${rel}/`;
}

/**
 * Link to the localized page when it exists, otherwise the English page.
 * @param {string} unprefixed
 * @param {LocaleCode} locale
 * @param {ReadonlySet<string>} published
 */
export function hrefFor(unprefixed, locale, published) {
  const desired = localePath(unprefixed, locale);
  if (published.has(desired)) return desired;
  const english = localePath(unprefixed, 'en');
  if (published.has(english)) return english;
  return desired;
}

/**
 * Language switcher target. Missing translations go to that locale's home
 * instead of a URL that 404s.
 * @param {string} currentPathname
 * @param {LocaleCode} locale
 * @param {ReadonlySet<string>} published
 */
export function switcherHref(currentPathname, locale, published) {
  const desired = localePath(currentPathname, locale);
  if (published.has(desired)) return desired;
  return locale === 'en' ? '/' : `/${locale}/`;
}

/**
 * @param {string} pathname
 * @returns {{ action: 'error', status: 404 | 500, assetPath: string } | null}
 */
function matchError(pathname) {
  const directory = pathname.match(/^\/(?:(pt|zh)\/)?(404|500)(?:\/(?:index(?:\.html)?)?)?$/);
  const file = pathname.match(/^\/(?:(pt|zh)\/)?(404|500)\.html$/);
  const match = directory || file;
  if (!match) return null;
  const locale = match[1];
  const status = /** @type {404 | 500} */ (Number(match[2]));
  return {
    action: 'error',
    status,
    assetPath: locale ? `/${locale}/${status}/` : `/${status}/`,
  };
}

/**
 * @param {string} pathname
 * @param {ReadonlySet<string>} published
 * @returns {string | null}
 */
function publishedTarget(pathname, published) {
  const slashed = ensureSlash(pathname);
  if (published.has(slashed)) return slashed;
  const english = stripLocale(slashed);
  if (english !== slashed && published.has(english)) return english;
  return null;
}

/**
 * @param {string} pathname
 * @param {ReadonlySet<string>} published
 * @returns {{ action: 'asset' } | { action: 'redirect', pathname: string } | { action: 'error', status: 404 | 500, assetPath: string }}
 */
function decidePath(pathname, published) {
  const error = matchError(pathname);
  if (error) return error;

  const index = pathname.match(/^(.*)\/index(?:\.html)?$/);
  if (index) {
    const dir = index[1] === '' ? '/' : ensureSlash(index[1]);
    const target = publishedTarget(dir, published);
    if (target) return { action: 'redirect', pathname: target };
  }

  const last = pathname.split('/').pop() || '';
  if (last.includes('.') && !last.endsWith('.html')) return { action: 'asset' };

  if (pathname.endsWith('.html')) {
    const target = publishedTarget(pathname.slice(0, -'.html'.length), published);
    if (target) return { action: 'redirect', pathname: target };
  }

  const slashed = ensureSlash(pathname);
  if (published.has(slashed)) {
    if (pathname !== slashed) return { action: 'redirect', pathname: slashed };
    return { action: 'asset' };
  }

  const english = stripLocale(slashed);
  if (english !== slashed && published.has(english)) {
    return { action: 'redirect', pathname: english };
  }

  return { action: 'asset' };
}

/**
 * @param {{ hostname?: string, pathname?: string, search?: string, method?: string }} input
 * @param {ReadonlySet<string>} published
 * @returns {{ action: 'asset' } | { action: 'redirect', status: 301 | 308, pathname: string, search: string } | { action: 'error', status: 404 | 500, assetPath: string }}
 */
export function plan(input, published) {
  const method = String(input.method || 'GET').toUpperCase();
  const search = input.search || '';
  const hostname = String(input.hostname || '').toLowerCase();
  const pathname = input.pathname || '/';
  const onWww = hostname === `www.${APEX_HOST}`;

  if (method !== 'GET' && method !== 'HEAD') {
    if (onWww) return { action: 'redirect', status: 308, pathname, search };
    return { action: 'asset' };
  }

  const decision = decidePath(pathname, published);
  if (onWww) {
    const target =
      decision.action === 'redirect'
        ? decision.pathname
        : decision.action === 'error'
          ? decision.assetPath
          : pathname;
    return { action: 'redirect', status: 301, pathname: target, search };
  }

  if (decision.action === 'redirect') {
    return { action: 'redirect', status: 301, pathname: decision.pathname, search };
  }
  return decision;
}

const STATIC_REDIRECT_LIMIT = 2000;

/**
 * `_redirects` lines. Static rule cap on Workers assets is 2,000.
 * Index-alias rules are dropped first if a future content add would overflow.
 * @param {Iterable<string>} publishedPaths
 * @returns {string[]}
 */
export function redirectRules(publishedPaths) {
  const published = publishedPaths instanceof Set ? publishedPaths : new Set(publishedPaths);
  const withIndex = buildRedirectRules(published, true);
  if (withIndex.length < STATIC_REDIRECT_LIMIT) return withIndex;
  const withoutIndex = buildRedirectRules(published, false);
  if (withoutIndex.length >= STATIC_REDIRECT_LIMIT) {
    throw new Error(`SEO redirect rules exceed the Workers static limit of ${STATIC_REDIRECT_LIMIT}: ${withoutIndex.length}`);
  }
  return withoutIndex;
}

/**
 * @param {ReadonlySet<string>} published
 * @param {boolean} includeIndexAliases
 * @returns {string[]}
 */
function buildRedirectRules(published, includeIndexAliases) {
  /** @type {Map<string, string>} */
  const rules = new Map();
  const add = (/** @type {string} */ from, /** @type {string} */ to) => {
    if (!from || from === to || rules.has(from)) return;
    rules.set(from, to);
  };

  const paths = [...published].sort();
  for (const path of paths) {
    if (path === '/') continue;
    const bare = path.slice(0, -1);
    add(bare, path);
    if (includeIndexAliases) {
      add(`${path}index`, path);
      add(`${path}index.html`, path);
    }
  }

  for (const path of paths) {
    if (path.startsWith('/pt/') || path.startsWith('/zh/')) continue;
    for (const locale of LOCALES) {
      const localized = path === '/' ? `/${locale}/` : `/${locale}${path}`;
      if (published.has(localized)) continue;
      const bare = localized.slice(0, -1);
      add(bare, path);
      add(localized, path);
      if (includeIndexAliases) {
        add(`${bare}/index`, path);
        add(`${localized}index.html`, path);
      }
    }
  }

  return [...rules.entries()].map(([from, to]) => `${from} ${to} 301`);
}
