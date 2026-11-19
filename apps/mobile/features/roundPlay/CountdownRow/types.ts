export type CountdownRowProps = {
  /** How long the countdown lasts, in whole seconds. */
  seconds: number;
  /** The wall clock time in milliseconds when it was started, or null when it is ready. */
  startedAt: number | null;
  /** True from the press that starts it until it is stopped or runs out. */
  isRunning: boolean;
  /** The button's name while it is ready, such as Go or Start. */
  startLabel: string;
  /** The button's name while it runs. */
  stopLabel: string;
  onStart: () => void;
  onStop: () => void;
  /** Called once when the time is up. */
  onEnd: () => void;
};
