import type { ReactNode } from 'react';

import type { CategoryId } from '@getfreak/core';

type StaticCardProps = {
  onPress?: undefined;
  label?: undefined;
  disabled?: undefined;
  /**
   * By default a static card is one group that a screen reader reads together. Pass false for a
   * card whose children should be read separately, such as one that holds a heading.
   */
  grouped?: boolean;
};

type PressableCardProps = {
  onPress: () => void;
  /** The accessible name of the card. A pressable card is a button, so it needs one. */
  label: string;
  disabled?: boolean;
  grouped?: undefined;
};

export type CardProps = {
  children: ReactNode;
  category?: CategoryId;
} & (StaticCardProps | PressableCardProps);
