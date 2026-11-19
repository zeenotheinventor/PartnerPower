import type { ReactElement } from 'react';

import { renderThemed } from '../tailwind/renderThemed';
import { createMockFeedback } from './createMockFeedback';
import { FeedbackContext } from './FeedbackProvider';

/** Renders with mock feedback above it and returns the mock, to check what a press asked for. */
export async function renderWithMockFeedback(ui: ReactElement) {
  const feedback = createMockFeedback();
  await renderThemed(<FeedbackContext.Provider value={feedback}>{ui}</FeedbackContext.Provider>);
  return feedback;
}
