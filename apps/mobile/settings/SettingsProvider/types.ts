import type { PlayerNames } from '@getfreak/core';
import type { ReactNode } from 'react';

import type { Storage } from '../../storage';

export type Settings = {
  /** True until the stored settings have been read once at launch. */
  isLoading: boolean;
  hasConfirmedEntry: boolean;
  /** Stores the confirmation and reports it as confirmed. */
  confirmEntry: () => Promise<void>;
  /** The names last saved, or two empty names when none are remembered. */
  playerNames: PlayerNames;
  /** Stores the names to prefill next time. It never rejects, a failed write is ignored. */
  savePlayerNames: (playerNames: PlayerNames) => Promise<void>;
  /** Whether button and card sounds play. On until the player turns it off. */
  soundOn: boolean;
  /** Stores the sound switch. It never rejects, a failed write is ignored. */
  setSoundOn: (soundOn: boolean) => Promise<void>;
  /** Whether presses and the end of a round buzz. On until the player turns it off. */
  hapticsOn: boolean;
  /** Stores the vibration switch. It never rejects, a failed write is ignored. */
  setHapticsOn: (hapticsOn: boolean) => Promise<void>;
};

export type SettingsProviderProps = {
  children: ReactNode;
  /** Where settings are read from and written to. Tests pass an in-memory one. */
  storage?: Storage;
};
