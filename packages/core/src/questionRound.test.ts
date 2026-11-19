import type { CategoryId } from './contentModel';
import { nextRandom } from './seededRandom';
import {
  availableQuestionCount,
  isQuestionRoundOver,
  questionTurnView,
  reduceQuestionRound,
  startQuestionRound,
  summariseQuestionRound,
} from './questionRound';
import type {
  PlayableFormat,
  PlayableQuestion,
  QuestionRoundAction,
  QuestionRoundSetup,
  QuestionRoundState,
} from './questionRound';
import type { TopicId } from './questionModel';

const everyCategory: readonly CategoryId[] = ['c1', 'c2', 'c3', 'c4'];
const everyFormat: readonly PlayableFormat[] = ['ifYou', 'neverHave', 'guess', 'eitherOr'];

function makeQuestion(
  format: PlayableFormat,
  category: CategoryId,
  index: number,
  source: PlayableQuestion['source'] = 'shipped',
  topic: TopicId = 't1',
): PlayableQuestion {
  const id = `${source}-${format}-${category}-${index}`;
  const shared = { id, category, topic, source };
  switch (format) {
    case 'ifYou':
    case 'neverHave':
      return { ...shared, format, text: `Statement ${id}` };
    case 'guess':
      return {
        ...shared,
        format,
        text: `Guess ${id}`,
        options: [
          { id: 'a', text: 'Option a' },
          { id: 'b', text: 'Option b' },
          { id: 'c', text: 'Option c' },
        ],
      };
    case 'eitherOr':
      return {
        ...shared,
        format,
        options: [
          { id: 'a', text: 'Option a' },
          { id: 'b', text: 'Option b' },
        ],
      };
  }
}

function makeQuestions(
  formats: readonly PlayableFormat[],
  categories: readonly CategoryId[],
  count: number,
  source: PlayableQuestion['source'] = 'shipped',
): PlayableQuestion[] {
  return formats.flatMap((format) =>
    categories.flatMap((category) =>
      Array.from({ length: count }, (_, index) =>
        makeQuestion(format, category, index + 1, source),
      ),
    ),
  );
}

function setupWith(overrides: Partial<QuestionRoundSetup> = {}): QuestionRoundSetup {
  return {
    players: ['Player one', 'Player two'],
    level: 'l3',
    enabledCategories: everyCategory,
    enabledFormats: everyFormat,
    enabledTopics: ['t1', 't2', 't3', 't4', 't5', 't6'],
    length: 20,
    seed: 1,
    ...overrides,
  };
}

function bigDeck(): PlayableQuestion[] {
  return makeQuestions(everyFormat, everyCategory, 12);
}

function apply(state: QuestionRoundState, ...actions: QuestionRoundAction[]): QuestionRoundState {
  return actions.reduce(reduceQuestionRound, state);
}

function currentOf(state: QuestionRoundState) {
  if (state.current === null) throw new Error('Expected the round to have a current question');
  return state.current;
}

function questionOf(state: QuestionRoundState): PlayableQuestion {
  return currentOf(state).question;
}

const answerBoth = (first: boolean, second: boolean): QuestionRoundAction => ({
  type: 'answer',
  answers: [first, second],
});
const pick = (optionId: string): QuestionRoundAction => ({ type: 'pick', optionId });
const next: QuestionRoundAction = { type: 'next' };

/** Plays every question with a fixed answer for the format, returning each question dealt. */
function playOut(state: QuestionRoundState): PlayableQuestion[] {
  const dealt: PlayableQuestion[] = [];
  let current = state;
  for (let guard = 0; guard < 1000 && !isQuestionRoundOver(current); guard += 1) {
    const question = questionOf(current);
    dealt.push(question);
    const played =
      question.format === 'ifYou' || question.format === 'neverHave'
        ? apply(current, answerBoth(true, false))
        : apply(current, pick('a'), pick('a'));
    current = apply(played, next);
  }
  return dealt;
}

function startOnly(
  format: PlayableFormat,
  questions: readonly PlayableQuestion[],
  overrides: Partial<QuestionRoundSetup> = {},
): QuestionRoundState {
  return startQuestionRound(
    setupWith({ enabledFormats: [format], enabledCategories: ['c1'], ...overrides }),
    questions,
  );
}

