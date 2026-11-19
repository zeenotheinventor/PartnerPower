import { useLocalSearchParams } from 'expo-router';

import { DeckEditorScreen } from '../../../../features/decks/DeckEditorScreen';

export default function EditDeckRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Keyed by the id, so opening another deck starts the form again from that deck.
  return <DeckEditorScreen key={id} deckId={id} />;
}
