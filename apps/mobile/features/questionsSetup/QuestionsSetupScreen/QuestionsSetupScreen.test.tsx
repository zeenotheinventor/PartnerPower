import {
  categoryNames,
  copy,
  fillCopy,
  levelNames,
  questionFormatNames,
  topicNames,
} from '@getfreak/content';
import { startQuestionRound, type Question, type QuestionDeck, type TopicId } from '@getfreak/core';
import { act, waitFor } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { KeyboardAvoidingView } from 'react-native';
import type { ReactNode } from 'react';

import { createInMemoryBackend } from '../../../storage/createInMemoryBackend';
import { createStorage } from '../../../storage/createStorage';
import type { Storage } from '../../../storage';
import { SettingsProvider, useSettings } from '../../../settings';
import { renderThemed } from '../../../tailwind/renderThemed';
import { QuestionRoundProvider } from '../../questionRound/QuestionRoundProvider';
import { QuestionsSetupScreen } from './QuestionsSetupScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

const mockQuestionDecks: QuestionDeck[] = [];
// The decks are read when they are used, because this factory runs before the array above exists.
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return Object.defineProperty({ ...actual }, 'questionDecks', {
    get: () => mockQuestionDecks,
    enumerable: true,
  });
});

jest.mock('@getfreak/core', () => {
  const actual = jest.requireActual<typeof import('@getfreak/core')>('@getfreak/core');
  return { ...actual, startQuestionRound: jest.fn(actual.startQuestionRound) };
});

function statements(
  format: 'ifYou' | 'neverHave',
  count: number,
  topic: TopicId = 't1',
): Question[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `${format}-${topic}-${index}`,
    format,
    category: 'c1',
    topic,
    source: 'shipped',
    text: `Question ${index}`,
  }));
}

// Twelve of each of two formats, so 24 fit the default choices and 12 fit once one format is off.
const ifYouQuestions = statements('ifYou', 12);
const neverHaveQuestions = statements('neverHave', 12);

// The seed the screen builds from a random source that always gives one half.
const seedFromHalf = 2147483648;

const formatKeys = ['ifYou', 'neverHave', 'guess', 'eitherOr'] as const;
const topicKeys = ['t1', 't2', 't3', 't4', 't5', 't6'] as const;

// The screen reads the remembered names when it first renders, and the app only renders it once the
// settings have loaded, so the test does the same.
function AfterSettingsLoad({ children }: { children: ReactNode }) {
  return useSettings().isLoading ? null : children;
}

async function renderSetup(storage: Storage = createStorage(createInMemoryBackend())) {
  await renderThemed(
    <SettingsProvider storage={storage}>
      <AfterSettingsLoad>
        <QuestionRoundProvider>
          <QuestionsSetupScreen />
        </QuestionRoundProvider>
      </AfterSettingsLoad>
    </SettingsProvider>,
  );
  await screen.findByRole('header', { name: copy.questionsSetup.title });
}

function enterNames(first: string, second: string) {
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), first);
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), second);
}

const startButton = () => screen.getByRole('button', { name: copy.questionsSetup.start });

// Saving the names finishes after the press, so the test waits for that to settle.
async function pressStart() {
  fireEvent.press(startButton());
  await act(async () => {});
}

const pressSwitch = (name: string) => fireEvent.press(screen.getByRole('switch', { name }));

function switchEveryFormatOffExcept(keptFormat: (typeof formatKeys)[number]) {
  formatKeys
    .filter((format) => format !== keptFormat)
    .forEach((format) => pressSwitch(questionFormatNames[format]));
}

function switchEveryTopicOffExcept(keptTopic: (typeof topicKeys)[number]) {
  topicKeys
    .filter((topic) => topic !== keptTopic)
    .forEach((topic) => pressSwitch(topicNames[topic]));
}

const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;

