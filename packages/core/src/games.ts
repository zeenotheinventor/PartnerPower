export const gameIds = ['dares', 'questions'] as const;

export type GameId = (typeof gameIds)[number];

export function isGameId(value: string): value is GameId {
  return gameIds.some((gameId) => gameId === value);
}

export type GameStatus = 'available' | 'comingSoon';

export type GameEntry = {
  id: GameId;
  status: GameStatus;
  /** Where the hub tile opens: a game's setup, or its own home when it has one. */
  entryRoute: string;
};

/** The one place a game is registered. The hub shows these in this order. */
export const gameEntries: readonly GameEntry[] = [
  { id: 'dares', status: 'available', entryRoute: '/games/dares/setup' },
  { id: 'questions', status: 'available', entryRoute: '/games/questions' },
];
