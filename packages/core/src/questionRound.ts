import { categories, categoriesForLevel, categoryIds, isCategoryId } from './contentModel';
import type { CategoryId, LevelId } from './contentModel';
import {
  categoryOrder,
  pacedCategory,
  pickWithPlayerShare,
  resolveEnabled,
  searchOrder,
} from './pacing';
import { questionFormats, topicIds } from './questionModel';
import type { NewDiscovery, Question, QuestionFormat, TopicId } from './questionModel';
import type { PlayerIndex, RoundLength } from './round';
import { nextRandom } from './seededRandom';

/** The formats played in a round. `secretMatch` has its own session and its own engine. */
export type PlayableFormat = Exclude<QuestionFormat, 'secretMatch'>;
export type PlayableQuestion = Exclude<Question, { format: 'secretMatch' }>;

/** Also the order the engine tries formats in when the chosen one has nothing left. */
export const playableFormats: readonly PlayableFormat[] = [
  'ifYou',
  'neverHave',
  'guess',
  'eitherOr',
];

export type QuestionRoundSetup = {
  players: readonly [string, string];
  level: LevelId;
  enabledCategories: readonly CategoryId[];
  enabledFormats: readonly PlayableFormat[];
  enabledTopics: readonly TopicId[];
  length: RoundLength;
  seed: number;
};

export type QuestionRoundAction =
  /** A yes (true) or no (false) for each player, by player index. For `ifYou` and `neverHave`. */
  | { type: 'answer'; answers: readonly [boolean, boolean] }
  /** The holder's pick, then the other player's. For `guess` and `eitherOr`. */
  | { type: 'pick'; optionId: string }
  | { type: 'next' }
  | { type: 'removeQuestion' }
  | { type: 'disableCategory'; category: CategoryId }
  | { type: 'end' };

export type QuestionStage = 'answering' | 'secondPick' | 'revealed';

/** What the screens show once a question is revealed. `drinks` is by player index. */
export type QuestionReveal =
  | { kind: 'answers'; answers: readonly [boolean, boolean]; drinks: readonly [number, number] }
  | {
      kind: 'picks';
      holderPick: string;
      otherPick: string;
      matched: boolean;
      drinks: readonly [number, number];
    }
  | {
      kind: 'guess';
      /** The option the holder picked for themselves. */
      answer: string;
      /** The option the other player guessed. */
      guess: string;
      correct: boolean;
      drinks: readonly [number, number];
    };

export type CurrentQuestion = {
  question: PlayableQuestion;
  /** The player who holds the phone for this question. */
  holder: PlayerIndex;
  other: PlayerIndex;
  /** True for the first question in a higher category than the previous one. */
  steppingUp: boolean;
  stage: QuestionStage;
  /**
   * The holder's pick, kept private until the other player has picked. Null at any other time.
   * Screens must not read this. They read `questionTurnView`, which leaves it out.
   */
  firstPick: string | null;
  /** Set when the stage is `revealed`. */
  reveal: QuestionReveal | null;
};

export type PlayedQuestion = {
  questionId: string;
  format: PlayableFormat;
  category: CategoryId;
  holder: PlayerIndex;
  /** By player index. */
  drinks: readonly [number, number];
  /** For `eitherOr`, whether both picked the same option. Otherwise null. */
  matched: boolean | null;
  /** For `guess`, whether the guess was right. Otherwise null. */
  guessedRight: boolean | null;
};

/** Plain serialisable data. The round is over when `current` is null. */
export type QuestionRoundState = {
  players: readonly [string, string];
  length: RoundLength;
  /** The categories the round was set up with, lowest first. Pacing follows this list. */
  pacing: readonly CategoryId[];
  /** The categories still enabled, lowest first. */
  enabled: readonly CategoryId[];
  /** The formats the round was set up with, in the order of `playableFormats`. */
  formats: readonly PlayableFormat[];
  /** The formats not yet taken since the bag was last filled. */
  formatBag: readonly PlayableFormat[];
  /** Questions not yet dealt, from the enabled categories, formats and topics only. */
  unused: readonly PlayableQuestion[];
  randomState: number;
  current: CurrentQuestion | null;
  /** Every question that was revealed, in order. */
  history: readonly PlayedQuestion[];
  discoveries: readonly NewDiscovery[];
};

