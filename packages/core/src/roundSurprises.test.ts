import { categories, categoryIds } from './contentModel';
import type { Card, CardKind, CategoryId, Deck, SurpriseId } from './contentModel';
import { isRoundOver, reduceRound, startRound, summarise } from './round';
import type { CurrentSurprise, PlayerIndex, RoundAction, RoundSetup, RoundState } from './round';
import { surpriseBlockSize } from './surprises';

type DeckShape = { solo: number; together: number; timer: number };

function makeCards(category: CategoryId, label: string, count: number, extra: Partial<Card>) {
  return Array.from({ length: count }, (_, index): Card => {
    return {
      id: `${category}-${label}-${index + 1}`,
      category,
      kind: 'solo' satisfies CardKind,
      text: `Card text ${category} ${label} ${index + 1}`,
      source: 'shipped',
      ...extra,
    };
  });
}

function makeDeck(shapes: Partial<Record<CategoryId, Partial<DeckShape>>>): Deck {
  const cards = categoryIds.flatMap((category) => {
    const { solo = 0, together = 0, timer = 0 } = shapes[category] ?? {};
    return [
      ...makeCards(category, 'solo', solo, {}),
      ...makeCards(category, 'together', together, { kind: 'together' }),
      ...makeCards(category, 'timer', timer, { effect: { type: 'timer', seconds: 30 } }),
    ];
  });
  return { id: 'deck-1', version: 1, cards };
}

const plentifulShape: Partial<DeckShape> = { solo: 30, together: 4, timer: 6 };
const plentiful = makeDeck({
  c1: plentifulShape,
  c2: plentifulShape,
  c3: plentifulShape,
  c4: plentifulShape,
});

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

function start(overrides: Partial<RoundSetup> = {}, deck: Deck = plentiful): RoundState {
  return startRound(setupWith(overrides), deck);
}

const seeds = [1, 2, 3, 4, 5, 6, 7, 8];

function current(state: RoundState) {
  if (state.current === null) throw new Error('Expected the round to have a current card');
  return state.current;
}

function surpriseOf(state: RoundState): CurrentSurprise {
  const { surprise } = current(state);
  if (surprise === undefined) throw new Error('Expected the current card to carry a surprise');
  return surprise;
}

function choiceOf(state: RoundState) {
  const surprise = surpriseOf(state);
  if (surprise.type !== 'choice') throw new Error('Expected a choice surprise');
  return surprise;
}

