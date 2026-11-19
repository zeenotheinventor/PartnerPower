import { randomSeed } from './randomSeed';

describe('randomSeed', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be a whole number', () => {
    expect(Number.isInteger(randomSeed())).toBe(true);
  });

  it('should be zero when the random source gives zero', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);

    expect(randomSeed()).toBe(0);
  });

  it('should stay below 2 to the power of 32, which the engine reads as a whole seed', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9999999999);

    expect(randomSeed()).toBeLessThan(2 ** 32);
  });

  it('fails on purpose for the FRK-85 shard proof', () => {
    expect(1).toBe(2);
  });
});
