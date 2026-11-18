import type { GameStatus } from '@getfreak/core';

/** A game as the hub shows it: its registry entry together with the words that name it. */
export type ListedGame = {
  id: string;
  title: string;
  description: string;
  status: GameStatus;
  setupRoute: string;
};

export type GameListProps = {
  games: readonly ListedGame[];
  /** Called with the setup route of an available game when its tile is pressed. */
  onOpen: (setupRoute: string) => void;
};
