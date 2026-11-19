import type { SurpriseId } from '@getfreak/core';

/**
 * The surprise types the play screen can show. Setup passes these to the round when surprises are
 * on, so a type is added here when the play screen learns to show it and setup never changes.
 */
export const playableSurprises = [
  'mystery',
  'jump',
  'swap',
  'freePass',
] as const satisfies readonly SurpriseId[];

export type PlayableSurpriseId = (typeof playableSurprises)[number];

export function isPlayableSurprise(surprise: SurpriseId): surprise is PlayableSurpriseId {
  return playableSurprises.some((playable) => playable === surprise);
}
