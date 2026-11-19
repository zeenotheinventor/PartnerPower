import type { ReactNode } from 'react';

import type { SecureStorage, Storage } from '../types';

export type InstallMarkerGateProps = {
  children: ReactNode;
  /** Tests pass in-memory ones. */
  storage?: Storage;
  secureStorage?: SecureStorage;
};
