import { decks, questionDecks } from '@getfreak/content';
import { getRandomBytes, randomUUID } from 'expo-crypto';

import { expoDatabaseFactory } from './createExpoDatabaseFactory';
import { createInMemoryPersonalRepository } from './createInMemoryPersonalRepository';
import { createPersonalStore } from './createPersonalStore';
import { createDatabaseKey } from './databaseKey';
import { secureKeyStore } from './secureKeyStore';

const getShippedCards = () => decks.flatMap((deck) => deck.cards);
const getShippedQuestions = () =>
  questionDecks
    .flatMap((deck) => deck.questions)
    .map((question) => ({
      id: question.id,
      text: question.text,
      optionIds: 'options' in question ? question.options.map((option) => option.id) : undefined,
    }));

// The one personal store the app uses. It opens `personal.db` the first time it is loaded, and
// `clearAll` in the storage module clears it.
export const personalStore = createPersonalStore({
  factory: expoDatabaseFactory,
  keyStore: secureKeyStore,
  generateKey: () => createDatabaseKey(getRandomBytes),
  getShippedCards,
  getShippedQuestions,
  randomUUID,
  now: Date.now,
});

/** What the provider reads: the database, with an empty in-memory store for when it cannot open. */
export const personalDataSource = {
  load: personalStore.load,
  createEmpty: () =>
    createInMemoryPersonalRepository({
      getShippedCards,
      getShippedQuestions,
      randomUUID,
      now: Date.now,
    }),
};
