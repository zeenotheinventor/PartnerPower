import { renderHook, waitFor } from '@testing-library/react-native';

import { makeOwnCardsFixture } from '../ownCards/testing/ownCardsFixture';
import { useFavouriteIds } from './useFavouriteIds';

// The hook reads when the screen has focus, which is when it first shows. The router's focus hook
// is replaced by one that runs the callback when the screen mounts.
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
}));

describe('useFavouriteIds', () => {
  it('should hold nothing until the favourites have been read', async () => {
    const fixture = makeOwnCardsFixture({ holdLoad: true });
    const { result } = renderHook(() => useFavouriteIds(), { wrapper: fixture.Providers });

    expect(result.current).toBeUndefined();

    fixture.releaseLoad();
    await waitFor(() => expect(result.current).toBeDefined());
  });

  it('should hold the cards that are favourites', async () => {
    const fixture = makeOwnCardsFixture({ shippedTexts: ['Card text 1', 'Card text 2'] });
    await fixture.repository.setFavourite('card-1', true);
    await fixture.repository.setFavourite('card-2', true);

    const { result } = renderHook(() => useFavouriteIds(), { wrapper: fixture.Providers });

    await waitFor(() => expect(result.current).toEqual(new Set(['card-1', 'card-2'])));
  });

  it('should hold an empty set when the favourites cannot be read', async () => {
    const fixture = makeOwnCardsFixture();
    jest.spyOn(fixture.repository, 'listFavourites').mockRejectedValue(new Error('unreadable'));

    const { result } = renderHook(() => useFavouriteIds(), { wrapper: fixture.Providers });

    await waitFor(() => expect(result.current).toEqual(new Set()));
  });
});
