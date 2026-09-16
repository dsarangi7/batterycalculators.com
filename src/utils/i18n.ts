import en from '../i18n/en.json';
import pt from '../i18n/pt.json';
import zh from '../i18n/zh.json';

export type Locale = 'en' | 'pt' | 'zh';

const dictionaries: Record<Locale, typeof en> = { en, pt, zh };

export function t(key: string, lang: Locale = 'en'): string {
  const dict = dictionaries[lang] || dictionaries.en;
  const keys = key.split('.');
  let result: unknown = dict;
  for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
      result = (result as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof result === 'string' ? result : key;
}

export function getLocaleFromPath(pathname: string): Locale {
  if (pathname.startsWith('/pt/') || pathname === '/pt') return 'pt';
  if (pathname.startsWith('/zh/') || pathname === '/zh') return 'zh';
  return 'en';
}

export function getOppositeLocale(lang: Locale): Locale {
  return lang === 'en' ? 'pt' : 'en';
}

export const SUPPORTED_LOCALES: Locale[] = ['en', 'pt', 'zh'];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  pt: 'Português',
  zh: '中文(简体)',
};

export function getLocalePrefix(lang: Locale): string {
  if (lang === 'pt') return '/pt';
  if (lang === 'zh') return '/zh';
  return '';
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname.startsWith('/pt/')) return pathname.replace('/pt/', '/');
  if (pathname === '/pt') return '/';
  if (pathname.startsWith('/zh/')) return pathname.replace('/zh/', '/');
  if (pathname === '/zh') return '/';
  return pathname;
}

export function localizePath(pathname: string, lang: Locale): string {
  const stripped = stripLocalePrefix(pathname);
  const normalized = stripped.startsWith('/') ? stripped : `/${stripped}`;
  if (lang === 'en') return normalized;
  return `/${lang}${normalized}`;
}

export function getAlternateLinks(pathname: string): { lang: Locale; href: string }[] {
  const stripped = stripLocalePrefix(pathname);
  const normalized = stripped.startsWith('/') ? stripped : `/${stripped}`;
  return [
    { lang: 'en', href: `https://batterycalculators.com${normalized}` },
    { lang: 'pt', href: `https://batterycalculators.com/pt${normalized === '/' ? '/' : normalized}` },
    { lang: 'zh', href: `https://batterycalculators.com/zh${normalized === '/' ? '/' : normalized}` },
  ];
}
