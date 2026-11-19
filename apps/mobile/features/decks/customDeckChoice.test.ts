import { customDeckChoice, customDeckIdOf } from './customDeckChoice';

describe('customDeckChoice', () => {
  it('should give the id back that it was made from', () => {
    expect(customDeckIdOf(customDeckChoice('d-1'))).toBe('d-1');
  });

  it('should give no id for the starter deck or for Favourites', () => {
    expect(customDeckIdOf('starter')).toBeUndefined();
    expect(customDeckIdOf('favourites')).toBeUndefined();
  });

  it('should keep a different choice for each deck', () => {
    expect(customDeckChoice('d-1')).not.toBe(customDeckChoice('d-2'));
  });
});
