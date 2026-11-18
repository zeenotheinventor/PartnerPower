import { createContext } from 'react';

import type { RoundContextValue } from './types';

export const RoundContext = createContext<RoundContextValue | undefined>(undefined);
