import { createContext } from 'react';

import type { QuestionRoundContextValue } from './types';

export const QuestionRoundContext = createContext<QuestionRoundContextValue | undefined>(undefined);
