// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { categoryNames, copy, displayNames, fillCopy, levelNames } from '@getfreak/content';
import { startRound, type Card, type CategoryId, type Deck } from '@getfreak/core';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

const mockDecks: Deck[] = [];

// The decks are read when they are used, because this factory runs before the array above exists.
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return Object.defineProperty({ ...actual }, 'decks', { get: () => mockDecks, enumerable: true });
});

jest.mock('@getfreak/core', () => {
  const actual = jest.requireActual<typeof import('@getfreak/core')>('@getfreak/core');
  return { ...actual, startRound: jest.fn(actual.startRound) };
});

function makeCards(category: CategoryId): Card[] {
  return [1, 2, 3, 4, 5, 6].map((number) => ({
    id: `${category}-${number}`,
    category,
    kind: 'solo',
    text: `Card ${category} ${number}`,
    source: 'shipped',
  }));
}

const testDeck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [...makeCards('c1'), ...makeCards('c2')],
};

const setupRoute = '/games/dares/setup';
const playRoute = '/games/dares/play';
const summaryRoute = '/games/dares/summary';

async function pressStart() {
  fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.start }));
  // Saving the names finishes after the press, so the test waits for that to settle.
  await act(async () => {});
  await waitFor(() => expect(currentPathname()).toBe(playRoute));
}

function enterNames() {
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), 'Player A');
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), 'Player B');
}

async function startRoundFromSetup() {
  await launchApp(setupRoute);
  enterNames();
  fireEvent.press(screen.getByRole('radio', { name: copy.roundSetup.lengthTen }));
  await pressStart();
}

/** Presses whatever moves the round on, until the round leaves the play screen. */
function playUntilTheSummary() {
  const nextButtons = [
    copy.roundPlay.handoffButton,
    copy.roundPlay.stepUpButton,
    copy.roundPlay.done,
  ];
  for (let presses = 0; presses < 60 && currentPathname() === playRoute; presses += 1) {
    const name = nextButtons.find((label) => screen.queryByRole('button', { name: label }));
    if (!name) throw new Error('The play screen has nothing to press');
    fireEvent.press(screen.getByRole('button', { name }));
  }
}

async function reachTheSummary() {
  await startRoundFromSetup();
  playUntilTheSummary();
  await waitFor(() => expect(currentPathname()).toBe(summaryRoute));
}

const startRoundMock = jest.mocked(startRound);

