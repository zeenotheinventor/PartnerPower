export type SecretMatchHandoffViewProps = {
  /** The partner whose pass is done. */
  finishedPlayerName: string;
  /** The partner who receives the phone. */
  nextPlayerName: string;
  /** Starts the second pass. */
  onContinue: () => void;
};
