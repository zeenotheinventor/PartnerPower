import type { GameStatus } from '@getfreak/core';

export type GameTileProps = {
  title: string;
  description: string;
  status: GameStatus;
  onPress: () => void;
};
