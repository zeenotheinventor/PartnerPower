import { categoryNames, copy, fillCopy, topicNames } from '@getfreak/content';
import type {
  CategoryId,
  PlayableFormat,
  PlayableQuestion,
  Question,
  QuestionOption,
  QuestionRoundSetup,
  QuestionRoundState,
} from '@getfreak/core';
import { act, fireEvent, screen, within } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { QuestionRoundProvider, useQuestionRound } from '../../questionRound/QuestionRoundProvider';
import { QuestionsPlayScreen } from './QuestionsPlayScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockPreventsRemove = false;
let mockOnRemovePrevented: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
}));
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (preventRemove: boolean, callback: () => void) => {
    mockPreventsRemove = preventRemove;
    mockOnRemovePrevented = callback;
  },
}));

const summaryRoute = '/games/questions/summary';
const setupRoute = '/games/questions/setup';

const players = ['Player A', 'Player B'] as const;
const categoryList: CategoryId[] = ['c1', 'c2', 'c3'];

const optionsFor: Record<'eitherOr' | 'guess', QuestionOption[]> = {
  eitherOr: [
    { id: 'a', text: 'Option one' },
    { id: 'b', text: 'Option two' },
  ],
  guess: [
    { id: 'a', text: 'Answer one' },
    { id: 'b', text: 'Answer two' },
    { id: 'c', text: 'Answer three' },
  ],
};

function makeQuestion(
  format: PlayableFormat,
  category: CategoryId,
  number: number,
): PlayableQuestion {
  const shared = {
    id: `${format}-${category}-${number}`,
    category,
    topic: 't1',
    source: 'shipped',
  } as const;
  switch (format) {
    case 'ifYou':
    case 'neverHave':
      return { ...shared, format, text: `clause ${format} ${category} ${number}.` };
    case 'eitherOr':
      return { ...shared, format, options: optionsFor.eitherOr };
    case 'guess':
      return { ...shared, format, text: `Asked ${category} ${number}?`, options: optionsFor.guess };
  }
}

const allQuestions: Question[] = (['ifYou', 'neverHave', 'eitherOr', 'guess'] as const).flatMap(
  (format) =>
    categoryList.flatMap((category) =>
      [1, 2, 3, 4, 5, 6].map((number) => makeQuestion(format, category, number)),
    ),
);

const setupFor = (
  format: PlayableFormat,
  rest: Partial<QuestionRoundSetup> = {},
): QuestionRoundSetup => ({
  players,
  level: 'l1',
  enabledCategories: ['c1'],
  enabledFormats: [format],
  enabledTopics: ['t1'],
  length: 10,
  seed: 7,
  ...rest,
});

function StartRound({
  setup,
  questions,
  children,
}: {
  setup: QuestionRoundSetup;
  questions: readonly Question[];
  children: ReactNode;
}) {
  const { startNewRound } = useQuestionRound();
  useEffect(() => startNewRound(setup, questions), [startNewRound, setup, questions]);
  return children;
}

// The latest round the provider holds, so a test can read what the buttons did to it.
const latest: { round?: QuestionRoundState } = {};
function RoundProbe() {
  const { round } = useQuestionRound();
  useEffect(() => {
    latest.round = round;
  }, [round]);
  return null;
}

function renderPlay(setup: QuestionRoundSetup, questions: readonly Question[] = allQuestions) {
  return renderThemed(
    <QuestionRoundProvider>
      <StartRound setup={setup} questions={questions}>
        <RoundProbe />
        <QuestionsPlayScreen />
      </StartRound>
    </QuestionRoundProvider>,
  );
}

function renderWithoutRound() {
  return renderThemed(
    <QuestionRoundProvider>
      <RoundProbe />
      <QuestionsPlayScreen />
    </QuestionRoundProvider>,
  );
}

function currentView() {
  const current = latest.round?.current;
  if (!current) throw new Error('No question is in play');
  return current;
}

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const pressRadio = (group: string, name: string) =>
  fireEvent.press(within(screen.getByLabelText(group)).getByRole('radio', { name }));

