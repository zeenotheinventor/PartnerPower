export type ChoosePinStepsProps = {
  /** The heading of the first step, which differs between a first PIN and a new one. */
  enterTitle: string;
  /** Back from the first step. The second step goes back to the first on its own. */
  onBack: () => void;
  /**
   * Called with the PIN once it has been typed twice the same. It answers with an error line to show
   * on the second step, or nothing when the PIN was taken and the flow moves on.
   */
  onChosen: (pin: string) => Promise<string | undefined>;
};
