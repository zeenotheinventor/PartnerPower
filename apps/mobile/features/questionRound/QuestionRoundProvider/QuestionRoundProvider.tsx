import {
  reduceQuestionRound,
  startQuestionRound,
  type Question,
  type QuestionRoundAction,
  type QuestionRoundSetup,
  type QuestionRoundState,
} from '@getfreak/core';
import { useCallback, useMemo, useReducer, type ReactNode } from 'react';

import { QuestionRoundContext } from './QuestionRoundContext';
import type { QuestionRoundContextValue, QuestionRoundStart } from './types';

type Session = {
  round: QuestionRoundState | undefined;
  lastStart: QuestionRoundStart | undefined;
};

type SessionAction =
  { type: 'started'; round: QuestionRoundState; start: QuestionRoundStart } | QuestionRoundAction;

const emptySession: Session = { round: undefined, lastStart: undefined };

// Starting a round throws on an invalid setup, so it happens in the callback below and the reducer
// stays pure. It only swaps the round in, or hands an action to the round engine.
function reduceSession(session: Session, action: SessionAction): Session {
  if (action.type === 'started') return { round: action.round, lastStart: action.start };
  return session.round
    ? { ...session, round: reduceQuestionRound(session.round, action) }
    : session;
}

/**
 * Holds the round for a route group, and the setup and questions it was started from. Leaving the
 * route group unmounts it, so both are discarded. Nothing from the round is stored or logged.
 */
export function QuestionRoundProvider({ children }: { children: ReactNode }) {
  const [{ round, lastStart }, dispatchSession] = useReducer(reduceSession, emptySession);

  const startNewRound = useCallback((setup: QuestionRoundSetup, questions: readonly Question[]) => {
    dispatchSession({
      type: 'started',
      round: startQuestionRound(setup, questions),
      start: { setup, questions },
    });
  }, []);

  const dispatch = useCallback((action: QuestionRoundAction) => dispatchSession(action), []);

  const value = useMemo<QuestionRoundContextValue>(
    () => ({ round, lastStart, startNewRound, dispatch }),
    [round, lastStart, startNewRound, dispatch],
  );

  return <QuestionRoundContext.Provider value={value}>{children}</QuestionRoundContext.Provider>;
}
