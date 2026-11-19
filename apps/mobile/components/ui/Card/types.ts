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
  selected?: undefined;
};

type PressableCardProps = {
  onPress: () => void;
  /** The accessible name of the card. A pressable card is a button, so it needs one. */
  label: string;
  disabled?: boolean;
  grouped?: undefined;
  /**
   * Makes the card a choice. A card with a mark that is filled when it is true and empty when it is
   * false, announced as selected or not. Left out, the card is not a choice.
   */
  selected?: boolean;
};

export type ShownCardProps = {
  faceDown?: false;
  title?: undefined;
  mark?: undefined;
  children: ReactNode;
  category?: CategoryId;
  /** Edges the card in the accent colour in place of the category colour. */
  accent?: boolean;
} & (StaticCardProps | PressableCardProps);

/**
 * The back of a card, with no card text and no category, because the category is hidden too. It
 * draws its own back from a mark and a title. It is static and is one image named by `label`.
 */
export type FaceDownCardProps = {
  faceDown: true;
  /** The large mark in the middle of the back. */
  mark: string;
  /** What the card is, such as the name of the surprise, set under the mark. */
  title: string;
  /** The accessible name of the card. The mark and the title are not read separately. */
  label: string;
  children?: undefined;
  category?: undefined;
  accent?: undefined;
  onPress?: undefined;
  disabled?: undefined;
  grouped?: undefined;
  selected?: undefined;
};

export type CardProps = ShownCardProps | FaceDownCardProps;
