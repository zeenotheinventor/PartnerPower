import { copy, fillCopy } from '@getfreak/content';
import { limits } from '@getfreak/core';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Chip, FeedbackPressable, Header, Screen } from '../../../components/ui';
import { useOwnCards } from '../../ownCards/OwnCardsProvider';
import { setupRoute } from '../../ownCards/routes';
import { customDeckChoice } from '../customDeckChoice';
import { useDeckChoice } from '../DeckChoiceProvider';
import { deckCountText } from '../deckCountText';
import { favouriteCards } from '../favouriteCards';
import { getStarterDeck } from '../getStarterDeck';
import { customDeckRoute, favouritesRoute, newDeckRoute } from '../routes';
import type { DeckChoice } from '../types';
import { useCustomDecks } from '../useCustomDecks';
import { useFavouriteIds } from '../useFavouriteIds';

type PickerDeck = {
  choice: DeckChoice;
  name: string;
  /** Undefined until the count can be known. */
  count: number | undefined;
  /** The route the deck's own button opens, with the name a screen reader gives the button. */
  action?: { label: string; name: string; route: string };
};

const actionClasses =
  'min-h-48 justify-center rounded-pill border-2 border-border bg-surface px-12';

// The decks a round can be played from, opened from the Deck row on setup. A tap on a deck chooses
// it and returns to setup. Nothing here logs, because favourites, dares and decks are personal.
export function DeckPickerScreen() {
  const router = useRouter();
  const { choice, chooseDeck } = useDeckChoice();
  const { cards: ownCards } = useOwnCards();
  const favouriteIds = useFavouriteIds();
  const customDecks = useCustomDecks();

  // A deep link can open this screen with nothing behind it, so it falls back to setup.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(setupRoute));

  const pick = (deck: DeckChoice) => {
    chooseDeck(deck);
    goBack();
  };

  const starterDeck = getStarterDeck();
  // The favourites count waits for the favourites to be read, and the card is named without it.
  const favouritesCount =
    favouriteIds === undefined
      ? undefined
      : favouriteCards(starterDeck, ownCards, favouriteIds).length;

  const decks: PickerDeck[] = [
    { choice: 'starter', name: copy.decks.starter, count: starterDeck.cards.length },
    {
      choice: 'favourites',
      name: copy.decks.favourites,
      count: favouritesCount,
      action: {
        label: copy.decks.viewFavourites,
        name: copy.decks.viewFavouritesName,
        route: favouritesRoute,
      },
    },
    ...(customDecks ?? []).map((deck) => ({
      choice: customDeckChoice(deck.id),
      name: deck.name,
      count: deck.cardIds.length,
      action: {
        label: copy.decks.editDeck,
        name: fillCopy(copy.decks.editDeckName, { name: deck.name }),
        route: customDeckRoute(deck.id),
      },
    })),
  ];
  const hasReachedDeckLimit = (customDecks?.length ?? 0) >= limits.customDecks;

  return (
    <Screen scroll>
      <Header title={copy.decks.pickerTitle} backLabel={copy.decks.backLabel} onBack={goBack} />

      <View className="gap-12">
        {decks.map(({ choice: deckChoice, name, count, action }) => (
          <View key={deckChoice} className="flex-row items-center gap-8">
            <View className="flex-1">
              <Card
                label={
                  count === undefined
                    ? name
                    : fillCopy(copy.decks.deckCardName, { name, count: deckCountText(count) })
                }
                selected={choice === deckChoice}
                onPress={() => pick(deckChoice)}
              >
                <View className="items-start gap-4">
                  <Text className="type-heading text-foreground">{name}</Text>
                  {count === undefined ? null : <Chip label={deckCountText(count)} />}
                </View>
              </Card>
            </View>
            {action ? (
              <FeedbackPressable
                accessibilityRole="button"
                accessibilityLabel={action.name}
                onPress={() => router.push(action.route)}
                className={actionClasses}
              >
                <Text className="type-caption uppercase text-foreground">{action.label}</Text>
              </FeedbackPressable>
            ) : null}
          </View>
        ))}
      </View>

      <View className="gap-8">
        <Button
          label={copy.decks.newDeck}
          variant="secondary"
          fullWidth
          disabled={hasReachedDeckLimit}
          onPress={() => router.push(newDeckRoute)}
        />
        {hasReachedDeckLimit ? (
          <Text className="type-label text-center text-muted">{copy.decks.deckLimit}</Text>
        ) : null}
      </View>
    </Screen>
  );
}
