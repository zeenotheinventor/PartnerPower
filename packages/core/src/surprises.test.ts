import { surpriseIds } from './contentModel';
import {
  pickSurpriseOffset,
  shuffleSurpriseTypes,
  surpriseBlockSize,
  surprisePlanSeed,
} from './surprises';

describe('surpriseBlockSize', () => {
  it('should be 5 cards', () => {
    expect(surpriseBlockSize).toBe(5);
  });
});

describe('surprisePlanSeed', () => {
  it('should differ from the round seed so the plan has its own stream', () => {
    expect(surprisePlanSeed(7)).not.toBe(7);
  });

  it('should give the same value for the same seed', () => {
    expect(surprisePlanSeed(7)).toBe(surprisePlanSeed(7));
  });
});

describe('shuffleSurpriseTypes', () => {
  it('should return every type exactly once', () => {
    const { order } = shuffleSurpriseTypes(surpriseIds, 11);

    expect([...order].sort()).toEqual([...surpriseIds].sort());
  });

  it('should give the same order and state for the same state', () => {
    expect(shuffleSurpriseTypes(surpriseIds, 11)).toEqual(shuffleSurpriseTypes(surpriseIds, 11));
  });

  it('should give more than one order across states', () => {
    const orders = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((state) =>
        shuffleSurpriseTypes(surpriseIds, state).order.join(),
      ),
    );

    expect(orders.size).toBeGreaterThan(1);
  });

  it('should not change the list it is given', () => {
    const types = ['mystery', 'jump', 'swap'] as const;

    shuffleSurpriseTypes(types, 3);

    expect(types).toEqual(['mystery', 'jump', 'swap']);
  });

  it('should return a new generator state after a shuffle of two or more types', () => {
    expect(shuffleSurpriseTypes(surpriseIds, 11).randomState).not.toBe(11);
  });

  it('should return an empty order and the same state for no types', () => {
    expect(shuffleSurpriseTypes([], 11)).toEqual({ order: [], randomState: 11 });
  });
});

describe('pickSurpriseOffset', () => {
  const states = Array.from({ length: 200 }, (_, index) => index + 1);

  it('should pick offsets 1 to 3 in the first block, so card 1 never carries one', () => {
    const offsets = new Set(states.map((state) => pickSurpriseOffset(state, 0).offset));

    expect([...offsets].sort()).toEqual([1, 2, 3]);
  });

  it('should pick offsets 0 to 3 in later blocks, so the 5th card never carries one', () => {
    const offsets = new Set(states.map((state) => pickSurpriseOffset(state, 1).offset));

    expect([...offsets].sort()).toEqual([0, 1, 2, 3]);
  });

  it('should give the same offset and state for the same input', () => {
    expect(pickSurpriseOffset(5, 2)).toEqual(pickSurpriseOffset(5, 2));
  });

  it('should return a new generator state', () => {
    expect(pickSurpriseOffset(5, 2).randomState).not.toBe(5);
  });
});
