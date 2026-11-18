export type LocaleCode = 'en' | 'pt' | 'zh';

export function ensureSlash(pathname: string): string;
export function stripLocale(pathname: string): string;
export function localePath(pathname: string, locale: LocaleCode): string;
export function fileToRoute(file: string): string | null;
export function hrefFor(unprefixed: string, locale: LocaleCode, published: ReadonlySet<string>): string;
export function switcherHref(currentPathname: string, locale: LocaleCode, published: ReadonlySet<string>): string;

export type PlanInput = {
  hostname?: string;
  pathname?: string;
  search?: string;
  method?: string;
};

export type PlanDecision =
  | { action: 'asset' }
  | { action: 'redirect'; status: 301 | 308; pathname: string; search: string }
  | { action: 'error'; status: 404 | 500; assetPath: string };

export function plan(input: PlanInput, published: ReadonlySet<string>): PlanDecision;
export function redirectRules(publishedPaths: Iterable<string>): string[];
