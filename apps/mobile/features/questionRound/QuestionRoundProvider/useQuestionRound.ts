import { useContext } from 'react';

import { QuestionRoundContext } from './QuestionRoundContext';
import type { QuestionRoundContextValue } from './types';

export function useQuestionRound(): QuestionRoundContextValue {
  const round = useContext(QuestionRoundContext);
  if (!round) {
    throw new Error('useQuestionRound needs a QuestionRoundProvider above it');
  }
  return round;
}