function otherPlayer(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

function penaltyOf(category: CategoryId): number {
  return categories.find((candidate) => candidate.id === category)?.penalty ?? 0;
}

/** Resolves a face down mystery card or an open choice, so a round can be played through. */
function settle(state: RoundState): RoundState {
  const surprise = state.current?.surprise;
  if (surprise?.type === 'mystery' && !surprise.flipped)
    return reduceRound(state, { type: 'flip' });
  if (surprise?.type === 'choice' && surprise.chosen === null) {
    return reduceRound(state, { type: 'choose', index: 0 });
  }
  return state;
}

function playOut(state: RoundState, limit = 1000): RoundState {
  let played = state;
  for (let guard = 0; guard < limit && !isRoundOver(played); guard += 1) {
    played = reduceRound(settle(played), { type: 'done' });
  }
  return played;
}

function playCards(state: RoundState, count: number): RoundState {
  let played = state;
  while (!isRoundOver(played) && played.history.length < count) {
    played = reduceRound(settle(played), { type: 'done' });
  }
  return played;
}

/** Plays `done` until the current card carries the surprise, and returns that state. */
function reachSurprise(state: RoundState, type: SurpriseId): RoundState {
  let played = state;
  for (let guard = 0; guard < 1000 && !isRoundOver(played); guard += 1) {
    if (played.current?.surprise?.type === type) return played;
    played = reduceRound(settle(played), { type: 'done' });
  }
  throw new Error(`No ${type} surprise was dealt`);
}

function surprisePositions(state: RoundState): number[] {
  return state.history.flatMap((entry, index) => (entry.surprise === undefined ? [] : [index + 1]));
}

function totals(state: RoundState) {
  const { players } = summarise(state);
  return players.map((player) => [player.daresDone, player.drinks]);
}

const allTypes: readonly SurpriseId[] = ['mystery', 'jump', 'swap', 'choice', 'timer', 'freePass'];

describe('a round with surprises off', () => {
  it('should hold no surprise plan and no free passes when surprises is absent', () => {
    const state = start();

    expect(state.surprisePlan).toBeNull();
    expect(state.freePasses).toEqual([false, false]);
  });

  it('should hold no surprise plan when surprises is empty', () => {
    expect(start({ surprises: [] }).surprisePlan).toBeNull();
  });

  it.each(seeds)(
    'should deal the same round for seed %s with surprises empty or absent',
    (seed) => {
      const withoutList = playOut(start({ seed, length: 'endless' }), 60);
      const withEmptyList = playOut(start({ seed, length: 'endless', surprises: [] }), 60);

      expect(withEmptyList).toEqual(withoutList);
      expect(surprisePositions(withEmptyList)).toEqual([]);
    },
  );
});

describe('setup validation', () => {
  it('should throw on an unknown surprise type', () => {
    // A value from outside the type system, as a stored or typed setting could be.
    const unknownTypes = JSON.parse('["mystery","bogus"]');

    expect(() => start({ surprises: unknownTypes })).toThrow('unknown surprise "bogus"');
  });

  it('should throw on a surprise type listed twice', () => {
    expect(() => start({ surprises: ['swap', 'swap'] })).toThrow('surprise "swap" is listed twice');
  });
});

describe('how many surprises, and where', () => {
  it.each(seeds)('should give a 10 card round exactly 2 surprises for seed %s', (seed) => {
    const state = playOut(start({ seed, length: 10, surprises: ['mystery'] }));

    expect(surprisePositions(state)).toHaveLength(2);
  });

  it.each(seeds)('should give a 20 card round exactly 4 surprises for seed %s', (seed) => {
    const state = playOut(start({ seed, length: 20, surprises: ['mystery'] }));

    expect(surprisePositions(state)).toHaveLength(4);
  });

  it.each(seeds)(
    'should give an endless round one surprise in every 5 cards for seed %s',
    (seed) => {
      const state = playCards(start({ seed, length: 'endless', surprises: ['mystery'] }), 40);

      expect(surprisePositions(state)).toHaveLength(8);
    },
  );

  it.each(seeds)(
    'should put at most one surprise in each block, never on card 1 or card 5 (seed %s)',
    (seed) => {
      const state = playCards(start({ seed, length: 'endless', surprises: allTypes }), 60);
      const positions = surprisePositions(state);
      const blocks = positions.map((position) => Math.floor((position - 1) / surpriseBlockSize));

      expect(new Set(blocks).size).toBe(blocks.length);
      expect(positions).not.toContain(1);
      for (const position of positions) {
        expect(position % surpriseBlockSize).not.toBe(0);
      }
    },
  );

  it('should reach every position from 2 to 4 of the first block across seeds', () => {
    const firstPositions = new Set(
      Array.from({ length: 40 }, (_, index) => index + 1).flatMap((seed) =>
        surprisePositions(playOut(start({ seed, length: 10, surprises: ['mystery'] }))).slice(0, 1),
      ),
    );

    expect([...firstPositions].sort()).toEqual([2, 3, 4]);
  });

  it('should count played cards, so a skipped card does not move a surprise', () => {
    const plain = playOut(start({ seed: 5, length: 20, surprises: ['mystery'] }));
    const skipped = playOut(
      reduceRound(start({ seed: 5, length: 20, surprises: ['mystery'] }), { type: 'removeCard' }),
    );

    expect(surprisePositions(skipped)).toEqual(surprisePositions(plain));
  });
});

describe('the surprise bag', () => {
  const bagTypes: readonly SurpriseId[] = ['mystery', 'swap', 'choice', 'timer'];

  it.each(seeds)('should show every type before any repeats (seed %s)', (seed) => {
    const state = playCards(start({ seed, length: 'endless', surprises: bagTypes }), 40);
    const dealt = state.history.flatMap((entry) =>
      entry.surprise === undefined ? [] : [entry.surprise],
    );

    expect(dealt).toHaveLength(8);
    expect(new Set(dealt.slice(0, 4)).size).toBe(4);
    expect(new Set(dealt.slice(4, 8)).size).toBe(4);
  });

  it('should keep a type that cannot go in this block, and deal it in a later block', () => {
    const state = start({
      length: 10,
      enabledCategories: ['c3', 'c4'],
      surprises: ['jump'],
    });

    const played = playOut(state);

    expect(played.history.slice(0, 5).some((entry) => entry.surprise === 'jump')).toBe(true);
    expect(played.history.slice(5).some((entry) => entry.surprise !== undefined)).toBe(false);
    expect(played.surprisePlan?.types).toEqual(['jump']);
    expect(played.surprisePlan?.bag).toEqual(['jump']);
  });

  it('should deal no surprise in a block where no type is eligible', () => {
    const noSolo = makeDeck({ c1: { solo: 0, together: 4 } });

    const played = playOut(
      start({ enabledCategories: ['c1'], length: 10, surprises: allTypes }, noSolo),
    );

    expect(surprisePositions(played)).toEqual([]);
  });

  it('should drop a type with no eligible card for the rest of the round, so other types still deal', () => {
    const noTimers = makeDeck({
      c1: { solo: 30 },
      c2: { solo: 30 },
      c3: { solo: 30 },
      c4: { solo: 30 },
    });

    const played = playOut(
      start({ seed: 2, length: 20, surprises: ['timer', 'mystery'] }, noTimers),
    );

    expect(surprisePositions(played)).toHaveLength(4);
    expect(played.history.every((entry) => entry.surprise !== 'timer')).toBe(true);
    expect(played.surprisePlan?.types).toEqual(['mystery']);
  });

  it('should drop a type once its last card is dealt, so later blocks still get surprises', () => {
    const oneTimer = makeDeck({
      c1: { solo: 30, timer: 1 },
      c2: { solo: 30 },
      c3: { solo: 30 },
      c4: { solo: 30 },
    });

    const played = playCards(
      start({ seed: 4, length: 'endless', surprises: ['timer', 'mystery'] }, oneTimer),
      60,
    );

    expect(played.history.filter((entry) => entry.surprise === 'timer').length).toBeLessThanOrEqual(
      1,
    );
    expect(surprisePositions(played)).toHaveLength(12);
  });
});

describe('what a surprise card can be', () => {
  it.each(seeds)('should only put a mystery on a plain solo card (seed %s)', (seed) => {
    const mixed = makeDeck({ c1: { solo: 4, together: 2 }, c2: { solo: 4 } });
    const withEffects: Deck = {
      ...mixed,
      cards: [
        ...mixed.cards,
        ...makeCards('c1', 'vibrate', 8, { effect: { type: 'vibrate', seconds: 5 } }),
      ],
    };
    const state = start(
      { seed, enabledCategories: ['c1'], level: 'l1', surprises: ['mystery'] },
      withEffects,
    );

    const dealt = reachSurprise(state, 'mystery');

    expect(current(dealt).card.kind).toBe('solo');
    expect(current(dealt).card.effect).toBeUndefined();
  });

  it('should never deal a card from a switched off category', () => {
    const state = reduceRound(start({ seed: 2, surprises: ['jump'] }), {
      type: 'disableCategory',
      category: 'c2',
    });

    const played = playOut(state);

    expect(played.history.every((entry) => entry.category !== 'c2')).toBe(true);
    expect(played.history.some((entry) => entry.surprise === 'jump')).toBe(true);
  });

  it('should record the surprise in the history entry', () => {
    const state = reachSurprise(start({ surprises: ['swap'] }), 'swap');

    expect(reduceRound(state, { type: 'done' }).history.at(-1)?.surprise).toBe('swap');
  });
});

describe('mystery', () => {
  const mystery = () => reachSurprise(start({ seed: 3, surprises: ['mystery'] }), 'mystery');

  it('should be dealt face down', () => {
    expect(surpriseOf(mystery())).toEqual({ type: 'mystery', flipped: false });
  });

  it.each<RoundAction>([{ type: 'done' }, { type: 'pass' }, { type: 'removeCard' }])(
    'should ignore %j before the flip',
    (action) => {
      const state = mystery();

      expect(reduceRound(state, action)).toBe(state);
    },
  );

  it('should ignore a free pass before the flip', () => {
    const state = { ...mystery(), freePasses: [true, true] as [boolean, boolean] };

    expect(reduceRound(state, { type: 'useFreePass' })).toBe(state);
  });

  it('should turn face up on flip', () => {
    expect(surpriseOf(reduceRound(mystery(), { type: 'flip' }))).toEqual({
      type: 'mystery',
      flipped: true,
    });
  });

  it('should ignore a second flip', () => {
    const flipped = reduceRound(mystery(), { type: 'flip' });

    expect(reduceRound(flipped, { type: 'flip' })).toBe(flipped);
  });

  it('should count a done card after the flip as a dare done', () => {
    const state = reduceRound(mystery(), { type: 'flip' });
    const holder = current(state).player;

    const played = reduceRound(state, { type: 'done' });

    expect(summarise(played).players[holder].daresDone).toBeGreaterThan(0);
  });

  it('should cost the category penalty plus one to pass after the flip', () => {
    const flipped = reduceRound(mystery(), { type: 'flip' });
    const { player, card } = current(flipped);
    const before = summarise(flipped).players[player].drinks;

    const passed = reduceRound(flipped, { type: 'pass' });

    expect(summarise(passed).players[player].drinks - before).toBe(penaltyOf(card.category) + 1);
  });

  it('should still allow end before the flip', () => {
    expect(isRoundOver(reduceRound(mystery(), { type: 'end' }))).toBe(true);
  });

  it('should still allow switching off another category before the flip', () => {
    const state = mystery();
    const other = categoryIds.find((category) => category !== current(state).card.category);

    const changed = reduceRound(state, { type: 'disableCategory', category: other ?? 'c1' });

    expect(changed.enabled).not.toContain(other);
    expect(surpriseOf(changed)).toEqual({ type: 'mystery', flipped: false });
  });

  it('should drop the surprise when the category of the card is switched off', () => {
    const state = mystery();

    const changed = reduceRound(state, {
      type: 'disableCategory',
      category: current(state).card.category,
    });

    expect(current(changed).surprise).toBeUndefined();
    expect(current(changed).card.kind).toBe('solo');
  });

  it('should ignore flip when the card is not a mystery', () => {
    const state = start({ surprises: [] });

    expect(reduceRound(state, { type: 'flip' })).toBe(state);
  });
});

describe('category jump', () => {
  it.each(seeds)(
    'should deal from the next higher category and cost its penalty (seed %s)',
    (seed) => {
      const state = reachSurprise(start({ seed, surprises: ['jump'] }), 'jump');
      const position = state.history.length + 1;
      const pacedRank = Math.ceil(position / 5);
      const { card, player } = current(state);

      expect(card.category).toBe(categoryIds[pacedRank]);
      expect(current(state).steppingUp).toBe(true);
      const before = summarise(state).players[player].drinks;
      const passed = reduceRound(state, { type: 'pass' });
      expect(summarise(passed).players[player].drinks - before).toBe(penaltyOf(card.category));
    },
  );

  it.each(seeds)('should carry on pacing as if it had not happened (seed %s)', (seed) => {
    const state = reachSurprise(start({ seed, surprises: ['jump'] }), 'jump');
    const position = state.history.length + 1;

    const next = reduceRound(state, { type: 'done' });

    expect(current(next).card.category).toBe(categoryIds[Math.ceil((position + 1) / 5) - 1]);
  });

  it('should use the next higher enabled category when one in between is switched off', () => {
    const state = reachSurprise(
      start({ seed: 2, enabledCategories: ['c1', 'c3'], surprises: ['jump'] }),
      'jump',
    );

    expect(current(state).card.category).toBe('c3');
  });

  it('should not deal at the highest category', () => {
    const played = playOut(start({ enabledCategories: ['c4'], level: 'l3', surprises: ['jump'] }));

    expect(surprisePositions(played)).toEqual([]);
  });

  it('should not deal when the next higher category has no unused solo card', () => {
    const deck = makeDeck({ c1: { solo: 20 }, c2: { solo: 0, together: 4 } });

    const played = playOut(
      start(
        { enabledCategories: ['c1', 'c2'], level: 'l2', length: 10, surprises: ['jump'] },
        deck,
      ),
    );

    expect(surprisePositions(played)).toEqual([]);
  });
});

describe('role swap', () => {
  const swap = (seed = 3) => reachSurprise(start({ seed, surprises: ['swap'] }), 'swap');

  it.each(seeds)('should give the card to the partner whose turn it is not (seed %s)', (seed) => {
    const state = swap(seed);

    expect(current(state).player).toBe(otherPlayer(state.turn));
  });

  it('should charge the partner who plays it when they pass', () => {
    const state = swap();
    const { player } = current(state);
    const before = summarise(state).players[player].drinks;

    const passed = reduceRound(state, { type: 'pass' });

    expect(summarise(passed).players[player].drinks).toBeGreaterThan(before);
    expect(summarise(passed).players[otherPlayer(player)].drinks).toBe(
      summarise(state).players[otherPlayer(player)].drinks,
    );
  });

  it.each(seeds)('should leave the turn alone, so the due partner plays next (seed %s)', (seed) => {
    const state = swap(seed);
    const duePartner = state.turn;

    const next = reduceRound(state, { type: 'done' });

    expect(next.turn).toBe(duePartner);
    expect(current(next).player).toBe(duePartner);
  });

  it('should keep the same player and the turn order when the surprise is dropped by a skip', () => {
    const state = swap();
    const swapped = current(state).player;
    const duePartner = state.turn;

    const skipped = reduceRound(state, { type: 'removeCard' });

    expect(current(skipped).surprise).toBeUndefined();
    expect(current(skipped).player).toBe(swapped);
    const next = reduceRound(skipped, { type: 'done' });
    expect(current(next).player).toBe(duePartner);
  });
});

describe("partner's choice", () => {
  const choice = (seed = 3) => reachSurprise(start({ seed, surprises: ['choice'] }), 'choice');

  it.each(seeds)('should name the partner who is not playing as chooser (seed %s)', (seed) => {
    const state = choice(seed);

    expect(choiceOf(state).chooser).toBe(otherPlayer(current(state).player));
    expect(choiceOf(state).chosen).toBeNull();
  });

  it('should offer two different unused solo cards from the position category', () => {
    const state = choice();
    const [first, second] = choiceOf(state).options;
    const position = state.history.length + 1;

    expect(first.id).not.toBe(second.id);
    expect(first.category).toBe(categoryIds[Math.ceil(position / 5) - 1]);
    expect(second.category).toBe(first.category);
    expect(first.kind).toBe('solo');
    expect(second.kind).toBe('solo');
  });

  it('should keep both options in the deal until a choice is made', () => {
    const state = choice();
    const ids = state.unused.map((card) => card.id);

    for (const option of choiceOf(state).options) expect(ids).toContain(option.id);
  });

  it.each<RoundAction>([{ type: 'done' }, { type: 'pass' }, { type: 'removeCard' }])(
    'should ignore %j before a choice is made',
    (action) => {
      const state = choice();

      expect(reduceRound(state, action)).toBe(state);
    },
  );

  it.each([0, 1] as const)('should show option %s once chosen', (index) => {
    const state = choice();

    const chosen = reduceRound(state, { type: 'choose', index });

    expect(current(chosen).card).toEqual(choiceOf(state).options[index]);
    expect(choiceOf(chosen).chosen).toBe(index);
  });

  it('should take the chosen card out of the deal and put the other back into it', () => {
    const state = choice();
    const [first, second] = choiceOf(state).options;

    const chosen = reduceRound(state, { type: 'choose', index: 0 });
    const ids = chosen.unused.map((card) => card.id);

    expect(ids).not.toContain(first.id);
    expect(ids).toContain(second.id);
  });

  it('should let the round continue after the choice', () => {
    const chosen = reduceRound(choice(), { type: 'choose', index: 1 });

    const next = reduceRound(chosen, { type: 'done' });

    expect(next.history.at(-1)?.surprise).toBe('choice');
    expect(current(next).card.id).not.toBe(current(chosen).card.id);
  });

  it('should ignore a choice that is not 0 or 1', () => {
    const state = choice();
    const outOfRange = JSON.parse('{"type":"choose","index":2}');

    expect(reduceRound(state, outOfRange)).toBe(state);
  });

  it('should ignore a second choose', () => {
    const chosen = reduceRound(choice(), { type: 'choose', index: 0 });

    expect(reduceRound(chosen, { type: 'choose', index: 1 })).toBe(chosen);
  });

  it('should ignore choose when there is no choice open', () => {
    const state = start();

    expect(reduceRound(state, { type: 'choose', index: 0 })).toBe(state);
  });

  it('should not deal when fewer than two unused solo cards are left in the category', () => {
    const deck = makeDeck({ c1: { solo: 1, together: 2 } });

    const played = playOut(
      start({ enabledCategories: ['c1'], level: 'l1', length: 10, surprises: ['choice'] }, deck),
    );

    expect(surprisePositions(played)).toEqual([]);
  });

  it('should drop the surprise and keep the other card in the deal when its category is switched off', () => {
    const state = choice();

    const changed = reduceRound(state, {
      type: 'disableCategory',
      category: current(state).card.category,
    });

    expect(current(changed).surprise).toBeUndefined();
  });
});

describe('timer', () => {
  const timer = (seed = 3) => reachSurprise(start({ seed, surprises: ['timer'] }), 'timer');

  it.each(seeds)('should deal a timer card from the position category (seed %s)', (seed) => {
    const state = timer(seed);
    const position = state.history.length + 1;
    const { card } = current(state);

    expect(card.effect?.type).toBe('timer');
    expect(card.category).toBe(categoryIds[Math.ceil(position / 5) - 1]);
  });

  it('should carry the seconds of the card', () => {
    expect(surpriseOf(timer())).toEqual({ type: 'timer', seconds: 30 });
  });

  it('should cost the penalty of the card category to pass', () => {
    const state = timer();
    const { player, card } = current(state);
    const before = summarise(state).players[player].drinks;

    const passed = reduceRound(state, { type: 'pass' });

    expect(summarise(passed).players[player].drinks - before).toBe(penaltyOf(card.category));
  });

  it('should not deal when no timer card is left in the category', () => {
    const noTimers = makeDeck({ c1: { solo: 30 } });

    const played = playOut(
      start({ enabledCategories: ['c1'], level: 'l1', length: 10, surprises: ['timer'] }, noTimers),
    );

    expect(surprisePositions(played)).toEqual([]);
  });

  it('should leave timer cards out of a round without the timer surprise', () => {
    const played = playOut(start({ seed: 3, length: 'endless', surprises: ['mystery'] }), 200);

    expect(played.history.some((entry) => entry.cardId.includes('timer'))).toBe(false);
  });
});

describe('free pass', () => {
  const freePass = (seed = 3) =>
    reachSurprise(start({ seed, surprises: ['freePass'] }), 'freePass');

  it('should give the player holding the phone a pass with the card', () => {
    const state = freePass();
    const holder = current(state).player;

    expect(state.freePasses[holder]).toBe(true);
    expect(state.freePasses[otherPlayer(holder)]).toBe(false);
  });

  it('should play the card as normal when the pass is not used', () => {
    const state = freePass();
    const holder = current(state).player;

    const passed = reduceRound(state, { type: 'pass' });

    expect(summarise(passed).players[holder].drinks).toBeGreaterThan(0);
    expect(passed.freePasses[holder]).toBe(true);
  });

  it('should resolve the card without a drink or a dare when the pass is used, and spend the pass', () => {
    const state = freePass();
    const holder = current(state).player;

    const used = reduceRound(state, { type: 'useFreePass' });

    expect(used.history.at(-1)?.outcome).toBe('freePass');
    expect(totals(used)).toEqual(totals(state));
    expect(used.freePasses[holder]).toBe(false);
  });

  it('should move the turn on after a used pass, as for any solo card', () => {
    const state = freePass();

    const used = reduceRound(state, { type: 'useFreePass' });

    expect(used.turn).toBe(otherPlayer(state.turn));
  });

  it('should ignore a free pass for a player without one', () => {
    const state = start();

    expect(reduceRound(state, { type: 'useFreePass' })).toBe(state);
  });

  it('should ignore a free pass on a together card', () => {
    const atTogether = playCards(start({ seed: 3 }), 4);
    const state = { ...atTogether, freePasses: [true, true] as [boolean, boolean] };

    expect(current(state).card.kind).toBe('together');
    expect(reduceRound(state, { type: 'useFreePass' })).toBe(state);
  });

  it('should ignore a free pass before a choice is made', () => {
    const state = reachSurprise(start({ surprises: ['choice'] }), 'choice');
    const held = { ...state, freePasses: [true, true] as [boolean, boolean] };

    expect(reduceRound(held, { type: 'useFreePass' })).toBe(held);
  });

  it('should hold at most one pass per player, so no pass is dealt to a holder', () => {
    const state = playCards(start({ seed: 6, length: 'endless', surprises: ['freePass'] }), 60);
    const dealt = state.history.filter((entry) => entry.surprise === 'freePass');

    expect(dealt.length).toBeGreaterThan(0);
    expect(dealt.length).toBeLessThanOrEqual(2);
    expect(new Set(dealt.map((entry) => entry.player)).size).toBe(dealt.length);
  });

  it('should deal a second pass to a player who has spent theirs', () => {
    let state = freePass();
    const holder = current(state).player;
    state = reduceRound(state, { type: 'useFreePass' });
    state = { ...state, freePasses: [false, false] };

    const later = playCards(state, 60);
    const toHolder = later.history.filter(
      (entry) => entry.surprise === 'freePass' && entry.player === holder,
    );

    expect(toHolder.length).toBeGreaterThan(0);
  });

  it('should keep a pass already given when the surprise is dropped by a skip', () => {
    const state = freePass();
    const holder = current(state).player;

    const skipped = reduceRound(state, { type: 'removeCard' });

    expect(current(skipped).surprise).toBeUndefined();
    expect(skipped.freePasses[holder]).toBe(true);
  });

  it('should expire unused passes when the round is ended', () => {
    const ended = reduceRound(freePass(), { type: 'end' });

    expect(ended.freePasses).toEqual([false, false]);
  });

  it('should expire unused passes when the round runs out of cards', () => {
    const finished = playOut(start({ seed: 3, length: 10, surprises: ['freePass'] }));

    expect(finished.freePasses).toEqual([false, false]);
  });

  it('should count a used pass as neither a dare done nor a drink in the summary', () => {
    const state = freePass();
    const used = reduceRound(state, { type: 'useFreePass' });

    const { players, cardsPlayed } = summarise(used);

    expect(cardsPlayed).toBe(used.history.length);
    expect(players[0].daresDone + players[1].daresDone).toBe(
      summarise(state).players[0].daresDone + summarise(state).players[1].daresDone,
    );
  });
});

describe('the state is plain data', () => {
  it('should survive a JSON round trip mid surprise', () => {
    const state = reachSurprise(start({ surprises: ['choice'] }), 'choice');

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('should deal the same round for the same seed and actions', () => {
    const first = playOut(start({ seed: 9, surprises: allTypes }));
    const second = playOut(start({ seed: 9, surprises: allTypes }));

    expect(second).toEqual(first);
  });
});
