import {
  customQuestionSchema,
  discoverySchema,
  findDuplicateQuestionIds,
  newDiscoverySchema,
  parseQuestionDeck,
  questionFormats,
  topicIds,
  type QuestionDeck,
} from './questionModel';

const shippedBase = { category: 'c1', topic: 't1', source: 'shipped' };
const options = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `o${index + 1}`,
    text: `Option ${index + 1}`,
  }));

const validIfYou = { id: 'q-1', format: 'ifYou', text: 'Question text', ...shippedBase };
const validNeverHave = { id: 'q-2', format: 'neverHave', text: 'Question text', ...shippedBase };
const validGuess = {
  id: 'q-3',
  format: 'guess',
  text: 'Question text',
  options: options(3),
  ...shippedBase,
};
const validEitherOr = { id: 'q-4', format: 'eitherOr', options: options(2), ...shippedBase };
const validSecretMatch = {
  id: 'q-5',
  format: 'secretMatch',
  text: 'Item text',
  tags: ['tag-one'],
  ...shippedBase,
};

function deckWith(...questions: unknown[]) {
  return { id: 'deck-1', version: 1, questions };
}

function errorsFor(input: unknown): string[] {
  const result = parseQuestionDeck(input);
  if (result.success) throw new Error('Expected the deck to fail validation');
  return result.errors;
}

describe('formats and topics', () => {
  it('should list the five formats', () => {
    expect(questionFormats).toEqual(['ifYou', 'neverHave', 'guess', 'eitherOr', 'secretMatch']);
  });

  it('should list the topic ids t1 to t6', () => {
    expect(topicIds).toEqual(['t1', 't2', 't3', 't4', 't5', 't6']);
  });
});

