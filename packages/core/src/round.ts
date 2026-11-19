import { categories, categoriesForLevel, categoryIds, isCategoryId } from './contentModel';
import { surpriseIds } from './contentModel';
import type { Card, CardKind, CategoryId, Deck, LevelId, SurpriseId } from './contentModel';
import { nextRandom } from './seededRandom';
import {
  pickSurpriseOffset,
  shuffleSurpriseTypes,
  surpriseBlockSize,
  surprisePlanSeed,
} from './surprises';

/** Every 5th card of a round is a together card when the category has one. */
export const togetherCardInterval = 5;

/** An endless round steps up to the next enabled category every 5 cards. */
export const endlessStepInterval = 5;

/** How often a draw takes a player card when it could take either a player card or a shipped one. */
const playerCardProbability = 0.5;

export type RoundLength = 10 | 20 | 'endless';
export type PlayerIndex = 0 | 1;

export type RoundSetup = {
  players: readonly [string, string];
  level: LevelId;
  enabledCategories: readonly CategoryId[];
  length: RoundLength;
  seed: number;
  /** The surprise types in play. Absent or empty means surprises are off. */
  surprises?: readonly SurpriseId[];
};

export type RoundAction =
  | { type: 'done' }
  | { type: 'pass' }
  | { type: 'removeCard' }
  | { type: 'disableCategory'; category: CategoryId }
  | { type: 'flip' }
  | { type: 'choose'; index: 0 | 1 }
  | { type: 'useFreePass' }
  | { type: 'end' };

/** What the screen needs to show the surprise on the card in play. */
export type CurrentSurprise =
  | { type: 'mystery'; flipped: boolean }
  | { type: 'jump' }
  | { type: 'swap' }
  | {
      type: 'choice';
      /** The partner who is not playing. */
      chooser: PlayerIndex;
      options: readonly [Card, Card];
      chosen: 0 | 1 | null;
    }
  | { type: 'timer'; seconds: number }
  | { type: 'freePass' };

export type CurrentCard = {
  card: Card;
  /** The player who holds the phone for this card. */
  player: PlayerIndex;
  /** True for the first card in a higher category than the previous card. */
  steppingUp: boolean;
  surprise?: CurrentSurprise;
};

export type PlayedCard = {
  cardId: string;
  category: CategoryId;
  kind: CardKind;
  player: PlayerIndex;
  outcome: 'done' | 'passed' | 'freePass';
  surprise?: SurpriseId;
};

/** The surprises of a round: its own generator stream, so they never move the card deal. */
export type SurprisePlan = {
  /** The types still in play. A type with no eligible card left for the round is dropped. */
  types: readonly SurpriseId[];
  /** The types not yet shown in this pass through the types, in the order they come up. */
  bag: readonly SurpriseId[];
  randomState: number;
  /** Where in the current block the surprise goes, as an offset from the block's first card. */
  plannedOffset: number | null;
};

/** Plain serialisable data. The round is over when `current` is null. */
export type RoundState = {
  players: readonly [string, string];
  length: RoundLength;
  /** The categories the round was set up with, lowest first. Pacing follows this list. */
  pacing: readonly CategoryId[];
  /** The categories still enabled, lowest first. */
  enabled: readonly CategoryId[];
  /** Cards not yet dealt, from the enabled categories only. */
  unused: readonly Card[];
  randomState: number;
  /** The player who plays the next solo card. */
  turn: PlayerIndex;
  current: CurrentCard | null;
  history: readonly PlayedCard[];
  /** Null when surprises are off. */
  surprisePlan: SurprisePlan | null;
  /** Whether each player holds a free pass. Passes end with the round. */
  freePasses: readonly [boolean, boolean];
};

export type PlayerSummary = { name: string; daresDone: number; drinks: number };

export type RoundSummary = {
  players: readonly [PlayerSummary, PlayerSummary];
  boldest: PlayerIndex | 'tie';
  cardsPlayed: number;
  categoriesReached: readonly CategoryId[];
};

function categoryOrder(category: CategoryId): number {
  return categoryIds.indexOf(category);
}

function penaltyFor(category: CategoryId): number {
  return categories.find((candidate) => candidate.id === category)?.penalty ?? 0;
}

