import { useMemo, useState } from 'react';

import { useSettings } from '../../settings';
import { createFeedback } from '../createFeedback';
import { createNativeFeedbackDevice } from '../nativeFeedbackDevice';
import { FeedbackContext } from './FeedbackContext';
import type { FeedbackProviderProps } from './types';

/**
 * Gives every screen the four feedback calls, following the sound and vibration settings. The phone
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

  return <FeedbackContext.Provider value={feedback}>{children}</FeedbackContext.Provider>;
}
