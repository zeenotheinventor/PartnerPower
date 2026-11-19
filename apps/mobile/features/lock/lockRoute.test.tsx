// This import comes first so that its mocks are in place before Expo Router loads.
import {
  backend,
  currentPathname,
  launchApp,
  launchUnlockedApp,
  storedPinHash,
  testPin,
} from '../welcome/testing/appEnvironment';

import { copy, fillCopy } from '@getfreak/content';
import type { Card, CategoryId, Deck } from '@getfreak/core';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { BackHandler, Modal } from 'react-native';

import { changeAppState, fakeAppState } from '../../lock/testing/fakeAppState';

const mockDecks: Deck[] = [];

// The decks are read when they are used, because this factory runs before the array above exists.
jest.mock('@getfreak/content', () => {
  const actual = jest.requireActual<typeof import('@getfreak/content')>('@getfreak/content');
  return Object.defineProperty({ ...actual }, 'decks', { get: () => mockDecks, enumerable: true });
});

// The secure store is a native module, so the test gets an in-memory one. The items stand for what
// a phone that has a lock holds, and they stay across a "restart", which is a second launch.
const mockSecureItems = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: (key: string) => Promise.resolve(mockSecureItems.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    mockSecureItems.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    mockSecureItems.delete(key);
    return Promise.resolve();
  },
}));

// The hash is the real SHA-256, so the PIN that is stored can be checked. The native module is not
// available under Jest.
jest.mock('expo-crypto', () => {
  const { sha256Hex } = jest.requireActual<typeof import('../../lock/testing/sha256Hex')>(
    '../../lock/testing/sha256Hex',
  );
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: (_algorithm: string, text: string) => Promise.resolve(sha256Hex(text)),
    getRandomBytes: (byteCount: number) => Uint8Array.from({ length: byteCount }, (_, i) => i),
  };
});

function makeCards(category: CategoryId): Card[] {
  const solos: Card[] = [1, 2, 3, 4, 5].map((number) => ({
    id: `${category}-solo-${number}`,
    category,
    kind: 'solo',
    text: `Card ${category} solo ${number}`,
    source: 'shipped',
  }));
  return solos;
}

const testDeck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [...makeCards('c1'), ...makeCards('c2')],
};

const setupRoute = '/games/dares/setup';
const playRoute = '/games/dares/play';
const hubRoute = '/';
const settingsRoute = '/settings';

async function settle(milliseconds = 1000) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(milliseconds);
  });
}

async function typePin(pin: string) {
  [...pin].forEach((key) => fireEvent.press(screen.getByRole('button', { name: key })));
  await settle(200);
}

/** The app goes to the background, stays away, and comes back. */
async function awayFor(milliseconds: number) {
  await changeAppState('background');
  await settle(milliseconds);
  await changeAppState('active');
  await settle(1);
}

const lockHeading = () => screen.queryByRole('header', { name: copy.lock.title });
const cardCount = (number: number) => fillCopy(copy.roundPlay.cardCount, { number, length: 10 });

async function startTenCardRound() {
  await launchUnlockedApp(setupRoute);
  fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.surprises }));
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), 'Player A');
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), 'Player B');
  fireEvent.press(screen.getByRole('radio', { name: copy.roundSetup.lengthTen }));
  fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.start }));
  await act(async () => {});
  await waitFor(() => expect(currentPathname()).toBe(playRoute));
}

/** Presses whatever moves the round on, until the play screen shows the given card. */
async function playUntilCard(number: number) {
  const nextButtons = [
    copy.roundPlay.handoffButton,
    copy.roundPlay.stepUpButton,
    copy.roundPlay.flip,
    copy.roundPlay.done,
    copy.roundPlay.togetherDone,
  ];
  for (let presses = 0; presses < 40; presses += 1) {
    if (screen.queryByText(cardCount(number))) return;
    const name = nextButtons.find((label) => screen.queryByRole('button', { name: label }));
    if (!name) throw new Error('The play screen has nothing to press');
    fireEvent.press(screen.getByRole('button', { name }));
    // A flipped card shows once Reanimated reports the turn, a moment after the press.
    await settle(1);
  }
  throw new Error(`The round never reached card ${number}`);
}

