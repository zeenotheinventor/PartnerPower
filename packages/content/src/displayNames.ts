import type {
  CategoryId,
  GameId,
  LevelId,
  QuestionFormat,
  SurpriseId,
  TopicId,
} from '@getfreak/core';

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

// Typed by surprise id, so a surprise without a name fails typecheck.
export const surpriseNames: Record<SurpriseId, string> = {
  mystery: 'Mystery dare',
  jump: 'Category jump',
  swap: 'Role swap',
  choice: "Partner's choice",
  timer: 'Timer',
  freePass: 'Free pass',
};

// Typed by format id, so a format without a name fails typecheck.
export const questionFormatNames: Record<QuestionFormat, string> = {
  ifYou: 'Drink if',
  neverHave: 'Never have I ever',
  guess: 'Guess your partner',
  eitherOr: 'Would you rather',
  secretMatch: 'Secret match',
};

export const topicNames: Record<TopicId, string> = {
  t1: 'Favourites',
  t2: 'Turn-ons and turn-offs',
  t3: 'Fantasies',
  t4: 'Kinks and fetishes',
  t5: 'History',
  t6: 'Wishlist',
};
