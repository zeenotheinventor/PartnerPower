// This import comes first so that its mocks are in place before Expo Router loads.
import {
  backend,
  currentPathname,
  feedbackDevice,
  launchApp,
} from '../features/welcome/testing/appEnvironment';

import { copy } from '@getfreak/content';
import type { Card, CategoryId, Deck } from '@getfreak/core';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

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
    source: 'shipped',
    text: `Card ${category} solo ${number}`,
  }));
  const together: Card = {
    id: `${category}-together`,
    category,
    kind: 'together',
    source: 'shipped',
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
const settingsRoute = '/settings';

const playSound = jest.mocked(feedbackDevice.playSound);
const triggerHaptic = jest.mocked(feedbackDevice.triggerHaptic);

const roundCompleteCount = () =>
  triggerHaptic.mock.calls.filter(([moment]) => moment === 'roundComplete').length;

async function startTenCardRound() {
  await launchApp(setupRoute);
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), 'Player A');
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), 'Player B');
  fireEvent.press(screen.getByRole('radio', { name: copy.roundSetup.lengthTen }));
  // Surprises are on by default. This round is the plain one.
  fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.surprises }));
  fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.start }));
  // Saving the names finishes after the press, so the test waits for that to settle.
  await act(async () => {});
  await waitFor(() => expect(currentPathname()).toBe(playRoute));
}

const stepButtons = [copy.roundPlay.handoffButton, copy.roundPlay.stepUpButton];

/** Presses the pass the phone and step up buttons until a card is showing. */
function reachACard() {
  for (let presses = 0; presses < 5; presses += 1) {
    const name = stepButtons.find((label) => screen.queryByRole('button', { name: label }));
    if (!name) return;
    fireEvent.press(screen.getByRole('button', { name }));
  }
}

/** Plays cards with Done until a card with the given button shows. */
function playUntilButton(label: string) {
  for (let presses = 0; presses < 60; presses += 1) {
    reachACard();
    if (screen.queryByRole('button', { name: label })) return;
    const done =
      screen.queryByRole('button', { name: copy.roundPlay.done }) ??
      screen.queryByRole('button', { name: copy.roundPlay.togetherDone });
    if (!done) throw new Error('The play screen has nothing to press');
    fireEvent.press(done);
  }
  throw new Error(`No card showed the ${label} button`);
}

function playUntilTheSummary() {
  for (let presses = 0; presses < 60 && currentPathname() === playRoute; presses += 1) {
    reachACard();
    const done =
      screen.queryByRole('button', { name: copy.roundPlay.done }) ??
      screen.queryByRole('button', { name: copy.roundPlay.togetherDone });
    if (!done) throw new Error('The play screen has nothing to press');
    fireEvent.press(done);
  }
}

// A repeated render or a late timer would show up as a second call, so the test lets time pass.
async function letTimePass() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
}

