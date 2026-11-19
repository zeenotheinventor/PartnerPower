export type FavouriteToggleProps = {
  /** The accessible name of the switch. The caller gives it, from content. */
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** The text of the card this is for. A screen reader says it as the hint of the switch. */
  context?: string;
};
