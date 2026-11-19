import { createInMemoryPersonalRepository } from './createInMemoryPersonalRepository';
import {
  describePersonalRepository,
  makeShippedCardsForTests,
  makeShippedQuestionsForTests,
} from './testing/describePersonalRepository';

describePersonalRepository('in-memory', async (options) => {
  let nextUuid = 0;
  const shippedCards = makeShippedCardsForTests();
  const shippedQuestions = makeShippedQuestionsForTests();
  const repository = createInMemoryPersonalRepository({
    getShippedCards: () => shippedCards,
    getShippedQuestions: () => shippedQuestions,
    randomUUID: () => `00000000-0000-4000-8000-${String((nextUuid += 1)).padStart(12, '0')}`,
    now: () => 1,
    ...options,
  });
  return { repository, shippedCards, shippedQuestions };
});
