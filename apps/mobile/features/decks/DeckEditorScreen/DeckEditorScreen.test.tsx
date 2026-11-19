import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { limits, type Card, type CategoryId, type Deck } from '@getfreak/core';
import { act, waitFor } from '@testing-library/react-native';
import { fireEvent, screen, within } from 'nativewind/test';
import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { makeOwnCardsFixture } from '../../ownCards/testing/ownCardsFixture';
import { customDeckChoice } from '../customDeckChoice';
import { DeckChoiceProvider, useDeckChoice } from '../DeckChoiceProvider';
import type { DeckChoice } from '../types';
import { DeckEditorScreen } from './DeckEditorScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect: useMountEffect } = jest.requireActual<typeof import('react')>('react');
    useMountEffect(callback, [callback]);
  },
  useRouter: () => ({
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

const shippedCards = (count: number): Card[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `card-${index + 1}`,
    category: (['c1', 'c2', 'c3', 'c4'] as const)[index % 4] ?? 'c1',
    kind: 'solo',
    text: `Card text ${index + 1}`,
    source: 'shipped',
  }));

type Fixture = ReturnType<typeof makeOwnCardsFixture>;

// A fixture whose store knows the shipped cards by the ids and texts of the deck the screen reads.
function makeFixture(cardCount = 4) {
  const cards = shippedCards(cardCount);
  mockDecks.splice(0, mockDecks.length, { id: 'test-deck', version: 1, cards });
  return makeOwnCardsFixture({ shippedTexts: cards.map((card) => card.text) });
}

async function addDare(fixture: Fixture, text: string, category: CategoryId = 'c1') {
  const saved = await fixture.repository.savePlayerCard({ category, kind: 'solo', text });
  if (!saved.ok) throw new Error('The test dare was not saved');
  return saved.saved;
}

async function addDeck(fixture: Fixture, name: string, cardIds: string[]) {
  const saved = await fixture.repository.saveDeck({ name, cardIds });
  if (!saved.ok) throw new Error('The test deck was not saved');
  return saved.saved;
}

type RenderOptions = {
  deckId?: string;
  initialChoice?: DeckChoice;
};

async function renderEditor(fixture: Fixture, { deckId, initialChoice }: RenderOptions = {}) {
  const choices: DeckChoice[] = [];
  function ChooseFirst({ children }: { children: ReactNode }) {
    const { chooseDeck } = useDeckChoice();
    useEffect(() => {
      if (initialChoice) chooseDeck(initialChoice);
    }, [chooseDeck]);
    return children;
  }
  function ChoiceProbe() {
    const { choice } = useDeckChoice();
    useEffect(() => {
      choices.push(choice);
    }, [choice]);
    return null;
  }
  await renderThemed(
    <fixture.Providers>
      <DeckChoiceProvider>
        <ChooseFirst>
          <DeckEditorScreen deckId={deckId} />
        </ChooseFirst>
        <ChoiceProbe />
      </DeckChoiceProvider>
    </fixture.Providers>,
  );
  await screen.findByRole('header', { name: copy.decks.editorTitle });
  // The dares and favourites are read after the screen shows, and Save waits for them.
  await waitFor(() => expect(saveButton()).toBeEnabled());
  return { choices };
}

const saveButton = () => screen.getByRole('button', { name: copy.decks.saveDeck });
const nameField = () => screen.getByLabelText(copy.decks.nameLabel);
const countChip = (categoryId: CategoryId, count: number) =>
  screen.getByText(
    fillCopy(copy.decks.categoryCount, { category: categoryNames[categoryId], count }),
  );
const cardButton = (text: string, selected?: boolean) =>
  screen.getByRole('button', selected === undefined ? { name: text } : { name: text, selected });

// Saving finishes after the press, so the test waits for it to settle.
async function pressSave() {
  fireEvent.press(saveButton());
  await act(async () => {});
}

