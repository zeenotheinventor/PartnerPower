import type { ReactNode } from 'react';

import { PersonalDataProvider } from '../../../personal';
import { createInMemoryPersonalRepository } from '../../../storage/personal/createInMemoryPersonalRepository';
import { OwnCardsProvider } from '../OwnCardsProvider';

type OwnCardsFixtureOptions = {
  /** The text of each shipped card, which a dare may not repeat. */
  shippedTexts?: readonly string[];
  /** The ids of the shipped secret match items, which a stored match must name. */
  shippedMatchItemIds?: readonly string[];
  /** Makes the store report that it started fresh, as it does after a lost key. */
  recoveredFromUnreadable?: boolean;
  /** Keeps the store from opening until `releaseLoad` is called, to test what shows meanwhile. */
  holdLoad?: boolean;
};

/**
 * An in-memory personal store, and the providers that give it to the My dares screens. The ids
 * count up, so cards saved one after another get different ids. Text is placeholder text.
 */
export function makeOwnCardsFixture({
  shippedTexts = [],
  shippedMatchItemIds = [],
  recoveredFromUnreadable = false,
  holdLoad = false,
}: OwnCardsFixtureOptions = {}) {
  let uuidCount = 0;
  const repository = createInMemoryPersonalRepository({
    getShippedCards: () => shippedTexts.map((text, index) => ({ id: `card-${index + 1}`, text })),
    getShippedQuestions: () => shippedMatchItemIds.map((id) => ({ id, optionIds: [] })),
    randomUUID: () => {
      uuidCount += 1;
      return `00000000-0000-4000-8000-${String(uuidCount).padStart(12, '0')}`;
    },
    now: () => 1,
    recoveredFromUnreadable,
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
        <OwnCardsProvider>{children}</OwnCardsProvider>
      </PersonalDataProvider>
    );
  }

  return { repository, Providers, releaseLoad };
}
