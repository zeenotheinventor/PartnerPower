import { categoryNames, copy, fillCopy } from '@getfreak/content';
import type { QuestionDeck } from '@getfreak/core';
import { act } from '@testing-library/react-native';
import { fireEvent, screen, within } from 'nativewind/test';
import { AppState, type AppStateStatus } from 'react-native';
import type { ReactNode } from 'react';

import { SettingsProvider, useSettings } from '../../../settings';
import { createInMemoryBackend } from '../../../storage/createInMemoryBackend';
import { createStorage } from '../../../storage/createStorage';
import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { SecretMatchProvider } from '../SecretMatchProvider';
import {
  firstPlayerName,
  makeSecretMatchQuestions,
  secondPlayerName,
} from '../testing/secretMatchFixtures';
import { SecretMatchScreen } from './SecretMatchScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
let mockPreventsRemove = false;
let mockOnRemovePrevented: (() => void) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));
jest.mock('expo-router/react-navigation', () => ({
  usePreventRemove: (preventRemove: boolean, callback: () => void) => {
    mockPreventsRemove = preventRemove;
    mockOnRemovePrevented = callback;
  },
}));

const mockAddDiscoveries = jest.fn();
jest.mock('../../../personal', () => ({
  useDiscoveries: () => ({
    discoveries: [],
    // A new function on every render, so only the screen's own guard can stop a second save.
    addDiscoveries: (...drafts: unknown[]) => mockAddDiscoveries(...drafts),
    isLoading: false,
    saveDiscoveries: true,
  }),
}));

const mockHomeEntries: { title: string; body: string; route: string | null }[] = [];
jest.mock('../../questionsHome/homeEntries', () => ({
  get homeEntries() {
    return mockHomeEntries;
  },
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

type Rating = 'yes' | 'maybe' | 'no';

const homeRoute = '/games/questions';
const discoveriesRoute = '/games/questions/discoveries';

// The screen reads the remembered names when the intro first renders, so the test waits for them.
function AfterSettingsLoad({ children }: { children: ReactNode }) {
  return useSettings().isLoading ? null : children;
}

async function renderScreen() {
  await renderThemed(
    <SettingsProvider storage={createStorage(createInMemoryBackend())}>
      <AfterSettingsLoad>
        <SecretMatchProvider>
          <SecretMatchScreen />
        </SecretMatchProvider>
      </AfterSettingsLoad>
    </SettingsProvider>,
  );
  await screen.findByRole('header', { name: copy.secretMatch.title }, { timeout: 5000 });
}

async function startSession() {
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), firstPlayerName);
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), secondPlayerName);
  fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.start }));
  await act(async () => {});
}

const passHeading = (name: string) =>
  screen.getByRole('header', { name: fillCopy(copy.secretMatch.passOf, { name }) });
const rate = (rating: Rating) =>
  fireEvent.press(screen.getByRole('button', { name: copy.secretMatch[rating] }));
const pressName = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const startSecondPass = () =>
  pressName(fillCopy(copy.secretMatch.handoffButton, { partner: secondPlayerName }));

function ratePass(ratings: readonly Rating[]) {
  ratings.forEach(rate);
}

const everyItem = (rating: Rating): readonly Rating[] => Array<Rating>(12).fill(rating);

function changeAppStatus(status: AppStateStatus) {
  act(() => {
    AppState.currentState = status;
    // The listener RN's own jest setup registered is replaced below, so the test emits through it.
    emitAppState(status);
  });
}
let emitAppState: (status: AppStateStatus) => void = () => {};

const allItemTexts = makeSecretMatchQuestions(['c1', 'c2', 'c3', 'c4'], 8).flatMap((question) =>
  question.format === 'secretMatch' ? [question.text] : [],
);
function expectCardLines(card: Parameters<typeof within>[0] | undefined, lines: string[]) {
  if (!card) throw new Error('A card was expected');
  lines.forEach((line) => expect(within(card).getByText(line)).toBeOnTheScreen());
}

