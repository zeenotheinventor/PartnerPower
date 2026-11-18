import { gameIds, isGameId } from './games';

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
