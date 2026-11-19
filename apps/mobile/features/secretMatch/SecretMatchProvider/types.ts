import type {
  NewDiscovery,
  Question,
  SecretMatchAction,
  SecretMatchSetup,
  SecretMatchView,
} from '@getfreak/core';

export type SecretMatchContextValue = {
  /** What the screens read. Undefined until a session has started in this route. */
  view: SecretMatchView | undefined;
  /** The two names the session started with. A name is not private, a rating is. */
  players: readonly [string, string] | undefined;
  /** The matches of a revealed session, ready to save. Empty before the reveal. */
  matchesToSave: readonly NewDiscovery[];
  /** Starts a session, replacing any session already held. Throws on a setup the engine refuses. */
  start: (setup: SecretMatchSetup, questions: readonly Question[]) => void;
  dispatch: (action: SecretMatchAction) => void;
};
