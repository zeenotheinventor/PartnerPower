import { useContext } from 'react';

import { RoundContext } from './RoundContext';
import type { RoundContextValue } from './types';

export function useRound(): RoundContextValue {
  const round = useContext(RoundContext);
  if (!round) {
    throw new Error('useRound needs a RoundProvider above it');
  }
  return round;
}
