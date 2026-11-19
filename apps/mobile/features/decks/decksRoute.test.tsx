// This import comes first so that its mocks are in place before Expo Router loads.
import {
  backend,
  currentPathname,
  latestPersonalRepository,
  launchApp,
} from '../welcome/testing/appEnvironment';

import { copy, fillCopy } from '@getfreak/content';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

const setupRoute = '/games/dares/setup';
const pickerRoute = '/games/dares/decks';
const favouritesRoute = '/games/dares/decks/favourites';

const deckCardName = (name: string, count: number) =>
  fillCopy(copy.decks.deckCardName, {
    name,
    count: fillCopy(count === 1 ? copy.decks.countOne : copy.decks.count, { count }),
  });

const deckRowName = (value: string) =>
  fillCopy(copy.roundSetup.deckRowName, { label: copy.roundSetup.deckLabel, value });

const myDaresRoute = '/games/dares/my-dares';
const newDareRoute = '/games/dares/my-dares/new';

// Writes one dare from the list, which is open, and ends on the list again.
async function writeDare(text: string) {
  fireEvent.press(screen.getByRole('button', { name: copy.ownCards.add }));
  await waitFor(() => expect(currentPathname()).toBe(newDareRoute));
  fireEvent.changeText(screen.getByLabelText(copy.ownCards.fieldLabel), text);
  fireEvent.press(screen.getByRole('button', { name: copy.ownCards.save }));
  await act(async () => {});
  await waitFor(() => expect(currentPathname()).toBe(myDaresRoute));
}

describe('decks in the route tree', () => {
  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  it('should open the picker from the Deck row on setup', async () => {
    await launchApp(setupRoute);

    fireEvent.press(screen.getByRole('button', { name: deckRowName(copy.decks.starter) }));
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));

    expect(screen.getByRole('header', { name: copy.decks.pickerTitle })).toBeOnTheScreen();
  });

  it('should choose Favourites in the picker and return to setup with it chosen', async () => {
    await launchApp(setupRoute);
    fireEvent.press(screen.getByRole('button', { name: deckRowName(copy.decks.starter) }));
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));

    fireEvent.press(
      await screen.findByRole('button', { name: new RegExp(`^${copy.decks.favourites}, `) }),
    );
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    expect(
      screen.getByRole('button', { name: deckRowName(copy.decks.favourites) }),
    ).toBeOnTheScreen();
    expect(screen.getByText(copy.roundSetup.noCardsInPlay)).toBeOnTheScreen();
  });

  it('should open the Favourites view from the picker and come back to it', async () => {
    await launchApp(pickerRoute);

    fireEvent.press(screen.getByRole('button', { name: copy.decks.viewFavouritesName }));
    await waitFor(() => expect(currentPathname()).toBe(favouritesRoute));
    expect(await screen.findByText(copy.decks.favouritesEmpty)).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.decks.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));
  });

  it('should open the picker and the Favourites view straight from a deep link', async () => {
    await launchApp(favouritesRoute);

    expect(currentPathname()).toBe(favouritesRoute);
    expect(screen.getByRole('header', { name: copy.decks.favourites })).toBeOnTheScreen();
  });

  it('should choose the starter deck again each time setup is opened', async () => {
    await launchApp(pickerRoute);
    fireEvent.press(
      await screen.findByRole('button', { name: new RegExp(`^${copy.decks.favourites}, `) }),
    );
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    await launchApp(setupRoute);

    expect(screen.getByRole('button', { name: deckRowName(copy.decks.starter) })).toBeOnTheScreen();
  });

  it('should read the favourites again each time a screen is back in front', async () => {
    await launchApp(setupRoute);
    // Two dares are written through the screens, so they are in the list setup holds.
    fireEvent.press(screen.getByRole('button', { name: /^My dares, / }));
    await waitFor(() => expect(currentPathname()).toBe(myDaresRoute));
    await writeDare('Placeholder dare 1');
    await writeDare('Placeholder dare 2');
    fireEvent.press(screen.getByRole('button', { name: copy.ownCards.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));
    // Both are favourites now, which setup and the picker have not read yet.
    const repository = latestPersonalRepository();
    for (const dare of await repository.listPlayerCards()) {
      await repository.setFavourite(dare.id, true);
    }

    fireEvent.press(screen.getByRole('button', { name: deckRowName(copy.decks.starter) }));
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));
    expect(
      await screen.findByRole('button', { name: deckCardName(copy.decks.favourites, 2) }),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.decks.viewFavouritesName }));
    await waitFor(() => expect(currentPathname()).toBe(favouritesRoute));
    await screen.findByText('Placeholder dare 1');
    fireEvent.press(screen.getByHintText('Placeholder dare 1'));
    await act(async () => {});
    fireEvent.press(screen.getByRole('button', { name: copy.decks.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));

    expect(
      await screen.findByRole('button', { name: deckCardName(copy.decks.favourites, 1) }),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: deckCardName(copy.decks.favourites, 1) }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    expect(
      await screen.findByText(fillCopy(copy.roundSetup.inPlayOne, { count: 1 })),
    ).toBeOnTheScreen();
  });
});