const confirmEnding = () =>
  fireEvent.press(
    within(screen.getByLabelText(copy.roundPlay.endDialogTitle)).getByRole('button', {
      name: copy.roundPlay.endDialogConfirm,
    }),
  );

// The second pick of a would you rather question ignores presses for a moment, so a test that
// means a second pick waits it out first.
const waitOutPickGuard = () => act(() => jest.advanceTimersByTime(700));

const handoffTitle = (name: string) => fillCopy(copy.roundPlay.handoffTitle, { name });
const handoffLine = (name: string) => fillCopy(copy.roundPlay.handoffLine, { name });
const takeThePhone = () => press(copy.roundPlay.handoffButton);
const questionCount = (number: number, length: number) =>
  fillCopy(copy.questionsPlay.questionCount, { number, length });

/** Answers a statement question with the first player saying yes and the second saying no. */
function answerStatement(
  labels: { yes: string; no: string } = { yes: copy.questionsPlay.yes, no: copy.questionsPlay.no },
) {
  pressRadio(players[0], labels.yes);
  pressRadio(players[1], labels.no);
  press(copy.questionsPlay.showWhoDrinks);
}

/** Plays whole statement questions, from the handoff to the next question button. */
function playStatementQuestions(count: number) {
  for (let played = 0; played < count; played += 1) {
    if (screen.queryByRole('button', { name: copy.roundPlay.stepUpButton })) {
      press(copy.roundPlay.stepUpButton);
    }
    if (screen.queryByRole('button', { name: copy.roundPlay.handoffButton })) takeThePhone();
    answerStatement();
    press(copy.questionsPlay.nextQuestion);
  }
}

