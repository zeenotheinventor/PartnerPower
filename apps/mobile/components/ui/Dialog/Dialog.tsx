import { Modal, Text, View } from 'react-native';

import { Button } from '../Button';
import type { DialogProps } from './types';

// A Modal keeps focus inside the dialog on both platforms. The back button on Android cancels. The
// scrim is the background colour at reduced opacity, because there is no scrim token. Confirm is a
// primary button because the kit has no destructive look, and the dialog is itself the safety step.
export function Dialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: DialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center px-16">
        <View className="absolute inset-0 bg-background opacity-80" />
        <View
          role="alertdialog"
          accessibilityLabel={title}
          accessibilityViewIsModal
          className="gap-12 rounded-xl border-2 border-border bg-surface p-16"
        >
          <Text accessibilityRole="header" className="type-heading text-foreground">
            {title}
          </Text>
          <Text className="type-body text-muted">{body}</Text>
          <Button label={confirmLabel} fullWidth onPress={onConfirm} />
          <Button label={cancelLabel} variant="secondary" fullWidth onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
