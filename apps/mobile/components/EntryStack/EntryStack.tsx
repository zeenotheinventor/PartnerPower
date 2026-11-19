import { Stack } from 'expo-router';

import { useSettings } from '../../settings';
import { SplashReveal } from '../SplashReveal';

/**
 * The root navigator. It stays mounted once the settings have loaded, and the protected groups
 * decide which screens exist. Until the player has confirmed, `welcome` is the only screen, and
 * once they have it is the one screen that is closed. Every other route belongs in the second
 * group, and a test fails if a route file is left out of it. The splash screen stays up until the
 * stack has been laid out.
 */
export function EntryStack() {
  const { isLoading, hasConfirmedEntry } = useSettings();

  if (isLoading) return null;

  return (
    <SplashReveal>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!hasConfirmedEntry}>
          <Stack.Screen name="welcome" />
        </Stack.Protected>
        <Stack.Protected guard={hasConfirmedEntry}>
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="privacy" />
          {/* Each game's route group has a layout, so it is one screen here and its routes sit inside it. */}
          <Stack.Screen name="games/dares" />
          <Stack.Screen name="games/questions" />
          <Stack.Screen name="dev/kit" />
          <Stack.Screen name="dev/test-error" />
        </Stack.Protected>
      </Stack>
    </SplashReveal>
  );
}
