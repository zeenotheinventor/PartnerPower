import {
  reduceSecretMatch,
  secretMatchDiscoveries,
  startSecretMatch,
  viewSecretMatch,
  type Question,
  type SecretMatchAction,
  type SecretMatchSetup,
  type SecretMatchState,
} from '@getfreak/core';
import { useCallback, useMemo, useReducer, type ReactNode } from 'react';

import { SecretMatchContext } from './SecretMatchContext';
import type { SecretMatchContextValue } from './types';

type Session = {
  state: SecretMatchState | undefined;
  players: readonly [string, string] | undefined;
};

type SessionAction =
  { type: 'started'; state: SecretMatchState; players: Session['players'] } | SecretMatchAction;

const emptySession: Session = { state: undefined, players: undefined };

// Starting a session throws on an invalid setup, so it happens in the callback below and the
// reducer stays pure. It only swaps the session in, or hands an action to the engine.
function reduceSession(session: Session, action: SessionAction): Session {
  if (action.type === 'started') return { state: action.state, players: action.players };
  return session.state ? { ...session, state: reduceSecretMatch(session.state, action) } : session;
}

/**
 * Holds one secret match session for a route. It is in memory only: leaving the route unmounts it,
 * so the session is discarded by any way out. Nothing in it is stored or logged. Screens get the
 * engine's view, never the state, so they cannot show a rating that is not theirs to see.
 */
export function SecretMatchProvider({ children }: { children: ReactNode }) {
  const [{ state, players }, dispatchSession] = useReducer(reduceSession, emptySession);

  const start = useCallback((setup: SecretMatchSetup, questions: readonly Question[]) => {
    dispatchSession({
      type: 'started',
      state: startSecretMatch(setup, questions),
      players: setup.players,
    });
  }, []);

  const dispatch = useCallback((action: SecretMatchAction) => dispatchSession(action), []);

  const value = useMemo<SecretMatchContextValue>(
    () => ({
      view: state ? viewSecretMatch(state) : undefined,
      players,
      matchesToSave: state ? secretMatchDiscoveries(state) : [],
      start,
      dispatch,
    }),
    [state, players, start, dispatch],
  );

  return <SecretMatchContext.Provider value={value}>{children}</SecretMatchContext.Provider>;
}
