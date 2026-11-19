import { categoryIds, topicIds, type Question, type QuestionOption } from '@getfreak/core';

import { questionDecks } from './questions';
import { hasBarredWord, hasDashOrSemicolon } from './textRules';

const choiceFormats = ['guess', 'eitherOr'] as const;
type ChoiceFormat = (typeof choiceFormats)[number];

const minimumQuestionsPerCategory: Record<ChoiceFormat, number> = { guess: 15, eitherOr: 20 };
const maximumOptionLength: Record<ChoiceFormat, number> = { guess: 60, eitherOr: 80 };
const maximumTextLength = 120;

function questionsOf(format: ChoiceFormat): Question[] {
  return questionDecks.find((deck) => deck.id === format)?.questions ?? [];
}

function optionsOf(question: Question): QuestionOption[] {
  return 'options' in question ? question.options : [];
}

function optionTextsOf(question: Question): string[] {
  return optionsOf(question).map((option) => option.text);
}

describe.each(choiceFormats)('%s question library', (format) => {
  const questions = questionsOf(format);

  it.each(categoryIds)('should hold enough questions in category %s', (categoryId) => {
    const inCategory = questions.filter((question) => question.category === categoryId);

    expect(inCategory.length).toBeGreaterThanOrEqual(minimumQuestionsPerCategory[format]);
  });

  it.each(categoryIds)('should cover every topic in category %s', (categoryId) => {
    const missingTopics = topicIds.filter(
      (topicId) =>
        !questions.some(
          (question) => question.category === categoryId && question.topic === topicId,
        ),
    );

    expect(missingTopics).toEqual([]);
  });

  it('should ship every question as shipped content in its own format', () => {
    const offending = questions.filter(
      (question) => question.source !== 'shipped' || question.format !== format,
    );

    expect(offending.map((question) => question.id)).toEqual([]);
  });

  it('should keep every text within the length limit', () => {
    const tooLong = questions.filter(
      (question) => (question.text ?? '').length > maximumTextLength,
    );

    expect(tooLong.map((question) => question.id)).toEqual([]);
  });

  it('should keep every option within the length limit', () => {
    const tooLong = questions.filter((question) =>
      optionTextsOf(question).some((text) => text.length > maximumOptionLength[format]),
    );

    expect(tooLong.map((question) => question.id)).toEqual([]);
  });

  it('should give every question distinct option ids and distinct option texts', () => {
    const offending = questions.filter((question) => {
      const ids = optionsOf(question).map((option) => option.id);
      const texts = optionTextsOf(question).map((text) => text.toLowerCase());
      return new Set(ids).size !== ids.length || new Set(texts).size !== texts.length;
    });

    expect(offending.map((question) => question.id)).toEqual([]);
  });

  it('should keep gendered words and the forfeit word out of every text and option', () => {
    const offending = questions.filter((question) =>
      [question.text ?? '', ...optionTextsOf(question)].some(hasBarredWord),
    );

    expect(offending.map((question) => question.id)).toEqual([]);
  });

  it('should keep dashes and semicolons out of every text and option', () => {
    const offending = questions.filter((question) =>
      [question.text ?? '', ...optionTextsOf(question)].some(
        (value) => hasDashOrSemicolon(value) || value.includes('-'),
      ),
    );

    expect(offending.map((question) => question.id)).toEqual([]);
  });
});

describe('guess question library options', () => {
  const questions = questionsOf('guess');

  it('should give every question a text', () => {
    expect(questions.filter((question) => !question.text).map((question) => question.id)).toEqual(
      [],
    );
  });

  it('should give every question 2 to 4 options', () => {
    const offending = questions.filter(
      (question) => optionTextsOf(question).length < 2 || optionTextsOf(question).length > 4,
    );

    expect(offending.map((question) => question.id)).toEqual([]);
  });

  it.each(categoryIds)('should give at least half of category %s 3 or 4 options', (categoryId) => {
    const inCategory = questions.filter((question) => question.category === categoryId);
    const withManyOptions = inCategory.filter((question) => optionTextsOf(question).length >= 3);

    expect(withManyOptions.length * 2).toBeGreaterThanOrEqual(inCategory.length);
  });

  it('should never repeat a text', () => {
    const texts = questions.map((question) => (question.text ?? '').toLowerCase());

    expect(new Set(texts).size).toBe(texts.length);
  });
});

describe('eitherOr question library options', () => {
  const questions = questionsOf('eitherOr');

  it('should give every question exactly 2 options', () => {
    const offending = questions.filter((question) => optionTextsOf(question).length !== 2);

    expect(offending.map((question) => question.id)).toEqual([]);
  });

  it('should never repeat a pair of options, in either order', () => {
    const pairs = questions.map((question) =>
      optionTextsOf(question)
        .map((text) => text.toLowerCase())
        .sort()
        .join('|'),
    );

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it('should never reuse an option text in another question', () => {
    const texts = questions.flatMap((question) =>
      optionTextsOf(question).map((text) => text.toLowerCase()),
    );

    expect(new Set(texts).size).toBe(texts.length);
  });
});
