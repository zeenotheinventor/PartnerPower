import { copy, fillCopy } from '@getfreak/content';
import type { Question, QuestionRoundAction, QuestionRoundSetup } from '@getfreak/core';
import { waitFor } from '@testing-library/react-native';
import { act, fireEvent, screen, within } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';

import { PersonalDataProvider } from '../../../personal';
import type { PersonalDataSource } from '../../../personal';
import { storage } from '../../../storage';
import type { PersonalRepository } from '../../../storage';
import { createInMemoryPersonalRepository } from '../../../storage/personal/createInMemoryPersonalRepository';
import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import {
  QuestionRoundProvider,
  useQuestionRound,
  type QuestionRoundContextValue,
} from '../../questionRound/QuestionRoundProvider';
import { QuestionsSummaryScreen } from './QuestionsSummaryScreen';

// The default storage runs over an in-memory backend, so a test can turn saving off.
jest.mock('expo-sqlite/kv-store', () => {
  const { createInMemoryBackend } = jest.requireActual<
    typeof import('../../../storage/createInMemoryBackend')
  >('../../../storage/createInMemoryBackend');
  return { __esModule: true, default: createInMemoryBackend() };
});

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    push: mockPush,
    dismissTo: mockDismissTo,
    canGoBack: () => mockCanGoBack,
  }),
}));

jest.mock('../../roundSetup/randomSeed', () => ({ randomSeed: () => 99 }));

const options = [
  { id: 'o1', text: 'Option 1' },
  { id: 'o2', text: 'Option 2' },
];

function makeQuestions(): Question[] {
  return [1, 2, 3, 4].flatMap((number): Question[] => [
    {
      id: `if-you-${number}`,
      format: 'ifYou',
      category: 'c1',
      topic: 't1',
      source: 'shipped',
      text: `Statement ${number}`,
    },
    {
      id: `guess-${number}`,
      format: 'guess',
      category: 'c1',
      topic: 't1',
      source: 'shipped',
      text: `Guess ${number}`,
      options,
    },
    {
      id: `either-or-${number}`,
      format: 'eitherOr',
      category: 'c1',
      topic: 't1',
      source: 'shipped',
      options,
    },
  ]);
}

const questions = makeQuestions();

const setupFor = (format: 'ifYou' | 'guess' | 'eitherOr'): QuestionRoundSetup => ({
  players: ['Player A', 'Player B'],
  level: 'l1',
  enabledCategories: ['c1'],
  enabledFormats: [format],
  enabledTopics: ['t1'],
  length: 10,
  seed: 3,
});

const pick = (optionId: string): QuestionRoundAction => ({ type: 'pick', optionId });
const next: QuestionRoundAction = { type: 'next' };
const end: QuestionRoundAction = { type: 'end' };

type Scenario = { setup: QuestionRoundSetup; actions: QuestionRoundAction[] };

// Player B guesses right and Player A guesses wrong, so Player B knows best.
const bKnowsBest: Scenario = {
  setup: setupFor('guess'),
  actions: [pick('o1'), pick('o1'), next, pick('o1'), pick('o2'), end],
};

// Both guess right.
const guessTie: Scenario = {
  setup: setupFor('guess'),
  actions: [pick('o1'), pick('o1'), next, pick('o1'), pick('o1'), end],
};

// Nothing to guess, and no would you rather question either.
const noGuesses: Scenario = {
  setup: setupFor('ifYou'),
  actions: [{ type: 'answer', answers: [true, false] }, end],
};

// Two would you rather questions, one matched.
const oneOfTwoMatched: Scenario = {
  setup: setupFor('eitherOr'),
  actions: [pick('o1'), pick('o1'), next, pick('o1'), pick('o2'), end],
};

// One would you rather question, matched.
const oneMatched: Scenario = {
  setup: setupFor('eitherOr'),
  actions: [pick('o1'), pick('o1'), end],
};

let latestRound: QuestionRoundContextValue | undefined;

function makeRepository(): PersonalRepository {
  return createInMemoryPersonalRepository({
    getShippedCards: () => [],
    getShippedQuestions: () => questions,
    randomUUID: () => '00000000-0000-4000-8000-000000000001',
    now: () => 1,
  });
}

// The personal store opens when the test says so, inside an act, so nothing updates outside one.
let personalRepository: PersonalRepository;
let personalSource: PersonalDataSource;
let openPersonalStore: () => Promise<void>;

