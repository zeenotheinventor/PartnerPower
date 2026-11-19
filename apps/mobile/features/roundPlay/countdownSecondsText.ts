import { copy, fillCopy } from '@getfreak/content';

/** Says a number of seconds for a screen reader, such as "42 seconds". */
export function countdownSecondsText(count: number) {
  return fillCopy(
    count === 1 ? copy.roundPlay.countdownSecondsOne : copy.roundPlay.countdownSecondsMany,
    { count },
  );
}
