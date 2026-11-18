import { fillCopy } from './fillCopy';

describe('fillCopy', () => {
  it('should put a value in place of its placeholder', () => {
    expect(fillCopy("{name}'s turn", { name: 'Player A' })).toBe("Player A's turn");
  });

  it('should fill several different placeholders', () => {
    expect(fillCopy('Card {number} of {length}', { number: 7, length: 20 })).toBe('Card 7 of 20');
  });

  it('should fill a placeholder that appears twice', () => {
    expect(fillCopy('{name} and {name}', { name: 'Player A' })).toBe('Player A and Player A');
  });

  it('should leave text without placeholders as it is', () => {
    expect(fillCopy('Done!', {})).toBe('Done!');
  });

  it('should not read the dollar signs of a value as a replacement pattern', () => {
    expect(fillCopy('Hello {name}', { name: "$& $1 $'" })).toBe("Hello $& $1 $'");
  });

  it('should fill only the placeholders in the template, which the types enforce', () => {
    // @ts-expect-error The template needs a value for name.
    fillCopy('Hello {name}', {});
    // @ts-expect-error The template has no placeholder called other.
    fillCopy('Hello {name}', { name: 'Player A', other: 'x' });
  });
});
