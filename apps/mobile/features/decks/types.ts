/** The choice that names one custom deck, so a deck is chosen by its id. */
export type CustomDeckChoice = `custom:${string}`;

/** The decks a round can be played from. */
export type DeckChoice = 'starter' | 'favourites' | CustomDeckChoice;
