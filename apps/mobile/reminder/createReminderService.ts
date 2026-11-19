import { reminderSchema } from '@getfreak/core';

import type { ReminderService, ReminderServiceDependencies } from './types';

/**
 * The reminder rules over storage and the phone's notifications. The setting is stored as a day and
 * an hour. Nothing stored, or a value that fails its schema, counts as off.
 *
 * There is only ever one reminder. Every change cancels what is scheduled before it schedules, and
 * changes run one at a time, so two quick taps cannot each cancel and then each schedule.
 *
 * Nothing here logs.
 */
export function createReminderService({
  storage,
  device,
}: ReminderServiceDependencies): ReminderService {
  let previousWork: Promise<unknown> = Promise.resolve();
  function inTurn<Result>(work: () => Promise<Result>): Promise<Result> {
    const turn = previousWork.then(work, work);
    previousWork = turn.catch(() => undefined);
    return turn;
  }

  async function clear() {
    await device.cancelAll();
    await storage.remove('reminder');
  }

  return {
    async read() {
      const schedule = await storage.get('reminder', reminderSchema);
      if (!schedule) return { status: 'off' };
      return (await device.isPermissionGranted())
        ? { status: 'on', schedule }
        : { status: 'denied' };
    },

    turnOn: (schedule) =>
      inTurn(async () => {
        if (!(await device.requestPermission())) {
          await clear();
          return { status: 'denied' };
        }
        try {
          await device.cancelAll();
          await device.schedule(schedule);
          await storage.set('reminder', schedule);
        } catch (error) {
          // The old reminder may already be cancelled, and the app must not keep a setting that
          // has nothing scheduled behind it, so it clears both, as well as it can, and then fails.
          await clear().catch(() => undefined);
          throw error;
        }
        return { status: 'on', schedule };
      }),

    turnOff: () => inTurn(clear),

    onOpened: (listener) => device.onOpened(listener),
  };
}
