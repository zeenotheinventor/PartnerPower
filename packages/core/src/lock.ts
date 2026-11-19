import { z } from 'zod';

/** How long the app must be in the background before it locks. Fixed at launch, not a setting. */
export const backgroundLockDelayMilliseconds = 60_000;

/** The PIN is exactly this many digits. */
export const pinLength = 4;

// A wait starts after each run of this many wrong PINs in a row.
const wrongPinsPerWait = 5;
const firstWaitMilliseconds = 30_000;

/** No wait is longer than this, however many wrong PINs there have been. */
export const maximumWaitMilliseconds = 15 * 60_000;

/**
 * Whether to show the lock. Pass when the app went to the background, or `undefined` on a cold
 * start (or when that time is not known), which always locks. A clock that went backwards locks
 * too, because the time away cannot be trusted.
 */
export function shouldLock(wentToBackgroundAt: number | undefined, now: number): boolean {
  if (wentToBackgroundAt === undefined) return true;
  const timeAway = now - wentToBackgroundAt;
  return timeAway < 0 || timeAway >= backgroundLockDelayMilliseconds;
}

/**
 * Whether an app state starts the time away. Only `background` does. iOS reports `inactive` for
 * the notification shade, Control Center and a call banner, and those never count.
 */
export function countsAsBackground(appState: string): boolean {
  return appState === 'background';
}

export function isValidPin(pin: string): boolean {
  return pin.length === pinLength && /^[0-9]+$/.test(pin);
}

/**
 * How long the next try must wait, given how many wrong PINs in a row there have been. The wait
 * starts at each fifth wrong PIN and doubles each time, up to `maximumWaitMilliseconds`. Between
 * runs of five there is none.
 */
export function waitAfterFailureMilliseconds(failedCount: number): number {
  if (failedCount <= 0 || failedCount % wrongPinsPerWait !== 0) return 0;
  const run = failedCount / wrongPinsPerWait;
  return Math.min(firstWaitMilliseconds * 2 ** (run - 1), maximumWaitMilliseconds);
}

/**
 * The time left of a wait. It is capped at the longest wait, so a clock set far back cannot lock
 * a player out for good.
 */
export function remainingWaitMilliseconds(waitEndsAt: number, now: number): number {
  return Math.min(Math.max(waitEndsAt - now, 0), maximumWaitMilliseconds);
}

// What is kept in secure storage. A value that fails its schema counts as absent.

/** The salted hash of the PIN. Its presence is what says the lock is on. */
export const pinHashSchema = z.object({
  salt: z.string().regex(/^[0-9a-f]{32}$/),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
});
export type PinHash = z.infer<typeof pinHashSchema>;

/** The wrong PINs in a row, and when the current wait ends (milliseconds since 1970, 0 for none). */
export const lockAttemptsSchema = z.object({
  failedCount: z.number().int().positive(),
  waitEndsAt: z.number().int().nonnegative(),
});
export type LockAttempts = z.infer<typeof lockAttemptsSchema>;

/** Whether the player turned biometrics on. They are an extra on top of the PIN. */
export const biometricsChoiceSchema = z.boolean();
