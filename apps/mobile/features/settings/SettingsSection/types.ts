import type { ReactNode } from 'react';

export type SettingsSectionProps = {
  /** The caption over the card, such as "Privacy". A card with no caption leaves it out. */
  label?: string;
  /** The rows. A row that is not there is skipped, and a divider goes between the rest. */
  children: ReactNode;
};
