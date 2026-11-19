import { useCallback, useEffect, useRef, useState } from 'react';

import { useLockService, type BiometricsAvailability, type LockService } from '../../lock';

export type LockOverview = {
  isLockOn: boolean;
  /** What the phone has set up, which decides how biometrics are named. */
  availability: BiometricsAvailability;
  /** Whether the player turned biometrics on. It is false while the lock is off. */
  isBiometricsOn: boolean;
};

type OverviewState = { overview?: LockOverview; hasFailed: boolean };

async function readOverview(lock: LockService): Promise<LockOverview> {
  const [isLockOn, availability] = await Promise.all([
    lock.isLockOn(),
    lock.getBiometricsAvailability(),
  ]);
  return { isLockOn, availability, isBiometricsOn: isLockOn && (await lock.getBiometricsChoice()) };
}

/**
 * What a screen needs to know about the lock: whether it is on, what the phone has and whether
 * biometrics are chosen. `reload` reads it again, such as when a screen comes back into view. A read
 * that fails (secure storage can be out of reach while the phone is locked) leaves `overview`
 * empty and sets `hasFailed`, so a screen never guesses.
 */
export function useLockOverview() {
  const lock = useLockService();
  const [state, setState] = useState<OverviewState>({ hasFailed: false });
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const reload = useCallback(() => {
    readOverview(lock).then(
      (overview) => {
        if (isMounted.current) setState({ overview, hasFailed: false });
      },
      () => {
        if (isMounted.current) setState({ hasFailed: true });
      },
    );
  }, [lock]);

  return { ...state, reload };
}
