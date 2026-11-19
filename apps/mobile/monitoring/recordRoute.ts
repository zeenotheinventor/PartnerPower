import { addBreadcrumb } from '@sentry/react-native';

/**
 * Leaves a trail of the screens the player moved through. A route is its folder names, such as
 * `games/dares/play`. A dynamic part stays as its placeholder, such as `[deckId]`, so no id or
 * other value from the address is recorded.
 */
export function recordRoute(segments: readonly string[]): void {
  try {
    addBreadcrumb({ category: 'navigation', data: { to: `/${segments.join('/')}` } });
  } catch {
    // Reporting must never be the reason the app fails.
  }
}
