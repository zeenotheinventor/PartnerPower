import type { CategoryId } from './contentModel';
import { pacedCategory, pickWithPlayerShare, resolveEnabled, searchOrder } from './pacing';
import { nextRandom } from './seededRandom';

const allCategories: readonly CategoryId[] = ['c1', 'c2', 'c3', 'c4'];

function categoriesFor(
  pacing: readonly CategoryId[],
  length: 10 | 20 | 'endless',
  count: number,
): CategoryId[] {
  return Array.from({ length: count }, (_, index) => pacedCategory(pacing, length, index + 1));
}

describe('pacedCategory', () => {
  it('should start in the lowest enabled category', () => {
    expect(pacedCategory(['c2', 'c3'], 10, 1)).toBe('c2');
  });

  it('should split a round evenly across the enabled categories', () => {
    const categories = categoriesFor(allCategories, 20, 20);
    expect(categories.filter((category) => category === 'c1')).toHaveLength(5);
    expect(categories.filter((category) => category === 'c4')).toHaveLength(5);
  });

  it('should give the remainder to the higher categories', () => {
    const categories = categoriesFor(allCategories, 10, 10);
    const counts = allCategories.map(
      (category) => categories.filter((paced) => paced === category).length,
    );
    expect(counts).toEqual([2, 2, 3, 3]);
  });

  it('should keep the categories in rising order', () => {
    expect(categoriesFor(allCategories, 10, 10)).toEqual([
      'c1',
      'c1',
      'c2',
      'c2',
      'c3',
      'c3',
      'c3',
      'c4',
      'c4',
      'c4',
    ]);
  });

  it('should step up every 5 questions in an endless round', () => {
    expect(categoriesFor(allCategories, 'endless', 11)).toEqual([
      'c1',
      'c1',
      'c1',
      'c1',
      'c1',
      'c2',
      'c2',
      'c2',
      'c2',
      'c2',
      'c3',
    ]);
  });

  it('should stay in the highest category once an endless round reaches it', () => {
    expect(pacedCategory(['c1', 'c2'], 'endless', 40)).toBe('c2');
  });
});

describe('resolveEnabled', () => {
  it('should keep a category that is enabled', () => {
    expect(resolveEnabled('c2', ['c1', 'c2'])).toBe('c2');
  });

  it('should stand in the next higher enabled category for a disabled one', () => {
    expect(resolveEnabled('c2', ['c1', 'c3'])).toBe('c3');
  });

  it('should fall back to the highest enabled category when none is higher', () => {
    expect(resolveEnabled('c4', ['c1', 'c2'])).toBe('c2');
  });
});

describe('searchOrder', () => {
  it('should look in the target, then nearer higher categories, then nearer lower ones', () => {
    expect(searchOrder('c2', allCategories)).toEqual(['c2', 'c3', 'c4', 'c1']);
  });

  it('should look at the nearest lower category first when going down', () => {
    expect(searchOrder('c4', allCategories)).toEqual(['c4', 'c3', 'c2', 'c1']);
  });
});

describe('pickWithPlayerShare', () => {
  const shipped = [
    { id: 'shipped-1', source: 'shipped' },
    { id: 'shipped-2', source: 'shipped' },
  ] as const;
  const player = [{ id: 'player-1', source: 'player' }] as const;

  it('should return null when there are no candidates', () => {
    expect(pickWithPlayerShare([], 1)).toBeNull();
  });

  it('should not use the generator for a coin when only one source is present', () => {
    const drawn = pickWithPlayerShare(shipped, 1);
    expect(drawn?.randomState).toBe(nextRandom(1).state);
  });

  it('should use the generator twice when both sources are present', () => {
    const drawn = pickWithPlayerShare([...shipped, ...player], 1);
    expect(drawn?.randomState).toBe(nextRandom(nextRandom(1).state).state);
  });

  it('should take a player candidate about half the time when both sources are present', () => {
    let playerPicks = 0;
    for (let seed = 1; seed <= 400; seed += 1) {
      if (pickWithPlayerShare([...shipped, ...player], seed)?.item.source === 'player') {
        playerPicks += 1;
      }
    }
    expect(playerPicks).toBeGreaterThan(150);
    expect(playerPicks).toBeLessThan(250);
  });
});
