import { copy } from '@getfreak/content';
import { act, waitFor, within } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import type { ReactNode } from 'react';

import { LockServiceContext } from '../../../lock';
import { createTestLock } from '../../../lock/testing/createTestLock';
import { ReminderServiceContext } from '../../../reminder';
import { createTestReminder } from '../../../reminder/testing/createTestReminder';
import { SettingsProvider, useSettings } from '../../../settings';
import type { ClearEverythingResult } from '../../../storage/clearEverything';
import { createInMemoryBackend } from '../../../storage/createInMemoryBackend';
import { createStorage } from '../../../storage/createStorage';
import { renderThemed } from '../../../tailwind/renderThemed';
import { SettingsScreen } from './SettingsScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({
      back: mockBack,
      replace: mockReplace,
      push: mockPush,
      canGoBack: () => mockCanGoBack,
    }),
    // The screen is always in focus here, so the effect runs once, when it mounts.
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

// The real clear needs the root and the phone's stores. The route tests run it. Here it is a mock.
const mockClearEverything = jest.fn<Promise<ClearEverythingResult>, []>();
jest.mock('../../../storage/useClearEverything', () => ({
  useClearEverything: () => mockClearEverything,
}));

jest.mock('../getAppVersionLabel', () => ({
  getAppVersionLabel: () => 'Version 9.9.9 (99)',
}));

// The app only renders a screen once the settings have loaded, so the test does the same.
function AfterSettingsLoad({ children }: { children: ReactNode }) {
  return useSettings().isLoading ? null : children;
}

async function renderScreen(
  backend = createInMemoryBackend(),
  reminder = createTestReminder().reminder,
) {
  await renderThemed(
    <LockServiceContext.Provider value={createTestLock().lock}>
      <ReminderServiceContext.Provider value={reminder}>
        <SettingsProvider storage={createStorage(backend)}>
          <AfterSettingsLoad>
            <SettingsScreen />
          </AfterSettingsLoad>
        </SettingsProvider>
      </ReminderServiceContext.Provider>
    </LockServiceContext.Provider>,
  );
  await waitFor(() => expect(screen.getByRole('header')).toBeOnTheScreen());
  return backend;
}

const soundsSwitch = () => screen.getByRole('switch', { name: copy.settings.soundsLabel });
const vibrationSwitch = () => screen.getByRole('switch', { name: copy.settings.vibrationLabel });

const clearRow = () => screen.getByRole('button', { name: copy.settings.clearLabel });

