// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, fillCopy } from '@getfreak/content';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

const setupRoute = '/games/dares/setup';
const pickerRoute = '/games/dares/decks';
const favouritesRoute = '/games/dares/decks/favourites';

const deckRowName = (value: string) =>
  fillCopy(copy.roundSetup.deckRowName, { label: copy.roundSetup.deckLabel, value });

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
});
