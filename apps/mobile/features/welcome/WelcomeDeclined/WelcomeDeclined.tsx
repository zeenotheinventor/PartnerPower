import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Card, Character, Screen, SpeechBubble } from '../../../components/ui';
import type { WelcomeDeclinedProps } from './types';

export function WelcomeDeclined({ onBack }: WelcomeDeclinedProps) {
  return (
    <Screen scroll>
      <View className="items-center gap-16">
        <SpeechBubble text={copy.welcomeDeclined.greeting} tail="center" />
        <Character character="gatekeeper" mood="idle" size="hero" />
      </View>
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