describe('startQuestionRound setup checks', () => {
  const questions = bigDeck();
  const cases: [string, Partial<QuestionRoundSetup>, string][] = [
    ['a blank player name', { players: ['Player one', '  '] }, 'both players need a name'],
    ['no categories', { enabledCategories: [] }, 'at least one category must be enabled'],
    [
      'an unknown category',
      // @ts-expect-error a category outside the model, as untyped input could carry
      { enabledCategories: ['c9'] },
      'unknown category "c9"',
    ],
    [
      'a category outside the level',
      { level: 'l1', enabledCategories: ['c4'] },
      'category "c4" is not part of level "l1"',
    ],
    [
      'a category listed twice',
      { enabledCategories: ['c1', 'c1'] },
      'category "c1" is listed twice',
    ],
    ['no formats', { enabledFormats: [] }, 'at least one format must be enabled'],
    [
      'an unknown format',
      // @ts-expect-error a format outside the model, as untyped input could carry
      { enabledFormats: ['other'] },
      'unknown format "other"',
    ],
    [
      'the secret match format',
      // @ts-expect-error secretMatch is played in its own session
      { enabledFormats: ['secretMatch'] },
      'format "secretMatch" is not played in a round',
    ],
    [
      'a format listed twice',
      { enabledFormats: ['guess', 'guess'] },
      'format "guess" is listed twice',
    ],
    ['no topics', { enabledTopics: [] }, 'at least one topic must be enabled'],
    [
      'an unknown topic',
      // @ts-expect-error a topic outside the model, as untyped input could carry
      { enabledTopics: ['t9'] },
      'unknown topic "t9"',
    ],
    ['a topic listed twice', { enabledTopics: ['t1', 't1'] }, 'topic "t1" is listed twice'],
    [
      'a length that is not offered',
      // @ts-expect-error a length outside the model
      { length: 15 },
      'length must be 10, 20 or endless',
    ],
    ['a seed that is not whole', { seed: 1.5 }, 'seed must be a whole number'],
  ];

  it.each(cases)('should throw for %s', (_name, overrides, message) => {
    expect(() => startQuestionRound(setupWith(overrides), questions)).toThrow(message);
  });
});

