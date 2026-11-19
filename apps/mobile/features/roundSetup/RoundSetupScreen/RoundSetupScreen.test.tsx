import { categoryNames, copy, levelNames } from '@getfreak/content';
import { startRound, type Deck } from '@getfreak/core';
import { act, waitFor } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { KeyboardAvoidingView } from 'react-native';
import type { ReactNode } from 'react';

import { createInMemoryBackend } from '../../../storage/createInMemoryBackend';
import { createStorage } from '../../../storage/createStorage';
import type { Storage } from '../../../storage';
import { SettingsProvider, useSettings } from '../../../settings';
import { renderThemed } from '../../../tailwind/renderThemed';
import { RoundProvider } from '../../round/RoundProvider';
import { playableSurprises } from '../../roundPlay/playableSurprises';
import { RoundSetupScreen } from './RoundSetupScreen';

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

const testDeck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [
    { id: 'card-1', category: 'c1', kind: 'solo', text: 'Card 1', source: 'shipped' },
    { id: 'card-2', category: 'c2', kind: 'solo', text: 'Card 2', source: 'shipped' },
  ],
};

// The seed the screen builds from a random source that always gives one half.
const seedFromHalf = 2147483648;

// The screen reads the remembered names when it first renders, and the app only renders it once the
// settings have loaded, so the test does the same.
function AfterSettingsLoad({ children }: { children: ReactNode }) {
  return useSettings().isLoading ? null : children;
}

async function renderSetup(storage: Storage = createStorage(createInMemoryBackend())) {
  await renderThemed(
    <SettingsProvider storage={storage}>
      <AfterSettingsLoad>
        <RoundProvider>
          <RoundSetupScreen />
        </RoundProvider>
      </AfterSettingsLoad>
    </SettingsProvider>,
  );
  await screen.findByRole('header', { name: copy.roundSetup.title });
}

function enterNames(first: string, second: string) {
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), first);
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), second);
}

const startButton = () => screen.getByRole('button', { name: copy.roundSetup.start });

// Saving the names finishes after the press, so the test waits for that to settle.
async function pressStart() {
  fireEvent.press(startButton());
  await act(async () => {});
}

const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;

