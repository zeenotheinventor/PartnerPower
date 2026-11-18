// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, fillCopy } from '@getfreak/content';
import type { Card, CategoryId, Deck } from '@getfreak/core';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

const mockDecks: Deck[] = [];

// The decks are read when they are used, because this factory runs before the array above exists.
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return Object.defineProperty({ ...actual }, 'decks', { get: () => mockDecks, enumerable: true });
});

function makeCards(category: CategoryId): Card[] {
  const solos: Card[] = [1, 2, 3, 4, 5].map((number) => ({
    id: `${category}-solo-${number}`,
    category,
    kind: 'solo',
    text: `Card ${category} solo ${number}`,
  }));
  const together: Card = {
    id: `${category}-together`,
    category,
    kind: 'together',
    text: `Card ${category} together`,
  };
  return [...solos, together];
}

const testDeck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [...makeCards('c1'), ...makeCards('c2')],
};

const setupRoute = '/games/dares/setup';
const playRoute = '/games/dares/play';
const summaryRoute = '/games/dares/summary';

async function startTenCardRound() {
  await launchApp(setupRoute);
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), 'Player A');
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), 'Player B');
  fireEvent.press(screen.getByRole('radio', { name: copy.roundSetup.lengthTen }));
  fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.start }));
  // Saving the names finishes after the press, so the test waits for that to settle.
  await act(async () => {});
  await waitFor(() => expect(currentPathname()).toBe(playRoute));
}

/** Presses whatever moves the round on, until the round leaves the play screen. */
function playUntilTheSummary() {
  const nextButtons = [
    copy.roundPlay.handoffButton,
    copy.roundPlay.stepUpButton,
    copy.roundPlay.done,
    copy.roundPlay.togetherDone,
  ];
  for (let presses = 0; presses < 60 && currentPathname() === playRoute; presses += 1) {
    const name = nextButtons.find((label) => screen.queryByRole('button', { name: label }));
    if (!name) throw new Error('The play screen has nothing to press');
    fireEvent.press(screen.getByRole('button', { name }));
  }
}

describe('playing a round in the route tree', () => {
  beforeEach(async () => {
    mockDecks.splice(0, mockDecks.length, testDeck);
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  it('should play a ten card round through to the summary', async () => {
    await startTenCardRound();

    playUntilTheSummary();
    await waitFor(() => expect(currentPathname()).toBe(summaryRoute));

    expect(screen.getByRole('header', { name: copy.roundSummary.title })).toBeOnTheScreen();
    // Every card was done, and a together card counts as done for both players.
    expect(
      screen.getByRole('group', { name: /^Player A, 6 dares done, 0 drinks/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('group', { name: /^Player B, 6 dares done, 0 drinks/ }),
    ).toBeOnTheScreen();
  });

  it('should go back to setup from the summary, and start another round from there', async () => {
    await startTenCardRound();
    playUntilTheSummary();
    await waitFor(() => expect(currentPathname()).toBe(summaryRoute));

    fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.settings }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));
    fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.start }));
    await act(async () => {});
    await waitFor(() => expect(currentPathname()).toBe(playRoute));

    expect(
      screen.getByRole('header', {
        name: fillCopy(copy.roundPlay.handoffTitle, { name: 'Player A' }),
      }),
    ).toBeOnTheScreen();
  });

  it('should open the end round dialog, not leave, when the player goes back', async () => {
    await startTenCardRound();

    act(() => router.back());

    expect(currentPathname()).toBe(playRoute);
    expect(screen.getByRole('header', { name: copy.roundPlay.endDialogTitle })).toBeOnTheScreen();
  });

  it('should stay on the round when the player goes back and chooses Keep playing', async () => {
    await startTenCardRound();
    act(() => router.back());

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.endDialogCancel }));

    expect(currentPathname()).toBe(playRoute);
    expect(
      screen.queryByRole('header', { name: copy.roundPlay.endDialogTitle }),
    ).not.toBeOnTheScreen();
  });

  it('should show the summary when the player ends the round before the first card', async () => {
    await startTenCardRound();
    act(() => router.back());

    // The Pass the phone screen has no End round control of its own, so this is the dialog's.
    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.endDialogConfirm }));
    await waitFor(() => expect(currentPathname()).toBe(summaryRoute));

    expect(
      screen.getByRole('group', { name: /^Player A, 0 dares done, 0 drinks/ }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('group', { name: /^Player B, 0 dares done, 0 drinks/ }),
    ).toBeOnTheScreen();
  });

  it('should go back to setup, not to the finished round, from the summary with the back gesture', async () => {
    await startTenCardRound();
    playUntilTheSummary();
    await waitFor(() => expect(currentPathname()).toBe(summaryRoute));

    act(() => router.back());
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));
  });
});