describe('QuestionsPlayScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
    mockPreventsRemove = false;
    mockOnRemovePrevented = undefined;
    latest.round = undefined;
  });

  describe('before the first question', () => {
    it('should ask for the phone to go to the first player before showing the question', async () => {
      await renderPlay(setupFor('ifYou'));

      expect(screen.getByRole('header', { name: handoffTitle('Player A') })).toBeOnTheScreen();
      expect(screen.queryByText(/clause ifYou/)).not.toBeOnTheScreen();
    });

    it('should not tell anyone to look away, because nobody held the phone before', async () => {
      await renderPlay(setupFor('ifYou'));

      expect(screen.queryByText(/Eyes off the screen/)).not.toBeOnTheScreen();
    });

    it('should show the question once the phone has been taken', async () => {
      await renderPlay(setupFor('ifYou'));

      takeThePhone();

      expect(screen.getByText(questionCount(1, 10))).toBeOnTheScreen();
      expect(
        screen.getByText(new RegExp(`${copy.questionLeads.ifYou} clause ifYou`)),
      ).toBeOnTheScreen();
    });

    it('should say there are no questions, and go back to setup, when the round has none', async () => {
      await renderPlay(setupFor('ifYou'), []);

      expect(screen.getByText(copy.questionsPlay.noQuestions)).toBeOnTheScreen();
      expect(mockReplace).not.toHaveBeenCalled();
      fireEvent.press(screen.getByRole('button', { name: copy.questionsPlay.backLabel }));
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should fall back to setup when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderPlay(setupFor('ifYou'), []);

      fireEvent.press(screen.getByRole('button', { name: copy.questionsPlay.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith(setupRoute);
    });

    it('should say there are no questions when there is no round at all', async () => {
      await renderWithoutRound();

      expect(screen.getByText(copy.questionsPlay.noQuestions)).toBeOnTheScreen();
    });
  });

  describe('the question card', () => {
    it('should show the count, a progress bar, the category and the topic', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();

      expect(screen.getByRole('progressbar', { name: questionCount(1, 10) })).toBeOnTheScreen();
      expect(screen.getByText(categoryNames.c1)).toBeOnTheScreen();
      expect(screen.getByText(topicNames.t1)).toBeOnTheScreen();
    });

    it('should show only the count for an endless round', async () => {
      await renderPlay(setupFor('ifYou', { length: 'endless' }));
      takeThePhone();

      expect(
        screen.getByText(fillCopy(copy.questionsPlay.questionCountEndless, { number: 1 })),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
    });

    it('should have Theo at the end of the turn line, hidden from screen readers', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();

      expect(drawnCharacters()).toEqual([
        {
          props: { character: 'shy', mood: 'idle', size: 'tile', crop: 'head' },
          isHiddenFromScreenReaders: true,
        },
      ]);
    });
  });

  describe('a drink if question', () => {
    it('should name the reader and the cost, and ask each player for yes or no', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();

      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.reads, { name: 'Player A' }),
        }),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.questionsPlay.penaltyIfYou, { penalty: 1 })),
      ).toBeOnTheScreen();
      expect(screen.getAllByRole('radio')).toHaveLength(4);
      expect(screen.getByRole('button', { name: copy.questionsPlay.showWhoDrinks })).toBeDisabled();
    });

    it('should send both answers and reveal who drinks and who is safe', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();

      answerStatement();

      expect(currentView().stage).toBe('revealed');
      expect(currentView().reveal).toEqual({
        kind: 'answers',
        answers: [true, false],
        drinks: [1, 0],
      });
      expect(
        screen.getByRole('group', { name: 'Player A, drinks 1. Player B, safe.' }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole('button', { name: copy.roundPlay.notThisOne }),
      ).not.toBeOnTheScreen();
    });

    it('should pass the phone to the other player for the next question', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();
      answerStatement();

      press(copy.questionsPlay.nextQuestion);

      expect(screen.getByRole('header', { name: handoffTitle('Player B') })).toBeOnTheScreen();
      expect(screen.getByText(handoffLine('Player A'))).toBeOnTheScreen();
      takeThePhone();
      expect(screen.getByText(questionCount(2, 10))).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.questionsPlay.showWhoDrinks })).toBeDisabled();
      expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
    });
  });

  describe('a never have I ever question', () => {
    it('should ask for I have or never, and reveal who drinks', async () => {
      await renderPlay(setupFor('neverHave'));
      takeThePhone();

      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.readAloud, { name: 'Player A' }),
        }),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.questionsPlay.penaltyNeverHave, { penalty: 1 })),
      ).toBeOnTheScreen();
      answerStatement({ yes: copy.questionsPlay.have, no: copy.questionsPlay.never });

      expect(currentView().reveal).toEqual({
        kind: 'answers',
        answers: [true, false],
        drinks: [1, 0],
      });
      expect(
        screen.getByRole('group', { name: 'Player A, drinks 1. Player B, safe.' }),
      ).toBeOnTheScreen();
    });
  });

  describe('a would you rather question', () => {
    it('should show both options and ask the holder to pick in private', async () => {
      await renderPlay(setupFor('eitherOr'));
      takeThePhone();

      expect(screen.getByRole('header', { name: 'Player A picks' })).toBeOnTheScreen();
      expect(screen.getByText(copy.questionLeads.eitherOr)).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Option one' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Option two' })).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.questionsPlay.pickPrivate, { partner: 'Player B' })),
      ).toBeOnTheScreen();
    });

    it('should lock the first pick in without showing which, and ask the other player', async () => {
      await renderPlay(setupFor('eitherOr'));
      takeThePhone();

      press('Option two');

      expect(currentView().stage).toBe('secondPick');
      expect(screen.getByRole('header', { name: 'Player B picks' })).toBeOnTheScreen();
      expect(screen.getByText(copy.questionsPlay.lockedChip)).toBeOnTheScreen();
      expect(
        screen.queryByText(fillCopy(copy.questionsPlay.pickPrivate, { partner: 'Player B' })),
      ).not.toBeOnTheScreen();
      // The options look exactly as they did before the pick, in the same order, with no state.
      const options = screen.getAllByRole('button', { name: /^Option / });
      expect(options.map((option) => option.props.accessibilityLabel)).toEqual([
        'Option one',
        'Option two',
      ]);
      options.forEach((option) => {
        expect(option).not.toBeSelected();
        expect(option.props.accessibilityState).toEqual({ disabled: false });
      });
    });

    it('should ignore a fast second press on the same option, then take a pick once the guard has passed', async () => {
      await renderPlay(setupFor('eitherOr'));
      takeThePhone();
      press('Option two');

      press('Option two');

      expect(currentView().stage).toBe('secondPick');
      waitOutPickGuard();
      press('Option two');
      expect(currentView().stage).toBe('revealed');
    });

    it('should guard the second pick of every question', async () => {
      await renderPlay(setupFor('eitherOr'));
      takeThePhone();
      press('Option one');
      waitOutPickGuard();
      press('Option one');
      press(copy.questionsPlay.nextQuestion);
      takeThePhone();
      press('Option one');

      press('Option one');

      expect(currentView().stage).toBe('secondPick');
    });

    it('should reveal a match, with both names on the shared option and nobody drinking', async () => {
      await renderPlay(setupFor('eitherOr'));
      takeThePhone();
      press('Option two');
      waitOutPickGuard();

      press('Option two');

      expect(currentView().reveal).toEqual(
        expect.objectContaining({ kind: 'picks', matched: true }),
      );
      expect(screen.getByRole('header', { name: copy.questionsPlay.matchLine })).toBeOnTheScreen();
      expect(
        screen.getByText(
          fillCopy(copy.questionsPlay.bothNames, { first: 'Player A', second: 'Player B' }),
        ),
      ).toBeOnTheScreen();
    });

    it('should reveal what each player picked, and that both drink, when they differ', async () => {
      await renderPlay(setupFor('eitherOr'));
      takeThePhone();
      press('Option one');
      waitOutPickGuard();

      press('Option two');

      expect(currentView().reveal).toEqual(
        expect.objectContaining({ kind: 'picks', matched: false }),
      );
      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.noMatchLine, { penalty: 1 }),
        }),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByRole('group', { name: /Option one/ })).getByText('Player A'),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByRole('group', { name: /Option two/ })).getByText('Player B'),
      ).toBeOnTheScreen();
    });

    it('should say what both drink in a category that costs more than one', async () => {
      await renderPlay(setupFor('eitherOr', { level: 'l2', enabledCategories: ['c2'] }));
      takeThePhone();
      press('Option one');
      waitOutPickGuard();

      press('Option two');

      expect(currentView().reveal).toEqual(expect.objectContaining({ drinks: [2, 2] }));
      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.noMatchLine, { penalty: 2 }),
        }),
      ).toBeOnTheScreen();
    });

    it('should show the next question with no sign of the earlier picks', async () => {
      await renderPlay(setupFor('eitherOr'));
      takeThePhone();
      press('Option one');
      waitOutPickGuard();
      press('Option two');

      press(copy.questionsPlay.nextQuestion);
      takeThePhone();

      expect(screen.getByRole('header', { name: 'Player B picks' })).toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsPlay.lockedChip)).not.toBeOnTheScreen();
      expect(screen.queryByText('Player A')).not.toBeOnTheScreen();
      screen.getAllByRole('button', { name: /^Option / }).forEach((option) => {
        expect(option.props.accessibilityState).toEqual({ disabled: false });
      });
    });

    it('should never show the first pick after Not this one replaces the question', async () => {
      await renderPlay(setupFor('eitherOr'));
      takeThePhone();
      const firstQuestionId = currentView().question.id;
      press('Option one');
      expect(screen.getByText(copy.questionsPlay.lockedChip)).toBeOnTheScreen();

      press(copy.roundPlay.notThisOne);
      press(copy.questionsPlay.skipTitle);

      expect(currentView().question.id).not.toBe(firstQuestionId);
      expect(currentView().stage).toBe('answering');
      expect(screen.getByRole('header', { name: 'Player A picks' })).toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsPlay.lockedChip)).not.toBeOnTheScreen();
      screen.getAllByRole('button', { name: /^Option / }).forEach((option) => {
        expect(option).not.toBeSelected();
        expect(option.props.accessibilityState).toEqual({ disabled: false });
      });
    });
  });

  describe('a guess your partner question', () => {
    it('should ask the holder to answer, and say that only they look', async () => {
      await renderPlay(setupFor('guess'));
      takeThePhone();

      expect(screen.getByRole('header', { name: 'Player A answers' })).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.questionsPlay.onlyLooks, { name: 'Player A' })),
      ).toBeOnTheScreen();
      expect(screen.getAllByRole('button', { name: /^Answer / })).toHaveLength(3);
      expect(
        screen.getByText(
          fillCopy(copy.questionsPlay.penaltyGuess, { name: 'Player B', penalty: 1 }),
        ),
      ).toBeOnTheScreen();
    });

    it('should pass the phone to the guesser, with the guess line and no look away box', async () => {
      await renderPlay(setupFor('guess'));
      takeThePhone();

      press('Answer two');

      expect(screen.getByRole('header', { name: handoffTitle('Player B') })).toBeOnTheScreen();
      expect(
        screen.getByText(
          fillCopy(copy.questionsPlay.guessHandoffLine, { name: 'Player B', partner: 'Player A' }),
        ),
      ).toBeOnTheScreen();
      expect(screen.queryByText(handoffLine('Player A'))).not.toBeOnTheScreen();
      expect(screen.queryByText('Answer two')).not.toBeOnTheScreen();
    });

    it('should ask the guesser what the holder picked, with nothing showing the answer', async () => {
      await renderPlay(setupFor('guess'));
      takeThePhone();
      press('Answer two');

      takeThePhone();

      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.guessTitle, { name: 'Player A' }),
        }),
      ).toBeOnTheScreen();
      const answers = screen.getAllByRole('button', { name: /^Answer / });
      expect(answers.map((answer) => answer.props.accessibilityLabel)).toEqual([
        'Answer one',
        'Answer two',
        'Answer three',
      ]);
      answers.forEach((answer) => {
        expect(answer).not.toBeSelected();
        expect(answer.props.accessibilityState).toEqual({ disabled: false });
      });
      expect(screen.queryByText(copy.questionsPlay.lockedChip)).not.toBeOnTheScreen();
    });

    it('should reveal a right guess with the answer and the guess on one option, and a point', async () => {
      await renderPlay(setupFor('guess'));
      takeThePhone();
      press('Answer two');
      takeThePhone();

      press('Answer two');

      expect(currentView().reveal).toEqual(
        expect.objectContaining({ kind: 'guess', correct: true }),
      );
      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.rightLine, { name: 'Player B' }),
        }),
      ).toBeOnTheScreen();
      const card = within(screen.getByRole('group', { name: /Answer two/ }));
      expect(
        card.getByText(fillCopy(copy.questionsPlay.answerChip, { name: 'Player A' })),
      ).toBeOnTheScreen();
      expect(
        card.getByText(fillCopy(copy.questionsPlay.guessChip, { name: 'Player B' })),
      ).toBeOnTheScreen();
    });

    it('should reveal a wrong guess, with the right answer marked and the guesser drinking', async () => {
      await renderPlay(setupFor('guess'));
      takeThePhone();
      press('Answer two');
      takeThePhone();

      press('Answer three');

      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.wrongLine, { name: 'Player B', penalty: 1 }),
        }),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByRole('group', { name: /Answer two/ })).getByText(
          fillCopy(copy.questionsPlay.answerChip, { name: 'Player A' }),
        ),
      ).toBeOnTheScreen();
      expect(
        within(screen.getByRole('group', { name: /Answer three/ })).getByText(
          fillCopy(copy.questionsPlay.guessChip, { name: 'Player B' }),
        ),
      ).toBeOnTheScreen();
    });

    it('should never show the answer after Not this one replaces the question the guesser is on', async () => {
      await renderPlay(setupFor('guess'));
      takeThePhone();
      press('Answer two');
      takeThePhone();
      const answeredQuestionId = currentView().question.id;

      press(copy.roundPlay.notThisOne);
      press(copy.questionsPlay.skipTitle);

      expect(currentView().question.id).not.toBe(answeredQuestionId);
      expect(screen.getByRole('header', { name: 'Player A answers' })).toBeOnTheScreen();
      screen.getAllByRole('button', { name: /^Answer / }).forEach((answer) => {
        expect(answer).not.toBeSelected();
        expect(answer.props.accessibilityState).toEqual({ disabled: false });
      });
    });

    it('should pass the phone to the guesser again for the replacement question', async () => {
      await renderPlay(setupFor('guess'));
      takeThePhone();
      press('Answer two');
      takeThePhone();
      press(copy.roundPlay.notThisOne);
      press(copy.questionsPlay.skipTitle);

      press('Answer one');

      expect(screen.getByRole('header', { name: handoffTitle('Player B') })).toBeOnTheScreen();
    });
  });

  describe('stepping up a category', () => {
    const climb = setupFor('ifYou', { level: 'l2', enabledCategories: ['c1', 'c2'] });

    it('should announce the new category with Theo happy, and what a drink now costs', async () => {
      await renderPlay(climb);
      takeThePhone();
      playStatementQuestions(5);

      expect(screen.getByRole('header', { name: copy.roundPlay.stepUpTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.questionsPlay.stepUpLine)).toBeOnTheScreen();
      expect(screen.getByText(categoryNames.c2)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.questionsPlay.stepUpCost, { penalty: 2 })),
      ).toBeOnTheScreen();
      expect(drawnCharacters()).toEqual([
        {
          props: { character: 'shy', mood: 'happy', size: 'hero' },
          isHiddenFromScreenReaders: true,
        },
      ]);
    });

    it('should pass the phone after Bring it when the holder changes, then show the question', async () => {
      await renderPlay(climb);
      takeThePhone();
      playStatementQuestions(5);

      press(copy.roundPlay.stepUpButton);

      expect(screen.getByRole('header', { name: handoffTitle('Player B') })).toBeOnTheScreen();
      takeThePhone();
      expect(screen.getByText(questionCount(6, 10))).toBeOnTheScreen();
    });

    it('should have Theo flustered, with his bold line, for a bold category', async () => {
      await renderPlay(setupFor('ifYou', { level: 'l3', enabledCategories: ['c2', 'c3'] }));
      takeThePhone();
      playStatementQuestions(5);

      expect(screen.getByText(copy.questionsPlay.stepUpLineBold)).toBeOnTheScreen();
      expect(drawnCharacters()[0]?.props).toEqual(
        expect.objectContaining({ character: 'shy', mood: 'flustered' }),
      );
    });

    it('should not step up on the first question', async () => {
      await renderPlay(setupFor('ifYou', { level: 'l2', enabledCategories: ['c2'] }));

      expect(
        screen.queryByRole('header', { name: copy.roundPlay.stepUpTitle }),
      ).not.toBeOnTheScreen();
    });
  });

  describe('ending the round', () => {
    it('should open the dialog from the End round pill, and keep playing from it', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();

      press(copy.roundPlay.endRound);
      expect(screen.getByRole('header', { name: copy.roundPlay.endDialogTitle })).toBeOnTheScreen();
      press(copy.roundPlay.endDialogCancel);

      expect(latest.round?.current).not.toBeNull();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should end the round and go to the summary when it is confirmed', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();
      press(copy.roundPlay.endRound);

      confirmEnding();

      expect(latest.round?.current).toBeNull();
      expect(mockReplace).toHaveBeenCalledWith(summaryRoute);
    });

    it('should keep a question that was revealed when the round ends on it', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();
      answerStatement();

      press(copy.roundPlay.endRound);
      confirmEnding();

      expect(latest.round?.history).toHaveLength(1);
    });

    it('should go to the summary on its own when the last question is done', async () => {
      await renderPlay(setupFor('ifYou'), [
        makeQuestion('ifYou', 'c1', 1),
        makeQuestion('ifYou', 'c1', 2),
      ]);
      takeThePhone();
      playStatementQuestions(2);

      expect(mockReplace).toHaveBeenCalledWith(summaryRoute);
    });

    it('should hold back going back while a question is in play, and open the dialog instead', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();

      expect(mockPreventsRemove).toBe(true);
      act(() => mockOnRemovePrevented?.());

      expect(screen.getByRole('header', { name: copy.roundPlay.endDialogTitle })).toBeOnTheScreen();
    });

    it('should hold back going back on the pass the phone screen too', async () => {
      await renderPlay(setupFor('ifYou'));

      expect(mockPreventsRemove).toBe(true);
    });

    it('should let go of going back once the round is over', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();
      press(copy.roundPlay.endRound);
      confirmEnding();

      expect(mockPreventsRemove).toBe(false);
    });
  });

  describe('Not this one', () => {
    it('should open the sheet with the question wording for the skip row', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();

      press(copy.roundPlay.notThisOne);

      expect(screen.getByRole('header', { name: copy.roundPlay.sheetTitle })).toBeOnTheScreen();
      expect(screen.getByText(copy.questionsPlay.skipBody)).toBeOnTheScreen();
      expect(screen.queryByText(copy.roundPlay.skipTitle)).not.toBeOnTheScreen();
    });

    it('should draw a new question for the same player with no phone to pass, and close the sheet', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();
      const skippedId = currentView().question.id;

      press(copy.roundPlay.notThisOne);
      press(copy.questionsPlay.skipTitle);

      expect(currentView().question.id).not.toBe(skippedId);
      expect(latest.round?.history).toHaveLength(0);
      expect(
        screen.queryByRole('header', { name: copy.roundPlay.sheetTitle }),
      ).not.toBeOnTheScreen();
      expect(screen.getByText(questionCount(1, 10))).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: /Pass the phone/ })).not.toBeOnTheScreen();
    });

    it('should clear the answers already given when the question is replaced', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();
      pressRadio(players[0], copy.questionsPlay.yes);
      pressRadio(players[1], copy.questionsPlay.no);

      press(copy.roundPlay.notThisOne);
      press(copy.questionsPlay.skipTitle);

      expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
      expect(screen.getByRole('button', { name: copy.questionsPlay.showWhoDrinks })).toBeDisabled();
    });

    it('should show a replacement from a higher category with no step up screen', async () => {
      // The lower category has two questions. The second is skipped, so nothing is left there and
      // the replacement comes from the category above, which the engine flags as a step up.
      const questions = [
        makeQuestion('ifYou', 'c1', 1),
        makeQuestion('ifYou', 'c1', 2),
        ...[1, 2, 3].map((number) => makeQuestion('ifYou', 'c2', number)),
      ];
      await renderPlay(
        setupFor('ifYou', { level: 'l2', enabledCategories: ['c1', 'c2'] }),
        questions,
      );
      takeThePhone();
      answerStatement();
      press(copy.questionsPlay.nextQuestion);
      takeThePhone();
      expect(currentView().question.category).toBe('c1');

      press(copy.roundPlay.notThisOne);
      press(copy.questionsPlay.skipTitle);

      expect(currentView().question.category).toBe('c2');
      expect(currentView().steppingUp).toBe(true);
      expect(
        screen.queryByRole('header', { name: copy.roundPlay.stepUpTitle }),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: copy.questionsPlay.showWhoDrinks }),
      ).toBeOnTheScreen();
    });

    it('should switch a category off from the sheet and keep the sheet open', async () => {
      await renderPlay(setupFor('ifYou', { level: 'l2', enabledCategories: ['c1', 'c2'] }));
      takeThePhone();
      press(copy.roundPlay.notThisOne);

      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      expect(latest.round?.enabled).toEqual(['c1']);
      expect(screen.getByRole('header', { name: copy.roundPlay.sheetTitle })).toBeOnTheScreen();
    });

    it('should close the sheet, not open the dialog, when going back while it is open', async () => {
      await renderPlay(setupFor('ifYou'));
      takeThePhone();
      press(copy.roundPlay.notThisOne);

      act(() => mockOnRemovePrevented?.());

      expect(
        screen.queryByRole('header', { name: copy.roundPlay.sheetTitle }),
      ).not.toBeOnTheScreen();
      expect(
        screen.queryByRole('header', { name: copy.roundPlay.endDialogTitle }),
      ).not.toBeOnTheScreen();
    });

    it.each(['ifYou', 'eitherOr', 'guess'] as const)(
      'should offer Not this one on a %s question',
      async (format) => {
        await renderPlay(setupFor(format));
        takeThePhone();

        expect(screen.getByRole('button', { name: copy.roundPlay.notThisOne })).toBeOnTheScreen();
      },
    );
  });
});
