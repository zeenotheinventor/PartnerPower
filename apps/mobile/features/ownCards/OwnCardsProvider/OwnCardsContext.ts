import { createContext } from 'react';

import type { OwnCards } from './types';

export const OwnCardsContext = createContext<OwnCards | undefined>(undefined);
