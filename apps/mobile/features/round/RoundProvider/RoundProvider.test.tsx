import type { Deck, RoundSetup } from '@getfreak/core';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RoundProvider } from './RoundProvider';
import { useRound } from './useRound';

const deck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [
    { id: 'card-1', category: 'c1', kind: 'solo', text: 'Card 1', source: 'shipped' },
    { id: 'card-2', category: 'c1', kind: 'solo', text: 'Card 2', source: 'shipped' },
  ],
};

const setup: RoundSetup = {
  players: ['Player A', 'Player B'],
  level: 'l1',
  enabledCategories: ['c1'],
  length: 10,
  seed: 7,
};

function renderRound() {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <RoundProvider>{children}</RoundProvider>
  );
  return renderHook(() => useRound(), { wrapper });
}

describe('RoundProvider', () => {
  it('should hold no round until one is started', () => {
    const { result } = renderRound();

    expect(result.current.round).toBeUndefined();
  });

  it('should hold the round that a started round gives', () => {
    const { result } = renderRound();

    act(() => result.current.startNewRound(setup, deck));

    expect(result.current.round?.players).toEqual(['Player A', 'Player B']);
    expect(result.current.round?.current?.card.category).toBe('c1');
  });

  it('should replace the round when another is started', () => {
    const { result } = renderRound();
    act(() => result.current.startNewRound(setup, deck));

    act(() => result.current.startNewRound({ ...setup, players: ['Player C', 'Player D'] }, deck));

    expect(result.current.round?.players).toEqual(['Player C', 'Player D']);
    expect(result.current.round?.history).toEqual([]);
  });

  it('should apply a round action through the round engine', () => {
    const { result } = renderRound();
    act(() => result.current.startNewRound(setup, deck));

    act(() => result.current.dispatch({ type: 'done' }));
    expect(result.current.round?.history).toHaveLength(1);

    act(() => result.current.dispatch({ type: 'end' }));
    expect(result.current.round?.current).toBeNull();
  });

  it('should ignore a round action while there is no round', () => {
    const { result } = renderRound();

    act(() => result.current.dispatch({ type: 'done' }));

    expect(result.current.round).toBeUndefined();
  });

  it('should hold no last start until a round is started', () => {
    const { result } = renderRound();

    expect(result.current.lastStart).toBeUndefined();
  });

  it('should keep the setup and deck of the round that was last started', () => {
    const { result } = renderRound();

    act(() => result.current.startNewRound(setup, deck));
    act(() => result.current.dispatch({ type: 'done' }));

    expect(result.current.lastStart).toEqual({ setup, deck });
  });

  it('should replace the last start when another round is started', () => {
    const { result } = renderRound();
    act(() => result.current.startNewRound(setup, deck));

    act(() => result.current.startNewRound({ ...setup, seed: 8 }, deck));

    expect(result.current.lastStart?.setup.seed).toBe(8);
  });

  it('should fail clearly when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useRound())).toThrow('useRound needs a RoundProvider');
  });
});
