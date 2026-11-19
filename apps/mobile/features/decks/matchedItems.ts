import { questionDecks } from '@getfreak/content';
import type { Discovery, MatchedItem } from '@getfreak/core';

/**
 * What the stored matches say, for `suggestDares`. Each match takes its tags from the secret match
 * item in the content now, so retagging content changes the suggestions without touching what is
 * stored. A match whose item has gone is left out.
 */
export function matchedItemsOf(discoveries: readonly Discovery[]): MatchedItem[] {
  const tagsByItemId = new Map<string, readonly string[]>();
  for (const question of questionDecks.flatMap((deck) => deck.questions)) {
    if (question.format === 'secretMatch') tagsByItemId.set(question.id, question.tags);
  }
  return discoveries.flatMap((discovery) => {
    if (discovery.kind !== 'match') return [];
    const tags = tagsByItemId.get(discovery.questionId);
    return tags === undefined ? [] : [{ strength: discovery.strength, tags }];
  });
}