describe('parseQuestionDeck', () => {
  it('should accept one valid question of every format', () => {
    const input = deckWith(validIfYou, validNeverHave, validGuess, validEitherOr, validSecretMatch);

    const result = parseQuestionDeck(input);

    expect(result).toEqual({ success: true, deck: input });
  });

  it('should accept an either or question with text', () => {
    const input = deckWith({ ...validEitherOr, text: 'Pick one' });

    expect(parseQuestionDeck(input).success).toBe(true);
  });

  it('should accept an empty deck', () => {
    expect(parseQuestionDeck(deckWith()).success).toBe(true);
  });

  it.each([2, 4])('should accept a guess question with %i options', (count) => {
    expect(parseQuestionDeck(deckWith({ ...validGuess, options: options(count) })).success).toBe(
      true,
    );
  });

  it.each([1, 3])('should accept a secret match question with %i tags', (count) => {
    const tags = Array.from({ length: count }, (_, index) => `tag-${index}`);

    expect(parseQuestionDeck(deckWith({ ...validSecretMatch, tags })).success).toBe(true);
  });

  it('should reject a value that is not an object', () => {
    expect(errorsFor('nope')).toEqual(['deck: expected an object']);
  });

  it('should reject a missing deck id', () => {
    expect(errorsFor({ version: 1, questions: [] })).toEqual(['deck: id is required']);
  });

  it.each([0, 1.5, -1])('should reject a version of %s', (version) => {
    expect(errorsFor({ id: 'deck-1', version, questions: [] })).toEqual([
      'deck: version must be a positive whole number',
    ]);
  });

  it('should reject a deck without a question list', () => {
    expect(errorsFor({ id: 'deck-1', version: 1 })).toEqual(['deck: questions is required']);
  });

  it('should reject an unknown deck field', () => {
    expect(errorsFor({ ...deckWith(), extra: 1 })).toEqual(['deck: unrecognised field "extra"']);
  });

  it('should name a bad question by index and id', () => {
    expect(errorsFor(deckWith(validIfYou, { ...validNeverHave, category: 'c9' }))).toEqual([
      'questions[1] (id "q-2"): unknown category "c9", expected one of c1, c2, c3, c4',
    ]);
  });

  it('should name a question without an id by index only', () => {
    const withoutId = { ...validIfYou, id: undefined };

    expect(errorsFor(deckWith(withoutId))).toEqual(['questions[0]: id is required']);
  });

  it('should reject an unknown format', () => {
    expect(errorsFor(deckWith({ ...validIfYou, format: 'nope' }))).toEqual([
      'questions[0] (id "q-1"): unknown format "nope", expected one of ifYou, neverHave, guess, eitherOr, secretMatch',
    ]);
  });

  it('should reject a missing format', () => {
    const withoutFormat = { ...validIfYou, format: undefined };

    expect(errorsFor(deckWith(withoutFormat))).toEqual([
      'questions[0] (id "q-1"): format is required',
    ]);
  });

  it('should reject an unknown topic', () => {
    expect(errorsFor(deckWith({ ...validIfYou, topic: 't7' }))).toEqual([
      'questions[0] (id "q-1"): unknown topic "t7", expected one of t1, t2, t3, t4, t5, t6',
    ]);
  });

  it('should reject a missing source', () => {
    const withoutSource = { ...validIfYou, source: undefined };

    expect(errorsFor(deckWith(withoutSource))).toEqual([
      'questions[0] (id "q-1"): source is required',
    ]);
  });

  it('should reject an unknown source', () => {
    expect(errorsFor(deckWith({ ...validIfYou, source: 'other' }))).toEqual([
      'questions[0] (id "q-1"): unknown source "other", expected shipped or player',
    ]);
  });

  it('should reject empty text', () => {
    expect(errorsFor(deckWith({ ...validIfYou, text: '  ' }))).toEqual([
      'questions[0] (id "q-1"): text must not be empty',
    ]);
  });

  it('should reject duplicate ids within a deck', () => {
    expect(errorsFor(deckWith(validIfYou, { ...validNeverHave, id: 'q-1' }))).toEqual([
      'questions[1] (id "q-1"): duplicate id, first used by questions[0]',
    ]);
  });

  it('should reject an unrecognised question field', () => {
    expect(errorsFor(deckWith({ ...validIfYou, extra: 1 }))).toEqual([
      'questions[0] (id "q-1"): unrecognised field "extra"',
    ]);
  });

  describe('options', () => {
    it.each([1, 5])('should reject a guess question with %i options', (count) => {
      expect(errorsFor(deckWith({ ...validGuess, options: options(count) }))).toEqual([
        'questions[0] (id "q-3"): options must have 2 to 4 entries',
      ]);
    });

    it('should reject a guess question without options', () => {
      const withoutOptions = { ...validGuess, options: undefined };

      expect(errorsFor(deckWith(withoutOptions))).toEqual([
        'questions[0] (id "q-3"): options is required',
      ]);
    });

    it.each([1, 3])('should reject an either or question with %i options', (count) => {
      expect(errorsFor(deckWith({ ...validEitherOr, options: options(count) }))).toEqual([
        'questions[0] (id "q-4"): options must have exactly 2 entries',
      ]);
    });

    it('should reject options on an if you question', () => {
      expect(errorsFor(deckWith({ ...validIfYou, options: options(2) }))).toEqual([
        'questions[0] (id "q-1"): unrecognised field "options"',
      ]);
    });

    it('should reject a repeated option id', () => {
      const repeated = [
        { id: 'o1', text: 'One' },
        { id: 'o1', text: 'Two' },
      ];

      expect(errorsFor(deckWith({ ...validEitherOr, options: repeated }))).toEqual([
        'questions[0] (id "q-4"): option id "o1" is used twice',
      ]);
    });

    it('should reject an option with empty text', () => {
      const bad = [{ id: 'o1', text: '' }, ...options(2).slice(1)];

      expect(errorsFor(deckWith({ ...validEitherOr, options: bad }))).toEqual([
        'questions[0] (id "q-4"): option text must not be empty',
      ]);
    });

    it('should reject an option without an id', () => {
      const bad = [{ text: 'One' }, ...options(2).slice(1)];

      expect(errorsFor(deckWith({ ...validEitherOr, options: bad }))).toEqual([
        'questions[0] (id "q-4"): option id is required',
      ]);
    });
  });

  describe('tags', () => {
    it.each(['ifYou', 'neverHave'])('should reject tags on a %s question', (format) => {
      const input = deckWith({ ...validIfYou, format, tags: ['tag-one'] });

      expect(errorsFor(input)).toEqual(['questions[0] (id "q-1"): unrecognised field "tags"']);
    });

    it('should reject tags on a guess question', () => {
      expect(errorsFor(deckWith({ ...validGuess, tags: ['tag-one'] }))).toEqual([
        'questions[0] (id "q-3"): unrecognised field "tags"',
      ]);
    });

    it('should reject tags on an either or question', () => {
      expect(errorsFor(deckWith({ ...validEitherOr, tags: ['tag-one'] }))).toEqual([
        'questions[0] (id "q-4"): unrecognised field "tags"',
      ]);
    });

    it.each([0, 4])('should reject a secret match question with %i tags', (count) => {
      const tags = Array.from({ length: count }, (_, index) => `tag-${index}`);

      expect(errorsFor(deckWith({ ...validSecretMatch, tags }))).toEqual([
        'questions[0] (id "q-5"): tags must have 1 to 3 entries',
      ]);
    });

    it('should reject a secret match question without tags', () => {
      const withoutTags = { ...validSecretMatch, tags: undefined };

      expect(errorsFor(deckWith(withoutTags))).toEqual([
        'questions[0] (id "q-5"): tags is required',
      ]);
    });

    it('should reject an empty tag', () => {
      expect(errorsFor(deckWith({ ...validSecretMatch, tags: [' '] }))).toEqual([
        'questions[0] (id "q-5"): tag must not be empty',
      ]);
    });
  });

  it('should list every problem in a deck', () => {
    const input = deckWith({ ...validIfYou, topic: 't9' }, { ...validNeverHave, category: 'c9' });

    expect(errorsFor(input)).toHaveLength(2);
  });
});

