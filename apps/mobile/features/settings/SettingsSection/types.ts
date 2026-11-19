import type { ReactNode } from 'react';

export type SettingsSectionProps = {
  /** The caption over the card, such as "Privacy". */
  label: string;
  /** The rows. A row that is not there is skipped, and a divider goes between the rest. */
  children: ReactNode;
};
