import type { Discovery, Question, QuestionDeck } from '@getfreak/core';

import { matchedItemsOf } from './matchedItems';

const mockQuestionDecks: QuestionDeck[] = [];
// The decks are read when they are used, because this factory runs before the array above exists.
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return Object.defineProperty({ ...actual }, 'questionDecks', {
    get: () => mockQuestionDecks,
    enumerable: true,
  });
});

const item = (id: string, tags: string[]): Question => ({
  id,
  format: 'secretMatch',
  category: 'c1',
  topic: 't1',
  source: 'shipped',
  text: `Item ${id}`,
  tags,
});

const eitherOr: Question = {
  id: 'e-1',
  format: 'eitherOr',
  category: 'c1',
  topic: 't1',
  source: 'shipped',
  options: [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
  ],
};

const matchOf = (questionId: string, strength: 'yes' | 'maybe'): Discovery => ({
  kind: 'match',
  questionId,
  strength,
  date: '2026-01-01T00:00:00.000Z',
});

describe('matchedItemsOf', () => {
  beforeEach(() => {
    mockQuestionDecks.splice(0, mockQuestionDecks.length, {
      id: 'secretMatch',
      version: 1,
      questions: [item('m-1', ['tag-a', 'tag-b']), item('m-2', ['tag-c']), eitherOr],
    });
  });

  it('should give the strength and the current tags of each matched item', () => {
    expect(matchedItemsOf([matchOf('m-1', 'yes'), matchOf('m-2', 'maybe')])).toEqual([
      { strength: 'yes', tags: ['tag-a', 'tag-b'] },
      { strength: 'maybe', tags: ['tag-c'] },
    ]);
  });

  it('should leave out a match whose item is not in the content now', () => {
    expect(matchedItemsOf([matchOf('gone', 'yes')])).toEqual([]);
  });

  it('should leave out what is not a match', () => {
    const agreement: Discovery = {
      kind: 'agree',
      questionId: 'e-1',
      optionId: 'a',
      date: '2026-01-01T00:00:00.000Z',
    };

    expect(matchedItemsOf([agreement])).toEqual([]);
  });

  it('should leave out a match on a question that is not a secret match item', () => {
    expect(matchedItemsOf([matchOf('e-1', 'yes')])).toEqual([]);
  });
});
