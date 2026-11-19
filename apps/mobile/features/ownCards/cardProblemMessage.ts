import { copy } from '@getfreak/content';
import type { CardTextProblem } from '@getfreak/core';

// The rule behind each code lives in core. The words live in content. Typed by code, so a new code
// fails typecheck until it has a message.
const messageByProblem: Record<CardTextProblem, string> = {
  empty: copy.ownCards.emptyError,
  tooLong: copy.ownCards.tooLongError,
  duplicate: copy.ownCards.duplicateError,
};

/** The messages for the problems core found in a dare, as one line of text. */
export function cardProblemMessage(problems: readonly CardTextProblem[]): string {
  return problems.map((problem) => messageByProblem[problem]).join(' ');
}
