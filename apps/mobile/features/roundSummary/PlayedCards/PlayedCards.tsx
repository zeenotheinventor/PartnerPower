import { categoryNames, copy } from '@getfreak/content';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { Card, Chip, FavouriteToggle } from '../../../components/ui';
import { usePersonalData } from '../../../personal';
import type { PlayedCardsProps } from './types';

function withFavourite(favourites: ReadonlySet<string>, cardId: string, isFavourite: boolean) {
  const next = new Set(favourites);
  if (isFavourite) next.add(cardId);
  else next.delete(cardId);
  return next;
}

/**
 * The cards of the round, each with a control to keep it as a favourite. A change shows at once and
 * is written through the repository. If the write fails the control goes back and the message
 * shows under that card. Only the card id of a favourite is kept, nothing else from the round.
 */
export function PlayedCards({ history, deck, players }: PlayedCardsProps) {
  const { isLoading, repository } = usePersonalData();
  // Undefined until the favourites have been read. The controls do nothing before then, because a
  // write to the store that is still loading is lost.
  const [favourites, setFavourites] = useState<ReadonlySet<string> | undefined>(undefined);
  const [failedCardId, setFailedCardId] = useState<string | undefined>(undefined);
  // What the store is known to hold, which a failed write falls back to. A card's writes run one
  // after another, so each one is judged against the last write that went through.
  const confirmed = useRef<ReadonlySet<string>>(new Set());
  const writes = useRef(new Map<string, { tail: Promise<void>; waiting: number }>());

  useEffect(() => {
    if (isLoading) return;
    let isCurrent = true;
    const start = (cardIds: ReadonlySet<string>) => {
      confirmed.current = cardIds;
      writes.current.clear();
      setFavourites(cardIds);
    };
    repository.listFavourites().then(
      (cardIds) => {
        if (isCurrent) start(new Set(cardIds));
      },
      () => {
        // The favourites cannot be read, so every control starts off. A write still goes through.
        if (isCurrent) start(new Set());
      },
    );
    return () => {
      isCurrent = false;
      setFavourites(undefined);
    };
  }, [isLoading, repository]);

  useEffect(() => {
    if (failedCardId !== undefined) {
      AccessibilityInfo.announceForAccessibility(copy.roundSummary.favouriteSaveFailed);
    }
  }, [failedCardId]);

  const setFavourite = (cardId: string, isFavourite: boolean) => {
    if (isLoading || favourites === undefined) return;
    if (failedCardId === cardId) setFailedCardId(undefined);
    setFavourites((current) => current && withFavourite(current, cardId, isFavourite));

    const queue = writes.current.get(cardId) ?? { tail: Promise.resolve(), waiting: 0 };
    queue.waiting += 1;
    queue.tail = queue.tail.then(async () => {
      try {
        await repository.setFavourite(cardId, isFavourite);
        confirmed.current = withFavourite(confirmed.current, cardId, isFavourite);
      } catch {
        setFailedCardId(cardId);
      }
      queue.waiting -= 1;
      // The control shows what the store holds once this card has no write left to wait for.
      if (queue.waiting === 0) {
        const isStored = confirmed.current.has(cardId);
        setFavourites((current) => current && withFavourite(current, cardId, isStored));
      }
    });
    writes.current.set(cardId, queue);
  };

  const entries = history.flatMap((played) => {
    const card = deck.cards.find((candidate) => candidate.id === played.cardId);
    return card && played.outcome !== 'passed' ? [{ played, card }] : [];
  });
  if (entries.length === 0) return null;

  return (
    <View className="gap-12">
      <Text accessibilityRole="header" className="type-heading text-foreground">
        {copy.roundSummary.playedHeading}
      </Text>
      {entries.map(({ played, card }, index) => (
        <Card key={index} category={card.category} grouped={false}>
          <View className="flex-row items-start gap-12">
            <View className="flex-1 gap-8">
              <View className="flex-row flex-wrap items-center gap-8">
                {played.kind === 'together' ? (
                  <Chip label={copy.roundPlay.togetherChip} accent />
                ) : null}
                <Chip label={categoryNames[card.category]} category={card.category} />
                {played.kind === 'together' ? null : (
                  <Text className="type-label text-muted">{players[played.player]}</Text>
                )}
              </View>
              <Text className="type-body-bold text-foreground">{card.text}</Text>
              {failedCardId === card.id ? (
                <View
                  accessible
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                  className="flex-row items-start gap-8"
                >
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    className="mt-4 h-16 w-16 items-center justify-center rounded-pill bg-accent"
                  >
                    <Text className="type-caption text-on-accent-small">!</Text>
                  </View>
                  <Text className="type-label flex-1 text-foreground">
                    {copy.roundSummary.favouriteSaveFailed}
                  </Text>
                </View>
              ) : null}
            </View>
            <FavouriteToggle
              label={copy.favourite.label}
              value={favourites?.has(card.id) ?? false}
              onValueChange={(isFavourite) => setFavourite(card.id, isFavourite)}
              context={card.text}
            />
          </View>
        </Card>
      ))}
    </View>
  );
}
