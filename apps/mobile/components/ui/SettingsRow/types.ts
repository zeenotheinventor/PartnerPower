export type SettingsRowProps = {
  label: string;
  /** What the row is set to now, such as "On, PIN". It is part of the accessible name. */
  value?: string;
  /** A line under the label. It is the hint of the row, not part of its name. */
  caption?: string;
  onPress: () => void;
  /** `danger` is for a row that destroys data. It has no value. */
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** False for a row that opens a dialog or acts in place, because it does not open a screen. */
  showChevron?: boolean;
};
