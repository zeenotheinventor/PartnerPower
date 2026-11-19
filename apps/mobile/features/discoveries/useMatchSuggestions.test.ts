import type { Card, Deck, Discovery, QuestionDeck } from '@getfreak/core';
import { renderHook } from '@testing-library/react-native';

import { useMatchSuggestions } from './useMatchSuggestions';

const mockDecks: Deck[] = [];
const mockQuestionDecks: QuestionDeck[] = [];
// The decks are read when they are used, because this factory runs before the arrays above exist.
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  const withDecks = Object.defineProperty({ ...actual }, 'decks', {
    get: () => mockDecks,
    enumerable: true,
  });
  return Object.defineProperty(withDecks, 'questionDecks', {
    get: () => mockQuestionDecks,
    enumerable: true,
  });
});

const dare = (number: number): Card => ({
  id: `card-${String(number).padStart(2, '0')}`,
  category: 'c1',
  kind: 'solo',
  text: `Placeholder dare ${number}`,
  source: 'shipped',
  tags: ['tag-a'],
});

const matchOf = (questionId: string): Discovery => ({
  kind: 'match',
  questionId,
  strength: 'yes',
  date: '2026-01-01T00:00:00.000Z',
});

function useDares(count: number) {
  mockDecks.splice(0, mockDecks.length, {
    id: 'test-deck',
    version: 1,
    cards: Array.from({ length: count }, (_, index) => dare(index + 1)),
  });
}

describe('useMatchSuggestions', () => {
  beforeEach(() => {
    mockQuestionDecks.splice(0, mockQuestionDecks.length, {
      id: 'secretMatch',
      version: 1,
      questions: [
        {
          id: 'm-1',
          format: 'secretMatch',
          category: 'c1',
          topic: 't1',
          source: 'shipped',
          text: 'Item one',
          tags: ['tag-a'],
        },
      ],
    });
  });

  it('should show up to five dares, best first, when there are enough to play', () => {
    useDares(30);

    const { result } = renderHook(() => useMatchSuggestions([matchOf('m-1')]));

    expect(result.current.dares.map((card) => card.id)).toEqual([
      'card-01',
      'card-02',
      'card-03',
      'card-04',
      'card-05',
    ]);
    expect(result.current.canPlay).toBe(true);
  });

  it('should let a round be played with exactly five suggestions', () => {
    useDares(5);

    const { result } = renderHook(() => useMatchSuggestions([matchOf('m-1')]));

    expect(result.current.dares).toHaveLength(5);
    expect(result.current.canPlay).toBe(true);
  });

  it('should not let a round be played with four suggestions, and show none', () => {
    useDares(4);

    const { result } = renderHook(() => useMatchSuggestions([matchOf('m-1')]));

    expect(result.current.canPlay).toBe(false);
    expect(result.current.dares).toEqual([]);
  });

  it('should offer nothing when nothing is matched', () => {
    useDares(30);

    const { result } = renderHook(() => useMatchSuggestions([]));

    expect(result.current).toEqual({ dares: [], canPlay: false });
  });

  it('should follow the matches it is given', () => {
    useDares(30);
    let discoveries: Discovery[] = [];
    const { result, rerender } = renderHook(() => useMatchSuggestions(discoveries));
    expect(result.current.canPlay).toBe(false);

    discoveries = [matchOf('m-1')];
    rerender(undefined);

    expect(result.current.canPlay).toBe(true);
  });
});