// The row and the confirm button share a name, so the dialog's buttons are found inside it.
const dialogButton = (name: string) =>
  within(screen.getByLabelText(copy.clear.title)).getByRole('button', { name });

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockCanGoBack = true;
    jest.clearAllMocks();
    mockClearEverything.mockResolvedValue({ ok: true });
  });

  it('should show the title as the heading', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: copy.settings.title })).toBeOnTheScreen();
  });

  it('should show a caption under each setting, and give it as the hint of the switch', async () => {
    await renderScreen();

    expect(screen.getByText(copy.settings.soundsCaption)).toBeOnTheScreen();
    expect(screen.getByText(copy.settings.vibrationCaption)).toBeOnTheScreen();
    expect(soundsSwitch().props.accessibilityHint).toBe(copy.settings.soundsCaption);
    expect(vibrationSwitch().props.accessibilityHint).toBe(copy.settings.vibrationCaption);
  });

  it('should show both settings as on when nothing is stored', async () => {
    await renderScreen();

    expect(soundsSwitch()).toBeChecked();
    expect(vibrationSwitch()).toBeChecked();
  });

  it('should show a setting stored as off', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('soundOn', 'false');
    await renderScreen(backend);

    expect(soundsSwitch()).not.toBeChecked();
    expect(vibrationSwitch()).toBeChecked();
  });

  it('should turn sounds off and store it, leaving vibration alone', async () => {
    const backend = await renderScreen();

    await act(async () => fireEvent.press(soundsSwitch()));

    expect(soundsSwitch()).not.toBeChecked();
    expect(vibrationSwitch()).toBeChecked();
    expect(backend.entries.get('soundOn')).toBe('false');
    expect(backend.entries.has('hapticsOn')).toBe(false);
  });

  it('should turn vibration off and store it, leaving sounds alone', async () => {
    const backend = await renderScreen();

    await act(async () => fireEvent.press(vibrationSwitch()));

    expect(vibrationSwitch()).not.toBeChecked();
    expect(soundsSwitch()).toBeChecked();
    expect(backend.entries.get('hapticsOn')).toBe('false');
    expect(backend.entries.has('soundOn')).toBe(false);
  });

  it('should turn a setting back on and store it', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('hapticsOn', 'false');
    await renderScreen(backend);

    await act(async () => fireEvent.press(vibrationSwitch()));

    expect(vibrationSwitch()).toBeChecked();
    expect(backend.entries.get('hapticsOn')).toBe('true');
  });

  it('should go back with the back button', async () => {
    await renderScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.settings.backLabel }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('should go to the hub when there is nothing to go back to', async () => {
    mockCanGoBack = false;
    await renderScreen();

    fireEvent.press(screen.getByRole('button', { name: copy.settings.backLabel }));

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  describe('the sections', () => {
    it('should show the three sections', async () => {
      await renderScreen();

      expect(screen.getByText(copy.settings.playSection)).toBeOnTheScreen();
      expect(screen.getByText(copy.settings.privacySection)).toBeOnTheScreen();
      expect(screen.getByText(copy.settings.clearSection)).toBeOnTheScreen();
    });

    it('should show the version at the foot of the screen', async () => {
      await renderScreen();

      expect(screen.getByText('Version 9.9.9 (99)')).toBeOnTheScreen();
    });
  });

  describe('the App lock row', () => {
    it('should sit in the Privacy section, above the privacy policy row', async () => {
      await renderScreen();

      const labels = screen
        .getAllByRole('button')
        .map((button) => button.props.accessibilityLabel)
        .filter(Boolean);
      const lockPosition = labels.findIndex((label: string) =>
        label.startsWith(copy.settings.lockLabel),
      );
      expect(lockPosition).toBeGreaterThan(-1);
      expect(lockPosition).toBeLessThan(labels.indexOf(copy.settings.privacyLabel));
    });

    it('should open the App lock screen', async () => {
      await renderScreen();

      fireEvent.press(screen.getByRole('button', { name: /^App lock/ }));

      expect(mockPush).toHaveBeenCalledWith('/app-lock');
    });
  });

  describe('the Reminder row', () => {
    it('should sit in the Privacy section, between the App lock row and the privacy policy row', async () => {
      await renderScreen();

      const labels = screen
        .getAllByRole('button')
        .map((button) => button.props.accessibilityLabel)
        .filter(Boolean);
      const reminderPosition = labels.findIndex((label: string) =>
        label.startsWith(copy.settings.reminderLabel),
      );
      expect(reminderPosition).toBeGreaterThan(
        labels.findIndex((label: string) => label.startsWith(copy.settings.lockLabel)),
      );
      expect(reminderPosition).toBeLessThan(labels.indexOf(copy.settings.privacyLabel));
    });

    it('should say Off once the reminder has been read, and open the Reminder screen', async () => {
      await renderScreen();

      fireEvent.press(
        await screen.findByRole('button', {
          name: `${copy.settings.reminderLabel}, ${copy.settings.reminderOff}`,
        }),
      );

      expect(mockPush).toHaveBeenCalledWith('/reminder');
    });

    it('should say Off even when the reminder is read late', async () => {
      let finishRead: () => void = () => {};
      const { reminder } = createTestReminder();
      const lateReminder = {
        ...reminder,
        read: () =>
          new Promise<{ status: 'off' }>((resolve) => {
            finishRead = () => resolve({ status: 'off' });
          }),
      };
      await renderScreen(createInMemoryBackend(), lateReminder);

      // Before the read finishes the row has no value, so its name is the label alone.
      expect(screen.getByRole('button', { name: copy.settings.reminderLabel })).toBeOnTheScreen();
      await act(async () => finishRead());

      expect(
        await screen.findByRole('button', {
          name: `${copy.settings.reminderLabel}, ${copy.settings.reminderOff}`,
        }),
      ).toBeOnTheScreen();
    });
  });

  describe('the privacy policy row', () => {
    it('should be a button with the label, and open the privacy screen', async () => {
      await renderScreen();

      fireEvent.press(screen.getByRole('button', { name: copy.settings.privacyLabel }));

      expect(mockPush).toHaveBeenCalledWith('/privacy');
    });
  });

  describe('the clear everything row', () => {
    it('should give its caption as the hint of the row', async () => {
      await renderScreen();

      expect(clearRow().props.accessibilityHint).toBe(copy.settings.clearCaption);
    });

    it('should show no dialog, and clear nothing, until the row is pressed', async () => {
      await renderScreen();

      expect(screen.queryByLabelText(copy.clear.title)).not.toBeOnTheScreen();
      expect(mockClearEverything).not.toHaveBeenCalled();
    });

    it('should ask first when the row is pressed, and clear nothing yet', async () => {
      await renderScreen();

      fireEvent.press(clearRow());

      expect(screen.getByLabelText(copy.clear.title)).toHaveProp('role', 'alertdialog');
      expect(mockClearEverything).not.toHaveBeenCalled();
    });

    it('should close the dialog from Cancel, stay in settings and clear nothing', async () => {
      await renderScreen();
      fireEvent.press(clearRow());

      fireEvent.press(dialogButton(copy.clear.cancel));

      expect(screen.queryByLabelText(copy.clear.title)).not.toBeOnTheScreen();
      expect(screen.getByRole('header', { name: copy.settings.title })).toBeOnTheScreen();
      expect(mockClearEverything).not.toHaveBeenCalled();
    });

    it('should clear when confirmed, and show the clearing state', async () => {
      mockClearEverything.mockReturnValue(new Promise(() => {}));
      await renderScreen();
      fireEvent.press(clearRow());

      await act(async () => fireEvent.press(dialogButton(copy.clear.confirm)));

      expect(mockClearEverything).toHaveBeenCalledTimes(1);
      expect(dialogButton(copy.clear.clearing)).toBeDisabled();
    });

    it('should stay in settings when the clear fails, and clear again from Try again', async () => {
      mockClearEverything.mockResolvedValueOnce({ ok: false });
      await renderScreen();
      fireEvent.press(clearRow());
      await act(async () => fireEvent.press(dialogButton(copy.clear.confirm)));

      expect(screen.getByRole('alert')).toHaveTextContent(copy.clear.failed);
      expect(mockReplace).not.toHaveBeenCalled();

      await act(async () => fireEvent.press(dialogButton(copy.clear.retry)));

      expect(mockClearEverything).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    });

    it('should ask again from the start when it is opened again after a failure', async () => {
      mockClearEverything.mockResolvedValueOnce({ ok: false });
      await renderScreen();
      fireEvent.press(clearRow());
      await act(async () => fireEvent.press(dialogButton(copy.clear.confirm)));
      fireEvent.press(dialogButton(copy.clear.cancel));

      fireEvent.press(clearRow());

      expect(dialogButton(copy.clear.confirm)).toBeOnTheScreen();
      expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
    });
  });
});
