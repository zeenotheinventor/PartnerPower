import { createContext } from 'react';

import type { DeckChoiceValue } from './types';

export const DeckChoiceContext = createContext<DeckChoiceValue | undefined>(undefined);
