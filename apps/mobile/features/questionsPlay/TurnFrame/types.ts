import type { CategoryId } from '@getfreak/core';
import type { ReactNode } from 'react';

import type { MoodOf } from '../../../characters';
import type { QuestionPrompt } from '../questionCopy';

/** The moods Theo can show. */
export type TheoMood = MoodOf<'shy'>;

/** What every turn of a question shows, whatever its stage. */
export type TurnChrome = {
  /** The question number line, such as "Question 7 of 20". */
  countLabel: string;
  /** Leave out for an endless round, which has no end to measure against. */
  progress?: { number: number; length: number };
  category: CategoryId;
  categoryName: string;
  topicName: string;
  prompt: QuestionPrompt;
  /** What the question costs, under the prompt. */
  penaltyLine: string;
  onEndRound: () => void;
};

export type TurnFrameProps = TurnChrome & {
  /** Who does what next, or what the result was. It is the heading of the screen. */
  turnLine: string;
  /** Sets the turn line in the heading size, for a result or a guess, in place of the small size. */
  isTurnLineLarge?: boolean;
  /** Has a screen reader read the turn line out when it changes, as a result is. */
  isTurnLineAnnounced?: boolean;
  /** Theo's mood. In a bold category he is flustered, unless he is covering his eyes. */
  mood: TheoMood;
  /** Shown between the turn line and the card. */
  aboveCard?: ReactNode;
  /** Shows the Not this one link under the controls. Leave it out once the question is revealed. */
  onNotThisOne?: () => void;
  /** The controls or the result, under the card. */
  children: ReactNode;
};