// The text of the item on the screen, found by asking the screen about each known item.
function itemText(): string {
  const shown = allItemTexts.filter((text) => screen.queryByText(text) !== null);
  expect(shown).toHaveLength(1);
  return shown[0] ?? '';
}

describe('SecretMatchScreen', () => {
  const originalStatus = AppState.currentState;

  beforeEach(() => {
    mockQuestionDecks.splice(0, mockQuestionDecks.length, {
      id: 'test-deck',
      version: 1,
      questions: makeSecretMatchQuestions(['c1', 'c2', 'c3', 'c4'], 8),
    });
    mockHomeEntries.splice(0, mockHomeEntries.length, {
      title: copy.questionsHome.discoveriesTitle,
      body: copy.questionsHome.discoveriesBody,
      route: null,
    });
    mockAddDiscoveries.mockResolvedValue(undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      emitAppState = handler;
      return { remove: () => {} };
    });
    AppState.currentState = 'active';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AppState.currentState = originalStatus;
    emitAppState = () => {};
    [mockPush, mockBack, mockReplace, mockAddDiscoveries].forEach((mock) => mock.mockReset());
    mockCanGoBack = true;
    mockPreventsRemove = false;
    mockOnRemovePrevented = undefined;
  });

  describe('the intro', () => {
    it('should open on the intro, which does not hold back the system back button', async () => {
      await renderScreen();

      expect(screen.getByRole('button', { name: copy.secretMatch.start })).toBeOnTheScreen();
      expect(mockPreventsRemove).toBe(false);
    });

    it('should go back to the home from its back button, or replace itself with it when there is nothing behind', async () => {
      await renderScreen();
      fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.backLabel }));
      expect(mockBack).toHaveBeenCalledTimes(1);

      mockCanGoBack = false;
      fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.backLabel }));
      expect(mockReplace).toHaveBeenCalledWith(homeRoute);
    });

    it('should start the first pass with the first partner', async () => {
      await renderScreen();

      await startSession();

      expect(passHeading(firstPlayerName)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.secretMatch.count, { number: 1, total: 12 })),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.secretMatch.lookAway, { name: secondPlayerName })),
      ).toBeOnTheScreen();
    });
  });

  describe('a pass', () => {
    it('should move on at once when an item is rated, one item at a time', async () => {
      await renderScreen();
      await startSession();
      const firstItem = itemText();

      rate('yes');

      expect(
        screen.getByText(fillCopy(copy.secretMatch.count, { number: 2, total: 12 })),
      ).toBeOnTheScreen();
      expect(itemText()).not.toBe(firstItem);
    });

    it('should have no back button on the first item', async () => {
      await renderScreen();
      await startSession();

      expect(screen.queryByRole('button', { name: copy.secretMatch.back })).not.toBeOnTheScreen();
    });

    it('should go back one item in the current pass, showing only the own earlier choice', async () => {
      await renderScreen();
      await startSession();
      const firstItem = itemText();
      rate('maybe');

      pressName(copy.secretMatch.back);

      expect(itemText()).toBe(firstItem);
      expect(
        screen.getByText(fillCopy(copy.secretMatch.yourAnswer, { answer: copy.secretMatch.maybe })),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.secretMatch.back })).not.toBeOnTheScreen();
    });

    it('should hold back the system back button, and ask whether to stop when it is used', async () => {
      await renderScreen();
      await startSession();
      expect(mockPreventsRemove).toBe(true);

      act(() => mockOnRemovePrevented?.());

      expect(screen.getByLabelText(copy.secretMatch.stopTitle)).toBeOnTheScreen();
    });
  });

  describe('the stop dialog', () => {
    it('should open from the Stop pill, and keep going closes it with the pass untouched', async () => {
      await renderScreen();
      await startSession();
      rate('yes');

      pressName(copy.secretMatch.stop);
      expect(screen.getByLabelText(copy.secretMatch.stopTitle)).toBeOnTheScreen();
      expect(screen.getByText(copy.secretMatch.stopBody)).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: copy.secretMatch.stopCancel }));

      expect(screen.queryByLabelText(copy.secretMatch.stopTitle)).not.toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.secretMatch.count, { number: 2, total: 12 })),
      ).toBeOnTheScreen();
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should send stop on confirming, keep nothing and return to the home', async () => {
      await renderScreen();
      await startSession();
      rate('yes');
      pressName(copy.secretMatch.stop);

      fireEvent.press(
        within(screen.getByLabelText(copy.secretMatch.stopTitle)).getByRole('button', {
          name: copy.secretMatch.stopConfirm,
        }),
      );

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockAddDiscoveries).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: copy.secretMatch.yes })).not.toBeOnTheScreen();
      expect(allItemTexts.filter((text) => screen.queryByText(text) !== null)).toEqual([]);
    });

    it('should open at the handoff too, and wipe both passes on confirming', async () => {
      await renderScreen();
      await startSession();
      ratePass(everyItem('yes'));
      expect(mockPreventsRemove).toBe(true);

      act(() => mockOnRemovePrevented?.());
      fireEvent.press(
        within(screen.getByLabelText(copy.secretMatch.stopTitle)).getByRole('button', {
          name: copy.secretMatch.stopConfirm,
        }),
      );

      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockAddDiscoveries).not.toHaveBeenCalled();
    });
  });

  describe('the handoff', () => {
    it('should name both partners and offer only one button, with no way back', async () => {
      await renderScreen();
      await startSession();

      ratePass(everyItem('yes'));

      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.secretMatch.handoffTitle, {
            name: firstPlayerName,
            partner: secondPlayerName,
          }),
        }),
      ).toBeOnTheScreen();
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });

    it('should start the second pass on the first item with no back button', async () => {
      await renderScreen();
      await startSession();
      ratePass(everyItem('yes'));

      startSecondPass();

      expect(passHeading(secondPlayerName)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.secretMatch.count, { number: 1, total: 12 })),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.secretMatch.back })).not.toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.secretMatch.lookAway, { name: firstPlayerName })),
      ).toBeOnTheScreen();
    });
  });

  describe('privacy', () => {
    // Plays a whole session and records everything on screen, as the tree a screen reader and the
    // eye are given, at every step of the second pass. The second partner rates the same way each
    // time, so any difference between two runs can only come from what the first partner rated.
    async function secondPassScreens(firstPassRatings: readonly Rating[]) {
      await renderScreen();
      await startSession();
      ratePass(firstPassRatings);
      const screens: string[] = [JSON.stringify(screen.toJSON())];
      startSecondPass();
      screens.push(JSON.stringify(screen.toJSON()));
      const secondPassRatings: Rating[] = ['yes', 'maybe', 'no', 'yes'];
      secondPassRatings.forEach((rating) => {
        rate(rating);
        screens.push(JSON.stringify(screen.toJSON()));
      });
      pressName(copy.secretMatch.back);
      screens.push(JSON.stringify(screen.toJSON()));
      rate('yes');
      screens.push(JSON.stringify(screen.toJSON()));
      screen.unmount();
      return screens;
    }

    it('should show exactly the same on every second pass screen whatever the first partner rated', async () => {
      const allYes = await secondPassScreens(everyItem('yes'));
      const allNo = await secondPassScreens(everyItem('no'));
      const mixed = await secondPassScreens(
        Array.from(
          { length: 12 },
          (_unused, index): Rating => (['yes', 'maybe', 'no'] as const)[index % 3] ?? 'yes',
        ),
      );

      expect(allNo).toEqual(allYes);
      expect(mixed).toEqual(allYes);
    });

    it('should show no answer of a finished pass by role or accessible name during the second pass', async () => {
      await renderScreen();
      await startSession();
      ratePass([
        'yes',
        'maybe',
        'no',
        'yes',
        'maybe',
        'no',
        'yes',
        'maybe',
        'no',
        'yes',
        'maybe',
        'no',
      ]);
      startSecondPass();

      for (let position = 1; position <= 12; position += 1) {
        // Nothing says "Your answer" on an item that has not been rated in this pass.
        expect(screen.queryByText(/Your answer/)).not.toBeOnTheScreen();
        expect(screen.queryByLabelText(/Your answer/)).not.toBeOnTheScreen();
        // The only buttons are Stop, the three answers and, after the first item, the back link.
        const names = screen
          .getAllByRole('button')
          .map((button) => button.props.accessibilityLabel ?? '');
        expect(names.filter((name) => name !== '')).toEqual([]);
        expect(screen.getAllByRole('button')).toHaveLength(position === 1 ? 4 : 5);
        // No answer button is chosen, and no switch, radio or checkbox is on the screen at all.
        [copy.secretMatch.yes, copy.secretMatch.maybe, copy.secretMatch.no].forEach((name) =>
          expect(screen.getByRole('button', { name })).not.toBeSelected(),
        );
        expect(screen.queryAllByRole('switch')).toHaveLength(0);
        expect(screen.queryAllByRole('radio')).toHaveLength(0);
        expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
        if (position < 12) rate('yes');
      }
    });

    it('should show the second partner only their own earlier answer after going back, never the first partner', async () => {
      await renderScreen();
      await startSession();
      ratePass(everyItem('maybe'));
      startSecondPass();
      rate('no');

      pressName(copy.secretMatch.back);

      expect(
        screen.getByText(fillCopy(copy.secretMatch.yourAnswer, { answer: copy.secretMatch.no })),
      ).toBeOnTheScreen();
      expect(screen.getAllByText(/Your answer/)).toHaveLength(1);
    });

    it('should never offer a way back into the first pass from the second', async () => {
      await renderScreen();
      await startSession();
      ratePass(everyItem('yes'));
      startSecondPass();

      // Going back on the first item does nothing, and there is no button for it.
      expect(screen.queryByRole('button', { name: copy.secretMatch.back })).not.toBeOnTheScreen();
      expect(passHeading(secondPlayerName)).toBeOnTheScreen();
      expect(
        screen.queryByRole('header', {
          name: fillCopy(copy.secretMatch.passOf, { name: firstPlayerName }),
        }),
      ).not.toBeOnTheScreen();
    });
  });

  describe('the cover', () => {
    it('should cover the item when the app goes inactive during a pass, and show it again on return', async () => {
      await renderScreen();
      await startSession();
      const item = itemText();

      changeAppStatus('inactive');

      expect(screen.getByRole('header', { name: copy.secretMatch.coverTitle })).toBeOnTheScreen();
      expect(screen.queryByText(item)).not.toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.secretMatch.yes })).not.toBeOnTheScreen();
      expect(drawnCharacters()).toEqual([
        expect.objectContaining({ props: expect.objectContaining({ mood: 'coverEyes' }) }),
      ]);

      changeAppStatus('active');

      expect(
        screen.queryByRole('header', { name: copy.secretMatch.coverTitle }),
      ).not.toBeOnTheScreen();
      expect(screen.getByText(item)).toBeOnTheScreen();
    });

    it('should cover the item in the background too', async () => {
      await renderScreen();
      await startSession();

      changeAppStatus('background');

      expect(screen.getByRole('header', { name: copy.secretMatch.coverTitle })).toBeOnTheScreen();
    });

    it('should cover the second partner pass the same way', async () => {
      await renderScreen();
      await startSession();
      ratePass(everyItem('yes'));
      startSecondPass();

      changeAppStatus('inactive');

      expect(screen.getByRole('header', { name: copy.secretMatch.coverTitle })).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: copy.secretMatch.yes })).not.toBeOnTheScreen();
    });

    it('should not cover the intro, which shows nothing private', async () => {
      await renderScreen();

      changeAppStatus('inactive');

      expect(
        screen.queryByRole('header', { name: copy.secretMatch.coverTitle }),
      ).not.toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.secretMatch.start })).toBeOnTheScreen();
    });
  });

  describe('the reveal', () => {
    async function playToReveal(first: readonly Rating[], second: readonly Rating[]) {
      await renderScreen();
      await startSession();
      ratePass(first);
      startSecondPass();
      ratePass(second);
      await act(async () => {});
    }

    it('should list the matches mild to bold, with a strength line each, and say how many', async () => {
      await playToReveal(everyItem('yes'), [
        ...everyItem('maybe').slice(0, 6),
        ...everyItem('yes').slice(6),
      ]);

      expect(screen.getByRole('header', { name: copy.secretMatch.revealTitle })).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.secretMatch.revealCountMany, { count: 12, total: 12 })),
      ).toBeOnTheScreen();
      const cards = screen.getAllByRole('group');
      expect(cards).toHaveLength(12);
      expectCardLines(cards[0], [categoryNames.c1, copy.secretMatch.strengthMaybe]);
      expectCardLines(cards.at(-1), [categoryNames.c2, copy.secretMatch.strengthYes]);
    });

    it('should list only what both said yes or maybe to, and never mention an item with a no', async () => {
      await playToReveal([...everyItem('yes').slice(0, 11), 'no'], everyItem('yes'));

      expect(
        screen.getByText(fillCopy(copy.secretMatch.revealCountMany, { count: 11, total: 12 })),
      ).toBeOnTheScreen();
      expect(screen.getAllByRole('group')).toHaveLength(11);
    });

    it('should save the matches once, and say so', async () => {
      await playToReveal(everyItem('yes'), everyItem('yes'));

      expect(mockAddDiscoveries).toHaveBeenCalledTimes(1);
      expect(mockAddDiscoveries.mock.calls[0]?.[0]).toHaveLength(12);
      expect(mockAddDiscoveries.mock.calls[0]?.[0]?.[0]).toEqual({
        kind: 'match',
        questionId: expect.stringMatching(/^match-c1-/),
        strength: 'yes',
      });
      expect(screen.getByText(copy.secretMatch.saved)).toBeOnTheScreen();
    });

    it('should save only once when the reveal renders again', async () => {
      await playToReveal(everyItem('yes'), everyItem('yes'));

      changeAppStatus('inactive');
      changeAppStatus('active');
      await act(async () => {});

      expect(mockAddDiscoveries).toHaveBeenCalledTimes(1);
    });

    it('should show the gentle empty state when there are no matches, and save nothing', async () => {
      await playToReveal(everyItem('yes'), everyItem('no'));

      expect(screen.getByRole('header', { name: copy.secretMatch.noneTitle })).toBeOnTheScreen();
      expect(screen.queryByRole('group')).not.toBeOnTheScreen();
      expect(mockAddDiscoveries).not.toHaveBeenCalled();
    });

    it('should hide the dares for you two link while the Discoveries screen is not switched on', async () => {
      await playToReveal(everyItem('yes'), everyItem('yes'));

      expect(
        screen.queryByRole('button', { name: copy.secretMatch.daresTitle }),
      ).not.toBeOnTheScreen();
    });

    it('should link the dares for you two to Discoveries once that screen is on', async () => {
      mockHomeEntries.splice(0, mockHomeEntries.length, {
        title: copy.questionsHome.discoveriesTitle,
        body: copy.questionsHome.discoveriesBody,
        route: discoveriesRoute,
      });
      await playToReveal(everyItem('yes'), everyItem('yes'));

      pressName(copy.secretMatch.daresTitle);

      expect(mockPush).toHaveBeenCalledWith(discoveriesRoute);
    });

    it('should not hold back the system back button once revealed, and leave the route with Done', async () => {
      await playToReveal(everyItem('yes'), everyItem('yes'));

      expect(mockPreventsRemove).toBe(false);
      pressName(copy.secretMatch.done);

      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});