describe('startQuestionRound dealing', () => {
  it('should deal the first question to the first player', () => {
    const state = startQuestionRound(setupWith(), bigDeck());
    expect(currentOf(state)).toMatchObject({ holder: 0, other: 1, stage: 'answering' });
  });

  it('should only deal questions in the enabled categories, formats and topics', () => {
    const questions = [
      ...makeQuestions(everyFormat, everyCategory, 6),
      ...everyFormat.flatMap((format) =>
        Array.from({ length: 6 }, (_, index) =>
          makeQuestion(format, 'c1', index + 1, 'shipped', 't2'),
        ),
      ),
    ].map((question, index) => ({ ...question, id: `${question.id}-${index}` }));
    const state = startQuestionRound(
      setupWith({
        enabledCategories: ['c2', 'c3'],
        enabledFormats: ['ifYou', 'guess'],
        enabledTopics: ['t1'],
      }),
      questions,
    );
    const dealt = playOut(state);
    expect(dealt.length).toBeGreaterThan(0);
    for (const question of dealt) {
      expect(['c2', 'c3']).toContain(question.category);
      expect(['ifYou', 'guess']).toContain(question.format);
      expect(question.topic).toBe('t1');
    }
  });

  it('should never repeat a question in a round', () => {
    const dealt = playOut(startQuestionRound(setupWith({ length: 'endless' }), bigDeck()));
    const ids = dealt.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should not repeat a question when the list holds the same id twice', () => {
    const question = makeQuestion('ifYou', 'c1', 1);
    const dealt = playOut(startOnly('ifYou', [question, question]));
    expect(dealt).toHaveLength(1);
  });

  it('should deal the same round for the same seed and a different one for another seed', () => {
    const idsFor = (seed: number) =>
      playOut(startQuestionRound(setupWith({ seed }), bigDeck())).map((question) => question.id);
    expect(idsFor(7)).toEqual(idsFor(7));
    expect(idsFor(7)).not.toEqual(idsFor(8));
  });

  it('should keep the state as plain serialisable data', () => {
    const state = apply(startQuestionRound(setupWith(), bigDeck()), answerBoth(true, true));
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it('should be over at once when no question is dealable', () => {
    const state = startQuestionRound(setupWith(), []);
    expect(isQuestionRoundOver(state)).toBe(true);
  });

  it('should end the round when the questions run out before its length', () => {
    const questions = makeQuestions(['ifYou'], ['c1'], 3);
    const dealt = playOut(startOnly('ifYou', questions, { length: 10 }));
    expect(dealt).toHaveLength(3);
  });

  it('should end a 10 question round after 10 questions', () => {
    expect(playOut(startQuestionRound(setupWith({ length: 10 }), bigDeck()))).toHaveLength(10);
  });
});

describe('player-written questions', () => {
  const shipped = makeQuestions(['ifYou'], ['c1'], 5);
  const player = makeQuestions(['ifYou'], ['c1'], 5, 'player');

  it('should not use the generator for a coin when the list holds no player questions', () => {
    const state = startOnly('ifYou', shipped);
    expect(state.randomState).toBe(nextRandom(1).state);
  });

  it('should use the generator for a coin when both sources are present', () => {
    const state = startOnly('ifYou', [...shipped, ...player]);
    expect(state.randomState).toBe(nextRandom(nextRandom(1).state).state);
  });

  it('should take a player question about half the time when both sources are present', () => {
    let playerFirst = 0;
    for (let seed = 1; seed <= 100; seed += 1) {
      if (questionOf(startOnly('ifYou', [...shipped, ...player], { seed })).source === 'player') {
        playerFirst += 1;
      }
    }
    expect(playerFirst).toBeGreaterThan(25);
    expect(playerFirst).toBeLessThan(75);
  });

  it('should deal player questions when there are no shipped ones', () => {
    expect(questionOf(startOnly('ifYou', player)).source).toBe('player');
  });
});

describe('pacing', () => {
  it('should start in the lowest enabled category', () => {
    const state = startQuestionRound(setupWith({ enabledCategories: ['c2', 'c3'] }), bigDeck());
    expect(questionOf(state).category).toBe('c2');
  });

  it('should split a 10 question round across the categories with the remainder going higher', () => {
    const dealt = playOut(startQuestionRound(setupWith({ length: 10 }), bigDeck()));
    const counts = everyCategory.map(
      (category) => dealt.filter((question) => question.category === category).length,
    );
    expect(counts).toEqual([2, 2, 3, 3]);
  });

  it('should step up every 5 questions in an endless round', () => {
    const dealt = playOut(startQuestionRound(setupWith({ length: 'endless' }), bigDeck()));
    expect(dealt.slice(0, 5).every((question) => question.category === 'c1')).toBe(true);
    expect(dealt[5]?.category).toBe('c2');
    expect(dealt[10]?.category).toBe('c3');
  });

  it('should mark the first question of a higher category as stepping up', () => {
    let state = startQuestionRound(setupWith({ length: 'endless' }), bigDeck());
    const steppingUp: boolean[] = [];
    for (let count = 0; count < 7; count += 1) {
      steppingUp.push(currentOf(state).steppingUp);
      state = apply(state, ...playActions(questionOf(state)), next);
    }
    expect(steppingUp).toEqual([false, false, false, false, false, true, false]);
  });
});

function playActions(question: PlayableQuestion): QuestionRoundAction[] {
  return question.format === 'ifYou' || question.format === 'neverHave'
    ? [answerBoth(false, false)]
    : [pick('a'), pick('a')];
}

describe('format bag', () => {
  it('should deal each enabled format once in every group of four, refilling the bag', () => {
    const dealt = playOut(startQuestionRound(setupWith({ length: 'endless' }), bigDeck()));
    for (let start = 0; start + 4 <= 16; start += 4) {
      const formats = dealt.slice(start, start + 4).map((question) => question.format);
      expect([...formats].sort()).toEqual([...everyFormat].sort());
    }
  });

  it('should deal only the enabled formats', () => {
    const dealt = playOut(
      startQuestionRound(setupWith({ enabledFormats: ['guess', 'eitherOr'] }), bigDeck()),
    );
    expect(dealt.every((question) => ['guess', 'eitherOr'].includes(question.format))).toBe(true);
  });

  it('should deal a different order of formats for a different seed', () => {
    const orderFor = (seed: number) =>
      playOut(startQuestionRound(setupWith({ seed, length: 'endless' }), bigDeck()))
        .slice(0, 12)
        .map((question) => question.format);
    const orders = new Set([1, 2, 3, 4, 5, 6].map((seed) => orderFor(seed).join()));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('when the target has no unused question in the chosen format', () => {
  it('should try the other enabled formats in the same category first', () => {
    const questions = makeQuestions(['neverHave'], ['c1'], 3);
    const state = startQuestionRound(
      setupWith({
        enabledCategories: ['c1', 'c2'],
        enabledFormats: ['ifYou', 'neverHave'],
      }),
      [...questions, ...makeQuestions(['ifYou'], ['c2'], 3)],
    );
    expect(questionOf(state)).toMatchObject({ format: 'neverHave', category: 'c1' });
  });

  it('should try the nearest higher category before a lower one', () => {
    const state = startQuestionRound(
      setupWith({ enabledCategories: ['c1', 'c2', 'c3'], length: 10 }),
      makeQuestions(['ifYou'], ['c2', 'c3'], 4),
    );
    expect(questionOf(state).category).toBe('c2');
  });

  it('should try a lower category when no higher one has a question', () => {
    const state = startQuestionRound(
      setupWith({ enabledCategories: ['c1', 'c2'], length: 'endless' }),
      makeQuestions(['ifYou'], ['c1'], 8),
    );
    const dealt = playOut(state);
    expect(dealt).toHaveLength(8);
    expect(dealt.every((question) => question.category === 'c1')).toBe(true);
  });
});

describe('the phone holder', () => {
  it('should alternate every question, starting with the first player', () => {
    let state = startQuestionRound(setupWith({ length: 10 }), bigDeck());
    const holders: number[] = [];
    for (let count = 0; count < 4; count += 1) {
      const { holder, other } = currentOf(state);
      expect(other).toBe(holder === 0 ? 1 : 0);
      holders.push(holder);
      state = apply(state, ...playActions(questionOf(state)), next);
    }
    expect(holders).toEqual([0, 1, 0, 1]);
  });
});

describe('Drink if and Never have I ever', () => {
  const statementFormats = ['ifYou', 'neverHave'] as const;

  it.each(statementFormats)('should reveal after both answers for %s', (format) => {
    const state = apply(
      startOnly(format, makeQuestions([format], ['c1'], 4)),
      answerBoth(true, false),
    );
    expect(currentOf(state).stage).toBe('revealed');
  });

  it.each(statementFormats)('should make each player who says yes drink for %s', (format) => {
    const state = apply(
      startOnly(format, makeQuestions([format], ['c1'], 4)),
      answerBoth(true, false),
    );
    expect(currentOf(state).reveal).toEqual({
      kind: 'answers',
      answers: [true, false],
      drinks: [1, 0],
    });
  });

  it('should make both players drink when both say yes', () => {
    const state = apply(
      startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 4)),
      answerBoth(true, true),
    );
    expect(currentOf(state).reveal).toMatchObject({ drinks: [1, 1] });
  });

  it('should make nobody drink when both say no', () => {
    const state = apply(
      startOnly('neverHave', makeQuestions(['neverHave'], ['c1'], 4)),
      answerBoth(false, false),
    );
    expect(currentOf(state).reveal).toMatchObject({ drinks: [0, 0] });
  });

  it('should drink the penalty of the question category', () => {
    const state = apply(
      startQuestionRound(
        setupWith({ enabledCategories: ['c3'], enabledFormats: ['ifYou'] }),
        makeQuestions(['ifYou'], ['c3'], 4),
      ),
      answerBoth(true, true),
    );
    expect(currentOf(state).reveal).toMatchObject({ drinks: [3, 3] });
  });

  it('should record no discovery', () => {
    const state = apply(
      startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 4)),
      answerBoth(true, true),
    );
    expect(state.discoveries).toEqual([]);
  });

  it('should ignore a pick', () => {
    const state = startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 4));
    expect(reduceQuestionRound(state, pick('a'))).toBe(state);
  });
});