export type QuestionPlayerSummary = {
  name: string;
  drinks: number;
  guessesRight: number;
  guessesMade: number;
};

export type QuestionRoundSummary = {
  players: readonly [QuestionPlayerSummary, QuestionPlayerSummary];
  questionsPlayed: number;
  categoriesReached: readonly CategoryId[];
  eitherOrPlayed: number;
  eitherOrMatched: number;
  /** The player with more right guesses, `'tie'`, or null when no guess question was played. */
  knowsBest: PlayerIndex | 'tie' | null;
  discoveries: readonly NewDiscovery[];
};

const roundLengths: readonly RoundLength[] = [10, 20, 'endless'];

function penaltyFor(category: CategoryId): number {
  return categories.find((candidate) => candidate.id === category)?.penalty ?? 0;
}

function otherPlayer(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

function isPlayable(question: Question): question is PlayableQuestion {
  return question.format !== 'secretMatch';
}

function isPlayableFormat(value: string): value is PlayableFormat {
  return playableFormats.some((format) => format === value);
}

export function isQuestionRoundOver(state: QuestionRoundState): boolean {
  return state.current === null;
}

/**
 * Checks the setup and starts a round. Throws an Error that says what is wrong when the setup is
 * invalid: a player without a name, no enabled category, an unknown category, a category outside
 * the level, a category listed twice, the same checks for formats and topics, a length that is not
 * offered, or a seed that is not a whole number.
 */
export function startQuestionRound(
  setup: QuestionRoundSetup,
  questions: readonly Question[],
): QuestionRoundState {
  assertValidSetup(setup);
  const pacing = [...setup.enabledCategories].sort(
    (left, right) => categoryOrder(left) - categoryOrder(right),
  );
  const formats = playableFormats.filter((format) => setup.enabledFormats.includes(format));
  const state: QuestionRoundState = {
    players: setup.players,
    length: setup.length,
    pacing,
    enabled: pacing,
    formats,
    formatBag: [],
    unused: dealableQuestions(setup, questions),
    randomState: setup.seed >>> 0,
    current: null,
    history: [],
    discoveries: [],
  };
  return dealNext(state);
}

function assertListed<Value extends string>(
  values: readonly Value[],
  noun: string,
  isKnown: (value: string) => boolean,
  unknownMessage: (value: string) => string,
): void {
  if (values.length === 0) throw new Error(`at least one ${noun} must be enabled`);
  const seen = new Set<string>();
  for (const value of values) {
    if (!isKnown(value)) throw new Error(unknownMessage(value));
    if (seen.has(value)) throw new Error(`${noun} "${value}" is listed twice`);
    seen.add(value);
  }
}

function assertValidSetup(setup: QuestionRoundSetup): void {
  if (setup.players.some((name) => name.trim() === '')) {
    throw new Error('both players need a name');
  }
  const levelCategories = categoriesForLevel(setup.level);
  assertListed(
    setup.enabledCategories,
    'category',
    isCategoryId,
    (value) => `unknown category "${value}"`,
  );
  for (const category of setup.enabledCategories) {
    if (!levelCategories.includes(category)) {
      throw new Error(`category "${category}" is not part of level "${setup.level}"`);
    }
  }
  assertListed(
    setup.enabledFormats,
    'format',
    (value) => questionFormats.some((format) => format === value),
    (value) => `unknown format "${value}"`,
  );
  for (const format of setup.enabledFormats) {
    if (!isPlayableFormat(format)) {
      throw new Error(`format "${format}" is not played in a round`);
    }
  }
  assertListed(
    setup.enabledTopics,
    'topic',
    (value) => topicIds.some((topic) => topic === value),
    (value) => `unknown topic "${value}"`,
  );
  if (!roundLengths.includes(setup.length)) throw new Error('length must be 10, 20 or endless');
  if (!Number.isInteger(setup.seed)) throw new Error('seed must be a whole number');
}

/** The questions a setup could deal, each id once, from the enabled categories, formats and topics. */
function dealableQuestions(
  setup: QuestionRoundSetup,
  questions: readonly Question[],
): PlayableQuestion[] {
  const seenIds = new Set<string>();
  const dealable: PlayableQuestion[] = [];
  for (const question of questions) {
    if (
      isPlayable(question) &&
      setup.enabledCategories.includes(question.category) &&
      setup.enabledFormats.includes(question.format) &&
      setup.enabledTopics.includes(question.topic) &&
      !seenIds.has(question.id)
    ) {
      seenIds.add(question.id);
      dealable.push(question);
    }
  }
  return dealable;
}

/** How many questions the setup could deal, so the setup screen can compare it with the length. */
export function availableQuestionCount(
  setup: QuestionRoundSetup,
  questions: readonly Question[],
): number {
  return dealableQuestions(setup, questions).length;
}

/**
 * What a turn screen shows. It never carries the holder's first pick, so a screen that reads only
 * this view cannot show it by mistake, including after a focus change or a replaced question.
 */
export type QuestionTurnView = Omit<CurrentQuestion, 'firstPick'> & {
  /** True while the holder's pick is locked in and the other player has yet to pick. */
  pickLocked: boolean;
};

/** The view a turn screen reads. Null when the round is over. */
export function questionTurnView(state: QuestionRoundState): QuestionTurnView | null {
  const { current } = state;
  if (current === null) return null;
  return {
    question: current.question,
    holder: current.holder,
    other: current.other,
    steppingUp: current.steppingUp,
    stage: current.stage,
    reveal: current.reveal,
    pickLocked: current.stage === 'secondPick',
  };
}

/** Applies an action. An action that does not apply returns the same state. */
export function reduceQuestionRound(
  state: QuestionRoundState,
  action: QuestionRoundAction,
): QuestionRoundState {
  const { current } = state;
  if (current === null) return state;
  switch (action.type) {
    case 'answer':
      return answer(state, current, action.answers);
    case 'pick':
      return pickOption(state, current, action.optionId);
    case 'next':
      return current.stage === 'revealed' ? advance(state) : state;
    case 'removeQuestion':
      return current.stage === 'revealed' ? state : replaceCurrent(state, current);
    case 'disableCategory':
      return disableCategory(state, current, action.category);
    case 'end':
      return { ...state, current: null };
  }
}

function drinksForAnswers(
  category: CategoryId,
  answers: readonly [boolean, boolean],
): readonly [number, number] {
  const penalty = penaltyFor(category);
  return [answers[0] ? penalty : 0, answers[1] ? penalty : 0];
}

function answer(
  state: QuestionRoundState,
  current: CurrentQuestion,
  answers: readonly [boolean, boolean],
): QuestionRoundState {
  const { question } = current;
  const isStatement = question.format === 'ifYou' || question.format === 'neverHave';
  if (!isStatement || current.stage !== 'answering') return state;
  const drinks = drinksForAnswers(question.category, answers);
  return reveal(
    state,
    current,
    { kind: 'answers', answers, drinks },
    { drinks, matched: null, guessedRight: null },
    [],
  );
}

function pickOption(
  state: QuestionRoundState,
  current: CurrentQuestion,
  optionId: string,
): QuestionRoundState {
  const { question } = current;
  if (question.format !== 'guess' && question.format !== 'eitherOr') return state;
  if (!question.options.some((option) => option.id === optionId)) return state;
  if (current.stage === 'answering') {
    return { ...state, current: { ...current, stage: 'secondPick', firstPick: optionId } };
  }
  if (current.stage !== 'secondPick' || current.firstPick === null) return state;
  return question.format === 'eitherOr'
    ? revealEitherOr(state, current, question, current.firstPick, optionId)
    : revealGuess(state, current, question, current.firstPick, optionId);
}

function revealEitherOr(
  state: QuestionRoundState,
  current: CurrentQuestion,
  question: PlayableQuestion,
  holderPick: string,
  otherPick: string,
): QuestionRoundState {
  const matched = holderPick === otherPick;
  const penalty = matched ? 0 : penaltyFor(question.category);
  const drinks: readonly [number, number] = [penalty, penalty];
  return reveal(
    state,
    current,
    { kind: 'picks', holderPick, otherPick, matched, drinks },
    { drinks, matched, guessedRight: null },
    matched ? [{ kind: 'agree', questionId: question.id, optionId: holderPick }] : [],
  );
}

function revealGuess(
  state: QuestionRoundState,
  current: CurrentQuestion,
  question: PlayableQuestion,
  holderAnswer: string,
  guess: string,
): QuestionRoundState {
  const correct = holderAnswer === guess;
  const penalty = correct ? 0 : penaltyFor(question.category);
  const drinks: [number, number] = [0, 0];
  drinks[current.other] = penalty;
  return reveal(
    state,
    current,
    { kind: 'guess', answer: holderAnswer, guess, correct, drinks },
    { drinks, matched: null, guessedRight: correct },
    [
      {
        kind: 'answer',
        questionId: question.id,
        optionId: holderAnswer,
        answererName: state.players[current.holder],
      },
    ],
  );
}

function reveal(
  state: QuestionRoundState,
  current: CurrentQuestion,
  result: QuestionReveal,
  outcome: Pick<PlayedQuestion, 'drinks' | 'matched' | 'guessedRight'>,
  discoveries: readonly NewDiscovery[],
): QuestionRoundState {
  const played: PlayedQuestion = {
    questionId: current.question.id,
    format: current.question.format,
    category: current.question.category,
    holder: current.holder,
    ...outcome,
  };
  return {
    ...state,
    history: [...state.history, played],
    discoveries: [...state.discoveries, ...discoveries],
    current: { ...current, stage: 'revealed', firstPick: null, reveal: result },
  };
}

function advance(state: QuestionRoundState): QuestionRoundState {
  const finished = state.length !== 'endless' && state.history.length >= state.length;
  return finished ? { ...state, current: null } : dealNext({ ...state, current: null });
}

function disableCategory(
  state: QuestionRoundState,
  current: CurrentQuestion,
  category: CategoryId,
): QuestionRoundState {
  if (!state.enabled.includes(category) || state.enabled.length === 1) return state;
  const next: QuestionRoundState = {
    ...state,
    enabled: state.enabled.filter((enabled) => enabled !== category),
    unused: state.unused.filter((question) => question.category !== category),
  };
  const replaces = current.question.category === category && current.stage !== 'revealed';
  return replaces ? replaceCurrent(next, current) : next;
}

/** Takes the next format from the bag, refilling it from a seeded shuffle when it is empty. */
function takeFormat(state: QuestionRoundState): {
  format: PlayableFormat;
  formatBag: readonly PlayableFormat[];
  randomState: number;
} {
  let bag = state.formatBag;
  let randomState = state.randomState;
  if (bag.length === 0) {
    const shuffled = shuffle(state.formats, randomState);
    bag = shuffled.items;
    randomState = shuffled.randomState;
  }
  const [format, ...rest] = bag;
  return { format: format ?? 'ifYou', formatBag: rest, randomState };
}

function shuffle<Item>(
  items: readonly Item[],
  randomState: number,
): { items: Item[]; randomState: number } {
  const shuffled = [...items];
  let state = randomState;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const drawn = nextRandom(state);
    state = drawn.state;
    const swapWith = Math.floor(drawn.value * (index + 1));
    const held = shuffled[index];
    const other = shuffled[swapWith];
    if (held !== undefined && other !== undefined) {
      shuffled[index] = other;
      shuffled[swapWith] = held;
    }
  }
  return { items: shuffled, randomState: state };
}

