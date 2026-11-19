import { createClearEverything } from '../storage/clearEverything';
import { createInMemoryBackend } from '../storage/createInMemoryBackend';
import { createStorage } from '../storage/createStorage';
import { createReminderService } from './createReminderService';
import { createTestReminder } from './testing/createTestReminder';

const friday = { day: 5, hour: 20 } as const;
const mondayEarly = { day: 1, hour: 18 } as const;

describe('createReminderService', () => {
  describe('with nothing stored', () => {
    it('should read as off, and ask for nothing', async () => {
      const { reminder, phone } = createTestReminder();

      expect(await reminder.read()).toEqual({ status: 'off' });
      expect(phone.askCount).toBe(0);
    });
  });

  describe('turning it on', () => {
    it('should ask for permission, schedule one reminder and store the setting', async () => {
      const { reminder, phone, scheduled, backend } = createTestReminder();

      const state = await reminder.turnOn(friday);

      expect(state).toEqual({ status: 'on', schedule: friday });
      expect(phone.askCount).toBe(1);
      expect(scheduled).toEqual([friday]);
      expect(backend.entries.get('reminder')).toBe(JSON.stringify(friday));
    });

    it('should not ask again when notifications are already allowed', async () => {
      const { reminder, phone } = createTestReminder({ isPermissionGranted: true });

      await reminder.turnOn(friday);

      expect(phone.askCount).toBe(0);
    });

    it('should read as on afterwards', async () => {
      const { reminder } = createTestReminder();
      await reminder.turnOn(friday);

      expect(await reminder.read()).toEqual({ status: 'on', schedule: friday });
    });
  });

  describe('when permission is refused', () => {
    it('should schedule nothing and store nothing, and say denied', async () => {
      const { reminder, scheduled, backend } = createTestReminder({ willAllow: false });

      const state = await reminder.turnOn(friday);

      expect(state).toEqual({ status: 'denied' });
      expect(scheduled).toEqual([]);
      expect(backend.entries.has('reminder')).toBe(false);
    });

    it('should read as off afterwards, because nothing was stored', async () => {
      const { reminder } = createTestReminder({ willAllow: false });
      await reminder.turnOn(friday);

      expect(await reminder.read()).toEqual({ status: 'off' });
    });

    it('should take back a reminder that was set when a change finds permission gone', async () => {
      const { reminder, scheduled, backend, setPermissionGranted, phone } = createTestReminder();
      await reminder.turnOn(friday);
      setPermissionGranted(false);
      phone.willAllow = false;

      const state = await reminder.turnOn(mondayEarly);

      expect(state).toEqual({ status: 'denied' });
      expect(scheduled).toEqual([]);
      expect(backend.entries.has('reminder')).toBe(false);
    });
  });

  describe('changing the day or the time', () => {
    it('should replace the reminder, so there is only one', async () => {
      const { reminder, scheduled } = createTestReminder();
      await reminder.turnOn(friday);

      await reminder.turnOn(mondayEarly);

      expect(scheduled).toEqual([mondayEarly]);
    });

    it('should store the new setting', async () => {
      const { reminder, backend } = createTestReminder();
      await reminder.turnOn(friday);

      await reminder.turnOn(mondayEarly);

      expect(backend.entries.get('reminder')).toBe(JSON.stringify(mondayEarly));
    });

    it('should leave one reminder when changes overlap', async () => {
      const { reminder, scheduled, device } = createTestReminder();
      // A slow phone, so the second change starts before the first has finished.
      const schedule = device.schedule;
      device.schedule = async (next) => {
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
        await schedule(next);
      };

      await Promise.all([
        reminder.turnOn(friday),
        reminder.turnOn(mondayEarly),
        reminder.turnOn({ day: 3, hour: 22 }),
      ]);

      expect(scheduled).toEqual([{ day: 3, hour: 22 }]);
    });
  });

  describe('turning it off', () => {
    it('should cancel the reminder and clear the setting', async () => {
      const { reminder, scheduled, backend } = createTestReminder();
      await reminder.turnOn(friday);

      await reminder.turnOff();

      expect(scheduled).toEqual([]);
      expect(backend.entries.has('reminder')).toBe(false);
      expect(await reminder.read()).toEqual({ status: 'off' });
    });

    it('should do nothing harmful when it was never on', async () => {
      const { reminder, scheduled } = createTestReminder();

      await reminder.turnOff();

      expect(scheduled).toEqual([]);
    });

    it('should keep the setting when the cancel fails, so the player can try again', async () => {
      const { reminder, backend, device } = createTestReminder();
      await reminder.turnOn(friday);
      device.cancelAll = () => Promise.reject(new Error('The phone failed'));

      await expect(reminder.turnOff()).rejects.toThrow();

      expect(backend.entries.has('reminder')).toBe(true);
    });
  });

  describe('a stored value that is not valid', () => {
    it.each([
      ['an hour outside the list', JSON.stringify({ day: 5, hour: 3 })],
      ['a day outside the week', JSON.stringify({ day: 9, hour: 20 })],
      ['something else', JSON.stringify('on')],
      ['text that is not JSON', 'not json'],
    ])('should count %s as off', async (_description, stored) => {
      const { reminder, backend } = createTestReminder({ isPermissionGranted: true });
      backend.entries.set('reminder', stored);

      expect(await reminder.read()).toEqual({ status: 'off' });
    });
  });

  describe('when permission is taken away later', () => {
    it('should read as denied while the setting is stored', async () => {
      const { reminder, setPermissionGranted } = createTestReminder();
      await reminder.turnOn(friday);

      setPermissionGranted(false);

      expect(await reminder.read()).toEqual({ status: 'denied' });
    });
  });

  describe('when the phone fails to schedule a change', () => {
    it('should read as off, with nothing scheduled and nothing stored', async () => {
      const { reminder, scheduled, backend, device } = createTestReminder();
      await reminder.turnOn(friday);
      device.schedule = () => Promise.reject(new Error('The phone failed'));

      await expect(reminder.turnOn(mondayEarly)).rejects.toThrow();

      expect(scheduled).toEqual([]);
      expect(backend.entries.has('reminder')).toBe(false);
      expect(await reminder.read()).toEqual({ status: 'off' });
    });

    it('should still fail, and not hang, when the clean up fails too', async () => {
      const { reminder, device } = createTestReminder();
      device.schedule = () => Promise.reject(new Error('The schedule failed'));
      device.cancelAll = () => Promise.reject(new Error('The cancel failed'));

      await expect(reminder.turnOn(friday)).rejects.toThrow('The cancel failed');
    });
  });

  describe('when the setting cannot be stored', () => {
    it('should cancel what it scheduled, so nothing runs that the app does not know about', async () => {
      const { scheduled, device } = createTestReminder();
      const failingStorage = {
        ...createStorage(createInMemoryBackend()),
        set: () => Promise.reject(new Error('The write failed')),
      };
      const reminder = createReminderService({ storage: failingStorage, device });

      await expect(reminder.turnOn(friday)).rejects.toThrow();

      expect(scheduled).toEqual([]);
    });
  });

  describe('being opened from the reminder', () => {
    it('should tell a listener, until it stops', () => {
      const { reminder, open, listenerCount } = createTestReminder();
      const listener = jest.fn();

      const stop = reminder.onOpened(listener);
      open();
      stop();
      open();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listenerCount()).toBe(0);
    });
  });

  describe('clear everything', () => {
    it('should leave nothing scheduled and nothing stored', async () => {
      const { reminder, scheduled, backend, storage, device } = createTestReminder();
      await reminder.turnOn(friday);
      const clearEverything = createClearEverything({
        // The real one cancels every notification the app scheduled. The fake phone stands in.
        cancelScheduledNotifications: device.cancelAll,
        secureStorage: { get: jest.fn(), set: jest.fn(), remove: jest.fn(), clearAll: jest.fn() },
        storage,
        remountRoot: jest.fn(),
      });

      const result = await clearEverything();

      expect(result).toEqual({ ok: true });
      expect(scheduled).toEqual([]);
      expect(backend.entries.has('reminder')).toBe(false);
      expect(await reminder.read()).toEqual({ status: 'off' });
    });
  });
});
