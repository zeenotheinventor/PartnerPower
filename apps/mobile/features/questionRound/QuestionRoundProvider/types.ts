import type {
  Question,
  QuestionRoundAction,
  QuestionRoundSetup,
  QuestionRoundState,
} from '@getfreak/core';

/** What a round was started from, kept in memory so the summary can start another like it. */
export type QuestionRoundStart = { setup: QuestionRoundSetup; questions: readonly Question[] };

export type QuestionRoundContextValue = {
  /** Undefined until a round has been started in this route group. */
  round: QuestionRoundState | undefined;
  /** Starts a round with the setup and the questions, replacing any round already held. */
  startNewRound: (setup: QuestionRoundSetup, questions: readonly Question[]) => void;
  /** The setup and questions of the round started last. Undefined until a round has been started. */
  lastStart: QuestionRoundStart | undefined;
  dispatch: (action: QuestionRoundAction) => void;
};
