import { Stack } from 'expo-router';

import { DeckChoiceProvider } from '../../../features/decks/DeckChoiceProvider';
import { OwnCardsProvider } from '../../../features/ownCards/OwnCardsProvider';
import { RoundProvider } from '../../../features/round/RoundProvider';

// The round lives here, so setup and play share it and leaving the route group discards it. So do
// the player's own dares, so the setup count follows what the list and the editor save, and the
// deck chosen at setup, so the picker can change it and the starter deck is chosen again next time.
export default function DaresLayout() {
  return (
    <OwnCardsProvider>
      <DeckChoiceProvider>
        <RoundProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </RoundProvider>
      </DeckChoiceProvider>
    </OwnCardsProvider>
  );
}
