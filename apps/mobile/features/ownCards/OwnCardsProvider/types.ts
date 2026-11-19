import type { PlayerCard } from '@getfreak/core';

import type { PersonalRepository, SaveResult } from '../../../storage';

/** What the editor hands over. Leave out `id` for a new dare, or give a stored dare's id to change it. */
export type OwnCardDraft = Parameters<PersonalRepository['savePlayerCard']>[0];

export type OwnCards = {
  /** True until the store has been opened and the dares read. Nothing should be written before. */
  isLoading: boolean;
  /** The player's dares, in the order they were written. */
  cards: PlayerCard[];
  /** True when no more dares can be added. */
  hasReachedLimit: boolean;
  /** Saves a new dare, or changes one when the draft holds its id. A rejected one is not stored. */
  save: (draft: OwnCardDraft) => Promise<SaveResult<PlayerCard>>;
  /** Also takes the dare out of the favourites and the decks, through the repository. */
  remove: (id: string) => Promise<void>;
};