describe('custom decks in the route tree', () => {
  const newDeckRoute = '/games/dares/decks/new';
  const editRowName = (name: string) => fillCopy(copy.decks.editDeckName, { name });

  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  // Makes a deck from the picker, which is open, and ends on the picker again.
  async function makeDeck(name: string) {
    fireEvent.press(screen.getByRole('button', { name: copy.decks.newDeck }));
    await waitFor(() => expect(currentPathname()).toBe(newDeckRoute));
    await screen.findByRole('header', { name: copy.decks.editorTitle });
    fireEvent.changeText(screen.getByLabelText(copy.decks.nameLabel), name);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: copy.decks.saveDeck })).toBeEnabled(),
    );
    fireEvent.press(screen.getByRole('button', { name: copy.decks.saveDeck }));
    await act(async () => {});
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));
  }

  it('should make a deck from New deck and list it in the picker', async () => {
    await launchApp(pickerRoute);

    await makeDeck('Placeholder deck');

    expect(
      await screen.findByRole('button', { name: deckCardName('Placeholder deck', 0) }),
    ).toBeOnTheScreen();
  });

  it('should choose a custom deck and return to setup with it chosen', async () => {
    await launchApp(pickerRoute);
    await makeDeck('Placeholder deck');

    fireEvent.press(
      await screen.findByRole('button', { name: deckCardName('Placeholder deck', 0) }),
    );
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    expect(screen.getByRole('button', { name: deckRowName('Placeholder deck') })).toBeOnTheScreen();
    expect(screen.getByText(copy.roundSetup.noCardsInPlay)).toBeOnTheScreen();
  });

  it('should open a deck from Edit, and show the changed name in the picker', async () => {
    await launchApp(setupRoute);
    await latestPersonalRepository().saveDeck({ name: 'Placeholder deck', cardIds: [] });
    fireEvent.press(screen.getByRole('button', { name: deckRowName(copy.decks.starter) }));
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));

    fireEvent.press(await screen.findByRole('button', { name: editRowName('Placeholder deck') }));
    await waitFor(() => expect(currentPathname()).toMatch(/^\/games\/dares\/decks\/d-/));
    await waitFor(() =>
      expect(screen.getByLabelText(copy.decks.nameLabel)).toHaveDisplayValue('Placeholder deck'),
    );
    fireEvent.changeText(screen.getByLabelText(copy.decks.nameLabel), 'Another name');
    fireEvent.press(screen.getByRole('button', { name: copy.decks.saveDeck }));
    await act(async () => {});
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));

    expect(
      await screen.findByRole('button', { name: deckCardName('Another name', 0) }),
    ).toBeOnTheScreen();
  });

  it('should fall back to the starter deck on setup when the deck that was chosen is deleted', async () => {
    await launchApp(setupRoute);
    await latestPersonalRepository().saveDeck({ name: 'Placeholder deck', cardIds: [] });
    fireEvent.press(screen.getByRole('button', { name: deckRowName(copy.decks.starter) }));
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));
    fireEvent.press(
      await screen.findByRole('button', { name: deckCardName('Placeholder deck', 0) }),
    );
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));
    fireEvent.press(screen.getByRole('button', { name: deckRowName('Placeholder deck') }));
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));

    fireEvent.press(await screen.findByRole('button', { name: editRowName('Placeholder deck') }));
    await waitFor(() => expect(currentPathname()).toMatch(/^\/games\/dares\/decks\/d-/));
    fireEvent.press(await screen.findByRole('button', { name: copy.decks.deleteDeck }));
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: copy.decks.deleteConfirm }));
    });
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));
    fireEvent.press(screen.getByRole('button', { name: copy.decks.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    expect(screen.getByRole('button', { name: deckRowName(copy.decks.starter) })).toBeOnTheScreen();
    expect(await latestPersonalRepository().listDecks()).toEqual([]);
  });

  it('should take a dare deleted from My dares out of the deck, in the picker and in the editor', async () => {
    await launchApp(setupRoute);
    fireEvent.press(screen.getByRole('button', { name: /^My dares, / }));
    await waitFor(() => expect(currentPathname()).toBe(myDaresRoute));
    await writeDare('Placeholder dare 1');
    const [dare] = await latestPersonalRepository().listPlayerCards();
    const saved = await latestPersonalRepository().saveDeck({
      name: 'Placeholder deck',
      cardIds: [dare?.id ?? ''],
    });
    expect(saved.ok).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Placeholder dare 1' }));
    await waitFor(() => expect(currentPathname()).toMatch(/^\/games\/dares\/my-dares\/p-/));
    fireEvent.press(await screen.findByRole('button', { name: copy.ownCards.deleteButton }));
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: copy.ownCards.deleteConfirm }));
    });
    await waitFor(() => expect(currentPathname()).toBe(myDaresRoute));
    fireEvent.press(screen.getByRole('button', { name: copy.ownCards.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    fireEvent.press(screen.getByRole('button', { name: deckRowName(copy.decks.starter) }));
    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));
    expect(
      await screen.findByRole('button', { name: deckCardName('Placeholder deck', 0) }),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: editRowName('Placeholder deck') }));
    await waitFor(() => expect(currentPathname()).toMatch(/^\/games\/dares\/decks\/d-/));

    expect(await screen.findByText(copy.decks.nothingToAdd)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Placeholder dare 1' })).not.toBeOnTheScreen();
  });

  it('should open the editor for a new deck straight from a deep link', async () => {
    await launchApp(newDeckRoute);

    expect(await screen.findByRole('header', { name: copy.decks.editorTitle })).toBeOnTheScreen();
  });

  it('should go to the picker when the deck in a deep link is not stored', async () => {
    await launchApp('/games/dares/decks/d-missing');

    await waitFor(() => expect(currentPathname()).toBe(pickerRoute));
  });
});
