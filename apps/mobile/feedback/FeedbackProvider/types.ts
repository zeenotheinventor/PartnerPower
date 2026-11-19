import type { ReactNode } from 'react';

import type { FeedbackDevice } from '../types';

export type FeedbackProviderProps = {
  children: ReactNode;
  /** What plays and buzzes. Tests pass a fake one, and the app uses the phone. */
  device?: FeedbackDevice;
};
