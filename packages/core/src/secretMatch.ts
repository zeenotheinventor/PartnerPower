import { categoriesForLevel, categoryIds, isCategoryId } from './contentModel';
import type { CategoryId, LevelId } from './contentModel';
import { topicIds } from './questionModel';
import type { NewDiscovery, Question, TopicId } from './questionModel';
import { nextRandom } from './seededRandom';

/** A session has this many items, or fewer when the content has fewer. */
export const secretMatchItemCount = 12;

/** A session with fewer items than this is an error, because there is too little to find. */
export const minimumItemCount = 3;

export type SecretMatchRating = 'yes' | 'maybe' | 'no';
type PassIndex = 0 | 1;

export type SecretMatchSetup = {
  players: readonly [string, string];
  level: LevelId;
  enabledCategories: readonly CategoryId[];
  enabledTopics: readonly TopicId[];
  seed: number;
  /** Ids of items already matched in an earlier session. They are dealt last. */
  avoidIds: readonly string[];
};

export type SecretMatchAction =
  | { type: 'rate'; rating: SecretMatchRating }
  | { type: 'back' }
  | { type: 'startSecondPass' }
  | { type: 'stop' };

export type SecretMatchItem = { id: string; text: string; category: CategoryId };

export type SecretMatchStrength = 'yes' | 'maybe';

/** A match carries its strength and nothing about which partner said what. */
export type SecretMatch = { item: SecretMatchItem; strength: SecretMatchStrength };

/**
 * Plain serialisable data. Ratings exist only while a pass is under way. The first player's ratings
 * are kept in `firstPassRatings` until the reveal turns them into matches and drops them.
 */
export type SecretMatchState =
  | {
      phase: 'rating';
      players: readonly [string, string];
      items: readonly SecretMatchItem[];
      pass: PassIndex;
      position: number;
      /** The current player's own ratings, by item position. Null until rated. */
      ownRatings: readonly (SecretMatchRating | null)[];
      /** Set during the second pass only. It is never given to the view. */
      firstPassRatings: readonly SecretMatchRating[] | null;
    }
  | {
      phase: 'handoff';
      players: readonly [string, string];
      items: readonly SecretMatchItem[];
      firstPassRatings: readonly SecretMatchRating[];
    }
  | { phase: 'revealed'; matches: readonly SecretMatch[]; total: number }
  | { phase: 'stopped' };

export type SecretMatchView =
  | {
      phase: 'rating';
      pass: PassIndex;
      playerName: string;
      item: SecretMatchItem;
      /** Starts at 1. */
      position: number;
      total: number;
      canGoBack: boolean;
      /** The current player's own rating for this item, set only after going back to it. */
      ownRating: SecretMatchRating | null;
    }
  | { phase: 'handoff'; finishedPlayerName: string; nextPlayerName: string; total: number }
  | { phase: 'revealed'; matches: readonly SecretMatch[]; total: number }
  | { phase: 'stopped' };

function categoryOrder(category: CategoryId): number {
  return categoryIds.indexOf(category);
}

type SecretMatchQuestion = Extract<Question, { format: 'secretMatch' }>;

function eligibleQuestions(
  setup: SecretMatchSetup,
  questions: readonly Question[],
): SecretMatchQuestion[] {
  return questions.filter(
    (question): question is SecretMatchQuestion =>
      question.format === 'secretMatch' &&
      setup.enabledCategories.includes(question.category) &&
      setup.enabledTopics.includes(question.topic),
  );
}

/** How many items the setup could use, at most 12. Avoided items count, because they are the fallback. */
export function availableItemCount(
  setup: SecretMatchSetup,
  questions: readonly Question[],
): number {
  return Math.min(secretMatchItemCount, eligibleQuestions(setup, questions).length);
}

/**
 * Checks the setup and starts a session. Throws an Error that says what is wrong when the setup is
 * invalid, or when fewer than 3 items are available ("too few items").
 */
