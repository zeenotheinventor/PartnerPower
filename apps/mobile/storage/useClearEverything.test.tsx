import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { createInMemoryBackend } from './createInMemoryBackend';
import { RootRemount } from './RootRemount';
import { useClearEverything } from './useClearEverything';

// The phone's own stores do not exist under Jest, so each is replaced by an in-memory one.
const mockKeyValueBackend = createInMemoryBackend();
const mockSecureBackend = createInMemoryBackend();

// The factories only point at the backends, so they can be made before the backends exist.
jest.mock('./defaultStorage', () => {
  const { createStorage } = jest.requireActual<typeof import('./createStorage')>('./createStorage');
  return {
    storage: createStorage({
      getItem: (key) => mockKeyValueBackend.getItem(key),
      setItem: (key, value) => mockKeyValueBackend.setItem(key, value),
      removeItem: (key) => mockKeyValueBackend.removeItem(key),
      clear: () => mockKeyValueBackend.clear(),
    }),
  };
});

jest.mock('./defaultSecureStorage', () => {
  const { createSecureStorage } =
    jest.requireActual<typeof import('./createSecureStorage')>('./createSecureStorage');
  return {
    secureStorage: createSecureStorage({
      getItem: (key) => mockSecureBackend.getItem(key),
      setItem: (key, value) => mockSecureBackend.setItem(key, value),
      removeItem: (key) => mockSecureBackend.removeItem(key),
    }),
  };
});

const mockCancelScheduledNotifications = jest.fn(() => Promise.resolve());
jest.mock('./cancelScheduledNotifications', () => ({
  cancelScheduledNotifications: () => mockCancelScheduledNotifications(),
}));

function ClearEverythingButton() {
  const clearEverything = useClearEverything();
  const [count, setCount] = useState(0);
  const [outcome, setOutcome] = useState('not run');
  return (
    <>
      <Text>{`Count ${count}`}</Text>
      <Text>{`Outcome ${outcome}`}</Text>
      <Pressable accessibilityRole="button" onPress={() => setCount(count + 1)}>
        <Text>Add one</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => clearEverything().then((result) => setOutcome(result.ok ? 'ok' : 'failed'))}
      >
        <Text>Clear everything</Text>
      </Pressable>
    </>
  );
}

describe('useClearEverything', () => {
  beforeEach(() => {
    mockKeyValueBackend.entries.clear();
    mockSecureBackend.entries.clear();
    mockCancelScheduledNotifications.mockClear();
  });

  it('should clear the stores, cancel notifications and remount the root', async () => {
    const user = userEvent.setup();
    mockKeyValueBackend.entries.set('playerNames', JSON.stringify(['Name 1', 'Name 2']));
    mockSecureBackend.entries.set('lockBiometricsChoice', 'true');
    render(
      <RootRemount>
        <ClearEverythingButton />
      </RootRemount>,
    );
    await user.press(screen.getByRole('button', { name: 'Add one' }));

    await user.press(screen.getByRole('button', { name: 'Clear everything' }));
    await screen.findByText('Count 0');

    expect(mockCancelScheduledNotifications).toHaveBeenCalledTimes(1);
    expect(mockSecureBackend.entries.size).toBe(0);
    expect(mockKeyValueBackend.entries.has('playerNames')).toBe(false);
    expect(mockKeyValueBackend.entries.get('installMarker')).toBe('true');
    expect(screen.getByText('Count 0')).toBeOnTheScreen();
  });
});