/** Deals the next question of the round, or leaves `current` null when no question is left. */
function dealNext(state: QuestionRoundState): QuestionRoundState {
  const position = state.history.length + 1;
  const target = resolveEnabled(pacedCategory(state.pacing, state.length, position), state.enabled);
  const taken = takeFormat(state);
  return dealQuestion(
    { ...state, formatBag: taken.formatBag, randomState: taken.randomState },
    target,
    taken.format,
  );
}

/** Swaps the question in play for another of the same format and category, at no cost. */
function replaceCurrent(state: QuestionRoundState, current: CurrentQuestion): QuestionRoundState {
  const target = resolveEnabled(current.question.category, state.enabled);
  return dealQuestion(state, target, current.question.format);
}

function dealQuestion(
  state: QuestionRoundState,
  target: CategoryId,
  preferredFormat: PlayableFormat,
): QuestionRoundState {
  const drawn = drawQuestion(state, target, preferredFormat);
  if (drawn === null) return { ...state, current: null };
  const lastPlayed = state.history.at(-1);
  const holder: PlayerIndex = state.history.length % 2 === 0 ? 0 : 1;
  return {
    ...state,
    unused: state.unused.filter((question) => question.id !== drawn.item.id),
    randomState: drawn.randomState,
    current: {
      question: drawn.item,
      holder,
      other: otherPlayer(holder),
      steppingUp:
        lastPlayed !== undefined &&
        categoryOrder(drawn.item.category) > categoryOrder(lastPlayed.category),
      stage: 'answering',
      firstPick: null,
      reveal: null,
    },
  };
}

