import type { ReminderSchedule } from '@getfreak/core';

import type { ReminderDevice } from '../types';

export type FakeReminderDeviceSetup = {
  /** Whether the phone allows notifications at the start. */
  isPermissionGranted?: boolean;
  /** What the player answers when asked. False when the phone has refused for good. */
  willAllow?: boolean;
};

/**
 * A phone's notifications, in memory. `scheduled` is what the phone would deliver, so a test can
 * count it. Like the real one, `schedule` adds and never replaces.
 */
export function createFakeReminderDevice(setup: FakeReminderDeviceSetup = {}) {
  const scheduled: ReminderSchedule[] = [];
  const listeners = new Set<() => void>();
  const phone = {
    isPermissionGranted: setup.isPermissionGranted ?? false,
    willAllow: setup.willAllow ?? true,
    askCount: 0,
  };

  const device: ReminderDevice = {
    isPermissionGranted: async () => phone.isPermissionGranted,
    requestPermission: async () => {
      if (!phone.isPermissionGranted) {
        phone.askCount += 1;
        phone.isPermissionGranted = phone.willAllow;
      }
      return phone.isPermissionGranted;
    },
    schedule: async (schedule) => {
      scheduled.push(schedule);
    },
    cancelAll: async () => {
      scheduled.length = 0;
    },
    onOpened: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    device,
    scheduled,
    phone,
    /** What the player does in the phone's settings. */
    setPermissionGranted: (isGranted: boolean) => {
      phone.isPermissionGranted = isGranted;
    },
    /** The player taps the reminder. */
    open: () => listeners.forEach((listener) => listener()),
    listenerCount: () => listeners.size,
  };
}