describe('Would you rather', () => {
  const questions = makeQuestions(['eitherOr'], ['c2'], 4);
  const start = () =>
    startQuestionRound(
      setupWith({ enabledCategories: ['c2'], enabledFormats: ['eitherOr'] }),
      questions,
    );

  it('should keep the first pick in state and out of the reveal until both have picked', () => {
    const state = apply(start(), pick('a'));
    expect(currentOf(state)).toMatchObject({ stage: 'secondPick', firstPick: 'a', reveal: null });
  });

  it('should keep the phone with the same holder between picks', () => {
    const before = currentOf(start()).holder;
    expect(currentOf(apply(start(), pick('a'))).holder).toBe(before);
  });

  it('should make nobody drink and record an agree discovery when both pick the same option', () => {
    const state = apply(start(), pick('b'), pick('b'));
    expect(currentOf(state)).toMatchObject({ stage: 'revealed' });
    expect(currentOf(state).reveal).toMatchObject({ kind: 'picks', matched: true, drinks: [0, 0] });
    expect(state.discoveries).toEqual([
      { kind: 'agree', questionId: questionOf(state).id, optionId: 'b' },
    ]);
  });

  it('should make both drink the penalty and record no discovery when the picks differ', () => {
    const state = apply(start(), pick('a'), pick('b'));
    expect(currentOf(state).reveal).toEqual({
      kind: 'picks',
      holderPick: 'a',
      otherPick: 'b',
      matched: false,
      drinks: [2, 2],
    });
    expect(state.discoveries).toEqual([]);
  });

  it('should clear the kept first pick once revealed', () => {
    expect(currentOf(apply(start(), pick('a'), pick('b'))).firstPick).toBeNull();
  });

  it('should ignore an option the question does not have', () => {
    const state = start();
    expect(reduceQuestionRound(state, pick('z'))).toBe(state);
  });

  it('should ignore a yes or no answer', () => {
    const state = start();
    expect(reduceQuestionRound(state, answerBoth(true, true))).toBe(state);
  });

  it('should not pass the first pick on to the next question', () => {
    const state = apply(start(), pick('a'), pick('b'), next);
    expect(currentOf(state)).toMatchObject({ stage: 'answering', firstPick: null, reveal: null });
  });
});

