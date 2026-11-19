import { copy } from '@getfreak/content';
import type { ReminderSchedule } from '@getfreak/core';
import {
  addNotificationResponseReceivedListener,
  AndroidImportance,
  AndroidNotificationVisibility,
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationCategoryAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { nativeReminderDevice } from './nativeReminderDevice';

// The enums are plain values, so the real ones are used. The functions are native, so they are
// stand-ins that a test reads.
jest.mock('expo-notifications', () => ({
  ...jest.requireActual('expo-notifications/build/NotificationChannelManager.types'),
  ...jest.requireActual('expo-notifications/build/Notifications.types'),
  addNotificationResponseReceivedListener: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

function setPlatform(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

function scheduledRequest() {
  const call = jest.mocked(scheduleNotificationAsync).mock.lastCall;
  if (!call) throw new Error('Nothing was scheduled');
  return call[0];
}

// Infinity for a function that was never called, so an order check fails then.
const firstCallOrder = (mock: jest.Mock) =>
  mock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY;

describe('nativeReminderDevice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('android');
    jest.mocked(setNotificationChannelAsync).mockResolvedValue(null);
    jest.mocked(scheduleNotificationAsync).mockResolvedValue('id');
    jest.mocked(addNotificationResponseReceivedListener).mockReturnValue({ remove: jest.fn() });
  });

  describe('the Android channel', () => {
    it('should keep the reminder off the lock screen', async () => {
      await nativeReminderDevice.schedule({ day: 5, hour: 20 });

      expect(setNotificationChannelAsync).toHaveBeenCalledWith(
        'weeklyReminder',
        expect.objectContaining({ lockscreenVisibility: AndroidNotificationVisibility.SECRET }),
      );
    });

    it('should show no badge, use the default importance, and name itself in neutral words', async () => {
      await nativeReminderDevice.schedule({ day: 5, hour: 20 });

      expect(setNotificationChannelAsync).toHaveBeenCalledWith('weeklyReminder', {
        name: copy.notification.channelName,
        description: copy.notification.channelDescription,
        importance: AndroidImportance.DEFAULT,
        lockscreenVisibility: AndroidNotificationVisibility.SECRET,
        showBadge: false,
      });
    });

    it('should exist before the permission is asked for, which Android 13 needs', async () => {
      jest.mocked(requestPermissionsAsync).mockResolvedValue({ granted: true } as never);

      await nativeReminderDevice.requestPermission();

      expect(setNotificationChannelAsync).toHaveBeenCalled();
      expect(firstCallOrder(jest.mocked(setNotificationChannelAsync))).toBeLessThan(
        firstCallOrder(jest.mocked(requestPermissionsAsync)),
      );
    });

    it('should not be made on iOS', async () => {
      setPlatform('ios');

      await nativeReminderDevice.schedule({ day: 5, hour: 20 });

      expect(setNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });

  describe('the iOS preview placeholder', () => {
    it('should be set as the placeholder for when previews are hidden', async () => {
      setPlatform('ios');

      await nativeReminderDevice.schedule({ day: 5, hour: 20 });

      expect(setNotificationCategoryAsync).toHaveBeenCalledWith('weeklyReminder', [], {
        previewPlaceholder: copy.notification.hiddenPreviewPlaceholder,
      });
      expect(scheduledRequest().content.categoryIdentifier).toBe('weeklyReminder');
    });

    it('should not be made on Android', async () => {
      await nativeReminderDevice.schedule({ day: 5, hour: 20 });

      expect(setNotificationCategoryAsync).not.toHaveBeenCalled();
    });
  });

  describe('scheduling', () => {
    it('should repeat weekly at the hour, on the hour, on the channel', async () => {
      await nativeReminderDevice.schedule({ day: 5, hour: 20 });

      expect(scheduledRequest().trigger).toEqual({
        type: 'weekly',
        weekday: 6,
        hour: 20,
        minute: 0,
        channelId: 'weeklyReminder',
      });
    });

    it.each<[ReminderSchedule['day'], number]>([
      [1, 2],
      [5, 6],
      [6, 7],
      [7, 1],
    ])('should send day %p (Monday is 1) as weekday %p (Sunday is 1)', async (day, weekday) => {
      await nativeReminderDevice.schedule({ day, hour: 18 });

      expect(scheduledRequest().trigger).toMatchObject({ weekday });
    });

    it('should carry only the body, with no title, no badge and the default sound', async () => {
      await nativeReminderDevice.schedule({ day: 5, hour: 20 });

      expect(scheduledRequest().content).toEqual({
        body: copy.notification.body,
        sound: 'default',
        categoryIdentifier: 'weeklyReminder',
      });
    });
  });

  describe('permission', () => {
    it('should read whether notifications are allowed, without asking', async () => {
      jest.mocked(getPermissionsAsync).mockResolvedValue({ granted: true } as never);

      expect(await nativeReminderDevice.isPermissionGranted()).toBe(true);
      expect(requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('should ask for an alert and a sound, and no badge', async () => {
      jest.mocked(requestPermissionsAsync).mockResolvedValue({ granted: false } as never);

      expect(await nativeReminderDevice.requestPermission()).toBe(false);
      expect(requestPermissionsAsync).toHaveBeenCalledWith({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
    });
  });

  it('should cancel every scheduled notification', async () => {
    await nativeReminderDevice.cancelAll();

    expect(cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  describe('being opened from the reminder', () => {
    it('should tell the listener when the reminder is tapped, until it stops', () => {
      const remove = jest.fn();
      jest.mocked(addNotificationResponseReceivedListener).mockReturnValue({ remove });
      const listener = jest.fn();

      const stop = nativeReminderDevice.onOpened(listener);
      const onResponse = jest.mocked(addNotificationResponseReceivedListener).mock.lastCall?.[0];
      onResponse?.({} as never);
      stop();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledTimes(1);
    });
  });
});
