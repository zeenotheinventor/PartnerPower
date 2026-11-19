import { categoryNames, copy, fillCopy } from '@getfreak/content';
import type { Deck } from '@getfreak/core';
import { waitFor } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AccessibilityInfo } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { makeOwnCardsFixture } from '../../ownCards/testing/ownCardsFixture';
import { deckCountText } from '../deckCountText';
import { FavouritesScreen } from './FavouritesScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(callback, [callback]);
  },
  useRouter: () => ({ back: mockBack, replace: mockReplace, canGoBack: () => mockCanGoBack }),
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
    { id: 'card-3', category: 'c1', kind: 'solo', text: 'Card text 3', source: 'shipped' },
    { id: 'card-4', category: 'c4', kind: 'solo', text: 'Card text 4', source: 'shipped' },
  ],
};

async function renderFavourites({
  favouriteCardIds = [],
  dares = [],
}: {
  favouriteCardIds?: string[];
  dares?: { text: string; kind: 'solo' | 'together'; isFavourite: boolean }[];
} = {}) {
  const fixture = makeOwnCardsFixture({ shippedTexts: starterDeck.cards.map((card) => card.text) });
  for (const cardId of favouriteCardIds) await fixture.repository.setFavourite(cardId, true);
  for (const dare of dares) {
    const result = await fixture.repository.savePlayerCard({
      category: 'c3',
      kind: dare.kind,
      text: dare.text,
    });
    if (result.ok && dare.isFavourite) await fixture.repository.setFavourite(result.saved.id, true);
  }
  await renderThemed(
    <fixture.Providers>
      <FavouritesScreen />
    </fixture.Providers>,
  );
  await screen.findByRole('header', { name: copy.decks.favourites });
  return fixture;
}

// A card's switch is told apart by its hint, which is the text of its card.
const switchOf = (text: string) => screen.getByHintText(text);

