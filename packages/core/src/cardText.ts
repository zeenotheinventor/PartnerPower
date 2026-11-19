/** The most the app lets a player or a deck hold. Every other module reads these numbers from here. */
export const limits = {
  cardTextLength: 140,
  playerCards: 300,
  customDecks: 20,
  cardsPerCustomDeck: 200,
  deckNameLength: 30,
} as const;

export type CardTextProblem = 'empty' | 'tooLong' | 'duplicate';

/** Trims the text and turns every run of spaces, tabs and line breaks into one space. */
export function tidyCardText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function comparable(text: string): string {
  return tidyCardText(text).toLowerCase();
}

/**
 * Checks tidied card text against the base rules that shipped and player cards share. It returns
 * a code for each problem and holds no copy, so screens map the codes to messages.
 */
export function checkCardText(text: string, otherTexts: readonly string[]): CardTextProblem[] {
  const problems: CardTextProblem[] = [];
  if (text === '') problems.push('empty');
  if (text.length > limits.cardTextLength) problems.push('tooLong');
  if (text !== '' && otherTexts.some((other) => comparable(other) === comparable(text))) {
    problems.push('duplicate');
  }
  return problems;
}