describe('Guess your partner', () => {
  const questions = makeQuestions(['guess'], ['c2'], 4);
  const start = () =>
    startQuestionRound(
      setupWith({ enabledCategories: ['c2'], enabledFormats: ['guess'] }),
      questions,
    );

  it('should move to the guess once the holder has answered', () => {
    const state = apply(start(), pick('b'));
    expect(currentOf(state)).toMatchObject({ stage: 'secondPick', firstPick: 'b', reveal: null });
  });

  it('should score the guesser a point and no drink for a right guess', () => {
    const state = apply(start(), pick('b'), pick('b'));
    expect(currentOf(state).reveal).toEqual({
      kind: 'guess',
      answer: 'b',
      guess: 'b',
      correct: true,
      drinks: [0, 0],
    });
    expect(summariseQuestionRound(state).players[1]).toMatchObject({
      guessesRight: 1,
      guessesMade: 1,
      drinks: 0,
    });
  });

  it('should make the guesser drink the penalty for a wrong guess', () => {
    const state = apply(start(), pick('b'), pick('c'));
    expect(currentOf(state).reveal).toMatchObject({ correct: false, drinks: [0, 2] });
    expect(summariseQuestionRound(state).players[1]).toMatchObject({
      guessesRight: 0,
      guessesMade: 1,
      drinks: 2,
    });
  });

  it('should make the holder drink nothing for a wrong guess', () => {
    const state = apply(start(), pick('b'), pick('c'));
    expect(summariseQuestionRound(state).players[0].drinks).toBe(0);
  });

  it.each([
    ['right', 'b'],
    ['wrong', 'c'],
  ])('should record an answer discovery for the holder after a %s guess', (_name, guess) => {
    const state = apply(start(), pick('b'), pick(guess));
    expect(state.discoveries).toEqual([
      {
        kind: 'answer',
        questionId: questionOf(state).id,
        optionId: 'b',
        answererName: 'Player one',
      },
    ]);
  });

  it('should name the second player as the answerer when they hold the phone', () => {
    const state = apply(start(), pick('a'), pick('a'), next, pick('c'), pick('a'));
    expect(state.discoveries.at(-1)).toMatchObject({ answererName: 'Player two', optionId: 'c' });
  });

  it('should count the guess for the player who guessed, not the holder', () => {
    const state = apply(start(), pick('a'), pick('a'), next, pick('c'), pick('c'));
    const summary = summariseQuestionRound(state);
    expect(summary.players[0]).toMatchObject({ guessesMade: 1, guessesRight: 1 });
    expect(summary.players[1]).toMatchObject({ guessesMade: 1, guessesRight: 1 });
  });
});

