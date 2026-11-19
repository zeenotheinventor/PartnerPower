import { useContext } from 'react';

import type { Feedback } from '../types';
import { FeedbackContext } from './FeedbackContext';

export function useFeedback(): Feedback {
  return useContext(FeedbackContext);
}
