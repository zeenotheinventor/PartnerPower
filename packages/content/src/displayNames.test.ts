import {
  categoryIds,
  gameIds,
  levelIds,
  questionFormats,
  surpriseIds,
  topicIds,
} from '@getfreak/core';

import {
  categoryNames,
  displayNames,
  levelNames,
  questionFormatNames,
  surpriseNames,
  topicNames,
} from './displayNames';

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

describe('surpriseNames', () => {
  it.each(surpriseIds)('should give the %s surprise a non-empty name', (surpriseId) => {
    expect(surpriseNames[surpriseId].trim()).not.toBe('');
  });

  it('should name no surprise that is not defined', () => {
    expect(Object.keys(surpriseNames).sort()).toEqual([...surpriseIds].sort());
  });
});

describe('question names', () => {
  it.each(questionFormats)('should give format %s a non-empty name', (format) => {
    expect(questionFormatNames[format].trim()).not.toBe('');
  });

  it.each(topicIds)('should give topic %s a non-empty name', (topicId) => {
    expect(topicNames[topicId].trim()).not.toBe('');
  });

  it('should name no format or topic that is not defined', () => {
    expect(Object.keys(questionFormatNames).sort()).toEqual([...questionFormats].sort());
    expect(Object.keys(topicNames).sort()).toEqual([...topicIds].sort());
  });

  it('should name the formats as the game shows them', () => {
    expect(questionFormatNames).toEqual({
      ifYou: 'Drink if',
      neverHave: 'Never have I ever',
      guess: 'Guess your partner',
      eitherOr: 'Would you rather',
      secretMatch: 'Secret match',
    });
  });

  it('should name the topics as the game shows them', () => {
    expect(topicNames).toEqual({
      t1: 'Favourites',
      t2: 'Turn-ons and turn-offs',
      t3: 'Fantasies',
      t4: 'Kinks and fetishes',
      t5: 'History',
      t6: 'Wishlist',
    });
  });
});