describe('actions that do not apply', () => {
  const start = () => startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 6));

  it('should ignore next before the question is revealed', () => {
    const state = start();
    expect(reduceQuestionRound(state, next)).toBe(state);
  });

  it('should ignore a second answer once revealed', () => {
    const state = apply(start(), answerBoth(true, true));
    expect(reduceQuestionRound(state, answerBoth(false, false))).toBe(state);
  });

  it('should ignore a third pick once revealed', () => {
    const state = apply(
      startOnly('eitherOr', makeQuestions(['eitherOr'], ['c1'], 4)),
      pick('a'),
      pick('b'),
    );
    expect(reduceQuestionRound(state, pick('a'))).toBe(state);
  });

  it('should ignore removing a question that is already revealed', () => {
    const state = apply(start(), answerBoth(true, true));
    expect(reduceQuestionRound(state, { type: 'removeQuestion' })).toBe(state);
  });

  it('should return the same state for every action on a finished round', () => {
    const finished = apply(start(), { type: 'end' });
    const actions: QuestionRoundAction[] = [
      answerBoth(true, true),
      pick('a'),
      next,
      { type: 'removeQuestion' },
      { type: 'disableCategory', category: 'c1' },
      { type: 'end' },
    ];
    for (const action of actions) expect(reduceQuestionRound(finished, action)).toBe(finished);
  });
});

describe('removeQuestion', () => {
  const questions = makeQuestions(everyFormat, ['c1', 'c2'], 6);
  const start = () =>
    startQuestionRound(
      setupWith({ enabledCategories: ['c1', 'c2'], enabledFormats: ['guess', 'eitherOr'] }),
      questions,
    );

  it('should replace the question with one of the same format and category', () => {
    const before = start();
    const after = reduceQuestionRound(before, { type: 'removeQuestion' });
    expect(questionOf(after).id).not.toBe(questionOf(before).id);
    expect(questionOf(after)).toMatchObject({
      format: questionOf(before).format,
      category: questionOf(before).category,
    });
  });

  it('should cost nothing and not count as a played question', () => {
    const after = reduceQuestionRound(start(), { type: 'removeQuestion' });
    expect(after.history).toEqual([]);
    expect(after.discoveries).toEqual([]);
  });

  it('should keep the holder', () => {
    const after = reduceQuestionRound(start(), { type: 'removeQuestion' });
    expect(currentOf(after).holder).toBe(0);
  });

  it('should drop a first pick that was already made', () => {
    const after = apply(start(), pick('a'), { type: 'removeQuestion' });
    expect(currentOf(after)).toMatchObject({ stage: 'answering', firstPick: null, reveal: null });
  });

  it('should not deal the removed question again', () => {
    const before = start();
    const removedId = questionOf(before).id;
    const dealt = playOut(reduceQuestionRound(before, { type: 'removeQuestion' }));
    expect(dealt.map((question) => question.id)).not.toContain(removedId);
  });

  it('should end the round when nothing is left to replace it', () => {
    const state = startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 1));
    expect(isQuestionRoundOver(reduceQuestionRound(state, { type: 'removeQuestion' }))).toBe(true);
  });
});

describe('disableCategory', () => {
  const start = () =>
    startQuestionRound(
      setupWith({ enabledCategories: ['c1', 'c2'], enabledFormats: ['ifYou'] }),
      makeQuestions(['ifYou'], ['c1', 'c2'], 8),
    );

  it('should not deal the category again', () => {
    const dealt = playOut(apply(start(), { type: 'disableCategory', category: 'c1' }));
    expect(dealt.every((question) => question.category === 'c2')).toBe(true);
  });

  it('should replace the question in play when it is in the category', () => {
    const after = apply(start(), { type: 'disableCategory', category: 'c1' });
    expect(questionOf(after).category).toBe('c2');
  });

  it('should keep the question in play when it is in another category', () => {
    const before = start();
    const after = apply(before, { type: 'disableCategory', category: 'c2' });
    expect(questionOf(after).id).toBe(questionOf(before).id);
    expect(after.enabled).toEqual(['c1']);
  });

  it('should keep the last enabled category', () => {
    const only = startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 3));
    expect(reduceQuestionRound(only, { type: 'disableCategory', category: 'c1' })).toBe(only);
  });

  it('should ignore a category that is already off', () => {
    const off = apply(start(), { type: 'disableCategory', category: 'c1' });
    expect(reduceQuestionRound(off, { type: 'disableCategory', category: 'c1' })).toBe(off);
  });

  it('should switch the category off without replacing a revealed question', () => {
    const revealed = apply(start(), answerBoth(true, true));
    const after = apply(revealed, { type: 'disableCategory', category: 'c1' });
    expect(questionOf(after).id).toBe(questionOf(revealed).id);
    expect(currentOf(after).stage).toBe('revealed');
    expect(after.enabled).toEqual(['c2']);
  });
});

