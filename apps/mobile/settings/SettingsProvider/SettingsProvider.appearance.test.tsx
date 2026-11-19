import { colorThemes } from '@getfreak/tokens';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { colorScheme, screen } from 'nativewind/test';
import type { ReactNode } from 'react';
import { Appearance, View } from 'react-native';

import type { Storage } from '../../storage';
import { createInMemoryBackend } from '../../storage/createInMemoryBackend';
import { createStorage } from '../../storage/createStorage';
import { renderThemed } from '../../tailwind/renderThemed';
import { SettingsProvider } from './SettingsProvider';
import { useSettings } from './useSettings';

// Match phone takes the override away. React Native 0.82 and later get "unspecified", and Jest,
// which has no version, gets null.
const noOverride = [null, 'unspecified'];

describe('SettingsProvider appearance', () => {
  let setColorScheme: jest.SpyInstance;
  // What the stored settings had been read and applied as, when the provider first said it was ready.
  let callsWhenReady: unknown[][] | undefined;

  beforeEach(() => {
    setColorScheme = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => {});
    callsWhenReady = undefined;
  });

  afterEach(() => {
    setColorScheme.mockRestore();
    act(() => colorScheme.set('light'));
  });

  function renderSettings(storage: Storage) {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SettingsProvider storage={storage}>{children}</SettingsProvider>
    );
    return renderHook(
      () => {
        const settings = useSettings();
        if (!settings.isLoading && callsWhenReady === undefined) {
          callsWhenReady = [...setColorScheme.mock.calls];
        }
        return settings;
      },
      { wrapper },
    );
  }

  function backendWith(appearance: string) {
    const backend = createInMemoryBackend();
    backend.entries.set('appearance', appearance);
    return backend;
  }

  it('should match the phone when nothing is stored', async () => {
    const { result } = renderSettings(createStorage(createInMemoryBackend()));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.appearance).toBe('system');
    expect(noOverride).toContain(setColorScheme.mock.lastCall?.[0]);
  });

  it.each(['light', 'dark'])('should apply a stored %s choice', async (choice) => {
    const { result } = renderSettings(createStorage(backendWith(JSON.stringify(choice))));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.appearance).toBe(choice);
    expect(setColorScheme).toHaveBeenLastCalledWith(choice);
    expect(colorScheme.get()).toBe(choice);
  });

  it('should have applied the stored choice by the time the settings count as loaded', async () => {
    const { result } = renderSettings(createStorage(backendWith('"dark"')));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(callsWhenReady).toEqual([['dark']]);
  });

  it.each(['"auto"', '"Dark"', '3', 'null', 'not json'])(
    'should treat the stored value %s as match phone',
    async (stored) => {
      const { result } = renderSettings(createStorage(backendWith(stored)));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.appearance).toBe('system');
      expect(noOverride).toContain(setColorScheme.mock.lastCall?.[0]);
    },
  );

  it('should match the phone when the read fails', async () => {
    const failingStorage: Storage = {
      ...createStorage(createInMemoryBackend()),
      get: () => Promise.reject(new Error('The read failed')),
    };
    const { result } = renderSettings(failingStorage);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.appearance).toBe('system');
  });

  it('should apply, store and report a new choice at once', async () => {
    const backend = createInMemoryBackend();
    const { result } = renderSettings(createStorage(backend));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.setAppearance('dark'));

    expect(result.current.appearance).toBe('dark');
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
    expect(backend.entries.get('appearance')).toBe('"dark"');
  });

  it('should give the phone back its say when match phone is chosen again', async () => {
    const { result } = renderSettings(createStorage(backendWith('"dark"')));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.setAppearance('system'));

    expect(result.current.appearance).toBe('system');
    expect(noOverride).toContain(setColorScheme.mock.lastCall?.[0]);
  });

  it('should still apply a new choice for this session when the write fails', async () => {
    const failingStorage: Storage = {
      ...createStorage(createInMemoryBackend()),
      set: () => Promise.reject(new Error('The write failed')),
    };
    const { result } = renderSettings(failingStorage);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.setAppearance('light'));

    expect(result.current.appearance).toBe('light');
    expect(setColorScheme).toHaveBeenLastCalledWith('light');
  });

  it('should go back to match phone when the provider starts again over cleared storage', async () => {
    const backend = backendWith('"dark"');
    const storage = createStorage(backend);
    const first = renderSettings(storage);
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));
    expect(setColorScheme).toHaveBeenLastCalledWith('dark');
    first.unmount();

    await storage.clearAll();
    callsWhenReady = undefined;
    const second = renderSettings(storage);
    await waitFor(() => expect(second.result.current.isLoading).toBe(false));

    expect(second.result.current.appearance).toBe('system');
    expect(noOverride).toContain(setColorScheme.mock.lastCall?.[0]);
  });

  describe('the class tokens', () => {
    function Probe() {
      return (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel="Ground"
          className="bg-background"
        />
      );
    }

    it.each([
      ['light', 'dark'],
      ['dark', 'light'],
    ] as const)(
      'should show the %s colours when it is chosen and the phone is %s',
      async (chosen, phone) => {
        await renderThemed(
          <SettingsProvider storage={createStorage(backendWith(JSON.stringify(chosen)))}>
            <Probe />
          </SettingsProvider>,
          phone,
        );

        await waitFor(() =>
          expect(screen.getByRole('image', { name: 'Ground' })).toHaveStyle({
            backgroundColor: colorThemes[chosen].background.toLowerCase(),
          }),
        );
      },
    );
  });
});