function prepareEmptyPersonalStore() {
  personalRepository = makeRepository();
  let open: (repository: PersonalRepository) => void = () => {};
  personalSource = {
    load: () => new Promise<PersonalRepository>((resolve) => (open = resolve)),
    createEmpty: makeRepository,
  };
  openPersonalStore = () => act(async () => open(personalRepository));
}

function PlayedRound({ scenario, children }: { scenario: Scenario; children: ReactNode }) {
  const round = useQuestionRound();
  const { startNewRound, dispatch } = round;
  // Runs after every render, so the test can read the context as it is now.
  useEffect(() => {
    latestRound = round;
  });
  useEffect(() => {
    startNewRound(scenario.setup, questions);
    scenario.actions.forEach(dispatch);
  }, [startNewRound, dispatch, scenario]);
  return children;
}

function summaryTree(scenario: Scenario, { screenKey = 0, showScreen = true } = {}) {
  return (
    <PersonalDataProvider source={personalSource}>
      <QuestionRoundProvider>
        <PlayedRound scenario={scenario}>
          {showScreen ? <QuestionsSummaryScreen key={screenKey} /> : null}
        </PlayedRound>
      </QuestionRoundProvider>
    </PersonalDataProvider>
  );
}

async function renderSummary(scenario: Scenario = bKnowsBest) {
  const view = await renderThemed(summaryTree(scenario));
  await openPersonalStore();
  return view;
}

const discoveriesTitle = (count: number) =>
  fillCopy(copy.questionsSummary.discoveriesMany, { count });

