/**
 * Calculator Usage Tracking Helper
 *
 * Provides functions to emit structured analytics events.
 * No user-level tracking — only standard aggregate analytics.
 *
 * Usage in calculator scripts:
 *   import { trackEvent } from '../../utils/tracking';
 *   trackEvent('calculation_performed', { calculator: 'runtime', result: '3.68h' });
 */

import { trackEvent } from './analytics';

/** Unique event names for calculator usage */
export const EVENTS = {
  CALCULATOR_OPENED: 'calculator_opened',
  CALCULATION_PERFORMED: 'calculation_performed',
  ARTICLE_VIEWED: 'article_viewed',
  FEEDBACK_GIVEN: 'feedback_given',
  CALCULATOR_FINDER_USED: 'calculator_finder_used',
} as const;

/** Generic event emitter — thin wrapper for consistency */
export function emit(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  trackEvent(eventName, params);
}
