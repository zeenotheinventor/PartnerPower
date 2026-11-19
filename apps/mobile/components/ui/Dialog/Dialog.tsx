import { useEffect } from 'react';
import { AccessibilityInfo, Modal, ScrollView, Text, View } from 'react-native';

import { Button } from '../Button';
import type { DialogProps } from './types';

// Android expects an `onRequestClose` handler, so a busy dialog gets one that does nothing.
const ignoreBackButton = () => {};

// A Modal keeps focus inside the dialog on both platforms. The back button on Android cancels,
// unless the dialog is busy. The scrim is the background colour at reduced opacity, because there
// is no scrim token. The overlay keeps 80 on the top and bottom, so a panel with long content stops
// 160 short of the window and its scroll area shrinks to fit. The title, the error and the buttons
// sit outside the scroll area.
export function Dialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  children,
  error,
  busy = false,
}: DialogProps) {
  // iOS does not read a live region, so the error is also announced.
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={busy ? ignoreBackButton : onCancel}
    >
      <View className="flex-1 justify-center px-16 py-[80px]">
        <View className="absolute inset-0 bg-background opacity-80" />
        <View
          role="alertdialog"
          accessibilityLabel={title}
          accessibilityViewIsModal
          className="max-h-full gap-12 rounded-xl border-2 border-border bg-surface p-16"
        >
          <Text accessibilityRole="header" className="type-heading text-foreground">
            {title}
          </Text>
          <ScrollView className="shrink grow-0" contentContainerClassName="gap-12">
            <Text className="type-body text-muted">{body}</Text>
            {children}
          </ScrollView>
          {error ? (
            <Text
              role="alert"
              accessibilityLiveRegion="polite"
              className="type-body-bold text-danger"
            >
              {error}
            </Text>
          ) : null}
          <Button
            label={confirmLabel}
            variant={confirmVariant}
            fullWidth
            disabled={busy}
            onPress={onConfirm}
          />
          <Button
            label={cancelLabel}
            variant="secondary"
            fullWidth
            disabled={busy}
            onPress={onCancel}
          />
        </View>
      </View>
    </Modal>
  );
}
