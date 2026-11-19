import type { ClearEverythingResult } from '../../../storage/clearEverything';

export type ClearEverythingDialogProps = {
  /** Runs the clear. It never throws, and the result says whether it finished. */
  clearEverything: () => Promise<ClearEverythingResult>;
  /** Called by Cancel and the Android back button, and never while the clear is running. */
  onCancel: () => void;
};

export type ClearStatus = 'asking' | 'clearing' | 'failed';
