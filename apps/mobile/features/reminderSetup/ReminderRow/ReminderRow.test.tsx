import { copy } from '@getfreak/content';
import type { ReminderSchedule } from '@getfreak/core';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';

import { ReminderServiceContext, type ReminderService } from '../../../reminder';
import { createTestReminder } from '../../../reminder/testing/createTestReminder';
import { renderThemed } from '../../../tailwind/renderThemed';
import { ReminderRow } from './ReminderRow';

const mockPush = jest.fn();
// Settings is in focus when it comes back into view. The test calls the latest effect to say so.
let mockRunFocusEffect: () => void = () => {};
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush }),
    useFocusEffect: (effect: () => void) => {
      mockRunFocusEffect = effect;
      useEffect(effect, [effect]);
    },
  };
});

async function renderRowWith(reminder: ReminderService) {
  await renderThemed(
    <ReminderServiceContext.Provider value={reminder}>
      <ReminderRow />
    </ReminderServiceContext.Provider>,
  );
  await act(async () => {});
}

const friday: ReminderSchedule = { day: 5, hour: 20 };
const rowName = (value: string) => `${copy.settings.reminderLabel}, ${value}`;

describe('ReminderRow', () => {
  beforeEach(() => mockPush.mockClear());

  it('should say Off when nothing is set', async () => {
    await renderRowWith(createTestReminder().reminder);

    expect(
      screen.getByRole('button', { name: rowName(copy.settings.reminderOff) }),
    ).toBeOnTheScreen();
  });

  it('should say the day and the time when it is on', async () => {
    const { reminder } = createTestReminder();
    await reminder.turnOn(friday);

    await renderRowWith(reminder);

    expect(screen.getByRole('button', { name: 'Reminder, Fridays, 20:00' })).toBeOnTheScreen();
  });

  it('should say the first day and the first time as they are', async () => {
    const { reminder } = createTestReminder();
    await reminder.turnOn({ day: 1, hour: 18 });

    await renderRowWith(reminder);

    expect(screen.getByRole('button', { name: 'Reminder, Mondays, 18:00' })).toBeOnTheScreen();
  });

  it('should say Not allowed when it is set but the phone no longer allows notifications', async () => {
    const { reminder, setPermissionGranted } = createTestReminder();
    await reminder.turnOn(friday);
    setPermissionGranted(false);

    await renderRowWith(reminder);

    expect(
      screen.getByRole('button', { name: rowName(copy.settings.reminderDenied) }),
    ).toBeOnTheScreen();
  });

  it('should say Off for a stored value that is not valid', async () => {
    const { reminder, backend } = createTestReminder({ isPermissionGranted: true });
    backend.entries.set('reminder', JSON.stringify({ day: 5, hour: 4 }));

    await renderRowWith(reminder);

    expect(
      screen.getByRole('button', { name: rowName(copy.settings.reminderOff) }),
    ).toBeOnTheScreen();
  });

  it('should show no value when the phone cannot be read, and still open the screen', async () => {
    const { reminder } = createTestReminder();
    await renderRowWith({ ...reminder, read: () => Promise.reject(new Error('Out of reach')) });

    fireEvent.press(screen.getByRole('button', { name: copy.settings.reminderLabel }));

    expect(mockPush).toHaveBeenCalledWith('/reminder');
  });

  it('should open the reminder screen', async () => {
    await renderRowWith(createTestReminder().reminder);

    fireEvent.press(screen.getByRole('button', { name: /^Reminder/ }));

    expect(mockPush).toHaveBeenCalledWith('/reminder');
  });

  it('should read again when Settings comes back into view', async () => {
    const { reminder } = createTestReminder();
    await renderRowWith(reminder);
    await reminder.turnOn(friday);

    await act(async () => mockRunFocusEffect());

    expect(screen.getByRole('button', { name: 'Reminder, Fridays, 20:00' })).toBeOnTheScreen();
  });
});
