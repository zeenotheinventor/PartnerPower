export type PinPadProps = {
  /** The digits typed so far. The screen that shows the pad holds them, and only while it is on screen. */
  value: string;
  onChange: (value: string) => void;
  /** Called with the whole PIN as the last digit is typed. */
  onComplete: (value: string) => void;
  /**
   * A line in the danger colour that also turns the dots to the danger colour, shakes them and is
   * announced. Clear it when the player types again, so the next error is announced as new.
   */
  error?: string;
  /** A neutral line in the same place, such as the countdown of a wait. It is not announced. */
  message?: string;
  /** Disables every key, such as during a wait. */
  disabled?: boolean;
};
