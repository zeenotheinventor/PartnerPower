import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useReminderService } from '../ReminderServiceContext';

const hubRoute = '/';

/**
 * Takes the player to the hub when they open the app from the reminder, whether the app was
 * running or not. It draws nothing. The app lock covers the screen above the navigator, so with
 * the lock on the hub waits behind it.
 */
export function ReminderTapHost(): null {
  const reminder = useReminderService();
  const router = useRouter();

  useEffect(() => reminder.onOpened(() => router.dismissTo(hubRoute)), [reminder, router]);

  return null;
}
