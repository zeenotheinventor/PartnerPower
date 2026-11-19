// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, fillCopy, displayNames } from '@getfreak/content';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

const homeRoute = '/games/questions';
const discoveriesRoute = '/games/questions/discoveries';

describe('Discoveries in the route tree', () => {
  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  it('should open from its entry on the Drink If home, and go back to it', async () => {
    await launchApp('/');
    fireEvent.press(screen.getByRole('button', { name: displayNames.questions.title }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));

    fireEvent.press(
      await screen.findByRole('button', {
        name: fillCopy(copy.questionsHome.entryLabel, {
          title: copy.questionsHome.discoveriesTitle,
          count: copy.questionsHome.discoveriesNone,
        }),
      }),
    );
    await waitFor(() => expect(currentPathname()).toBe(discoveriesRoute));
    expect(screen.getByRole('header', { name: copy.discoveries.title })).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.discoveries.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
  });

  it('should open straight from a deep link, and fall back to the home', async () => {
    await launchApp(discoveriesRoute);
    expect(await screen.findByText(copy.discoveries.emptyTitle)).toBeOnTheScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.discoveries.backLabel }));

    await waitFor(() => expect(currentPathname()).toBe(homeRoute));
    expect(screen.getByRole('header', { name: copy.questionsHome.title })).toBeOnTheScreen();
  });

  it('should start a round from the empty screen', async () => {
    await launchApp(discoveriesRoute);
    await screen.findByText(copy.discoveries.emptyTitle);

    fireEvent.press(screen.getByRole('button', { name: copy.discoveries.emptyPlay }));

    await waitFor(() => expect(currentPathname()).toBe('/games/questions/setup'));
  });

  it('should send a player who has not confirmed to the welcome screen instead', async () => {
    await backend.clear();

    await launchApp(discoveriesRoute);

    expect(currentPathname()).toBe('/welcome');
    expect(screen.queryByRole('header', { name: copy.discoveries.title })).not.toBeOnTheScreen();
  });
});
