import { copy } from '@getfreak/content';
import { cssInterop } from 'nativewind';
import { useEffect } from 'react';
import { Modal, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, CategoryToggle, FeedbackPressable } from '../../../components/ui';
import { useFeedback } from '../../../feedback/FeedbackProvider';
import type { NotThisOneSheetProps } from './types';

// The safe area view needs the interop so that it accepts a class name.
const ThemedSafeAreaView = cssInterop(SafeAreaView, { className: 'style' });

// A Modal keeps focus inside the sheet on both platforms. The back button on Android closes it,
// which is the same as choosing to keep playing. The scrim is the background colour at reduced
// opacity, because there is no scrim token. A category switched off cannot be switched back on,
// because the round has no way to do that, so it is shown locked and off. The last category on is
// locked, as it is on the setup screen. The sheet sits at the bottom edge of a Modal, outside the
// screen's own safe area, so the bottom inset is added to its padding and the surface runs behind
// the system bar.
export function NotThisOneSheet({
  visible,
  categories,
  skipTitle = copy.roundPlay.skipTitle,
  skipHint = copy.roundPlay.skipBody,
  onSkip,
  onSwitchOff,
  onClose,
}: NotThisOneSheetProps) {
  const { sheetOpen } = useFeedback();
  useEffect(() => {
    if (visible) sheetOpen();
  }, [visible, sheetOpen]);

  const isLastCategoryOn = categories.filter(({ isOn }) => isOn).length === 1;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <View className="absolute inset-0 bg-background opacity-80" />
        <View
          role="dialog"
          accessibilityLabel={copy.roundPlay.sheetTitle}
          accessibilityViewIsModal
          className="rounded-t-xl border-t-2 border-border bg-surface"
        >
          <ThemedSafeAreaView edges={['bottom']} className="gap-12 px-16 pb-16 pt-12">
            <View className="h-4 w-40 self-center rounded-pill bg-border" />
            <Text accessibilityRole="header" className="type-heading text-foreground">
              {copy.roundPlay.sheetTitle}
            </Text>

            <FeedbackPressable
              accessibilityRole="button"
              accessibilityLabel={skipTitle}
              accessibilityHint={skipHint}
              onPress={onSkip}
              className="min-h-48 justify-center rounded-lg border-2 border-border bg-background px-12 py-8"
            >
              <Text className="type-heading text-foreground">{skipTitle}</Text>
              <Text className="type-caption text-muted">{skipHint}</Text>
            </FeedbackPressable>

            <View className="gap-4">
              <Text className="type-caption uppercase text-muted">
                {copy.roundPlay.switchOffLabel}
              </Text>
              <View className="flex-row flex-wrap gap-8">
                {categories.map(({ category, name, isOn }) => (
                  <View key={category} className="w-[48%]">
                    <CategoryToggle
                      label={name}
                      category={category}
                      value={isOn}
                      locked={!isOn || isLastCategoryOn}
                      lockedHint={
                        isOn ? copy.roundSetup.lastCategoryHint : copy.roundPlay.switchedOffHint
                      }
                      onValueChange={() => onSwitchOff(category)}
                    />
                  </View>
                ))}
              </View>
              {isLastCategoryOn ? (
                <Text className="type-caption text-muted">{copy.roundSetup.lastCategoryHint}</Text>
              ) : null}
            </View>

            <Button
              label={copy.roundPlay.sheetClose}
              variant="secondary"
              fullWidth
              onPress={onClose}
            />
          </ThemedSafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
