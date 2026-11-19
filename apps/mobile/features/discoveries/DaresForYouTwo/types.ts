import type { Card } from '@getfreak/core';

export type DaresForYouTwoProps = {
  /** The suggested dares to show, best first. Left empty when there are too few to offer a round. */
  dares: readonly Card[];
  /** True when there are enough suggestions for a round. Without it the section shows its hint. */
  canPlay: boolean;
  onPlay: () => void;
  onStartMatch: () => void;
};
