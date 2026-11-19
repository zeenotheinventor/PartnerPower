import type { ReactNode } from 'react';

import type { PersonalRepository } from '../../storage/personal/types';

export type PersonalData = {
  /** True until the database has been opened once at launch. */
  isLoading: boolean;
  /** True when the database could not be opened. The screens then see an empty store. */
  loadFailed: boolean;
  /**
   * The player's cards, favourites and decks. While loading, and after a failed load, it is an
   * empty store that keeps what is written to it for this session only.
   */
  repository: PersonalRepository;
  /** True when the database was unreadable and was made again empty, until it is dismissed. */
  recoveredFromUnreadable: boolean;
  /** Stops reporting the recovery, once the screen has told the player. */
  dismissRecoveryNotice: () => void;
};

export type PersonalDataSource = {
  load: () => Promise<PersonalRepository>;
  /** An empty store for while the database loads and for when it cannot be opened. */
  createEmpty: () => PersonalRepository;
};

export type PersonalDataProviderProps = {
  children: ReactNode;
  /** Where the repository comes from. Tests pass an in-memory one. */
  source?: PersonalDataSource;
};
