import { copy } from '@getfreak/content';
import { useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { Dialog } from '../../../components/ui';
import type { ClearDiscoveriesDialogProps, ClearDiscoveriesVariant, ClearStatus } from './types';

const lines: Record<
  ClearDiscoveriesVariant,
  { title: string; body: string; confirm: string; cancel: string }
> = {
  clearAll: {
    title: copy.discoveries.clearTitle,
    body: copy.discoveries.clearBody,
    confirm: copy.discoveries.clearConfirm,
    cancel: copy.discoveries.clearCancel,
  },
  savingOff: {
    title: copy.discoveries.offTitle,
    body: copy.discoveries.offBody,
    confirm: copy.discoveries.offConfirm,
    cancel: copy.discoveries.offCancel,
  },
};

/**
 * The question before discoveries are cleared. It is shown only while it is open, so each time it
 * opens it asks again and a failure does not carry over. While clearing, and after a failure, it
 * says what the Clear everything dialog says. The design has no lines for those two states.
 */
export function ClearDiscoveriesDialog({
  variant,
  clearDiscoveries,
  onCleared,
  onCancel,
}: ClearDiscoveriesDialogProps) {
  const [status, setStatus] = useState<ClearStatus>('asking');
  const line = lines[variant];
  const confirmLabels: Record<ClearStatus, string> = {
    asking: line.confirm,
    clearing: copy.clear.clearing,
    failed: copy.clear.retry,
  };

  const clear = async () => {
    setStatus('clearing');
    AccessibilityInfo.announceForAccessibility(copy.clear.clearing);
    try {
      await clearDiscoveries();
    } catch {
      setStatus('failed');
      return;
    }
    onCleared();
  };

  return (
    <Dialog
      visible
      title={line.title}
      body={line.body}
      confirmLabel={confirmLabels[status]}
      confirmVariant="danger"
      cancelLabel={line.cancel}
      error={status === 'failed' ? copy.clear.failed : undefined}
      busy={status === 'clearing'}
      onConfirm={() => void clear()}
      onCancel={onCancel}
    />
  );
}
