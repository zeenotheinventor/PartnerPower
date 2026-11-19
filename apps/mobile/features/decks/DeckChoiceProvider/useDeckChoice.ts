import { useContext } from 'react';

import { DeckChoiceContext } from './DeckChoiceContext';
import type { DeckChoiceValue } from './types';

export function useDeckChoice(): DeckChoiceValue {
  const deckChoice = useContext(DeckChoiceContext);
  if (!deckChoice) {
    throw new Error('useDeckChoice needs a DeckChoiceProvider above it');
  }
  return deckChoice;
}
