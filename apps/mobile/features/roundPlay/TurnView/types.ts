import type { CardKind, CategoryId } from '@getfreak/core';

import type { ButtonBounds, PressEffectKind } from '../pressEffect';

type TurnViewBaseProps = {
  /** Whose turn it is, or that it is both players. */
  turnLabel: string;
  /** The card number line, such as "Card 7 of 20". */
  countLabel: string;
  /** Leave out for an endless round, which has no end to measure against. */
  progress?: { number: number; length: number };
  category: CategoryId;
  categoryName: string;
  text: string;
  penaltyLine: string;
  /** True when the penalty line has been raised by a surprise, so it is set in the main colour. */
  isPenaltyRaised?: boolean;
  /** The name of the surprise the card carries, shown as a chip above the category chip. */
  surpriseName?: string;
  /** Set for a mystery dare. It is face down, with only Flip it to press, until it is flipped. */
  mystery?: { isFaceDown: boolean; onFlip: () => void };
  /** Set when the player holding the phone has a free pass that can be used on this card. */
  freePass?: { onUse: () => void };
  onDone: () => void;
  onPass: () => void;
  onEndRound: () => void;
  onNotThisOne: () => void;
  /** Called with the pressed answer button and where it is in the window, to play its effect. */
  onPressEffect: (kind: PressEffectKind, bounds: ButtonBounds) => void;
};

/** A together card also names both players, such as "Sam and Alex". */
export type TurnViewProps = TurnViewBaseProps &
  (
    | { kind: Extract<CardKind, 'solo'>; togetherNames?: undefined }
    | { kind: Extract<CardKind, 'together'>; togetherNames: string }
  );
