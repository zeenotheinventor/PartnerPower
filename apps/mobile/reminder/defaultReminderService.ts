import { storage } from '../storage';
import { createReminderService } from './createReminderService';
import { nativeReminderDevice } from './nativeReminderDevice';

// The one reminder service the app uses.
export const reminderService = createReminderService({ storage, device: nativeReminderDevice });
