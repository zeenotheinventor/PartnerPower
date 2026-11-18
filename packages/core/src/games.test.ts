import { gameEntries, gameIds, isGameId } from './games';

describe('gameIds', () => {
  it('should list the two games in registration order', () => {
    expect(gameIds).toEqual(['dares', 'questions']);
  });
});

describe('isGameId', () => {
  it('should accept a registered game id', () => {
    expect(isGameId('dares')).toBe(true);
  });

  it('should reject a value that is not a registered game id', () => {
    expect(isGameId('unknown')).toBe(false);
  });
});

describe('gameEntries', () => {
  it('should register each game id exactly once, in registration order', () => {
    expect(gameEntries.map((entry) => entry.id)).toEqual([...gameIds]);
  });

  it('should make the first game available with its setup route', () => {
    expect(gameEntries[0]).toEqual({
      id: 'dares',
      status: 'available',
      setupRoute: '/games/dares/setup',
    });
  });

  it('should mark the second game as coming soon with its setup route', () => {
    expect(gameEntries[1]).toEqual({
      id: 'questions',
      status: 'comingSoon',
      setupRoute: '/games/questions/setup',
    });
  });
});