describe('DeckEditorScreen', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockBack.mockClear();
    mockReplace.mockClear();
    mockCanGoBack = true;
  });

  describe('the screen', () => {
    it('should show the title as the heading', async () => {
      await renderEditor(makeFixture());

      expect(screen.getByRole('header', { name: copy.decks.editorTitle })).toBeOnTheScreen();
    });

    it('should go back from the back button', async () => {
      await renderEditor(makeFixture());

      fireEvent.press(screen.getByRole('button', { name: copy.decks.backLabel }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should fall back to the picker when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderEditor(makeFixture());

      fireEvent.press(screen.getByRole('button', { name: copy.decks.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith('/games/dares/decks');
    });

    it('should move its content out of the way of the keyboard', async () => {
      await renderEditor(makeFixture());

      // React Native has no role or label to find this view by, so it is found by its type.
      expect(screen.UNSAFE_getByType(KeyboardAvoidingView)).toBeTruthy();
    });

    it('should hold Save until the dares and favourites have been read', async () => {
      const fixture = makeOwnCardsFixture({ holdLoad: true });
      await renderThemed(
        <fixture.Providers>
          <DeckChoiceProvider>
            <DeckEditorScreen />
          </DeckChoiceProvider>
        </fixture.Providers>,
      );

      expect(saveButton()).toBeDisabled();

      await act(async () => fixture.releaseLoad());
      await waitFor(() => expect(saveButton()).toBeEnabled());
    });
  });

  describe('a new deck', () => {
    it('should start with no name, no cards, and a count of 0 in every category', async () => {
      await renderEditor(makeFixture());

      expect(nameField()).toHaveDisplayValue('');
      expect(screen.getByText(fillCopy(copy.decks.count, { count: 0 }))).toBeOnTheScreen();
      for (const categoryId of ['c1', 'c2', 'c3', 'c4'] as const) {
        expect(countChip(categoryId, 0)).toBeOnTheScreen();
      }
    });

    it('should hold the name to 30 characters and show how many have been typed', async () => {
      await renderEditor(makeFixture());

      fireEvent.changeText(nameField(), '  Placeholder deck  ');

      expect(nameField()).toHaveProp('maxLength', limits.deckNameLength);
      expect(
        screen.getByText(`16/${limits.deckNameLength}`, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('should not offer Delete deck, since there is nothing to delete', async () => {
      await renderEditor(makeFixture());

      expect(screen.queryByRole('button', { name: copy.decks.deleteDeck })).not.toBeOnTheScreen();
    });

    it('should say there is nothing to add when there are no dares and no favourites', async () => {
      await renderEditor(makeFixture());

      expect(screen.getByText(copy.decks.nothingToAdd)).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: copy.decks.sectionMine })).not.toBeOnTheScreen();
    });
  });

  describe('the cards to pick from', () => {
    it('should list the dares under My dares, grouped by category, none of them selected', async () => {
      const fixture = makeFixture();
      await addDare(fixture, 'Placeholder dare 1', 'c1');
      await addDare(fixture, 'Placeholder dare 2', 'c3');
      await renderEditor(fixture);

      expect(screen.getByRole('header', { name: copy.decks.sectionMine })).toBeOnTheScreen();
      expect(screen.getByRole('header', { name: categoryNames.c1 })).toBeOnTheScreen();
      expect(cardButton('Placeholder dare 1', false)).toBeOnTheScreen();
      expect(screen.queryByText(copy.decks.nothingToAdd)).not.toBeOnTheScreen();
    });

    it('should list the favourite shipped cards under Favourites', async () => {
      const fixture = makeFixture();
      await fixture.repository.setFavourite('card-1', true);
      await renderEditor(fixture);

      expect(screen.getByRole('header', { name: copy.decks.sectionFavourites })).toBeOnTheScreen();
      expect(cardButton('Card text 1', false)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Card text 2' })).not.toBeOnTheScreen();
    });

    it('should show a favourite dare once, under My dares', async () => {
      const fixture = makeFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1');
      await fixture.repository.setFavourite(dare.id, true);
      await renderEditor(fixture);

      expect(screen.getAllByRole('button', { name: 'Placeholder dare 1' })).toHaveLength(1);
      expect(
        screen.queryByRole('header', { name: copy.decks.sectionFavourites }),
      ).not.toBeOnTheScreen();
    });

    it('should mark a together dare with its chip and say so in its name', async () => {
      const fixture = makeFixture();
      await fixture.repository.savePlayerCard({
        category: 'c1',
        kind: 'together',
        text: 'Placeholder dare 1',
      });
      await renderEditor(fixture);

      expect(
        screen.getByRole('button', {
          name: fillCopy(copy.ownCards.togetherCardLabel, { text: 'Placeholder dare 1' }),
        }),
      ).toBeOnTheScreen();
      expect(screen.getByText(copy.ownCards.kindTogether)).toBeOnTheScreen();
    });
  });

  describe('picking cards', () => {
    async function renderWithDares() {
      const fixture = makeFixture();
      await addDare(fixture, 'Placeholder dare 1', 'c1');
      await addDare(fixture, 'Placeholder dare 2', 'c1');
      await addDare(fixture, 'Placeholder dare 3', 'c2');
      await renderEditor(fixture);
      return fixture;
    }

    it('should select a card when it is pressed, and take it out when it is pressed again', async () => {
      await renderWithDares();

      fireEvent.press(cardButton('Placeholder dare 1'));
      expect(cardButton('Placeholder dare 1', true)).toBeOnTheScreen();

      fireEvent.press(cardButton('Placeholder dare 1'));
      expect(cardButton('Placeholder dare 1', false)).toBeOnTheScreen();
    });

    it('should count the cards in the deck, in total and in each category', async () => {
      await renderWithDares();

      fireEvent.press(cardButton('Placeholder dare 1'));
      fireEvent.press(cardButton('Placeholder dare 2'));
      fireEvent.press(cardButton('Placeholder dare 3'));

      expect(screen.getByText(fillCopy(copy.decks.count, { count: 3 }))).toBeOnTheScreen();
      expect(countChip('c1', 2)).toBeOnTheScreen();
      expect(countChip('c2', 1)).toBeOnTheScreen();
      expect(countChip('c3', 0)).toBeOnTheScreen();
    });

    it('should count one card in the singular', async () => {
      await renderWithDares();

      fireEvent.press(cardButton('Placeholder dare 3'));

      expect(screen.getByText(fillCopy(copy.decks.countOne, { count: 1 }))).toBeOnTheScreen();
    });

    it('should count down when a card is taken out', async () => {
      await renderWithDares();
      fireEvent.press(cardButton('Placeholder dare 1'));
      fireEvent.press(cardButton('Placeholder dare 3'));

      fireEvent.press(cardButton('Placeholder dare 3'));

      expect(countChip('c2', 0)).toBeOnTheScreen();
      expect(countChip('c1', 1)).toBeOnTheScreen();
    });
  });

  describe('saving a new deck', () => {
    it('should store the deck with its name and the cards picked, and go back', async () => {
      const fixture = makeFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1');
      await fixture.repository.setFavourite('card-2', true);
      await renderEditor(fixture);
      fireEvent.changeText(nameField(), 'Placeholder deck');
      fireEvent.press(cardButton('Placeholder dare 1'));
      fireEvent.press(cardButton('Card text 2'));

      await pressSave();

      const stored = await fixture.repository.listDecks();
      expect(stored.map((deck) => [deck.name, deck.cardIds])).toEqual([
        ['Placeholder deck', [dare.id, 'card-2']],
      ]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should save the name without the spaces around it', async () => {
      const fixture = makeFixture();
      await renderEditor(fixture);
      fireEvent.changeText(nameField(), '  Placeholder deck  ');

      await pressSave();

      expect((await fixture.repository.listDecks()).map((deck) => deck.name)).toEqual([
        'Placeholder deck',
      ]);
    });

    it('should save a deck with no cards, so it can be filled later', async () => {
      const fixture = makeFixture();
      await renderEditor(fixture);
      fireEvent.changeText(nameField(), 'Placeholder deck');

      await pressSave();

      expect((await fixture.repository.listDecks()).map((deck) => deck.cardIds)).toEqual([[]]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should leave the chosen deck as it was, since saving does not choose the deck', async () => {
      const fixture = makeFixture();
      const { choices } = await renderEditor(fixture);
      fireEvent.changeText(nameField(), 'Placeholder deck');

      await pressSave();

      expect(choices.at(-1)).toBe('starter');
    });

    it('should write once when Save is pressed twice', async () => {
      const fixture = makeFixture();
      await renderEditor(fixture);
      fireEvent.changeText(nameField(), 'Placeholder deck');
      const save = jest.spyOn(fixture.repository, 'saveDeck');

      fireEvent.press(saveButton());
      fireEvent.press(saveButton());
      await act(async () => {});

      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  describe('the name', () => {
    it('should say to give the deck a name, and store nothing, when Save is pressed with no name', async () => {
      const fixture = makeFixture();
      await renderEditor(fixture);

      await pressSave();

      expect(
        screen.getByText(copy.decks.nameError, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(await fixture.repository.listDecks()).toEqual([]);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should say it for a name of only spaces too', async () => {
      await renderEditor(makeFixture());
      fireEvent.changeText(nameField(), '    ');

      await pressSave();

      expect(
        screen.getByText(copy.decks.nameError, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('should announce the message, and read it with the field', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
      await renderEditor(makeFixture());

      await pressSave();

      expect(announce).toHaveBeenCalledWith(copy.decks.nameError);
      expect(nameField().props.accessibilityHint).toContain(copy.decks.nameError);
    });

    it('should take the message away when the name is typed', async () => {
      await renderEditor(makeFixture());
      await pressSave();

      fireEvent.changeText(nameField(), 'P');

      expect(
        screen.queryByText(copy.decks.nameError, { includeHiddenElements: true }),
      ).not.toBeOnTheScreen();
    });

    it('should keep the cards that were picked when the name is missing', async () => {
      const fixture = makeFixture();
      await addDare(fixture, 'Placeholder dare 1');
      await renderEditor(fixture);
      fireEvent.press(cardButton('Placeholder dare 1'));

      await pressSave();

      expect(cardButton('Placeholder dare 1', true)).toBeOnTheScreen();
    });
  });

  describe('the limits', () => {
    // A deck of 200 cards: one dare and 199 shipped cards. A second dare is not in it.
    async function renderFullDeck() {
      const fixture = makeFixture(limits.cardsPerCustomDeck - 1);
      const inDeck = await addDare(fixture, 'Placeholder dare in deck');
      await addDare(fixture, 'Placeholder dare out of deck');
      const deck = await addDeck(fixture, 'Placeholder deck', [
        inDeck.id,
        ...shippedCards(limits.cardsPerCustomDeck - 1).map((card) => card.id),
      ]);
      await renderEditor(fixture, { deckId: deck.id });
      return fixture;
    }

    it('should say a deck holds up to 200 cards when the deck has 200', async () => {
      await renderFullDeck();

      expect(screen.getByText(copy.decks.cardLimit)).toBeOnTheScreen();
      expect(screen.getByText(copy.decks.cardLimit)).toHaveProp(
        'accessibilityLiveRegion',
        'polite',
      );
    });

    it('should announce the reason when the limit is reached', async () => {
      const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

      await renderFullDeck();

      expect(announce).toHaveBeenCalledWith(copy.decks.cardLimit);
    });

    it('should disable the cards that are not in the deck, and leave the ones in it on', async () => {
      await renderFullDeck();

      expect(cardButton('Placeholder dare out of deck', false)).toBeDisabled();
      expect(cardButton('Placeholder dare in deck', true)).toBeEnabled();
    });

    it('should not add a card at the limit', async () => {
      await renderFullDeck();

      fireEvent.press(cardButton('Placeholder dare out of deck'));

      expect(cardButton('Placeholder dare out of deck', false)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.decks.count, { count: limits.cardsPerCustomDeck })),
      ).toBeOnTheScreen();
    });

    it('should let a card be taken out to make room, and then add another', async () => {
      await renderFullDeck();

      fireEvent.press(cardButton('Placeholder dare in deck'));

      expect(screen.queryByText(copy.decks.cardLimit)).not.toBeOnTheScreen();
      fireEvent.press(cardButton('Placeholder dare out of deck'));
      expect(cardButton('Placeholder dare out of deck', true)).toBeOnTheScreen();
    });

    it('should not say anything about the limit below 200 cards', async () => {
      const fixture = makeFixture();
      await addDare(fixture, 'Placeholder dare 1');
      await renderEditor(fixture);
      fireEvent.press(cardButton('Placeholder dare 1'));

      expect(screen.queryByText(copy.decks.cardLimit)).not.toBeOnTheScreen();
    });

    it('should say the deck limit and stay when a new deck is saved at 20 decks', async () => {
      const fixture = makeFixture();
      for (let number = 1; number <= limits.customDecks; number += 1) {
        await addDeck(fixture, `Placeholder deck ${number}`, []);
      }
      await renderEditor(fixture);
      fireEvent.changeText(nameField(), 'One deck too many');

      await pressSave();

      expect(screen.getByText(copy.decks.deckLimit)).toBeOnTheScreen();
      expect(mockBack).not.toHaveBeenCalled();
      expect(await fixture.repository.listDecks()).toHaveLength(limits.customDecks);
    });
  });

  describe('a write that fails', () => {
    it('should say it could not save, keep the form, and allow another try', async () => {
      const fixture = makeFixture();
      await renderEditor(fixture);
      fireEvent.changeText(nameField(), 'Placeholder deck');
      jest.spyOn(fixture.repository, 'saveDeck').mockRejectedValueOnce(new Error('unwritable'));

      await pressSave();

      expect(screen.getByText(copy.decks.writeFailed)).toBeOnTheScreen();
      expect(mockBack).not.toHaveBeenCalled();

      await pressSave();

      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('changing a deck', () => {
    async function renderStoredDeck() {
      const fixture = makeFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1', 'c2');
      await addDare(fixture, 'Placeholder dare 2', 'c2');
      await fixture.repository.setFavourite('card-1', true);
      const deck = await addDeck(fixture, 'Placeholder deck', [dare.id, 'card-1']);
      const view = await renderEditor(fixture, { deckId: deck.id });
      return { fixture, deck, dare, ...view };
    }

    it('should show the name and the cards of the stored deck, selected', async () => {
      await renderStoredDeck();

      expect(nameField()).toHaveDisplayValue('Placeholder deck');
      expect(cardButton('Placeholder dare 1', true)).toBeOnTheScreen();
      expect(cardButton('Card text 1', true)).toBeOnTheScreen();
      expect(cardButton('Placeholder dare 2', false)).toBeOnTheScreen();
      expect(screen.getByText(fillCopy(copy.decks.count, { count: 2 }))).toBeOnTheScreen();
    });

    it('should save the changes to the same deck, not a new one', async () => {
      const { fixture, deck } = await renderStoredDeck();
      fireEvent.changeText(nameField(), 'Another name');
      fireEvent.press(cardButton('Placeholder dare 2'));
      fireEvent.press(cardButton('Card text 1'));

      await pressSave();

      const stored = await fixture.repository.listDecks();
      expect(stored).toHaveLength(1);
      expect(stored[0]?.id).toBe(deck.id);
      expect(stored[0]?.name).toBe('Another name');
      expect(stored[0]?.cardIds).toHaveLength(2);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should keep a card in the deck after it is unfavourited, until it is taken out there', async () => {
      const fixture = makeFixture();
      await fixture.repository.setFavourite('card-1', true);
      const deck = await addDeck(fixture, 'Placeholder deck', ['card-1']);
      await fixture.repository.setFavourite('card-1', false);
      await renderEditor(fixture, { deckId: deck.id });

      expect(cardButton('Card text 1', true)).toBeOnTheScreen();

      fireEvent.press(cardButton('Card text 1'));
      expect(cardButton('Card text 1', false)).toBeOnTheScreen();
    });

    it('should not list a dare that was deleted from My dares, and the deck no longer holds it', async () => {
      const fixture = makeFixture();
      const kept = await addDare(fixture, 'Placeholder dare kept');
      const deleted = await addDare(fixture, 'Placeholder dare deleted');
      const deck = await addDeck(fixture, 'Placeholder deck', [kept.id, deleted.id]);
      await fixture.repository.deletePlayerCard(deleted.id);

      await renderEditor(fixture, { deckId: deck.id });

      expect(
        screen.queryByRole('button', { name: 'Placeholder dare deleted' }),
      ).not.toBeOnTheScreen();
      expect(cardButton('Placeholder dare kept', true)).toBeOnTheScreen();
      expect(screen.getByText(fillCopy(copy.decks.countOne, { count: 1 }))).toBeOnTheScreen();
    });

    it('should go back to the picker when no stored deck has the id', async () => {
      const fixture = makeFixture();
      await renderThemed(
        <fixture.Providers>
          <DeckChoiceProvider>
            <DeckEditorScreen deckId="d-missing" />
          </DeckChoiceProvider>
        </fixture.Providers>,
      );

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/games/dares/decks'));
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleting a deck', () => {
    async function renderStoredDeck(initialChoiceFor?: (deckId: string) => DeckChoice) {
      const fixture = makeFixture();
      const deck = await addDeck(fixture, 'Placeholder deck', ['card-1']);
      const other = await addDeck(fixture, 'Another deck', []);
      const view = await renderEditor(fixture, {
        deckId: deck.id,
        initialChoice: initialChoiceFor?.(deck.id) ?? customDeckChoice(other.id),
      });
      return { fixture, deck, other, ...view };
    }

    const confirmDialog = () => screen.getByLabelText(copy.decks.deleteTitle);
    const pressDelete = () =>
      fireEvent.press(screen.getByRole('button', { name: copy.decks.deleteDeck }));

    it('should ask first, with the kit dialog, and delete nothing yet', async () => {
      const { fixture } = await renderStoredDeck();

      pressDelete();

      expect(confirmDialog()).toHaveProp('role', 'alertdialog');
      expect(screen.getByText(copy.decks.deleteBody)).toBeOnTheScreen();
      expect(await fixture.repository.listDecks()).toHaveLength(2);
    });

    it('should keep the deck when the player keeps it', async () => {
      const { fixture } = await renderStoredDeck();
      pressDelete();

      fireEvent.press(
        within(confirmDialog()).getByRole('button', { name: copy.decks.deleteCancel }),
      );

      expect(screen.queryByLabelText(copy.decks.deleteTitle)).not.toBeOnTheScreen();
      expect(await fixture.repository.listDecks()).toHaveLength(2);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should delete the deck, and only that one, and go back', async () => {
      const { fixture, other } = await renderStoredDeck();
      pressDelete();

      await act(async () => {
        fireEvent.press(
          within(confirmDialog()).getByRole('button', { name: copy.decks.deleteConfirm }),
        );
      });

      expect((await fixture.repository.listDecks()).map((deck) => deck.id)).toEqual([other.id]);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should leave the dares and the favourites as they are', async () => {
      const fixture = makeFixture();
      const dare = await addDare(fixture, 'Placeholder dare 1');
      await fixture.repository.setFavourite('card-1', true);
      const deck = await addDeck(fixture, 'Placeholder deck', [dare.id, 'card-1']);
      await renderEditor(fixture, { deckId: deck.id });
      pressDelete();

      await act(async () => {
        fireEvent.press(
          within(confirmDialog()).getByRole('button', { name: copy.decks.deleteConfirm }),
        );
      });

      expect(await fixture.repository.listPlayerCards()).toHaveLength(1);
      expect(await fixture.repository.listFavourites()).toEqual(['card-1']);
    });

    it('should choose the starter deck again when the deck deleted was the one chosen', async () => {
      const { choices } = await renderStoredDeck((deckId) => customDeckChoice(deckId));
      expect(choices.at(-1)).not.toBe('starter');
      pressDelete();

      await act(async () => {
        fireEvent.press(
          within(confirmDialog()).getByRole('button', { name: copy.decks.deleteConfirm }),
        );
      });

      expect(choices.at(-1)).toBe('starter');
    });

    it('should leave the choice alone when another deck was the one chosen', async () => {
      const { choices, other } = await renderStoredDeck();
      pressDelete();

      await act(async () => {
        fireEvent.press(
          within(confirmDialog()).getByRole('button', { name: copy.decks.deleteConfirm }),
        );
      });

      expect(choices.at(-1)).toBe(customDeckChoice(other.id));
    });

    it('should say it could not delete, keep the dialog open, and allow another try', async () => {
      const { fixture } = await renderStoredDeck();
      jest.spyOn(fixture.repository, 'deleteDeck').mockRejectedValueOnce(new Error('unwritable'));
      pressDelete();

      await act(async () => {
        fireEvent.press(
          within(confirmDialog()).getByRole('button', { name: copy.decks.deleteConfirm }),
        );
      });

      expect(screen.getByText(copy.decks.deleteFailed)).toBeOnTheScreen();
      expect(mockBack).not.toHaveBeenCalled();

      await act(async () => {
        fireEvent.press(
          within(confirmDialog()).getByRole('button', { name: copy.decks.deleteConfirm }),
        );
      });

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should hold both buttons while the delete is under way', async () => {
      const { fixture } = await renderStoredDeck();
      jest.spyOn(fixture.repository, 'deleteDeck').mockReturnValue(new Promise(() => {}));
      pressDelete();

      await act(async () => {
        fireEvent.press(
          within(confirmDialog()).getByRole('button', { name: copy.decks.deleteConfirm }),
        );
      });

      expect(
        within(confirmDialog()).getByRole('button', { name: copy.decks.deleteConfirm }),
      ).toBeDisabled();
      expect(
        within(confirmDialog()).getByRole('button', { name: copy.decks.deleteCancel }),
      ).toBeDisabled();
    });
  });
});