describe('press feedback in the route tree', () => {
  beforeEach(async () => {
    mockDecks.splice(0, mockDecks.length, testDeck);
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
    jest.clearAllMocks();
  });

  describe('the hub and the settings screen', () => {
    it('should open the settings screen from the hub, and come back with the back button', async () => {
      await launchApp('/');

      fireEvent.press(screen.getByRole('button', { name: copy.hub.settings }));
      await waitFor(() => expect(currentPathname()).toBe(settingsRoute));
      expect(screen.getByRole('header', { name: copy.settings.title })).toBeOnTheScreen();

      fireEvent.press(screen.getByRole('button', { name: copy.settings.backLabel }));
      await waitFor(() => expect(currentPathname()).toBe('/'));
    });

    it('should open the settings screen straight from a deep link', async () => {
      await launchApp(settingsRoute);

      expect(currentPathname()).toBe(settingsRoute);
      expect(screen.getByRole('switch', { name: copy.settings.soundsLabel })).toBeChecked();
    });

    it('should give a button on the hub the ordinary tap, sound and haptic together', async () => {
      await launchApp('/');

      fireEvent.press(screen.getByRole('button', { name: copy.hub.settings }));

      expect(playSound).toHaveBeenCalledTimes(1);
      expect(playSound).toHaveBeenCalledWith('tap');
      expect(triggerHaptic).toHaveBeenCalledTimes(1);
      expect(triggerHaptic).toHaveBeenCalledWith('tap');
    });

    it('should store the sound switch, and play no sound after it is turned off', async () => {
      await launchApp(settingsRoute);

      await act(async () =>
        fireEvent.press(screen.getByRole('switch', { name: copy.settings.soundsLabel })),
      );
      expect(await backend.getItem('soundOn')).toBe('false');
      fireEvent.press(screen.getByRole('button', { name: copy.settings.backLabel }));
      await waitFor(() => expect(currentPathname()).toBe('/'));
      jest.clearAllMocks();
      fireEvent.press(screen.getByRole('button', { name: copy.hub.settings }));

      expect(playSound).not.toHaveBeenCalled();
      expect(triggerHaptic).toHaveBeenCalledWith('tap');
    });

    it('should store the vibration switch, and fire no haptic after it is turned off', async () => {
      await launchApp(settingsRoute);

      await act(async () =>
        fireEvent.press(screen.getByRole('switch', { name: copy.settings.vibrationLabel })),
      );
      expect(await backend.getItem('hapticsOn')).toBe('false');
      fireEvent.press(screen.getByRole('button', { name: copy.settings.backLabel }));
      await waitFor(() => expect(currentPathname()).toBe('/'));
      jest.clearAllMocks();
      fireEvent.press(screen.getByRole('button', { name: copy.hub.settings }));

      expect(triggerHaptic).not.toHaveBeenCalled();
      expect(playSound).toHaveBeenCalledWith('tap');
    });

    it('should keep the stored switches the next time the app opens', async () => {
      await backend.setItem('soundOn', 'false');
      await backend.setItem('hapticsOn', 'false');
      await launchApp(settingsRoute);

      expect(screen.getByRole('switch', { name: copy.settings.soundsLabel })).not.toBeChecked();
      expect(screen.getByRole('switch', { name: copy.settings.vibrationLabel })).not.toBeChecked();
    });
  });

  describe('the turn buttons', () => {
    it('should give Done its own sound and haptic, and Pass its own', async () => {
      await startTenCardRound();
      reachACard();

      jest.clearAllMocks();
      fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.done }));
      expect(playSound.mock.calls).toEqual([['done']]);
      expect(triggerHaptic.mock.calls).toEqual([['done']]);

      reachACard();
      jest.clearAllMocks();
      fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.pass }));
      expect(playSound.mock.calls).toEqual([['pass']]);
      expect(triggerHaptic.mock.calls).toEqual([['pass']]);
    });

    it('should give the together card actions the same pair', async () => {
      await startTenCardRound();
      playUntilButton(copy.roundPlay.togetherDone);

      jest.clearAllMocks();
      fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.togetherPass }));
      expect(playSound.mock.calls).toEqual([['pass']]);
      expect(triggerHaptic.mock.calls).toEqual([['pass']]);

      reachACard();
      playUntilButton(copy.roundPlay.togetherDone);
      jest.clearAllMocks();
      fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.togetherDone }));
      expect(playSound.mock.calls).toEqual([['done']]);
      // The round may end on this card, which adds the round complete haptic after the press.
      expect(triggerHaptic.mock.calls[0]).toEqual(['done']);
      // The summary may now be up, and its list of cards reads the favourites after it shows.
      await act(async () => {});
    });

    it('should play and fire nothing when both switches are off', async () => {
      await backend.setItem('soundOn', 'false');
      await backend.setItem('hapticsOn', 'false');
      await startTenCardRound();
      reachACard();

      fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.done }));

      expect(playSound).not.toHaveBeenCalled();
      expect(triggerHaptic).not.toHaveBeenCalled();
    });
  });

  describe('the round complete haptic', () => {
    it('should fire once when the round ends by itself', async () => {
      await startTenCardRound();

      playUntilTheSummary();
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));
      await act(async () => {});
      await letTimePass();

      expect(roundCompleteCount()).toBe(1);
    });

    it('should fire once when the round is ended early', async () => {
      await startTenCardRound();
      reachACard();

      fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.endRound }));
      const dialog = screen.getByLabelText(copy.roundPlay.endDialogTitle);
      fireEvent.press(
        within(dialog).getByRole('button', { name: copy.roundPlay.endDialogConfirm }),
      );
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));
      await act(async () => {});
      await letTimePass();

      expect(roundCompleteCount()).toBe(1);
    });

    it('should not fire before the round is over', async () => {
      await startTenCardRound();
      reachACard();
      fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.done }));
      reachACard();
      fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.pass }));

      expect(roundCompleteCount()).toBe(0);
    });

    it('should fire once more for each new round, and not again for the same summary', async () => {
      await startTenCardRound();
      playUntilTheSummary();
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));
      await act(async () => {});
      await letTimePass();

      fireEvent.press(screen.getByRole('button', { name: copy.roundSummary.playAgain }));
      await waitFor(() => expect(currentPathname()).toBe(playRoute));
      expect(roundCompleteCount()).toBe(1);

      playUntilTheSummary();
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));
      await act(async () => {});
      await letTimePass();

      expect(roundCompleteCount()).toBe(2);
    });

    it('should fire nothing when the vibration switch is off', async () => {
      await backend.setItem('hapticsOn', 'false');
      await startTenCardRound();

      playUntilTheSummary();
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));
      await act(async () => {});
      await letTimePass();

      expect(triggerHaptic).not.toHaveBeenCalled();
    });

    it('should play the round complete jingle once, with the haptic', async () => {
      await startTenCardRound();
      playUntilTheSummary();
      await waitFor(() => expect(currentPathname()).toBe(summaryRoute));
      await act(async () => {});
      jest.clearAllMocks();

      await letTimePass();

      expect(playSound.mock.calls).toEqual([['roundComplete']]);
    });
  });
});
