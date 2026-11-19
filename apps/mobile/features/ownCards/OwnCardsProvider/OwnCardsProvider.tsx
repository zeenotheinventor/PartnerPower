import { limits, type PlayerCard } from '@getfreak/core';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { usePersonalData } from '../../../personal';
import type { PersonalRepository } from '../../../storage';
import { OwnCardsContext } from './OwnCardsContext';
import type { OwnCardDraft, OwnCards } from './types';

// Nothing here logs. A dare is personal text. The list is held once for the route group, so the
// setup screen's count follows what the list and the editor save and delete.
export function OwnCardsProvider({ children }: { children: ReactNode }) {
  const { repository, isLoading: isStoreLoading } = usePersonalData();
  const [cards, setCards] = useState<PlayerCard[]>([]);
  // What the list was last read from, so a new repository after a reload counts as not read yet.
  const [readFrom, setReadFrom] = useState<PersonalRepository | undefined>(undefined);

  useEffect(() => {
    let isCurrent = true;
    repository.listPlayerCards().then(
      (listed) => {
        if (isCurrent) {
          setCards(listed);
          setReadFrom(repository);
        }
      },
      () => {
        // A list that cannot be read counts as empty, and the screens are not blocked on it.
        if (isCurrent) setReadFrom(repository);
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [repository]);

  // The write has already happened, so a list that cannot be read again is left as it was.
  const refresh = useCallback(async () => {
    try {
      setCards(await repository.listPlayerCards());
    } catch {
      // Left as it was.
    }
  }, [repository]);

  const save = useCallback(
    async (draft: OwnCardDraft) => {
      const result = await repository.savePlayerCard(draft);
      if (result.ok) await refresh();
      return result;
    },
    [repository, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await repository.deletePlayerCard(id);
      await refresh();
    },
    [repository, refresh],
  );

  const value = useMemo<OwnCards>(
    () => ({
      isLoading: isStoreLoading || readFrom !== repository,
      cards,
      hasReachedLimit: cards.length >= limits.playerCards,
      save,
      remove,
    }),
    [isStoreLoading, readFrom, repository, cards, save, remove],
  );

  return <OwnCardsContext.Provider value={value}>{children}</OwnCardsContext.Provider>;
}
