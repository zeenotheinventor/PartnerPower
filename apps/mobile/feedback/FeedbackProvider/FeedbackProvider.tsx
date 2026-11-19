import { useEffect, useMemo, useState } from 'react';

import { useSettings } from '../../settings';
import { createFeedback } from '../createFeedback';
import { createNativeFeedbackDevice } from '../nativeFeedbackDevice';
import { FeedbackContext } from './FeedbackContext';
import type { FeedbackProviderProps } from './types';

/**
 * Gives every screen the feedback calls, following the sound and vibration settings. The phone
 * is set up and its sounds are loaded once, when this first renders, so the first press is as fast
 * as any other. It sits inside the settings provider.
 */
export function FeedbackProvider({ children, device }: FeedbackProviderProps) {
  const { soundOn, hapticsOn } = useSettings();
  const [phone] = useState(() => device ?? createNativeFeedbackDevice());
  const feedback = useMemo(
    () => createFeedback(phone, { soundOn, hapticsOn }),
    [phone, soundOn, hapticsOn],
  );

  // Turning vibration off stops a pattern that is part way through.
  useEffect(() => {
    if (!hapticsOn) phone.cancelHaptics();
  }, [hapticsOn, phone]);

  // Rebuilding the calls, or leaving, drops a game moment that is still waiting, so it cannot fire
  // later under the old settings.
  useEffect(() => () => feedback.cancelScheduled(), [feedback]);

  return <FeedbackContext.Provider value={feedback}>{children}</FeedbackContext.Provider>;
}
