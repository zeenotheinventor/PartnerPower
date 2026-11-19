import type { QuestionOption } from '@getfreak/core';

import type { TurnChrome } from '../TurnFrame';

export type PickViewProps = {
  frame: TurnChrome;
  format: 'eitherOr' | 'guess';
  /** `answering` is the holder's pick. `secondPick` is the other player's pick or guess. */
  stage: 'answering' | 'secondPick';
  /** Who holds the phone. */
  holderName: string;
  otherName: string;
  /** Shown in this order at both stages, so the order tells nothing about the first pick. */
  options: readonly QuestionOption[];
  onPick: (optionId: string) => void;
  onNotThisOne: () => void;
};
