import { categoryIds, gameIds, levelIds } from '@getfreak/core';

import { categoryNames, displayNames, levelNames } from './displayNames';

describe('displayNames', () => {
  it.each(gameIds)('should give the %s game a title and a description', (gameId) => {
    expect(displayNames[gameId].title.trim()).not.toBe('');
    expect(displayNames[gameId].description.trim()).not.toBe('');
  });

  it('should name no game that is not registered', () => {
    expect(Object.keys(displayNames).sort()).toEqual([...gameIds].sort());
  });
});

describe('category and level names', () => {
  it.each(categoryIds)('should give category %s a non-empty name', (categoryId) => {
    expect(categoryNames[categoryId].trim()).not.toBe('');
  });

  it.each(levelIds)('should give level %s a non-empty name', (levelId) => {
    expect(levelNames[levelId].trim()).not.toBe('');
  });

  it('should name no category or level that is not defined', () => {
    expect(Object.keys(categoryNames).sort()).toEqual([...categoryIds].sort());
    expect(Object.keys(levelNames).sort()).toEqual([...levelIds].sort());
  });
});
