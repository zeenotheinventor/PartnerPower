import type { CharacterId } from '@getfreak/core';

import type { CharacterCrop, CharacterSize, MoodOf } from '../../../characters';

/** The props for one role. The mood is one that role can show. */
export type CharacterPropsFor<Id extends CharacterId> = {
  /** The role, never the display name. */
  character: Id;
  mood: MoodOf<Id>;
  /** Tile is 64 dp, medium 96 dp and hero 150 dp. */
  size: CharacterSize;
  /** A bust by default. The head crop is for tiles. */
  crop?: CharacterCrop;
  /** False draws the still pose with no loops and no reaction. True by default. */
  animated?: boolean;
};

/**
 * A union over the roles, so the role and the mood are checked as a pair. A mood the character
 * cannot show is a compile error, even when the role is only known as a `CharacterId`.
 */
export type CharacterProps = { [Id in CharacterId]: CharacterPropsFor<Id> }[CharacterId];