describe('FavouritesScreen', () => {
  beforeEach(() => {
    mockDecks.splice(0, mockDecks.length, starterDeck);
  });

  afterEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
    jest.restoreAllMocks();
  });

  it('should go back from the back button', async () => {
    await renderFavourites();

    fireEvent.press(screen.getByRole('button', { name: copy.decks.backLabel }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should go to the picker when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderFavourites();

    fireEvent.press(screen.getByRole('button', { name: copy.decks.backLabel }));

    expect(mockReplace).toHaveBeenCalledWith('/games/dares/decks');
  });

  describe('with no favourites', () => {
    it('should say there are none and show a count of none', async () => {
      await renderFavourites();

      expect(await screen.findByText(copy.decks.favouritesEmpty)).toBeOnTheScreen();
      expect(screen.getByText(deckCountText(0))).toBeOnTheScreen();
    });

    it('should show no group', async () => {
      await renderFavourites();
      await screen.findByText(copy.decks.favouritesEmpty);

      expect(screen.queryByRole('switch', { name: copy.favourite.label })).toBeNull();
    });
  });

  describe('with favourites', () => {
    it('should count the favourites in the header', async () => {
      await renderFavourites({ favouriteCardIds: ['card-1', 'card-2', 'card-4'] });

      expect(await screen.findByText(deckCountText(3))).toBeOnTheScreen();
    });

    it('should group the cards by category, with how many each group holds', async () => {
      await renderFavourites({ favouriteCardIds: ['card-1', 'card-3', 'card-4'] });

      expect(
        await screen.findByRole('header', {
          name: fillCopy(copy.decks.groupHeading, { category: categoryNames.c1, count: 2 }),
        }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.decks.groupHeading, { category: categoryNames.c4, count: 1 }),
        }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByRole('header', {
          name: new RegExp(`^${categoryNames.c2},`),
        }),
      ).toBeNull();
    });

    it('should show the text of every favourite, shipped and written by the player', async () => {
      await renderFavourites({
        favouriteCardIds: ['card-2'],
        dares: [{ text: 'Placeholder dare 1', kind: 'solo', isFavourite: true }],
      });

      expect(await screen.findByText('Card text 2')).toBeOnTheScreen();
      expect(screen.getByText('Placeholder dare 1')).toBeOnTheScreen();
    });

    it('should leave out a dare that is not a favourite', async () => {
      await renderFavourites({
        favouriteCardIds: ['card-2'],
        dares: [{ text: 'Placeholder dare 1', kind: 'solo', isFavourite: false }],
      });

      await screen.findByText('Card text 2');

      expect(screen.queryByText('Placeholder dare 1')).toBeNull();
    });

    it('should mark a dare for both of them with the together chip', async () => {
      await renderFavourites({
        dares: [
          { text: 'Placeholder dare 1', kind: 'together', isFavourite: true },
          { text: 'Placeholder dare 2', kind: 'solo', isFavourite: true },
        ],
      });

      await screen.findByText('Placeholder dare 1');

      expect(screen.getAllByText(copy.roundPlay.togetherChip)).toHaveLength(1);
    });

    it('should give every card a favourite switch that is on', async () => {
      await renderFavourites({ favouriteCardIds: ['card-1', 'card-2'] });
      await screen.findByText('Card text 1');

      expect(
        screen.getAllByRole('switch', { name: copy.favourite.label, checked: true }),
      ).toHaveLength(2);
    });

    it('should give each switch the text of its card as a hint', async () => {
      await renderFavourites({ favouriteCardIds: ['card-1'] });
      await screen.findByText('Card text 1');

      expect(screen.getByRole('switch', { name: copy.favourite.label })).toHaveProp(
        'accessibilityHint',
        'Card text 1',
      );
    });
  });

  describe('removing a favourite', () => {
    async function renderWithTwo() {
      const fixture = await renderFavourites({ favouriteCardIds: ['card-1', 'card-2'] });
      await screen.findByText('Card text 1');
      return fixture;
    }

    it('should take the card out of the favourites in the store', async () => {
      const fixture = await renderWithTwo();

      fireEvent.press(switchOf('Card text 1'));

      await waitFor(async () =>
        expect(await fixture.repository.listFavourites()).toEqual(['card-2']),
      );
    });

    it('should leave the card where it is, switched off, so it can be put back', async () => {
      await renderWithTwo();

      fireEvent.press(switchOf('Card text 1'));

      expect(screen.getByText('Card text 1')).toBeOnTheScreen();
      expect(switchOf('Card text 1')).not.toBeChecked();
    });

    it('should update the count in the header at once', async () => {
      await renderWithTwo();

      fireEvent.press(switchOf('Card text 1'));

      expect(screen.getByText(deckCountText(1))).toBeOnTheScreen();
    });

    it('should put a card back into the favourites when its switch is turned on again', async () => {
      const fixture = await renderWithTwo();
      fireEvent.press(switchOf('Card text 1'));

      fireEvent.press(switchOf('Card text 1'));

      await waitFor(async () =>
        expect((await fixture.repository.listFavourites()).sort()).toEqual(['card-1', 'card-2']),
      );
      expect(screen.getByText(deckCountText(2))).toBeOnTheScreen();
    });

    it('should keep the card and its group when every card is switched off, rather than show the empty state', async () => {
      await renderWithTwo();

      fireEvent.press(switchOf('Card text 1'));
      fireEvent.press(switchOf('Card text 2'));

      expect(screen.getByText('Card text 1')).toBeOnTheScreen();
      expect(screen.queryByText(copy.decks.favouritesEmpty)).toBeNull();
      expect(screen.getByText(deckCountText(0))).toBeOnTheScreen();
    });

    describe('when the store cannot be written', () => {
      it('should turn the switch back on and say it could not be saved', async () => {
        const fixture = await renderWithTwo();
        jest.spyOn(fixture.repository, 'setFavourite').mockRejectedValue(new Error('unwritable'));
        const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

        fireEvent.press(switchOf('Card text 1'));

        expect(await screen.findByText(copy.roundSummary.favouriteSaveFailed)).toBeOnTheScreen();
        expect(switchOf('Card text 1')).toBeChecked();
        expect(screen.getByText(deckCountText(2))).toBeOnTheScreen();
        expect(announce).toHaveBeenCalledWith(copy.roundSummary.favouriteSaveFailed);
      });

      it('should clear the message when that switch is pressed again', async () => {
        const fixture = await renderWithTwo();
        const write = jest
          .spyOn(fixture.repository, 'setFavourite')
          .mockRejectedValueOnce(new Error('unwritable'));
        fireEvent.press(switchOf('Card text 1'));
        await screen.findByText(copy.roundSummary.favouriteSaveFailed);

        fireEvent.press(switchOf('Card text 1'));

        await waitFor(() => expect(write).toHaveBeenCalledTimes(2));
        expect(screen.queryByText(copy.roundSummary.favouriteSaveFailed)).toBeNull();
      });
    });
  });
});
