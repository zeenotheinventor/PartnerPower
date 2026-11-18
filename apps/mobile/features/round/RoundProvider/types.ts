import type { Deck, RoundAction, RoundSetup, RoundState } from '@getfreak/core';

export type RoundContextValue = {
  /** Undefined until a round has been started in this route group. */
  round: RoundState | undefined;
  /** Starts a round with the setup and the deck, replacing any round already held. */
  startNewRound: (setup: RoundSetup, deck: Deck) => void;
  dispatch: (action: RoundAction) => void;
};
