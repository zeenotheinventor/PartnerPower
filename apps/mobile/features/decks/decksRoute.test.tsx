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
