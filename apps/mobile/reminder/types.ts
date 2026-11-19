import type { ReminderSchedule } from '@getfreak/core';

import type { Storage } from '../storage';

/**
 * What the phone's notifications can do for the reminder. The native module is behind this, so a
 * test passes a fake. The device holds at most what it is asked to: it is the service that makes
 * sure there is never more than one reminder.
 */
export type ReminderDevice = {
  /** Whether the player has allowed notifications. It never asks. */
  isPermissionGranted: () => Promise<boolean>;
  /** Asks the player, if the phone will let it, and says whether notifications are allowed now. */
  requestPermission: () => Promise<boolean>;
  /** Adds a reminder that repeats each week. It does not remove an earlier one. */
  schedule: (schedule: ReminderSchedule) => Promise<void>;
  /** Removes every scheduled reminder. It does nothing when there are none. */
  cancelAll: () => Promise<void>;
  /**
   * Tells the listener each time the player taps the reminder while the app is running, in the
   * background or not. A start of the app from it is not told, because the app starts at the hub.
   * Returns a function that stops it.
   */
  onOpened: (listener: () => void) => () => void;
};

export type ReminderState =
  | { status: 'off' }
  | { status: 'on'; schedule: ReminderSchedule }
  /** Nothing is scheduled, because the phone does not allow notifications. */
  | { status: 'denied' };

export type ReminderService = {
  /**
   * What the reminder is now: the stored setting and what the phone allows. A stored value that
   * fails its schema counts as off. A stored setting with notifications no longer allowed counts as
   * denied. It rejects when the phone cannot be asked.
   */
  read: () => Promise<ReminderState>;
  /**
   * Turns the reminder on, or changes its day and time. It asks for permission, which is the only
   * place the app does. It replaces any reminder already scheduled, so there is only ever one.
   * When notifications are not allowed it schedules nothing and clears the setting, and the state
   * is denied. It rejects when the phone fails, and then no reminder is stored.
   */
  turnOn: (schedule: ReminderSchedule) => Promise<ReminderState>;
  /** Cancels the reminder and clears the setting. */
  turnOff: () => Promise<void>;
  /**
   * Tells the listener each time the player taps the reminder while the app is running, in the
   * background or not. A start of the app from it is not told, because the app starts at the hub.
   * Returns a function that stops it.
   */
  onOpened: (listener: () => void) => () => void;
};

export type ReminderServiceDependencies = {
  storage: Storage;
  device: ReminderDevice;
};
