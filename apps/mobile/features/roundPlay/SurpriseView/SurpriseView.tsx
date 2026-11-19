import { copy, surpriseNames } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Screen } from '../../../components/ui';
import { CategoryMarkers } from '../CategoryMarkers';
import { NoticeBox } from '../NoticeBox';
import type { SurpriseViewProps } from './types';

// The reveal of a surprise, shown before the card it belongs to. Every surprise has the same shape:
// the name, its rule and whose turn it is. Only a category jump adds the step up markers.
export function SurpriseView({
  surprise,
  rule,
  turnLine,
  reachedCategory,
  notice,
  onContinue,
}: SurpriseViewProps) {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-16">
        {notice ? <NoticeBox message={notice} /> : null}
        <Text className="type-body-bold text-muted">{copy.roundPlay.surpriseTitle}</Text>
        <View className="rounded-pill bg-accent px-24 py-4">
          <Text accessibilityRole="header" className="type-title text-on-accent">
            {surpriseNames[surprise]}
          </Text>
        </View>
        {reachedCategory ? <CategoryMarkers category={reachedCategory} /> : null}
        <View className="self-stretch rounded-lg border-2 border-border bg-surface p-12">
          <Text className="type-body-bold text-center text-foreground">{rule}</Text>
        </View>
        <Text className="type-body-bold text-muted">{turnLine}</Text>
      </View>
      <Button label={copy.roundPlay.surpriseButton} fullWidth onPress={onContinue} />
    </Screen>
  );
}
