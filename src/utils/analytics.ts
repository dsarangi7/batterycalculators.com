/**
 * Analytics Integration Layer
 *
 * Supports: Google Analytics 4 (GA4) and Microsoft Clarity
 * All integrations are disabled by default until IDs are supplied via env vars.
 *
 * Env vars to set:
 *   PUBLIC_GA4_ID       — e.g. "G-XXXXXXXXXX"
 *   PUBLIC_CLARITY_ID   — e.g. "k3xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export const GA4_ID = import.meta.env.PUBLIC_GA4_ID as string | undefined;
export const CLARITY_ID = import.meta.env.PUBLIC_CLARITY_ID as string | undefined;

export const analyticsEnabled = Boolean(GA4_ID || CLARITY_ID);

/** Push a GA4 event via dataLayer */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (!GA4_ID) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...params });
}

/** Track calculator opened */
export function trackCalculatorOpened(calculatorName: string) {
  trackEvent('calculator_opened', { calculator_name: calculatorName });
}

/** Track a calculation performed */
export function trackCalculationPerformed(
  calculatorName: string,
  resultSummary?: string
) {
  trackEvent('calculation_performed', {
    calculator_name: calculatorName,
    ...(resultSummary ? { result_summary: resultSummary } : {}),
  });
}

/** Track article viewed */
export function trackArticleViewed(articleTitle: string, category?: string) {
  trackEvent('article_viewed', {
    article_title: articleTitle,
    ...(category ? { article_category: category } : {}),
  });
}