describe('end', () => {
  it('should finish the round and keep what was played', () => {
    const played = apply(
      startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 6)),
      answerBoth(true, true),
      next,
    );
    const ended = apply(played, { type: 'end' });
    expect(isQuestionRoundOver(ended)).toBe(true);
    expect(summariseQuestionRound(ended).questionsPlayed).toBe(1);
  });

  it('should not count a question that was never answered', () => {
    const ended = apply(startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 6)), { type: 'end' });
    expect(summariseQuestionRound(ended).questionsPlayed).toBe(0);
  });

  it('should count a question that was revealed before the round ended', () => {
    const ended = apply(
      startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 6)),
      answerBoth(true, true),
      { type: 'end' },
    );
    expect(summariseQuestionRound(ended).questionsPlayed).toBe(1);
  });
});

describe('summariseQuestionRound', () => {
  const mixed = () =>
    startQuestionRound(
      setupWith({ length: 'endless', enabledFormats: ['ifYou', 'guess', 'eitherOr'] }),
      makeQuestions(['ifYou', 'guess', 'eitherOr'], everyCategory, 8),
    );

  /** Plays one question, choosing the answers by format, then moves on. */
  function playOne(
    state: QuestionRoundState,
    choices: { statement?: [boolean, boolean]; picks?: [string, string] },
  ): QuestionRoundState {
    const question = questionOf(state);
    const [firstPick, secondPick] = choices.picks ?? ['a', 'a'];
    const played =
      question.format === 'ifYou' || question.format === 'neverHave'
        ? apply(state, answerBoth(...(choices.statement ?? [false, false])))
        : apply(state, pick(firstPick), pick(secondPick));
    return apply(played, next);
  }

  it('should report an empty round', () => {
    expect(summariseQuestionRound(startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 3)))).toEqual(
      {
        players: [
          { name: 'Player one', drinks: 0, guessesRight: 0, guessesMade: 0 },
          { name: 'Player two', drinks: 0, guessesRight: 0, guessesMade: 0 },
        ],
        questionsPlayed: 0,
        categoriesReached: [],
        eitherOrPlayed: 0,
        eitherOrMatched: 0,
        knowsBest: null,
        discoveries: [],
      },
    );
  });

  it('should total drinks, questions played, categories reached and discoveries', () => {
    let state = mixed();
    for (let count = 0; count < 3; count += 1) {
      state = playOne(state, { statement: [true, true], picks: ['a', 'b'] });
    }
    const summary = summariseQuestionRound(state);
    expect(summary.questionsPlayed).toBe(3);
    expect(summary.categoriesReached).toEqual(['c1']);
    const totalDrinks = summary.players[0].drinks + summary.players[1].drinks;
    expect(totalDrinks).toBeGreaterThan(0);
  });

  it('should count would you rather questions and how many matched', () => {
    let state = startOnly('eitherOr', makeQuestions(['eitherOr'], ['c1'], 6));
    state = playOne(state, { picks: ['a', 'a'] });
    state = playOne(state, { picks: ['a', 'b'] });
    state = playOne(state, { picks: ['b', 'b'] });
    const summary = summariseQuestionRound(state);
    expect(summary.eitherOrPlayed).toBe(3);
    expect(summary.eitherOrMatched).toBe(2);
  });

  it('should report knowsBest as null when no guess question was played', () => {
    const state = playOne(startOnly('ifYou', makeQuestions(['ifYou'], ['c1'], 3)), {});
    expect(summariseQuestionRound(state).knowsBest).toBeNull();
  });

  it('should report the player with more right guesses as knowsBest', () => {
    let state = startOnly('guess', makeQuestions(['guess'], ['c1'], 6));
    state = playOne(state, { picks: ['a', 'a'] });
    state = playOne(state, { picks: ['a', 'b'] });
    state = playOne(state, { picks: ['a', 'a'] });
    const summary = summariseQuestionRound(state);
    expect(summary.knowsBest).toBe(1);
    expect(summary.players[1]).toMatchObject({ guessesRight: 2, guessesMade: 2 });
    expect(summary.players[0]).toMatchObject({ guessesRight: 0, guessesMade: 1 });
  });

  it('should report a tie when both guessed right the same number of times', () => {
    let state = startOnly('guess', makeQuestions(['guess'], ['c1'], 6));
    state = playOne(state, { picks: ['a', 'a'] });
    state = playOne(state, { picks: ['a', 'a'] });
    expect(summariseQuestionRound(state).knowsBest).toBe('tie');
  });

  it('should report a tie when guesses were made and nobody got one right', () => {
    const state = playOne(startOnly('guess', makeQuestions(['guess'], ['c1'], 6)), {
      picks: ['a', 'b'],
    });
    expect(summariseQuestionRound(state).knowsBest).toBe('tie');
  });

  it('should list the discoveries made in the round without dates', () => {
    let state = startOnly('eitherOr', makeQuestions(['eitherOr'], ['c1'], 6));
    state = playOne(state, { picks: ['a', 'a'] });
    const { discoveries } = summariseQuestionRound(state);
    expect(discoveries).toHaveLength(1);
    expect(discoveries[0]).not.toHaveProperty('date');
  });
});