describe('the round summary in the route tree', () => {
  beforeEach(async () => {
    mockDecks.splice(0, mockDecks.length, testDeck);
    startRoundMock.mockClear();
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  afterEach(() => jest.restoreAllMocks());

  it('should show the counts for each player after a short round', async () => {
    await reachTheSummary();

    expect(screen.getByRole('header', { name: copy.roundSummary.title })).toBeOnTheScreen();
    expect(
      screen.getByRole('group', { name: /^Player A, 5 dares done, 0 drinks/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('group', { name: /^Player B, 5 dares done, 0 drinks/ }),
    ).toBeOnTheScreen();
    expect(screen.getByText(copy.roundSummary.tieLine)).toBeOnTheScreen();
  });

  describe('Play again', () => {
    it('should open a fresh round with the same settings and a new seed', async () => {
      await reachTheSummary();

      fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));
      await waitFor(() => expect(currentPathname()).toBe(playRoute));

      expect(startRoundMock).toHaveBeenCalledTimes(2);
      const [firstCall, secondCall] = startRoundMock.mock.calls;
      if (!firstCall || !secondCall) throw new Error('Two rounds should have been started');
      const [firstSetup, firstDeck] = firstCall;
      const [secondSetup, secondDeck] = secondCall;
      expect(secondSetup).toEqual({ ...firstSetup, seed: secondSetup.seed });
      expect(secondSetup.seed).not.toBe(firstSetup.seed);
      expect(secondDeck).toBe(firstDeck);
    });

    it('should show the first card of the new round and not the old summary', async () => {
      await reachTheSummary();

      fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));
      await waitFor(() => expect(currentPathname()).toBe(playRoute));
      await act(async () => {});

      expect(currentPathname()).toBe(playRoute);
      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.roundPlay.handoffTitle, { name: 'Player A' }),
        }),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: copy.roundSummary.title })).not.toBeOnTheScreen();
    });

    it('should play the new round through to a summary of its own', async () => {
      await reachTheSummary();
      fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));
      await waitFor(() => expect(currentPathname()).toBe(playRoute));

      playUntilTheSummary();
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));

      expect(screen.getByRole('group', { name: /^Player A, 5 dares done/ })).toBeOnTheScreen();
    });
  });

  describe('Settings', () => {
    it('should open setup with the level, categories and length of the last round', async () => {
      await launchApp(setupRoute);
      enterNames();
      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));
      fireEvent.press(screen.getByRole('radio', { name: copy.roundSetup.lengthTen }));
      await pressStart();
      playUntilTheSummary();
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));

      fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.settings }));
      await waitFor(() => expect(currentPathname()).toBe(setupRoute));

      expect(screen.getByRole('radio', { name: levelNames.l2, checked: true })).toBeOnTheScreen();
      expect(
        screen.getByRole('switch', { name: categoryNames.c1, checked: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('switch', { name: categoryNames.c2, checked: false }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('radio', { name: copy.roundSetup.lengthTen, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should open setup with the first level when that was the last round', async () => {
      await launchApp(setupRoute);
      enterNames();
      fireEvent.press(screen.getByRole('radio', { name: levelNames.l1 }));
      await pressStart();
      playUntilTheSummary();
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));

      fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.settings }));
      await waitFor(() => expect(currentPathname()).toBe(setupRoute));

      expect(screen.getByRole('radio', { name: levelNames.l1, checked: true })).toBeOnTheScreen();
    });

    it('should keep the names of the last round', async () => {
      await reachTheSummary();

      fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.settings }));
      await waitFor(() => expect(currentPathname()).toBe(setupRoute));

      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveDisplayValue('Player A');
      expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveDisplayValue('Player B');
    });
  });

  describe('Home', () => {
    async function leaveFromTheHub() {
      await launchApp('/');
      fireEvent.press(screen.getByRole('button', { name: displayNames.dares.title }));
      await waitFor(() => expect(currentPathname()).toBe(setupRoute));
      enterNames();
      fireEvent.press(screen.getByRole('radio', { name: copy.roundSetup.lengthTen }));
      fireEvent.press(screen.getByRole('radio', { name: levelNames.l1 }));
      await pressStart();
      playUntilTheSummary();
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));
      fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.home }));
      await waitFor(() => expect(currentPathname()).toBe('/'));
    }

    it('should open the hub', async () => {
      await leaveFromTheHub();

      expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
    });

    it('should start the next visit to the game at the defaults, with no round', async () => {
      await leaveFromTheHub();

      fireEvent.press(screen.getByRole('button', { name: displayNames.dares.title }));
      await waitFor(() => expect(currentPathname()).toBe(setupRoute));

      expect(screen.getByRole('radio', { name: levelNames.l2, checked: true })).toBeOnTheScreen();
      expect(
        screen.getByRole('radio', { name: copy.roundSetup.lengthTwenty, checked: true }),
      ).toBeOnTheScreen();
      // The names are settings, not round data, so they are still remembered.
      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveDisplayValue('Player A');
    });
  });

  it('should go back to setup with the system back', async () => {
    await reachTheSummary();

    act(() => router.back());

    await waitFor(() => expect(currentPathname()).toBe(setupRoute));
  });

  it.each([
    ['Play again', copy.roundSummary.playAgain],
    ['Settings', copy.roundSummary.settings],
    ['Home', copy.roundSummary.home],
  ])(
    'should write nothing to storage on the summary or when %s is pressed',
    async (_name, label) => {
      await reachTheSummary();
      const writeSpy = jest.spyOn(backend, 'setItem');
      const entriesBefore = [...(await readEntries())];

      fireEvent.press(screen.getByRole('button', { name: label }));
      await act(async () => {});

      expect(writeSpy).not.toHaveBeenCalled();
      expect([...(await readEntries())]).toEqual(entriesBefore);
    },
  );
});

async function readEntries() {
  const keys = ['entryConfirmation', 'playerNames'];
  return Promise.all(keys.map(async (key) => [key, await backend.getItem(key)] as const));
}
