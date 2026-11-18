import {
  categories,
  categoriesForLevel,
  categoryIds,
  findDuplicateCardIds,
  isCategoryId,
  levelIds,
  levels,
  parseDeck,
  type Deck,
} from './contentModel';

const validCard = { id: 'card-1', category: 'c1', kind: 'solo', text: 'Card text one' };

function deckWith(...cards: unknown[]) {
  return { id: 'deck-1', version: 1, cards };
}

function errorsFor(input: unknown): string[] {
  const result = parseDeck(input);
  if (result.success) throw new Error('Expected the deck to fail validation');
  return result.errors;
}

describe('categories', () => {
  it('should list the category ids from mildest to boldest', () => {
    expect(categoryIds).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('should rank the categories from one and give each one penalty unit per rank', () => {
    expect(categories).toEqual([
      { id: 'c1', rank: 1, penalty: 1 },
      { id: 'c2', rank: 2, penalty: 2 },
      { id: 'c3', rank: 3, penalty: 3 },
      { id: 'c4', rank: 4, penalty: 4 },
    ]);
  });

  it.each(['c1', 'c4'])('should recognise %s as a category id', (value) => {
    expect(isCategoryId(value)).toBe(true);
  });

  it.each(['c0', 'c5', 'C1', ''])('should not recognise "%s" as a category id', (value) => {
    expect(isCategoryId(value)).toBe(false);
  });
});

describe('levels', () => {
  it('should list the level ids from mildest to boldest', () => {
    expect(levelIds).toEqual(['l1', 'l2', 'l3']);
  });

  it('should map l1 to c1', () => {
    expect(categoriesForLevel('l1')).toEqual(['c1']);
  });

  it('should map l2 to c1 and c2', () => {
    expect(categoriesForLevel('l2')).toEqual(['c1', 'c2']);
  });

  it('should map l3 to c1 to c4', () => {
    expect(categoriesForLevel('l3')).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('should give every level only known categories', () => {
    levels.forEach((level) =>
      level.categories.forEach((id) => expect(isCategoryId(id)).toBe(true)),
    );
  });
});

describe('parseDeck', () => {
  it('should accept a valid deck', () => {
    const result = parseDeck(
      deckWith(validCard, {
        id: 'card-2',
        category: 'c4',
        kind: 'together',
        text: 'Card text two',
      }),
    );

    expect(result).toEqual({
      success: true,
      deck: deckWith(validCard, {
        id: 'card-2',
        category: 'c4',
        kind: 'together',
        text: 'Card text two',
      }),
    });
  });

  it('should accept an empty deck', () => {
    expect(parseDeck(deckWith()).success).toBe(true);
  });

  it('should trim the card text', () => {
    const result = parseDeck(deckWith({ ...validCard, text: '  Card text one  ' }));

    expect(result.success && result.deck.cards[0]?.text).toBe('Card text one');
  });

  it('should accept the optional effect and source fields', () => {
    const result = parseDeck(deckWith({ ...validCard, effect: 'skip', source: 'player' }));

    expect(result.success).toBe(true);
  });

  it('should reject a deck that is not an object', () => {
    expect(errorsFor('nope')).toEqual(['deck: expected an object']);
  });

  it('should name the card by index and id when its category is unknown', () => {
    expect(errorsFor(deckWith(validCard, { ...validCard, id: 'card-2', category: 'c9' }))).toEqual([
      'cards[1] (id "card-2"): unknown category "c9", expected one of c1, c2, c3, c4',
    ]);
  });

  it('should name the card by index and id when its text is empty', () => {
    expect(errorsFor(deckWith({ ...validCard, text: '   ' }))).toEqual([
      'cards[0] (id "card-1"): text must not be empty',
    ]);
  });

  it('should name the card by index and id when its kind is unknown', () => {
    expect(errorsFor(deckWith({ ...validCard, kind: 'group' }))).toEqual([
      'cards[0] (id "card-1"): unknown kind "group", expected solo or together',
    ]);
  });

  it('should name the card by index when its id is empty', () => {
    expect(errorsFor(deckWith({ ...validCard, id: '' }))).toEqual([
      'cards[0]: id must not be empty',
    ]);
  });

  it('should name the card by index when its id is missing', () => {
    const cardWithoutId = { category: 'c1', kind: 'solo', text: 'Card text one' };

    expect(errorsFor(deckWith(cardWithoutId))).toEqual(['cards[0]: id is required']);
  });

  it('should reject a card that is not an object', () => {
    expect(errorsFor(deckWith('nope'))).toEqual(['cards[0]: expected an object']);
  });

  it('should reject a duplicate card id and say which card used it first', () => {
    expect(errorsFor(deckWith(validCard, { ...validCard, text: 'Card text two' }))).toEqual([
      'cards[1] (id "card-1"): duplicate id, first used by cards[0]',
    ]);
  });

  it('should reject an unrecognised card field', () => {
    expect(errorsFor(deckWith({ ...validCard, colour: 'red' }))).toEqual([
      'cards[0] (id "card-1"): unrecognised field "colour"',
    ]);
  });

  it('should reject an unknown source', () => {
    expect(errorsFor(deckWith({ ...validCard, source: 'robot' }))).toEqual([
      'cards[0] (id "card-1"): unknown source "robot", expected shipped or player',
    ]);
  });

  it('should reject a deck without an id', () => {
    expect(errorsFor({ version: 1, cards: [] })).toEqual(['deck: id is required']);
  });

  it('should reject a version that is not a positive whole number', () => {
    expect(errorsFor({ id: 'deck-1', version: 0, cards: [] })).toEqual([
      'deck: version must be a positive whole number',
    ]);
  });

  it('should reject a deck without cards', () => {
    expect(errorsFor({ id: 'deck-1', version: 1 })).toEqual(['deck: cards is required']);
  });

  it('should report every problem, not only the first', () => {
    expect(
      errorsFor(
        deckWith({ ...validCard, text: '' }, { ...validCard, id: 'card-2', category: 'c9' }),
      ),
    ).toHaveLength(2);
  });
});

describe('findDuplicateCardIds', () => {
  const deckOne: Deck = {
    id: 'deck-1',
    version: 1,
    cards: [
      { id: 'card-1', category: 'c1', kind: 'solo', text: 'Card text one' },
      { id: 'card-2', category: 'c1', kind: 'solo', text: 'Card text two' },
    ],
  };
  const deckTwo: Deck = {
    id: 'deck-2',
    version: 1,
    cards: [{ id: 'card-3', category: 'c2', kind: 'together', text: 'Card text three' }],
  };

  it('should return nothing when every card id is used once', () => {
    expect(findDuplicateCardIds([deckOne, deckTwo])).toEqual([]);
  });

  it('should find an id used twice in one deck', () => {
    const repeatingDeck: Deck = {
      ...deckOne,
      cards: [...deckOne.cards, ...deckOne.cards.slice(0, 1)],
    };

    expect(findDuplicateCardIds([repeatingDeck])).toEqual(['card-1']);
  });

  it('should find an id used in two decks', () => {
    const clashingDeck: Deck = { ...deckTwo, cards: deckOne.cards.slice(1) };

    expect(findDuplicateCardIds([deckOne, clashingDeck])).toEqual(['card-2']);
  });

  it('should list an id once however many times it repeats', () => {
    expect(findDuplicateCardIds([deckOne, deckOne, deckOne])).toEqual(['card-1', 'card-2']);
  });
});
