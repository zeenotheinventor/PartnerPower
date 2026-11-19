import { useContext } from 'react';

import { SecretMatchContext } from './SecretMatchContext';
import type { SecretMatchContextValue } from './types';

export function useSecretMatch(): SecretMatchContextValue {
  const secretMatch = useContext(SecretMatchContext);
  if (!secretMatch) {
    throw new Error('useSecretMatch needs a SecretMatchProvider above it');
  }
  return secretMatch;
}
