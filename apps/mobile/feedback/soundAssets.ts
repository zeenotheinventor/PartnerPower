import backSound from '../assets/sounds/back.wav';
import dealSound from '../assets/sounds/deal.wav';
import doneSound from '../assets/sounds/done.wav';
import handoverSound from '../assets/sounds/handover.wav';
import lockedSound from '../assets/sounds/locked.wav';
import passSound from '../assets/sounds/pass.wav';
import roundCompleteSound from '../assets/sounds/roundComplete.wav';
import selectSound from '../assets/sounds/select.wav';
import sheetOpenSound from '../assets/sounds/sheetOpen.wav';
import stepUpSound from '../assets/sounds/stepUp.wav';
import timerEndSound from '../assets/sounds/timerEnd.wav';
import tapSound from '../assets/sounds/tap.wav';
import toggleOffSound from '../assets/sounds/toggleOff.wav';
import toggleOnSound from '../assets/sounds/toggleOn.wav';
import type { FeedbackSound } from './types';

/** The file of every sound, so one that is missing is a type error. */
export const soundAssets: Record<FeedbackSound, number> = {
  tap: tapSound,
  done: doneSound,
  pass: passSound,
  toggleOn: toggleOnSound,
  toggleOff: toggleOffSound,
  select: selectSound,
  back: backSound,
  locked: lockedSound,
  deal: dealSound,
  stepUp: stepUpSound,
  handover: handoverSound,
  sheetOpen: sheetOpenSound,
  timerEnd: timerEndSound,
  roundComplete: roundCompleteSound,
};
