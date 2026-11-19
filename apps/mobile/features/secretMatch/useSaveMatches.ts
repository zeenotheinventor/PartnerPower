import type { NewDiscovery } from '@getfreak/core';
import { useEffect, useRef, useState } from 'react';

import { useDiscoveries } from '../../personal';
import type { SavedLine } from './SecretMatchRevealView';

type SaveStatus = 'pending' | 'done' | 'failed';

/**
 * Saves the matches of a revealed session once, through `addDiscoveries`, which keeps nothing when
 * saving is off. It says what the reveal may tell the players about that. It says nothing while the
 * save is under way or the switch is not read yet, and nothing when the save failed, so it never
 * claims a save that did not happen. Nothing here logs.
 */
export function useSaveMatches(matches: readonly NewDiscovery[]): SavedLine {
  const { addDiscoveries, isLoading, saveDiscoveries } = useDiscoveries();
  const [status, setStatus] = useState<SaveStatus>('pending');
  const hasSaved = useRef(false);

  useEffect(() => {
    if (hasSaved.current || matches.length === 0) return;
    hasSaved.current = true;
    addDiscoveries(matches).then(
      () => setStatus('done'),
      () => setStatus('failed'),
    );
  }, [matches, addDiscoveries]);

  if (status !== 'done' || isLoading) return null;
  return saveDiscoveries ? 'saved' : 'savingOff';
}
