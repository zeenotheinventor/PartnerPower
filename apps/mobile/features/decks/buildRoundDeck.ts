import {
  buildMatchesDeck,
  type CustomDeck,
  type Deck,
  type MatchedItem,
  type PlayerCard,
  withoutUnsupportedEffects,
} from '@getfreak/core';

import { withOwnCards } from '../ownCards/withOwnCards';
import { isVibrationSupported } from '../vibration/vibration';
import { customDeckIdOf } from './customDeckChoice';
import { favouriteCards } from './favouriteCards';
import { matchSuggestions } from './matchSuggestions';
import type { DeckChoice } from './types';

type RoundDeckInput = {
  choice: DeckChoice;
  starterDeck: Deck;
  ownCards: readonly PlayerCard[];
  /** Only the starter deck takes the dares in. The other decks hold what they hold. */
  mixInOwnCards: boolean;
  favouriteIds: ReadonlySet<string>;
  /** The stored custom decks, which a custom choice is looked up in. */
  customDecks: readonly CustomDeck[];
  /** What the stored matches say, which Your matches is suggested from. */
  matchedItems: readonly MatchedItem[];
};

/**
 * The deck a round is dealt from. Every deck setup can deal comes from here, so a rule about which
 * cards a phone may deal is applied in this one place: a phone that cannot vibrate is never dealt
 * a vibration card, whichever deck is chosen.
 */
export function buildRoundDeck(input: RoundDeckInput): Deck {
  const deck = deckOfChoice(input);
  const playableDeck = withoutUnsupportedEffects(deck, { vibrate: isVibrationSupported() });
  // The same deck when nothing was left out, so what depends on its identity is not disturbed.
  return playableDeck.cards.length === deck.cards.length ? deck : playableDeck;
}

function deckOfChoice({
  choice,
  starterDeck,
  ownCards,
  mixInOwnCards,
  favouriteIds,
  customDecks,
  matchedItems,
}: RoundDeckInput): Deck {
  if (choice === 'matches') {
    // Only the shipped dares carry tags, so a dare the player wrote is never suggested. The deck is
    // built from the matches each time and never stored.
    return buildMatchesDeck(matchSuggestions(starterDeck.cards, matchedItems));
  }
  if (choice === 'favourites') {
    return {
      id: 'favourites',
      version: 1,
      cards: favouriteCards(starterDeck, ownCards, favouriteIds),
    };
  }
  const customDeckId = customDeckIdOf(choice);
  if (customDeckId !== undefined) {
    // A deck that is not stored, or a card that has gone, leaves nothing to deal, so setup says
    // there are no cards.
    const listedIds = new Set(customDecks.find((deck) => deck.id === customDeckId)?.cardIds);
    return {
      id: choice,
      version: 1,
      cards: [...starterDeck.cards, ...ownCards].filter((card) => listedIds.has(card.id)),
    };
  }
  return mixInOwnCards ? withOwnCards(starterDeck, ownCards) : starterDeck;
}
