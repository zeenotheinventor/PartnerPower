import type { ReactNode } from 'react';

import type { Storage } from '../../storage';

export type Settings = {
  /** True until the stored settings have been read once at launch. */
  isLoading: boolean;
  hasConfirmedEntry: boolean;
  /** Stores the confirmation and reports it as confirmed. */
  confirmEntry: () => Promise<void>;
};

export type SettingsProviderProps = {
  children: ReactNode;
  /** Where settings are read from and written to. Tests pass an in-memory one. */
  storage?: Storage;
};
