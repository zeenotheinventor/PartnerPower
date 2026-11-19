import { copy } from '@getfreak/content';
import { act } from '@testing-library/react-native';
import { fireEvent, screen } from 'nativewind/test';
import { AppState, Linking, type AppStateStatus } from 'react-native';

import { ReminderServiceContext, type ReminderService } from '../../../reminder';
import { createTestReminder } from '../../../reminder/testing/createTestReminder';
import { renderThemed } from '../../../tailwind/renderThemed';
import { ReminderScreen } from './ReminderScreen';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockCanGoBack = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack,
  }),
}));

// The test says when the app comes back into view by calling the latest listener.
let mockAppStateListeners: ((state: AppStateStatus) => void)[] = [];
jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
  mockAppStateListeners.push(listener);
  return { remove: jest.fn() };
});

const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();

type Setup = Parameters<typeof createTestReminder>[0];

async function renderScreen(setup?: Setup, wrap?: (reminder: ReminderService) => ReminderService) {
  const test = createTestReminder(setup);
  await renderThemed(
    <ReminderServiceContext.Provider value={wrap ? wrap(test.reminder) : test.reminder}>
      <ReminderScreen />
    </ReminderServiceContext.Provider>,
  );
  await act(async () => {});
  return test;
}

const toggle = () => screen.getByRole('switch', { name: copy.reminder.toggle });
const chip = (name: string) => screen.getByRole('button', { name });
const timeOption = (name: string) => screen.getByRole('radio', { name });

async function turnOn() {
  await act(async () => fireEvent.press(toggle()));
}

