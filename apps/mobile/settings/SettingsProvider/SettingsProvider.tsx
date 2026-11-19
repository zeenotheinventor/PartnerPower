import {
  entryConfirmationSchema,
  hapticsOnSchema,
  playerNamesSchema,
  soundOnSchema,
  type PlayerNames,
} from '@getfreak/core';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { storage as defaultStorage, type StorageKey } from '../../storage';
import { SettingsContext } from './SettingsContext';
import type { Settings, SettingsProviderProps } from './types';

// The stored settings are read once.
type LoadedSettings = {
  hasConfirmedEntry: boolean;
  playerNames: PlayerNames;
  soundOn: boolean;
  hapticsOn: boolean;
};

// What a setting counts as when nothing valid is stored.
const defaultSettings: LoadedSettings = {
  hasConfirmedEntry: false,
  playerNames: ['', ''],
  soundOn: true,
  hapticsOn: true,
};

// Nothing here logs. A failed read or write is not reported with the stored value in it. A failed
// read counts as not confirmed, so the player is asked again, as no remembered names, and as sound
// and vibration on.
export function SettingsProvider({ children, storage = defaultStorage }: SettingsProviderProps) {
  const [loaded, setLoaded] = useState<LoadedSettings | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([
      storage.get('entryConfirmation', entryConfirmationSchema).catch(() => undefined),
      storage.get('playerNames', playerNamesSchema).catch(() => undefined),
      storage.get('soundOn', soundOnSchema).catch(() => undefined),
      storage.get('hapticsOn', hapticsOnSchema).catch(() => undefined),
    ]).then(([entryConfirmation, playerNames, soundOn, hapticsOn]) => {
      if (isCurrent) {
        setLoaded({
          hasConfirmedEntry: entryConfirmation === true,
          playerNames: playerNames ?? defaultSettings.playerNames,
          soundOn: soundOn ?? defaultSettings.soundOn,
          hapticsOn: hapticsOn ?? defaultSettings.hapticsOn,
        });
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [storage]);

  // A write that fails is ignored, and the new value still counts for this session.
  const store = useCallback(
    async (key: StorageKey, value: unknown) => {
      try {
        await storage.set(key, value);
      } catch {
        // Deliberately ignored, see above.
      }
    },
    [storage],
  );

  // If the write fails the player is still let in for this session, and asked again next launch.
  const confirmEntry = useCallback(async () => {
    await store('entryConfirmation', true);
    setLoaded((current) => ({ ...defaultSettings, ...current, hasConfirmedEntry: true }));
  }, [store]);

  // If the write fails the names still count for this session and are not remembered next time.
  const savePlayerNames = useCallback(
    async (playerNames: PlayerNames) => {
      await store('playerNames', playerNames);
      setLoaded((current) => ({ ...defaultSettings, ...current, playerNames }));
    },
    [store],
  );

  const setSoundOn = useCallback(
    async (soundOn: boolean) => {
      await store('soundOn', soundOn);
      setLoaded((current) => ({ ...defaultSettings, ...current, soundOn }));
    },
    [store],
  );

  const setHapticsOn = useCallback(
    async (hapticsOn: boolean) => {
      await store('hapticsOn', hapticsOn);
      setLoaded((current) => ({ ...defaultSettings, ...current, hapticsOn }));
    },
    [store],
  );

  const settings = useMemo<Settings>(() => {
    const values = loaded ?? defaultSettings;
    return {
      isLoading: loaded === undefined,
      hasConfirmedEntry: values.hasConfirmedEntry,
      confirmEntry,
      playerNames: values.playerNames,
      savePlayerNames,
      soundOn: values.soundOn,
      setSoundOn,
      hapticsOn: values.hapticsOn,
      setHapticsOn,
    };
  }, [loaded, confirmEntry, savePlayerNames, setSoundOn, setHapticsOn]);

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}
