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
import type { RoundContextValue, RoundStart } from './types';

type Session = { round: RoundState | undefined; lastStart: RoundStart | undefined };

type SessionAction = { type: 'started'; round: RoundState; start: RoundStart } | RoundAction;

const emptySession: Session = { round: undefined, lastStart: undefined };

// Starting a round throws on an invalid setup, so it happens in the callback below and the reducer
// stays pure. It only swaps the round in, or hands an action to the round engine.
function reduceSession(session: Session, action: SessionAction): Session {
  if (action.type === 'started') return { round: action.round, lastStart: action.start };
  return session.round ? { ...session, round: reduceRound(session.round, action) } : session;
}

/**
 * Holds the round for a route group, and the setup and deck it was started from. Leaving the route
 * group unmounts it, so both are discarded. Nothing from the round is stored or logged.
 */
export function RoundProvider({ children }: { children: ReactNode }) {
  const [{ round, lastStart }, dispatchSession] = useReducer(reduceSession, emptySession);

  const startNewRound = useCallback((setup: RoundSetup, deck: Deck) => {
    dispatchSession({ type: 'started', round: startRound(setup, deck), start: { setup, deck } });
  }, []);

  const dispatch = useCallback((action: RoundAction) => dispatchSession(action), []);

  const value = useMemo<RoundContextValue>(
    () => ({ round, lastStart, startNewRound, dispatch }),
    [round, lastStart, startNewRound, dispatch],
  );

  return <RoundContext.Provider value={value}>{children}</RoundContext.Provider>;
}