describe('ReminderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAppStateListeners = [];
    mockCanGoBack = true;
  });

  describe('when it is off', () => {
    it('should show the title and an off switch, and nothing else', async () => {
      await renderScreen();

      expect(screen.getByRole('header', { name: copy.reminder.title })).toBeOnTheScreen();
      expect(toggle()).not.toBeChecked();
      expect(screen.getByText(copy.reminder.toggleCaption)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Friday' })).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.reminder.nameNote)).not.toBeOnTheScreen();
    });

    it('should not ask the phone for anything just by opening', async () => {
      const { phone, scheduled } = await renderScreen();

      expect(phone.askCount).toBe(0);
      expect(scheduled).toEqual([]);
    });
  });

  describe('turning it on', () => {
    it('should ask once, then show Friday and 20:00 picked, and schedule one reminder', async () => {
      const { phone, scheduled, backend } = await renderScreen();

      await turnOn();

      expect(phone.askCount).toBe(1);
      expect(toggle()).toBeChecked();
      expect(chip('Friday')).toBeSelected();
      expect(timeOption('20:00')).toBeChecked();
      expect(scheduled).toEqual([{ day: 5, hour: 20 }]);
      expect(backend.entries.get('reminder')).toBe(JSON.stringify({ day: 5, hour: 20 }));
    });

    it('should show all seven days, and name each by its full day', async () => {
      await renderScreen();
      await turnOn();

      copy.reminder.daysLong.forEach((name) => expect(chip(name)).toBeOnTheScreen());
      expect(screen.getByText('Fri')).toBeOnTheScreen();
    });

    it('should show all five times', async () => {
      await renderScreen();
      await turnOn();

      copy.reminder.times.forEach((time) => expect(timeOption(time)).toBeOnTheScreen());
    });

    it('should show what the notification will say, and that the name of the app shows', async () => {
      await renderScreen();
      await turnOn();

      expect(screen.getByText(copy.notification.body)).toBeOnTheScreen();
      expect(screen.getByText(copy.reminder.nameNote)).toBeOnTheScreen();
    });

    it('should show it already on when it was set before', async () => {
      const { reminder } = createTestReminder();
      await reminder.turnOn({ day: 2, hour: 22 });
      await renderThemed(
        <ReminderServiceContext.Provider value={reminder}>
          <ReminderScreen />
        </ReminderServiceContext.Provider>,
      );
      await act(async () => {});

      expect(toggle()).toBeChecked();
      expect(chip('Tuesday')).toBeSelected();
      expect(timeOption('22:00')).toBeChecked();
    });
  });

  describe('opening it when it was set before', () => {
    it('should schedule it again, so a reminder the phone dropped comes back', async () => {
      const { reminder, scheduled } = createTestReminder();
      await reminder.turnOn({ day: 2, hour: 22 });
      scheduled.length = 0;
      await renderThemed(
        <ReminderServiceContext.Provider value={reminder}>
          <ReminderScreen />
        </ReminderServiceContext.Provider>,
      );
      await act(async () => {});

      expect(scheduled).toEqual([{ day: 2, hour: 22 }]);
    });

    it('should show it off when scheduling again fails, because the setting is cleared', async () => {
      const { reminder, device } = createTestReminder();
      await reminder.turnOn({ day: 2, hour: 22 });
      device.schedule = () => Promise.reject(new Error('The phone failed'));
      await renderThemed(
        <ReminderServiceContext.Provider value={reminder}>
          <ReminderScreen />
        </ReminderServiceContext.Provider>,
      );
      await act(async () => {});

      expect(toggle()).not.toBeChecked();
    });
  });

  describe('when permission is refused', () => {
    it('should keep the switch off, schedule nothing and show how to allow it', async () => {
      const { scheduled, backend } = await renderScreen({ willAllow: false });

      await turnOn();

      expect(toggle()).not.toBeChecked();
      expect(scheduled).toEqual([]);
      expect(backend.entries.has('reminder')).toBe(false);
      expect(screen.getByText(copy.reminder.deniedTitle)).toBeOnTheScreen();
      expect(screen.getByText(copy.reminder.deniedBody)).toBeOnTheScreen();
      expect(screen.getByText(copy.reminder.deniedPath)).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: 'Friday' })).not.toBeOnTheScreen();
    });

    it('should open the phone settings from the button', async () => {
      await renderScreen({ willAllow: false });
      await turnOn();

      fireEvent.press(screen.getByRole('button', { name: copy.reminder.openSettings }));

      expect(openSettings).toHaveBeenCalledTimes(1);
    });

    it('should show the denied card when permission was taken away after it was set', async () => {
      const { reminder, setPermissionGranted } = createTestReminder();
      await reminder.turnOn({ day: 5, hour: 20 });
      setPermissionGranted(false);
      await renderThemed(
        <ReminderServiceContext.Provider value={reminder}>
          <ReminderScreen />
        </ReminderServiceContext.Provider>,
      );
      await act(async () => {});

      expect(toggle()).not.toBeChecked();
      expect(screen.getByText(copy.reminder.deniedTitle)).toBeOnTheScreen();
    });

    it('should check again when the app comes back, and drop the denied card once nothing was stored', async () => {
      const { setPermissionGranted, phone } = await renderScreen({ willAllow: false });
      await turnOn();
      expect(screen.getByText(copy.reminder.deniedTitle)).toBeOnTheScreen();

      // The player allows notifications in the phone's settings and comes back. The refused try
      // stored nothing, so the screen reads as off, not on.
      setPermissionGranted(true);
      phone.willAllow = true;
      await act(async () => mockAppStateListeners.forEach((listener) => listener('active')));

      expect(screen.queryByText(copy.reminder.deniedTitle)).not.toBeOnTheScreen();
      expect(toggle()).not.toBeChecked();
    });

    it('should show the denied card when permission is taken away while the app is away', async () => {
      const { setPermissionGranted } = await renderScreen();
      await turnOn();

      setPermissionGranted(false);
      await act(async () => mockAppStateListeners.forEach((listener) => listener('active')));

      expect(screen.getByText(copy.reminder.deniedTitle)).toBeOnTheScreen();
      expect(toggle()).not.toBeChecked();
    });

    it('should not read again when the app goes to the background', async () => {
      const { setPermissionGranted } = await renderScreen();
      await turnOn();

      setPermissionGranted(false);
      await act(async () => mockAppStateListeners.forEach((listener) => listener('background')));

      expect(toggle()).toBeChecked();
    });
  });

  describe('changing the day or the time', () => {
    it('should replace the reminder with the new day, keeping the time', async () => {
      const { scheduled, backend } = await renderScreen();
      await turnOn();

      await act(async () => fireEvent.press(chip('Monday')));

      expect(chip('Monday')).toBeSelected();
      expect(chip('Friday')).not.toBeSelected();
      expect(scheduled).toEqual([{ day: 1, hour: 20 }]);
      expect(backend.entries.get('reminder')).toBe(JSON.stringify({ day: 1, hour: 20 }));
    });

    it('should replace the reminder with the new time, keeping the day', async () => {
      const { scheduled } = await renderScreen();
      await turnOn();

      await act(async () => fireEvent.press(timeOption('18:00')));

      expect(timeOption('18:00')).toBeChecked();
      expect(scheduled).toEqual([{ day: 5, hour: 18 }]);
    });

    it('should leave one reminder after several changes', async () => {
      const { scheduled } = await renderScreen();
      await turnOn();

      await act(async () => fireEvent.press(chip('Sunday')));
      await act(async () => fireEvent.press(timeOption('22:00')));
      await act(async () => fireEvent.press(chip('Wednesday')));

      expect(scheduled).toEqual([{ day: 3, hour: 22 }]);
    });

    it('should build quick changes on each other, a day then a time', async () => {
      const { scheduled } = await renderScreen();
      await turnOn();

      await act(async () => {
        fireEvent.press(chip('Monday'));
        fireEvent.press(timeOption('18:00'));
      });

      expect(scheduled).toEqual([{ day: 1, hour: 18 }]);
      expect(chip('Monday')).toBeSelected();
      expect(timeOption('18:00')).toBeChecked();
    });

    it('should not ask again for permission', async () => {
      const { phone } = await renderScreen();
      await turnOn();

      await act(async () => fireEvent.press(chip('Monday')));

      expect(phone.askCount).toBe(1);
    });
  });

  describe('turning it off', () => {
    it('should cancel the reminder, clear the setting and hide the choices', async () => {
      const { scheduled, backend } = await renderScreen();
      await turnOn();

      await act(async () => fireEvent.press(toggle()));

      expect(toggle()).not.toBeChecked();
      expect(scheduled).toEqual([]);
      expect(backend.entries.has('reminder')).toBe(false);
      expect(screen.queryByRole('button', { name: 'Friday' })).not.toBeOnTheScreen();
    });
  });

  describe('when the phone fails', () => {
    it('should show what the reminder really is, which is still on', async () => {
      await renderScreen(undefined, (reminder) => ({
        ...reminder,
        turnOff: () => Promise.reject(new Error('The phone failed')),
      }));
      await turnOn();

      await act(async () => fireEvent.press(toggle()));

      expect(toggle()).toBeChecked();
    });

    it('should show only the header when the first read fails, so the player can go back', async () => {
      await renderScreen(undefined, (reminder) => ({
        ...reminder,
        read: () => Promise.reject(new Error('Out of reach')),
      }));

      expect(screen.getByRole('header', { name: copy.reminder.title })).toBeOnTheScreen();
      expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
      fireEvent.press(screen.getByRole('button', { name: copy.reminder.backLabel }));
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('going back', () => {
    it('should go back with the back button', async () => {
      await renderScreen();

      fireEvent.press(screen.getByRole('button', { name: copy.reminder.backLabel }));

      expect(mockBack).toHaveBeenCalledTimes(1);
    });

    it('should go to Settings when there is nothing to go back to', async () => {
      mockCanGoBack = false;
      await renderScreen();

      fireEvent.press(screen.getByRole('button', { name: copy.reminder.backLabel }));

      expect(mockReplace).toHaveBeenCalledWith('/settings');
    });
  });
});
