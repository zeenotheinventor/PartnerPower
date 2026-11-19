import { createContext } from 'react';

export const RootRemountContext = createContext<(() => void) | undefined>(undefined);
