import { limits, type PlayerCard } from '@getfreak/core';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

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

  // A reload can swap the repository while a write is under way. Only a write to the repository
  // that is current may change the list.
  const currentRepository = useRef(repository);
  useEffect(() => {
    currentRepository.current = repository;
  }, [repository]);

  // The write has already happened, so a list that cannot be read again is left as it was.
  const refresh = useCallback(async () => {
    try {
      const listed = await repository.listPlayerCards();
      if (currentRepository.current === repository) setCards(listed);
    } catch {
      // Left as it was.
    }
  }, [repository]);

  // A saved dare is merged in at once, so it shows even if the read after it fails. The read then
  // makes the list match the store.
  const save = useCallback(
    async (draft: OwnCardDraft) => {
      const result = await repository.savePlayerCard(draft);
      if (result.ok) {
        const saved = result.saved;
        if (currentRepository.current === repository) {
          setCards((current) =>
            current.some((card) => card.id === saved.id)
              ? current.map((card) => (card.id === saved.id ? saved : card))
              : [...current, saved],
          );
        }
        await refresh();
      }
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