describe('the lock in the real route tree', () => {
  beforeEach(async () => {
    mockDecks.splice(0, mockDecks.length, testDeck);
    fakeAppState();
    await backend.clear();
    mockSecureItems.clear();
    await backend.setItem('entryConfirmation', 'true');
    await backend.setItem('installMarker', 'true');
    mockSecureItems.set('lockPinHash', storedPinHash());
  });

  afterEach(() => jest.restoreAllMocks());

  describe('on a cold start', () => {
    it('should cover the app with the lock screen before any screen shows', async () => {
      await launchApp(hubRoute);

      expect(lockHeading()).toBeOnTheScreen();
      expect(screen.queryByText(copy.hub.greeting)).toBeNull();
    });

    it('should show the hub once the PIN is typed', async () => {
      await launchApp(hubRoute);

      await typePin(testPin);

      expect(lockHeading()).toBeNull();
      expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
    });

    it('should show no lock screen when the lock is off', async () => {
      mockSecureItems.clear();

      await launchApp(hubRoute);

      expect(lockHeading()).toBeNull();
      expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
    });
  });

  describe('a round in progress', () => {
    it('should be on card 3 after a lock and an unlock', async () => {
      await startTenCardRound();
      await playUntilCard(3);
      expect(screen.getByText(cardCount(3))).toBeOnTheScreen();

      await awayFor(60_000);

      expect(lockHeading()).toBeOnTheScreen();
      expect(screen.queryByText(cardCount(3))).toBeNull();

      await typePin(testPin);

      expect(lockHeading()).toBeNull();
      expect(currentPathname()).toBe(playRoute);
      expect(screen.getByText(cardCount(3))).toBeOnTheScreen();
    });

    it('should not lock, and stay on card 3, after a trip shorter than 60 seconds', async () => {
      await startTenCardRound();
      await playUntilCard(3);

      await awayFor(59_000);

      expect(lockHeading()).toBeNull();
      expect(screen.getByText(cardCount(3))).toBeOnTheScreen();
    });
  });

  describe('a deep link', () => {
    it('should open behind the lock on a cold start, and show only after unlocking', async () => {
      await launchApp(settingsRoute);

      expect(currentPathname()).toBe(settingsRoute);
      expect(lockHeading()).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: copy.settings.title })).toBeNull();

      await typePin(testPin);

      expect(screen.getByRole('header', { name: copy.settings.title })).toBeOnTheScreen();
    });

    it('should open behind the lock when the app is already open and locked', async () => {
      await launchUnlockedApp(hubRoute);
      await awayFor(60_000);
      expect(lockHeading()).toBeOnTheScreen();

      act(() => router.push(settingsRoute));
      await settle(100);

      expect(lockHeading()).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: copy.settings.title })).toBeNull();

      await typePin(testPin);

      expect(currentPathname()).toBe(settingsRoute);
      expect(screen.getByRole('header', { name: copy.settings.title })).toBeOnTheScreen();
    });
  });

  describe('the Android back button', () => {
    it('should neither dismiss the lock screen nor show the app behind it', async () => {
      const handlers: ((...args: never[]) => boolean | null | undefined)[] = [];
      jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
        handlers.push(handler);
        return { remove: () => handlers.splice(handlers.indexOf(handler), 1) };
      });
      await launchApp(settingsRoute);

      // The newest handler is asked first, and the lock's answers that it took the press.
      expect(handlers.at(-1)?.()).toBe(true);
      act(() => screen.UNSAFE_getByType(Modal).props.onRequestClose());
      await settle(100);

      expect(lockHeading()).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: copy.settings.title })).toBeNull();
      expect(screen.queryByText(copy.hub.greeting)).toBeNull();
    });
  });

  describe('wrong PINs', () => {
    it('should keep the wait across a restart', async () => {
      const wrongPin = '1111';
      const view = await launchApp(hubRoute);
      for (let attempt = 0; attempt < 5; attempt += 1) await typePin(wrongPin);
      expect(screen.getByRole('button', { name: '1', disabled: true })).toBeOnTheScreen();

      // The app is closed and opened again. The secure store keeps the end of the wait.
      view.unmount();
      await launchApp(hubRoute);

      expect(lockHeading()).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: '1', disabled: true })).toBeOnTheScreen();
      expect(screen.getByText(/Too many tries/)).toBeOnTheScreen();

      await settle(30_000);
      await typePin(testPin);

      expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
    });
  });

  describe('Forgot PIN', () => {
    it('should wipe everything and land on the 18+ confirmation', async () => {
      await backend.setItem('playerNames', JSON.stringify(['Name 1', 'Name 2']));
      await launchApp(hubRoute);

      fireEvent.press(screen.getByRole('button', { name: copy.lock.forgot }));
      expect(screen.getByRole('header', { name: copy.clear.forgotTitle })).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: copy.clear.confirm }));
      await settle(1000);

      await waitFor(() => expect(currentPathname()).toBe('/welcome'));
      expect(screen.getByRole('button', { name: copy.welcome.confirmLabel })).toBeOnTheScreen();
      expect(lockHeading()).toBeNull();
      expect(mockSecureItems.size).toBe(0);
      expect(await backend.getItem('playerNames')).toBeNull();
    });

    it('should leave everything as it was when the player cancels', async () => {
      await launchApp(hubRoute);
      fireEvent.press(screen.getByRole('button', { name: copy.lock.forgot }));

      fireEvent.press(screen.getByRole('button', { name: copy.clear.cancel }));

      expect(lockHeading()).toBeOnTheScreen();
      expect(mockSecureItems.has('lockPinHash')).toBe(true);
    });
  });
});
