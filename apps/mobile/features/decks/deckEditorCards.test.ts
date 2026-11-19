import type { Card, Deck, PlayerCard } from '@getfreak/core';

import {
  countSelectedByCategory,
  deckEditorRows,
  pickableCards,
  type DeckEditorRow,
} from './deckEditorCards';

const shippedCard = (id: string, category: Card['category'] = 'c1'): Card => ({
  id,
  category,
  kind: 'solo',
  text: `Card ${id}`,
  source: 'shipped',
});

const ownCard = (id: string, category: PlayerCard['category'] = 'c1'): PlayerCard => ({
  id,
  category,
  kind: 'solo',
  text: `Own ${id}`,
  source: 'player',
});

const starterDeck: Deck = {
  id: 'starter-deck',
  version: 1,
  cards: [shippedCard('card-1'), shippedCard('card-2', 'c2'), shippedCard('card-3', 'c3')],
};

const ids = (cards: readonly Card[]) => cards.map((card) => card.id);

describe('pickableCards', () => {
  it('should list every dare of the player under My dares', () => {
    const { mine } = pickableCards({
      starterDeck,
      ownCards: [ownCard('p-1'), ownCard('p-2')],
      favouriteIds: new Set(),
      storedCardIds: [],
    });

    expect(ids(mine)).toEqual(['p-1', 'p-2']);
  });

  it('should list the shipped cards that are favourites under Favourites', () => {
    const { favourites } = pickableCards({
      starterDeck,
      ownCards: [],
      favouriteIds: new Set(['card-3', 'card-1']),
      storedCardIds: [],
    });

    expect(ids(favourites)).toEqual(['card-1', 'card-3']);
  });

  it('should not list a favourite dare twice, once under My dares and once under Favourites', () => {
    const { mine, favourites } = pickableCards({
      starterDeck,
      ownCards: [ownCard('p-1')],
      favouriteIds: new Set(['p-1', 'card-1']),
      storedCardIds: [],
    });

    expect(ids(mine)).toEqual(['p-1']);
    expect(ids(favourites)).toEqual(['card-1']);
  });

  it('should keep a shipped card that is in the deck but is no longer a favourite', () => {
    const { favourites } = pickableCards({
      starterDeck,
      ownCards: [],
      favouriteIds: new Set(['card-1']),
      storedCardIds: ['card-2'],
    });

    expect(ids(favourites)).toEqual(['card-1', 'card-2']);
  });

  it('should leave out a shipped card that is neither a favourite nor in the deck', () => {
    const { favourites } = pickableCards({
      starterDeck,
      ownCards: [],
      favouriteIds: new Set(),
      storedCardIds: [],
    });

    expect(favourites).toEqual([]);
  });
});

describe('deckEditorRows', () => {
  const describeRow = (row: DeckEditorRow) =>
    row.kind === 'section'
      ? `section ${row.section}`
      : row.kind === 'category'
        ? `category ${row.categoryId}`
        : `card ${row.card.id}`;

  it('should give a section, then each category that has cards in rank order, then its cards', () => {
    const rows = deckEditorRows({
      mine: [ownCard('p-1', 'c3'), ownCard('p-2', 'c1'), ownCard('p-3', 'c3')],
      favourites: [shippedCard('card-1', 'c2')],
    });

    expect(rows.map(describeRow)).toEqual([
      'section mine',
      'category c1',
      'card p-2',
      'category c3',
      'card p-1',
      'card p-3',
      'section favourites',
      'category c2',
      'card card-1',
    ]);
  });

  it('should leave out a section that has no cards', () => {
    const rows = deckEditorRows({ mine: [], favourites: [shippedCard('card-1')] });

    expect(rows.map(describeRow)).toEqual(['section favourites', 'category c1', 'card card-1']);
  });

  it('should give no rows when there is nothing to pick from', () => {
    expect(deckEditorRows({ mine: [], favourites: [] })).toEqual([]);
  });

  it('should give every row its own key', () => {
    const rows = deckEditorRows({
      mine: [ownCard('p-1'), ownCard('p-2', 'c2')],
      favourites: [shippedCard('card-1'), shippedCard('card-2', 'c2')],
    });

    expect(new Set(rows.map((row) => row.key)).size).toBe(rows.length);
  });
});

describe('countSelectedByCategory', () => {
  const cards = [ownCard('p-1'), ownCard('p-2', 'c2'), shippedCard('card-1', 'c2')];

  it('should count the selected cards in each category', () => {
    expect(countSelectedByCategory(['p-1', 'p-2', 'card-1'], cards)).toEqual({
      c1: 1,
      c2: 2,
      c3: 0,
      c4: 0,
    });
  });

  it('should count nothing for a card that is not selected', () => {
    expect(countSelectedByCategory(['p-2'], cards)).toEqual({ c1: 0, c2: 1, c3: 0, c4: 0 });
  });

  it('should count nothing for an empty deck', () => {
    expect(countSelectedByCategory([], cards)).toEqual({ c1: 0, c2: 0, c3: 0, c4: 0 });
  });
});
