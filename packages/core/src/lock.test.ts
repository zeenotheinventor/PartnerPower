import {
  backgroundLockDelayMilliseconds,
  biometricsChoiceSchema,
  countsAsBackground,
  isValidPin,
  lockAttemptsSchema,
  maximumWaitMilliseconds,
  pinHashSchema,
  remainingWaitMilliseconds,
  shouldLock,
  triesLeftBeforeWait,
  waitAfterFailureMilliseconds,
} from './lock';

const startOfDay = Date.UTC(2026, 10, 19, 9, 0, 0);

describe('shouldLock', () => {
  it('should lock on a cold start, when there is no time the app went to the background', () => {
    expect(shouldLock(undefined, startOfDay)).toBe(true);
  });

  it('should not lock after 59 seconds and 999 milliseconds in the background', () => {
    expect(shouldLock(startOfDay, startOfDay + 59_999)).toBe(false);
  });

  it('should lock after exactly 60 seconds in the background', () => {
    expect(shouldLock(startOfDay, startOfDay + 60_000)).toBe(true);
  });

  it('should lock after a long time in the background', () => {
    expect(shouldLock(startOfDay, startOfDay + 3 * 60 * 60_000)).toBe(true);
  });

  it('should not lock on an immediate return', () => {
    expect(shouldLock(startOfDay, startOfDay)).toBe(false);
  });

  it('should lock when the clock went backwards, because the time away cannot be trusted', () => {
    expect(shouldLock(startOfDay, startOfDay - 1_000)).toBe(true);
  });

  it('should use a delay of 60 seconds', () => {
    expect(backgroundLockDelayMilliseconds).toBe(60_000);
  });
});

describe('countsAsBackground', () => {
  it('should count the background state', () => {
    expect(countsAsBackground('background')).toBe(true);
  });

  it.each(['active', 'inactive', 'unknown', 'extension'])('should not count %s', (state) => {
    expect(countsAsBackground(state)).toBe(false);
  });
});

describe('isValidPin', () => {
  it.each(['0000', '1234', '9876'])('should accept %s', (pin) => {
    expect(isValidPin(pin)).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['three digits', '123'],
    ['five digits', '12345'],
    ['letters', 'abcd'],
    ['a letter among digits', '12a4'],
    ['a space', '12 4'],
    ['a trailing newline', '123\n'],
    ['a sign', '-123'],
    ['a decimal point', '1.23'],
    ['full-width digits', '１２３４'],
  ])('should reject %s', (_description, pin) => {
    expect(isValidPin(pin)).toBe(false);
  });
});

describe('triesLeftBeforeWait', () => {
  it.each([
    [0, 5],
    [1, 4],
    [2, 3],
    [3, 2],
    [4, 1],
  ])('should leave %i wrong PINs with %i tries before the wait', (failedCount, triesLeft) => {
    expect(triesLeftBeforeWait(failedCount)).toBe(triesLeft);
  });

  it('should count again from five after a wait starts', () => {
    expect(triesLeftBeforeWait(5)).toBe(5);
    expect(triesLeftBeforeWait(8)).toBe(2);
    expect(triesLeftBeforeWait(9)).toBe(1);
  });
});

describe('waitAfterFailureMilliseconds', () => {
  it.each([0, 1, 2, 3, 4])('should not make anyone wait after %i wrong PINs', (failedCount) => {
    expect(waitAfterFailureMilliseconds(failedCount)).toBe(0);
  });

  it('should wait 30 seconds after the fifth wrong PIN in a row', () => {
    expect(waitAfterFailureMilliseconds(5)).toBe(30_000);
  });

  it.each([6, 7, 8, 9])(
    'should not wait after %i wrong PINs, between runs of five',
    (failedCount) => {
      expect(waitAfterFailureMilliseconds(failedCount)).toBe(0);
    },
  );

  it('should double the wait after each further run of five', () => {
    expect(waitAfterFailureMilliseconds(10)).toBe(60_000);
    expect(waitAfterFailureMilliseconds(15)).toBe(120_000);
    expect(waitAfterFailureMilliseconds(20)).toBe(240_000);
    expect(waitAfterFailureMilliseconds(25)).toBe(480_000);
  });

  it('should never wait longer than 15 minutes', () => {
    expect(maximumWaitMilliseconds).toBe(15 * 60_000);
    expect(waitAfterFailureMilliseconds(30)).toBe(maximumWaitMilliseconds);
    expect(waitAfterFailureMilliseconds(5000)).toBe(maximumWaitMilliseconds);
  });
});

describe('remainingWaitMilliseconds', () => {
  it('should give the time left until the wait ends', () => {
    expect(remainingWaitMilliseconds(startOfDay + 30_000, startOfDay + 10_000)).toBe(20_000);
  });

  it('should give nothing once the wait has ended', () => {
    expect(remainingWaitMilliseconds(startOfDay + 30_000, startOfDay + 30_000)).toBe(0);
    expect(remainingWaitMilliseconds(startOfDay + 30_000, startOfDay + 90_000)).toBe(0);
  });

  it('should give nothing when no wait was ever set', () => {
    expect(remainingWaitMilliseconds(0, startOfDay)).toBe(0);
  });

  it('should never ask for more than the longest wait, so a clock set back cannot lock a player out for good', () => {
    expect(remainingWaitMilliseconds(startOfDay + 365 * 24 * 60 * 60_000, startOfDay)).toBe(
      maximumWaitMilliseconds,
    );
  });
});

describe('stored lock values', () => {
  const salt = 'a'.repeat(32);
  const hash = 'b'.repeat(64);

  it('should accept a salt and a SHA-256 hash in hex', () => {
    expect(pinHashSchema.safeParse({ salt, hash }).success).toBe(true);
  });

  it.each([
    ['a short hash', { salt, hash: 'b'.repeat(63) }],
    ['a hash that is not hex', { salt, hash: 'z'.repeat(64) }],
    ['a short salt', { salt: 'a'.repeat(31), hash }],
    ['a missing salt', { hash }],
    ['a plain string', 'b'.repeat(64)],
  ])('should reject %s', (_description, value) => {
    expect(pinHashSchema.safeParse(value).success).toBe(false);
  });

  it('should accept a count of wrong PINs and the time a wait ends', () => {
    expect(lockAttemptsSchema.safeParse({ failedCount: 5, waitEndsAt: startOfDay }).success).toBe(
      true,
    );
  });

  it.each([
    ['a zero count', { failedCount: 0, waitEndsAt: 0 }],
    ['a negative count', { failedCount: -1, waitEndsAt: 0 }],
    ['a fractional count', { failedCount: 1.5, waitEndsAt: 0 }],
    ['a negative end time', { failedCount: 1, waitEndsAt: -1 }],
    ['a count as text', { failedCount: '5', waitEndsAt: 0 }],
  ])('should reject %s', (_description, value) => {
    expect(lockAttemptsSchema.safeParse(value).success).toBe(false);
  });

  it('should accept only a boolean for the biometrics choice', () => {
    expect(biometricsChoiceSchema.safeParse(true).success).toBe(true);
    expect(biometricsChoiceSchema.safeParse('true').success).toBe(false);
  });
});
