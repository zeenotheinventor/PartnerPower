import { copy } from '@getfreak/content';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { Header, Screen } from '../../../components/ui';
import { DeckEditorForm } from '../DeckEditorForm';
import { deckPickerRoute } from '../routes';
import { useCustomDecks } from '../useCustomDecks';
import type { DeckEditorScreenProps } from './types';

// Finds the deck to change and hands it to the form, which keeps its own copy to edit. The deck is
// kept once it has been found, so the form stays up after the deck is deleted until the screen has
// gone back. An id that matches no deck, once the decks have been read, sends the player to the
// picker.
export function DeckEditorScreen({ deckId }: DeckEditorScreenProps) {
  const router = useRouter();
  const { customDecks } = useCustomDecks();

  const found = deckId === undefined ? undefined : customDecks?.find((deck) => deck.id === deckId);
  const [deck, setDeck] = useState(found);
  if (found && !deck) setDeck(found);

  const isMissing = deckId !== undefined && customDecks !== undefined && !found && !deck;
  const hasLeft = useRef(false);
  useEffect(() => {
    if (isMissing && !hasLeft.current) {
      hasLeft.current = true;
      router.replace(deckPickerRoute);
    }
  }, [isMissing, router]);

  if (deckId !== undefined && !deck) {
    // Nothing to edit yet. The title shows, and the form follows once the deck has been read.
    return (
      <Screen>
        <Header
          title={copy.decks.editorTitle}
          backLabel={copy.decks.backLabel}
          onBack={() => (router.canGoBack() ? router.back() : router.replace(deckPickerRoute))}
        />
      </Screen>
    );
  }

  return <DeckEditorForm deck={deck} />;
}
