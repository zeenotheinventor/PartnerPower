import { categoryNames, copy, fillCopy, levelNames } from '@getfreak/content';
import { startRound, type Deck } from '@getfreak/core';
import { act, waitFor } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo, KeyboardAvoidingView } from 'react-native';
import { useEffect, type ReactElement, type ReactNode } from 'react';

import { createInMemoryBackend } from '../../../storage/createInMemoryBackend';
import { createStorage } from '../../../storage/createStorage';
import type { Storage } from '../../../storage';
import { SettingsProvider, useSettings } from '../../../settings';
import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import {
  DeckChoiceProvider,
  useDeckChoice,
  type DeckChoiceValue,
} from '../../decks/DeckChoiceProvider';
import { useOwnCards, type OwnCards } from '../../ownCards/OwnCardsProvider';
import { makeOwnCardsFixture } from '../../ownCards/testing/ownCardsFixture';
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

async function renderSetup(
  storage: Storage = createStorage(createInMemoryBackend()),
  ownCards = makeOwnCardsFixture(),
  probe: ReactElement = <></>,
) {
  await renderThemed(
    <SettingsProvider storage={storage}>
      <AfterSettingsLoad>
        <ownCards.Providers>
          <DeckChoiceProvider>
            <RoundProvider>
              <RoundSetupScreen />
            </RoundProvider>
            {probe}
          </DeckChoiceProvider>
        </ownCards.Providers>
      </AfterSettingsLoad>
    </SettingsProvider>,
  );
  await screen.findByRole('header', { name: copy.roundSetup.title });
  // The dares are read after the screen shows, and the row has no value until then.
  await screen.findByRole('button', { name: new RegExp(`^${copy.roundSetup.myDaresLabel}, `) });
}

function enterNames(first: string, second: string) {
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), first);
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), second);
}

// Gives a test the own dares hook of the providers around the screen, to change the dares.
function makeProbe() {
  const held: { current: OwnCards | undefined } = { current: undefined };
  function Probe() {
    const ownCards = useOwnCards();
    useEffect(() => {
      held.current = ownCards;
    });
    return null;
  }
  return { Probe, held };
}

