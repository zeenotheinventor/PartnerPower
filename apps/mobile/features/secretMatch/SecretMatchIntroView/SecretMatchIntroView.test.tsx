import { copy, levelNames, topicNames } from '@getfreak/content';
import type { Discovery, QuestionDeck } from '@getfreak/core';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import type { ReactNode } from 'react';

import { SettingsProvider, useSettings } from '../../../settings';
import type { Storage } from '../../../storage';
import { createInMemoryBackend } from '../../../storage/createInMemoryBackend';
import { createStorage } from '../../../storage/createStorage';
import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { makeSecretMatchQuestions } from '../testing/secretMatchFixtures';
import { SecretMatchIntroView } from './SecretMatchIntroView';

const mockStart = jest.fn();
jest.mock('../SecretMatchProvider', () => ({
  useSecretMatch: () => ({ start: mockStart }),
}));

let mockDiscoveries: Discovery[] = [];
jest.mock('../../../personal', () => ({
  useDiscoveries: () => ({ discoveries: mockDiscoveries }),
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

const topicKeys = ['t1', 't2', 't3', 't4', 't5', 't6'] as const;
const onBack = jest.fn();

// Level two uses the two mildest categories. Topic one has plenty, topic two a few, and topic six
// has fewer than the three that a session needs.
const items = [
  ...makeSecretMatchQuestions(['c1', 'c2'], 8, 't1'),
  ...makeSecretMatchQuestions(['c1'], 4, 't2').map((question) => ({
    ...question,
    id: `${question.id}-topic-two`,
  })),
  ...makeSecretMatchQuestions(['c1'], 2, 't6').map((question) => ({
    ...question,
    id: `${question.id}-topic-six`,
  })),
];

// The view reads the remembered names when it first renders, and the app only renders it once the
// settings have loaded, so the test does the same.
function AfterSettingsLoad({ children }: { children: ReactNode }) {
  return useSettings().isLoading ? null : children;
}

async function renderIntro(storage: Storage = createStorage(createInMemoryBackend())) {
  await renderThemed(
    <SettingsProvider storage={storage}>
      <AfterSettingsLoad>
        <SecretMatchIntroView onBack={onBack} />
      </AfterSettingsLoad>
    </SettingsProvider>,
  );
  await screen.findByRole('header', { name: copy.secretMatch.title });
}

function enterNames(first: string, second: string) {
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), first);
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), second);
}

const startButton = () => screen.getByRole('button', { name: copy.secretMatch.start });
const pressSwitch = (name: string) => fireEvent.press(screen.getByRole('switch', { name }));

function switchEveryTopicOffExcept(keptTopic: (typeof topicKeys)[number]) {
  topicKeys
    .filter((topic) => topic !== keptTopic)
    .forEach((topic) => pressSwitch(topicNames[topic]));
}

// Saving the names finishes after the press, so the test waits for that to settle.
async function pressStart() {
  fireEvent.press(startButton());
  await act(async () => {});
}

