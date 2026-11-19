import type { ReactNode } from 'react';

import { createInMemoryBackend } from '../../storage/createInMemoryBackend';
import { createStorage } from '../../storage/createStorage';
import { createInMemoryPersonalRepository } from '../../storage/personal/createInMemoryPersonalRepository';
import type { PersonalRepository } from '../../storage';
import { PersonalDataProvider, type PersonalDataSource } from '../PersonalDataProvider';

export function makeInMemoryRepository(): PersonalRepository {
  return createInMemoryPersonalRepository({
    getShippedCards: () => [],
    getShippedQuestions: () => [
      { id: 'q-match-01', text: 'Shipped question 1' },
      { id: 'q-either-01' },
    ],
    randomUUID: () => '00000000-0000-4000-8000-000000000001',
    now: () => 1,
  });
}

/** A wrapper that gives the hooks a provider over the source. */
export function makeProviderWrapper(source: PersonalDataSource) {
  return ({ children }: { children: ReactNode }) => (
    <PersonalDataProvider source={source}>{children}</PersonalDataProvider>
  );
}

/** An in-memory repository and storage, and a wrapper that gives the repository to the hooks. */
export function makePersonalDataFixture() {
  const repository = makeInMemoryRepository();
  const storage = createStorage(createInMemoryBackend());
  const source = { load: () => Promise.resolve(repository), createEmpty: () => repository };
  return { repository, storage, wrapper: makeProviderWrapper(source) };
}
