import { categoryIds, topicIds, type Question } from '@getfreak/core';

import { copy } from './copy';
import { questionDecks } from './questions';
import { hasBarredWord } from './textRules';

const statementFormats = ['ifYou', 'neverHave'] as const;
const minimumQuestionsPerCategory = 20;
const minimumQuestionsPerTopic = 2;
const maximumTextLength = 120;

function questionsOf(format: (typeof statementFormats)[number]): Question[] {
  return questionDecks.find((deck) => deck.id === format)?.questions ?? [];
}

describe.each(statementFormats)('%s question library', (format) => {
  const questions = questionsOf(format);

  it.each(categoryIds)('should hold enough questions in category %s', (categoryId) => {
    const inCategory = questions.filter((question) => question.category === categoryId);

    expect(inCategory.length).toBeGreaterThanOrEqual(minimumQuestionsPerCategory);
  });

  it.each(categoryIds)('should cover every topic in category %s', (categoryId) => {
    const thinTopics = topicIds.filter(
      (topicId) =>
        questions.filter(
          (question) => question.category === categoryId && question.topic === topicId,
        ).length < minimumQuestionsPerTopic,
    );

    expect(thinTopics).toEqual([]);
  });

  it('should keep every text within the length limit', () => {
    const tooLong = questions.filter(
      (question) => (question.text ?? '').length > maximumTextLength,
    );

    expect(tooLong.map((question) => question.id)).toEqual([]);
  });

  it('should write the clause after the lead, in lower case, without repeating the lead', () => {
    const lead = copy.questionLeads[format].toLowerCase();
    const offending = questions.filter((question) => {
      const text = question.text ?? '';
      return (
        text === '' || text[0] !== text[0]?.toLowerCase() || text.toLowerCase().startsWith(lead)
      );
    });

    expect(offending.map((question) => question.id)).toEqual([]);
  });

  it('should keep gendered words and the forfeit word out of every text', () => {
    const offending = questions.filter((question) => hasBarredWord(question.text ?? ''));

    expect(offending.map((question) => question.id)).toEqual([]);
  });
});

// This check only catches identical text. Near-duplicates across the two formats are guarded by
// content review.
describe('statement question libraries together', () => {
  it('should never repeat a text across the two formats', () => {
    const texts = statementFormats.flatMap((format) =>
      questionsOf(format).map((question) => (question.text ?? '').toLowerCase()),
    );

    expect(new Set(texts).size).toBe(texts.length);
  });
});
