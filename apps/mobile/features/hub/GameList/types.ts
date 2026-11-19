import type { GameStatus } from '@getfreak/core';
import type { ReactNode } from 'react';

/** A game as the hub shows it: its registry entry together with the words that name it. */
export type ListedGame = {
  id: string;
  title: string;
  description: string;
  status: GameStatus;
  entryRoute: string;
  /** Decorative art for the tile, such as a character. */
  decoration?: ReactNode;
};

export type GameListProps = {
  games: readonly ListedGame[];
  /** Called with the entry route of an available game when its tile is pressed. */
  onOpen: (entryRoute: string) => void;
};