describe('findDuplicateQuestionIds', () => {
  const deckOf = (id: string, ...questionIds: string[]): QuestionDeck => ({
    id,
    version: 1,
    questions: questionIds.map((questionId) => ({
      id: questionId,
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      source: 'shipped',
      text: 'Question text',
    })),
  });

  it('should find nothing when every id is used once', () => {
    expect(findDuplicateQuestionIds([deckOf('a', 'x', 'y'), deckOf('b', 'z')])).toEqual([]);
  });

  it('should find an id used in two decks', () => {
    expect(findDuplicateQuestionIds([deckOf('a', 'x', 'y'), deckOf('b', 'y')])).toEqual(['y']);
  });

  it('should list an id used three times once', () => {
    expect(
      findDuplicateQuestionIds([deckOf('a', 'x'), deckOf('b', 'x'), deckOf('c', 'x')]),
    ).toEqual(['x']);
  });
});

describe('customQuestionSchema', () => {
  const uuid = '123e4567-e89b-42d3-a456-426614174000';
  const playerBase = { category: 'c2', topic: 't3', source: 'player', id: `pq-${uuid}` };
  const check = (value: unknown) => customQuestionSchema.safeParse(value);

  it.each([
    { format: 'ifYou', text: 'Question text' },
    { format: 'neverHave', text: 'Question text' },
    { format: 'guess', text: 'Question text', options: options(2) },
    { format: 'eitherOr', options: options(2) },
  ])('should accept a player $format question', (fields) => {
    expect(check({ ...playerBase, ...fields }).success).toBe(true);
  });

  it('should reject a secret match question', () => {
    const result = check({ ...playerBase, format: 'secretMatch', text: 'Item', tags: ['tag'] });

    expect(result.success).toBe(false);
  });

  it('should reject a shipped source', () => {
    expect(check({ ...playerBase, format: 'ifYou', text: 'Text', source: 'shipped' }).success).toBe(
      false,
    );
  });

  it.each(['q-1', 'pq-123', `p-${uuid}`, `pq-${uuid}x`, `xpq-${uuid}`])(
    'should reject the id "%s"',
    (id) => {
      expect(check({ ...playerBase, id, format: 'ifYou', text: 'Text' }).success).toBe(false);
    },
  );

  it('should still apply the shared rules', () => {
    const result = check({ ...playerBase, format: 'eitherOr', options: options(3) });

    expect(result.success).toBe(false);
  });
});

