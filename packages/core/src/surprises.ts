import type { SurpriseId } from './contentModel';
import { nextRandom } from './seededRandom';

/** A round has one surprise in each block of this many played cards. */
export const surpriseBlockSize = 5;

/** Mixed into the round seed so the surprise plan has a generator stream of its own. */
const surprisePlanSalt = 0x5bd1e995;

export function surprisePlanSeed(seed: number): number {
  return ((seed >>> 0) ^ surprisePlanSalt) >>> 0;
}

/** A Fisher-Yates shuffle driven by the seeded generator. Returns a new list. */
export function shuffleSurpriseTypes(
  types: readonly SurpriseId[],
  randomState: number,
): { order: SurpriseId[]; randomState: number } {
  const order = [...types];
  let state = randomState;
  for (let index = order.length - 1; index > 0; index -= 1) {
    const draw = nextRandom(state);
    state = draw.state;
    const swapWith = Math.floor(draw.value * (index + 1));
    const held = order[index];
    const other = order[swapWith];
    if (held !== undefined && other !== undefined) {
      order[index] = other;
      order[swapWith] = held;
    }
  }
  return { order, randomState: state };
}

/**
 * Picks where in a block the surprise goes, as an offset from the block's first card. The 5th card
 * (offset 4) never carries one, and neither does card 1 of the round (offset 0 of block 0).
 */
export function pickSurpriseOffset(
  randomState: number,
  blockIndex: number,
): { offset: number; randomState: number } {
  const lowest = blockIndex === 0 ? 1 : 0;
  const choices = surpriseBlockSize - 1 - lowest;
  const draw = nextRandom(randomState);
  return { offset: lowest + Math.floor(draw.value * choices), randomState: draw.state };
}
