export const gameIds = ['dares', 'questions'] as const;

export type GameId = (typeof gameIds)[number];

export function isGameId(value: string): value is GameId {
  return gameIds.some((gameId) => gameId === value);
}
