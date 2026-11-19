import type { CustomDeckChoice, DeckChoice } from './types';

const prefix = 'custom:';

/** The choice that names one custom deck. */
export function customDeckChoice(deckId: string): CustomDeckChoice {
  return `${prefix}${deckId}`;
}

/** The id of the custom deck a choice names, or nothing for the starter deck and Favourites. */
export function customDeckIdOf(choice: DeckChoice): string | undefined {
  return choice.startsWith(prefix) ? choice.slice(prefix.length) : undefined;
}
