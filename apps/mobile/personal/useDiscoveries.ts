import {
  defaultSaveDiscoveries,
  questionPreferencesSchema,
  type Discovery,
  type NewDiscovery,
} from '@getfreak/core';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  storage as defaultStorage,
  type DiscoveryKey,
  type PersonalRepository,
  type Storage,
} from '../storage';
import { usePersonalData } from './PersonalDataProvider';

export type Discoveries = {
  /** True until the list and the switch have been read. */
  isLoading: boolean;
  discoveries: Discovery[];
  /** Whether new discoveries are kept. It starts at `defaultSaveDiscoveries`. */
  saveDiscoveries: boolean;
  /**
   * Stores the switch. It never rejects, a failed write is ignored and the new value still counts
   * for this session. Turning it off deletes nothing, because the screen offers that.
   */
  setSaveDiscoveries: (saveDiscoveries: boolean) => Promise<void>;
  /** Stamps and stores the drafts. It does nothing when saving is off. */
  addDiscoveries: (drafts: readonly NewDiscovery[]) => Promise<void>;
  removeDiscovery: (key: DiscoveryKey) => Promise<void>;
  clearDiscoveries: () => Promise<void>;
};

// Nothing here logs. A failed read of the switch counts as the default.
async function readSaveDiscoveries(storage: Storage): Promise<boolean> {
  const preferences = await storage
    .get('questionPreferences', questionPreferencesSchema)
    .catch(() => undefined);
  return preferences?.saveDiscoveries ?? defaultSaveDiscoveries;
}

/** The discoveries list for the screens, over the personal store and the settings storage. */
export function useDiscoveries(storage: Storage = defaultStorage): Discoveries {
  const { repository, isLoading: isStoreLoading } = usePersonalData();
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [saveDiscoveries, setSaveDiscoveriesState] = useState(defaultSaveDiscoveries);
  // The switch as set on this screen, which stands even if storing it failed.
  const sessionSwitch = useRef<boolean | undefined>(undefined);
  // What the list was last read from, so a new repository after a reload counts as not read yet.
  const [readFrom, setReadFrom] = useState<PersonalRepository | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([repository.listDiscoveries(), readSaveDiscoveries(storage)]).then(
      ([listed, isSaving]) => {
        if (isCurrent) {
          setDiscoveries(listed);
          setSaveDiscoveriesState(isSaving);
          setReadFrom(repository);
        }
      },
      () => {
        if (isCurrent) setReadFrom(repository);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [repository, storage]);

  const refresh = useCallback(async () => {
    setDiscoveries(await repository.listDiscoveries());
  }, [repository]);

  const setSaveDiscoveries = useCallback(
    async (isSaving: boolean) => {
      // Set before the write, so a failed write cannot leave saving on after the player turned it off.
      sessionSwitch.current = isSaving;
      try {
        await storage.set('questionPreferences', { saveDiscoveries: isSaving });
        // Stored, so storage is the truth again and another screen's change counts.
        sessionSwitch.current = undefined;
      } catch {
        // Deliberately ignored, see above.
      }
      setSaveDiscoveriesState(isSaving);
    },
    [storage],
  );

  // The switch is read when called, not from state, so a change made on another screen counts. This
  // screen's own choice wins, even when its write failed. A switch turned off between this read and
  // the write below can still let that one add through, which is too narrow a window to guard.
  const addDiscoveries = useCallback(
    async (drafts: readonly NewDiscovery[]) => {
      const isSaving = sessionSwitch.current ?? (await readSaveDiscoveries(storage));
      if (!isSaving) return;
      await repository.addDiscoveries(drafts);
      await refresh();
    },
    [repository, storage, refresh],
  );

  const removeDiscovery = useCallback(
    async (key: DiscoveryKey) => {
      await repository.removeDiscovery(key);
      await refresh();
    },
    [repository, refresh],
  );

  const clearDiscoveries = useCallback(async () => {
    await repository.clearDiscoveries();
    await refresh();
  }, [repository, refresh]);

  return {
    isLoading: isStoreLoading || readFrom !== repository,
    discoveries,
    saveDiscoveries,
    setSaveDiscoveries,
    addDiscoveries,
    removeDiscovery,
    clearDiscoveries,
  };
}
