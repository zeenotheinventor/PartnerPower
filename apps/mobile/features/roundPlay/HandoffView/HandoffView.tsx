import { copy, fillCopy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Screen } from '../../../components/ui';
import type { HandoffViewProps } from './types';

export function HandoffView({ name, previousName, line, onContinue }: HandoffViewProps) {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-24">
        {previousName ? (
          <View className="rounded-lg border-2 border-border bg-surface p-12">
            <Text className="type-body-bold text-foreground">
              {fillCopy(copy.roundPlay.handoffLine, { name: previousName })}
            </Text>
          </View>
        ) : null}
        <Text accessibilityRole="header" className="type-title text-center text-foreground">
          {fillCopy(copy.roundPlay.handoffTitle, { name })}
        </Text>
        {line ? <Text className="type-body-bold text-center text-muted">{line}</Text> : null}
      </View>
      <Button label={copy.roundPlay.handoffButton} fullWidth onPress={onContinue} />
    </Screen>
  );
}
