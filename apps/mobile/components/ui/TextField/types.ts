export type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
  /** Lets the text run over several lines. The input is three lines high and grows with the text. */
  multiline?: boolean;
  /** How much has been written, shown as "count/maxCount" under the field. Needs `maxCount`. */
  count?: number;
  /** The most the field should hold. It only draws the count, so `maxLength` is what stops typing. */
  maxCount?: number;
  /** The count in words, such as "23 of 140 characters", read with the field. Its copy is the caller's. */
  countHint?: string;
  /** A message under the field. It is read with the field, and the box takes the accent colour. */
  error?: string;
};
