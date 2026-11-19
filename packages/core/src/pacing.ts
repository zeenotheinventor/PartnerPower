import { categoryIds } from './contentModel';
import type { CategoryId } from './contentModel';
import type { RoundLength } from './round';
import { nextRandom } from './seededRandom';

/** An endless round steps up to the next enabled category every 5 questions. */
export const endlessStepInterval = 5;

/** How often a draw takes a player item when it could take either a player item or a shipped one. */
const playerShareProbability = 0.5;

export function categoryOrder(category: CategoryId): number {
  return categoryIds.indexOf(category);
}

/**
 * The category an item at this position (counting from 1) belongs to. `pacing` is the categories
 * the round was set up with, lowest first, before any category was switched off.
 */
export function pacedCategory(
  pacing: readonly CategoryId[],
  length: RoundLength,
  position: number,
): CategoryId {
  const highest = pacing.length - 1;
  if (length === 'endless') {
    const step = Math.floor((position - 1) / endlessStepInterval);
    return pacing[Math.min(step, highest)] ?? categoryIds[0];
  }
  const share = Math.floor(length / pacing.length);
  const extraFrom = pacing.length - (length % pacing.length);
  let lastPosition = 0;
  for (const [index, category] of pacing.entries()) {
    lastPosition += share + (index >= extraFrom ? 1 : 0);
    if (position <= lastPosition) return category;
  }
  return pacing[highest] ?? categoryIds[0];
}

/** A disabled category is stood in for by the next higher enabled one, else the next lower. */
export function resolveEnabled(category: CategoryId, enabled: readonly CategoryId[]): CategoryId {
  const order = categoryOrder(category);
  const higher = enabled.find((candidate) => categoryOrder(candidate) >= order);
  return higher ?? enabled.at(-1) ?? category;
}

/** The target category, then each higher enabled one, nearest first, then each lower one, nearest first. */
export function searchOrder(
  target: CategoryId,
  enabled: readonly CategoryId[],
): readonly CategoryId[] {
  const targetOrder = categoryOrder(target);
  const higher = enabled.filter((category) => categoryOrder(category) > targetOrder);
  const lower = enabled.filter((category) => categoryOrder(category) < targetOrder).reverse();
  return [target, ...higher, ...lower];
}

/**
 * Picks one of the candidates. A player item is taken with a probability of one half when the
 * candidates hold both sources. The generator is only used for that when both are present, so a list
 * with no player items deals as it would without them.
 */
export function pickWithPlayerShare<Item extends { source: 'shipped' | 'player' }>(
  candidates: readonly Item[],
  randomState: number,
): { item: Item; randomState: number } | null {
  const playerItems = candidates.filter((item) => item.source === 'player');
  const shippedItems = candidates.filter((item) => item.source !== 'player');
  let pool = candidates;
  let state = randomState;
  if (playerItems.length > 0 && shippedItems.length > 0) {
    const coin = nextRandom(state);
    pool = coin.value < playerShareProbability ? playerItems : shippedItems;
    state = coin.state;
  }
  const { value, state: nextState } = nextRandom(state);
  const item = pool[Math.floor(value * pool.length)];
  return item === undefined ? null : { item, randomState: nextState };
}
