import { Stack } from 'expo-router';

import { useSettings } from '../../settings';

/**
 * The root navigator. It stays mounted once the settings have loaded, and the protected groups
 * decide which screens exist. Until the player has confirmed, `welcome` is the only screen, and
 * once they have it is the one screen that is closed. Every other route belongs in the second
 * group, and a test fails if a route file is left out of it.
 */
export function EntryStack() {
  const { isLoading, hasConfirmedEntry } = useSettings();

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!hasConfirmedEntry}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={hasConfirmedEntry}>
        <Stack.Screen name="index" />
        <Stack.Screen name="games/dares/setup" />
        <Stack.Screen name="dev/kit" />
      </Stack.Protected>
    </Stack>
  );
}
