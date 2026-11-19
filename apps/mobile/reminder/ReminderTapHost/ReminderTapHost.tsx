import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useReminderService } from '../ReminderServiceContext';

const hubRoute = '/';

/**
 * Takes the player to the hub when they open the app from the reminder, whether the app was
 * in the background or not. It draws nothing. Once the lock screen overlay (FRK-66) lands, it
 * covers the hub when the lock is on, so the hub waits behind it.
 */
export function ReminderTapHost(): null {
  const reminder = useReminderService();
  const router = useRouter();

  useEffect(() => reminder.onOpened(() => router.dismissTo(hubRoute)), [reminder, router]);

  return null;
}
