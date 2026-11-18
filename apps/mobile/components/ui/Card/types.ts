import type { ReactNode } from 'react';

import type { CategoryId } from '../CategoryId';

type StaticCardProps = {
  onPress?: undefined;
  label?: undefined;
  disabled?: undefined;
};

type PressableCardProps = {
  onPress: () => void;
  /** The accessible name of the card. A pressable card is a button, so it needs one. */
  label: string;
  disabled?: boolean;
};

export type CardProps = {
  children: ReactNode;
  category?: CategoryId;
} & (StaticCardProps | PressableCardProps);
