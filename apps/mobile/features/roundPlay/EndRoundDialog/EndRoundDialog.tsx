import { copy } from '@getfreak/content';
import { useEffect } from 'react';
import { Modal, Text, View } from 'react-native';

import { Button } from '../../../components/ui';
import { useFeedback } from '../../../feedback/FeedbackProvider';
import type { EndRoundDialogProps } from './types';

// A Modal keeps focus inside the dialog on both platforms. The back button on Android closes it,
// which is the same as choosing to keep playing. The scrim is the background colour at reduced
// opacity, because there is no scrim token.
export function EndRoundDialog({ visible, onConfirm, onCancel }: EndRoundDialogProps) {
  const { sheetOpen } = useFeedback();
  useEffect(() => {
    if (visible) sheetOpen();
  }, [visible, sheetOpen]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 justify-center px-16">
        <View className="absolute inset-0 bg-background opacity-80" />
        <View
          role="alertdialog"
          accessibilityLabel={copy.roundPlay.endDialogTitle}
          accessibilityViewIsModal
          className="gap-12 rounded-xl border-2 border-border bg-surface p-16"
        >
          <Text accessibilityRole="header" className="type-heading text-foreground">
            {copy.roundPlay.endDialogTitle}
          </Text>
          <Text className="type-body text-muted">{copy.roundPlay.endDialogBody}</Text>
          <Button label={copy.roundPlay.endDialogConfirm} fullWidth onPress={onConfirm} />
          <Button
            label={copy.roundPlay.endDialogCancel}
            variant="secondary"
            fullWidth
            onPress={onCancel}
          />
        </View>
      </View>
    </Modal>
  );
}
