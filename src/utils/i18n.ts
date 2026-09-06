import en from '../i18n/en.json';
import pt from '../i18n/pt.json';

export type Locale = 'en' | 'pt';

const dictionaries: Record<Locale, typeof en> = { en, pt };

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
  if (pathname.startsWith('/pt/')) return 'pt';
  return 'en';
}

export function getOppositeLocale(lang: Locale): Locale {
  return lang === 'en' ? 'pt' : 'en';
}

export function getLocalePrefix(lang: Locale): string {
  return lang === 'en' ? '' : '/pt';
}

export function getAlternateLinks(pathname: string): { lang: Locale; href: string }[] {
  const isPt = pathname.startsWith('/pt/');
  const enPath = isPt ? pathname.replace('/pt/', '/') : pathname;
  const ptPath = isPt ? pathname : '/pt' + pathname;
  return [
    { lang: 'en', href: `https://batterycalculators.com${enPath}` },
    { lang: 'pt', href: `https://batterycalculators.com${ptPath}` },
  ];
}
