import { captureException } from '@sentry/react-native';

/**
 * Reports an error the app caught itself, such as one a screen threw while rendering. It does
 * nothing until reporting has been started, and it never throws.
 */
export function reportError(error: unknown): void {
  try {
    captureException(error);
  } catch {
    // Reporting must never be the reason the app fails.
  }
}
