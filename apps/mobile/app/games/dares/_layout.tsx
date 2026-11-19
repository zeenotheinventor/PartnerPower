import { Stack } from 'expo-router';

import { OwnCardsProvider } from '../../../features/ownCards/OwnCardsProvider';
import { RoundProvider } from '../../../features/round/RoundProvider';

// The round lives here, so setup and play share it and leaving the route group discards it. So do
// the player's own dares, so the setup count follows what the list and the editor save.
export default function DaresLayout() {
  return (
    <OwnCardsProvider>
      <RoundProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </RoundProvider>
    </OwnCardsProvider>
  );
}
