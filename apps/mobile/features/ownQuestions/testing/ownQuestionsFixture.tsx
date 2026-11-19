import type { ReactNode } from 'react';

import { PersonalDataProvider } from '../../../personal';
import { createInMemoryPersonalRepository } from '../../../storage/personal/createInMemoryPersonalRepository';
import { OwnQuestionsProvider } from '../OwnQuestionsProvider';

type OwnQuestionsFixtureOptions = {
  /** The text of each shipped question, which a player question may not repeat. */
  shippedTexts?: readonly string[];
  /** Keeps the store from opening until `releaseLoad` is called, to test what shows meanwhile. */
  holdLoad?: boolean;
};

/**
 * An in-memory personal store, and the providers that give it to the Your questions screens. The
 * ids count up, so questions saved one after another get different ids. Text is placeholder text.
 */
export function makeOwnQuestionsFixture({
  shippedTexts = [],
  holdLoad = false,
}: OwnQuestionsFixtureOptions = {}) {
  let uuidCount = 0;
  const repository = createInMemoryPersonalRepository({
    getShippedCards: () => [],
    getShippedQuestions: () =>
      shippedTexts.map((text, index) => ({ id: `shipped-${index + 1}`, text })),
    randomUUID: () => {
      uuidCount += 1;
      return `00000000-0000-4000-8000-${String(uuidCount).padStart(12, '0')}`;
    },
    now: () => 1,
  });
  let releaseLoad = () => {};
  const loadGate = holdLoad
    ? new Promise<void>((resolve) => {
        releaseLoad = resolve;
      })
    : Promise.resolve();
  const source = {
    load: () => loadGate.then(() => repository),
    createEmpty: () => repository,
  };

  function Providers({ children }: { children: ReactNode }) {
    return (
      <PersonalDataProvider source={source}>
        <OwnQuestionsProvider>{children}</OwnQuestionsProvider>
      </PersonalDataProvider>
    );
  }

  return { repository, Providers, releaseLoad };
}
