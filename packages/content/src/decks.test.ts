import {
  categoryIds,
  checkCardText,
  findDuplicateCardIds,
  parseDeck,
  type Card,
} from '@getfreak/core';

import { decks } from './decks';

const minimumCardsPerCategory = 30;
const minimumTogetherCardsPerCategory = 8;
const barredWords = [
  'he',
  'she',
  'him',
  'her',
  'his',
  'hers',
  'boyfriend',
  'girlfriend',
  'husband',
  'wife',
  'drink',
  'wine',
  'shot',
  'shots',
  'booze',
  'beer',
  'tipsy',
];
const barredWordPattern = new RegExp(`\\b(${barredWords.join('|')})\\b`, 'i');

const shippedCards: Card[] = decks.flatMap((deck) => deck.cards);

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

  it('should leave every card without an effect', () => {
    expect(shippedCards.filter((card) => card.effect !== undefined)).toEqual([]);
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
    const offending = shippedCards.filter((card) => /[—–;]|--/.test(card.text));

    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('should keep gendered words and the forfeit word out of every card text', () => {
    const offending = shippedCards.filter((card) => barredWordPattern.test(card.text));

    expect(offending.map((card) => card.id)).toEqual([]);
  });

  it('should number each card id after its category', () => {
    const misnumbered = shippedCards.filter((card) => !card.id.includes(`-${card.category}-`));

    expect(misnumbered.map((card) => card.id)).toEqual([]);
  });
});
