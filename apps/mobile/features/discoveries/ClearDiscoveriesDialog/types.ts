/** Clear all asks on its own. Turning saving off asks whether to clear what is saved as well. */
export type ClearDiscoveriesVariant = 'clearAll' | 'savingOff';

export type ClearDiscoveriesDialogProps = {
  variant: ClearDiscoveriesVariant;
  /** Removes every discovery. It may reject. */
  clearDiscoveries: () => Promise<void>;
  /** Called once the discoveries are cleared. */
  onCleared: () => void;
  /** Called by the cancel button and the Android back button, and never while clearing. */
  onCancel: () => void;
};

export type ClearStatus = 'asking' | 'clearing' | 'failed';
