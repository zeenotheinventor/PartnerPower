import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { DeckChoiceProvider } from './DeckChoiceProvider';
import { useDeckChoice } from './useDeckChoice';

function wrapper({ children }: { children: ReactNode }) {
  return <DeckChoiceProvider>{children}</DeckChoiceProvider>;
}

describe('DeckChoiceProvider', () => {
  it('should choose the starter deck until another is chosen', () => {
    const { result } = renderHook(() => useDeckChoice(), { wrapper });

    expect(result.current.choice).toBe('starter');
  });

  it('should hold the deck that is chosen', () => {
    const { result } = renderHook(() => useDeckChoice(), { wrapper });

    act(() => result.current.chooseDeck('favourites'));

    expect(result.current.choice).toBe('favourites');
  });

  it('should start again from the starter deck in a new provider', () => {
    const first = renderHook(() => useDeckChoice(), { wrapper });
    act(() => first.result.current.chooseDeck('favourites'));
    first.unmount();

    const second = renderHook(() => useDeckChoice(), { wrapper });

    expect(second.result.current.choice).toBe('starter');
  });

  it('should say what is missing when used without the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useDeckChoice())).toThrow(
      'useDeckChoice needs a DeckChoiceProvider above it',
    );
  });
});
