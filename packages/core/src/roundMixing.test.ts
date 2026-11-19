import { categoryIds } from './contentModel';
import type { Card, CardKind, CategoryId, Deck } from './contentModel';
import { isRoundOver, reduceRound, startRound } from './round';
import type { RoundAction, RoundLength, RoundSetup, RoundState } from './round';
import baselineFile from './roundDealBaseline.json';
import { nextRandom } from './seededRandom';

const baseline: Record<string, string[]> = baselineFile;

function makeCards(
  category: CategoryId,
  kind: CardKind,
  count: number,
  source: Card['source'] = 'shipped',
): Card[] {
  return Array.from({ length: count }, (_, index) => ({
    id:
      source === 'player'
        ? `player-${category}-${kind}-${index + 1}`
        : `${category}-${kind}-${index + 1}`,
    category,
    kind,
    text: `Card text ${source} ${category} ${kind} ${index + 1}`,
    source,
  }));
}

function shippedCards(soloCount: number, togetherCount: number): Card[] {
  return categoryIds.flatMap((category) => [
    ...makeCards(category, 'solo', soloCount),
    ...makeCards(category, 'together', togetherCount),
  ]);
}

function deckOf(...cards: Card[]): Deck {
  return { id: 'deck-1', version: 1, cards };
}

function setupWith(overrides: Partial<RoundSetup> = {}): RoundSetup {
  return {
    players: ['Player one', 'Player two'],
    level: 'l3',
    enabledCategories: ['c1', 'c2', 'c3', 'c4'],
    length: 20,
    seed: 1,
    ...overrides,
  };
}

function currentCard(state: RoundState): Card {
  if (state.current === null) throw new Error('Expected the round to have a current card');
  return state.current.card;
}

function playOut(state: RoundState): Card[] {
  const dealt: Card[] = [];
  let current = state;
  for (let guard = 0; guard < 1000 && !isRoundOver(current); guard += 1) {
    dealt.push(currentCard(current));
    current = reduceRound(current, { type: 'done' });
  }
  return dealt;
}

const unchangedActions: RoundAction[] = [
  { type: 'done' },
  { type: 'pass' },
  { type: 'removeCard' },
  { type: 'done' },
  { type: 'disableCategory', category: 'c2' },
  { type: 'done' },
  { type: 'pass' },
];

/** The card and generator state at each step of a round, played with a fixed set of actions. */
function transcript(seed: number, length: RoundLength): string[] {
  let state = startRound(setupWith({ seed, length }), deckOf(...shippedCards(12, 4)));
  const steps: string[] = [];
  for (let step = 0; step < 200 && !isRoundOver(state); step += 1) {
    steps.push(`${currentCard(state).id}@${state.randomState}`);
    state = reduceRound(
      state,
      unchangedActions[step % unchangedActions.length] ?? { type: 'done' },
    );
  }
  return steps;
}

describe('a deck with no player cards', () => {
  const seeds = [1, 2, 3, 7, 42, 99, 2024, 4294967295];
  const lengths: RoundLength[] = [10, 20, 'endless'];

  it.each(lengths.flatMap((length) => seeds.map((seed) => [length, seed] as const)))(
    'should deal a %s card round for seed %s exactly as it did before player cards existed',
    (length, seed) => {
      expect(transcript(seed, length)).toEqual(baseline[`${length}/${seed}`]);
    },
  );
});