// Gives a test the deck choice of the providers around the screen, to choose a deck as the picker does.
function makeChoiceProbe() {
  const held: { current: DeckChoiceValue | undefined } = { current: undefined };
  function ChoiceProbe() {
    const deckChoice = useDeckChoice();
    useEffect(() => {
      held.current = deckChoice;
    });
    return null;
  }
  return { ChoiceProbe, held };
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

  describe('the character in the header', () => {
    const mei = {
      props: { character: 'dealer', mood: 'flirty', size: 'tile', crop: 'head' },
      isHiddenFromScreenReaders: true,
    };
    const nyx = {
      props: { character: 'gatekeeper', mood: 'happy', size: 'tile', crop: 'head' },
      isHiddenFromScreenReaders: true,
    };

    it('should show Mei while more than one category is on', async () => {
      await renderSetup();

      expect(drawnCharacters()).toEqual([mei]);
    });

    it('should give the spot to Nyx when one category is left on', async () => {
      await renderSetup();

      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      expect(drawnCharacters()).toEqual([nyx]);
    });

    it('should give the spot back to Mei when another category is switched on', async () => {
      await renderSetup();
      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

      expect(drawnCharacters()).toEqual([mei]);
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

  describe('my dares', () => {
    const myDaresRow = (value: string) =>
      screen.getByRole('button', {
        name: fillCopy(copy.roundSetup.myDaresRowName, {
          label: copy.roundSetup.myDaresLabel,
          value,
        }),
      });
    const mixSwitch = () => screen.queryByRole('switch', { name: copy.roundSetup.mixInMyDares });

    async function renderWithDares(count: number) {
      const fixture = makeOwnCardsFixture();
      for (let number = 1; number <= count; number += 1) {
        await fixture.repository.savePlayerCard({
          category: 'c2',
          kind: 'solo',
          text: `Placeholder dare ${number}`,
        });
      }
      await renderSetup(undefined, fixture);
      if (count > 0) await screen.findByRole('switch', { name: copy.roundSetup.mixInMyDares });
      return fixture;
    }

    it('should show the My dares row with none written yet', async () => {
      await renderSetup();

      expect(myDaresRow(copy.roundSetup.myDaresNone)).toBeOnTheScreen();
    });

    it('should show how many dares are written', async () => {
      await renderWithDares(3);

      expect(myDaresRow(fillCopy(copy.roundSetup.myDaresCount, { count: 3 }))).toBeOnTheScreen();
    });

    it('should open the list from the row', async () => {
      await renderSetup();

      fireEvent.press(myDaresRow(copy.roundSetup.myDaresNone));

      expect(mockPush).toHaveBeenCalledWith('/games/dares/my-dares');
    });

    it('should show no mix switch when there are no dares', async () => {
      await renderSetup();

      expect(mixSwitch()).not.toBeOnTheScreen();
    });

    it('should show the mix switch on by default once there is a dare', async () => {
      await renderWithDares(1);

      expect(
        screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should turn the mix switch off when it is pressed', async () => {
      await renderWithDares(1);

      fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares }));

      expect(
        screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares, checked: false }),
      ).toBeOnTheScreen();
    });

    it('should have the mix switch on again each time the screen opens', async () => {
      const fixture = await renderWithDares(1);
      fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares }));
      screen.unmount();

      await renderSetup(undefined, fixture);

      expect(
        await screen.findByRole('switch', { name: copy.roundSetup.mixInMyDares, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should start the round from the starter deck and the dares when the switch is on', async () => {
      await renderWithDares(2);
      enterNames('Player A', 'Player B');

      await pressStart();

      const [, deck] = jest.mocked(startRound).mock.calls[0] ?? [];
      expect(deck?.cards.map((card) => card.text)).toEqual([
        'Card 1',
        'Card 2',
        'Placeholder dare 1',
        'Placeholder dare 2',
      ]);
      expect(deck?.cards.slice(2).map((card) => card.source)).toEqual(['player', 'player']);
    });

    it('should start the round from the starter deck alone when the switch is off', async () => {
      await renderWithDares(2);
      fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares }));
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(jest.mocked(startRound).mock.calls[0]?.[1]).toBe(testDeck);
    });

    it('should start the round from the starter deck alone when there are no dares', async () => {
      await renderSetup();
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(jest.mocked(startRound).mock.calls[0]?.[1]).toBe(testDeck);
    });

    it('should show no value and hold Start until the dares have been read', async () => {
      const fixture = makeOwnCardsFixture({ holdLoad: true });
      await renderThemed(
        <SettingsProvider storage={createStorage(createInMemoryBackend())}>
          <AfterSettingsLoad>
            <fixture.Providers>
              <DeckChoiceProvider>
                <RoundProvider>
                  <RoundSetupScreen />
                </RoundProvider>
              </DeckChoiceProvider>
            </fixture.Providers>
          </AfterSettingsLoad>
        </SettingsProvider>,
      );
      await screen.findByRole('header', { name: copy.roundSetup.title });
      enterNames('Player A', 'Player B');

      expect(screen.getByRole('button', { name: copy.roundSetup.myDaresLabel })).toBeOnTheScreen();
      expect(screen.queryByText(copy.roundSetup.myDaresNone)).not.toBeOnTheScreen();
      expect(startButton()).toBeDisabled();

      await act(async () => {
        fixture.releaseLoad();
      });

      expect(myDaresRow(copy.roundSetup.myDaresNone)).toBeOnTheScreen();
      expect(startButton()).not.toBeDisabled();
    });

    it('should turn the mix switch back on when dares come back after there were none', async () => {
      const { Probe, held } = makeProbe();
      const fixture = makeOwnCardsFixture();
      const first = await fixture.repository.savePlayerCard({
        category: 'c2',
        kind: 'solo',
        text: 'Placeholder dare 1',
      });
      await renderSetup(undefined, fixture, <Probe />);
      await screen.findByRole('switch', { name: copy.roundSetup.mixInMyDares });
      fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares }));
      await act(async () => {
        if (first.ok) await held.current?.remove(first.saved.id);
      });
      expect(mixSwitch()).not.toBeOnTheScreen();

      await act(async () => {
        await held.current?.save({ category: 'c1', kind: 'solo', text: 'Placeholder dare 2' });
      });

      expect(
        screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares, checked: true }),
      ).toBeOnTheScreen();
    });

    it('should keep the mix switch off while dares are added to some', async () => {
      const { Probe, held } = makeProbe();
      const fixture = makeOwnCardsFixture();
      await fixture.repository.savePlayerCard({
        category: 'c2',
        kind: 'solo',
        text: 'Placeholder dare 1',
      });
      await renderSetup(undefined, fixture, <Probe />);
      await screen.findByRole('switch', { name: copy.roundSetup.mixInMyDares });
      fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares }));

      await act(async () => {
        await held.current?.save({ category: 'c1', kind: 'solo', text: 'Placeholder dare 2' });
      });

      expect(
        screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares, checked: false }),
      ).toBeOnTheScreen();
    });

    it('should leave the starter deck itself as it was', async () => {
      await renderWithDares(1);
      enterNames('Player A', 'Player B');

      await pressStart();

      expect(testDeck.cards).toHaveLength(2);
    });
  });

  describe('the deck', () => {
    const deckRow = (value: string) =>
      screen.getByRole('button', {
        name: fillCopy(copy.roundSetup.deckRowName, { label: copy.roundSetup.deckLabel, value }),
      });
    const mixSwitch = () => screen.queryByRole('switch', { name: copy.roundSetup.mixInMyDares });

    // Favourites are read from the store, so they are set before the screen shows. The cards of
    // the test deck have the ids card-1 and card-2 in the store, and each dare has an id of its own.
    async function renderWithFavourites({
      favouriteCardIds = [],
      dareCount = 0,
      favouriteDareCount = 0,
    }: { favouriteCardIds?: string[]; dareCount?: number; favouriteDareCount?: number } = {}) {
      const fixture = makeOwnCardsFixture({
        shippedTexts: testDeck.cards.map((card) => card.text),
      });
      for (const cardId of favouriteCardIds) await fixture.repository.setFavourite(cardId, true);
      for (let number = 1; number <= dareCount; number += 1) {
        const saved = await fixture.repository.savePlayerCard({
          category: 'c2',
          kind: 'solo',
          text: `Placeholder dare ${number}`,
        });
        if (saved.ok && number <= favouriteDareCount) {
          await fixture.repository.setFavourite(saved.saved.id, true);
        }
      }
      const { ChoiceProbe, held } = makeChoiceProbe();
      await renderSetup(undefined, fixture, <ChoiceProbe />);
      if (dareCount > 0) await screen.findByRole('switch', { name: copy.roundSetup.mixInMyDares });
      return held;
    }

    it('should show the Deck row with the starter deck chosen', async () => {
      await renderSetup();

      expect(deckRow(copy.decks.starter)).toBeOnTheScreen();
    });

    it('should open the picker from the row', async () => {
      await renderSetup();

      fireEvent.press(deckRow(copy.decks.starter));

      expect(mockPush).toHaveBeenCalledWith('/games/dares/decks');
    });

    it('should show the row above the My dares row', async () => {
      await renderSetup();

      const labels = screen.getAllByRole('button').map((button) => button.props.accessibilityLabel);
      const deckIndex = labels.indexOf(
        fillCopy(copy.roundSetup.deckRowName, {
          label: copy.roundSetup.deckLabel,
          value: copy.decks.starter,
        }),
      );
      const daresIndex = labels.findIndex((label) =>
        String(label).startsWith(`${copy.roundSetup.myDaresLabel}, `),
      );
      expect(deckIndex).toBeGreaterThanOrEqual(0);
      expect(deckIndex).toBeLessThan(daresIndex);
    });

    it('should show the name of the deck that is chosen in the picker', async () => {
      const held = await renderWithFavourites();

      act(() => held.current?.chooseDeck('favourites'));

      expect(deckRow(copy.decks.favourites)).toBeOnTheScreen();
    });

    it('should show the mix switch for the starter deck only', async () => {
      const held = await renderWithFavourites({ dareCount: 1 });
      expect(mixSwitch()).toBeOnTheScreen();

      act(() => held.current?.chooseDeck('favourites'));
      expect(mixSwitch()).not.toBeOnTheScreen();

      act(() => held.current?.chooseDeck('starter'));
      expect(mixSwitch()).toBeOnTheScreen();
    });

    it('should keep the My dares row when Favourites is chosen', async () => {
      const held = await renderWithFavourites({ dareCount: 1 });

      act(() => held.current?.chooseDeck('favourites'));

      expect(
        screen.getByRole('button', { name: new RegExp(`^${copy.roundSetup.myDaresLabel}, `) }),
      ).toBeOnTheScreen();
    });

    it('should keep the mix switch where it was when the starter deck is chosen again', async () => {
      const held = await renderWithFavourites({ dareCount: 1 });
      fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares }));

      act(() => held.current?.chooseDeck('favourites'));
      act(() => held.current?.chooseDeck('starter'));

      expect(
        screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares, checked: false }),
      ).toBeOnTheScreen();
    });

    describe('starting from Favourites', () => {
      it('should deal only the cards that are favourites', async () => {
        const held = await renderWithFavourites({ favouriteCardIds: ['card-2'] });
        act(() => held.current?.chooseDeck('favourites'));
        enterNames('Player A', 'Player B');

        await pressStart();

        const [, deck] = jest.mocked(startRound).mock.calls[0] ?? [];
        expect(deck?.cards.map((card) => card.text)).toEqual(['Card 2']);
      });

      it('should deal the favourite dares of the player with them, mixed in or not', async () => {
        const held = await renderWithFavourites({
          favouriteCardIds: ['card-1'],
          dareCount: 2,
          favouriteDareCount: 1,
        });
        act(() => held.current?.chooseDeck('favourites'));
        enterNames('Player A', 'Player B');

        await pressStart();

        const [, deck] = jest.mocked(startRound).mock.calls[0] ?? [];
        expect(deck?.cards.map((card) => card.text)).toEqual(['Card 1', 'Placeholder dare 1']);
      });

      it('should start with the categories that are on, so the round deals only from them', async () => {
        const held = await renderWithFavourites({ favouriteCardIds: ['card-1', 'card-2'] });
        act(() => held.current?.chooseDeck('favourites'));
        fireEvent.press(screen.getByRole('radio', { name: levelNames.l1 }));
        enterNames('Player A', 'Player B');

        await pressStart();

        const [setup] = jest.mocked(startRound).mock.calls[0] ?? [];
        expect(setup?.enabledCategories).toEqual(['c1']);
        expect(jest.mocked(startRound).mock.results[0]?.value.current?.card.id).toBe('card-1');
      });

      it('should start with the surprises the round has, as it does for the starter deck', async () => {
        const held = await renderWithFavourites({ favouriteCardIds: ['card-1', 'card-2'] });
        act(() => held.current?.chooseDeck('favourites'));
        enterNames('Player A', 'Player B');

        await pressStart();

        expect(jest.mocked(startRound).mock.calls[0]?.[0].surprises).toEqual(playableSurprises);
      });
    });

    describe('the cards in play', () => {
      const countLine = (count: number) =>
        fillCopy(count === 1 ? copy.roundSetup.inPlayOne : copy.roundSetup.inPlay, { count });

      it('should say how many cards the deck has at the level', async () => {
        await renderSetup();

        expect(screen.getByText(countLine(2))).toBeOnTheScreen();
        expect(screen.queryByText(copy.roundSetup.noCardsInPlay)).not.toBeOnTheScreen();
      });

      it('should count only the categories that are on', async () => {
        await renderSetup();

        fireEvent.press(screen.getByRole('switch', { name: categoryNames.c2 }));

        expect(screen.getByText(countLine(1))).toBeOnTheScreen();
      });

      it('should follow the level', async () => {
        await renderSetup();

        fireEvent.press(screen.getByRole('radio', { name: levelNames.l1 }));

        expect(screen.getByText(countLine(1))).toBeOnTheScreen();
      });

      it('should count the dares that are mixed in, and not the ones that are not', async () => {
        await renderWithFavourites({ dareCount: 3 });
        expect(screen.getByText(countLine(5))).toBeOnTheScreen();

        fireEvent.press(screen.getByRole('switch', { name: copy.roundSetup.mixInMyDares }));

        expect(screen.getByText(countLine(2))).toBeOnTheScreen();
      });

      it('should count the favourites for Favourites', async () => {
        const held = await renderWithFavourites({ favouriteCardIds: ['card-2'] });

        act(() => held.current?.chooseDeck('favourites'));

        expect(screen.getByText(countLine(1))).toBeOnTheScreen();
      });

      it('should leave out timer cards, which only the timer surprise deals', async () => {
        mockDecks.splice(0, mockDecks.length, {
          ...testDeck,
          cards: [
            ...testDeck.cards,
            {
              id: 'card-3',
              category: 'c1',
              kind: 'solo',
              text: 'Card 3',
              source: 'shipped',
              effect: { type: 'timer', seconds: 15 },
            },
          ],
        });

        await renderSetup();

        expect(screen.getByText(countLine(2))).toBeOnTheScreen();
      });

      it('should show no count until the dares and favourites have been read', async () => {
        const fixture = makeOwnCardsFixture({ holdLoad: true });
        await renderThemed(
          <SettingsProvider storage={createStorage(createInMemoryBackend())}>
            <AfterSettingsLoad>
              <fixture.Providers>
                <DeckChoiceProvider>
                  <RoundProvider>
                    <RoundSetupScreen />
                  </RoundProvider>
                </DeckChoiceProvider>
              </fixture.Providers>
            </AfterSettingsLoad>
          </SettingsProvider>,
        );
        await screen.findByRole('header', { name: copy.roundSetup.title });

        expect(screen.queryByText(countLine(2))).not.toBeOnTheScreen();
        expect(screen.queryByText(copy.roundSetup.noCardsInPlay)).not.toBeOnTheScreen();

        await act(async () => {
          fixture.releaseLoad();
        });

        expect(screen.getByText(countLine(2))).toBeOnTheScreen();
      });
    });

    describe('while the favourites are still being read', () => {
      async function renderWithSlowFavourites() {
        const fixture = makeOwnCardsFixture({
          shippedTexts: testDeck.cards.map((card) => card.text),
        });
        // The favourites never arrive, as if the read had hung.
        jest.spyOn(fixture.repository, 'listFavourites').mockReturnValue(new Promise(() => {}));
        const { ChoiceProbe, held } = makeChoiceProbe();
        await renderSetup(undefined, fixture, <ChoiceProbe />);
        enterNames('Player A', 'Player B');
        return held;
      }

      it('should let the starter deck count and start', async () => {
        await renderWithSlowFavourites();

        expect(screen.getByText(fillCopy(copy.roundSetup.inPlay, { count: 2 }))).toBeOnTheScreen();
        expect(startButton()).not.toBeDisabled();

        await pressStart();

        expect(jest.mocked(startRound).mock.calls[0]?.[1]).toBe(testDeck);
      });

      it('should hold Start, with no count and no hint, for Favourites', async () => {
        const held = await renderWithSlowFavourites();

        act(() => held.current?.chooseDeck('favourites'));

        expect(startButton()).toBeDisabled();
        expect(screen.queryByText(/cards at this level/)).not.toBeOnTheScreen();
        expect(screen.queryByText(copy.roundSetup.noCardsInPlay)).not.toBeOnTheScreen();
      });
    });

    describe('with no cards in play', () => {
      async function renderWithNoFavourites() {
        const held = await renderWithFavourites();
        act(() => held.current?.chooseDeck('favourites'));
        enterNames('Player A', 'Player B');
        return held;
      }

      it('should say why in place of the count', async () => {
        await renderWithNoFavourites();

        expect(screen.getByText(copy.roundSetup.noCardsInPlay)).toBeOnTheScreen();
        expect(screen.queryByText(/cards at this level/)).not.toBeOnTheScreen();
      });

      it('should announce the hint, as a polite live region, when it comes up', async () => {
        const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
        await renderWithNoFavourites();

        expect(announce).toHaveBeenCalledWith(copy.roundSetup.noCardsInPlay);
        expect(screen.getByText(copy.roundSetup.noCardsInPlay)).toHaveProp(
          'accessibilityLiveRegion',
          'polite',
        );
      });

      it('should disable Start even when both names are entered', async () => {
        await renderWithNoFavourites();

        expect(startButton()).toBeDisabled();
      });

      it('should not start a round when Start is pressed', async () => {
        await renderWithNoFavourites();

        fireEvent.press(startButton());

        expect(startRound).not.toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });

      it('should enable Start again when another deck with cards is chosen', async () => {
        const held = await renderWithNoFavourites();

        act(() => held.current?.chooseDeck('starter'));

        expect(startButton()).not.toBeDisabled();
        expect(screen.queryByText(copy.roundSetup.noCardsInPlay)).not.toBeOnTheScreen();
      });

      it('should enable Start again when a level brings cards back', async () => {
        const held = await renderWithFavourites({ favouriteCardIds: ['card-2'] });
        act(() => held.current?.chooseDeck('favourites'));
        enterNames('Player A', 'Player B');
        fireEvent.press(screen.getByRole('radio', { name: levelNames.l1 }));
        expect(startButton()).toBeDisabled();

        fireEvent.press(screen.getByRole('radio', { name: levelNames.l2 }));

        expect(startButton()).not.toBeDisabled();
      });
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

    it('should not start, and say why, while no deck ships', async () => {
      mockDecks.splice(0, mockDecks.length);
      await renderSetup();
      enterNames('Player A', 'Player B');

      fireEvent.press(startButton());

      expect(startButton()).toBeDisabled();
      expect(screen.getByText(copy.roundSetup.noCardsInPlay)).toBeOnTheScreen();
      expect(startRound).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
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
