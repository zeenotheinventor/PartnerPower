import {
  categoryIds,
  type CategoryId,
  type Card,
  type Deck,
  type PlayerCard,
} from '@getfreak/core';

type PickableCardsInput = {
  starterDeck: Deck;
  ownCards: readonly PlayerCard[];
  favouriteIds: ReadonlySet<string>;
  /** The ids the deck held when it was opened. */
  storedCardIds: readonly string[];
};

export type PickableCards = {
  /** Every dare of the player. */
  mine: readonly Card[];
  /**
   * The shipped cards that are favourites, plus any shipped card the deck already holds that is no
   * longer a favourite, because an unfavourited card stays in a deck until it is taken out there.
   * A favourite dare of the player is under `mine`, so a card shows once.
   */
  favourites: readonly Card[];
};

/** The cards that can go in a deck, in the two lists the editor shows. */
export function pickableCards({
  starterDeck,
  ownCards,
  favouriteIds,
  storedCardIds,
}: PickableCardsInput): PickableCards {
  const stored = new Set(storedCardIds);
  return {
    mine: ownCards,
    favourites: starterDeck.cards.filter(
      (card) => favouriteIds.has(card.id) || stored.has(card.id),
    ),
  };
}

export type DeckEditorSection = 'mine' | 'favourites';

/** One line of the editor's list. A section heading, a category heading, or a card to pick. */
export type DeckEditorRow =
  | { kind: 'section'; key: string; section: DeckEditorSection }
  | { kind: 'category'; key: string; categoryId: CategoryId }
  | { kind: 'card'; key: string; card: Card };

function rowsOfSection(section: DeckEditorSection, cards: readonly Card[]): DeckEditorRow[] {
  if (cards.length === 0) return [];
  const rows: DeckEditorRow[] = [{ kind: 'section', key: `section-${section}`, section }];
  for (const categoryId of categoryIds) {
    const inCategory = cards.filter((card) => card.category === categoryId);
    if (inCategory.length === 0) continue;
    rows.push({ kind: 'category', key: `category-${section}-${categoryId}`, categoryId });
    for (const card of inCategory) {
      rows.push({ kind: 'card', key: `card-${section}-${card.id}`, card });
    }
  }
  return rows;
}

/** The editor's list as one flat list of rows, so it can be a virtualised list. */
export function deckEditorRows({ mine, favourites }: PickableCards): DeckEditorRow[] {
  return [...rowsOfSection('mine', mine), ...rowsOfSection('favourites', favourites)];
}

/** How many of the selected cards are in each category. */
export function countSelectedByCategory(
  selectedIds: readonly string[],
  cards: readonly Card[],
): Record<CategoryId, number> {
  const selected = new Set(selectedIds);
  const counts: Record<CategoryId, number> = { c1: 0, c2: 0, c3: 0, c4: 0 };
  for (const card of cards) {
    if (selected.has(card.id)) counts[card.category] += 1;
  }
  return counts;
}