/**
 * Looks in the target category first, trying the preferred format and then the other enabled
 * formats, then each higher enabled category, nearest first, then each lower one, nearest first.
 */
function drawQuestion(
  state: QuestionRoundState,
  target: CategoryId,
  preferredFormat: PlayableFormat,
): { item: PlayableQuestion; randomState: number } | null {
  const formatOrder = [
    preferredFormat,
    ...state.formats.filter((format) => format !== preferredFormat),
  ];
  for (const category of searchOrder(target, state.enabled)) {
    for (const format of formatOrder) {
      const candidates = state.unused.filter(
        (question) => question.category === category && question.format === format,
      );
      const drawn = pickWithPlayerShare(candidates, state.randomState);
      if (drawn !== null) return drawn;
    }
  }
  return null;
}

export function summariseQuestionRound(state: QuestionRoundState): QuestionRoundSummary {
  const drinks: [number, number] = [0, 0];
  const guessesRight: [number, number] = [0, 0];
  const guessesMade: [number, number] = [0, 0];
  let eitherOrPlayed = 0;
  let eitherOrMatched = 0;
  let guessQuestionsPlayed = 0;
  for (const played of state.history) {
    drinks[0] += played.drinks[0];
    drinks[1] += played.drinks[1];
    if (played.format === 'eitherOr') {
      eitherOrPlayed += 1;
      if (played.matched) eitherOrMatched += 1;
    }
    if (played.guessedRight !== null) {
      const guesser = otherPlayer(played.holder);
      guessQuestionsPlayed += 1;
      guessesMade[guesser] += 1;
      if (played.guessedRight) guessesRight[guesser] += 1;
    }
  }
  const [firstName, secondName] = state.players;
  return {
    players: [
      {
        name: firstName,
        drinks: drinks[0],
        guessesRight: guessesRight[0],
        guessesMade: guessesMade[0],
      },
      {
        name: secondName,
        drinks: drinks[1],
        guessesRight: guessesRight[1],
        guessesMade: guessesMade[1],
      },
    ],
    questionsPlayed: state.history.length,
    categoriesReached: categoryIds.filter((category) =>
      state.history.some((played) => played.category === category),
    ),
    eitherOrPlayed,
    eitherOrMatched,
    knowsBest:
      guessQuestionsPlayed === 0
        ? null
        : guessesRight[0] === guessesRight[1]
          ? 'tie'
          : guessesRight[0] > guessesRight[1]
            ? 0
            : 1,
    discoveries: state.discoveries,
  };
}
