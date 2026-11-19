export type DoneStepProps = {
  /** What the player needs to know now, such as that they will need the PIN. */
  body: string;
  onDone: () => void;
};
