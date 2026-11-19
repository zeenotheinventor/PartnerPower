import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { usePersonalData } from '../../personal';

/**
 * The ids of the cards that are favourites, read each time the screen gains focus, so a favourite
 * changed on another screen shows when this one is back. Undefined until they have been read. A
 * list that cannot be read counts as empty. Nothing here logs, because it is personal data.
 */
export function useFavouriteIds(): ReadonlySet<string> | undefined {
  const { isLoading, repository } = usePersonalData();
  const [favouriteIds, setFavouriteIds] = useState<ReadonlySet<string> | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      if (isLoading) return;
      let isCurrent = true;
      repository.listFavourites().then(
        (cardIds) => {
          if (isCurrent) setFavouriteIds(new Set(cardIds));
        },
        () => {
          if (isCurrent) setFavouriteIds(new Set());
        },
      );
      return () => {
        isCurrent = false;
      };
    }, [isLoading, repository]),
  );

  return favouriteIds;
}
