import { parseDeck, type Card } from './contentModel';
import {
  buildMatchesDeck,
  canOfferMatchesDeck,
  maximumMatchesDeckCards,
  minimumMatchesDeckCards,
  suggestDares,
  type MatchedItem,
} from './suggestions';

function card(id: string, category: Card['category'], tags?: string[]): Card {
  return { id, category, kind: 'solo', text: `Text ${id}`, source: 'shipped', tags };
}

function ids(cards: readonly Card[]): string[] {
  return cards.map((suggested) => suggested.id);
}

const yesOne: MatchedItem = { strength: 'yes', tags: ['tag-one'] };
const maybeOne: MatchedItem = { strength: 'maybe', tags: ['tag-one'] };
const yesTwo: MatchedItem = { strength: 'yes', tags: ['tag-two'] };
const maybeTwo: MatchedItem = { strength: 'maybe', tags: ['tag-two'] };

describe('suggestDares', () => {
  it('should return nothing when there are no matches', () => {
    expect(suggestDares([], [card('a', 'c1', ['tag-one'])])).toEqual([]);
  });

  it('should leave out dares that share no tag with a match', () => {
    expect(ids(suggestDares([yesOne], [card('a', 'c1', ['tag-two'])]))).toEqual([]);
  });

  it('should leave out dares with no tags', () => {
    const cards = [card('a', 'c1'), card('b', 'c1', ['tag-one'])];

    expect(ids(suggestDares([yesOne], cards))).toEqual(['b']);
  });

  it('should score a yes tag above a maybe tag', () => {
    const cards = [card('a', 'c1', ['tag-one']), card('b', 'c1', ['tag-two'])];

    expect(ids(suggestDares([maybeOne, yesTwo], cards))).toEqual(['b', 'a']);
  });

  it('should add up the strength of each distinct tag on a dare', () => {
    const cards = [card('single', 'c1', ['tag-one']), card('double', 'c4', ['tag-one', 'tag-two'])];

    expect(ids(suggestDares([yesOne, maybeTwo], cards))).toEqual(['double', 'single']);
  });

  it('should give a tag the strength of the strongest match that carries it', () => {
    const cards = [card('a', 'c2', ['tag-one']), card('b', 'c1', ['tag-two'])];

    expect(ids(suggestDares([yesOne, maybeOne, maybeTwo], cards))).toEqual(['a', 'b']);
    expect(ids(suggestDares([maybeOne, yesOne, maybeTwo], cards))).toEqual(['a', 'b']);
  });

  it('should count a tag once however many matches carry it', () => {
    const cards = [card('a', 'c1', ['tag-one']), card('b', 'c1', ['tag-two', 'tag-three'])];
    const matches: MatchedItem[] = [
      yesOne,
      yesOne,
      yesOne,
      { strength: 'maybe', tags: ['tag-two', 'tag-three'] },
    ];

    expect(ids(suggestDares(matches, cards))).toEqual(['a', 'b']);
  });

  it('should count a tag once when a dare repeats it', () => {
    const cards = [
      card('a', 'c1', ['tag-one', 'tag-one']),
      card('b', 'c1', ['tag-two', 'tag-three']),
    ];
    const yesThree: MatchedItem = { strength: 'yes', tags: ['tag-three'] };

    expect(ids(suggestDares([yesOne, yesTwo, yesThree], cards))).toEqual(['b', 'a']);
  });

  it('should return nothing for a negative limit', () => {
    const cards = [card('a', 'c1', ['tag-one']), card('b', 'c1', ['tag-one'])];

    expect(suggestDares([yesOne], cards, { limit: -1 })).toEqual([]);
  });

  it('should rank equal scores by category from mild to bold, then by id', () => {
    const cards = [
      card('z', 'c1', ['tag-one']),
      card('b', 'c3', ['tag-one']),
      card('a', 'c3', ['tag-one']),
      card('c', 'c2', ['tag-one']),
    ];

    expect(ids(suggestDares([yesOne], cards))).toEqual(['z', 'c', 'a', 'b']);
  });

  it('should rank the same way whatever order the dares arrive in', () => {
    const cards = [
      card('a', 'c2', ['tag-one']),
      card('b', 'c1', ['tag-one', 'tag-two']),
      card('c', 'c1', ['tag-one']),
    ];
    const matches = [yesOne, yesTwo];

    expect(ids(suggestDares(matches, [...cards].reverse()))).toEqual(
      ids(suggestDares(matches, cards)),
    );
  });

  it('should return at most ten dares by default', () => {
    const cards = Array.from({ length: 12 }, (_, index) =>
      card(`card-${String(index).padStart(2, '0')}`, 'c1', ['tag-one']),
    );

    expect(suggestDares([yesOne], cards)).toHaveLength(10);
  });

  it('should keep the best dares when the limit cuts the list', () => {
    const cards = [card('a', 'c1', ['tag-one']), card('b', 'c1', ['tag-one', 'tag-two'])];

    expect(ids(suggestDares([yesOne, yesTwo], cards, { limit: 1 }))).toEqual(['b']);
  });

  it('should keep only dares in the given categories', () => {
    const cards = [
      card('a', 'c1', ['tag-one']),
      card('b', 'c2', ['tag-one']),
      card('c', 'c3', ['tag-one']),
    ];

    expect(ids(suggestDares([yesOne], cards, { categories: ['c2', 'c3'] }))).toEqual(['b', 'c']);
  });

  it('should apply the limit after the category filter', () => {
    const cards = [card('a', 'c1', ['tag-one']), card('b', 'c2', ['tag-one'])];

    expect(ids(suggestDares([yesOne], cards, { categories: ['c2'], limit: 1 }))).toEqual(['b']);
  });

  it('should not change the cards it is given', () => {
    const cards = [card('b', 'c2', ['tag-one']), card('a', 'c1', ['tag-one'])];
    const before = structuredClone(cards);

    suggestDares([yesOne], cards);

    expect(cards).toEqual(before);
  });
});

describe('buildMatchesDeck', () => {
  const cards = Array.from({ length: 25 }, (_, index) => card(`card-${index}`, 'c1', ['tag-one']));

  it('should build a deck with the id matches and version 1', () => {
    expect(buildMatchesDeck(cards.slice(0, 6))).toMatchObject({ id: 'matches', version: 1 });
  });

  it('should hold the cards it is given, in order', () => {
    expect(ids(buildMatchesDeck(cards.slice(0, 6)).cards)).toEqual(ids(cards.slice(0, 6)));
  });

  it('should hold at most twenty cards', () => {
    expect(buildMatchesDeck(cards).cards).toHaveLength(20);
  });

  it('should build a deck that passes validation', () => {
    const deck = buildMatchesDeck(cards);

    expect(parseDeck(deck)).toEqual({ success: true, deck });
  });
});

describe('canOfferMatchesDeck', () => {
  function cardsOfCount(count: number): Card[] {
    return Array.from({ length: count }, (_, index) => card(`card-${index}`, 'c1'));
  }

  it('should state the limits as five and twenty', () => {
    expect([minimumMatchesDeckCards, maximumMatchesDeckCards]).toEqual([5, 20]);
  });

  it('should not offer a deck for four suggestions', () => {
    expect(canOfferMatchesDeck(cardsOfCount(4))).toBe(false);
  });

  it('should offer a deck for five suggestions', () => {
    expect(canOfferMatchesDeck(cardsOfCount(5))).toBe(true);
  });
});
