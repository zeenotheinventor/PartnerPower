import { useContext } from 'react';

import { PersonalDataContext } from './PersonalDataContext';
import type { PersonalData } from './types';

export function usePersonalData(): PersonalData {
  const personalData = useContext(PersonalDataContext);
  if (!personalData) {
    throw new Error('usePersonalData needs a PersonalDataProvider above it');
  }
  return personalData;
}
