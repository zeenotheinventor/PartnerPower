export type HandoffViewProps = {
  /** Who receives the phone. */
  name: string;
  /** Who is told to look away. Left out for the first card, when nobody held the phone before. */
  previousName?: string;
  onContinue: () => void;
};
