import { createContext } from 'react';

import type { Feedback } from '../types';

const silentFeedback: Feedback = {
  tap: () => {},
  done: () => {},
  pass: () => {},
  roundComplete: () => {},
};

// With no provider above, feedback does nothing. The app has one at its root, so only a component
// rendered on its own, such as in a test, gets the silent one.
export const FeedbackContext = createContext<Feedback>(silentFeedback);