describe('discoverySchema', () => {
  const date = '2026-11-19T10:00:00.000Z';
  const check = (value: unknown) => discoverySchema.safeParse(value);

  it('should accept a match with strength yes', () => {
    expect(check({ kind: 'match', questionId: 'q-5', strength: 'yes', date }).success).toBe(true);
  });

  it('should accept a match with strength maybe', () => {
    expect(check({ kind: 'match', questionId: 'q-5', strength: 'maybe', date }).success).toBe(true);
  });

  it('should reject a match with another strength', () => {
    expect(check({ kind: 'match', questionId: 'q-5', strength: 'no', date }).success).toBe(false);
  });

  it('should reject a match that says who said maybe', () => {
    const result = check({ kind: 'match', questionId: 'q-5', strength: 'maybe', maybeBy: 0, date });

    expect(result.success).toBe(false);
  });

  it('should accept an agree with an option id', () => {
    expect(check({ kind: 'agree', questionId: 'q-4', optionId: 'o1', date }).success).toBe(true);
  });

  it('should reject an agree without an option id', () => {
    expect(check({ kind: 'agree', questionId: 'q-4', date }).success).toBe(false);
  });

  it('should accept an answer with an option id and the answerer name', () => {
    const result = check({
      kind: 'answer',
      questionId: 'q-3',
      optionId: 'o2',
      answererName: 'Sam',
      date,
    });

    expect(result.success).toBe(true);
  });

  it('should reject an answer without the answerer name', () => {
    expect(check({ kind: 'answer', questionId: 'q-3', optionId: 'o2', date }).success).toBe(false);
  });

  it('should reject an unknown kind', () => {
    expect(check({ kind: 'other', questionId: 'q-3', date }).success).toBe(false);
  });

  it('should reject a discovery without a date', () => {
    expect(check({ kind: 'match', questionId: 'q-5', strength: 'yes' }).success).toBe(false);
  });

  it('should reject a date that is not a date', () => {
    expect(check({ kind: 'match', questionId: 'q-5', strength: 'yes', date: 'soon' }).success).toBe(
      false,
    );
  });

  it('should reject an empty question id', () => {
    expect(check({ kind: 'match', questionId: '', strength: 'yes', date }).success).toBe(false);
  });
});

describe('newDiscoverySchema', () => {
  it('should accept a discovery without a date', () => {
    const result = newDiscoverySchema.safeParse({
      kind: 'agree',
      questionId: 'q-4',
      optionId: 'o1',
    });

    expect(result.success).toBe(true);
  });

  it.each([
    { kind: 'match', questionId: 'q-5', strength: 'maybe', saidMaybe: 0 },
    { kind: 'agree', questionId: 'q-4', optionId: 'o1', extra: 1 },
    { kind: 'answer', questionId: 'q-3', optionId: 'o2', answererName: 'Sam', extra: 1 },
  ])('should reject an extra field on a $kind discovery', (input) => {
    expect(newDiscoverySchema.safeParse(input).success).toBe(false);
  });

  it('should reject a discovery with a date', () => {
    const result = newDiscoverySchema.safeParse({
      kind: 'agree',
      questionId: 'q-4',
      optionId: 'o1',
      date: '2026-11-19T10:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});
