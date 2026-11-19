import { useCallback, useEffect, useRef, useState } from 'react';

import { useReminderService, type ReminderState } from '../../reminder';

/**
 * What the reminder is now. `state` is empty until the first read, and if a read fails (the phone
 * can be out of reach), so a screen never guesses. `reload` reads it again, such as when a screen
 * comes back into view. `setState` is for a screen that has just changed it.
 */
export function useReminderState() {
  const reminder = useReminderService();
  const [state, setState] = useState<ReminderState | undefined>(undefined);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const reload = useCallback(() => {
    reminder.read().then(
      (read) => {
        if (isMounted.current) setState(read);
      },
      () => {
        if (isMounted.current) setState(undefined);
      },
    );
  }, [reminder]);

  return { state, setState, reload };
}