describe('QuestionsSetupScreen', () => {
  beforeEach(() => {
    mockQuestionDecks.splice(0, mockQuestionDecks.length, {
      id: 'test-deck',
      version: 1,
      questions: [...ifYouQuestions, ...neverHaveQuestions],
    });
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    jest.mocked(startQuestionRound).mockClear();
    mockCanGoBack = true;
  });

  describe('the screen', () => {
    it('should show the title as the heading', async () => {
      await renderSetup();

      expect(screen.getByRole('header', { name: copy.questionsSetup.title })).toBeOnTheScreen();
    });

    it('should go back from the back button', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('button', { name: copy.questionsSetup.backLabel }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should fall back to the home when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderSetup();

      fireEvent.press(screen.getByRole('button', { name: copy.questionsSetup.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith('/games/questions');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should move its content out of the way of the keyboard', async () => {
      await renderSetup();

      // React Native has no role or label to find this view by, so it is found by its type.
      expect(screen.UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
    });
  });

  describe('the names', () => {
    it('should have a labelled field for each player, limited to 20 characters', async () => {
      await renderSetup();

      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveProp('maxLength', 20);
      expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveProp('maxLength', 20);
    });

    it('should be filled with the remembered names', async () => {
      const backend = createInMemoryBackend();
      backend.entries.set('playerNames', JSON.stringify(['Remembered A', 'Remembered B']));
      await renderSetup(createStorage(backend));

      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveDisplayValue(
        'Remembered A',
      );
      expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveDisplayValue(
        'Remembered B',
      );
    });

    it('should trim and cap remembered names to what the fields allow', async () => {
      const backend = createInMemoryBackend();
      backend.entries.set('playerNames', JSON.stringify(['  Player A  ', 'B'.repeat(30)]));
      await renderSetup(createStorage(backend));

      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveDisplayValue('Player A');
      expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveDisplayValue(
        'B'.repeat(20),
      );
    });
  });

  describe('the Start button', () => {
    it('should be disabled until both names are entered', async () => {
      await renderSetup();
      expect(
        screen.getByRole('button', { name: copy.questionsSetup.start, disabled: true }),
      ).toBeTruthy();

      enterNames('Player A', '   ');
      expect(
        screen.getByRole('button', { name: copy.questionsSetup.start, disabled: true }),
      ).toBeTruthy();

      enterNames('Player A', 'Player B');
      expect(
        screen.getByRole('button', { name: copy.questionsSetup.start, disabled: false }),
      ).toBeTruthy();
    });

    it('should not start a round when it is pressed while disabled', async () => {
      await renderSetup();
      enterNames('Player A', '  ');

      fireEvent.press(startButton());

      expect(startQuestionRound).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('the level and categories', () => {
    it('should offer the three levels by name, with the second checked', async () => {
      await renderSetup();

      expect(screen.getByRole('radio', { name: levelNames.l1, checked: false })).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: levelNames.l2, checked: true })).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: levelNames.l3, checked: false })).toBeOnTheScreen();
    });

    it('should show the two mildest categories, both on, for the second level', async () => {
      await renderSetup();

      expect(
        screen.getByRole('switch', { name: categoryNames.c1, checked: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('switch', { name: categoryNames.c2, checked: true }),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('switch', { name: categoryNames.c3 })).not.toBeOnTheScreen();
    });

    it('should show all four categories for the third level', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('radio', { name: levelNames.l3 }));

      [categoryNames.c1, categoryNames.c2, categoryNames.c3, categoryNames.c4].forEach((name) =>
        expect(screen.getByRole('switch', { name, checked: true })).toBeOnTheScreen(),
      );
    });

    it('should lock the last category that is on and say why', async () => {
      await renderSetup();

      pressSwitch(categoryNames.c2);

      expect(
        screen.getByRole('switch', { name: categoryNames.c1, checked: true, disabled: true }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: categoryNames.c1 })).toHaveProp(
        'accessibilityHint',
        copy.roundSetup.lastCategoryHint,
      );
      expect(screen.getByText(copy.roundSetup.lastCategoryHint)).toBeOnTheScreen();
    });
  });

  describe('the formats', () => {
    it('should offer the four formats by name, all on and none locked', async () => {
      await renderSetup();

      formatKeys.forEach((format) =>
        expect(
          screen.getByRole('switch', {
            name: questionFormatNames[format],
            checked: true,
            disabled: false,
          }),
        ).toBeOnTheScreen(),
      );
    });

    it('should not offer the secret match, which has its own session', async () => {
      await renderSetup();

      expect(
        screen.queryByRole('switch', { name: questionFormatNames.secretMatch }),
      ).not.toBeOnTheScreen();
    });

    it('should show the formats under their own label', async () => {
      await renderSetup();

      expect(screen.getByText(copy.questionsSetup.formatsLabel)).toBeOnTheScreen();
    });

    it('should switch a format off and on again', async () => {
      await renderSetup();

      pressSwitch(questionFormatNames.guess);
      expect(
        screen.getByRole('switch', { name: questionFormatNames.guess, checked: false }),
      ).toBeOnTheScreen();

      pressSwitch(questionFormatNames.guess);
      expect(
        screen.getByRole('switch', { name: questionFormatNames.guess, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should not show the hint while more than one format is on', async () => {
      await renderSetup();

      expect(screen.queryByText(copy.questionsSetup.lastFormatHint)).not.toBeOnTheScreen();
    });

    it('should lock the last format that is on and say why', async () => {
      await renderSetup();

      switchEveryFormatOffExcept('eitherOr');

      const lastFormat = screen.getByRole('switch', {
        name: questionFormatNames.eitherOr,
        checked: true,
        disabled: true,
      });
      expect(lastFormat).toHaveProp('accessibilityHint', copy.questionsSetup.lastFormatHint);
      expect(screen.getByText(copy.questionsSetup.lastFormatHint)).toBeOnTheScreen();
    });

    it('should not switch the last format off', async () => {
      await renderSetup();
      switchEveryFormatOffExcept('eitherOr');

      pressSwitch(questionFormatNames.eitherOr);

      expect(
        screen.getByRole('switch', { name: questionFormatNames.eitherOr, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should unlock the format again when another is switched on', async () => {
      await renderSetup();
      switchEveryFormatOffExcept('eitherOr');

      pressSwitch(questionFormatNames.ifYou);

      expect(
        screen.getByRole('switch', { name: questionFormatNames.eitherOr, disabled: false }),
      ).toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsSetup.lastFormatHint)).not.toBeOnTheScreen();
    });
  });

  describe('the topics', () => {
    it('should offer the six topics by name, all on and none locked', async () => {
      await renderSetup();

      topicKeys.forEach((topic) =>
        expect(
          screen.getByRole('switch', { name: topicNames[topic], checked: true, disabled: false }),
        ).toBeOnTheScreen(),
      );
    });

    it('should show the topics under their own label', async () => {
      await renderSetup();

      expect(screen.getByText(copy.questionsSetup.topicsLabel)).toBeOnTheScreen();
    });

    it('should switch a topic off and on again', async () => {
      await renderSetup();

      pressSwitch(topicNames.t4);
      expect(screen.getByRole('switch', { name: topicNames.t4, checked: false })).toBeOnTheScreen();

      pressSwitch(topicNames.t4);
      expect(screen.getByRole('switch', { name: topicNames.t4, checked: true })).toBeOnTheScreen();
    });

    it('should not show the hint while more than one topic is on', async () => {
      await renderSetup();

      expect(screen.queryByText(copy.questionsSetup.lastTopicHint)).not.toBeOnTheScreen();
    });

    it('should lock the last topic that is on and say why', async () => {
      await renderSetup();

      switchEveryTopicOffExcept('t3');

      const lastTopic = screen.getByRole('switch', {
        name: topicNames.t3,
        checked: true,
        disabled: true,
      });
      expect(lastTopic).toHaveProp('accessibilityHint', copy.questionsSetup.lastTopicHint);
      expect(screen.getByText(copy.questionsSetup.lastTopicHint)).toBeOnTheScreen();
    });

    it('should not switch the last topic off', async () => {
      await renderSetup();
      switchEveryTopicOffExcept('t3');

      pressSwitch(topicNames.t3);

      expect(screen.getByRole('switch', { name: topicNames.t3, checked: true })).toBeOnTheScreen();
    });
  });

  describe('the length', () => {
    it('should offer 10, 20 and endless, with 20 checked', async () => {
      await renderSetup();

      expect(
        screen.getByRole('radio', { name: copy.questionsSetup.lengthTen, checked: false }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('radio', { name: copy.questionsSetup.lengthTwenty, checked: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('radio', { name: copy.questionsSetup.lengthEndless, checked: false }),
      ).toBeOnTheScreen();
    });

    it('should check the length that is pressed', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('radio', { name: copy.questionsSetup.lengthTen }));

      expect(
        screen.getByRole('radio', { name: copy.questionsSetup.lengthTen, checked: true }),
      ).toBeOnTheScreen();
    });
  });

  describe('the message about too few questions', () => {
    const tooFewMessage = (count: number) => fillCopy(copy.questionsSetup.tooFew, { count });

    it('should not show when the choices leave enough questions for the round', async () => {
      await renderSetup();

      expect(screen.queryByText(/^Only /)).not.toBeOnTheScreen();
    });

    it('should show how many questions fit when fewer than the length are left', async () => {
      await renderSetup();

      pressSwitch(questionFormatNames.neverHave);

      expect(screen.getByText(tooFewMessage(12))).toBeOnTheScreen();
    });

    it('should count the questions of the level that is chosen', async () => {
      await renderSetup();

      pressSwitch(categoryNames.c1);

      expect(screen.getByText(tooFewMessage(0))).toBeOnTheScreen();
    });

    it('should count only the topics that are on', async () => {
      await renderSetup();

      pressSwitch(topicNames.t1);

      expect(screen.getByText(tooFewMessage(0))).toBeOnTheScreen();
    });

    it('should go away when the length is shortened to fit', async () => {
      await renderSetup();
      pressSwitch(questionFormatNames.neverHave);

      fireEvent.press(screen.getByRole('radio', { name: copy.questionsSetup.lengthTen }));

      expect(screen.queryByText(tooFewMessage(12))).not.toBeOnTheScreen();
    });

    it('should not show for an endless round', async () => {
      await renderSetup();
      pressSwitch(questionFormatNames.neverHave);

      fireEvent.press(screen.getByRole('radio', { name: copy.questionsSetup.lengthEndless }));

      expect(screen.queryByText(tooFewMessage(12))).not.toBeOnTheScreen();
    });

    it('should leave Start enabled', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');

      pressSwitch(questionFormatNames.neverHave);

      expect(screen.getByText(tooFewMessage(12))).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: copy.questionsSetup.start, disabled: false }),
      ).toBeTruthy();
    });
  });

  describe('starting the round', () => {
    it('should start a round with the default choices and open the round screen', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(startQuestionRound).toHaveBeenCalledTimes(1);
      expect(startQuestionRound).toHaveBeenCalledWith(
        {
          players: ['Player A', 'Player B'],
          level: 'l2',
          enabledCategories: ['c1', 'c2'],
          enabledFormats: ['ifYou', 'neverHave', 'guess', 'eitherOr'],
          enabledTopics: ['t1', 't2', 't3', 't4', 't5', 't6'],
          length: 20,
          seed: seedFromHalf,
        },
        [...ifYouQuestions, ...neverHaveQuestions],
      );
      expect(mockPush).toHaveBeenCalledWith('/games/questions/play');
    });

    it('should start the round with the choices that were made', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');
      fireEvent.press(screen.getByRole('radio', { name: levelNames.l3 }));
      pressSwitch(categoryNames.c2);
      pressSwitch(questionFormatNames.guess);
      pressSwitch(topicNames.t5);
      fireEvent.press(screen.getByRole('radio', { name: copy.questionsSetup.lengthEndless }));

      await pressStart();

      expect(startQuestionRound).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'l3',
          enabledCategories: ['c1', 'c3', 'c4'],
          enabledFormats: ['ifYou', 'neverHave', 'eitherOr'],
          enabledTopics: ['t1', 't2', 't3', 't4', 't6'],
          length: 'endless',
        }),
        expect.anything(),
      );
    });

    it('should start the round with the names trimmed', async () => {
      await renderSetup();
      enterNames('  Player A ', ' Player B  ');

      await pressStart();

      expect(startQuestionRound).toHaveBeenCalledWith(
        expect.objectContaining({ players: ['Player A', 'Player B'] }),
        expect.anything(),
      );
    });

    it('should start the round with the questions of every shipped deck', async () => {
      mockQuestionDecks.splice(0, mockQuestionDecks.length, mockQuestionDeck('first', 2), {
        ...mockQuestionDeck('second', 1),
      });
      await renderSetup();
      enterNames('Player A', 'Player B');

      await pressStart();

      const questions = jest.mocked(startQuestionRound).mock.calls[0]?.[1] ?? [];
      expect(questions.map((question) => question.id)).toEqual(['first-0', 'first-1', 'second-0']);
    });

    it('should still start, with no questions, while none ship', async () => {
      mockQuestionDecks.splice(0, mockQuestionDecks.length);
      await renderSetup();
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(jest.mocked(startQuestionRound).mock.calls[0]?.[1]).toEqual([]);
      expect(mockPush).toHaveBeenCalledWith('/games/questions/play');
    });

    it('should start one round and open one round screen when Start is pressed twice', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');

      fireEvent.press(startButton());
      fireEvent.press(startButton());
      await act(async () => {});

      expect(startQuestionRound).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('should save the trimmed names for next time', async () => {
      const backend = createInMemoryBackend();
      await renderSetup(createStorage(backend));
      enterNames(' Player A ', 'Player B');

      await pressStart();

      await waitFor(() =>
        expect(backend.entries.get('playerNames')).toBe(JSON.stringify(['Player A', 'Player B'])),
      );
    });

    it('should not save the format, topic or length choices', async () => {
      const backend = createInMemoryBackend();
      await renderSetup(createStorage(backend));
      enterNames('Player A', 'Player B');
      pressSwitch(topicNames.t2);

      await pressStart();

      await waitFor(() => expect(backend.entries.has('playerNames')).toBe(true));
      expect([...backend.entries.keys()]).toEqual(['playerNames']);
    });

    it('should still start the round when the names cannot be saved', async () => {
      const failingStorage: Storage = {
        ...createStorage(createInMemoryBackend()),
        set: () => Promise.reject(new Error('The write failed')),
      };
      await renderSetup(failingStorage);
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(startQuestionRound).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/games/questions/play');
    });

    it('should log nothing', async () => {
      const consoleSpies = consoleMethods.map((method) => jest.spyOn(console, method));
      await renderSetup();
      enterNames('Player A', 'Player B');

      await pressStart();

      consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    });
  });
});

function mockQuestionDeck(id: string, count: number): QuestionDeck {
  return {
    id,
    version: 1,
    questions: Array.from({ length: count }, (_unused, index) => ({
      id: `${id}-${index}`,
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      source: 'shipped',
      text: `Question ${index}`,
    })),
  };
}
