import type { CustomDeck } from '@getfreak/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { usePersonalData } from '../../personal';

export type CustomDecks = {
  /** Undefined until the first read. It keeps the last list while the next read is under way. */
  customDecks: readonly CustomDeck[] | undefined;
  /** False while the screen is not in front, and from the moment it gains focus until that focus's read has finished or failed. */
  isReadOnFocus: boolean;
};

/**
 * The custom decks, read each time the screen gains focus, so a deck saved or deleted on another
 * screen shows when this one is back. Undefined until they have been read. A list that cannot be
 * read counts as empty. Nothing here logs, because deck names and cards are personal.
 */
export function useCustomDecks(): CustomDecks {
  const { isLoading, repository } = usePersonalData();
  const [customDecks, setCustomDecks] = useState<readonly CustomDeck[] | undefined>(undefined);
  const [isReadOnFocus, setIsReadOnFocus] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isLoading) return;
      let isCurrent = true;
      setIsReadOnFocus(false);
      repository.listDecks().then(
        (decks) => {
          if (isCurrent) {
            setCustomDecks(decks);
            setIsReadOnFocus(true);
          }
        },
        () => {
          if (isCurrent) {
            setCustomDecks([]);
            setIsReadOnFocus(true);
          }
        },
      );
      return () => {
        isCurrent = false;
        // The list is only trusted once it has been read since the screen was last in front.
        setIsReadOnFocus(false);
      };
    }, [isLoading, repository]),
  );

  return { customDecks, isReadOnFocus };
}
