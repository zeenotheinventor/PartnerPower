import { defaultReminder, reminderDays, reminderHours, reminderSchema } from './reminder';

describe('reminderSchema', () => {
  it('should accept a day and an hour from the lists', () => {
    expect(reminderSchema.parse({ day: 5, hour: 20 })).toEqual({ day: 5, hour: 20 });
  });

  it.each(reminderDays)('should accept day %p', (day) => {
    expect(reminderSchema.safeParse({ day, hour: 20 }).success).toBe(true);
  });

  it.each(reminderHours)('should accept hour %p', (hour) => {
    expect(reminderSchema.safeParse({ day: 1, hour }).success).toBe(true);
  });

  it.each([0, 8, 17, 23, 20.5, '20', null])('should reject the hour %p', (hour) => {
    expect(reminderSchema.safeParse({ day: 5, hour }).success).toBe(false);
  });

  it.each([0, 8, 1.5, '5', null])('should reject the day %p', (day) => {
    expect(reminderSchema.safeParse({ day, hour: 20 }).success).toBe(false);
  });

  it.each([[{ day: 5 }], [{ hour: 20 }], [{ day: 5, hour: 20, extra: 1 }], [null], ['on'], [true]])(
    'should reject %p',
    (value) => {
      expect(reminderSchema.safeParse(value).success).toBe(false);
    },
  );

  it('should have a default that the schema accepts, on Friday at 20:00', () => {
    expect(reminderSchema.parse(defaultReminder)).toEqual({ day: 5, hour: 20 });
  });
});
