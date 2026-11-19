import type { FeedbackSound } from './types';

/**
 * How long each sound lasts, to the millisecond. The scheduler uses it to know when a sound has
 * finished, and a test checks it against the length of every file in `assets/sounds`.
 */
export const soundMilliseconds: Record<FeedbackSound, number> = {
  tap: 40,
  done: 250,
  pass: 300,
  toggleOn: 110,
  toggleOff: 110,
  select: 80,
  back: 90,
  locked: 110,
  deal: 200,
  stepUp: 500,
  handover: 550,
  sheetOpen: 200,
  timerEnd: 700,
  roundComplete: 1150,
};
