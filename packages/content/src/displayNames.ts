import type { CategoryId, GameId, LevelId } from '@getfreak/core';

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

// The one place a category is named, so renaming c4 is a single edit here.
export const categoryNames: Record<CategoryId, string> = {
  c1: 'Soft',
  c2: 'Foreplay',
  c3: 'Oral',
  c4: 'Sex',
};

export const levelNames: Record<LevelId, string> = {
  l1: 'Flirty',
  l2: 'Spicy',
  l3: 'Freaky',
};
