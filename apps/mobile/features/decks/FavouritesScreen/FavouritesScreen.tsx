import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { categoryIds, type Card as DeckCard } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { Card, Chip, FavouriteToggle, Header, Screen } from '../../../components/ui';
import { usePersonalData } from '../../../personal';
import { useOwnCards } from '../../ownCards/OwnCardsProvider';
import { deckCountText } from '../deckCountText';
import { favouriteCards } from '../favouriteCards';
import { getStarterDeck } from '../getStarterDeck';
import { deckPickerRoute } from '../routes';
import { useFavouriteIds } from '../useFavouriteIds';

function withFavourite(favourites: ReadonlySet<string>, cardId: string, isFavourite: boolean) {
  const next = new Set(favourites);
  if (isFavourite) next.add(cardId);
  else next.delete(cardId);
  return next;
}

// The favourite cards, which the picker opens. The cards are the ones that were favourites when the
// screen opened. Turning one off leaves it in place, switched off, until the player leaves, so a
// tap by mistake can be undone. A change shows at once and is written through the repository. If
// the write fails the switch goes back and the message shows under that card. Nothing here logs,
// because favourites and dares are personal.
export function FavouritesScreen() {
  const router = useRouter();
  const { repository } = usePersonalData();
  const { cards: ownCards, isLoading: isOwnCardsLoading } = useOwnCards();
  const favouriteIds = useFavouriteIds();

  // The cards shown are fixed once the favourites and the dares have been read.
  const [shownCards, setShownCards] = useState<DeckCard[] | undefined>(undefined);
  // Which of the shown cards are favourites now. It starts as all of them.
  const [favourites, setFavourites] = useState<ReadonlySet<string>>(new Set());
  const [failedCardId, setFailedCardId] = useState<string | undefined>(undefined);
  // What the store is known to hold, which a failed write falls back to. A card's writes run one
  // after another, so each one is judged against the last write that went through.
  const confirmed = useRef<ReadonlySet<string>>(new Set());
  const writes = useRef(new Map<string, { tail: Promise<void>; waiting: number }>());

  if (shownCards === undefined && favouriteIds !== undefined && !isOwnCardsLoading) {
    const cards = favouriteCards(getStarterDeck(), ownCards, favouriteIds);
    setShownCards(cards);
    setFavourites(new Set(cards.map((card) => card.id)));
  }

  // Every card shown starts as a favourite, so that is what the store is known to hold.
  useEffect(() => {
    if (shownCards !== undefined) confirmed.current = new Set(shownCards.map((card) => card.id));
  }, [shownCards]);

  useEffect(() => {
    if (failedCardId !== undefined) {
      AccessibilityInfo.announceForAccessibility(copy.roundSummary.favouriteSaveFailed);
    }
  }, [failedCardId]);

  // A deep link can open this screen with nothing behind it, so it falls back to the picker.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(deckPickerRoute));

  const setFavourite = (cardId: string, isFavourite: boolean) => {
    if (failedCardId === cardId) setFailedCardId(undefined);
    setFavourites((current) => withFavourite(current, cardId, isFavourite));

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
      // The switch shows what the store holds once this card has no write left to wait for.
      if (queue.waiting === 0) {
        const isStored = confirmed.current.has(cardId);
        setFavourites((current) => withFavourite(current, cardId, isStored));
      }
    });
    writes.current.set(cardId, queue);
  };

  const groups = categoryIds
    .map((categoryId) => ({
      categoryId,
      cards: (shownCards ?? []).filter((card) => card.category === categoryId),
    }))
    .filter((group) => group.cards.length > 0);

  return (
    <Screen scroll>
      <Header
        title={copy.decks.favourites}
        subtitle={shownCards === undefined ? undefined : deckCountText(favourites.size)}
        backLabel={copy.decks.backLabel}
        onBack={goBack}
      />

      {shownCards === undefined ? null : shownCards.length === 0 ? (
        <>
          <View className="flex-1" />
          <Text className="type-heading text-center text-foreground">
            {copy.decks.favouritesEmpty}
          </Text>
          <View className="flex-1" />
        </>
      ) : (
        groups.map((group) => (
          <View key={group.categoryId} className="gap-12">
            <View
              accessible
              accessibilityRole="header"
              accessibilityLabel={fillCopy(copy.decks.groupHeading, {
                category: categoryNames[group.categoryId],
                count: group.cards.length,
              })}
              className="flex-row items-center gap-8"
            >
              <Chip label={categoryNames[group.categoryId]} category={group.categoryId} />
              <Text className="type-label text-muted">{group.cards.length}</Text>
            </View>
            {group.cards.map((card) => (
              <Card key={card.id} category={card.category} grouped={false}>
                <View className="flex-row items-start gap-12">
                  <View className="flex-1 gap-8">
                    {card.kind === 'together' ? (
                      <Chip label={copy.roundPlay.togetherChip} accent />
                    ) : null}
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
                    value={favourites.has(card.id)}
                    onValueChange={(isFavourite) => setFavourite(card.id, isFavourite)}
                    context={card.text}
                  />
                </View>
              </Card>
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}