function otherPlayer(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

export function isRoundOver(state: RoundState): boolean {
  return state.current === null;
}

/**
 * Checks the setup and starts a round. Throws an Error that says what is wrong when the setup is
 * invalid: a player without a name, no enabled category, an unknown category, a category outside
 * the level, a category listed twice, or a seed that is not a whole number.
 */
export function startRound(setup: RoundSetup, deck: Deck): RoundState {
  assertValidSetup(setup);
  const pacing = [...setup.enabledCategories].sort(
    (left, right) => categoryOrder(left) - categoryOrder(right),
  );
  const state: RoundState = {
    players: setup.players,
    length: setup.length,
    pacing,
    enabled: pacing,
    unused: deck.cards.filter((card) => pacing.includes(card.category)),
    randomState: setup.seed >>> 0,
    turn: 0,
    current: null,
    history: [],
    surprisePlan: startSurprisePlan(setup),
    freePasses: [false, false],
  };
  return expirePasses(dealNext(state));
}

function startSurprisePlan(setup: RoundSetup): SurprisePlan | null {
  const types = setup.surprises ?? [];
  if (types.length === 0) return null;
  return { types, bag: [], randomState: surprisePlanSeed(setup.seed), plannedOffset: null };
}

/** Free passes end with the round. */
function expirePasses(state: RoundState): RoundState {
  const holdsPass = state.freePasses[0] || state.freePasses[1];
  return state.current === null && holdsPass ? { ...state, freePasses: [false, false] } : state;
}

function assertValidSetup(setup: RoundSetup): void {
  if (setup.players.some((name) => name.trim() === '')) {
    throw new Error('both players need a name');
  }
  if (setup.enabledCategories.length === 0) {
    throw new Error('at least one category must be enabled');
  }
  const levelCategories = categoriesForLevel(setup.level);
  const seen = new Set<string>();
  for (const category of setup.enabledCategories) {
    if (!isCategoryId(category)) throw new Error(`unknown category "${category}"`);
    if (!levelCategories.includes(category)) {
      throw new Error(`category "${category}" is not part of level "${setup.level}"`);
    }
    if (seen.has(category)) throw new Error(`category "${category}" is listed twice`);
    seen.add(category);
  }
  if (!Number.isInteger(setup.seed)) throw new Error('seed must be a whole number');
  const seenSurprises = new Set<string>();
  for (const type of setup.surprises ?? []) {
    if (!surpriseIds.some((surpriseId) => surpriseId === type)) {
      throw new Error(`unknown surprise "${type}"`);
    }
    if (seenSurprises.has(type)) throw new Error(`surprise "${type}" is listed twice`);
    seenSurprises.add(type);
  }
}

/** Applies an action. An action that does not apply returns the same state. */
export function reduceRound(state: RoundState, action: RoundAction): RoundState {
  if (state.current === null) return state;
  return expirePasses(applyAction(state, state.current, action));
}

function applyAction(state: RoundState, current: CurrentCard, action: RoundAction): RoundState {
  switch (action.type) {
    case 'end':
      return { ...state, current: null };
    case 'disableCategory':
      return disableCategory(state, current, action.category);
    case 'flip':
      return flipMystery(state, current);
    case 'choose':
      return choose(state, current, action.index);
    case 'done':
      return isAwaitingSurpriseStep(current) ? state : resolveCurrent(state, current, 'done');
    case 'pass':
      return isAwaitingSurpriseStep(current) ? state : resolveCurrent(state, current, 'passed');
    case 'removeCard':
      return isAwaitingSurpriseStep(current) ? state : replaceCurrent(state, current);
    case 'useFreePass':
      return canUseFreePass(state, current) ? resolveCurrent(state, current, 'freePass') : state;
  }
}

/** A face down mystery and an open choice wait for their own action before the card can be played. */
function isAwaitingSurpriseStep({ surprise }: CurrentCard): boolean {
  if (surprise?.type === 'mystery') return !surprise.flipped;
  if (surprise?.type === 'choice') return surprise.chosen === null;
  return false;
}

function canUseFreePass(state: RoundState, current: CurrentCard): boolean {
  return (
    state.freePasses[current.player] &&
    current.card.kind === 'solo' &&
    !isAwaitingSurpriseStep(current)
  );
}

function flipMystery(state: RoundState, current: CurrentCard): RoundState {
  const { surprise } = current;
  if (surprise?.type !== 'mystery' || surprise.flipped) return state;
  return { ...state, current: { ...current, surprise: { type: 'mystery', flipped: true } } };
}

function choose(state: RoundState, current: CurrentCard, index: 0 | 1): RoundState {
  const { surprise } = current;
  if (surprise?.type !== 'choice' || surprise.chosen !== null) return state;
  const card = surprise.options[index];
  if (card === undefined) return state;
  return {
    ...state,
    unused: state.unused.filter((candidate) => candidate.id !== card.id),
    current: { ...current, card, surprise: { ...surprise, chosen: index } },
  };
}

function resolveCurrent(
  state: RoundState,
  current: CurrentCard,
  outcome: PlayedCard['outcome'],
): RoundState {
  const played: PlayedCard = {
    cardId: current.card.id,
    category: current.card.category,
    kind: current.card.kind,
    player: current.player,
    outcome,
    ...(current.surprise === undefined ? {} : { surprise: current.surprise.type }),
  };
  const history = [...state.history, played];
  const usedTheTurn = current.card.kind === 'solo' && current.player === state.turn;
  const next: RoundState = {
    ...state,
    history,
    turn: usedTheTurn ? otherPlayer(state.turn) : state.turn,
    freePasses:
      outcome === 'freePass' ? withPass(state.freePasses, current.player, false) : state.freePasses,
    current: null,
  };
  if (state.length !== 'endless' && history.length >= state.length) return next;
  return dealNext(next);
}

function withPass(
  passes: readonly [boolean, boolean],
  player: PlayerIndex,
  held: boolean,
): readonly [boolean, boolean] {
  return player === 0 ? [held, passes[1]] : [passes[0], held];
}

function disableCategory(
  state: RoundState,
  current: CurrentCard,
  category: CategoryId,
): RoundState {
  if (!state.enabled.includes(category) || state.enabled.length === 1) return state;
  const next: RoundState = {
    ...state,
    enabled: state.enabled.filter((enabled) => enabled !== category),
    unused: state.unused.filter((card) => card.category !== category),
  };
  return current.card.category === category ? replaceCurrent(next, current) : next;
}

/** Deals the next card of the round, or leaves `current` null when no card is left. */
function dealNext(state: RoundState): RoundState {
  const position = state.history.length + 1;
  const target = resolveEnabled(pacedCategory(state, position), state.enabled);
  const { plan, deal } = planSurprise(state, position, target);
  const planned: RoundState = { ...state, surprisePlan: plan };
  if (deal !== null) return placeSurprise(planned, deal);
  const wantsTogether =
    position % togetherCardInterval === 0 &&
    planned.unused.some(
      (card) => isDealable(card) && card.category === target && card.kind === 'together',
    );
  return dealCard(planned, target, wantsTogether ? 'together' : 'solo', planned.turn);
}

/** Swaps the card in play for another of the same kind, at no cost to the round. */
function replaceCurrent(state: RoundState, current: CurrentCard): RoundState {
  const target = resolveEnabled(current.card.category, state.enabled);
  return dealCard(state, target, current.card.kind, current.player);
}

function dealCard(
  state: RoundState,
  target: CategoryId,
  preferredKind: CardKind,
  player: PlayerIndex,
): RoundState {
  const drawn = drawCard(state, target, preferredKind);
  if (drawn === null) return { ...state, current: null };
  return {
    ...state,
    unused: state.unused.filter((card) => card.id !== drawn.card.id),
    randomState: drawn.randomState,
    current: { card: drawn.card, player, steppingUp: isSteppingUp(state, drawn.card) },
  };
}

function isSteppingUp(state: RoundState, card: Card): boolean {
  const lastPlayed = state.history.at(-1);
  return (
    lastPlayed !== undefined && categoryOrder(card.category) > categoryOrder(lastPlayed.category)
  );
}

/** Timer cards are written to last their timer, so only the timer surprise deals them. */
function isDealable(card: Card): boolean {
  return card.effect?.type !== 'timer';
}

function isPlainSolo(card: Card): boolean {
  return card.kind === 'solo' && card.effect === undefined;
}

function isTimerSolo(card: Card): boolean {
  return card.kind === 'solo' && !isDealable(card);
}

type Candidate = { card: Card; randomState: number };

/**
 * Picks one of the candidates. A player card is taken with a probability of one half when the
 * candidates hold both sources. The generator is only used for that when both are present, so a deck
 * with no player cards deals as it did before player cards existed.
 */
function pickCard(candidates: readonly Card[], randomState: number): Candidate | null {
  const playerCards = candidates.filter((card) => card.source === 'player');
  const shippedCards = candidates.filter((card) => card.source !== 'player');
  let pool = candidates;
  let state = randomState;
  if (playerCards.length > 0 && shippedCards.length > 0) {
    const coin = nextRandom(state);
    pool = coin.value < playerCardProbability ? playerCards : shippedCards;
    state = coin.state;
  }
  if (pool.length === 0) return null;
  const { value, state: nextState } = nextRandom(state);
  const card = pool[Math.floor(value * pool.length)];
  return card === undefined ? null : { card, randomState: nextState };
}

/** Picks an unused card from one category that passes the check. */
function pickFromCategory(
  state: RoundState,
  category: CategoryId,
  matches: (card: Card) => boolean,
): Candidate | null {
  const candidates = state.unused.filter((card) => card.category === category && matches(card));
  return pickCard(candidates, state.randomState);
}

/**
 * Looks in the target category first, then each higher enabled category, nearest first, then each
 * lower one, nearest first. The first matcher is tried everywhere before the next one, so a round
 * only runs dry when no unused card is left that any matcher accepts.
 */
function drawMatching(
  state: RoundState,
  target: CategoryId,
  matchers: readonly ((card: Card) => boolean)[],
): Candidate | null {
  const targetOrder = categoryOrder(target);
  const higher = state.enabled.filter((category) => categoryOrder(category) > targetOrder);
  const lower = state.enabled.filter((category) => categoryOrder(category) < targetOrder).reverse();
  const searchOrder = [target, ...higher, ...lower];
  for (const matches of matchers) {
    for (const category of searchOrder) {
      const drawn = pickFromCategory(state, category, matches);
      if (drawn !== null) return drawn;
    }
  }
  return null;
}

function drawCard(
  state: RoundState,
  target: CategoryId,
  preferredKind: CardKind,
): Candidate | null {
  const otherKind: CardKind = preferredKind === 'solo' ? 'together' : 'solo';
  return drawMatching(
    state,
    target,
    [preferredKind, otherKind].map(
      (kind) => (card: Card) => isDealable(card) && card.kind === kind,
    ),
  );
}

type SurpriseDeal = {
  card: Card;
  player: PlayerIndex;
  surprise: CurrentSurprise;
  randomState: number;
};

/** Finds the card and details for a surprise at this position, or null when it cannot go here. */
type SurpriseDealer = (state: RoundState, target: CategoryId) => SurpriseDeal | null;

function dealPlainSolo(surprise: CurrentSurprise, player: PlayerIndex) {
  return (state: RoundState, target: CategoryId): SurpriseDeal | null => {
    const drawn = drawMatching(state, target, [isPlainSolo]);
    return drawn === null ? null : { ...drawn, player, surprise };
  };
}

const surpriseDealers: Record<SurpriseId, SurpriseDealer> = {
  mystery: (state, target) =>
    dealPlainSolo({ type: 'mystery', flipped: false }, state.turn)(state, target),
  swap: (state, target) => dealPlainSolo({ type: 'swap' }, otherPlayer(state.turn))(state, target),
  freePass: (state, target) =>
    state.freePasses[state.turn]
      ? null
      : dealPlainSolo({ type: 'freePass' }, state.turn)(state, target),
  jump: (state, target) => {
    const higher = state.enabled.find(
      (category) => categoryOrder(category) > categoryOrder(target),
    );
    if (higher === undefined) return null;
    const drawn = pickFromCategory(state, higher, isPlainSolo);
    return drawn === null ? null : { ...drawn, player: state.turn, surprise: { type: 'jump' } };
  },
  timer: (state, target) => {
    const drawn = pickFromCategory(state, target, isTimerSolo);
    const effect = drawn?.card.effect;
    if (drawn === null || effect?.type !== 'timer') return null;
    return { ...drawn, player: state.turn, surprise: { type: 'timer', seconds: effect.seconds } };
  },
  choice: (state, target) => {
    const candidates = state.unused.filter((card) => card.category === target && isPlainSolo(card));
    const first = pickCard(candidates, state.randomState);
    if (first === null) return null;
    const second = pickCard(
      candidates.filter((card) => card.id !== first.card.id),
      first.randomState,
    );
    if (second === null) return null;
    return {
      card: first.card,
      player: state.turn,
      randomState: second.randomState,
      surprise: {
        type: 'choice',
        chooser: otherPlayer(state.turn),
        options: [first.card, second.card],
        chosen: null,
      },
    };
  },
};

/**
 * A type is exhausted when no enabled category could be the target of a card it can go on. Cards
 * and enabled categories only shrink, so an exhausted type never recovers. A free pass is never
 * exhausted, because a player who spends theirs becomes eligible again.
 */
function isExhausted(state: RoundState, type: SurpriseId): boolean {
  if (type === 'freePass') return false;
  return state.enabled.every((target) => surpriseDealers[type](state, target) === null);
}

/**
 * Works out the surprise for this position. A block's offset is drawn when its first card is dealt.
 * At the offset, exhausted types leave the plan, an empty bag is refilled with a shuffle, and the
 * first type in the bag that fits here is dealt. A type that does not fit only here stays in the bag.
 */
function planSurprise(
  state: RoundState,
  position: number,
  target: CategoryId,
): { plan: SurprisePlan | null; deal: SurpriseDeal | null } {
  const { surprisePlan } = state;
  if (surprisePlan === null || surprisePlan.types.length === 0) {
    return { plan: surprisePlan, deal: null };
  }
  const blockIndex = Math.floor((position - 1) / surpriseBlockSize);
  const offset = (position - 1) % surpriseBlockSize;
  let plan = surprisePlan;
  if (offset === 0) {
    const picked = pickSurpriseOffset(plan.randomState, blockIndex);
    plan = { ...plan, plannedOffset: picked.offset, randomState: picked.randomState };
  }
  if (offset !== plan.plannedOffset) return { plan, deal: null };

  const types = plan.types.filter((type) => !isExhausted(state, type));
  let bag = plan.bag.filter((type) => types.includes(type));
  let randomState = plan.randomState;
  if (bag.length === 0 && types.length > 0) {
    const shuffled = shuffleSurpriseTypes(types, randomState);
    bag = shuffled.order;
    randomState = shuffled.randomState;
  }
  for (const type of bag) {
    const deal = surpriseDealers[type](state, target);
    if (deal !== null) {
      const remaining = bag.filter((inBag) => inBag !== type);
      return { plan: { ...plan, types, bag: remaining, randomState }, deal };
    }
  }
  return { plan: { ...plan, types, bag, randomState }, deal: null };
}

function placeSurprise(state: RoundState, deal: SurpriseDeal): RoundState {
  const { card, player, surprise } = deal;
  return {
    ...state,
    // Both options of a choice stay in the deal until one is chosen.
    unused:
      surprise.type === 'choice'
        ? state.unused
        : state.unused.filter((candidate) => candidate.id !== card.id),
    randomState: deal.randomState,
    freePasses:
      surprise.type === 'freePass' ? withPass(state.freePasses, player, true) : state.freePasses,
    current: { card, player, steppingUp: isSteppingUp(state, card), surprise },
  };
}

/** The category a card at this position belongs to, before any category was disabled. */
function pacedCategory(state: RoundState, position: number): CategoryId {
  const { pacing, length } = state;
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
function resolveEnabled(category: CategoryId, enabled: readonly CategoryId[]): CategoryId {
  const order = categoryOrder(category);
  const higher = enabled.find((candidate) => categoryOrder(candidate) >= order);
  return higher ?? enabled.at(-1) ?? category;
}

/** A mystery is only passed after the flip, so passing one costs a drink more than its category. */
function passCost(played: PlayedCard): number {
  return penaltyFor(played.category) + (played.surprise === 'mystery' ? 1 : 0);
}

export function summarise(state: RoundState): RoundSummary {
  const daresDone: [number, number] = [0, 0];
  const drinks: [number, number] = [0, 0];
  for (const played of state.history) {
    const affected: PlayerIndex[] = played.kind === 'together' ? [0, 1] : [played.player];
    for (const player of affected) {
      if (played.outcome === 'done') daresDone[player] += 1;
      else if (played.outcome === 'passed') drinks[player] += passCost(played);
    }
  }
  const [firstName, secondName] = state.players;
  const [firstDone, secondDone] = daresDone;
  const [firstDrinks, secondDrinks] = drinks;
  return {
    players: [
      { name: firstName, daresDone: firstDone, drinks: firstDrinks },
      { name: secondName, daresDone: secondDone, drinks: secondDrinks },
    ],
    boldest: firstDone === secondDone ? 'tie' : firstDone > secondDone ? 0 : 1,
    cardsPlayed: state.history.length,
    categoriesReached: categoryIds.filter((category) =>
      state.history.some((played) => played.category === category),
    ),
  };
}
