import { typeScale } from '@getfreak/tokens';

import { fontFiles } from './fontFiles';

describe('fontFiles', () => {
  it('should bundle exactly the font families the type scale uses', () => {
    const familiesUsed = new Set(Object.values(typeScale).map((style) => style.fontFamily));

    expect(Object.keys(fontFiles).sort()).toEqual([...familiesUsed].sort());
  });
});
