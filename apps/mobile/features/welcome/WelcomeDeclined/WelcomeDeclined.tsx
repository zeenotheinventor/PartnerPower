import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../../components/ui';
import type { WelcomeDeclinedProps } from './types';

export function WelcomeDeclined({ onBack }: WelcomeDeclinedProps) {
  return (
    <Screen scroll>
      <Text className="type-body-bold text-foreground">{copy.welcomeDeclined.greeting}</Text>
      <Card grouped={false}>
        <Text accessibilityRole="header" className="type-heading text-center text-foreground">
          {copy.welcomeDeclined.title}
        </Text>
        <Text className="type-body text-center text-muted">{copy.welcomeDeclined.body}</Text>
      </Card>
      <View className="flex-1" />
      <Button
        label={copy.welcomeDeclined.backLabel}
        onPress={onBack}
        variant="secondary"
        fullWidth
      />
    </Screen>
  );
}
