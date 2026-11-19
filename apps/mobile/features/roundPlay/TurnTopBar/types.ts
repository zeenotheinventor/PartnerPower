export type TurnTopBarProps = {
  /** The card number line, such as "Card 7 of 20". */
  countLabel: string;
  /** Leave out for an endless round, which has no end to measure against. */
  progress?: { number: number; length: number };
  /** True while something on the card needs the screen left alone, such as a vibration. */
  isEndRoundDisabled?: boolean;
  onEndRound: () => void;
};
