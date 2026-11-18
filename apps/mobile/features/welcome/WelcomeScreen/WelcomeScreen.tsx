import { useState } from 'react';

import { useSettings } from '../../../settings';
import { WelcomeDeclined } from '../WelcomeDeclined';
import { WelcomeQuestion } from '../WelcomeQuestion';

// Confirming only stores the confirmation. The entry guard sees it and sends the player to the
// first screen, so this screen holds no navigation of its own. The closing screen is state in this
// route rather than a route of its own, so the guard has one open route to reason about.
export function WelcomeScreen() {
  const { confirmEntry } = useSettings();
  const [hasDeclined, setHasDeclined] = useState(false);

  if (hasDeclined) {
    return <WelcomeDeclined onBack={() => setHasDeclined(false)} />;
  }
  return <WelcomeQuestion onConfirm={confirmEntry} onDecline={() => setHasDeclined(true)} />;
}
