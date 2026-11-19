export type HandoffViewProps = {
  /** Who receives the phone. */
  name: string;
  /** Who is told to look away. Left out for the first card, when nobody held the phone before. */
  previousName?: string;
  /** A line to confirm what just happened, shown first on the screen. */
  notice?: string;
  onContinue: () => void;
};