export function startSecretMatch(
  setup: SecretMatchSetup,
  questions: readonly Question[],
): SecretMatchState {
  assertValidSetup(setup);
  const items = dealItems(setup, eligibleQuestions(setup, questions));
  if (items.length < minimumItemCount) {
    throw new Error(
      `too few items: ${items.length} available, at least ${minimumItemCount} needed`,
    );
  }
  return {
    phase: 'rating',
    players: setup.players,
    items,
    pass: 0,
    position: 0,
    ownRatings: items.map(() => null),
    firstPassRatings: null,
  };
}

function assertValidSetup(setup: SecretMatchSetup): void {
  if (setup.players.some((name) => name.trim() === '')) {
    throw new Error('both players need a name');
  }
  if (setup.enabledCategories.length === 0) {
    throw new Error('at least one category must be enabled');
  }
  const levelCategories = categoriesForLevel(setup.level);
  for (const category of setup.enabledCategories) {
    if (!isCategoryId(category)) throw new Error(`unknown category "${category}"`);
    if (!levelCategories.includes(category)) {
      throw new Error(`category "${category}" is not part of level "${setup.level}"`);
    }
  }
  if (setup.enabledTopics.length === 0) throw new Error('at least one topic must be enabled');
  for (const topic of setup.enabledTopics) {
    if (!topicIds.includes(topic)) throw new Error(`unknown topic "${topic}"`);
  }
  if (!Number.isInteger(setup.seed)) throw new Error('seed must be a whole number');
}

function shuffle<Value>(values: readonly Value[], seedState: number) {
  const shuffled = [...values];
  let state = seedState;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const draw = nextRandom(state);
    state = draw.state;
    const swapIndex = Math.floor(draw.value * (index + 1));
    const kept = shuffled[index];
    const swapped = shuffled[swapIndex];
    if (kept === undefined || swapped === undefined) continue;
    shuffled[index] = swapped;
    shuffled[swapIndex] = kept;
  }
  return { shuffled, state };
}

/** Twelve split across the categories as a 12 card dares round is: the bolder ones get the extras. */
function quotas(categories: readonly CategoryId[], total: number): Map<CategoryId, number> {
  const share = Math.floor(total / categories.length);
  const extraFrom = categories.length - (total % categories.length);
  return new Map(
    categories.map((category, index) => [category, share + (index >= extraFrom ? 1 : 0)]),
  );
}

/**
 * Picks the session's items. Fresh items (not on the avoid list) are taken first, up to each
 * category's share. A short category is made up from the others in turn, mild to bold, fresh items
 * before avoided ones. The picks end up ordered mild to bold.
 */
function dealItems(
  setup: SecretMatchSetup,
  eligible: readonly SecretMatchQuestion[],
): readonly SecretMatchItem[] {
  const categories = [...setup.enabledCategories].sort(
    (left, right) => categoryOrder(left) - categoryOrder(right),
  );
  const target = Math.min(secretMatchItemCount, eligible.length);
  const shares = quotas(categories, secretMatchItemCount);
  let seedState = setup.seed >>> 0;
  const queues = new Map<
    CategoryId,
    { fresh: SecretMatchQuestion[]; avoided: SecretMatchQuestion[] }
  >();
  for (const category of categories) {
    const inCategory = eligible.filter((question) => question.category === category);
    const dealt = shuffle(inCategory, seedState);
    seedState = dealt.state;
    queues.set(category, {
      fresh: dealt.shuffled.filter((question) => !setup.avoidIds.includes(question.id)),
      avoided: dealt.shuffled.filter((question) => setup.avoidIds.includes(question.id)),
    });
  }

  const picked = new Map<CategoryId, SecretMatchQuestion[]>(
    categories.map((category) => [category, []]),
  );
  let pickedCount = 0;
  function take(category: CategoryId, source: 'fresh' | 'avoided'): boolean {
    if (pickedCount >= target) return false;
    const next = queues.get(category)?.[source].shift();
    if (next === undefined) return false;
    picked.get(category)?.push(next);
    pickedCount += 1;
    return true;
  }

  for (const category of categories) {
    for (let count = 0; count < (shares.get(category) ?? 0); count += 1) take(category, 'fresh');
  }
  for (const source of ['fresh', 'avoided'] as const) {
    let tookAny = true;
    while (tookAny && pickedCount < target) {
      tookAny = false;
      for (const category of categories) {
        if (take(category, source)) tookAny = true;
      }
    }
  }

  return categories
    .flatMap((category) => picked.get(category) ?? [])
    .map((question) => ({ id: question.id, text: question.text, category: question.category }));
}