describe('RoundSetupScreen', () => {
  beforeEach(() => {
    mockDecks.splice(0, mockDecks.length, testDeck);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    jest.mocked(startRound).mockClear();
    mockCanGoBack = true;
  });

  describe('the screen', () => {
    it('should show the title as the heading', async () => {
      await renderSetup();

      expect(screen.getByRole('header', { name: copy.roundSetup.title })).toBeOnTheScreen();
    });

    it('should go back from the back button', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.backLabel }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should fall back to the first screen when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderSetup();

      fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith('/');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should move its content out of the way of the keyboard', async () => {
      await renderSetup();

      // React Native has no role or label to find this view by, so it is found by its type.
      expect(screen.UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
    });

    it('should show the surprises switch on, with its caption', async () => {
      await renderSetup();

      expect(
        screen.getByRole('switch', { name: copy.roundSetup.surprises, checked: true }),
      ).toBeOnTheScreen();
      expect(screen.getByText(copy.roundSetup.surprisesCaption)).toBeOnTheScreen();
    });

    it('should turn the surprises switch off when it is pressed', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.surprises }));

      expect(
        screen.getByRole('switch', { name: copy.roundSetup.surprises, checked: false }),
      ).toBeOnTheScreen();
    });
  });

  describe('the names', () => {
    it('should have a labelled field for each player', async () => {
      await renderSetup();

      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toBeOnTheScreen();
      expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toBeOnTheScreen();
    });

    it('should start empty when no names are remembered', async () => {
      await renderSetup();

      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveDisplayValue('');
      expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveDisplayValue('');
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

    it('should limit each name to 20 characters', async () => {
      await renderSetup();

      expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveProp('maxLength', 20);
      expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveProp('maxLength', 20);
    });
  });

  describe('the Start button', () => {
    it('should be disabled until both names are entered', async () => {
      await renderSetup();
      expect(
        screen.getByRole('button', { name: copy.roundSetup.start, disabled: true }),
      ).toBeTruthy();

      fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), 'Player A');
      expect(
        screen.getByRole('button', { name: copy.roundSetup.start, disabled: true }),
      ).toBeTruthy();

      fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), 'Player B');
      expect(
        screen.getByRole('button', { name: copy.roundSetup.start, disabled: false }),
      ).toBeTruthy();
    });

    it('should stay disabled while a name is only spaces', async () => {
      await renderSetup();

      enterNames('Player A', '   ');

      expect(
        screen.getByRole('button', { name: copy.roundSetup.start, disabled: true }),
      ).toBeTruthy();
    });

    it('should not start a round when it is pressed while disabled', async () => {
      await renderSetup();
      enterNames('Player A', '  ');

      fireEvent.press(startButton());

      expect(startRound).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('the level', () => {
    it('should offer the three levels by name, with the second checked', async () => {
      await renderSetup();

      expect(screen.getAllByRole('radio', { name: levelNames.l1 })).toHaveLength(1);
      expect(screen.getByRole('radio', { name: levelNames.l2, checked: true })).toBeOnTheScreen();
      expect(screen.getByRole('radio', { name: levelNames.l3, checked: false })).toBeOnTheScreen();
    });

    it('should show the categories of the first two levels for the second level', async () => {
      await renderSetup();

      // The surprises switch is on too, so the two category switches make three.
      expect(screen.getAllByRole('switch', { checked: true, name: /./ })).toHaveLength(3);
      expect(screen.getByRole('switch', { name: categoryNames.c1 })).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: categoryNames.c2 })).toBeOnTheScreen();
      expect(screen.queryByRole('switch', { name: categoryNames.c3 })).not.toBeOnTheScreen();
    });

    it('should show all four categories for the third level', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('radio', { name: levelNames.l3 }));

      [categoryNames.c1, categoryNames.c2, categoryNames.c3, categoryNames.c4].forEach((name) =>
        expect(screen.getByRole('switch', { name, checked: true })).toBeOnTheScreen(),
      );
    });

    it('should show only the mildest category for the first level', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('radio', { name: levelNames.l1 }));

      expect(screen.getByRole('switch', { name: categoryNames.c1 })).toBeOnTheScreen();
      expect(screen.queryByRole('switch', { name: categoryNames.c2 })).not.toBeOnTheScreen();
    });

    it('should switch every category of the new level on when the level changes', async () => {
      await renderSetup();
      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      fireEvent.press(screen.getByRole('radio', { name: levelNames.l3 }));

      expect(
        screen.getByRole('switch', { name: categoryNames.c2, checked: true }),
      ).toBeOnTheScreen();
    });
  });

  describe('the categories', () => {
    it('should switch a category off and on again', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));
      expect(screen.getByRole('switch', { name: categoryNames.c2, checked: false })).toBeTruthy();

      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));
      expect(screen.getByRole('switch', { name: categoryNames.c2, checked: true })).toBeTruthy();
    });

    it('should not show the hint while more than one category is on', async () => {
      await renderSetup();

      expect(screen.queryByText(copy.roundSetup.lastCategoryHint)).not.toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: categoryNames.c1, disabled: false })).toBeTruthy();
    });

    it('should lock the last category that is on and show the hint', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      expect(
        screen.getByRole('switch', { name: categoryNames.c1, checked: true, disabled: true }),
      ).toBeOnTheScreen();
      expect(screen.getByText(copy.roundSetup.lastCategoryHint)).toBeOnTheScreen();
    });

    it('should not switch the last category off', async () => {
      await renderSetup();
      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c1 }));

      expect(
        screen.getByRole('switch', { name: categoryNames.c1, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should give the locked category the hint as its accessibility hint', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      expect(screen.getByRole('switch', { name: categoryNames.c1 })).toHaveProp(
        'accessibilityHint',
        copy.roundSetup.lastCategoryHint,
      );
    });

    it('should lock the only category of the first level', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('radio', { name: levelNames.l1 }));

      expect(
        screen.getByRole('switch', { name: categoryNames.c1, checked: true, disabled: true }),
      ).toBeOnTheScreen();
      expect(screen.getByText(copy.roundSetup.lastCategoryHint)).toBeOnTheScreen();
    });

    it('should unlock the other category when it is switched back on', async () => {
      await renderSetup();
      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      expect(screen.getByRole('switch', { name: categoryNames.c1, disabled: false })).toBeTruthy();
      expect(screen.queryByText(copy.roundSetup.lastCategoryHint)).not.toBeOnTheScreen();
    });
  });

  describe('the round length', () => {
    it('should offer 10 cards, 20 cards and endless, with 20 checked', async () => {
      await renderSetup();

      expect(
        screen.getByRole('radio', { name: copy.roundSetup.lengthTen, checked: false }),
      ).toBeTruthy();
      expect(
        screen.getByRole('radio', { name: copy.roundSetup.lengthTwenty, checked: true }),
      ).toBeTruthy();
      expect(
        screen.getByRole('radio', { name: copy.roundSetup.lengthEndless, checked: false }),
      ).toBeTruthy();
    });

    it('should check the length that is pressed', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('radio', { name: copy.roundSetup.lengthEndless }));

      expect(
        screen.getByRole('radio', { name: copy.roundSetup.lengthEndless, checked: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('radio', { name: copy.roundSetup.lengthTwenty, checked: false }),
      ).toBeOnTheScreen();
    });
  });

  describe('starting the round', () => {
    it('should start a round with the default choices and open the round screen', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(startRound).toHaveBeenCalledTimes(1);
      expect(startRound).toHaveBeenCalledWith(
        {
          players: ['Player A', 'Player B'],
          level: 'l2',
          enabledCategories: ['c1', 'c2'],
          length: 20,
          seed: seedFromHalf,
          surprises: playableSurprises,
        },
        testDeck,
      );
      expect(mockPush).toHaveBeenCalledWith('/games/dares/play');
    });

    it('should start the round with the surprises the play screen can show when the switch is on', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(startRound).toHaveBeenCalledWith(
        expect.objectContaining({ surprises: playableSurprises }),
        testDeck,
      );
    });

    it('should start the round with no surprises when the switch is off', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');
      fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.surprises }));

      await pressStart();

      expect(startRound).toHaveBeenCalledWith(expect.objectContaining({ surprises: [] }), testDeck);
    });

    it('should have the surprises switch on again each time the screen opens', async () => {
      await renderSetup();
      fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.surprises }));
      screen.unmount();

      await renderSetup();

      expect(
        screen.getByRole('switch', { name: copy.roundSetup.surprises, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should start the round with the level, categories and length that were chosen', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');
      fireEvent.press(screen.getByRole('radio', { name: levelNames.l3 }));
      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));
      fireEvent.press(screen.getByRole('radio', { name: copy.roundSetup.lengthEndless }));

      await pressStart();

      expect(startRound).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'l3',
          enabledCategories: ['c1', 'c3', 'c4'],
          length: 'endless',
        }),
        testDeck,
      );
    });

    it('should start the round with the names trimmed', async () => {
      await renderSetup();
      enterNames('  Player A ', ' Player B  ');

      await pressStart();

      expect(startRound).toHaveBeenCalledWith(
        expect.objectContaining({ players: ['Player A', 'Player B'] }),
        testDeck,
      );
    });

    it('should start one round and open one round screen when Start is pressed twice', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');

      fireEvent.press(startButton());
      fireEvent.press(startButton());
      await act(async () => {});

      expect(startRound).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('should use the first deck that ships', async () => {
      const otherDeck: Deck = { ...testDeck, id: 'other-deck' };
      mockDecks.splice(0, mockDecks.length, testDeck, otherDeck);
      await renderSetup();
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(jest.mocked(startRound).mock.calls[0]?.[1]).toBe(testDeck);
    });

    it('should still start, with a deck of no cards, while no deck ships', async () => {
      mockDecks.splice(0, mockDecks.length);
      await renderSetup();
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(jest.mocked(startRound).mock.calls[0]?.[1].cards).toEqual([]);
      expect(mockPush).toHaveBeenCalledWith('/games/dares/play');
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

    it('should still start the round when the names cannot be saved', async () => {
      const failingStorage: Storage = {
        ...createStorage(createInMemoryBackend()),
        set: () => Promise.reject(new Error('The write failed')),
      };
      await renderSetup(failingStorage);
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(startRound).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith('/games/dares/play');
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
