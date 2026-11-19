// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from './testing/appEnvironment';

import { copy } from '@getfreak/content';
import { cancelAllScheduledNotificationsAsync } from 'expo-notifications';
import { Slot } from 'expo-router';
import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';
import { Pressable, Text } from 'react-native';

import RootLayout from '../../app/_layout';
import { useClearEverything } from '../../storage/useClearEverything';
import WelcomeRoute from '../../app/welcome';

// The secure store is a native module, so the test gets an in-memory one. The items stand for what
// a phone that has a lock and a database key holds.
const mockSecureItems = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: (key: string) => Promise.resolve(mockSecureItems.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    mockSecureItems.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    mockSecureItems.delete(key);
    return Promise.resolve();
  },
}));

const clearButtonName = 'Clear for the test';

// Stands in for the settings screen, which is another ticket. It runs the real clear everything.
function ClearEverythingRoute() {
  const clearEverything = useClearEverything();
  return (
    <>
      <Text accessibilityRole="header">{copy.appName}</Text>
      <Pressable accessibilityRole="button" onPress={() => void clearEverything()}>
        <Text>{clearButtonName}</Text>
      </Pressable>
    </>
  );
}

// The real root layout and welcome route, with the screens behind the guard replaced.
const routes = {
  _layout: RootLayout,
  index: ClearEverythingRoute,
  welcome: WelcomeRoute,
  settings: () => null,
  'dev/kit': () => null,
  'games/dares/_layout': Slot,
  'games/dares/setup': () => null,
};

describe('clear everything in the real root layout', () => {
  beforeEach(async () => {
    await backend.clear();
    mockSecureItems.clear();
    await backend.setItem('entryConfirmation', 'true');
    await backend.setItem('installMarker', 'true');
    await backend.setItem('playerNames', JSON.stringify(['Name 1', 'Name 2']));
    await backend.setItem('reminder', JSON.stringify({ day: 5, hour: 20 }));
    jest.mocked(cancelAllScheduledNotificationsAsync).mockClear();
    mockSecureItems.set(
      'lockPinHash',
      JSON.stringify({ salt: 'a'.repeat(32), hash: 'b'.repeat(64) }),
    );
    mockSecureItems.set('lockBiometricsChoice', 'true');
  });

  it('should be past the entry confirmation before it clears', async () => {
    await launchApp('/', routes);

    expect(currentPathname()).toBe('/');
    expect(screen.getByRole('button', { name: clearButtonName })).toBeOnTheScreen();
  });

  it('should empty the stores and show the 18+ confirmation screen', async () => {
    await launchApp('/', routes);

    fireEvent.press(screen.getByRole('button', { name: clearButtonName }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => expect(currentPathname()).toBe('/welcome'));
    expect(screen.getByRole('button', { name: copy.welcome.confirmLabel })).toBeOnTheScreen();
    expect(mockSecureItems.size).toBe(0);
    expect(await backend.getItem('playerNames')).toBeNull();
    expect(await backend.getItem('entryConfirmation')).toBeNull();
  });

  it('should cancel the scheduled reminder and forget its setting', async () => {
    await launchApp('/', routes);

    fireEvent.press(screen.getByRole('button', { name: clearButtonName }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => expect(currentPathname()).toBe('/welcome'));
    expect(cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(await backend.getItem('reminder')).toBeNull();
  });

  it('should keep the install marker, so the next launch does not clear again', async () => {
    await launchApp('/', routes);

    fireEvent.press(screen.getByRole('button', { name: clearButtonName }));
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => expect(currentPathname()).toBe('/welcome'));
    expect(await backend.getItem('installMarker')).toBe('true');
  });
});
