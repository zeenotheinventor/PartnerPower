import { parseQuestionDeck, type Question, type QuestionDeck } from '@getfreak/core';

import { findUnknownTags } from './interestTags';
import eitherOrDeck from './questions/eitherOr.json';
import guessDeck from './questions/guess.json';
import ifYouDeck from './questions/ifYou.json';
import neverHaveDeck from './questions/neverHave.json';
import secretMatchDeck from './questions/secretMatch.json';

function withTags(question: Question) {
  return question.format === 'secretMatch' ? [question] : [];
}

function loadDeck(input: unknown): QuestionDeck {
  const result = parseQuestionDeck(input);
  if (!result.success) {
    throw new Error(`A shipped question deck is invalid:\n${result.errors.join('\n')}`);
  }
  const unknownTags = findUnknownTags(result.deck.questions.flatMap(withTags));
  if (unknownTags.length > 0) {
    throw new Error(`A shipped question deck has unknown tags:\n${unknownTags.join('\n')}`);
  }
  return result.deck;
}

/** One deck for each format, in the order the formats are listed in `core`. */
export const questionDecks: readonly QuestionDeck[] = [
  loadDeck(ifYouDeck),
  loadDeck(neverHaveDeck),
  loadDeck(guessDeck),
  loadDeck(eitherOrDeck),
  loadDeck(secretMatchDeck),
];
