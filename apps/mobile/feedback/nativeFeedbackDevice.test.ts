import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import doneSound from '../assets/sounds/done.wav';
import passSound from '../assets/sounds/pass.wav';
import tapSound from '../assets/sounds/tap.wav';
import { createNativeFeedbackDevice } from './nativeFeedbackDevice';

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));

// Jest gives every asset file the same number, so each sound is given its own to tell them apart.
jest.mock('../assets/sounds/tap.wav', () => ({ __esModule: true, default: 101 }));
jest.mock('../assets/sounds/done.wav', () => ({ __esModule: true, default: 102 }));
jest.mock('../assets/sounds/pass.wav', () => ({ __esModule: true, default: 103 }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  performAndroidHapticsAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Rigid: 'rigid', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
  AndroidHaptics: {
    Virtual_Key: 'virtual-key',
    Confirm: 'confirm',
    Reject: 'reject',
    Long_Press: 'long-press',
  },
}));

const mockCreateAudioPlayer = jest.mocked(createAudioPlayer);
const mockSetAudioMode = jest.mocked(setAudioModeAsync);
const mockImpact = jest.mocked(Haptics.impactAsync);
const mockNotification = jest.mocked(Haptics.notificationAsync);
const mockAndroidHaptics = jest.mocked(Haptics.performAndroidHapticsAsync);

function createFakePlayer() {
  return { seekTo: jest.fn(() => Promise.resolve()), play: jest.fn() };
}

type FakePlayer = ReturnType<typeof createFakePlayer>;

let players: { tap: FakePlayer; done: FakePlayer; pass: FakePlayer };

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

