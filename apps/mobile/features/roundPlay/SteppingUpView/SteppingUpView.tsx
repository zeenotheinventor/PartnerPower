import { copy, fillCopy } from '@getfreak/content';
import { categoryIds } from '@getfreak/core';
import { Text, View } from 'react-native';

import { Button, Character, Screen, SpeechBubble } from '../../../components/ui';
import { categoryFillClasses, categoryLabelClasses } from '../categoryClasses';
import type { SteppingUpViewProps } from './types';

// The markers show how far up the categories the round has climbed. They repeat what the category
// name says, so a screen reader skips them.
export function SteppingUpView({
  category,
  categoryName,
  penalty,
  onContinue,
}: SteppingUpViewProps) {
  const reachedCount = categoryIds.indexOf(category) + 1;

  return (
    <Screen scroll>
      <View className="flex-1 items-center justify-center gap-16">
        <SpeechBubble text={copy.roundPlay.stepUpLine} tail="center" />
        <Character character="gatekeeper" mood="flirty" size="hero" />
        <Text accessibilityRole="header" className="type-body-bold text-muted">
          {copy.roundPlay.stepUpTitle}
        </Text>
        <View className={`rounded-pill px-24 py-4 ${categoryFillClasses[category]}`}>
          <Text className={`type-title ${categoryLabelClasses[category]}`}>{categoryName}</Text>
        </View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="flex-row gap-8"
        >
          {categoryIds.map((id, index) => (
            <View
              key={id}
              className={`h-8 w-32 rounded-pill ${index < reachedCount ? categoryFillClasses[id] : 'bg-border'}`}
            />
          ))}
        </View>
        <Text className="type-body-bold text-muted">
          {fillCopy(copy.roundPlay.stepUpCost, { penalty })}
        </Text>
      </View>
      <Button label={copy.roundPlay.stepUpButton} fullWidth onPress={onContinue} />
    </Screen>
  );
}
