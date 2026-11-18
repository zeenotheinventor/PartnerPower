import { Stack } from 'expo-router';

import { RoundProvider } from '../../../features/round/RoundProvider';

// The round lives here, so setup and play share it and leaving the route group discards it.
export default function DaresLayout() {
  return (
    <RoundProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RoundProvider>
  );
}
