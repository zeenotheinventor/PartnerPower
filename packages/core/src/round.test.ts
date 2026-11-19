import { categoryIds } from './contentModel';
import type { Card, CardKind, CategoryId, Deck, LevelId } from './contentModel';
import { isRoundOver, reduceRound, startRound, summarise } from './round';
import type { RoundAction, RoundLength, RoundSetup, RoundState } from './round';

type KindCounts = { solo: number; together: number };
type CardCounts = Partial<Record<CategoryId, KindCounts>>;

function makeCards(category: CategoryId, kind: CardKind, count: number): Card[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${category}-${kind}-${index + 1}`,
    category,
    kind,
    text: `Card text ${category} ${kind} ${index + 1}`,
    source: 'shipped',
  }));
}

function makeDeck(counts: CardCounts): Deck {
  const cards = categoryIds.flatMap((category) => {
    const { solo, together } = counts[category] ?? { solo: 0, together: 0 };
    return [...makeCards(category, 'solo', solo), ...makeCards(category, 'together', together)];
  });
  return { id: 'deck-1', version: 1, cards };
}

const plentiful: CardCounts = {
  c1: { solo: 12, together: 4 },
  c2: { solo: 12, together: 4 },
  c3: { solo: 12, together: 4 },
  c4: { solo: 12, together: 4 },
};

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

function start(overrides: Partial<RoundSetup> = {}, counts: CardCounts = plentiful): RoundState {
  return startRound(setupWith(overrides), makeDeck(counts));
}

function act(state: RoundState, ...actions: RoundAction[]): RoundState {
  return actions.reduce(reduceRound, state);
}

function times(count: number, action: RoundAction): RoundAction[] {
  return Array.from({ length: count }, () => action);
}

function playOut(state: RoundState, action: RoundAction = { type: 'done' }): RoundState {
  let current = state;
  for (let guard = 0; guard < 1000 && !isRoundOver(current); guard += 1) {
    current = reduceRound(current, action);
  }
  return current;
}

function categoriesPlayed(state: RoundState): CategoryId[] {
  return state.history.map((entry) => entry.category);
}

function repeated(category: CategoryId, count: number): CategoryId[] {
  return Array.from({ length: count }, () => category);
}

function currentCard(state: RoundState): Card {
  if (state.current === null) throw new Error('Expected the round to have a current card');
  return state.current.card;
}

function drinksOf(state: RoundState): number[] {
  return summarise(state).players.map((player) => player.drinks);
}

describe('startRound', () => {
  it('should deal the first card to the first player from the lowest enabled category', () => {
    const state = start({ enabledCategories: ['c2', 'c3'] });

    expect(state.current?.card.category).toBe('c2');
    expect(state.current?.player).toBe(0);
  });

  it('should treat the enabled categories as a set and not care about their order', () => {
    const state = start({ enabledCategories: ['c4', 'c1', 'c3'] });

    expect(categoriesPlayed(playOut(state))).toEqual([
      ...repeated('c1', 6),
      ...repeated('c3', 7),
      ...repeated('c4', 7),
    ]);
  });

  it('should not mark the first card as stepping up', () => {
    expect(start().current?.steppingUp).toBe(false);
  });

  it('should start with an empty history and a round that is not over', () => {
    const state = start();

    expect(state.history).toEqual([]);
    expect(isRoundOver(state)).toBe(false);
  });

  it('should reject a player without a name', () => {
    expect(() => start({ players: ['Player one', '  '] })).toThrow('both players need a name');
  });

  it('should reject a setup with no enabled category', () => {
    expect(() => start({ enabledCategories: [] })).toThrow('at least one category must be enabled');
  });

  it('should reject an unknown category', () => {
    expect(() => start({ enabledCategories: ['c1', 'c9' as CategoryId] })).toThrow(
      'unknown category "c9"',
    );
  });

  it('should reject a category outside the level', () => {
    expect(() => start({ level: 'l2', enabledCategories: ['c1', 'c3'] })).toThrow(
      'category "c3" is not part of level "l2"',
    );
  });

  it('should reject a category listed twice', () => {
    expect(() => start({ enabledCategories: ['c1', 'c1'] })).toThrow(
      'category "c1" is listed twice',
    );
  });

  it('should reject a seed that is not a whole number', () => {
    expect(() => start({ seed: 1.5 })).toThrow('seed must be a whole number');
  });

  it('should start a round that is already over when the enabled categories have no cards', () => {
    const state = start({}, { c1: { solo: 0, together: 0 } });

    expect(isRoundOver(state)).toBe(true);
  });
});

describe('dealing', () => {
  it('should deal cards from enabled categories only', () => {
    const state = playOut(start({ enabledCategories: ['c2', 'c4'] }));

    expect(new Set(categoriesPlayed(state))).toEqual(new Set(['c2', 'c4']));
  });

  it('should alternate turns between the two players', () => {
    const state = playOut(start({ length: 10 }, { c1: { solo: 12, together: 0 } }));

    expect(state.history.map((entry) => entry.player)).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
  });

  it('should not repeat a card within a round', () => {
    const state = playOut(start({ length: 'endless' }));

    const ids = state.history.map((entry) => entry.cardId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('pacing a round of fixed length', () => {
  it('should spread 20 cards evenly over four categories, lowest first', () => {
    const state = playOut(start({ length: 20 }));

    expect(categoriesPlayed(state)).toEqual([
      ...repeated('c1', 5),
      ...repeated('c2', 5),
      ...repeated('c3', 5),
      ...repeated('c4', 5),
    ]);
  });

  it('should give the remainder to the higher categories, 10 cards over three being 3, 3, 4', () => {
    const state = playOut(start({ length: 10, enabledCategories: ['c1', 'c2', 'c3'] }));

    expect(categoriesPlayed(state)).toEqual([
      ...repeated('c1', 3),
      ...repeated('c2', 3),
      ...repeated('c3', 4),
    ]);
  });

  it('should deal 10 cards over four categories as 2, 2, 3, 3', () => {
    const state = playOut(start({ length: 10 }));

    expect(categoriesPlayed(state)).toEqual([
      ...repeated('c1', 2),
      ...repeated('c2', 2),
      ...repeated('c3', 3),
      ...repeated('c4', 3),
    ]);
  });

  it('should stay in one category when only one is enabled', () => {
    const state = playOut(start({ length: 10, enabledCategories: ['c3'] }));

    expect(new Set(categoriesPlayed(state))).toEqual(new Set(['c3']));
  });

  it('should end after exactly the round length, together cards included', () => {
    const state = playOut(start({ length: 20 }));

    expect(state.history).toHaveLength(20);
    expect(state.history.filter((entry) => entry.kind === 'together')).toHaveLength(4);
    expect(isRoundOver(state)).toBe(true);
  });
});

describe('pacing an endless round', () => {
  it('should step up one category every 5 cards and then stay in the highest', () => {
    const state = playOut(start({ length: 'endless' }));

    expect(categoriesPlayed(state).slice(0, 25)).toEqual([
      ...repeated('c1', 5),
      ...repeated('c2', 5),
      ...repeated('c3', 5),
      ...repeated('c4', 10),
    ]);
  });

  it('should end by itself only when no unused card is left', () => {
    const deck = makeDeck(plentiful);
    const state = playOut(startRound(setupWith({ length: 'endless' }), deck));

    expect(state.history).toHaveLength(deck.cards.length);
  });
});

describe('together cards', () => {
  it('should deal a together card at every 5th card of the round', () => {
    const state = playOut(start({ length: 20 }));

    const positions = state.history.flatMap((entry, index) =>
      entry.kind === 'together' ? [index + 1] : [],
    );
    expect(positions).toEqual([5, 10, 15, 20]);
  });

  it('should deal the together card from the category of that position', () => {
    const state = playOut(start({ length: 20 }));

    const together = state.history.filter((entry) => entry.kind === 'together');
    expect(together.map((entry) => entry.category)).toEqual(['c1', 'c2', 'c3', 'c4']);
  });

  it('should deal a solo card at the interval when the category has no together card', () => {
    const state = playOut(
      start({ length: 10, enabledCategories: ['c1'] }, { c1: { solo: 12, together: 0 } }),
    );

    expect(state.history.every((entry) => entry.kind === 'solo')).toBe(true);
  });

  it('should not consume a turn, so the same player plays the next solo card', () => {
    const state = playOut(start({ length: 10 }));

    expect(state.history[4]?.kind).toBe('together');
    expect(state.history[4]?.player).toBe(0);
    expect(state.history[5]?.player).toBe(0);
  });
});

describe('penalties', () => {
  it('should charge the category penalty to the player who passes a solo card', () => {
    expect(drinksOf(act(start(), { type: 'pass' }))).toEqual([1, 0]);
  });

  it.each([
    ['c1', 1],
    ['c2', 2],
    ['c3', 3],
    ['c4', 4],
  ] as const)('should charge the penalty of %s, which is %i, for a pass', (category, penalty) => {
    const state = start(
      { enabledCategories: [category] },
      { [category]: { solo: 3, together: 0 } },
    );

    expect(drinksOf(act(state, { type: 'pass' }))).toEqual([penalty, 0]);
  });

  it('should make both players drink when a together card is passed', () => {
    const atTogether = act(
      start({ length: 10, enabledCategories: ['c1'] }),
      ...times(4, { type: 'done' }),
    );

    expect(currentCard(atTogether).kind).toBe('together');
    expect(drinksOf(act(atTogether, { type: 'pass' }))).toEqual([1, 1]);
  });

  it('should charge both players the penalty of the category of the together card', () => {
    const atTogether = act(start({ length: 20 }), ...times(9, { type: 'done' }));

    expect(currentCard(atTogether)).toMatchObject({ kind: 'together', category: 'c2' });
    expect(drinksOf(act(atTogether, { type: 'pass' }))).toEqual([2, 2]);
  });

  it('should charge nothing for a card that is done', () => {
    expect(drinksOf(playOut(start()))).toEqual([0, 0]);
  });
});

describe('removeCard', () => {
  it('should replace the current card with another from the same category', () => {
    const before = start();
    const after = act(before, { type: 'removeCard' });

    expect(currentCard(after).id).not.toBe(currentCard(before).id);
    expect(currentCard(after).category).toBe(currentCard(before).category);
  });

  it('should not cost a turn, a card of the round length or a drink', () => {
    const before = start();
    const after = act(before, { type: 'removeCard' });

    expect(after.current?.player).toBe(before.current?.player);
    expect(after.history).toEqual([]);
    expect(drinksOf(after)).toEqual([0, 0]);
  });

  it('should never bring the removed card back in the round', () => {
    const state = start({ length: 'endless' });
    const removedId = currentCard(state).id;

    const played = playOut(act(state, { type: 'removeCard' }));

    expect(played.history.map((entry) => entry.cardId)).not.toContain(removedId);
  });

  it('should keep a round of 10 at 10 played cards however many are removed', () => {
    const played = playOut(act(start({ length: 10 }), ...times(2, { type: 'removeCard' })));

    expect(played.history).toHaveLength(10);
  });

  it('should replace a together card with another together card', () => {
    const atTogether = act(
      start({ length: 10, enabledCategories: ['c1'] }),
      ...times(4, { type: 'done' }),
    );

    const replaced = act(atTogether, { type: 'removeCard' });

    expect(currentCard(replaced).kind).toBe('together');
    expect(currentCard(replaced).id).not.toBe(currentCard(atTogether).id);
  });

  it('should end the round when no replacement card is left', () => {
    const state = start({ length: 10 }, { c1: { solo: 1, together: 0 } });

    expect(isRoundOver(act(state, { type: 'removeCard' }))).toBe(true);
  });
});

describe('disableCategory', () => {
  const threeCategories: Partial<RoundSetup> = {
    length: 10,
    enabledCategories: ['c1', 'c2', 'c3'],
  };

  it('should refuse to disable the last enabled category and return the same state', () => {
    const state = start({ enabledCategories: ['c2'] });

    expect(reduceRound(state, { type: 'disableCategory', category: 'c2' })).toBe(state);
  });

  it('should return the same state for a category that is not enabled', () => {
    const state = start({ enabledCategories: ['c1', 'c2'] });

    expect(reduceRound(state, { type: 'disableCategory', category: 'c4' })).toBe(state);
  });

  it('should replace the current card at no cost when it is in the disabled category', () => {
    const after = act(start(threeCategories), { type: 'disableCategory', category: 'c1' });

    expect(currentCard(after).category).toBe('c2');
    expect(after.history).toEqual([]);
    expect(after.current?.player).toBe(0);
  });

  it('should keep the current card when it is in another category', () => {
    const state = start(threeCategories);

    const after = act(state, { type: 'disableCategory', category: 'c3' });

    expect(currentCard(after).id).toBe(currentCard(state).id);
  });

  it('should continue the pacing through the remaining categories', () => {
    const state = start(threeCategories);

    const played = playOut(
      act(state, { type: 'done' }, { type: 'disableCategory', category: 'c2' }),
    );

    expect(categoriesPlayed(played)).toEqual([...repeated('c1', 3), ...repeated('c3', 7)]);
  });

  it('should fall back to a lower category when the disabled one was the highest', () => {
    const state = start({ length: 10, enabledCategories: ['c1', 'c2'] });

    const played = playOut(act(state, { type: 'disableCategory', category: 'c2' }));

    expect(new Set(categoriesPlayed(played))).toEqual(new Set(['c1']));
  });

  it('should flag a replacement in a higher category than the last one played as stepping up', () => {
    const atSecondCategory = act(start(threeCategories), ...times(3, { type: 'done' }));
    expect(currentCard(atSecondCategory).category).toBe('c2');

    const replaced = act(atSecondCategory, { type: 'disableCategory', category: 'c2' });

    expect(currentCard(replaced).category).toBe('c3');
    expect(replaced.current?.steppingUp).toBe(true);
  });
});

describe('end', () => {
  it('should finish the round', () => {
    expect(isRoundOver(act(start(), { type: 'end' }))).toBe(true);
  });

  it('should keep what was played so the summary still counts it', () => {
    const state = act(start(), { type: 'done' }, { type: 'end' });

    expect(summarise(state).cardsPlayed).toBe(1);
  });

  it.each<RoundAction>([
    { type: 'done' },
    { type: 'pass' },
    { type: 'removeCard' },
    { type: 'disableCategory', category: 'c1' },
    { type: 'end' },
  ])('should return the same state for $type on a finished round', (action) => {
    const finished = act(start(), { type: 'end' });

    expect(reduceRound(finished, action)).toBe(finished);
  });
});

describe('fallback when a category has no card left', () => {
  it('should take a card from the next higher enabled category', () => {
    const state = playOut(
      start(
        { length: 10, enabledCategories: ['c1', 'c2'] },
        { c1: { solo: 2, together: 0 }, c2: { solo: 10, together: 0 } },
      ),
    );

    expect(categoriesPlayed(state).slice(0, 3)).toEqual(['c1', 'c1', 'c2']);
  });

  it('should take a card from a lower category when none is left above', () => {
    const state = playOut(
      start(
        { length: 10, enabledCategories: ['c1', 'c2'] },
        { c1: { solo: 8, together: 0 }, c2: { solo: 3, together: 0 } },
      ),
    );

    expect(categoriesPlayed(state).slice(5, 9)).toEqual(['c2', 'c2', 'c2', 'c1']);
  });

  it('should end the round when no card is left anywhere', () => {
    const state = playOut(start({ length: 10 }, { c1: { solo: 3, together: 0 } }));

    expect(state.history).toHaveLength(3);
    expect(isRoundOver(state)).toBe(true);
  });
});

describe('what the screens need to know', () => {
  it('should flag the first card of a higher category as stepping up', () => {
    let state = start({ length: 20 });
    const steppingUpPositions: number[] = [];
    while (!isRoundOver(state)) {
      if (state.current?.steppingUp) steppingUpPositions.push(state.history.length + 1);
      state = act(state, { type: 'done' });
    }

    expect(steppingUpPositions).toEqual([6, 11, 16]);
  });

  it('should say which player holds the phone and change it from card to card', () => {
    const first = start({ length: 10, enabledCategories: ['c1'] });
    const second = act(first, { type: 'done' });

    expect([first.current?.player, second.current?.player]).toEqual([0, 1]);
  });
});

describe('summarise', () => {
  it('should count the dares each player did and the drinks each took', () => {
    const state = act(start(), { type: 'done' }, { type: 'pass' }, { type: 'done' });

    expect(summarise(state).players).toEqual([
      { name: 'Player one', daresDone: 2, drinks: 0 },
      { name: 'Player two', daresDone: 0, drinks: 1 },
    ]);
  });

  it('should count a together card done as one done for each player', () => {
    const state = act(
      start({ length: 10, enabledCategories: ['c1'] }),
      ...times(5, { type: 'done' }),
    );

    expect(summarise(state).players.map((player) => player.daresDone)).toEqual([3, 3]);
  });

  it('should name the player with more dares done as the boldest', () => {
    const state = act(start(), { type: 'done' }, { type: 'pass' }, { type: 'done' });

    expect(summarise(state).boldest).toBe(0);
  });

  it('should report equal dares done as a tie and not break it by drinks', () => {
    const state = act(
      start(),
      { type: 'done' },
      { type: 'done' },
      { type: 'pass' },
      { type: 'pass' },
    );

    expect(summarise(state).players.map((player) => player.daresDone)).toEqual([1, 1]);
    expect(drinksOf(state)).toEqual([1, 1]);
    expect(summarise(state).boldest).toBe('tie');
  });

  it('should report a tie for a round with no cards played', () => {
    expect(summarise(start()).boldest).toBe('tie');
  });

  it('should report the cards played and the categories reached, lowest first', () => {
    const summary = summarise(act(start({ length: 20 }), ...times(7, { type: 'done' })));

    expect(summary.cardsPlayed).toBe(7);
    expect(summary.categoriesReached).toEqual(['c1', 'c2']);
  });

  it('should not count a removed card as played', () => {
    const state = act(start(), { type: 'removeCard' }, { type: 'done' });

    expect(summarise(state).cardsPlayed).toBe(1);
  });
});

describe('seeds and serialisation', () => {
  function cardIdsFor(seed: number): string[] {
    return playOut(start({ seed })).history.map((entry) => entry.cardId);
  }

  it('should deal the same round for the same seed and actions', () => {
    expect(cardIdsFor(5)).toEqual(cardIdsFor(5));
  });

  it('should deal a different round for a different seed', () => {
    expect(cardIdsFor(5)).not.toEqual(cardIdsFor(6));
  });

  it('should keep the state plain data that survives a JSON round trip', () => {
    const state = act(start(), { type: 'done' }, { type: 'removeCard' });
    const restored: RoundState = JSON.parse(JSON.stringify(state));

    expect(restored).toEqual(state);
    expect(playOut(restored)).toEqual(playOut(state));
  });

  it('should not change the state it is given', () => {
    const state = start();
    const snapshot = JSON.stringify(state);

    act(
      state,
      { type: 'done' },
      { type: 'removeCard' },
      { type: 'disableCategory', category: 'c2' },
    );

    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('properties over many seeds', () => {
  const seeds = Array.from({ length: 200 }, (_, index) => index);
  const setups: [LevelId, CategoryId[]][] = [
    ['l3', ['c1', 'c2', 'c3', 'c4']],
    ['l3', ['c2', 'c4']],
    ['l2', ['c1', 'c2']],
    ['l1', ['c1']],
  ];
  const lengths: RoundLength[] = [10, 20, 'endless'];

  it.each(lengths)('should keep every rule in a round of length %s', (length) => {
    const deck = makeDeck(plentiful);
    for (const seed of seeds) {
      for (const [level, enabledCategories] of setups) {
        const state = playOut(
          startRound(setupWith({ level, enabledCategories, length, seed }), deck),
        );

        const ids = state.history.map((entry) => entry.cardId);
        expect(new Set(ids).size).toBe(ids.length);

        expect(state.history.every((entry) => enabledCategories.includes(entry.category))).toBe(
          true,
        );

        // An endless round only steps down once its highest category runs dry, after 21 cards at the soonest here.
        const ranks = state.history
          .slice(0, 20)
          .map((entry) => categoryIds.indexOf(entry.category));
        expect(ranks).toEqual([...ranks].sort((left, right) => left - right));

        const available = deck.cards.filter((card) => enabledCategories.includes(card.category));
        expect(state.history).toHaveLength(
          length === 'endless' ? available.length : Math.min(length, available.length),
        );
      }
    }
  });
});
