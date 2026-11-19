import { z } from 'zod';

/** Monday is 1 and Sunday is 7. */
export const reminderDays = [1, 2, 3, 4, 5, 6, 7] as const;

/** The hours the reminder can come at, on the hour. */
export const reminderHours = [18, 19, 20, 21, 22] as const;

// Strict, so a value with anything extra in it counts as invalid, and so as off.
export const reminderSchema = z.strictObject({
  day: z.literal(reminderDays),
  hour: z.literal(reminderHours),
});
export type ReminderSchedule = z.infer<typeof reminderSchema>;

/** What turning the reminder on starts from: Friday at 20:00. */
export const defaultReminder: ReminderSchedule = { day: 5, hour: 20 };
