import {
  reduceRound,
  startRound,
  type Deck,
  type RoundAction,
  type RoundSetup,
  type RoundState,
} from '@getfreak/core';
import { useCallback, useMemo, useReducer, type ReactNode } from 'react';

import { RoundContext } from './RoundContext';
import type { RoundContextValue } from './types';

type SessionAction = { type: 'started'; round: RoundState } | RoundAction;

// Starting a round throws on an invalid setup, so it happens in the callback below and the reducer
// stays pure. It only swaps the round in, or hands an action to the round engine.
function reduceSession(round: RoundState | undefined, action: SessionAction) {
  if (action.type === 'started') return action.round;
  return round ? reduceRound(round, action) : round;
}

/**
 * Holds the round for a route group. Leaving the route group unmounts it, so the round is
 * discarded. Nothing from the round is stored or logged.
 */
export function RoundProvider({ children }: { children: ReactNode }) {
  const [round, dispatchSession] = useReducer(reduceSession, undefined);

  const startNewRound = useCallback((setup: RoundSetup, deck: Deck) => {
    dispatchSession({ type: 'started', round: startRound(setup, deck) });
  }, []);

  const dispatch = useCallback((action: RoundAction) => dispatchSession(action), []);

  const value = useMemo<RoundContextValue>(
    () => ({ round, startNewRound, dispatch }),
    [round, startNewRound, dispatch],
  );

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}
