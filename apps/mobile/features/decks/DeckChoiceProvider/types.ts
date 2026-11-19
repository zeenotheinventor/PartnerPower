import type { DeckChoice } from '../types';

export type DeckChoiceValue = {
  /** The deck the round will be dealt from. The starter deck until another is chosen. */
  choice: DeckChoice;
  chooseDeck: (choice: DeckChoice) => void;
};
