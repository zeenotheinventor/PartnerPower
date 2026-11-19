import {
  entryConfirmationSchema,
  hapticsOnSchema,
  playerNamesSchema,
  soundOnSchema,
} from './settings';

describe('entryConfirmationSchema', () => {
  it('should accept true', () => {
    expect(entryConfirmationSchema.safeParse(true).success).toBe(true);
  });

  it('should accept false', () => {
    expect(entryConfirmationSchema.safeParse(false).success).toBe(true);
  });

  it.each(['true', 1, null, {}])('should reject %p', (value) => {
    expect(entryConfirmationSchema.safeParse(value).success).toBe(false);
  });
});

describe('playerNamesSchema', () => {
  it('should accept two strings', () => {
    expect(playerNamesSchema.parse(['Name 1', 'Name 2'])).toEqual(['Name 1', 'Name 2']);
  });

  it.each([[[]], [['Name 1']], [['Name 1', 'Name 2', 'Name 3']]])(
    'should reject %p because it is not exactly two names',
    (value) => {
      expect(playerNamesSchema.safeParse(value).success).toBe(false);
    },
  );

  it('should reject a name that is not a string', () => {
    expect(playerNamesSchema.safeParse(['Name 1', 2]).success).toBe(false);
  });

  it('should reject a value that is not a list', () => {
    expect(playerNamesSchema.safeParse('Name 1').success).toBe(false);
  });
});

describe.each([
  ['soundOnSchema', soundOnSchema],
  ['hapticsOnSchema', hapticsOnSchema],
])('%s', (_name, schema) => {
  it.each([true, false])('should accept %p', (value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });

  it.each(['true', 1, null, {}])('should reject %p', (value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});
