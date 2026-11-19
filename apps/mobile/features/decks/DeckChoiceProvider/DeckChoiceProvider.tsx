import { useMemo, useState, type ReactNode } from 'react';

import type { DeckChoice } from '../types';
import { DeckChoiceContext } from './DeckChoiceContext';
import type { DeckChoiceValue } from './types';

/**
 * Holds the deck chosen at setup for a route group, so setup and the picker share it. Leaving the
 * route group unmounts it, so the choice is not remembered and the starter deck is chosen again.
 */
export function DeckChoiceProvider({ children }: { children: ReactNode }) {
  const [choice, chooseDeck] = useState<DeckChoice>('starter');
  const value = useMemo<DeckChoiceValue>(() => ({ choice, chooseDeck }), [choice]);
  return <DeckChoiceContext.Provider value={value}>{children}</DeckChoiceContext.Provider>;
}
