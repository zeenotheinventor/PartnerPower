import type { ClearEverythingResult } from '../../../storage/clearEverything';

export type ClearEverythingDialogProps = {
  /** `forgotPin` is the heading and line for a player who is locked out. Everything else is the same. */
  variant?: 'default' | 'forgotPin';
  /** Runs the clear. It never throws, and the result says whether it finished. */
  clearEverything: () => Promise<ClearEverythingResult>;
  /** Called by Cancel and the Android back button, and never while the clear is running. */
  onCancel: () => void;
};

export type ClearStatus = 'asking' | 'clearing' | 'failed';
