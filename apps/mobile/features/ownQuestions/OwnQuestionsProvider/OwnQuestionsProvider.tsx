import { limits } from '@getfreak/core';
import { useMemo, type ReactNode } from 'react';

import { useCustomQuestions } from '../../../personal';
import { OwnQuestionsContext } from './OwnQuestionsContext';
import type { OwnQuestions } from './types';

// Nothing here logs. A question is personal text. The list is read once for the route group, so the
// home count, the setup count and the editor follow what the list saves and deletes.
export function OwnQuestionsProvider({ children }: { children: ReactNode }) {
  const { isLoading, questions, save, remove } = useCustomQuestions();

  const value = useMemo<OwnQuestions>(
    () => ({
      isLoading,
      questions,
      hasReachedLimit: questions.length >= limits.playerQuestions,
      save,
      remove,
    }),
    [isLoading, questions, save, remove],
  );

  return <OwnQuestionsContext.Provider value={value}>{children}</OwnQuestionsContext.Provider>;
}
