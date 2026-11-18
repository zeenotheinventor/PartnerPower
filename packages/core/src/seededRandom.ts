/**
 * A small seeded generator (mulberry32). The state is a plain number, so it can live in
 * serialisable round state and the same seed always gives the same sequence.
 */
export function nextRandom(state: number): { value: number; state: number } {
  const nextState = (state + 0x6d2b79f5) >>> 0;
  let mixed = Math.imul(nextState ^ (nextState >>> 15), nextState | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return { value: ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296, state: nextState };
}
