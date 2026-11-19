import { categories, categoriesForLevel, categoryIds, isCategoryId } from './contentModel';
import type { Card, CardKind, CategoryId, Deck, LevelId } from './contentModel';
import { nextRandom } from './seededRandom';

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
};

export type RoundAction =
  | { type: 'done' }
  | { type: 'pass' }
  | { type: 'removeCard' }
  | { type: 'disableCategory'; category: CategoryId }
  | { type: 'end' };

export type CurrentCard = {
  card: Card;
  /** The player who holds the phone for this card. */
  player: PlayerIndex;
  /** True for the first card in a higher category than the previous card. */
  steppingUp: boolean;
};

export type PlayedCard = {
  cardId: string;
  category: CategoryId;
  kind: CardKind;
  player: PlayerIndex;
  outcome: 'done' | 'passed';
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
  };
  return dealNext(state);
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
}

/** Applies an action. An action that does not apply returns the same state. */
export function reduceRound(state: RoundState, action: RoundAction): RoundState {
  if (state.current === null) return state;
  switch (action.type) {
    case 'done':
      return resolveCurrent(state, state.current, 'done');
    case 'pass':
      return resolveCurrent(state, state.current, 'passed');
    case 'removeCard':
      return replaceCurrent(state, state.current);
    case 'disableCategory':
      return disableCategory(state, state.current, action.category);
    case 'end':
      return { ...state, current: null };
  }
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
  };
  const history = [...state.history, played];
  const next: RoundState = {
    ...state,
    history,
    turn: current.card.kind === 'together' ? state.turn : otherPlayer(state.turn),
    current: null,
  };
  if (state.length !== 'endless' && history.length >= state.length) return next;
  return dealNext(next);
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
  const wantsTogether =
    position % togetherCardInterval === 0 &&
    state.unused.some(
      (card) => isDealable(card) && card.category === target && card.kind === 'together',
    );
  return dealCard(state, target, wantsTogether ? 'together' : 'solo');
}

/** Swaps the card in play for another of the same kind, at no cost to the round. */
function replaceCurrent(state: RoundState, current: CurrentCard): RoundState {
  const target = resolveEnabled(current.card.category, state.enabled);
  return dealCard(state, target, current.card.kind);
}

function dealCard(state: RoundState, target: CategoryId, preferredKind: CardKind): RoundState {
  const drawn = drawCard(state, target, preferredKind);
  if (drawn === null) return { ...state, current: null };
  const lastPlayed = state.history.at(-1);
  return {
    ...state,
    unused: state.unused.filter((card) => card.id !== drawn.card.id),
    randomState: drawn.randomState,
    current: {
      card: drawn.card,
      player: state.turn,
      steppingUp:
        lastPlayed !== undefined &&
        categoryOrder(drawn.card.category) > categoryOrder(lastPlayed.category),
    },
  };
}

/** Timer cards are written to last their timer, so only the timer surprise deals them. */
function isDealable(card: Card): boolean {
  return card.effect?.type !== 'timer';
}

/**
 * Picks one of the candidates. A player card is taken with a probability of one half when the
 * candidates hold both sources. The generator is only used for that when both are present, so a deck
 * with no player cards deals as it did before player cards existed.
 */
function pickCard(
  candidates: readonly Card[],
  randomState: number,
): { card: Card; randomState: number } | null {
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

/**
 * Looks in the target category first, then each higher enabled category, nearest first, then each
 * lower one, nearest first. The preferred kind is tried everywhere before the other kind, so a
 * round only runs dry when no unused card is left at all.
 */
function drawCard(
  state: RoundState,
  target: CategoryId,
  preferredKind: CardKind,
): { card: Card; randomState: number } | null {
  const targetOrder = categoryOrder(target);
  const higher = state.enabled.filter((category) => categoryOrder(category) > targetOrder);
  const lower = state.enabled.filter((category) => categoryOrder(category) < targetOrder).reverse();
  const searchOrder = [target, ...higher, ...lower];
  const otherKind: CardKind = preferredKind === 'solo' ? 'together' : 'solo';
  for (const kind of [preferredKind, otherKind]) {
    for (const category of searchOrder) {
      const candidates = state.unused.filter(
        (card) => isDealable(card) && card.category === category && card.kind === kind,
      );
      const drawn = pickCard(candidates, state.randomState);
      if (drawn !== null) return drawn;
    }
  }
  return null;
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

export function summarise(state: RoundState): RoundSummary {
  const daresDone: [number, number] = [0, 0];
  const drinks: [number, number] = [0, 0];
  for (const played of state.history) {
    const affected: PlayerIndex[] = played.kind === 'together' ? [0, 1] : [played.player];
    for (const player of affected) {
      if (played.outcome === 'done') daresDone[player] += 1;
      else drinks[player] += penaltyFor(played.category);
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
