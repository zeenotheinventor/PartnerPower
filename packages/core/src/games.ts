export const gameIds = ['dares', 'questions'] as const;

export type GameId = (typeof gameIds)[number];

export function isGameId(value: string): value is GameId {
  return gameIds.some((gameId) => gameId === value);
}

export type GameStatus = 'available' | 'comingSoon';

export type GameEntry = {
  id: GameId;
  status: GameStatus;
  setupRoute: string;
};

/** The one place a game is registered. The hub shows these in this order. */
export const gameEntries: readonly GameEntry[] = [
  { id: 'dares', status: 'available', setupRoute: '/games/dares/setup' },
  { id: 'questions', status: 'comingSoon', setupRoute: '/games/questions/setup' },
];
