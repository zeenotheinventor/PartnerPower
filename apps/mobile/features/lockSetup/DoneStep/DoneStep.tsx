import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Screen } from '../../../components/ui';
import type { DoneStepProps } from './types';

/** The lock is on. There is no back button, because there is nothing left to undo here. */
export function DoneStep({ body, onDone }: DoneStepProps) {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-16">
        <Text accessibilityRole="header" className="type-title text-center text-foreground">
          {copy.lockSetup.doneTitle}
        </Text>
        <Text className="type-body max-w-[300px] text-center text-muted">{body}</Text>
      </View>
      <Button label={copy.lockSetup.done} fullWidth onPress={onDone} />
    </Screen>
  );
}
