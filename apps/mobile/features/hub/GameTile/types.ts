import type { GameStatus } from '@getfreak/core';
import type { ReactNode } from 'react';

export type GameTileProps = {
  title: string;
  description: string;
  status: GameStatus;
  /** Decorative art shown beside the words, such as a character. It adds nothing to the tile's name. */
  decoration?: ReactNode;
  onPress: () => void;
};
