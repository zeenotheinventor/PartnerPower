import { Text, View } from 'react-native';

import { Card, Chip, Screen } from '../../../components/ui';
import { TurnTopBar } from '../TurnTopBar';
import type { ChoiceViewProps } from './types';

// The partner who is not playing picks one of two dares for the player. Each dare is a card that is
// one button named by its text, with no penalty line, because both dares are in the same category
// and the cost shows on the card that is played.
export function ChoiceView({
  prompt,
  countLabel,
  progress,
  category,
  categoryName,
  options,
  onChoose,
  onEndRound,
}: ChoiceViewProps) {
  return (
    <Screen scroll>
      <TurnTopBar countLabel={countLabel} progress={progress} onEndRound={onEndRound} />

      <Text accessibilityRole="header" className="type-title text-foreground">
        {prompt}
      </Text>

      <View className="gap-16">
        {options.map((text, index) => (
          <Card
            key={text}
            category={category}
            label={text}
            onPress={() => onChoose(index === 0 ? 0 : 1)}
          >
            <View className="items-start gap-12">
              <Chip label={categoryName} category={category} />
              <Text className="type-heading text-foreground">{text}</Text>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