describe('mixing player cards into the deal', () => {
  const playerSolo = makeCards('c1', 'solo', 6, 'player');
  const mixedDeck = deckOf(...shippedCards(6, 2), ...playerSolo);

  it('should take a player card when the generator value is below one half', () => {
    const seedsBelowHalf = [1, 2, 3, 4, 5, 6, 7, 8].filter(
      (seed) => nextRandom(seed >>> 0).value < 0.5,
    );

    expect(seedsBelowHalf.length).toBeGreaterThan(0);
    for (const seed of seedsBelowHalf) {
      const state = startRound(
        setupWith({ seed, enabledCategories: ['c1'], level: 'l1' }),
        mixedDeck,
      );

      expect(currentCard(state).source).toBe('player');
    }
  });

  it('should take a shipped card when the generator value is one half or above', () => {
    const seedsFromHalf = [1, 2, 3, 4, 5, 6, 7, 8].filter(
      (seed) => nextRandom(seed >>> 0).value >= 0.5,
    );

    expect(seedsFromHalf.length).toBeGreaterThan(0);
    for (const seed of seedsFromHalf) {
      const state = startRound(
        setupWith({ seed, enabledCategories: ['c1'], level: 'l1' }),
        mixedDeck,
      );

      expect(currentCard(state).source).toBe('shipped');
    }
  });

  it('should use the generator twice for a draw with both sources and once with one source', () => {
    const both = startRound(
      setupWith({ seed: 5, enabledCategories: ['c1'], level: 'l1' }),
      mixedDeck,
    );
    const shippedOnly = startRound(
      setupWith({ seed: 5, enabledCategories: ['c1'], level: 'l1' }),
      deckOf(...shippedCards(6, 2)),
    );
    const playerOnly = startRound(
      setupWith({ seed: 5, enabledCategories: ['c1'], level: 'l1' }),
      deckOf(...playerSolo),
    );
    const afterOneCall = nextRandom(5).state;
    const afterTwoCalls = nextRandom(afterOneCall).state;

    expect(both.randomState).toBe(afterTwoCalls);
    expect(shippedOnly.randomState).toBe(afterOneCall);
    expect(playerOnly.randomState).toBe(afterOneCall);
  });

  it('should deal the same round again for the same seed', () => {
    const first = playOut(startRound(setupWith({ seed: 9 }), mixedDeck));
    const second = playOut(startRound(setupWith({ seed: 9 }), mixedDeck));

    expect(second).toEqual(first);
  });

  it('should show a couple their own cards across many seeds without crowding out the deck', () => {
    const sources = Array.from(
      { length: 40 },
      (_, seed) =>
        currentCard(
          startRound(
            setupWith({ seed: seed + 1, enabledCategories: ['c1'], level: 'l1' }),
            mixedDeck,
          ),
        ).source,
    );
    const playerShare = sources.filter((source) => source === 'player').length / sources.length;

    expect(playerShare).toBeGreaterThan(0.3);
    expect(playerShare).toBeLessThan(0.7);
  });

  it('should deal a player card when it is the only card of the kind in the category', () => {
    const deck = deckOf(...makeCards('c1', 'solo', 2, 'player'));

    expect(
      playOut(startRound(setupWith({ enabledCategories: ['c1'], level: 'l1' }), deck)),
    ).toHaveLength(2);
  });

  it('should never deal a card twice in a round', () => {
    const ids = playOut(startRound(setupWith({ seed: 3, length: 'endless' }), mixedDeck)).map(
      (card) => card.id,
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should deal a player together card only as a together card', () => {
    const deck = deckOf(...makeCards('c1', 'solo', 8), ...makeCards('c1', 'together', 3, 'player'));
    const dealt = playOut(
      startRound(setupWith({ seed: 4, enabledCategories: ['c1'], level: 'l1', length: 10 }), deck),
    );

    dealt.forEach((card, index) => {
      if (card.source === 'player') expect((index + 1) % 5).toBe(0);
    });
    expect(dealt.filter((card) => card.source === 'player').length).toBeGreaterThan(0);
  });

  it('should replace a removed player card with a card of the same kind', () => {
    const seed = 7;
    expect(nextRandom(seed).value).toBeLessThan(0.5);
    const state = startRound(
      setupWith({ seed, enabledCategories: ['c1'], level: 'l1' }),
      mixedDeck,
    );
    const replaced = reduceRound(state, { type: 'removeCard' });

    expect(currentCard(state).source).toBe('player');
    expect(currentCard(replaced).kind).toBe('solo');
    expect(currentCard(replaced).id).not.toBe(currentCard(state).id);
  });

  it('should drop player cards of a category when the category is switched off', () => {
    const deck = deckOf(...shippedCards(6, 2), ...makeCards('c2', 'solo', 6, 'player'));
    const state = startRound(setupWith({ seed: 2 }), deck);
    const disabled = reduceRound(state, { type: 'disableCategory', category: 'c2' });

    expect(disabled.unused.some((card) => card.category === 'c2')).toBe(false);
  });
});

describe('cards with a timer effect', () => {
  const timerEffect = { type: 'timer', seconds: 30 } as const;
  const timerCards: Card[] = makeCards('c1', 'solo', 3).map((card) => ({
    ...card,
    id: `timer-${card.id}`,
    effect: timerEffect,
  }));

  it('should be left out of the normal deal', () => {
    const deck = deckOf(...shippedCards(6, 2), ...timerCards);
    const dealt = playOut(startRound(setupWith({ seed: 6, length: 'endless' }), deck));

    expect(dealt.filter((card) => card.effect !== undefined)).toEqual([]);
    expect(dealt).toHaveLength(shippedCards(6, 2).length);
  });

  it('should stay in the cards not yet dealt, for the timer surprise', () => {
    const deck = deckOf(...makeCards('c1', 'solo', 2), ...timerCards);
    const state = startRound(setupWith({ enabledCategories: ['c1'], level: 'l1' }), deck);

    expect(state.unused.filter((card) => card.effect !== undefined)).toHaveLength(3);
  });

  it('should end a round that has only timer cards', () => {
    const state = startRound(
      setupWith({ enabledCategories: ['c1'], level: 'l1' }),
      deckOf(...timerCards),
    );

    expect(isRoundOver(state)).toBe(true);
  });

  it('should not make the fifth card together when its category has only a timer together card', () => {
    const timerTogether = makeCards('c1', 'together', 1).map((card) => ({
      ...card,
      effect: timerEffect,
    }));
    const deck = deckOf(
      ...makeCards('c1', 'solo', 10),
      ...timerTogether,
      ...makeCards('c2', 'solo', 10),
      ...makeCards('c2', 'together', 2),
    );
    const dealt = playOut(
      startRound(setupWith({ enabledCategories: ['c1', 'c2'], level: 'l2', length: 10 }), deck),
    );

    expect(dealt[4]).toMatchObject({ category: 'c1', kind: 'solo' });
  });

  it('should leave a vibrate card in the normal deal', () => {
    const vibrate = makeCards('c1', 'solo', 1).map((card) => ({
      ...card,
      effect: { type: 'vibrate', seconds: 5 } as const,
    }));
    const state = startRound(
      setupWith({ enabledCategories: ['c1'], level: 'l1' }),
      deckOf(...vibrate),
    );

    expect(currentCard(state).effect).toEqual({ type: 'vibrate', seconds: 5 });
  });
});
