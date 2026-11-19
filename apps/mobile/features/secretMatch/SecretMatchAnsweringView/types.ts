import type { SecretMatchRating, SecretMatchView } from '@getfreak/core';

export type SecretMatchAnsweringViewProps = {
  /** What the engine shows for the item in play. It holds nothing of the other partner's pass. */
  view: Extract<SecretMatchView, { phase: 'rating' }>;
  /** The partner who is told to look away. */
  lookAwayName: string;
  /** Rates the item. The engine moves on at once. */
  onRate: (rating: SecretMatchRating) => void;
  onBack: () => void;
  onStop: () => void;
};
