import { renderHook, waitFor } from '@testing-library/react-native';

import { makeOwnCardsFixture } from '../ownCards/testing/ownCardsFixture';
import { useCustomDecks } from './useCustomDecks';

// The hook reads when the screen has focus, which is when it first shows. The router's focus hook
// is replaced by one that runs the callback when the screen mounts.
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
}));

describe('useCustomDecks', () => {
  it('should hold nothing until the decks have been read', async () => {
    const fixture = makeOwnCardsFixture({ holdLoad: true });
    const { result } = renderHook(() => useCustomDecks(), { wrapper: fixture.Providers });

    expect(result.current).toBeUndefined();

    fixture.releaseLoad();
    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('should hold the stored decks', async () => {
    const fixture = makeOwnCardsFixture({ shippedTexts: ['Card text 1'] });
    await fixture.repository.saveDeck({ name: 'Placeholder deck', cardIds: ['card-1'] });

    const { result } = renderHook(() => useCustomDecks(), { wrapper: fixture.Providers });

    await waitFor(() =>
      expect(result.current?.map((deck) => [deck.name, deck.cardIds])).toEqual([
        ['Placeholder deck', ['card-1']],
      ]),
    );
  });

  it('should hold an empty list when the decks cannot be read', async () => {
    const fixture = makeOwnCardsFixture();
    jest.spyOn(fixture.repository, 'listDecks').mockRejectedValue(new Error('unreadable'));

    const { result } = renderHook(() => useCustomDecks(), { wrapper: fixture.Providers });

    await waitFor(() => expect(result.current).toEqual([]));
  });
});
