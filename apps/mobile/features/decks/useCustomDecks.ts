import type { CustomDeck } from '@getfreak/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { usePersonalData } from '../../personal';

/**
 * The custom decks, read each time the screen gains focus, so a deck saved or deleted on another
 * screen shows when this one is back. Undefined until they have been read. A list that cannot be
 * read counts as empty. Nothing here logs, because deck names and cards are personal.
 */
export function useCustomDecks(): readonly CustomDeck[] | undefined {
  const { isLoading, repository } = usePersonalData();
  const [customDecks, setCustomDecks] = useState<readonly CustomDeck[] | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      if (isLoading) return;
      let isCurrent = true;
      repository.listDecks().then(
        (decks) => {
          if (isCurrent) setCustomDecks(decks);
        },
        () => {
          if (isCurrent) setCustomDecks([]);
        },
      );
      return () => {
        isCurrent = false;
      };
    }, [isLoading, repository]),
  );

  return customDecks;
}
