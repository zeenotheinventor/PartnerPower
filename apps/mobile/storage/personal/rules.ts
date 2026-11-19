import {
  checkCardText,
  customQuestionSchema,
  limits,
  tidyCardText,
  type CardTextProblem,
  type CustomQuestion,
  type Discovery,
  type NewDiscovery,
} from '@getfreak/core';

import type { QuestionDraft, QuestionProblem, ShippedCard, ShippedQuestion } from './types';

/** The rules both repositories apply before they write, so the real one and the fake agree. */

export type Checked<Value, Problem = CardTextProblem> =
  | { ok: true; value: Value }
  | { ok: false; reason: 'invalid'; problems: Problem[] }
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

/** How many options each format takes. A format that is not listed takes none. */
const optionCounts = {
  guess: { min: 2, max: 4 },
  eitherOr: { min: 2, max: 2 },
} as const;

export type CheckedQuestionText = { text: string | undefined; options: string[] | undefined };

/**
 * Tidies and checks a question's text and options with the card text rules. Only an either-or
 * question may have no text. Options are checked against each other, not against shipped text.
 * The problems of the text and the options are listed together, each once.
 */
export function checkQuestionDraftText(
  draft: Pick<QuestionDraft, 'format' | 'text' | 'options'>,
  shippedTexts: readonly string[],
  otherPlayerTexts: readonly string[],
): Checked<CheckedQuestionText, QuestionProblem> {
  const problems = new Set<QuestionProblem>();
  const tidiedText = tidyCardText(draft.text);
  const text = draft.format === 'eitherOr' && tidiedText === '' ? undefined : tidiedText;
  if (text !== undefined) {
    for (const problem of checkCardText(text, [...shippedTexts, ...otherPlayerTexts])) {
      problems.add(problem);
    }
  }
  const range =
    draft.format === 'guess' || draft.format === 'eitherOr'
      ? optionCounts[draft.format]
      : undefined;
  const given = draft.options;
  let options: string[] | undefined;
  if (range === undefined) {
    if (given !== undefined) problems.add('optionCount');
  } else if (given === undefined || given.length < range.min || given.length > range.max) {
    problems.add('optionCount');
  } else {
    const tidied = given.map(tidyCardText);
    tidied.forEach((option, index) => {
      for (const problem of checkCardText(option, tidied.slice(0, index))) problems.add(problem);
    });
    options = tidied;
  }
  return problems.size > 0
    ? { ok: false, reason: 'invalid', problems: [...problems] }
    : { ok: true, value: { text, options } };
}

/**
 * The `player` part of a discovery's key: the answerer's name, trimmed, for an `answer`, and empty
 * for the others. A name of only spaces is empty, which no answer may have.
 */
export function discoveryPlayer(key: { kind: string; answererName?: string }): string {
  return key.kind === 'answer' ? (key.answererName ?? '').trim() : '';
}

/**
 * Builds the player question from a draft that passed `checkQuestionDraftText`, giving the options
 * positional ids. A draft that still fails the schema throws a plain error, because a schema error
 * can echo the values it was given.
 */
export function buildPlayerQuestion(
  id: string,
  draft: Pick<QuestionDraft, 'format' | 'category' | 'topic'>,
  checked: CheckedQuestionText,
): CustomQuestion {
  const parsed = customQuestionSchema.safeParse({
    id,
    format: draft.format,
    category: draft.category,
    topic: draft.topic,
    source: 'player',
    ...(checked.text === undefined ? {} : { text: checked.text }),
    ...(checked.options === undefined
      ? {}
      : {
          options: checked.options.map((option, index) => ({ id: `o${index + 1}`, text: option })),
        }),
  });
  if (!parsed.success) throw new Error('Invalid question');
  return parsed.data;
}

/** False for an answer whose name is only spaces, which the table does not allow. */
export function isStorableDiscovery(draft: NewDiscovery): boolean {
  return draft.kind !== 'answer' || discoveryPlayer(draft) !== '';
}

function optionIdsOf(question: CustomQuestion): string[] {
  return 'options' in question ? question.options.map((option) => option.id) : [];
}

/**
 * The option ids each known question offers. A shipped question that does not list its option ids
 * has no entry, so its discoveries are not checked against options.
 */
export function offeredOptionIds(
  shippedQuestions: readonly ShippedQuestion[],
  playerQuestions: readonly CustomQuestion[],
): Map<string, readonly string[]> {
  const offered = new Map<string, readonly string[]>();
  for (const question of shippedQuestions) {
    if (question.optionIds !== undefined) offered.set(question.id, question.optionIds);
  }
  for (const question of playerQuestions) offered.set(question.id, optionIdsOf(question));
  return offered;
}

/** False for a discovery that names an option its question does not offer now. */
export function isOptionOffered(
  discovery: Discovery,
  offered: ReadonlyMap<string, readonly string[]>,
): boolean {
  if (discovery.kind === 'match') return true;
  return offered.get(discovery.questionId)?.includes(discovery.optionId) ?? true;
}

/**
 * True when a change to a stored question makes its option ids mean something else: another
 * format, or fewer options. Its discoveries are then deleted rather than shown against new options.
 */
export function changeInvalidatesDiscoveries(
  before: CustomQuestion,
  after: CustomQuestion,
): boolean {
  return before.format !== after.format || optionIdsOf(after).length < optionIdsOf(before).length;
}

/** A discovery's date from the time it was stored, or nothing when the time is not a real date. */
export function discoveryDate(time: number): string | undefined {
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
