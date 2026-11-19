import { checkCardText, limits, tidyCardText, type CardTextProblem } from '@getfreak/core';

import type { ShippedCard } from './types';

/** The rules both repositories apply before they write, so the real one and the fake agree. */

export type Checked<Value> =
  | { ok: true; value: Value }
  | { ok: false; reason: 'invalid'; problems: CardTextProblem[] }
  | { ok: false; reason: 'limit' };

/** Tidies card text and checks it against the shipped cards and the player's other cards. */
export function checkCardDraftText(
  text: string,
  shippedCards: readonly ShippedCard[],
  otherPlayerTexts: readonly string[],
): Checked<string> {
  const tidied = tidyCardText(text);
  const problems = checkCardText(tidied, [
    ...shippedCards.map((card) => card.text),
    ...otherPlayerTexts,
  ]);
  return problems.length > 0
    ? { ok: false, reason: 'invalid', problems }
    : { ok: true, value: tidied };
}

/** Trims the name, drops repeated card ids, and checks both against the deck limits. */
export function checkDeckDraft(
  name: string,
  cardIds: readonly string[],
): Checked<{ name: string; cardIds: string[] }> {
  const trimmed = name.trim();
  if (trimmed === '') return { ok: false, reason: 'invalid', problems: ['empty'] };
  if (trimmed.length > limits.deckNameLength) {
    return { ok: false, reason: 'invalid', problems: ['tooLong'] };
  }
  const uniqueCardIds = [...new Set(cardIds)];
  if (uniqueCardIds.length > limits.cardsPerCustomDeck) return { ok: false, reason: 'limit' };
  return { ok: true, value: { name: trimmed, cardIds: uniqueCardIds } };
}