describe('QuestionsSummaryScreen', () => {
  beforeEach(async () => {
    prepareEmptyPersonalStore();
    await storage.set('questionPreferences', { saveDiscoveries: true });
  });

  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockPush.mockClear();
    mockDismissTo.mockClear();
    mockCanGoBack = true;
    latestRound = undefined;
    jest.restoreAllMocks();
  });

  it('should show the title as a heading', async () => {
    await renderSummary();

    expect(screen.getByRole('header', { name: copy.questionsSummary.title })).toBeOnTheScreen();
  });

  it('should say how many questions were played and how many categories were reached', async () => {
    await renderSummary();

    expect(
      screen.getByText(
        fillCopy(copy.questionsSummary.subtitle, {
          questions: fillCopy(copy.questionsSummary.questionCountMany, { count: 2 }),
          categories: fillCopy(copy.roundSummary.categoryCountOne, { count: 1 }),
        }),
      ),
    ).toBeOnTheScreen();
  });

  describe('the player blocks', () => {
    it('should read each player as one group, with the badge on the player who knows best', async () => {
      await renderSummary();

      expect(
        screen.getByRole('group', { name: 'Player A, 1 drink, 0 of 1 guesses right' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('group', {
          name: 'Player B, 0 drinks, 1 of 1 guesses right, knows you best',
        }),
      ).toBeOnTheScreen();
      expect(screen.getAllByText(copy.questionsSummary.badge)).toHaveLength(1);
    });

    it('should say Player B knows best in a happy Theo line, hidden from screen readers', async () => {
      await renderSummary();

      expect(
        screen.getByText(fillCopy(copy.questionsSummary.knowsBestLine, { name: 'Player B' })),
      ).toBeOnTheScreen();
      expect(drawnCharacters()).toEqual([
        {
          props: { character: 'shy', mood: 'happy', size: 'tile', crop: 'head' },
          isHiddenFromScreenReaders: true,
        },
      ]);
    });

    it('should call a tie a tie, with no badge and a shocked Theo', async () => {
      await renderSummary(guessTie);

      expect(screen.getByText(copy.questionsSummary.tieLine)).toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsSummary.badge)).not.toBeOnTheScreen();
      expect(
        screen.getByRole('group', { name: 'Player A, 0 drinks, 1 of 1 guesses right' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('group', { name: 'Player B, 0 drinks, 1 of 1 guesses right' }),
      ).toBeOnTheScreen();
      expect(drawnCharacters()[0]?.props.mood).toBe('shocked');
    });

    it('should show no guess line and no badge when no guess question was played', async () => {
      await renderSummary(noGuesses);

      expect(screen.getByRole('group', { name: 'Player A, 1 drink' })).toBeOnTheScreen();
      expect(screen.getByRole('group', { name: 'Player B, 0 drinks' })).toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsSummary.guessedRight)).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsSummary.badge)).not.toBeOnTheScreen();
      expect(screen.getByText(copy.questionsSummary.noGuessLine)).toBeOnTheScreen();
      expect(drawnCharacters()[0]?.props.mood).toBe('idle');
    });

    it('should announce the Theo line in a polite live region', async () => {
      await renderSummary();

      const liveRegion = screen.UNSAFE_getByProps({ accessibilityLiveRegion: 'polite' });
      expect(
        within(liveRegion).getByText(
          fillCopy(copy.questionsSummary.knowsBestLine, { name: 'Player B' }),
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('the would you rather matches', () => {
    it('should say how many matched', async () => {
      await renderSummary(oneOfTwoMatched);

      expect(
        screen.getByText(
          fillCopy(copy.questionsSummary.matchesLineMany, { matched: 1, played: 2 }),
        ),
      ).toBeOnTheScreen();
    });

    it('should use the singular for one question', async () => {
      await renderSummary(oneMatched);

      expect(
        screen.getByText(fillCopy(copy.questionsSummary.matchesLineOne, { matched: 1, played: 1 })),
      ).toBeOnTheScreen();
    });

    it('should say nothing when no would you rather question was played', async () => {
      await renderSummary(bKnowsBest);

      expect(screen.queryByText(/would you rather/)).not.toBeOnTheScreen();
    });
  });

  describe('the discoveries', () => {
    it('should save the round discoveries on arrival', async () => {
      await renderSummary();

      await waitFor(async () => expect(await personalRepository.listDiscoveries()).toHaveLength(2));
    });

    it('should show how many new discoveries the round made', async () => {
      await renderSummary();

      expect(await screen.findByText(discoveriesTitle(2))).toBeOnTheScreen();
    });

    it('should use the singular for one new discovery', async () => {
      await renderSummary(oneMatched);

      expect(await screen.findByText(copy.questionsSummary.discoveriesOne)).toBeOnTheScreen();
    });

    it('should link the discoveries card to the Discoveries screen, with the line that says they are saved', async () => {
      await renderSummary();
      await screen.findByText(discoveriesTitle(2));

      expect(screen.getByText(copy.questionsSummary.discoveriesBody)).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: discoveriesTitle(2) }));

      expect(mockPush).toHaveBeenCalledWith('/games/questions/discoveries');
    });

    it('should not save twice when the store reloads and the effect runs again', async () => {
      const addDiscoveries = jest.spyOn(personalRepository, 'addDiscoveries');
      const view = await renderSummary();
      await waitFor(() => expect(addDiscoveries).toHaveBeenCalledTimes(1));

      // A new source loads a new repository, so the hook gives the effect a new addDiscoveries.
      const reloadedRepository = makeRepository();
      const reloadedAdd = jest.spyOn(reloadedRepository, 'addDiscoveries');
      personalSource = {
        load: () => Promise.resolve(reloadedRepository),
        createEmpty: makeRepository,
      };
      view.rerender(summaryTree(bKnowsBest));
      await act(async () => {});
      await act(async () => {});

      expect(addDiscoveries).toHaveBeenCalledTimes(1);
      expect(reloadedAdd).not.toHaveBeenCalled();
    });

    it('should count a store that could not open as a failed save, and write nothing', async () => {
      const emptyRepository = makeRepository();
      const addDiscoveries = jest.spyOn(emptyRepository, 'addDiscoveries');
      personalSource = {
        load: () => Promise.reject(new Error('no')),
        createEmpty: () => emptyRepository,
      };

      await renderThemed(summaryTree(bKnowsBest));
      await act(async () => {});
      await act(async () => {});

      expect(await screen.findByText(copy.questionsSummary.saveFailed)).toBeOnTheScreen();
      expect(screen.queryByText(discoveriesTitle(2))).not.toBeOnTheScreen();
      expect(addDiscoveries).not.toHaveBeenCalled();
    });

    it('should not save twice when the screen is left and returns for the same round', async () => {
      const addDiscoveries = jest.spyOn(personalRepository, 'addDiscoveries');
      const view = await renderSummary();
      await waitFor(() => expect(addDiscoveries).toHaveBeenCalledTimes(1));

      view.rerender(summaryTree(bKnowsBest, { showScreen: false }));
      view.rerender(summaryTree(bKnowsBest, { screenKey: 1 }));
      await act(async () => {});

      expect(addDiscoveries).toHaveBeenCalledTimes(1);
      expect(await personalRepository.listDiscoveries()).toHaveLength(2);
    });

    it('should wait for the personal store to open before saving', async () => {
      const addDiscoveries = jest.spyOn(personalRepository, 'addDiscoveries');

      await renderThemed(summaryTree(bKnowsBest));
      await act(async () => {});
      expect(addDiscoveries).not.toHaveBeenCalled();

      await openPersonalStore();
      await waitFor(() => expect(addDiscoveries).toHaveBeenCalledTimes(1));
    });

    it('should save nothing and say nothing about discoveries when saving is off', async () => {
      await storage.set('questionPreferences', { saveDiscoveries: false });

      await renderSummary();
      await act(async () => {});

      expect(await personalRepository.listDiscoveries()).toEqual([]);
      expect(screen.queryByText(/discover/)).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsSummary.saveFailed)).not.toBeOnTheScreen();
    });

    it('should save nothing and say nothing when the round made no discoveries', async () => {
      const addDiscoveries = jest.spyOn(personalRepository, 'addDiscoveries');

      await renderSummary(noGuesses);
      await act(async () => {});

      expect(addDiscoveries).not.toHaveBeenCalled();
      expect(screen.queryByText(/discover/)).not.toBeOnTheScreen();
    });

    it('should show a short message when the save fails, and keep the screen working', async () => {
      jest.spyOn(personalRepository, 'addDiscoveries').mockRejectedValue(new Error('no'));

      await renderSummary();

      expect(await screen.findByText(copy.questionsSummary.saveFailed)).toBeOnTheScreen();
      expect(screen.queryByText(discoveriesTitle(2))).not.toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: copy.questionsSummary.playAgain }),
      ).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: copy.questionsSummary.home }));
      expect(mockDismissTo).toHaveBeenCalledWith('/games/questions');
    });

    it('should not try a failed save again when the screen renders again', async () => {
      const addDiscoveries = jest
        .spyOn(personalRepository, 'addDiscoveries')
        .mockRejectedValue(new Error('no'));
      const view = await renderSummary();
      await screen.findByText(copy.questionsSummary.saveFailed);

      view.rerender(summaryTree(bKnowsBest));
      await act(async () => {});

      expect(addDiscoveries).toHaveBeenCalledTimes(1);
    });

    it('should save nothing for a round that is not over', async () => {
      const addDiscoveries = jest.spyOn(personalRepository, 'addDiscoveries');
      const unfinished: Scenario = { setup: setupFor('guess'), actions: [pick('o1'), pick('o1')] };

      await renderSummary(unfinished);
      await act(async () => {});

      expect(addDiscoveries).not.toHaveBeenCalled();
    });
  });

  describe('the buttons', () => {
    it('should start a new round from the last setup with a new seed, and open play', async () => {
      await renderSummary();
      expect(latestRound?.lastStart?.setup.seed).toBe(3);

      fireEvent.press(screen.getByRole('button', { name: copy.questionsSummary.playAgain }));

      expect(latestRound?.lastStart?.setup).toEqual({ ...bKnowsBest.setup, seed: 99 });
      expect(latestRound?.lastStart?.questions).toBe(questions);
      expect(latestRound?.round?.history).toEqual([]);
      expect(mockReplace).toHaveBeenCalledWith('/games/questions/play');
    });

    it('should not start two rounds from two presses', async () => {
      await renderSummary();
      const playAgain = screen.getByRole('button', { name: copy.questionsSummary.playAgain });

      fireEvent.press(playAgain);
      fireEvent.press(playAgain);

      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it('should go back to setup from Settings', async () => {
      await renderSummary();

      fireEvent.press(screen.getByRole('button', { name: copy.questionsSummary.settings }));

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should open setup from Settings when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderSummary();

      fireEvent.press(screen.getByRole('button', { name: copy.questionsSummary.settings }));

      expect(mockBack).not.toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/games/questions/setup');
    });

    it('should go to the Drink If home from Home', async () => {
      await renderSummary();

      fireEvent.press(screen.getByRole('button', { name: copy.questionsSummary.home }));

      expect(mockDismissTo).toHaveBeenCalledWith('/games/questions');
    });
  });

  describe('with no round', () => {
    async function renderWithoutRound() {
      await renderThemed(
        <PersonalDataProvider source={personalSource}>
          <QuestionRoundProvider>
            <QuestionsSummaryScreen />
          </QuestionRoundProvider>
        </PersonalDataProvider>,
      );
      await openPersonalStore();
    }

    it('should show the title and the ways out, and cannot play again', async () => {
      await renderWithoutRound();

      expect(screen.getByRole('header', { name: copy.questionsSummary.title })).toBeOnTheScreen();
      expect(screen.queryAllByRole('group')).toHaveLength(0);
      expect(screen.getByRole('button', { name: copy.questionsSummary.playAgain })).toBeDisabled();
      expect(screen.getByRole('button', { name: copy.questionsSummary.home })).toBeEnabled();
    });
  });
});
