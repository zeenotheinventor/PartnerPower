import { cancelAllScheduledNotificationsAsync } from 'expo-notifications';

/** Cancels every notification the app scheduled. It does nothing when there are none. */
export function cancelScheduledNotifications(): Promise<void> {
  return cancelAllScheduledNotificationsAsync();
}
