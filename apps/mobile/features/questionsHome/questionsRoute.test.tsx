// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, displayNames } from '@getfreak/content';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

const homeRoute = '/games/questions';
const setupRoute = '/games/questions/setup';
const playRoute = '/games/questions/play';
const daresSetupRoute = '/games/dares/setup';

function enterNames(first: string, second: string) {
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerOneLabel), first);
  fireEvent.changeText(screen.getByLabelText(copy.roundSetup.playerTwoLabel), second);
}

async function pressStart() {
  fireEvent.press(screen.getByRole('button', { name: copy.questionsSetup.start }));
  // Saving the names finishes after the press, so the test waits for that to settle.
  await act(async () => {});
}

describe('Drink If in the route tree', () => {
  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  it('should go from the hub tile to the home, to setup, to the round stand-in', async () => {
    await launchApp('/');

    fireEvent.press(screen.getByRole('button', { name: displayNames.questions.title }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
    expect(screen.getByRole('header', { name: copy.questionsHome.title })).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.playTitle }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));
    expect(screen.getByRole('header', { name: copy.questionsSetup.title })).toBeOnTheScreen();

    enterNames('Player A', 'Player B');
    await pressStart();
    await waitFor(() => expect(currentPathname()).toBe(playRoute));

    expect(screen.getByRole('header', { name: copy.questionsPlay.title })).toBeOnTheScreen();
  });

  it('should go back from setup to the home and from the home to the hub', async () => {
    await launchApp('/');
    fireEvent.press(screen.getByRole('button', { name: displayNames.questions.title }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.playTitle }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    fireEvent.press(screen.getByRole('button', { name: copy.questionsSetup.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe('/'));
    expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
  });

  it('should open the home straight from a deep link, and go back to the hub', async () => {
    await launchApp(homeRoute);
    expect(currentPathname()).toBe(homeRoute);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsHome.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe('/'));

    expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
  });

  it('should fall back to the home from setup opened by a deep link', async () => {
    await launchApp(setupRoute);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsSetup.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));

    expect(screen.getByRole('header', { name: copy.questionsHome.title })).toBeOnTheScreen();
  });

  it('should fall back to setup from the stand-in opened by a deep link', async () => {
    await launchApp(playRoute);

    fireEvent.press(screen.getByRole('button', { name: copy.questionsPlay.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(setupRoute));

    expect(screen.getByRole('header', { name: copy.questionsSetup.title })).toBeOnTheScreen();
  });

  it('should share the remembered names with Freak or Drink', async () => {
    await launchApp(setupRoute);
    enterNames('Player A', 'Player B');
    await pressStart();
    await waitFor(() => expect(currentPathname()).toBe(playRoute));

    await launchApp(daresSetupRoute);

    expect(screen.getByLabelText(copy.roundSetup.playerOneLabel)).toHaveDisplayValue('Player A');
    expect(screen.getByLabelText(copy.roundSetup.playerTwoLabel)).toHaveDisplayValue('Player B');
  });

  it('should send a player who has not confirmed to the welcome screen instead of the home', async () => {
    await backend.clear();

    await launchApp(homeRoute);

    expect(currentPathname()).toBe('/welcome');
    expect(screen.queryByRole('header', { name: copy.questionsHome.title })).not.toBeOnTheScreen();
  });
});
