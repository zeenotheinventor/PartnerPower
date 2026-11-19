import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Card, Character, Screen, SpeechBubble } from '../../../components/ui';
import type { WelcomeQuestionProps } from './types';

export function WelcomeQuestion({ onConfirm, onDecline }: WelcomeQuestionProps) {
  return (
    <Screen scroll>
      <View className="items-center gap-16">
        <SpeechBubble text={copy.welcome.greeting} tail="center" />
        <Character character="gatekeeper" mood="armsCrossed" size="hero" />
      </View>
      <Card grouped={false}>
        <Text accessibilityRole="header" className="type-heading text-center text-foreground">
          {copy.welcome.question}
        </Text>
        <Text className="type-body text-center text-muted">{copy.welcome.note}</Text>
      </Card>
      <View className="flex-1" />
      <Button label={copy.welcome.confirmLabel} onPress={onConfirm} fullWidth />
      <Button label={copy.welcome.declineLabel} onPress={onDecline} variant="secondary" fullWidth />
    </Screen>
  );
}
