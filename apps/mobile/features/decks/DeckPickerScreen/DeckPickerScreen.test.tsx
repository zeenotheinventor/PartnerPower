import { copy, fillCopy } from '@getfreak/content';
import type { Deck } from '@getfreak/core';
import { fireEvent, screen } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';

import { renderThemed } from '../../../tailwind/renderThemed';
import { makeOwnCardsFixture } from '../../ownCards/testing/ownCardsFixture';
import { DeckChoiceProvider, useDeckChoice } from '../DeckChoiceProvider';
import type { DeckChoice } from '../types';
import { DeckPickerScreen } from './DeckPickerScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect: useMountEffect } = jest.requireActual<typeof import('react')>('react');
    useMountEffect(callback, [callback]);
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

const starterDeck: Deck = {
  id: 'test-deck',
  version: 1,
  cards: [
    { id: 'card-1', category: 'c1', kind: 'solo', text: 'Card text 1', source: 'shipped' },
    { id: 'card-2', category: 'c2', kind: 'solo', text: 'Card text 2', source: 'shipped' },
    { id: 'card-3', category: 'c3', kind: 'solo', text: 'Card text 3', source: 'shipped' },
  ],
};

const countText = (count: number) => fillCopy(copy.decks.count, { count });
const deckName = (name: string, count: string) =>
  fillCopy(copy.decks.deckCardName, { name, count });

// Shows which deck is chosen, so a test can read what the picker did to the shared choice.
function ChoiceProbe({ onChoice }: { onChoice: (choice: DeckChoice) => void }) {
  const { choice } = useDeckChoice();
  useEffect(() => {
    onChoice(choice);
  }, [choice, onChoice]);
  return null;
}

async function renderPicker({
  favouriteCardIds = [],
  favouriteDareCount = 0,
  initialChoice,
}: {
  favouriteCardIds?: string[];
  favouriteDareCount?: number;
  initialChoice?: DeckChoice;
} = {}) {
  const fixture = makeOwnCardsFixture({ shippedTexts: starterDeck.cards.map((card) => card.text) });
  for (const cardId of favouriteCardIds) await fixture.repository.setFavourite(cardId, true);
  for (let index = 1; index <= favouriteDareCount; index += 1) {
    const result = await fixture.repository.savePlayerCard({
      category: 'c1',
      kind: 'solo',
      text: `Placeholder dare ${index}`,
    });
    if (result.ok) await fixture.repository.setFavourite(result.saved.id, true);
  }
  const choices: DeckChoice[] = [];
  function ChooseFirst({ children }: { children: ReactNode }) {
    const { chooseDeck } = useDeckChoice();
    useEffect(() => {
      if (initialChoice) chooseDeck(initialChoice);
    }, [chooseDeck]);
    return children;
  }
  await renderThemed(
    <fixture.Providers>
      <DeckChoiceProvider>
        <ChooseFirst>
          <DeckPickerScreen />
        </ChooseFirst>
        <ChoiceProbe onChoice={(choice) => choices.push(choice)} />
      </DeckChoiceProvider>
    </fixture.Providers>,
  );
  // The favourites are read after the screen shows, and the card has no count until then.
  await screen.findByRole('button', { name: new RegExp(`^${copy.decks.favourites}, `) });
  return { choices, fixture };
}

describe('DeckPickerScreen', () => {
  beforeEach(() => {
    mockDecks.splice(0, mockDecks.length, starterDeck);
  });

  afterEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  it('should show the title as the heading', async () => {
    await renderPicker();

    expect(screen.getByRole('header', { name: copy.decks.pickerTitle })).toBeOnTheScreen();
  });

  it('should go back from the back button', async () => {
    await renderPicker();

    fireEvent.press(screen.getByRole('button', { name: copy.decks.backLabel }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should go to setup when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderPicker();

    fireEvent.press(screen.getByRole('button', { name: copy.decks.backLabel }));

    expect(mockReplace).toHaveBeenCalledWith('/games/dares/setup');
    expect(mockBack).not.toHaveBeenCalled();
  });

  describe('the decks', () => {
    it('should list the starter deck with how many cards it has', async () => {
      await renderPicker();

      expect(
        screen.getByRole('button', { name: deckName(copy.decks.starter, countText(3)) }),
      ).toBeOnTheScreen();
      expect(screen.getAllByText(countText(3))).toHaveLength(1);
    });

    it('should list Favourites with how many of its cards still exist', async () => {
      await renderPicker({ favouriteCardIds: ['card-1', 'card-3'] });

      expect(
        await screen.findByRole('button', {
          name: deckName(copy.decks.favourites, countText(2)),
        }),
      ).toBeOnTheScreen();
    });

    it('should count a favourite dare of the player along with the shipped ones', async () => {
      await renderPicker({ favouriteCardIds: ['card-1'], favouriteDareCount: 1 });

      expect(
        await screen.findByRole('button', {
          name: deckName(copy.decks.favourites, countText(2)),
        }),
      ).toBeOnTheScreen();
    });

    it('should say one card in the singular', async () => {
      await renderPicker({ favouriteCardIds: ['card-2'] });

      expect(
        await screen.findByRole('button', {
          name: deckName(copy.decks.favourites, fillCopy(copy.decks.countOne, { count: 1 })),
        }),
      ).toBeOnTheScreen();
    });

    it('should list Favourites with no cards, which can still be chosen', async () => {
      await renderPicker();

      expect(
        await screen.findByRole('button', { name: deckName(copy.decks.favourites, countText(0)) }),
      ).toBeOnTheScreen();
    });
  });

  describe('the chosen deck', () => {
    it('should show the starter deck as selected to begin with', async () => {
      await renderPicker();

      expect(
        screen.getByRole('button', {
          name: deckName(copy.decks.starter, countText(3)),
          selected: true,
        }),
      ).toBeOnTheScreen();
      expect(
        await screen.findByRole('button', {
          name: deckName(copy.decks.favourites, countText(0)),
          selected: false,
        }),
      ).toBeOnTheScreen();
    });

    it('should show Favourites as selected when it is the deck chosen', async () => {
      await renderPicker({ initialChoice: 'favourites' });

      expect(
        await screen.findByRole('button', {
          name: deckName(copy.decks.favourites, countText(0)),
          selected: true,
        }),
      ).toBeOnTheScreen();
    });

    it('should choose Favourites and return to setup when it is pressed', async () => {
      const { choices } = await renderPicker();
      fireEvent.press(
        await screen.findByRole('button', { name: deckName(copy.decks.favourites, countText(0)) }),
      );

      expect(choices.at(-1)).toBe('favourites');
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should choose the starter deck and return to setup when it is pressed', async () => {
      const { choices } = await renderPicker({ initialChoice: 'favourites' });
      fireEvent.press(
        screen.getByRole('button', { name: deckName(copy.decks.starter, countText(3)) }),
      );

      expect(choices.at(-1)).toBe('starter');
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('viewing the Favourites', () => {
    it('should open the Favourites view from its own button, without choosing it', async () => {
      const { choices } = await renderPicker();

      fireEvent.press(screen.getByRole('button', { name: copy.decks.viewFavouritesName }));

      expect(mockPush).toHaveBeenCalledWith('/games/dares/decks/favourites');
      expect(choices.at(-1)).toBe('starter');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should not give the starter deck a view button', async () => {
      await renderPicker();

      expect(screen.getAllByRole('button', { name: /^View / })).toHaveLength(1);
    });
  });
});
