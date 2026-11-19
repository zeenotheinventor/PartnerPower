import { copy } from '@getfreak/content';

import { cardProblemMessage } from './cardProblemMessage';

describe('cardProblemMessage', () => {
  it('should say a dare has to be written when it is empty', () => {
    expect(cardProblemMessage(['empty'])).toBe(copy.ownCards.emptyError);
  });

  it('should say a dare is too long', () => {
    expect(cardProblemMessage(['tooLong'])).toBe(copy.ownCards.tooLongError);
  });

  it('should say a dare has been written already', () => {
    expect(cardProblemMessage(['duplicate'])).toBe(copy.ownCards.duplicateError);
  });

  it('should give every problem, in the order they are found', () => {
    expect(cardProblemMessage(['tooLong', 'duplicate'])).toBe(
      `${copy.ownCards.tooLongError} ${copy.ownCards.duplicateError}`,
    );
  });
});
