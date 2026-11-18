import { entryConfirmationSchema } from '@getfreak/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { storage as defaultStorage } from '../../storage';
import { SettingsContext } from './SettingsContext';
import type { Settings, SettingsProviderProps } from './types';

// The stored settings are read once. Remembered player names can join this state later.
type LoadedSettings = { hasConfirmedEntry: boolean };

// Nothing here logs. A failed read or write is not reported with the stored value in it, and a
// failed read counts as not confirmed, so the player is asked again.
export function SettingsProvider({ children, storage = defaultStorage }: SettingsProviderProps) {
  const [loaded, setLoaded] = useState<LoadedSettings | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    storage
      .get('entryConfirmation', entryConfirmationSchema)
      .catch(() => undefined)
      .then((entryConfirmation) => {
        if (isCurrent) setLoaded({ hasConfirmedEntry: entryConfirmation === true });
      });
    return () => {
      isCurrent = false;
    };
  }, [storage]);

  // If the write fails the player is still let in for this session, and asked again next launch.
  const confirmEntry = useCallback(async () => {
    try {
      await storage.set('entryConfirmation', true);
    } catch {
      // Deliberately ignored, see above.
    }
    setLoaded((current) => ({ ...current, hasConfirmedEntry: true }));
  }, [storage]);

  const settings = useMemo<Settings>(
    () => ({
      isLoading: loaded === undefined,
      hasConfirmedEntry: loaded?.hasConfirmedEntry ?? false,
      confirmEntry,
    }),
    [loaded, confirmEntry],
  );

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}
