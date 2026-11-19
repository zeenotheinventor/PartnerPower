import type { PlayableQuestion, PlayerIndex, QuestionReveal } from '@getfreak/core';

import type { TurnChrome } from '../TurnFrame';

export type RevealViewProps = {
  frame: TurnChrome;
  question: PlayableQuestion;
  /** What the engine worked out once the question was answered. */
  reveal: QuestionReveal;
  /** By player index. */
  playerNames: readonly [string, string];
  /** Who held the phone for this question. */
  holder: PlayerIndex;
  onNext: () => void;
};
