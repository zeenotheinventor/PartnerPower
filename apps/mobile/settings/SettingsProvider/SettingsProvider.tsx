import { entryConfirmationSchema, playerNamesSchema, type PlayerNames } from '@getfreak/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { storage as defaultStorage } from '../../storage';
import { SettingsContext } from './SettingsContext';
import type { Settings, SettingsProviderProps } from './types';

// The stored settings are read once.
type LoadedSettings = { hasConfirmedEntry: boolean; playerNames: PlayerNames };

const noPlayerNames: PlayerNames = ['', ''];

// Nothing here logs. A failed read or write is not reported with the stored value in it. A failed
// read counts as not confirmed, so the player is asked again, and as no remembered names.
export function SettingsProvider({ children, storage = defaultStorage }: SettingsProviderProps) {
  const [loaded, setLoaded] = useState<LoadedSettings | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      storage.get('entryConfirmation', entryConfirmationSchema).catch(() => undefined),
      storage.get('playerNames', playerNamesSchema).catch(() => undefined),
    ]).then(([entryConfirmation, playerNames]) => {
      if (isCurrent) {
        setLoaded({
          hasConfirmedEntry: entryConfirmation === true,
          playerNames: playerNames ?? noPlayerNames,
        });
      }
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
    setLoaded((current) => ({ playerNames: noPlayerNames, ...current, hasConfirmedEntry: true }));
  }, [storage]);

  // If the write fails the names still count for this session and are not remembered next time.
  const savePlayerNames = useCallback(
    async (playerNames: PlayerNames) => {
      try {
        await storage.set('playerNames', playerNames);
      } catch {
        // Deliberately ignored, see above.
      }
      setLoaded((current) => ({ hasConfirmedEntry: false, ...current, playerNames }));
    },
    [storage],
  );

  const settings = useMemo<Settings>(
    () => ({
      isLoading: loaded === undefined,
      hasConfirmedEntry: loaded?.hasConfirmedEntry ?? false,
      confirmEntry,
      playerNames: loaded?.playerNames ?? noPlayerNames,
      savePlayerNames,
    }),
    [loaded, confirmEntry, savePlayerNames],
  );

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}
