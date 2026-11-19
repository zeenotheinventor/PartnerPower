import { createContext } from 'react';

import type { SecretMatchContextValue } from './types';

export const SecretMatchContext = createContext<SecretMatchContextValue | undefined>(undefined);
