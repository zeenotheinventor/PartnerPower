import { checkCardText, limits, tidyCardText } from './cardText';

describe('tidyCardText', () => {
  it('should trim the text', () => {
    expect(tidyCardText('  Card text  ')).toBe('Card text');
  });

  it('should turn a run of spaces into one space', () => {
    expect(tidyCardText('Card    text')).toBe('Card text');
  });

  it('should turn tabs and line breaks into one space', () => {
    expect(tidyCardText('Card\t\ttext\r\n\nmore')).toBe('Card text more');
  });

  it('should return an empty string for text that is only spacing', () => {
    expect(tidyCardText(' \t\n ')).toBe('');
  });

  it('should leave tidy text alone', () => {
    expect(tidyCardText('Card text')).toBe('Card text');
  });
});

describe('limits', () => {
  it('should hold the agreed numbers in one place', () => {
    expect(limits).toEqual({
      cardTextLength: 140,
      playerCards: 300,
      playerQuestions: 300,
      customDecks: 20,
      cardsPerCustomDeck: 200,
      deckNameLength: 30,
    });
  });
});

describe('checkCardText', () => {
  it('should return no problems for ordinary text', () => {
    expect(checkCardText('Card text', [])).toEqual([]);
  });

  it('should report empty text', () => {
    expect(checkCardText('', [])).toEqual(['empty']);
  });

  it('should accept text of exactly the limit', () => {
    expect(checkCardText('a'.repeat(limits.cardTextLength), [])).toEqual([]);
  });

  it('should report text one character over the limit as too long', () => {
    expect(checkCardText('a'.repeat(limits.cardTextLength + 1), [])).toEqual(['tooLong']);
  });

  it('should report a duplicate of another text', () => {
    expect(checkCardText('Card text', ['Other', 'Card text'])).toEqual(['duplicate']);
  });

  it('should ignore case when looking for a duplicate', () => {
    expect(checkCardText('card TEXT', ['Card text'])).toEqual(['duplicate']);
  });

  it('should ignore spacing when looking for a duplicate', () => {
    expect(checkCardText('Card text', ['  Card \t  text '])).toEqual(['duplicate']);
  });

  it('should not report a different text as a duplicate', () => {
    expect(checkCardText('Card text', ['Card texts'])).toEqual([]);
  });

  it('should not report empty text as a duplicate of an empty text', () => {
    expect(checkCardText('', [''])).toEqual(['empty']);
  });

  it('should report every problem at once', () => {
    const text = 'a'.repeat(limits.cardTextLength + 1);

    expect(checkCardText(text, [text])).toEqual(['tooLong', 'duplicate']);
  });
});
