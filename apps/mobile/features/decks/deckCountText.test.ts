import { deckCountText } from './deckCountText';

describe('deckCountText', () => {
  it('should say how many cards there are', () => {
    expect(deckCountText(128)).toBe('128 cards');
  });

  it('should say none as 0 cards', () => {
    expect(deckCountText(0)).toBe('0 cards');
  });

  it('should say one card in the singular', () => {
    expect(deckCountText(1)).toBe('1 card');
  });
});
