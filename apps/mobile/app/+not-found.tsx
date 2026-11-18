import { Redirect } from 'expo-router';

import { useSettings } from '../settings';

// This route is always available, so it picks the one screen that is open to the player: the
// welcome screen until they have confirmed, and the first screen after. Expo Router's own
// unmatched screen would sit outside the root layout and skip the settings.
export default function NotFoundRoute() {
  const { hasConfirmedEntry } = useSettings();
  return <Redirect href={hasConfirmedEntry ? '/' : '/welcome'} />;
}
