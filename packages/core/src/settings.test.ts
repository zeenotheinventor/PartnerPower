import {
  appearanceChoices,
  appearanceSchema,
  defaultAppearance,
  entryConfirmationSchema,
  hapticsOnSchema,
  defaultSaveDiscoveries,
  lastShownUpdateIdSchema,
  playerNamesSchema,
  questionPreferencesSchema,
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

describe('questionPreferencesSchema', () => {
  it('should accept the switch for saving discoveries', () => {
    expect(questionPreferencesSchema.parse({ saveDiscoveries: false })).toEqual({
      saveDiscoveries: false,
    });
  });

  it.each([{}, { saveDiscoveries: 'yes' }, null, true])('should reject %p', (value) => {
    expect(questionPreferencesSchema.safeParse(value).success).toBe(false);
  });
});

describe('defaultSaveDiscoveries', () => {
  it('should be on until the owner decides otherwise (FRK-33)', () => {
    expect(defaultSaveDiscoveries).toBe(true);
  });
});

describe('lastShownUpdateIdSchema', () => {
  it('should accept an update id', () => {
    expect(lastShownUpdateIdSchema.parse('update-1')).toBe('update-1');
  });

  it.each([1, null, true, {}])('should reject %p', (value) => {
    expect(lastShownUpdateIdSchema.safeParse(value).success).toBe(false);
  });
});

describe('appearanceSchema', () => {
  it.each(['system', 'light', 'dark'])('should accept %p', (value) => {
    expect(appearanceSchema.parse(value)).toBe(value);
  });

  it.each(['auto', 'Dark', '', 1, null, true, {}])('should reject %p', (value) => {
    expect(appearanceSchema.safeParse(value).success).toBe(false);
  });
});

describe('appearanceChoices', () => {
  it('should list match phone first, then light and dark', () => {
    expect(appearanceChoices).toEqual(['system', 'light', 'dark']);
  });
});

describe('defaultAppearance', () => {
  it('should match the phone until the player picks one (FRK-89)', () => {
    expect(defaultAppearance).toBe('system');
  });
});
