import { createContext } from 'react';

import type { OwnQuestions } from './types';

export const OwnQuestionsContext = createContext<OwnQuestions | undefined>(undefined);
