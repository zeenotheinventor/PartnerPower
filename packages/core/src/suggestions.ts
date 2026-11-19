import { categories, type Card, type CategoryId, type Deck } from './contentModel';

export type MatchStrength = 'yes' | 'maybe';

/** A secret match item both partners picked, with the tags the current content gives it. */
export type MatchedItem = { strength: MatchStrength; tags: readonly string[] };

export type SuggestOptions = {
  /** How many dares to return. The default is 10. */
  limit?: number;
  /** When given, only dares in these categories are suggested. */
  categories?: readonly CategoryId[];
};

export const defaultSuggestionLimit = 10;
export const minimumMatchesDeckCards = 5;
export const maximumMatchesDeckCards = 20;

const strengthScore: Record<MatchStrength, number> = { yes: 2, maybe: 1 };

function strongestScoreByTag(matches: readonly MatchedItem[]): Map<string, number> {
  const scoreByTag = new Map<string, number>();
  for (const match of matches) {
    for (const tag of match.tags) {
      scoreByTag.set(tag, Math.max(scoreByTag.get(tag) ?? 0, strengthScore[match.strength]));
    }
  }
  return scoreByTag;
}

function categoryRank(categoryId: CategoryId): number {
  return categories.find((category) => category.id === categoryId)?.rank ?? 0;
}

function compareText(first: string, second: string): number {
  if (first < second) return -1;
  return first > second ? 1 : 0;
}

/**
 * Ranks dares by what a couple matched on. Each tag scores 2 for a yes match and 1 for a maybe
 * match, and a dare scores the sum over its distinct tags. Dares that score nothing are left out.
 * Ties go to the milder category, then to the lower id.
 */
export function suggestDares(
  matches: readonly MatchedItem[],
  cards: readonly Card[],
  options: SuggestOptions = {},
): Card[] {
  const { limit = defaultSuggestionLimit, categories: wantedCategories } = options;
  const scoreByTag = strongestScoreByTag(matches);
  return cards
    .filter((card) => wantedCategories === undefined || wantedCategories.includes(card.category))
    .map((card) => ({
      card,
      score: [...new Set(card.tags ?? [])].reduce(
        (sum, tag) => sum + (scoreByTag.get(tag) ?? 0),
        0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (first, second) =>
        second.score - first.score ||
        categoryRank(first.card.category) - categoryRank(second.card.category) ||
        compareText(first.card.id, second.card.id),
    )
    .slice(0, limit)
    .map(({ card }) => card);
}

/** Wraps suggested dares in a deck for a game to play. It is built when needed and never stored. */
export function buildMatchesDeck(cards: readonly Card[]): Deck {
  return { id: 'matches', version: 1, cards: cards.slice(0, maximumMatchesDeckCards) };
}

export function canOfferMatchesDeck(suggestions: readonly Card[]): boolean {
  return suggestions.length >= minimumMatchesDeckCards;
}
