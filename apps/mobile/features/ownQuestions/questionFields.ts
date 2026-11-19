import { copy } from '@getfreak/content';
import { checkCardText, tidyCardText, type CardTextProblem } from '@getfreak/core';

import type { QuestionDraft, QuestionProblem } from '../../storage';

export type EditableFormat = QuestionDraft['format'];

/** The formats a player can write, in the order the editor and the list show them. */
export const editableFormats: readonly EditableFormat[] = [
  'ifYou',
  'neverHave',
  'eitherOr',
  'guess',
];

/** How many options each format takes. */
export const optionRange: Record<EditableFormat, { min: number; max: number }> = {
  ifYou: { min: 0, max: 0 },
  neverHave: { min: 0, max: 0 },
  eitherOr: { min: 2, max: 2 },
  guess: { min: 2, max: 4 },
};

/**
 * The option wording a format can keep. A format with none drops them all, and one with two to four
 * keeps what fits, with empty options added up to its smallest number.
 */
export function optionsForFormat(format: EditableFormat, options: readonly string[]): string[] {
  const { min, max } = optionRange[format];
  const kept = options.slice(0, max);
  return [...kept, ...Array.from({ length: Math.max(0, min - kept.length) }, () => '')];
}

export type FieldErrors = {
  text?: string;
  /** One entry for each option, in order. */
  options: (string | undefined)[];
};

const messageByProblem: Record<CardTextProblem, string> = {
  empty: copy.ownQuestions.errorEmpty,
  tooLong: copy.ownQuestions.errorTooLong,
  duplicate: copy.ownQuestions.errorDuplicate,
};

const optionMessageByProblem: Record<CardTextProblem, string> = {
  empty: copy.ownQuestions.errorOptionEmpty,
  tooLong: copy.ownQuestions.errorTooLong,
  duplicate: copy.ownQuestions.errorOptionRepeat,
};

/**
 * Puts each problem the save found under its own field. The save lists the problems once for the
 * whole question, so the same core rule is run on each option to find which ones it came from. A
 * repeat that no pair of options explains is a repeat of a text already written. When both a text
 * and a pair of options repeat, the options are shown first and the text once they are fixed.
 */
export function fieldErrors(
  draft: Pick<QuestionDraft, 'format' | 'text'> & { options: readonly string[] },
  problems: readonly QuestionProblem[],
): FieldErrors {
  const text = tidyCardText(draft.text);
  const tidiedOptions = draft.options.map(tidyCardText);
  const found = (problem: CardTextProblem) => problems.includes(problem);

  const optionProblems = tidiedOptions.map((option, index) =>
    checkCardText(option, tidiedOptions.slice(0, index)).filter(found),
  );
  const options = optionProblems.map((codes) =>
    codes.length === 0 ? undefined : codes.map((code) => optionMessageByProblem[code]).join(' '),
  );
  const optionsRepeat = optionProblems.some((codes) => codes.includes('duplicate'));

  const textMayBeEmpty = draft.format === 'eitherOr' && text === '';
  const textProblems = (textMayBeEmpty ? [] : checkCardText(text, [])).filter(found);
  if (found('duplicate') && !optionsRepeat) textProblems.push('duplicate');
  const textMessage =
    textProblems.length === 0
      ? undefined
      : textProblems.map((code) => messageByProblem[code]).join(' ');

  const hasAnyError = textMessage !== undefined || options.some((message) => message !== undefined);
  return hasAnyError
    ? { text: textMessage, options }
    : { text: copy.ownQuestions.writeFailed, options };
}
