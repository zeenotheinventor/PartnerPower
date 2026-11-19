import { useContext } from 'react';

import { OwnCardsContext } from './OwnCardsContext';
import type { OwnCards } from './types';

export function useOwnCards(): OwnCards {
  const ownCards = useContext(OwnCardsContext);
  if (!ownCards) {
    throw new Error('useOwnCards needs an OwnCardsProvider above it');
  }
  return ownCards;
}
