import { createContext } from 'react';

import type { PersonalData } from './types';

export const PersonalDataContext = createContext<PersonalData | undefined>(undefined);
