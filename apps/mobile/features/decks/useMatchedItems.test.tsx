import type { QuestionDeck } from '@getfreak/core';
import { renderHook, waitFor } from '@testing-library/react-native';

import { makeOwnCardsFixture } from '../ownCards/testing/ownCardsFixture';
import { useMatchedItems } from './useMatchedItems';

// The hook reads when the screen has focus, which is when it first shows. The router's focus hook
// is replaced by one that runs the callback when the screen mounts.
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
}));

const mockQuestionDecks: QuestionDeck[] = [];
// The decks are read when they are used, because this factory runs before the array above exists.
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return Object.defineProperty({ ...actual }, 'questionDecks', {
    get: () => mockQuestionDecks,
    enumerable: true,
  });
});

describe('useMatchedItems', () => {
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

  it('should hold nothing until the matches have been read', async () => {
    const fixture = makeOwnCardsFixture({ holdLoad: true });
    const { result } = renderHook(() => useMatchedItems(), { wrapper: fixture.Providers });

    expect(result.current.matchedItems).toBeUndefined();
    expect(result.current.isReadOnFocus).toBe(false);

    fixture.releaseLoad();
    await waitFor(() => expect(result.current.matchedItems).toEqual([]));
  });

  it('should hold the stored matches with the tags the content gives them now', async () => {
    const fixture = makeOwnCardsFixture({ shippedMatchItemIds: ['m-1'] });
    await fixture.repository.addDiscoveries([
      { kind: 'match', questionId: 'm-1', strength: 'yes' },
    ]);

    const { result } = renderHook(() => useMatchedItems(), { wrapper: fixture.Providers });

    await waitFor(() =>
      expect(result.current.matchedItems).toEqual([{ strength: 'yes', tags: ['tag-a'] }]),
    );
  });

  it('should hold an empty list when the discoveries cannot be read', async () => {
    const fixture = makeOwnCardsFixture();
    jest.spyOn(fixture.repository, 'listDiscoveries').mockRejectedValue(new Error('unreadable'));

    const { result } = renderHook(() => useMatchedItems(), { wrapper: fixture.Providers });

    await waitFor(() => expect(result.current.matchedItems).toEqual([]));
    expect(result.current.isReadOnFocus).toBe(true);
  });

  it('should say the list was read on this focus once the read has finished', async () => {
    const fixture = makeOwnCardsFixture();
    const { result } = renderHook(() => useMatchedItems(), { wrapper: fixture.Providers });

    await waitFor(() => expect(result.current.isReadOnFocus).toBe(true));
  });
});
