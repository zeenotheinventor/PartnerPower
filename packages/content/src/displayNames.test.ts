import { gameIds } from '@getfreak/core';

import { displayNames } from './displayNames';

describe('displayNames', () => {
  it.each(gameIds)('should give the %s game a title and a description', (gameId) => {
    expect(displayNames[gameId].title.trim()).not.toBe('');
    expect(displayNames[gameId].description.trim()).not.toBe('');
  });

  it('should name no game that is not registered', () => {
    expect(Object.keys(displayNames).sort()).toEqual([...gameIds].sort());
  });
});
