// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, displayNames, fillCopy } from '@getfreak/content';
import type { Deck } from '@getfreak/core';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

const mockDecks: Deck[] = [];

// The decks are read when they are used, because this factory runs before the array above exists.
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return Object.defineProperty({ ...actual }, 'decks', { get: () => mockDecks, enumerable: true });
});

const testDeck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [{ id: 'card-1', category: 'c1', kind: 'solo', text: 'Card 1', source: 'shipped' }],
};

const setupRoute = '/games/dares/setup';
const playRoute = '/games/dares/play';

function enterNames(first: string, second: string) {
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), first);
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), second);
}

async function pressStart() {
  fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.start }));
  // Saving the names finishes after the press, so the test waits for that to settle.
  await act(async () => {});
}

describe('round setup in the route tree', () => {
  beforeEach(async () => {
    mockDecks.splice(0, mockDecks.length, testDeck);
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  it('should open from the hub tile', async () => {
    await launchApp('/');

    fireEvent.press(screen.getByRole('button', { name: displayNames.dares.title }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    expect(screen.getByRole('header', { name: copy.roundSetup.title })).toBeOnTheScreen();
  });

  it('should go back to the hub with the back button', async () => {
    await launchApp('/');
    fireEvent.press(screen.getByRole('button', { name: displayNames.dares.title }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe('/'));

    expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
  });

  it('should open straight from a deep link', async () => {
    await launchApp(setupRoute);

    expect(currentPathname()).toBe(setupRoute);
    expect(screen.getByRole('header', { name: copy.roundSetup.title })).toBeOnTheScreen();
  });

  it('should open the round screen from Start, asking for the phone to go to the first player', async () => {
    await launchApp(setupRoute);
    enterNames('Player A', 'Player B');

    await pressStart();
    await waitFor(() => expect(currentPathname()).toBe(playRoute));

    expect(
      screen.getByRole('header', {
        name: fillCopy(copy.roundPlay.handoffTitle, { name: 'Player A' }),
      }),
    ).toBeOnTheScreen();
  });

  it('should say the round has no cards when no deck ships', async () => {
    mockDecks.splice(0, mockDecks.length);
    await launchApp(setupRoute);
    enterNames('Player A', 'Player B');

    await pressStart();
    await waitFor(() => expect(currentPathname()).toBe(playRoute));

    expect(screen.getByText(copy.roundPlay.noCards)).toBeOnTheScreen();
  });

  it('should fall back to setup from a round screen opened by a deep link', async () => {
    await launchApp(playRoute);
    expect(screen.getByText(copy.roundPlay.noCards)).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    expect(screen.getByRole('header', { name: copy.roundSetup.title })).toBeOnTheScreen();
  });

  it('should remember the names for the next launch', async () => {
    await launchApp(setupRoute);
    enterNames('Player A', 'Player B');
    await pressStart();
    await waitFor(() => expect(currentPathname()).toBe(playRoute));

    await launchApp(setupRoute);

    expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveDisplayValue('Player A');
    expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveDisplayValue('Player B');
  });
});
