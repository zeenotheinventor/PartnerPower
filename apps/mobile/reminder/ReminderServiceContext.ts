import { createContext, useContext } from 'react';

import { reminderService } from './defaultReminderService';
import type { ReminderService } from './types';

/**
 * Gives a screen the reminder service. The app uses the real one, so nothing needs mounting. A test
 * puts a fake above the screen with this context's provider.
 */
export const ReminderServiceContext = createContext<ReminderService>(reminderService);

export function useReminderService(): ReminderService {
  return useContext(ReminderServiceContext);
}