describe('availableQuestionCount', () => {
  it('should count the questions the setup could deal', () => {
    const questions = [
      ...makeQuestions(['ifYou', 'guess'], ['c1', 'c2'], 3),
      makeQuestion('ifYou', 'c1', 99, 'shipped', 't2'),
    ];
    const setup = setupWith({
      enabledCategories: ['c1'],
      enabledFormats: ['ifYou'],
      enabledTopics: ['t1'],
    });
    expect(availableQuestionCount(setup, questions)).toBe(3);
  });

  it('should count a question id once', () => {
    const question = makeQuestion('ifYou', 'c1', 1);
    expect(availableQuestionCount(setupWith(), [question, question])).toBe(1);
  });

  it('should count player and shipped questions together', () => {
    const questions = [
      ...makeQuestions(['ifYou'], ['c1'], 2),
      ...makeQuestions(['ifYou'], ['c1'], 2, 'player'),
    ];
    expect(availableQuestionCount(setupWith(), questions)).toBe(4);
  });
});

describe('questionTurnView', () => {
  const secretOptionId = 'secret-pick-id';
  const secretQuestion: PlayableQuestion = {
    id: 'shipped-guess-c1-secret',
    format: 'guess',
    category: 'c1',
    topic: 't1',
    source: 'shipped',
    text: 'Guess secret',
    options: [
      { id: secretOptionId, text: 'Option one' },
      { id: 'other-option-id', text: 'Option two' },
    ],
  };
  const start = () => startOnly('guess', [secretQuestion]);

  it('should be null when the round is over', () => {
    expect(questionTurnView(apply(start(), { type: 'end' }))).toBeNull();
  });

  it('should carry what a turn screen needs', () => {
    expect(questionTurnView(start())).toMatchObject({
      question: secretQuestion,
      holder: 0,
      other: 1,
      steppingUp: false,
      stage: 'answering',
      reveal: null,
      pickLocked: false,
    });
  });

  it('should lock the pick during the second pick and only then', () => {
    const answering = questionTurnView(start());
    const secondPick = questionTurnView(apply(start(), pick(secretOptionId)));
    const revealed = questionTurnView(apply(start(), pick(secretOptionId), pick(secretOptionId)));
    expect([answering?.pickLocked, secondPick?.pickLocked, revealed?.pickLocked]).toEqual([
      false,
      true,
      false,
    ]);
  });

  it('should never contain the first pick before the reveal', () => {
    const answering = questionTurnView(start());
    const secondPick = questionTurnView(apply(start(), pick(secretOptionId)));
    for (const view of [answering, secondPick]) {
      expect(view).not.toHaveProperty('firstPick');
      // The question lists every option, so it is left out to look for the pick anywhere else.
      expect(JSON.stringify({ ...view, question: null })).not.toContain(secretOptionId);
    }
  });

  it('should show the first pick only inside the reveal once both have picked', () => {
    const view = questionTurnView(apply(start(), pick(secretOptionId), pick('other-option-id')));
    expect(view).not.toHaveProperty('firstPick');
    expect(view?.reveal).toMatchObject({ answer: secretOptionId, guess: 'other-option-id' });
  });

  it('should show no earlier pick on the replacement after a question is removed', () => {
    const state = apply(startOnly('guess', makeQuestions(['guess'], ['c1'], 3)), pick('a'), {
      type: 'removeQuestion',
    });
    expect(questionTurnView(state)).toMatchObject({ pickLocked: false, stage: 'answering' });
  });
});

describe('the first mixed draw with a fixed seed', () => {
  it.each([
    [1, 'shipped'],
    [7, 'player'],
  ])('should take the first mixed question for seed %s from the %s source', (seed, source) => {
    const state = startOnly(
      'ifYou',
      [...makeQuestions(['ifYou'], ['c1'], 5), ...makeQuestions(['ifYou'], ['c1'], 5, 'player')],
      { seed },
    );
    expect(questionOf(state).source).toBe(source);
  });
});
