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

  it('should make the first game available, opening on its setup', () => {
    expect(gameEntries[0]).toEqual({
      id: 'dares',
      status: 'available',
      entryRoute: '/games/dares/setup',
    });
  });

  it('should make the second game available, opening on its home', () => {
    expect(gameEntries[1]).toEqual({
      id: 'questions',
      status: 'available',
      entryRoute: '/games/questions',
    });
  });
});
