import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '../../../components/ui';
import type { WelcomeQuestionProps } from './types';

// The character art joins this screen in a later ticket, so the greeting sits above the card.
export function WelcomeQuestion({ onConfirm, onDecline }: WelcomeQuestionProps) {
  return (
    <Screen scroll>
      <Text className="type-body-bold text-foreground">{copy.welcome.greeting}</Text>
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
