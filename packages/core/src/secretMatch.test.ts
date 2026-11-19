import type { CategoryId } from './contentModel';
import type { Question, TopicId } from './questionModel';
import {
  availableItemCount,
  minimumItemCount,
  reduceSecretMatch,
  secretMatchDiscoveries,
  secretMatchItemCount,
  startSecretMatch,
  viewSecretMatch,
  type SecretMatchAction,
  type SecretMatchRating,
  type SecretMatchSetup,
  type SecretMatchState,
} from './secretMatch';

function item(category: CategoryId, topic: TopicId, number: number): Question {
  const suffix = String(number).padStart(2, '0');
  return {
    id: `sm-${category}-${topic}-${suffix}`,
    format: 'secretMatch',
    category,
    topic,
    source: 'shipped',
    text: `Item ${category} ${topic} ${suffix}`,
    tags: ['tag-one'],
  };
}

function itemsFor(
  categories: readonly CategoryId[],
  topics: readonly TopicId[],
  perTopic: number,
): Question[] {
  return categories.flatMap((category) =>
    topics.flatMap((topic) =>
      Array.from({ length: perTopic }, (_, index) => item(category, topic, index + 1)),
    ),
  );
}

const allCategories: readonly CategoryId[] = ['c1', 'c2', 'c3', 'c4'];
const bigPool = itemsFor(allCategories, ['t1', 't2'], 5);

const baseSetup: SecretMatchSetup = {
  players: ['Player one', 'Player two'],
  level: 'l3',
  enabledCategories: allCategories,
  enabledTopics: ['t1', 't2'],
  seed: 7,
  avoidIds: [],
};

function start(setup: Partial<SecretMatchSetup> = {}, questions: readonly Question[] = bigPool) {
  return startSecretMatch({ ...baseSetup, ...setup }, questions);
}

function apply(state: SecretMatchState, ...actions: SecretMatchAction[]): SecretMatchState {
  return actions.reduce(reduceSecretMatch, state);
}

function rate(rating: SecretMatchRating): SecretMatchAction {
  return { type: 'rate', rating };
}

function rateAll(state: SecretMatchState, ratings: readonly SecretMatchRating[]) {
  return apply(state, ...ratings.map(rate));
}

function itemIds(state: SecretMatchState): string[] {
  const ids: string[] = [];
  let walker = state;
  for (let step = 0; step < secretMatchItemCount; step += 1) {
    const view = viewSecretMatch(walker);
    if (view.phase !== 'rating') return ids;
    ids.push(view.item.id);
    walker = apply(walker, rate('yes'));
  }
  return ids;
}

function itemsOf(state: SecretMatchState) {
  const items = [];
  let walker = state;
  for (let step = 0; step < secretMatchItemCount; step += 1) {
    const view = viewSecretMatch(walker);
    if (view.phase !== 'rating') break;
    items.push(view.item);
    walker = apply(walker, rate('yes'));
  }
  return items;
}

const categoryOrder = (category: CategoryId) => allCategories.indexOf(category);

function revealWith(first: readonly SecretMatchRating[], second: readonly SecretMatchRating[]) {
  return apply(rateAll(start(), first), { type: 'startSecondPass' }, ...second.map(rate));
}

const twelve = (rating: SecretMatchRating) =>
  Array.from({ length: secretMatchItemCount }, () => rating);

