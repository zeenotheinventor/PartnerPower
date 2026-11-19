// This import comes first so that its mocks are in place before Expo Router loads.
import { backend, currentPathname, launchApp } from '../welcome/testing/appEnvironment';

import { copy, privacyPolicy } from '@getfreak/content';
import { router } from 'expo-router';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';

// The secure store is a native module, so the test gets an in-memory one. The items stand for what
// a phone that has a lock and a database key holds. A test can make the next deletes fail.
const mockSecureItems = new Map<string, string>();
let mockFailingDeletes = 0;
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: (key: string) => Promise.resolve(mockSecureItems.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    mockSecureItems.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    if (mockFailingDeletes > 0) {
      mockFailingDeletes -= 1;
      return Promise.reject(new Error('The keychain is not available.'));
    }
    mockSecureItems.delete(key);
    return Promise.resolve();
  },
}));

async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(1000);
  });
}

async function openSettingsFromTheHub() {
  await launchApp('/');
  fireEvent.press(screen.getByRole('button', { name: copy.hub.settings }));
  await waitFor(() => expect(currentPathname()).toBe('/settings'));
}

const clearRow = () => screen.getByRole('button', { name: copy.settings.clearLabel });
const dialogButton = (name: string) =>
  within(screen.getByLabelText(copy.clear.title)).getByRole('button', { name });

async function confirmClear(name: string = copy.clear.confirm) {
  fireEvent.press(dialogButton(name));
  await settle();
}

describe('Settings in the real route tree', () => {
  beforeEach(async () => {
    await backend.clear();
    mockSecureItems.clear();
    mockFailingDeletes = 0;
    await backend.setItem('entryConfirmation', 'true');
    await backend.setItem('installMarker', 'true');
    await backend.setItem('playerNames', JSON.stringify(['Name 1', 'Name 2']));
    mockSecureItems.set(
      'lockPinHash',
      JSON.stringify({ salt: 'a'.repeat(32), hash: 'b'.repeat(64) }),
    );
    mockSecureItems.set('lockBiometricsChoice', 'true');
  });

  describe('opening it', () => {
    it('should open from the hub, with the switches, the policy row and the version', async () => {
      await openSettingsFromTheHub();

      expect(screen.getByRole('header', { name: copy.settings.title })).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: copy.settings.soundsLabel })).toBeOnTheScreen();
      expect(screen.getByRole('switch', { name: copy.settings.vibrationLabel })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: copy.settings.privacyLabel })).toBeOnTheScreen();
      expect(clearRow()).toBeOnTheScreen();
      expect(screen.getByText(/^Version /)).toBeOnTheScreen();
    });

    it('should go back to the hub from the back button', async () => {
      await openSettingsFromTheHub();

      fireEvent.press(screen.getByRole('button', { name: copy.settings.backLabel }));
      await waitFor(() => expect(currentPathname()).toBe('/'));

      expect(screen.getByText(copy.hub.greeting)).toBeOnTheScreen();
    });

    it('should open straight from a deep link, and go to the hub from back', async () => {
      await launchApp('/settings');

      expect(screen.getByRole('header', { name: copy.settings.title })).toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: copy.settings.backLabel }));
      await waitFor(() => expect(currentPathname()).toBe('/'));
    });
  });

  describe('the privacy policy', () => {
    it('should open from its row and show the text, then go back to settings', async () => {
      await openSettingsFromTheHub();

      fireEvent.press(screen.getByRole('button', { name: copy.settings.privacyLabel }));
      await waitFor(() => expect(currentPathname()).toBe('/privacy'));

      expect(screen.getByRole('header', { name: privacyPolicy.title })).toBeOnTheScreen();
      privacyPolicy.sections.forEach((section) =>
        expect(screen.getByRole('header', { name: section.heading })).toBeOnTheScreen(),
      );

      fireEvent.press(screen.getByRole('button', { name: copy.privacy.backLabel }));
      await waitFor(() => expect(currentPathname()).toBe('/settings'));
    });
  });

  describe('clear everything', () => {
    it('should ask first, and leave everything alone when cancelled', async () => {
      await openSettingsFromTheHub();

      fireEvent.press(clearRow());
      expect(screen.getByLabelText(copy.clear.title)).toHaveProp('role', 'alertdialog');
      await confirmClear(copy.clear.cancel);

      expect(screen.queryByLabelText(copy.clear.title)).not.toBeOnTheScreen();
      expect(currentPathname()).toBe('/settings');
      expect(await backend.getItem('playerNames')).not.toBeNull();
      expect(mockSecureItems.size).toBe(2);
    });

    it('should empty the stores and show the 18+ confirmation, with nothing to go back to', async () => {
      await openSettingsFromTheHub();
      expect(router.canGoBack()).toBe(true);

      fireEvent.press(clearRow());
      await confirmClear();

      await waitFor(() => expect(currentPathname()).toBe('/welcome'));
      expect(screen.getByRole('button', { name: copy.welcome.confirmLabel })).toBeOnTheScreen();
      expect(router.canGoBack()).toBe(false);
      expect(screen.queryByRole('header', { name: copy.settings.title })).not.toBeOnTheScreen();
      expect(mockSecureItems.size).toBe(0);
      expect(await backend.getItem('playerNames')).toBeNull();
      expect(await backend.getItem('entryConfirmation')).toBeNull();
    });

    it('should keep only the install marker, so the next launch does not clear again', async () => {
      await backend.setItem('soundOn', 'false');
      await backend.setItem('hapticsOn', 'false');
      await openSettingsFromTheHub();

      fireEvent.press(clearRow());
      await confirmClear();

      await waitFor(() => expect(currentPathname()).toBe('/welcome'));
      expect(await backend.getItem('installMarker')).toBe('true');
      for (const key of ['soundOn', 'hapticsOn', 'playerNames', 'entryConfirmation']) {
        expect(await backend.getItem(key)).toBeNull();
      }
    });

    it('should stay in settings when the clear fails, then finish on Try again', async () => {
      mockFailingDeletes = 1;
      await openSettingsFromTheHub();

      fireEvent.press(clearRow());
      await confirmClear();

      expect(currentPathname()).toBe('/settings');
      expect(screen.getByRole('alert')).toHaveTextContent(copy.clear.failed);
      expect(dialogButton(copy.clear.retry)).toBeOnTheScreen();

      await confirmClear(copy.clear.retry);

      await waitFor(() => expect(currentPathname()).toBe('/welcome'));
      expect(screen.getByRole('button', { name: copy.welcome.confirmLabel })).toBeOnTheScreen();
      expect(mockSecureItems.size).toBe(0);
      expect(await backend.getItem('playerNames')).toBeNull();
    });

    it('should let the player cancel after a failure and keep using settings', async () => {
      mockFailingDeletes = 1;
      await openSettingsFromTheHub();
      fireEvent.press(clearRow());
      await confirmClear();

      await confirmClear(copy.clear.cancel);

      expect(screen.queryByLabelText(copy.clear.title)).not.toBeOnTheScreen();
      expect(currentPathname()).toBe('/settings');
      expect(screen.getByRole('header', { name: copy.settings.title })).toBeOnTheScreen();
    });
  });
});
