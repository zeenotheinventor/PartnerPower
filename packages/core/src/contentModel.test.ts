import {
  categories,
  categoriesForLevel,
  categoryIds,
  findDuplicateCardIds,
  isCategoryId,
  levelIds,
  levels,
  customDeckSchema,
  parseDeck,
  playerCardSchema,
  surpriseIds,
  withoutUnsupportedEffects,
  type Deck,
} from './contentModel';
import { limits } from './cardText';

const validCard = {
  id: 'card-1',
  category: 'c1',
  kind: 'solo',
  text: 'Card text one',
  source: 'shipped',
};

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
        source: 'shipped',
      }),
    );

    expect(result).toEqual({
      success: true,
      deck: deckWith(validCard, {
        id: 'card-2',
        category: 'c4',
        kind: 'together',
        text: 'Card text two',
        source: 'shipped',
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

  it('should accept a card from a player', () => {
    expect(parseDeck(deckWith({ ...validCard, source: 'player' })).success).toBe(true);
  });

  it.each([
    { type: 'timer', seconds: 5 },
    { type: 'timer', seconds: 120 },
    { type: 'vibrate', seconds: 1 },
    { type: 'vibrate', seconds: 30 },
  ])('should accept the effect %j', (effect) => {
    expect(parseDeck(deckWith({ ...validCard, effect })).success).toBe(true);
  });

  it.each([
    [{ type: 'timer', seconds: 4 }, 'timer seconds must be a whole number from 5 to 120'],
    [{ type: 'timer', seconds: 121 }, 'timer seconds must be a whole number from 5 to 120'],
    [{ type: 'timer', seconds: 5.5 }, 'timer seconds must be a whole number from 5 to 120'],
    [{ type: 'vibrate', seconds: 0 }, 'vibrate seconds must be a whole number from 1 to 30'],
    [{ type: 'vibrate', seconds: 31 }, 'vibrate seconds must be a whole number from 1 to 30'],
  ])('should name the card when its effect is %j', (effect, message) => {
    expect(errorsFor(deckWith({ ...validCard, effect }))).toEqual([
      `cards[0] (id "card-1"): ${message}`,
    ]);
  });

  it('should name the card when its effect type is unknown', () => {
    expect(errorsFor(deckWith({ ...validCard, effect: { type: 'flash', seconds: 5 } }))).toEqual([
      'cards[0] (id "card-1"): unknown effect type "flash", expected timer or vibrate',
    ]);
  });

  it('should name the card when its effect is a string', () => {
    expect(errorsFor(deckWith({ ...validCard, effect: 'skip' }))).toEqual([
      'cards[0] (id "card-1"): effect must be an object with a type and seconds',
    ]);
  });

  it('should name the card when its effect has no seconds', () => {
    expect(errorsFor(deckWith({ ...validCard, effect: { type: 'timer' } }))).toEqual([
      'cards[0] (id "card-1"): timer seconds must be a whole number from 5 to 120',
    ]);
  });

  it('should name the card when its source is missing', () => {
    const cardWithoutSource = { id: 'card-1', category: 'c1', kind: 'solo', text: 'Card text one' };

    expect(errorsFor(deckWith(cardWithoutSource))).toEqual([
      'cards[0] (id "card-1"): source is required',
    ]);
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
    const cardWithoutId = {
      category: 'c1',
      kind: 'solo',
      text: 'Card text one',
      source: 'shipped',
    };

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
      { id: 'card-1', category: 'c1', kind: 'solo', text: 'Card text one', source: 'shipped' },
      { id: 'card-2', category: 'c1', kind: 'solo', text: 'Card text two', source: 'shipped' },
    ],
  };
  const deckTwo: Deck = {
    id: 'deck-2',
    version: 1,
    cards: [
      {
        id: 'card-3',
        category: 'c2',
        kind: 'together',
        text: 'Card text three',
        source: 'shipped',
      },
    ],
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

const playerCardId = 'p-3b241101-e2bb-4255-8caf-4136c566a962';
const validPlayerCard = {
  id: playerCardId,
  category: 'c2',
  kind: 'solo',
  text: 'Player text one',
  source: 'player',
};

describe('playerCardSchema', () => {
  it('should accept a valid player card', () => {
    expect(playerCardSchema.safeParse(validPlayerCard).data).toEqual(validPlayerCard);
  });

  it('should store the tidied text', () => {
    const result = playerCardSchema.safeParse({ ...validPlayerCard, text: '  Player \n text  ' });

    expect(result.data?.text).toBe('Player text');
  });

  it.each([
    '3b241101-e2bb-4255-8caf-4136c566a962',
    'p-123',
    'p-',
    'q-3b241101-e2bb-4255-8caf-4136c566a962',
  ])('should reject the id "%s"', (id) => {
    expect(playerCardSchema.safeParse({ ...validPlayerCard, id }).success).toBe(false);
  });

  it('should reject empty text', () => {
    expect(playerCardSchema.safeParse({ ...validPlayerCard, text: '  ' }).success).toBe(false);
  });

  it('should reject text over the limit', () => {
    const text = 'a'.repeat(limits.cardTextLength + 1);

    expect(playerCardSchema.safeParse({ ...validPlayerCard, text }).success).toBe(false);
  });

  it('should accept text of exactly the limit', () => {
    const text = 'a'.repeat(limits.cardTextLength);

    expect(playerCardSchema.safeParse({ ...validPlayerCard, text }).success).toBe(true);
  });

  it('should not apply the editorial rules for shipped cards', () => {
    const text = 'Tell her a secret; keep it - quietly';

    expect(playerCardSchema.safeParse({ ...validPlayerCard, text }).success).toBe(true);
  });

  it('should reject a shipped source', () => {
    expect(playerCardSchema.safeParse({ ...validPlayerCard, source: 'shipped' }).success).toBe(
      false,
    );
  });

  it('should reject an effect', () => {
    const effect = { type: 'timer', seconds: 10 };

    expect(playerCardSchema.safeParse({ ...validPlayerCard, effect }).success).toBe(false);
  });

  it('should reject an unknown category', () => {
    expect(playerCardSchema.safeParse({ ...validPlayerCard, category: 'c9' }).success).toBe(false);
  });
});

describe('customDeckSchema', () => {
  const validCustomDeck = { id: 'custom-1', name: 'Deck name', cardIds: ['a', 'b'] };

  it('should accept a valid custom deck', () => {
    expect(customDeckSchema.safeParse(validCustomDeck).data).toEqual(validCustomDeck);
  });

  it('should accept a deck with no cards', () => {
    expect(customDeckSchema.safeParse({ ...validCustomDeck, cardIds: [] }).success).toBe(true);
  });

  it('should trim the name', () => {
    expect(customDeckSchema.safeParse({ ...validCustomDeck, name: '  Deck  ' }).data?.name).toBe(
      'Deck',
    );
  });

  it('should reject a name that is empty after trimming', () => {
    expect(customDeckSchema.safeParse({ ...validCustomDeck, name: '   ' }).success).toBe(false);
  });

  it('should accept a name of exactly the limit', () => {
    const name = 'a'.repeat(limits.deckNameLength);

    expect(customDeckSchema.safeParse({ ...validCustomDeck, name }).success).toBe(true);
  });

  it('should reject a name over the limit', () => {
    const name = 'a'.repeat(limits.deckNameLength + 1);

    expect(customDeckSchema.safeParse({ ...validCustomDeck, name }).success).toBe(false);
  });

  it('should reject a repeated card id', () => {
    expect(customDeckSchema.safeParse({ ...validCustomDeck, cardIds: ['a', 'a'] }).success).toBe(
      false,
    );
  });

  it('should accept exactly the most cards', () => {
    const cardIds = Array.from({ length: limits.cardsPerCustomDeck }, (_, index) => `c${index}`);

    expect(customDeckSchema.safeParse({ ...validCustomDeck, cardIds }).success).toBe(true);
  });

  it('should reject one card more than the limit', () => {
    const cardIds = Array.from(
      { length: limits.cardsPerCustomDeck + 1 },
      (_, index) => `c${index}`,
    );

    expect(customDeckSchema.safeParse({ ...validCustomDeck, cardIds }).success).toBe(false);
  });

  it('should reject an unrecognised field', () => {
    expect(customDeckSchema.safeParse({ ...validCustomDeck, colour: 'red' }).success).toBe(false);
  });
});

describe('surpriseIds', () => {
  it('should list the surprises', () => {
    expect(surpriseIds).toEqual(['mystery', 'jump', 'swap', 'choice', 'timer', 'freePass']);
  });
});

describe('withoutUnsupportedEffects', () => {
  const plainCard = { ...validCard, id: 'plain' };
  const timerCard = { ...validCard, id: 'timer', effect: { type: 'timer', seconds: 10 } } as const;
  const vibrateCard = {
    ...validCard,
    id: 'vibrate',
    effect: { type: 'vibrate', seconds: 10 },
  } as const;
  const deck: Deck = {
    id: 'deck-1',
    version: 1,
    cards: [
      { ...plainCard, category: 'c1', kind: 'solo', source: 'shipped' },
      { ...timerCard, category: 'c1', kind: 'solo', source: 'shipped' },
      { ...vibrateCard, category: 'c1', kind: 'solo', source: 'shipped' },
    ],
  };

  it('should keep every card when the phone can vibrate', () => {
    expect(withoutUnsupportedEffects(deck, { vibrate: true })).toEqual(deck);
  });

  it('should drop the vibrate cards when the phone cannot vibrate', () => {
    const result = withoutUnsupportedEffects(deck, { vibrate: false });

    expect(result.cards.map((card) => card.id)).toEqual(['plain', 'timer']);
  });

  it('should keep the rest of the deck as it was', () => {
    const result = withoutUnsupportedEffects(deck, { vibrate: false });

    expect([result.id, result.version]).toEqual(['deck-1', 1]);
  });

  it('should not change the deck it was given', () => {
    withoutUnsupportedEffects(deck, { vibrate: false });

    expect(deck.cards).toHaveLength(3);
  });
});
