import type { CategoryId, CharacterId } from '@getfreak/core';

import type { MoodOf } from '../../../characters';

/** A role and a mood that role can show, checked as a pair. */
export type SteppingUpCharacter = {
  [Id in CharacterId]: { character: Id; mood: MoodOf<Id> };
}[CharacterId];

export type SteppingUpViewProps = {
  category: CategoryId;
  categoryName: string;
  /** What passing costs in the new category. */
  penalty: number;
  /** A line to confirm what just happened, shown first on the screen. */
  notice?: string;
  /** What the character says. It is the Freak or Drink line by default. */
  line?: string;
  /** What the new category costs. It says what passing costs by default. */
  costLine?: string;
  /** Who says the line. It is the gatekeeper, flirting, by default. */
  character?: SteppingUpCharacter;
  onContinue: () => void;
};