describe('SecretMatchIntroView', () => {
  beforeEach(() => {
    mockQuestionDecks.splice(0, mockQuestionDecks.length, {
      id: 'test-deck',
      version: 1,
      questions: items,
    });
    mockDiscoveries = [];
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockStart.mockClear();
    onBack.mockClear();
  });

  describe('what it says', () => {
    it('should show the title as the heading and go back from its button', async () => {
      await renderIntro();

      fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.backLabel }));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('should show the three how it works lines, including what a missing item can mean', async () => {
      await renderIntro();

      expect(screen.getByText(copy.secretMatch.howLabel)).toBeOnTheScreen();
      expect(screen.getByText(copy.secretMatch.how1)).toBeOnTheScreen();
      expect(screen.getByText(copy.secretMatch.how2)).toBeOnTheScreen();
      expect(screen.getByText(copy.secretMatch.how3)).toBeOnTheScreen();
    });

    it('should state the privacy promise', async () => {
      await renderIntro();

      expect(screen.getByText(copy.secretMatch.promiseTitle)).toBeOnTheScreen();
      expect(screen.getByText(copy.secretMatch.promiseBody)).toBeOnTheScreen();
    });

    it('should show Theo covering his eyes beside his line, as decoration', async () => {
      await renderIntro();

      expect(screen.getByText(copy.secretMatch.theoLine)).toBeOnTheScreen();
      expect(drawnCharacters()).toEqual([
        expect.objectContaining({
          props: expect.objectContaining({ character: 'shy', mood: 'coverEyes', crop: 'head' }),
          isHiddenFromScreenReaders: true,
        }),
      ]);
    });
  });

  describe('the names', () => {
    it('should be filled with the remembered names, which the rest of the app shares', async () => {
      const backend = createInMemoryBackend();
      backend.entries.set('playerNames', JSON.stringify(['Remembered A', 'Remembered B']));
      await renderIntro(createStorage(backend));

      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveDisplayValue(
        'Remembered A',
      );
      expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveDisplayValue(
        'Remembered B',
      );
    });

    it('should limit each name to 20 characters', async () => {
      await renderIntro();

      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveProp('maxLength', 20);
      expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveProp('maxLength', 20);
    });
  });

  describe('the level and the topics', () => {
    it('should offer the three levels by name, with the second checked', async () => {
      await renderIntro();

      expect(screen.getByRole('radio', { name: levelNames.l1, checked: false })).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: levelNames.l2, checked: true })).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: levelNames.l3, checked: false })).toBeOnTheScreen();
    });

    it('should offer no categories, formats or length, because the engine fixes them', async () => {
      await renderIntro();

      expect(screen.queryByText(copy.roundSetup.categoriesLabel)).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsSetup.formatsLabel)).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsSetup.lengthLabel)).not.toBeOnTheScreen();
    });

    it('should offer the six topics by name, all on and none locked', async () => {
      await renderIntro();

      expect(screen.getByText(copy.questionsSetup.topicsLabel)).toBeOnTheScreen();
      topicKeys.forEach((topic) =>
        expect(
          screen.getByRole('switch', { name: topicNames[topic], checked: true, disabled: false }),
        ).toBeOnTheScreen(),
      );
    });

    it('should switch a topic off and on again', async () => {
      await renderIntro();

      pressSwitch(topicNames.t4);
      expect(screen.getByRole('switch', { name: topicNames.t4, checked: false })).toBeOnTheScreen();

      pressSwitch(topicNames.t4);
      expect(screen.getByRole('switch', { name: topicNames.t4, checked: true })).toBeOnTheScreen();
    });

    it('should lock the last topic that is on, and say why', async () => {
      await renderIntro();

      switchEveryTopicOffExcept('t2');

      const lastTopic = screen.getByRole('switch', {
        name: topicNames.t2,
        checked: true,
        disabled: true,
      });
      expect(lastTopic).toHaveProp('accessibilityHint', copy.questionsSetup.lastTopicHint);
      expect(screen.getByText(copy.questionsSetup.lastTopicHint)).toBeOnTheScreen();
    });

    it('should not switch the last topic off', async () => {
      await renderIntro();
      switchEveryTopicOffExcept('t2');

      pressSwitch(topicNames.t2);

      expect(screen.getByRole('switch', { name: topicNames.t2, checked: true })).toBeOnTheScreen();
    });
  });

  describe('too few items', () => {
    it('should say nothing about it while the choices leave enough', async () => {
      await renderIntro();
      enterNames('Player A', 'Player B');

      expect(screen.queryByText(copy.secretMatch.tooFew)).not.toBeOnTheScreen();
      expect(startButton()).toBeEnabled();
    });

    it('should show the message and disable Start when the choices leave fewer than three', async () => {
      await renderIntro();
      enterNames('Player A', 'Player B');

      switchEveryTopicOffExcept('t6');

      expect(screen.getByText(copy.secretMatch.tooFew)).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: copy.secretMatch.start, disabled: true }),
      ).toBeOnTheScreen();
    });

    it('should not start a session when Start is pressed while there are too few', async () => {
      await renderIntro();
      enterNames('Player A', 'Player B');
      switchEveryTopicOffExcept('t6');

      fireEvent.press(startButton());

      expect(mockStart).not.toHaveBeenCalled();
    });

    it('should come back once another topic is switched on', async () => {
      await renderIntro();
      enterNames('Player A', 'Player B');
      switchEveryTopicOffExcept('t6');

      pressSwitch(topicNames.t2);

      expect(screen.queryByText(copy.secretMatch.tooFew)).not.toBeOnTheScreen();
      expect(startButton()).toBeEnabled();
    });
  });

  describe('Start', () => {
    it('should be disabled until both names are entered', async () => {
      await renderIntro();
      expect(
        screen.getByRole('button', { name: copy.secretMatch.start, disabled: true }),
      ).toBeOnTheScreen();

      enterNames('Player A', '   ');
      expect(
        screen.getByRole('button', { name: copy.secretMatch.start, disabled: true }),
      ).toBeOnTheScreen();

      enterNames('Player A', 'Player B');
      expect(
        screen.getByRole('button', { name: copy.secretMatch.start, disabled: false }),
      ).toBeOnTheScreen();
    });

    it('should start a session from the choices, with the names tidied and the categories of the level', async () => {
      await renderIntro();
      enterNames('  Player A ', 'Player B');
      fireEvent.press(screen.getByRole('radio', { name: levelNames.l3 }));
      pressSwitch(topicNames.t3);

      await pressStart();

      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(mockStart).toHaveBeenCalledWith(
        {
          players: ['Player A', 'Player B'],
          level: 'l3',
          enabledCategories: ['c1', 'c2', 'c3', 'c4'],
          enabledTopics: ['t1', 't2', 't4', 't5', 't6'],
          seed: 2147483648,
          avoidIds: [],
        },
        items,
      );
    });

    it('should pass the ids of the matches already in discoveries as the avoid list, and only those', async () => {
      mockDiscoveries = [
        { kind: 'match', questionId: 'match-c1-1', strength: 'yes', date: '2026-01-01T00:00:00Z' },
        {
          kind: 'match',
          questionId: 'match-c2-3',
          strength: 'maybe',
          date: '2026-01-02T00:00:00Z',
        },
        {
          kind: 'agree',
          questionId: 'either-c1-1',
          optionId: 'option-a',
          date: '2026-01-03T00:00:00Z',
        },
      ];
      await renderIntro();
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(mockStart.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({ avoidIds: ['match-c1-1', 'match-c2-3'] }),
      );
    });

    it('should remember the names for the rest of the app', async () => {
      const backend = createInMemoryBackend();
      await renderIntro(createStorage(backend));
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(backend.entries.get('playerNames')).toBe(JSON.stringify(['Player A', 'Player B']));
    });
  });
});
