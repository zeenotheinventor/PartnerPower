import { copy } from '@getfreak/content';
import { act, waitFor } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import type { ReactNode } from 'react';

import { SettingsProvider, useSettings } from '../../../settings';
import { createInMemoryBackend } from '../../../storage/createInMemoryBackend';
import { createStorage } from '../../../storage/createStorage';
import { renderThemed } from '../../../tailwind/renderThemed';
import { SettingsScreen } from './SettingsScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

// The app only renders a screen once the settings have loaded, so the test does the same.
function AfterSettingsLoad({ children }: { children: ReactNode }) {
  return useSettings().isLoading ? null : children;
}

async function renderScreen(backend = createInMemoryBackend()) {
  await renderThemed(
    <SettingsProvider storage={createStorage(backend)}>
      <AfterSettingsLoad>
        <SettingsScreen />
      </AfterSettingsLoad>
    </SettingsProvider>,
  );
  await waitFor(() => expect(screen.getByRole('header')).toBeOnTheScreen());
  return backend;
}

const soundsSwitch = () => screen.getByRole('switch', { name: copy.settings.soundsLabel });
const vibrationSwitch = () => screen.getByRole('switch', { name: copy.settings.vibrationLabel });

describe('SettingsScreen', () => {
  beforeEach(() => {
    mockCanGoBack = true;
    jest.clearAllMocks();
  });

  it('should show the title as the heading', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: copy.settings.title })).toBeOnTheScreen();
  });

  it('should show a caption under each setting', async () => {
    await renderScreen();

    expect(screen.getByText(copy.settings.soundsCaption)).toBeOnTheScreen();
    expect(screen.getByText(copy.settings.vibrationCaption)).toBeOnTheScreen();
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
});
