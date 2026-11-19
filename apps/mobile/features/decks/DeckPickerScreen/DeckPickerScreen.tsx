import { copy, fillCopy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Card, Chip, FeedbackPressable, Header, Screen } from '../../../components/ui';
import { useOwnCards } from '../../ownCards/OwnCardsProvider';
import { setupRoute } from '../../ownCards/routes';
import { useDeckChoice } from '../DeckChoiceProvider';
import { deckNames } from '../deckNames';
import { deckCountText } from '../deckCountText';
import { favouriteCards } from '../favouriteCards';
import { getStarterDeck } from '../getStarterDeck';
import { favouritesRoute } from '../routes';
import type { DeckChoice } from '../types';
import { useFavouriteIds } from '../useFavouriteIds';

// The decks a round can be played from, opened from the Deck row on setup. A tap on a deck chooses
// it and returns to setup. Nothing here logs, because favourites and dares are personal.
export function DeckPickerScreen() {
  const router = useRouter();
  const { choice, chooseDeck } = useDeckChoice();
  const { cards: ownCards } = useOwnCards();
  const favouriteIds = useFavouriteIds();

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

  const decks: { deck: DeckChoice; count: number | undefined }[] = [
    { deck: 'starter', count: starterDeck.cards.length },
    { deck: 'favourites', count: favouritesCount },
  ];

  return (
    <Screen scroll>
      <Header title={copy.decks.pickerTitle} backLabel={copy.decks.backLabel} onBack={goBack} />

      <View className="gap-12">
        {decks.map(({ deck, count }) => (
          <View key={deck} className="flex-row items-center gap-8">
            <View className="flex-1">
              <Card
                label={
                  count === undefined
                    ? deckNames[deck]
                    : fillCopy(copy.decks.deckCardName, {
                        name: deckNames[deck],
                        count: deckCountText(count),
                      })
                }
                selected={choice === deck}
                onPress={() => pick(deck)}
              >
                <View className="items-start gap-4">
                  <Text className="type-heading text-foreground">{deckNames[deck]}</Text>
                  {count === undefined ? null : <Chip label={deckCountText(count)} />}
                </View>
              </Card>
            </View>
            {deck === 'favourites' ? (
              <FeedbackPressable
                accessibilityRole="button"
                accessibilityLabel={copy.decks.viewFavouritesName}
                onPress={() => router.push(favouritesRoute)}
                className="min-h-48 justify-center rounded-pill border-2 border-border bg-surface px-12"
              >
                <Text className="type-caption uppercase text-foreground">
                  {copy.decks.viewFavourites}
                </Text>
              </FeedbackPressable>
            ) : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}
