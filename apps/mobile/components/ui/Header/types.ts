import type { ReactNode } from 'react';

type BackButtonProps =
  | {
      /** What a screen reader says for the back button. */
      backLabel: string;
      onBack: () => void;
    }
  | { backLabel?: undefined; onBack?: undefined };

export type HeaderProps = {
  title: string;
  subtitle?: string;
  /** Shown at the end of the title row, such as an avatar. */
  trailing?: ReactNode;
} & BackButtonProps;
