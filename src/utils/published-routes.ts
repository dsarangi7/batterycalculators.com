import { fileToRoute, hrefFor as hrefForPath, switcherHref as switcherHrefPath, type LocaleCode } from '../seo/plan.mjs';

export type { LocaleCode };

const pageModules = import.meta.glob('/src/pages/**/*.astro');

function loadPublished(): Set<string> {
  const paths = new Set<string>();
  for (const file of Object.keys(pageModules)) {
    const route = fileToRoute(file);
    if (route) paths.add(route);
  }
  return paths;
}

const published = loadPublished();

export function publishedPaths(): ReadonlySet<string> {
  return published;
}

export function hrefFor(path: string, locale: LocaleCode): string {
  return hrefForPath(path, locale, published);
}

export function switcherHref(pathname: string, locale: LocaleCode): string {
  return switcherHrefPath(pathname, locale, published);
}
