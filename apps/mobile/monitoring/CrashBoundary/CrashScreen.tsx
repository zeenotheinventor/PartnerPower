import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../components/ui';
import type { CrashScreenProps } from './types';

/** What the player sees when a screen fails. It says so plainly and offers a way back in. */
export function CrashScreen({ onRestart }: CrashScreenProps) {
  return (
    <Screen scroll>
      <View className="flex-1" />
      <Card grouped={false}>
        <Text accessibilityRole="header" className="type-heading text-center text-foreground">
          {copy.crash.title}
        </Text>
        <Text className="type-body text-center text-muted">{copy.crash.body}</Text>
      </Card>
      <View className="flex-1" />
      <Button label={copy.crash.restartLabel} onPress={onRestart} fullWidth />
    </Screen>
  );
}
