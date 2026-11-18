import { categoryIds, findDuplicateCardIds, parseDeck, type Card } from '@getfreak/core';

import { decks } from './decks';

const minimumCardsPerCategory = 30;
const minimumTogetherCardsPerCategory = 8;
const maximumTextLength = 140;
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

  it('should keep every card text short enough for the screen', () => {
    const tooLong = shippedCards.filter((card) => card.text.length > maximumTextLength);

    expect(tooLong.map((card) => card.id)).toEqual([]);
  });

  it('should never repeat a card text', () => {
    const texts = shippedCards.map((card) => card.text.toLowerCase());

    expect(new Set(texts).size).toBe(texts.length);
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
