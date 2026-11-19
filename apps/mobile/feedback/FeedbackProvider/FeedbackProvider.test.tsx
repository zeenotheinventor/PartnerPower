import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { SettingsProvider, useSettings } from '../../settings';
import { createInMemoryBackend } from '../../storage/createInMemoryBackend';
import { createStorage } from '../../storage/createStorage';
import type { FeedbackDevice } from '../types';
import { FeedbackProvider } from './FeedbackProvider';
import { useFeedback } from './useFeedback';

jest.mock('../nativeFeedbackDevice', () => ({ createNativeFeedbackDevice: jest.fn() }));

function createFakeDevice(): FeedbackDevice {
  return { playSound: jest.fn(), triggerHaptic: jest.fn(), cancelHaptics: jest.fn() };
}

function renderFeedback(device: FeedbackDevice, backend = createInMemoryBackend()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SettingsProvider storage={createStorage(backend)}>
      <FeedbackProvider device={device}>{children}</FeedbackProvider>
    </SettingsProvider>
  );
  return renderHook(() => ({ feedback: useFeedback(), settings: useSettings() }), { wrapper });
}

describe('FeedbackProvider', () => {
  it('should play the sound and fire the haptic of a moment when both are on', async () => {
    const device = createFakeDevice();
    const { result } = renderFeedback(device);
    await waitFor(() => expect(result.current.settings.isLoading).toBe(false));

    result.current.feedback.done();

    expect(device.playSound).toHaveBeenCalledWith('done');
    expect(device.triggerHaptic).toHaveBeenCalledWith('done');
  });

  it('should play nothing once the player turns the sound setting off', async () => {
    const device = createFakeDevice();
    const { result } = renderFeedback(device);
    await waitFor(() => expect(result.current.settings.isLoading).toBe(false));

    await act(() => result.current.settings.setSoundOn(false));
    result.current.feedback.tap();

    expect(device.playSound).not.toHaveBeenCalled();
    expect(device.triggerHaptic).toHaveBeenCalledWith('tap');
  });

  it('should fire nothing once the player turns the vibration setting off', async () => {
    const device = createFakeDevice();
    const { result } = renderFeedback(device);
    await waitFor(() => expect(result.current.settings.isLoading).toBe(false));

    await act(() => result.current.settings.setHapticsOn(false));
    result.current.feedback.roundComplete();
    result.current.feedback.pass();

    expect(device.triggerHaptic).not.toHaveBeenCalled();
    expect(device.playSound).toHaveBeenCalledWith('pass');
  });

  it('should drop a pending haptic pattern when vibration is turned off', async () => {
    const device = createFakeDevice();
    const { result } = renderFeedback(device);
    await waitFor(() => expect(result.current.settings.isLoading).toBe(false));
    expect(device.cancelHaptics).not.toHaveBeenCalled();

    await act(() => result.current.settings.setHapticsOn(false));

    expect(device.cancelHaptics).toHaveBeenCalled();
  });

  it('should use the stored settings from the start', async () => {
    const device = createFakeDevice();
    const backend = createInMemoryBackend();
    backend.entries.set('soundOn', 'false');
    backend.entries.set('hapticsOn', 'false');
    const { result } = renderFeedback(device, backend);
    await waitFor(() => expect(result.current.settings.isLoading).toBe(false));

    result.current.feedback.tap();

    expect(device.playSound).not.toHaveBeenCalled();
    expect(device.triggerHaptic).not.toHaveBeenCalled();
  });

  it('should be silent, and not throw, when there is no provider', () => {
    const { result } = renderHook(() => useFeedback());

    expect(() => result.current.tap()).not.toThrow();
    expect(() => result.current.roundComplete()).not.toThrow();
    expect(() => result.current.timerEnd()).not.toThrow();
  });
});
