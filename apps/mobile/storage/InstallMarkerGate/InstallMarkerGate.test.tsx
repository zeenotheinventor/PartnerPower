import { act, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { createInMemoryBackend } from '../createInMemoryBackend';
import { createSecureStorage } from '../createSecureStorage';
import { createStorage } from '../createStorage';
import { InstallMarkerGate, installCheckTimeoutMilliseconds } from './InstallMarkerGate';

function createFixture() {
  const keyValueBackend = createInMemoryBackend();
  const secureBackend = createInMemoryBackend();
  return {
    keyValueBackend,
    secureBackend,
    storage: createStorage(keyValueBackend),
    secureStorage: createSecureStorage(secureBackend),
  };
}

describe('InstallMarkerGate', () => {
  it('should hold its children back until the install check is done', async () => {
    const { storage, secureStorage } = createFixture();

    render(
      <InstallMarkerGate storage={storage} secureStorage={secureStorage}>
        <Text>Ready</Text>
      </InstallMarkerGate>,
    );

    expect(screen.queryByText('Ready')).not.toBeOnTheScreen();
    expect(await screen.findByText('Ready')).toBeOnTheScreen();
  });

  it('should clear the old secure items before a child reads them', async () => {
    const { secureBackend, storage, secureStorage } = createFixture();
    secureBackend.entries.set('lockPinHash', JSON.stringify({ salt: 'a', hash: 'b' }));
    const seenByChild: (string | null)[] = [];
    function ReadsSecureItems() {
      useEffect(() => {
        secureBackend.getItem('lockPinHash').then((value) => seenByChild.push(value));
      }, []);
      return <Text>Child</Text>;
    }

    render(
      <InstallMarkerGate storage={storage} secureStorage={secureStorage}>
        <ReadsSecureItems />
      </InstallMarkerGate>,
    );
    await screen.findByText('Child');

    expect(seenByChild).toEqual([null]);
  });

  it('should write the marker', async () => {
    const { keyValueBackend, storage, secureStorage } = createFixture();

    render(
      <InstallMarkerGate storage={storage} secureStorage={secureStorage}>
        <Text>Ready</Text>
      </InstallMarkerGate>,
    );
    await screen.findByText('Ready');

    expect(keyValueBackend.entries.get('installMarker')).toBe('true');
  });

  it('should still show its children when the check could not finish, so the app is never blocked', async () => {
    const { keyValueBackend, secureStorage } = createFixture();
    const unreadableStorage = createStorage({
      ...keyValueBackend,
      getItem: () => Promise.reject(new Error('The read failed')),
    });

    render(
      <InstallMarkerGate storage={unreadableStorage} secureStorage={secureStorage}>
        <Text>Ready</Text>
      </InstallMarkerGate>,
    );

    expect(await screen.findByText('Ready')).toBeOnTheScreen();
  });

  describe('when the native calls never answer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    function renderWithHangingStorage() {
      const { keyValueBackend, secureStorage } = createFixture();
      const hangingStorage = createStorage({
        ...keyValueBackend,
        getItem: () => new Promise<string | null>(() => {}),
      });
      render(
        <InstallMarkerGate storage={hangingStorage} secureStorage={secureStorage}>
          <Text>Ready</Text>
        </InstallMarkerGate>,
      );
    }

    it('should hold its children back until the timeout', async () => {
      renderWithHangingStorage();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(installCheckTimeoutMilliseconds - 1);
      });

      expect(screen.queryByText('Ready')).not.toBeOnTheScreen();
    });

    it('should show its children once the timeout has passed', async () => {
      renderWithHangingStorage();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(installCheckTimeoutMilliseconds);
      });

      expect(screen.getByText('Ready')).toBeOnTheScreen();
    });

    it('should leave the secure items alone when a slow check answers after the timeout', async () => {
      const { keyValueBackend, secureBackend, secureStorage } = createFixture();
      secureBackend.entries.set('lockPinHash', JSON.stringify({ salt: 'a', hash: 'b' }));
      let answerMarkerRead: (value: string | null) => void = () => {};
      const markerRead = new Promise<string | null>((resolve) => {
        answerMarkerRead = resolve;
      });
      const slowStorage = createStorage({ ...keyValueBackend, getItem: () => markerRead });
      render(
        <InstallMarkerGate storage={slowStorage} secureStorage={secureStorage}>
          <Text>Ready</Text>
        </InstallMarkerGate>,
      );
      await act(async () => {
        await jest.advanceTimersByTimeAsync(installCheckTimeoutMilliseconds);
      });
      expect(screen.getByText('Ready')).toBeOnTheScreen();

      await act(async () => {
        answerMarkerRead(null);
        await jest.advanceTimersByTimeAsync(10);
      });

      expect(secureBackend.entries.has('lockPinHash')).toBe(true);
      expect(keyValueBackend.entries.has('installMarker')).toBe(false);
    });

    it('should wait a few seconds, not longer', () => {
      expect(installCheckTimeoutMilliseconds).toBe(3000);
    });
  });
});
