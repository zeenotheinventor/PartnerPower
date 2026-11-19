import { copy, fillCopy } from '@getfreak/content';
import { reminderHours } from '@getfreak/core';
import { useFocusEffect, useRouter } from 'expo-router';

import { SettingsRow } from '../../../components/ui';
import type { ReminderState } from '../../../reminder';
import { useReminderState } from '../useReminderState';

export const reminderRoute = '/reminder';

function valueOf(state: ReminderState | undefined): string | undefined {
  if (!state) return undefined;
  if (state.status === 'off') return copy.settings.reminderOff;
  if (state.status === 'denied') return copy.settings.reminderDenied;
  return fillCopy(copy.settings.reminderOn, {
    day: copy.reminder.daysPlural[state.schedule.day - 1] ?? '',
    time: copy.reminder.times[reminderHours.indexOf(state.schedule.hour)] ?? '',
  });
}

/**
 * The Reminder row of Settings. It says off, the day and time, or not allowed, and it reads the
 * reminder again each time Settings comes back into view, so it is right after the screen closes
 * and after the player has changed the phone's own settings. It shows no value until the first
 * read, or if the read fails.
 */
export function ReminderRow() {
  const router = useRouter();
  const { state, reload } = useReminderState();

  useFocusEffect(reload);

  return (
    <SettingsRow
      label={copy.settings.reminderLabel}
      value={valueOf(state)}
      onPress={() => router.push(reminderRoute)}
    />
  );
}
