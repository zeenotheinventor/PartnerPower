import { decks } from './decks';
import { findUnknownTags, interestTags, isInterestTag } from './interestTags';
import { questionDecks } from './questions';

const tagPattern = /^[a-z]+(-[a-z]+)*$/;

describe('interestTags', () => {
  it('should hold between 15 and 30 tags', () => {
    expect(interestTags.length).toBeGreaterThanOrEqual(15);
    expect(interestTags.length).toBeLessThanOrEqual(30);
  });

  it('should write every tag as a lowercase word or hyphenated phrase', () => {
    expect(interestTags.filter((tag) => !tagPattern.test(tag))).toEqual([]);
  });

  it('should list each tag once', () => {
    expect(new Set(interestTags).size).toBe(interestTags.length);
  });
});

describe('isInterestTag', () => {
  it('should accept a tag in the vocabulary', () => {
    expect(isInterestTag(interestTags[0] ?? '')).toBe(true);
  });

  it('should reject a tag outside the vocabulary', () => {
    expect(isInterestTag('not-a-tag')).toBe(false);
  });
});

describe('findUnknownTags', () => {
  const known = interestTags[0] ?? '';

  it('should find nothing when every tag is in the vocabulary', () => {
    expect(findUnknownTags([{ id: 'item-1', tags: [known] }])).toEqual([]);
  });

  it('should skip items with no tags', () => {
    expect(findUnknownTags([{ id: 'item-1' }])).toEqual([]);
  });

  it('should name the item and the unknown tag', () => {
    const items = [
      { id: 'item-1', tags: [known] },
      { id: 'item-2', tags: [known, 'not-a-tag'] },
    ];

    expect(findUnknownTags(items)).toEqual(['item-2: unknown tag "not-a-tag"']);
  });
});

describe('shipped tags', () => {
  const dares = decks.flatMap((deck) => deck.cards);
  const secretMatchItems = questionDecks.flatMap((deck) => deck.questions);

  it('should use only vocabulary tags on dares', () => {
    expect(findUnknownTags(dares)).toEqual([]);
  });

  it('should use only vocabulary tags on secret match items', () => {
    const tagged = secretMatchItems.flatMap((item) =>
      item.format === 'secretMatch' ? [item] : [],
    );

    expect(tagged.length).toBeGreaterThan(0);
    expect(findUnknownTags(tagged)).toEqual([]);
  });

  it('should give every shipped dare between 1 and 3 tags', () => {
    const offending = dares.filter(
      (card) => card.tags === undefined || card.tags.length < 1 || card.tags.length > 3,
    );

    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('should not repeat a tag on one dare', () => {
    const offending = dares.filter((card) => new Set(card.tags).size !== (card.tags ?? []).length);

    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('should put every vocabulary tag on at least 2 dares', () => {
    const lonely = interestTags.filter(
      (tag) => dares.filter((card) => card.tags?.includes(tag)).length < 2,
    );

    expect(lonely).toEqual([]);
  });
});

describe('loading shipped data', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('./decks/starter.json');
    jest.dontMock('./questions/secretMatch.json');
  });

  it('should refuse a dare with an unknown tag', () => {
    jest.doMock('./decks/starter.json', () => ({
      id: 'starter',
      version: 1,
      cards: [
        {
          id: 'card-a',
          category: 'c1',
          kind: 'solo',
          text: 'Text',
          tags: ['not-a-tag'],
          source: 'shipped',
        },
      ],
    }));

    expect(() => jest.requireActual('./decks')).toThrow('card-a: unknown tag "not-a-tag"');
  });

  it('should refuse a secret match item with an unknown tag', () => {
    jest.doMock('./questions/secretMatch.json', () => ({
      id: 'secretMatch',
      version: 1,
      questions: [
        {
          id: 'item-a',
          format: 'secretMatch',
          category: 'c1',
          topic: 't1',
          text: 'Text',
          tags: ['not-a-tag'],
          source: 'shipped',
        },
      ],
    }));

    expect(() => jest.requireActual('./questions')).toThrow('item-a: unknown tag "not-a-tag"');
  });
});
