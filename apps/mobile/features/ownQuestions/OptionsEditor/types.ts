import type { EditableFormat } from '../questionFields';

export type OptionsEditorProps = {
  format: EditableFormat;
  /** The wording of each option, as typed. */
  options: readonly string[];
  /** The message under each option, or undefined where it has none. */
  errors: readonly (string | undefined)[];
  onChangeOption: (index: number, text: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
};
