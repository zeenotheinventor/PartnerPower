import type { Deck, PlayerCard } from '@getfreak/core';

import { withOwnCards } from '../ownCards/withOwnCards';
import { favouriteCards } from './favouriteCards';
import type { DeckChoice } from './types';

type RoundDeckInput = {
  choice: DeckChoice;
  starterDeck: Deck;
  ownCards: readonly PlayerCard[];
  /** Only the starter deck takes the dares in. The other decks hold what they hold. */
  mixInOwnCards: boolean;
  favouriteIds: ReadonlySet<string>;
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
}: RoundDeckInput): Deck {
  if (choice === 'favourites') {
    return {
      id: 'favourites',
      version: 1,
      cards: favouriteCards(starterDeck, ownCards, favouriteIds),
    };
  }
  return mixInOwnCards ? withOwnCards(starterDeck, ownCards) : starterDeck;
}
