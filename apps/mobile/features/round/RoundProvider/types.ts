import type { Deck, RoundAction, RoundSetup, RoundState } from '@getfreak/core';

/** What a round was started from, kept in memory so the summary can start another like it. */
export type RoundStart = { setup: RoundSetup; deck: Deck };

export type RoundContextValue = {
  /** Undefined until a round has been started in this route group. */
  round: RoundState | undefined;
  /** Starts a round with the setup and the deck, replacing any round already held. */
  startNewRound: (setup: RoundSetup, deck: Deck) => void;
  /** The setup and deck of the round started last. Undefined until a round has been started. */
  lastStart: RoundStart | undefined;
  dispatch: (action: RoundAction) => void;
};
