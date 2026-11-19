import { categoryIds, parseQuestionDeck, topicIds, type Question } from '@getfreak/core';

import { interestTags, isInterestTag } from '../interestTags';
import { hasBarredWord, hasDashOrSemicolon } from '../textRules';
import secretMatchDeck from './secretMatch.json';

const minimumItemsPerCategory = 15;
const minimumItemsPerTopicInCategory = 2;
const maximumTextLength = 60;

function loadItems(): Question[] {
  const result = parseQuestionDeck(secretMatchDeck);
  return result.success ? result.deck.questions : [];
}

const items = loadItems();

function tagsOf(item: Question): readonly string[] {
  return 'tags' in item ? (item.tags ?? []) : [];
}

function idsOf(offending: readonly Question[]): string[] {
  return offending.map((item) => item.id);
}

describe('secret match item library', () => {
  it('should pass deck validation', () => {
    expect(parseQuestionDeck(secretMatchDeck).success).toBe(true);
  });

  it.each(categoryIds)('should hold enough items in category %s', (categoryId) => {
    const inCategory = items.filter((item) => item.category === categoryId);

    expect(inCategory.length).toBeGreaterThanOrEqual(minimumItemsPerCategory);
  });

  it.each(categoryIds)('should cover every topic twice in category %s', (categoryId) => {
    const thinTopics = topicIds.filter(
      (topicId) =>
        items.filter((item) => item.category === categoryId && item.topic === topicId).length <
        minimumItemsPerTopicInCategory,
    );

    expect(thinTopics).toEqual([]);
  });

  it('should ship every item as shipped secret match content', () => {
    const offending = items.filter(
      (item) => item.source !== 'shipped' || item.format !== 'secretMatch',
    );

    expect(idsOf(offending)).toEqual([]);
  });

  it('should give every item 1 to 3 tags from the vocabulary', () => {
    const offending = items.filter(
      (item) =>
        tagsOf(item).length < 1 || tagsOf(item).length > 3 || !tagsOf(item).every(isInterestTag),
    );

    expect(idsOf(offending)).toEqual([]);
  });

  it('should give no item the same tag twice', () => {
    const offending = items.filter((item) => new Set(tagsOf(item)).size !== tagsOf(item).length);

    expect(idsOf(offending)).toEqual([]);
  });

  it('should use every tag in the vocabulary on at least one item', () => {
    const usedTags = new Set(items.flatMap(tagsOf));

    expect(interestTags.filter((tag) => !usedTags.has(tag))).toEqual([]);
  });

  it('should keep every text within the length limit', () => {
    const offending = items.filter((item) => (item.text ?? '').length > maximumTextLength);

    expect(idsOf(offending)).toEqual([]);
  });

  it('should start every text with a capital letter', () => {
    const offending = items.filter((item) => !/^[A-Z]/.test(item.text ?? ''));

    expect(idsOf(offending)).toEqual([]);
  });

  it('should end no text with a full stop', () => {
    const offending = items.filter((item) => (item.text ?? '').endsWith('.'));

    expect(idsOf(offending)).toEqual([]);
  });

  it('should keep gendered words and the forfeit word out of every text', () => {
    const offending = items.filter((item) => hasBarredWord(item.text ?? ''));

    expect(idsOf(offending)).toEqual([]);
  });

  it('should keep the strongest swear word out of every text', () => {
    const offending = items.filter((item) => /fuck/i.test(item.text ?? ''));

    expect(idsOf(offending)).toEqual([]);
  });

  it('should keep dashes, hyphens and semicolons out of every text', () => {
    const offending = items.filter(
      (item) => hasDashOrSemicolon(item.text ?? '') || (item.text ?? '').includes('-'),
    );

    expect(idsOf(offending)).toEqual([]);
  });

  it('should never repeat a text', () => {
    const texts = items.map((item) => (item.text ?? '').toLowerCase());

    expect(new Set(texts).size).toBe(texts.length);
  });
});
