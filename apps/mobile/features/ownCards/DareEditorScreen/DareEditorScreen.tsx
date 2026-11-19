import { copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { Header, Screen } from '../../../components/ui';
import { DareEditorForm } from '../DareEditorForm';
import { useOwnCards } from '../OwnCardsProvider';
import { myDaresRoute } from '../routes';
import type { DareEditorScreenProps } from './types';

// Finds the dare to change and hands it to the form, which keeps its own copy to edit. The dare is
// kept once it has been found, so the form stays up after the dare is deleted until the screen has
// gone back. An id that matches no dare, once the store has been read, sends the player to the list.
export function DareEditorScreen({ dareId }: DareEditorScreenProps) {
  const router = useRouter();
  const { cards, isLoading } = useOwnCards();

  const found = dareId === undefined ? undefined : cards.find((card) => card.id === dareId);
  const [dare, setDare] = useState(found);
  if (found && !dare) setDare(found);

  const isMissing = dareId !== undefined && !isLoading && !found && !dare;
  const hasLeft = useRef(false);
  useEffect(() => {
    if (isMissing && !hasLeft.current) {
      hasLeft.current = true;
      router.replace(myDaresRoute);
    }
  }, [isMissing, router]);

  if (dareId !== undefined && !dare) {
    // Nothing to edit yet. The title shows, and the form follows once the dare has been read.
    return (
      <Screen>
        <Header
          title={copy.ownCards.editorTitle}
          backLabel={copy.ownCards.backLabel}
          onBack={() => (router.canGoBack() ? router.back() : router.replace(myDaresRoute))}
        />
      </Screen>
    );
  }

  return <DareEditorForm dare={dare} />;
}
