import { copy, fillCopy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Character, Screen, SpeechBubble } from '../../../components/ui';
import { categoryFillClasses, categoryLabelClasses } from '../categoryClasses';
import { CategoryMarkers } from '../CategoryMarkers';
import { NoticeBox } from '../NoticeBox';
import type { SteppingUpViewProps } from './types';

export function SteppingUpView({
  category,
  categoryName,
  penalty,
  notice,
  onContinue,
}: SteppingUpViewProps) {
  return (
    <Screen scroll>
      <View className="flex-1 items-center justify-center gap-16">
        {notice ? <NoticeBox message={notice} /> : null}
        <SpeechBubble text={copy.roundPlay.stepUpLine} tail="center" />
        <Character character="gatekeeper" mood="flirty" size="hero" />
        <Text accessibilityRole="header" className="type-body-bold text-muted">
          {copy.roundPlay.stepUpTitle}
        </Text>
        <View className={`rounded-pill px-24 py-4 ${categoryFillClasses[category]}`}>
          <Text className={`type-title ${categoryLabelClasses[category]}`}>{categoryName}</Text>
        </View>
        <CategoryMarkers category={category} />
        <Text className="type-body-bold text-muted">
          {fillCopy(copy.roundPlay.stepUpCost, { penalty })}
        </Text>
      </View>
      <Button label={copy.roundPlay.stepUpButton} fullWidth onPress={onContinue} />
    </Screen>
  );
}
