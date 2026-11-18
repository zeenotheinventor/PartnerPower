import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { createInMemoryBackend } from '../../storage/createInMemoryBackend';
import { createStorage } from '../../storage/createStorage';
import type { Storage } from '../../storage';
import { SettingsProvider } from './SettingsProvider';
import { useSettings } from './useSettings';

function renderSettings(storage: Storage) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsProvider storage={storage}>{children}</SettingsProvider>
  );
  return renderHook(() => useSettings(), { wrapper });
}

const consoleMethods = ['log', 'info', 'warn', 'error', 'debug'] as const;

describe('SettingsProvider', () => {
  const consoleSpies = consoleMethods.map((method) => jest.spyOn(console, method));

  afterEach(() => {
    consoleSpies.forEach((spy) => spy.mockClear());
  });

  afterAll(() => {
    consoleSpies.forEach((spy) => spy.mockRestore());
  });

  function expectNothingLogged() {
    consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
  }

  it('should be loading until the stored value has been read', async () => {
    const { result } = renderSettings(createStorage(createInMemoryBackend()));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should report a stored confirmation as confirmed once loaded', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('entryConfirmation', 'true');
    const { result } = renderSettings(createStorage(backend));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasConfirmedEntry).toBe(true);
    expectNothingLogged();
  });

  it('should report no stored confirmation as not confirmed once loaded', async () => {
    const { result } = renderSettings(createStorage(createInMemoryBackend()));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasConfirmedEntry).toBe(false);
    expectNothingLogged();
  });

  it('should treat a stored false as not confirmed', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('entryConfirmation', 'false');
    const { result } = renderSettings(createStorage(backend));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasConfirmedEntry).toBe(false);
  });

  it('should treat an invalid stored value as not confirmed', async () => {
    const backend = createInMemoryBackend();
    backend.entries.set('entryConfirmation', '"yes"');
    const { result } = renderSettings(createStorage(backend));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasConfirmedEntry).toBe(false);
    expectNothingLogged();
  });

  it('should treat a failing read as not confirmed', async () => {
    const failingStorage: Storage = {
      ...createStorage(createInMemoryBackend()),
      get: () => Promise.reject(new Error('The read failed')),
    };
    const { result } = renderSettings(failingStorage);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasConfirmedEntry).toBe(false);
    expectNothingLogged();
  });

  it('should write the confirmation to storage and report it as confirmed', async () => {
    const backend = createInMemoryBackend();
    const { result } = renderSettings(createStorage(backend));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.confirmEntry());

    expect(backend.entries.get('entryConfirmation')).toBe('true');
    expect(result.current.hasConfirmedEntry).toBe(true);
    expectNothingLogged();
  });

  it('should still report confirmed for this session when the write fails', async () => {
    const failingStorage: Storage = {
      ...createStorage(createInMemoryBackend()),
      set: () => Promise.reject(new Error('The write failed')),
    };
    const { result } = renderSettings(failingStorage);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.confirmEntry());

    expect(result.current.hasConfirmedEntry).toBe(true);
    expectNothingLogged();
  });

  it('should not report confirmed until the write has finished', async () => {
    let finishWrite: () => void = () => {};
    const slowStorage: Storage = {
      ...createStorage(createInMemoryBackend()),
      set: () => new Promise<void>((resolve) => (finishWrite = resolve)),
    };
    const { result } = renderSettings(slowStorage);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let confirming: Promise<void> = Promise.resolve();
    act(() => {
      confirming = result.current.confirmEntry();
    });

    expect(result.current.hasConfirmedEntry).toBe(false);

    await act(async () => {
      finishWrite();
      await confirming;
    });

    expect(result.current.hasConfirmedEntry).toBe(true);
  });

  it('should ignore a read that finishes after the storage has been replaced', async () => {
    let finishStaleRead: (storedText: string) => void = () => {};
    const staleStorage = createStorage({
      ...createInMemoryBackend(),
      getItem: () => new Promise<string | null>((resolve) => (finishStaleRead = resolve)),
    });
    let storageInUse = staleStorage;
    const { result, rerender } = renderHook(() => useSettings(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <SettingsProvider storage={storageInUse}>{children}</SettingsProvider>
      ),
    });

    storageInUse = createStorage(createInMemoryBackend());
    rerender({});
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      finishStaleRead('true');
    });

    expect(result.current.hasConfirmedEntry).toBe(false);
  });

  it('should fail clearly when used outside the provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSettings())).toThrow('useSettings needs a SettingsProvider');
  });
});
