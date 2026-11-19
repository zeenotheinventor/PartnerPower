import type { MatchedItem } from '@getfreak/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { usePersonalData } from '../../personal';
import { matchedItemsOf } from './matchedItems';

export type MatchedItems = {
  /** Undefined until the first read. It keeps the last list while the next read is under way. */
  matchedItems: readonly MatchedItem[] | undefined;
  /** False while the screen is not in front, and from the moment it gains focus until that focus's read has finished or failed. */
  isReadOnFocus: boolean;
};

/**
 * What the stored matches say, read each time the screen gains focus, so a match saved on another
 * screen shows when this one is back. Undefined until they have been read. A list that cannot be
 * read counts as empty. Nothing here logs, because matches are personal.
 */
export function useMatchedItems(): MatchedItems {
  const { isLoading, repository } = usePersonalData();
  const [matchedItems, setMatchedItems] = useState<readonly MatchedItem[] | undefined>(undefined);
  const [isReadOnFocus, setIsReadOnFocus] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isLoading) return;
      let isCurrent = true;
      setIsReadOnFocus(false);
      repository.listDiscoveries().then(
        (discoveries) => {
          if (isCurrent) {
            setMatchedItems(matchedItemsOf(discoveries));
            setIsReadOnFocus(true);
          }
        },
        () => {
          if (isCurrent) {
            setMatchedItems([]);
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

  return { matchedItems, isReadOnFocus };
}
