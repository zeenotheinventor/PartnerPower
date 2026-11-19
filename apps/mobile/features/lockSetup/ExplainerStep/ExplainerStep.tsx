import { copy } from '@getfreak/content';
import { Platform, Text, View } from 'react-native';

import { Button, Card, Header, Screen } from '../../../components/ui';
import type { ExplainerStepProps } from './types';

// The bullet is a small decorative dot, so a screen reader reads the card as one group of text.
function Point({ text }: { text: string }) {
  return (
    <View className="flex-row items-start gap-8">
      <View className="mt-8 h-8 w-8 rounded-pill bg-muted" />
      <Text className="type-body flex-1 text-foreground">{text}</Text>
    </View>
  );
}

/**
 * What the lock does and does not do, before the first PIN is asked for. Android adds the line that
 * screenshots are blocked, because the way it hides the app from the app switcher blocks them too.
 */
export function ExplainerStep({ onCancel, onStart }: ExplainerStepProps) {
  const points =
    Platform.OS === 'android'
      ? [...copy.lockSetup.points, copy.lockSetup.pointAndroid]
      : copy.lockSetup.points;

  return (
    <Screen>
      <Header title={copy.lockSetup.title} backLabel={copy.lockSetup.backLabel} onBack={onCancel} />
      <Card>
        <View className="gap-8">
          <Text className="type-heading text-foreground">{copy.lockSetup.explainerHeading}</Text>
          {points.map((point) => (
            <Point key={point} text={point} />
          ))}
        </View>
      </Card>
      <View className="flex-1" />
      <Button label={copy.lockSetup.start} fullWidth onPress={onStart} />
    </Screen>
  );
}
