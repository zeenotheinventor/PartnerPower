import type { CustomDeck, Deck, PlayerCard } from '@getfreak/core';

import { withOwnCards } from '../ownCards/withOwnCards';
import { customDeckIdOf } from './customDeckChoice';
import { favouriteCards } from './favouriteCards';
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
};

/**
 * The deck a round is dealt from. Every deck setup can deal comes from here, so a rule about which
 * cards a phone may deal, such as leaving out vibration cards, is added in this one place.
 */
export function buildRoundDeck({
  choice,
  starterDeck,
  ownCards,
  mixInOwnCards,
  favouriteIds,
  customDecks,
}: RoundDeckInput): Deck {
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