describe('startSecretMatch', () => {
  it('should deal 12 items from the secret match questions', () => {
    expect(itemIds(start())).toHaveLength(12);
  });

  it('should only deal secret match questions', () => {
    const other: Question = {
      id: 'q-other',
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      source: 'shipped',
      text: 'Other text',
    };

    expect(itemIds(start({}, [other, ...bigPool]))).not.toContain('q-other');
  });

  it('should only deal items from enabled topics', () => {
    const topics = itemsOf(start({ enabledTopics: ['t2'] })).map((dealt) => dealt.id);

    expect(topics.every((id) => id.includes('-t2-'))).toBe(true);
  });

  it('should only deal items from enabled categories', () => {
    const categories = itemsOf(start({ enabledCategories: ['c1', 'c2'] })).map(
      (dealt) => dealt.category,
    );

    expect(new Set(categories)).toEqual(new Set(['c1', 'c2']));
  });

  it('should order the items from mild to bold', () => {
    const orders = itemsOf(start()).map((dealt) => categoryOrder(dealt.category));

    expect(orders).toEqual([...orders].sort((left, right) => left - right));
  });

  it('should split 12 items evenly across four enabled categories', () => {
    const categories = itemsOf(start()).map((dealt) => dealt.category);

    expect(categories).toEqual([
      'c1',
      'c1',
      'c1',
      'c2',
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

  it('should give the extra items to the bolder categories when 12 does not divide evenly', () => {
    const categories = itemsOf(start({ enabledCategories: ['c1', 'c2', 'c3'] })).map(
      (dealt) => dealt.category,
    );

    expect(categories).toEqual([
      'c1',
      'c1',
      'c1',
      'c1',
      'c2',
      'c2',
      'c2',
      'c2',
      'c3',
      'c3',
      'c3',
      'c3',
    ]);
  });

  it('should deal the same items for the same seed', () => {
    expect(itemIds(start({ seed: 11 }))).toEqual(itemIds(start({ seed: 11 })));
  });

  it('should deal different items for different seeds', () => {
    expect(itemIds(start({ seed: 1 }))).not.toEqual(itemIds(start({ seed: 2 })));
  });

  it('should deal items not on the avoid list first', () => {
    const avoidIds = bigPool.slice(0, 20).map((question) => question.id);

    const dealt = itemIds(start({ avoidIds }));

    expect(dealt.filter((id) => avoidIds.includes(id))).toEqual([]);
  });

  it('should fall back to avoided items when too few fresh items are left', () => {
    const pool = itemsFor(['c1'], ['t1'], 8);
    const avoidIds = pool.slice(0, 5).map((question) => question.id);
    const setup = {
      level: 'l1',
      enabledCategories: ['c1'],
      enabledTopics: ['t1'],
      avoidIds,
    } as const;

    const dealt = itemIds(start(setup, pool));

    expect(dealt).toHaveLength(8);
    expect(avoidIds.every((id) => dealt.includes(id))).toBe(true);
  });

  it('should take from the other categories when one has too few items', () => {
    const pool = [...itemsFor(['c1'], ['t1'], 1), ...itemsFor(['c2'], ['t1'], 20)];

    const categories = itemsOf(
      start({ level: 'l2', enabledCategories: ['c1', 'c2'], enabledTopics: ['t1'] }, pool),
    ).map((dealt) => dealt.category);

    expect(categories).toHaveLength(12);
    expect(categories.filter((category) => category === 'c1')).toHaveLength(1);
  });

  it('should use what there is when fewer than 12 items are available', () => {
    const pool = itemsFor(['c1'], ['t1'], 5);

    const dealt = itemIds(
      start({ level: 'l1', enabledCategories: ['c1'], enabledTopics: ['t1'] }, pool),
    );

    expect(dealt).toHaveLength(5);
  });

  it('should say so when fewer than 3 items are available', () => {
    const pool = itemsFor(['c1'], ['t1'], 2);

    expect(() =>
      start({ level: 'l1', enabledCategories: ['c1'], enabledTopics: ['t1'] }, pool),
    ).toThrow('too few items');
  });

  it('should start with 3 items', () => {
    const pool = itemsFor(['c1'], ['t1'], minimumItemCount);

    expect(() =>
      start({ level: 'l1', enabledCategories: ['c1'], enabledTopics: ['t1'] }, pool),
    ).not.toThrow();
  });

  it.each([
    [
      'a player without a name',
      { players: ['Player one', '  '] as const },
      'both players need a name',
    ],
    ['no enabled category', { enabledCategories: [] }, 'at least one category must be enabled'],
    ['no enabled topic', { enabledTopics: [] }, 'at least one topic must be enabled'],
    ['a category outside the level', { level: 'l1' as const }, 'is not part of level'],
    ['a seed that is not a whole number', { seed: 1.5 }, 'seed must be a whole number'],
  ])('should reject %s', (_name, setup, message) => {
    expect(() => start(setup)).toThrow(message);
  });
});

describe('availableItemCount', () => {
  it('should cap the count at 12', () => {
    expect(availableItemCount(baseSetup, bigPool)).toBe(12);
  });

  it('should count the usable items when there are fewer than 12', () => {
    const pool = itemsFor(['c1'], ['t1'], 4);

    expect(availableItemCount({ ...baseSetup, enabledCategories: ['c1'] }, pool)).toBe(4);
  });

  it('should ignore categories, topics and formats that are not enabled', () => {
    const pool = [
      ...itemsFor(['c1'], ['t1'], 2),
      ...itemsFor(['c2'], ['t1'], 3),
      ...itemsFor(['c1'], ['t2'], 4),
    ];

    expect(
      availableItemCount({ ...baseSetup, enabledCategories: ['c1'], enabledTopics: ['t1'] }, pool),
    ).toBe(2);
  });

  it('should count avoided items too, because they are the fallback', () => {
    const pool = itemsFor(['c1'], ['t1'], 4);
    const avoidIds = pool.map((question) => question.id);

    expect(
      availableItemCount(
        { ...baseSetup, enabledCategories: ['c1'], enabledTopics: ['t1'], avoidIds },
        pool,
      ),
    ).toBe(4);
  });
});

describe('the first pass', () => {
  it('should start on the first item of the first pass', () => {
    const view = viewSecretMatch(start());

    expect(view).toMatchObject({
      phase: 'rating',
      pass: 0,
      playerName: 'Player one',
      position: 1,
      total: 12,
      canGoBack: false,
      ownRating: null,
    });
  });

  it('should move to the next item when rated', () => {
    const view = viewSecretMatch(apply(start(), rate('yes')));

    expect(view).toMatchObject({ phase: 'rating', position: 2, canGoBack: true });
  });

  it('should show the next item, not the same one', () => {
    const state = start();
    const first = viewSecretMatch(state);
    const second = viewSecretMatch(apply(state, rate('maybe')));

    expect(
      first.phase === 'rating' && second.phase === 'rating' && first.item.id !== second.item.id,
    ).toBe(true);
  });

  it('should go back to the previous item and show the own earlier rating', () => {
    const state = start();
    const firstItem = viewSecretMatch(state);

    const back = viewSecretMatch(apply(state, rate('maybe'), { type: 'back' }));

    expect(back).toMatchObject({ position: 1, canGoBack: false, ownRating: 'maybe' });
    expect(
      back.phase === 'rating' && firstItem.phase === 'rating' && back.item.id === firstItem.item.id,
    ).toBe(true);
  });

  it('should do nothing on back at the first item', () => {
    const state = start();

    expect(apply(state, { type: 'back' })).toBe(state);
  });

  it('should let a rating be changed after going back', () => {
    const state = apply(start(), rate('yes'), { type: 'back' }, rate('no'), { type: 'back' });

    expect(viewSecretMatch(state)).toMatchObject({ ownRating: 'no' });
  });

  it('should show an earlier rating again when stepping forward over it', () => {
    const state = apply(
      start(),
      rate('yes'),
      rate('no'),
      { type: 'back' },
      { type: 'back' },
      rate('yes'),
    );

    expect(viewSecretMatch(state)).toMatchObject({ position: 2, ownRating: 'no' });
  });

  it('should show no own rating on an item not yet rated', () => {
    expect(viewSecretMatch(apply(start(), rate('yes'))).phase === 'rating').toBe(true);
    expect(viewSecretMatch(apply(start(), rate('yes')))).toMatchObject({ ownRating: null });
  });

  it('should move to the handoff after the last item', () => {
    const state = rateAll(start(), twelve('yes'));

    expect(viewSecretMatch(state)).toEqual({
      phase: 'handoff',
      finishedPlayerName: 'Player one',
      nextPlayerName: 'Player two',
      total: 12,
    });
  });
});

describe('the handoff', () => {
  const handoff = rateAll(start(), twelve('yes'));

  it('should not go back into the first pass', () => {
    expect(apply(handoff, { type: 'back' })).toBe(handoff);
  });

  it('should ignore a rating', () => {
    expect(apply(handoff, rate('no'))).toBe(handoff);
  });

  it('should start the second pass on the first item', () => {
    const view = viewSecretMatch(apply(handoff, { type: 'startSecondPass' }));

    expect(view).toMatchObject({
      phase: 'rating',
      pass: 1,
      playerName: 'Player two',
      position: 1,
      total: 12,
      canGoBack: false,
      ownRating: null,
    });
  });

  it('should show the second player the same items in the same order', () => {
    const second = apply(handoff, { type: 'startSecondPass' });

    expect(itemIds(second)).toEqual(itemIds(start()));
  });
});

describe('the second pass', () => {
  const secondPass = apply(rateAll(start(), twelve('yes')), { type: 'startSecondPass' });

  it('should not go back past the first item into the first pass', () => {
    expect(apply(secondPass, { type: 'back' })).toBe(secondPass);
  });

  it('should ignore start second pass', () => {
    expect(apply(secondPass, { type: 'startSecondPass' })).toBe(secondPass);
  });

  it('should show only the second player their own earlier rating when going back', () => {
    const view = viewSecretMatch(apply(secondPass, rate('maybe'), { type: 'back' }));

    expect(view).toMatchObject({ pass: 1, ownRating: 'maybe' });
  });

  it('should not show the first player rating on a fresh item', () => {
    expect(viewSecretMatch(apply(secondPass, rate('no')))).toMatchObject({ ownRating: null });
  });
});

describe('the reveal', () => {
  it('should reveal the items both rated yes or maybe', () => {
    const first = twelve('no').map((_, index) => (index < 6 ? 'yes' : 'no') as SecretMatchRating);
    const second = twelve('no').map(
      (_, index) => (index === 0 || index === 7 ? 'yes' : 'maybe') as SecretMatchRating,
    );

    const view = viewSecretMatch(revealWith(first, second));

    expect(view.phase === 'revealed' && view.matches).toHaveLength(6);
  });

  it('should give a yes match when both said yes', () => {
    const view = viewSecretMatch(revealWith(twelve('yes'), twelve('yes')));

    expect(
      view.phase === 'revealed' && view.matches.every((match) => match.strength === 'yes'),
    ).toBe(true);
  });

  it.each([
    ['yes', 'maybe'],
    ['maybe', 'yes'],
    ['maybe', 'maybe'],
  ] as const)(
    'should give a maybe strength when the ratings are %s and %s',
    (firstRating, secondRating) => {
      const view = viewSecretMatch(revealWith(twelve(firstRating), twelve(secondRating)));

      expect(
        view.phase === 'revealed' && view.matches.every((match) => match.strength === 'maybe'),
      ).toBe(true);
    },
  );

  it.each([
    ['no', 'yes'],
    ['yes', 'no'],
    ['no', 'maybe'],
    ['maybe', 'no'],
    ['no', 'no'],
  ] as const)('should not reveal an item rated %s and %s', (firstRating, secondRating) => {
    const view = viewSecretMatch(revealWith(twelve(firstRating), twelve(secondRating)));

    expect(view).toEqual({ phase: 'revealed', total: 12, matches: [] });
  });

  it('should keep the matches in mild to bold order', () => {
    const view = viewSecretMatch(revealWith(twelve('yes'), twelve('yes')));

    const orders =
      view.phase === 'revealed'
        ? view.matches.map((match) => categoryOrder(match.item.category))
        : [];

    expect(orders).toEqual([...orders].sort((left, right) => left - right));
  });

  it('should match each rating to its own item', () => {
    const first = twelve('no').map((_, index) => (index === 4 ? 'yes' : 'no') as SecretMatchRating);
    const second = twelve('no').map(
      (_, index) => (index === 4 ? 'maybe' : 'yes') as SecretMatchRating,
    );
    const dealt = itemIds(start());

    const view = viewSecretMatch(revealWith(first, second));

    expect(view.phase === 'revealed' && view.matches.map((match) => match.item.id)).toEqual([
      dealt[4],
    ]);
  });

  it('should ignore every action once revealed', () => {
    const revealed = revealWith(twelve('yes'), twelve('yes'));

    for (const action of [
      rate('yes'),
      { type: 'back' },
      { type: 'startSecondPass' },
      { type: 'stop' },
    ] as const) {
      expect(apply(revealed, action)).toBe(revealed);
    }
  });

  it('should return the matches as discoveries without dates', () => {
    const first = twelve('no').map((_, index) => (index < 2 ? 'yes' : 'no') as SecretMatchRating);
    const second = twelve('no').map(
      (_, index) => (index === 0 ? 'yes' : index === 1 ? 'maybe' : 'no') as SecretMatchRating,
    );
    const dealt = itemIds(start());

    expect(secretMatchDiscoveries(revealWith(first, second))).toEqual([
      { kind: 'match', questionId: dealt[0], strength: 'yes' },
      { kind: 'match', questionId: dealt[1], strength: 'maybe' },
    ]);
  });

  it('should return no discoveries before the reveal', () => {
    expect(secretMatchDiscoveries(start())).toEqual([]);
    expect(secretMatchDiscoveries(rateAll(start(), twelve('yes')))).toEqual([]);
  });
});

describe('privacy', () => {
  const firstPassA = twelve('yes');
  const firstPassB: SecretMatchRating[] = [
    'no',
    'maybe',
    'no',
    'yes',
    'no',
    'no',
    'maybe',
    'no',
    'yes',
    'no',
    'no',
    'maybe',
  ];

  function walkSecondPass(firstPass: readonly SecretMatchRating[]) {
    const views = [];
    let state = apply(rateAll(start(), firstPass), { type: 'startSecondPass' });
    for (let step = 0; step < secretMatchItemCount; step += 1) {
      views.push(viewSecretMatch(state));
      state = apply(state, rate(step % 2 === 0 ? 'yes' : 'maybe'));
    }
    return views;
  }

  it('should give the same views while the second player rates whatever the first player rated', () => {
    expect(walkSecondPass(firstPassA)).toEqual(walkSecondPass(firstPassB));
  });

  it('should give the same handoff view whatever the first player rated', () => {
    expect(viewSecretMatch(rateAll(start(), firstPassA))).toEqual(
      viewSecretMatch(rateAll(start(), firstPassB)),
    );
  });

  it.each([
    ['the first pass', start()],
    ['the handoff', rateAll(start(), twelve('no'))],
    ['the second pass', apply(rateAll(start(), twelve('no')), { type: 'startSecondPass' })],
  ])('should expose only the known view keys in %s', (_name, state) => {
    const allowed = [
      'canGoBack',
      'finishedPlayerName',
      'item',
      'nextPlayerName',
      'ownRating',
      'pass',
      'phase',
      'playerName',
      'position',
      'total',
    ];

    expect(Object.keys(viewSecretMatch(state)).filter((key) => !allowed.includes(key))).toEqual([]);
  });

  it('should drop every individual rating from state at the reveal', () => {
    const revealed = revealWith(twelve('yes'), twelve('maybe'));

    expect(Object.keys(revealed).sort()).toEqual(['matches', 'phase', 'total']);
    expect(JSON.stringify(revealed)).not.toMatch(/rating|"no"/);
  });

  it('should not name the player who said maybe', () => {
    const firstMaybe = revealWith(twelve('maybe'), twelve('yes'));
    const secondMaybe = revealWith(twelve('yes'), twelve('maybe'));

    expect(firstMaybe).toEqual(secondMaybe);
    expect(JSON.stringify(firstMaybe)).not.toContain('Player');
  });

  it('should not mention an item with a no from either partner', () => {
    const first = twelve('yes').map(
      (rating, index) => (index === 3 ? 'no' : rating) as SecretMatchRating,
    );
    const second = twelve('yes').map(
      (rating, index) => (index === 5 ? 'no' : rating) as SecretMatchRating,
    );
    const dealt = itemsOf(start());

    const revealed = JSON.stringify(revealWith(first, second));

    expect(revealed).not.toContain(dealt[3]?.id);
    expect(revealed).not.toContain(dealt[5]?.id);
    expect(revealed).toContain(dealt[4]?.id);
  });

  it('should not keep the setup, players or ratings in the revealed state', () => {
    expect(JSON.stringify(revealWith(twelve('yes'), twelve('yes')))).not.toContain('Player');
  });
});

describe('stopping', () => {
  it('should wipe everything when stopped in the first pass', () => {
    const state = apply(start(), rate('yes'), rate('no'), { type: 'stop' });

    expect(state).toEqual({ phase: 'stopped' });
  });

  it('should wipe everything when stopped at the handoff', () => {
    expect(apply(rateAll(start(), twelve('yes')), { type: 'stop' })).toEqual({ phase: 'stopped' });
  });

  it('should wipe everything when stopped in the second pass', () => {
    const state = apply(rateAll(start(), twelve('yes')), { type: 'startSecondPass' }, rate('yes'), {
      type: 'stop',
    });

    expect(state).toEqual({ phase: 'stopped' });
  });

  it('should save no discoveries after a stop', () => {
    expect(secretMatchDiscoveries(apply(start(), rate('yes'), { type: 'stop' }))).toEqual([]);
  });

  it('should view a stopped session as stopped', () => {
    expect(viewSecretMatch({ phase: 'stopped' })).toEqual({ phase: 'stopped' });
  });

  it('should ignore every action once stopped', () => {
    const stopped = apply(start(), { type: 'stop' });

    for (const action of [
      rate('yes'),
      { type: 'back' },
      { type: 'startSecondPass' },
      { type: 'stop' },
    ] as const) {
      expect(apply(stopped, action)).toBe(stopped);
    }
  });
});

describe('session size', () => {
  it('should be 12 items', () => {
    expect(secretMatchItemCount).toBe(12);
  });

  it('should require 3 items', () => {
    expect(minimumItemCount).toBe(3);
  });
});
