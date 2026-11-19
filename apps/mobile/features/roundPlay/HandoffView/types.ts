export type HandoffViewProps = {
  /** Who receives the phone. */
  name: string;
  /** Who is told to look away. Left out for the first card, when nobody held the phone before. */
  previousName?: string;
  /** A line under the title that says what the player is about to do. Left out by default. */
  line?: string;
  onContinue: () => void;
};
