export type SetupRowProps = {
  /** The small caption above the value, such as "Deck". */
  caption: string;
  /** What is chosen. Left out while it is being read, and the row then shows a blank line. */
  value?: string;
  /** The accessible name of the row, which says the caption and then the value. */
  name: string;
  onPress: () => void;
};
