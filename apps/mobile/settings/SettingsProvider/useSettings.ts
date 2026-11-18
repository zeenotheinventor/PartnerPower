import { useContext } from 'react';

import { SettingsContext } from './SettingsContext';
import type { Settings } from './types';

export function useSettings(): Settings {
  const settings = useContext(SettingsContext);
  if (!settings) {
    throw new Error('useSettings needs a SettingsProvider above it');
  }
  return settings;
}
