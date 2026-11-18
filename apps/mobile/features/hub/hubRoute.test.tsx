// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, displayNames } from '@getfreak/content';
import { gameEntries } from '@getfreak/core';
import { fireEvent, screen, waitFor } from 'expo-router/testing-library';

const availableEntry = gameEntries.find((entry) => entry.status === 'available');
const comingSoonEntry = gameEntries.find((entry) => entry.status === 'comingSoon');

describe('the hub in the route tree', () => {
  beforeEach(async () => {
    await backend.clear();
    await backend.setItem('entryConfirmation', 'true');
  });

  it('should be the first screen once the player has confirmed', async () => {
    await launchApp('/');

    expect(currentPathname()).toBe('/');
    expect(screen.getByRole('header', { name: copy.appName })).toBeOnTheScreen();
    expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
  });

  it('should open round setup from the available tile', async () => {
    if (!availableEntry) throw new Error('The registry has no available game');
    await launchApp('/');

    fireEvent.press(screen.getByRole('button', { name: displayNames[availableEntry.id].title }));
    await waitFor(() => expect(currentPathname()).toBe(availableEntry.setupRoute));

    expect(
      screen.getByRole('header', { name: displayNames[availableEntry.id].title }),
    ).toBeOnTheScreen();
    expect(screen.getByText(copy.roundSetup.status)).toBeOnTheScreen();
  });

  it('should return to the hub from round setup with the back button', async () => {
    if (!availableEntry) throw new Error('The registry has no available game');
    await launchApp('/');
    fireEvent.press(screen.getByRole('button', { name: displayNames[availableEntry.id].title }));
    await waitFor(() => expect(currentPathname()).toBe(availableEntry.setupRoute));

    fireEvent.press(screen.getByRole('button', { name: copy.roundSetup.backLabel }));
    await waitFor(() => expect(currentPathname()).toBe('/'));

    expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
  });

  it('should leave the hub where it is when the coming soon tile is pressed', async () => {
    if (!comingSoonEntry) throw new Error('The registry has no coming soon game');
    await launchApp('/');

    fireEvent.press(
      screen.getByRole('button', {
        name: `${displayNames[comingSoonEntry.id].title}, ${copy.hub.comingSoon}`,
      }),
    );

    expect(currentPathname()).toBe('/');
  });

  it('should open round setup straight from a deep link', async () => {
    if (!availableEntry) throw new Error('The registry has no available game');
    await launchApp(availableEntry.setupRoute);

    expect(currentPathname()).toBe(availableEntry.setupRoute);
    expect(screen.getByText(copy.roundSetup.status)).toBeOnTheScreen();
  });
});
