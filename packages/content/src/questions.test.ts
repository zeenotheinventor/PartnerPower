import {
  categoryIds,
  findDuplicateQuestionIds,
  limits,
  parseQuestionDeck,
  questionFormats,
  topicIds,
  type Question,
} from '@getfreak/core';

import { questionDecks } from './questions';
import { hasBarredWord, hasDashOrSemicolon } from './textRules';

const minimumQuestionsPerCategory = 3;
const shippedQuestions: Question[] = questionDecks.flatMap((deck) => deck.questions);

/** Every piece of text a player reads on a question. */
function textsOf(question: Question): string[] {
  const optionTexts = 'options' in question ? question.options.map((option) => option.text) : [];
  const tags = 'tags' in question ? question.tags : [];
  return [question.text ?? '', ...optionTexts, ...tags].filter((value) => value !== '');
}

describe('shipped question decks', () => {
  it('should pass validation for every deck', () => {
    questionDecks.forEach((deck) =>
      expect(parseQuestionDeck(deck)).toEqual({ success: true, deck }),
    );
  });

  it('should ship one deck for each format, in order', () => {
    expect(questionDecks.map((deck) => deck.id)).toEqual([...questionFormats]);
  });

  it.each(questionFormats)('should hold only %s questions in the %s deck', (format) => {
    const deck = questionDecks.find((candidate) => candidate.id === format);

    expect(deck?.questions.filter((question) => question.format !== format)).toEqual([]);
  });

  it('should use each question id once across all decks', () => {
    expect(findDuplicateQuestionIds(questionDecks)).toEqual([]);
  });

  it('should mark every question as shipped', () => {
    expect(shippedQuestions.filter((question) => question.source !== 'shipped')).toEqual([]);
  });

  it.each(questionFormats)('should have enough %s questions in every category', (format) => {
    categoryIds.forEach((categoryId) => {
      const matching = shippedQuestions.filter(
        (question) => question.format === format && question.category === categoryId,
      );

      expect(matching.length).toBeGreaterThanOrEqual(minimumQuestionsPerCategory);
    });
  });

  it('should only use topics that exist', () => {
    const unknown = shippedQuestions.filter((question) => !topicIds.includes(question.topic));

    expect(unknown).toEqual([]);
  });

  it('should keep every text short enough for the screen', () => {
    const tooLong = shippedQuestions.filter((question) =>
      textsOf(question).some((value) => value.length > limits.cardTextLength),
    );

    expect(tooLong.map((question) => question.id)).toEqual([]);
  });

  it('should never repeat a question text within a format', () => {
    questionFormats.forEach((format) => {
      const texts = shippedQuestions
        .filter((question) => question.format === format)
        .map((question) => textsOf(question).join('|').toLowerCase());

      expect(new Set(texts).size).toBe(texts.length);
    });
  });

  it('should keep dashes and semicolons out of every text', () => {
    const offending = shippedQuestions.filter((question) =>
      textsOf(question).some(hasDashOrSemicolon),
    );

    expect(offending.map((question) => question.id)).toEqual([]);
  });

  it('should keep gendered words and the forfeit word out of every text', () => {
    const offending = shippedQuestions.filter((question) => textsOf(question).some(hasBarredWord));

    expect(offending.map((question) => question.id)).toEqual([]);
  });

  it('should number each question id after its format and category', () => {
    const misnumbered = shippedQuestions.filter(
      (question) => !question.id.startsWith(`${question.format}-${question.category}-`),
    );

    expect(misnumbered.map((question) => question.id)).toEqual([]);
  });
});
