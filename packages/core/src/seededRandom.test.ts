import { nextRandom } from './seededRandom';

function draw(seed: number, count: number): number[] {
  const values: number[] = [];
  let state = seed;
  for (let index = 0; index < count; index += 1) {
    const result = nextRandom(state);
    values.push(result.value);
    state = result.state;
  }
  return values;
}

describe('nextRandom', () => {
  it('should give the same sequence for the same seed', () => {
    expect(draw(42, 20)).toEqual(draw(42, 20));
  });

  it('should give a different sequence for a different seed', () => {
    expect(draw(1, 5)).not.toEqual(draw(2, 5));
  });

  it('should only give values from zero up to but not including one', () => {
    expect(draw(7, 500).every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('should keep the state a plain whole number', () => {
    expect(Number.isInteger(nextRandom(123).state)).toBe(true);
  });
});
