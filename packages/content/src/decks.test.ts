import {
  categoryIds,
  checkCardText,
  findDuplicateCardIds,
  parseDeck,
  type Card,
} from '@getfreak/core';

import { decks } from './decks';
import { hasBarredWord, hasDashOrSemicolon } from './textRules';

const minimumCardsPerCategory = 30;
const minimumTogetherCardsPerCategory = 8;
const minimumTimerCardsPerCategory = 4;
const shippedCards: Card[] = decks.flatMap((deck) => deck.cards);
const timerCards = shippedCards.filter((card) => card.effect?.type === 'timer');
const vibrationCards = shippedCards.filter((card) => card.effect?.type === 'vibrate');

describe('shipped decks', () => {
  it('should pass validation for every deck', () => {
    decks.forEach((deck) => expect(parseDeck(deck)).toEqual({ success: true, deck }));
  });

  it('should ship at least one deck', () => {
    expect(decks.length).toBeGreaterThan(0);
  });

  it('should use each card id once across all decks', () => {
    expect(findDuplicateCardIds(decks)).toEqual([]);
  });

  it('should give each deck an id of its own', () => {
    expect(new Set(decks.map((deck) => deck.id)).size).toBe(decks.length);
  });

  it('should mark every card as shipped', () => {
    expect(shippedCards.filter((card) => card.source !== 'shipped')).toEqual([]);
  });

  it('should give an effect only to solo cards', () => {
    const offending = shippedCards.filter(
      (card) => card.effect !== undefined && card.kind !== 'solo',
    );

    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('should ship a vibration card in the second category', () => {
    expect(vibrationCards.map((card) => card.category)).toContain('c2');
  });

  it('should give every vibration card a time of 5 to 30 seconds', () => {
    const offending = vibrationCards.filter(
      (card) => card.effect === undefined || card.effect.seconds < 5 || card.effect.seconds > 30,
    );

    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('should give every timer card between 15 and 60 seconds', () => {
    const offending = timerCards.filter(
      (card) => card.effect === undefined || card.effect.seconds < 15 || card.effect.seconds > 60,
    );

    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it.each(categoryIds)('should have enough timer cards in %s', (categoryId) => {
    const cards = timerCards.filter((card) => card.category === categoryId);

    expect(cards.length).toBeGreaterThanOrEqual(minimumTimerCardsPerCategory);
  });

  it.each(categoryIds)('should have enough cards in %s', (categoryId) => {
    const cards = shippedCards.filter((card) => card.category === categoryId);

    expect(cards.length).toBeGreaterThanOrEqual(minimumCardsPerCategory);
  });

  it.each(categoryIds)('should have enough together cards in %s', (categoryId) => {
    const togetherCards = shippedCards.filter(
      (card) => card.category === categoryId && card.kind === 'together',
    );

    expect(togetherCards.length).toBeGreaterThanOrEqual(minimumTogetherCardsPerCategory);
  });

  it('should give every card text that passes the rules every card shares', () => {
    const problems = shippedCards.flatMap((card, index) => {
      const otherTexts = shippedCards
        .filter((_, other) => other !== index)
        .map((other) => other.text);
      return checkCardText(card.text, otherTexts).map((problem) => `${card.id}: ${problem}`);
    });

    expect(problems).toEqual([]);
  });

  it('should keep dashes and semicolons out of every card text', () => {
    const offending = shippedCards.filter((card) => hasDashOrSemicolon(card.text));

    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('should keep gendered words and the forfeit word out of every card text', () => {
    const offending = shippedCards.filter((card) => hasBarredWord(card.text));

    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('should number each card id after its category', () => {
    const misnumbered = shippedCards.filter((card) => !card.id.includes(`-${card.category}-`));

    expect(misnumbered.map((card) => card.id)).toEqual([]);
  });
});
