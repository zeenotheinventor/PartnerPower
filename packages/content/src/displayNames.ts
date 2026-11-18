import type { GameId } from '@getfreak/core';

export type GameDisplayName = {
  title: string;
  description: string;
};

// Typed by game id, so a registered game without a title and description fails typecheck.
export const displayNames: Record<GameId, GameDisplayName> = {
  dares: {
    title: 'Freak or Drink',
    description: 'Draw a dare. Do it, or drink.',
  },
  questions: {
    title: 'Drink If',
    description: 'Learn what they are into.',
  },
};
