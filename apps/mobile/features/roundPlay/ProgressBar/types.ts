export type ProgressBarProps = {
  /** The card in play, counting from 1. */
  number: number;
  /** How many cards the round has. */
  length: number;
  /** What a screen reader says for the bar. */
  label: string;
};
