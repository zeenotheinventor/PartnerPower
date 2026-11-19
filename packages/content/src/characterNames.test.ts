import { characterIds } from '@getfreak/core';

import { characterNames } from './displayNames';

describe('characterNames', () => {
  it.each(characterIds)('should give the %s character a name and a personality line', (id) => {
    expect(characterNames[id].name.trim()).not.toBe('');
    expect(characterNames[id].personality.trim()).not.toBe('');
  });

  it('should name no character that is not registered', () => {
    expect(Object.keys(characterNames).sort()).toEqual([...characterIds].sort());
  });
});
