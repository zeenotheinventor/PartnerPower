export type CountdownProps = {
  /** How long the countdown lasts, in whole seconds. */
  seconds: number;
  /** The wall clock time in milliseconds when it started, or null before it has started. */
  startedAt: number | null;
  /** The name a screen reader gives the countdown. */
  label: string;
  /** Says a number of seconds for a screen reader, such as "42 seconds". */
  secondsText: (count: number) => string;
  /** What a screen reader is told when the time is up. */
  endText: string;
  /** Called once when the time is up, or at once if it already is when the countdown starts. */
  onEnd?: () => void;
};
