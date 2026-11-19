import type { TheoMood, TurnChrome } from '../TurnFrame';

export type StatementViewProps = {
  frame: TurnChrome;
  /** A drink if question reads its lead aloud. A never have I ever question is read out loud. */
  format: 'ifYou' | 'neverHave';
  /** By player index. Each one gets a yes or no. */
  playerNames: readonly [string, string];
  /** Who has the phone and reads the question out. */
  readerName: string;
  mood: TheoMood;
  /** Sends both answers by player index, true for a yes, once both are set. */
  onShowWhoDrinks: (answers: readonly [boolean, boolean]) => void;
  onNotThisOne: () => void;
};
