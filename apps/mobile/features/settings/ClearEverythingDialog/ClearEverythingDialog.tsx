import { copy } from '@getfreak/content';
import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { Dialog } from '../../../components/ui';
import type { ClearEverythingResult } from '../../../storage/clearEverything';
import { BulletList } from '../BulletList';
import type { ClearEverythingDialogProps, ClearStatus } from './types';

const confirmLabels: Record<ClearStatus, string> = {
  asking: copy.clear.confirm,
  clearing: copy.clear.clearing,
  failed: copy.clear.retry,
};

/**
 * The confirmation for Clear everything. It is shown only while it is open, so each time it opens
 * it asks again. On success the root remounts and this goes with it, so a success sets no state.
 * A failure keeps the dialog open with an error line and Try again.
 */
export function ClearEverythingDialog({ clearEverything, onCancel }: ClearEverythingDialogProps) {
  const [status, setStatus] = useState<ClearStatus>('asking');

  const clear = async () => {
    setStatus('clearing');
    AccessibilityInfo.announceForAccessibility(copy.clear.clearing);
    // The clear never throws, but a rejection must not leave the player stuck on Clearing.
    const result = await clearEverything().catch((): ClearEverythingResult => ({ ok: false }));
    if (!result.ok) setStatus('failed');
  };

  return (
    <Dialog
      visible
      title={copy.clear.title}
      body={copy.clear.body}
      confirmLabel={confirmLabels[status]}
      confirmVariant="danger"
      cancelLabel={copy.clear.cancel}
      error={status === 'failed' ? copy.clear.failed : undefined}
      busy={status === 'clearing'}
      onConfirm={() => void clear()}
      onCancel={onCancel}
    >
      <BulletList label={copy.clear.removedLabel} items={copy.clear.removed} />
      <BulletList label={copy.clear.keptLabel} items={copy.clear.kept} />
    </Dialog>
  );
}