/** Applies an action. An action that does not apply to the phase returns the same state. */
export function reduceSecretMatch(
  state: SecretMatchState,
  action: SecretMatchAction,
): SecretMatchState {
  switch (state.phase) {
    case 'rating':
      return reduceRating(state, action);
    case 'handoff':
      return reduceHandoff(state, action);
    case 'revealed':
    case 'stopped':
      return state;
  }
}

function reduceRating(
  state: Extract<SecretMatchState, { phase: 'rating' }>,
  action: SecretMatchAction,
): SecretMatchState {
  switch (action.type) {
    case 'rate':
      return rateCurrent(state, action.rating);
    case 'back':
      return state.position === 0 ? state : { ...state, position: state.position - 1 };
    case 'stop':
      return { phase: 'stopped' };
    case 'startSecondPass':
      return state;
  }
}

function reduceHandoff(
  state: Extract<SecretMatchState, { phase: 'handoff' }>,
  action: SecretMatchAction,
): SecretMatchState {
  switch (action.type) {
    case 'startSecondPass':
      return {
        phase: 'rating',
        players: state.players,
        items: state.items,
        pass: 1,
        position: 0,
        ownRatings: state.items.map(() => null),
        firstPassRatings: state.firstPassRatings,
      };
    case 'stop':
      return { phase: 'stopped' };
    case 'rate':
    case 'back':
      return state;
  }
}

function rateCurrent(
  state: Extract<SecretMatchState, { phase: 'rating' }>,
  rating: SecretMatchRating,
): SecretMatchState {
  const ownRatings = state.ownRatings.map((own, index) =>
    index === state.position ? rating : own,
  );
  if (state.position < state.items.length - 1) {
    return { ...state, ownRatings, position: state.position + 1 };
  }
  const completed = ownRatings.filter((own): own is SecretMatchRating => own !== null);
  if (state.pass === 0) {
    return {
      phase: 'handoff',
      players: state.players,
      items: state.items,
      firstPassRatings: completed,
    };
  }
  return reveal(state.items, state.firstPassRatings ?? [], completed);
}

/** Works out the matches and keeps nothing else, so no individual rating survives the reveal. */
function reveal(
  items: readonly SecretMatchItem[],
  firstRatings: readonly SecretMatchRating[],
  secondRatings: readonly SecretMatchRating[],
): SecretMatchState {
  const matches = items.flatMap((item, index): SecretMatch[] => {
    const first = firstRatings[index];
    const second = secondRatings[index];
    if (first === undefined || second === undefined || first === 'no' || second === 'no') return [];
    return [{ item, strength: first === 'yes' && second === 'yes' ? 'yes' : 'maybe' }];
  });
  return { phase: 'revealed', matches, total: items.length };
}

/** The only thing screens read. It never holds the other partner's ratings. */
export function viewSecretMatch(state: SecretMatchState): SecretMatchView {
  switch (state.phase) {
    case 'rating': {
      const item = state.items[state.position];
      if (item === undefined) return { phase: 'stopped' };
      return {
        phase: 'rating',
        pass: state.pass,
        playerName: state.players[state.pass],
        item,
        position: state.position + 1,
        total: state.items.length,
        canGoBack: state.position > 0,
        ownRating: state.ownRatings[state.position] ?? null,
      };
    }
    case 'handoff':
      return {
        phase: 'handoff',
        finishedPlayerName: state.players[0],
        nextPlayerName: state.players[1],
        total: state.items.length,
      };
    case 'revealed':
      return { phase: 'revealed', matches: state.matches, total: state.total };
    case 'stopped':
      return { phase: 'stopped' };
  }
}

/** The matches of a revealed session, mild to bold, for the app to save. Empty before the reveal. */
export function secretMatchDiscoveries(state: SecretMatchState): NewDiscovery[] {
  if (state.phase !== 'revealed') return [];
  return state.matches.map((match) => ({
    kind: 'match',
    questionId: match.item.id,
    strength: match.strength,
  }));
}
