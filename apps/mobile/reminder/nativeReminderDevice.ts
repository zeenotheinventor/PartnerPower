import { copy } from '@getfreak/content';
import type { ReminderSchedule } from '@getfreak/core';
import {
  AndroidImportance,
  AndroidNotificationVisibility,
  addNotificationResponseReceivedListener,
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationCategoryAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';
import { Platform } from 'react-native';

import type { ReminderDevice } from './types';

const channelId = 'weeklyReminder';
const categoryId = 'weeklyReminder';

// Expo counts the weekdays from Sunday as 1, and the setting counts from Monday as 1.
function toNotificationWeekday(day: ReminderSchedule['day']): number {
  return (day % 7) + 1;
}

// The channel and the category are made when they are first needed, and making them again changes
// nothing. Android 13 and later show the permission prompt only once a channel exists, so the
// request makes it first too.
async function prepare(): Promise<void> {
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(channelId, {
      name: copy.notification.channelName,
      description: copy.notification.channelDescription,
      importance: AndroidImportance.DEFAULT,
      // Secret keeps the reminder off the lock screen altogether.
      lockscreenVisibility: AndroidNotificationVisibility.SECRET,
      showBadge: false,
    });
  }
  if (Platform.OS === 'ios') {
    // iOS cannot keep the reminder off the lock screen. With previews hidden it shows this in place
    // of the words.
    await setNotificationCategoryAsync(categoryId, [], {
      previewPlaceholder: copy.notification.hiddenPreviewPlaceholder,
    });
  }
}

// This file needs the native module, so a test checks it against a stand-in. What the phone really
// shows, and when, is only seen on a device.
export const nativeReminderDevice: ReminderDevice = {
  isPermissionGranted: async () => (await getPermissionsAsync()).granted,

  requestPermission: async () => {
    await prepare();
    // No badge is asked for, because the app never sets one.
    const status = await requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return status.granted;
  },

  schedule: async ({ day, hour }) => {
    await prepare();
    await scheduleNotificationAsync({
      // No title, so iOS shows the app's name. No badge, and the default sound.
      content: {
        body: copy.notification.body,
        sound: 'default',
        categoryIdentifier: categoryId,
      },
      trigger: {
        type: SchedulableTriggerInputTypes.WEEKLY,
        weekday: toNotificationWeekday(day),
        hour,
        minute: 0,
        channelId,
      },
    });
  },

  cancelAll: () => cancelAllScheduledNotificationsAsync(),

  // A start from the reminder is not told. The app starts at the hub, which is where the reminder
  // goes, and the lock covers it, so there is nothing to do.
  onOpened: (listener) => {
    const subscription = addNotificationResponseReceivedListener(() => listener());
    return () => subscription.remove();
  },
};
