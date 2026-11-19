import type {
  CategoryId,
  Question,
  SecretMatchRating,
  SecretMatchSetup,
  TopicId,
} from '@getfreak/core';

export const firstPlayerName = 'Player A';
export const secondPlayerName = 'Player B';

/** Placeholder items, so a test never depends on shipped content. */
export function makeSecretMatchQuestions(
  categories: readonly CategoryId[] = ['c1', 'c2'],
  perCategory = 8,
  topic: TopicId = 't1',
): Question[] {
  return categories.flatMap((category) =>
    Array.from({ length: perCategory }, (_unused, index) => ({
      id: `match-${category}-${index + 1}`,
      category,
      topic,
      source: 'shipped' as const,
      format: 'secretMatch' as const,
      text: `Item ${category} ${index + 1}`,
      tags: ['tag-one'],
    })),
  );
}

export const secretMatchSetup: SecretMatchSetup = {
  players: [firstPlayerName, secondPlayerName],
  level: 'l2',
  enabledCategories: ['c1', 'c2'],
  enabledTopics: ['t1'],
  seed: 7,
  avoidIds: [],
};

/** A pass of this many ratings, repeating the given ones in turn. */
export function ratingsOf(
  cycle: readonly SecretMatchRating[],
  count = 12,
): readonly SecretMatchRating[] {
  return Array.from({ length: count }, (_unused, index) => cycle[index % cycle.length] ?? 'yes');
}
