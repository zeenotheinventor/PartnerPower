import { useContext } from 'react';

import { OwnQuestionsContext } from './OwnQuestionsContext';
import type { OwnQuestions } from './types';

export function useOwnQuestions(): OwnQuestions {
  const ownQuestions = useContext(OwnQuestionsContext);
  if (!ownQuestions) {
    throw new Error('useOwnQuestions needs an OwnQuestionsProvider above it');
  }
  return ownQuestions;
}