describe('createNativeFeedbackDevice', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.useFakeTimers();
    players = { tap: createFakePlayer(), done: createFakePlayer(), pass: createFakePlayer() };
    const playerBySource = new Map([
      [tapSound, players.tap],
      [doneSound, players.done],
      [passSound, players.pass],
    ]);
    mockCreateAudioPlayer.mockImplementation((source) => {
      // The real player has many more members. The device uses only these two.
      return playerBySource.get(Number(source)) as unknown as ReturnType<typeof createAudioPlayer>;
    });
    mockSetAudioMode.mockResolvedValue(undefined);
    [mockImpact, mockNotification, mockAndroidHaptics].forEach((mock) =>
      mock.mockResolvedValue(undefined),
    );
    setPlatform('ios');
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    setPlatform(originalPlatform);
  });

  describe('the audio session', () => {
    it('should mix with other audio, so music already playing is not stopped or lowered', () => {
      createNativeFeedbackDevice();

      expect(mockSetAudioMode).toHaveBeenCalledWith(
        expect.objectContaining({ interruptionMode: 'mixWithOthers' }),
      );
    });

    it('should respect the iOS silent switch', () => {
      createNativeFeedbackDevice();

      expect(mockSetAudioMode).toHaveBeenCalledWith(
        expect.objectContaining({ playsInSilentMode: false }),
      );
    });

    it('should not ask to play in the background or to record', () => {
      createNativeFeedbackDevice();

      expect(mockSetAudioMode).toHaveBeenCalledWith(
        expect.objectContaining({ shouldPlayInBackground: false, allowsRecording: false }),
      );
    });

    it('should not throw when the audio session cannot be set', async () => {
      mockSetAudioMode.mockRejectedValue(new Error('No audio'));

      expect(() => createNativeFeedbackDevice()).not.toThrow();
      await jest.advanceTimersByTimeAsync(0);
    });
  });

  describe('the sounds', () => {
    it('should load one player for each sound when created, before any press', () => {
      createNativeFeedbackDevice();

      expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(3);
    });

    it('should play only the player of the sound asked for, from the start', () => {
      const device = createNativeFeedbackDevice();

      device.playSound('done');

      expect(players.done.seekTo).toHaveBeenCalledWith(0);
      expect(players.done.play).toHaveBeenCalledTimes(1);
      expect(players.tap.play).not.toHaveBeenCalled();
      expect(players.pass.play).not.toHaveBeenCalled();
    });

    it('should replay a sound that has already played', () => {
      const device = createNativeFeedbackDevice();

      device.playSound('tap');
      device.playSound('tap');

      expect(players.tap.play).toHaveBeenCalledTimes(2);
      expect(players.tap.seekTo).toHaveBeenCalledTimes(2);
    });

    it('should start playing without waiting for the rewind to finish', () => {
      const device = createNativeFeedbackDevice();
      players.tap.seekTo.mockReturnValue(new Promise(() => {}));

      device.playSound('tap');

      expect(players.tap.play).toHaveBeenCalledTimes(1);
    });

    it('should not throw or leave a rejection when the player fails', async () => {
      const device = createNativeFeedbackDevice();
      players.tap.seekTo.mockRejectedValue(new Error('Gone'));
      players.done.play.mockImplementation(() => {
        throw new Error('Gone');
      });

      expect(() => device.playSound('tap')).not.toThrow();
      expect(() => device.playSound('done')).not.toThrow();
      await jest.advanceTimersByTimeAsync(0);
    });
  });

  describe('the haptics on iOS', () => {
    it('should give a tap a light impact', () => {
      createNativeFeedbackDevice().triggerHaptic('tap');

      expect(mockImpact).toHaveBeenCalledTimes(1);
      expect(mockImpact).toHaveBeenCalledWith('light');
    });

    it('should give done a success notification', () => {
      createNativeFeedbackDevice().triggerHaptic('done');

      expect(mockNotification).toHaveBeenCalledTimes(1);
      expect(mockNotification).toHaveBeenCalledWith('success');
    });

    it('should give pass a warning notification', () => {
      createNativeFeedbackDevice().triggerHaptic('pass');

      expect(mockNotification).toHaveBeenCalledTimes(1);
      expect(mockNotification).toHaveBeenCalledWith('warning');
    });

    it('should give the timer end one heavy impact, which no other moment uses', () => {
      createNativeFeedbackDevice().triggerHaptic('timerEnd');

      expect(mockImpact).toHaveBeenCalledTimes(1);
      expect(mockImpact).toHaveBeenCalledWith('heavy');
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should start the round complete pattern at once and play several more pulses over time', async () => {
      createNativeFeedbackDevice().triggerHaptic('roundComplete');
      expect(mockNotification).toHaveBeenCalledWith('success');
      const pulsesAtOnce = mockImpact.mock.calls.length + mockNotification.mock.calls.length;

      await jest.advanceTimersByTimeAsync(1000);

      const pulsesInTotal = mockImpact.mock.calls.length + mockNotification.mock.calls.length;
      expect(pulsesAtOnce).toBe(1);
      expect(pulsesInTotal).toBeGreaterThanOrEqual(4);
    });

    it('should not throw or leave a rejection when a haptic fails', async () => {
      mockImpact.mockRejectedValue(new Error('No haptics'));
      mockNotification.mockImplementation(() => {
        throw new Error('No haptics');
      });
      const device = createNativeFeedbackDevice();

      expect(() => device.triggerHaptic('tap')).not.toThrow();
      expect(() => device.triggerHaptic('done')).not.toThrow();
      expect(() => device.triggerHaptic('roundComplete')).not.toThrow();
      await jest.advanceTimersByTimeAsync(1000);
    });
  });

  describe('the haptics on Android', () => {
    beforeEach(() => setPlatform('android'));

    it.each([
      ['tap', 'virtual-key'],
      ['done', 'confirm'],
      ['pass', 'reject'],
    ] as const)('should give %s the %s effect', (moment, effect) => {
      createNativeFeedbackDevice().triggerHaptic(moment);

      expect(mockAndroidHaptics).toHaveBeenCalledTimes(1);
      expect(mockAndroidHaptics).toHaveBeenCalledWith(effect);
    });

    it('should give the timer end one long press effect', () => {
      createNativeFeedbackDevice().triggerHaptic('timerEnd');

      expect(mockAndroidHaptics).toHaveBeenCalledTimes(1);
      expect(mockAndroidHaptics).toHaveBeenCalledWith('long-press');
    });

    it('should play several pulses over time for round complete', async () => {
      createNativeFeedbackDevice().triggerHaptic('roundComplete');
      expect(mockAndroidHaptics).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1000);

      expect(mockAndroidHaptics.mock.calls.length).toBeGreaterThanOrEqual(4);
    });

    it('should use the effects that follow the phone touch feedback setting, not the vibrator', () => {
      const device = createNativeFeedbackDevice();

      (['tap', 'done', 'pass', 'roundComplete', 'timerEnd'] as const).forEach((moment) =>
        device.triggerHaptic(moment),
      );

      expect(mockImpact).not.toHaveBeenCalled();
      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('should not throw or leave a rejection when a haptic fails', async () => {
      mockAndroidHaptics.mockRejectedValue(new Error('No haptics'));

      expect(() => createNativeFeedbackDevice().triggerHaptic('tap')).not.toThrow();
      await jest.advanceTimersByTimeAsync(0);
    });
  });

  describe('cancelling a pattern', () => {
    it('should drop the pulses that have not fired yet', async () => {
      const device = createNativeFeedbackDevice();
      device.triggerHaptic('roundComplete');
      expect(mockNotification).toHaveBeenCalledTimes(1);

      device.cancelHaptics();
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockNotification).toHaveBeenCalledTimes(1);
      expect(mockImpact).not.toHaveBeenCalled();
    });

    it('should leave a later pattern alone', async () => {
      const device = createNativeFeedbackDevice();
      device.triggerHaptic('roundComplete');
      device.cancelHaptics();
      mockNotification.mockClear();

      device.triggerHaptic('roundComplete');
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockImpact).toHaveBeenCalled();
    });
  });
});
