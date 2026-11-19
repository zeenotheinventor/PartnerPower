import { surpriseIds } from '@getfreak/core';

import { isPlayableSurprise, playableSurprises } from './playableSurprises';

describe('playableSurprises', () => {
  it('should list every surprise the engine can deal, so setup passes all six', () => {
    expect([...playableSurprises].sort()).toEqual([...surpriseIds].sort());
  });

  it.each(surpriseIds)('should say that %s is playable', (surprise) => {
    expect(isPlayableSurprise(surprise)).toBe(true);
  });
});
