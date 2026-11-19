import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Character, Screen } from '../../../components/ui';

/**
 * Stands in for the screen while the app is not in the foreground, so the app switcher picture
 * shows nothing private. It is a plain view on the background colour and shows no item.
 */
export function PrivacyCover() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-24">
        <Character character="shy" mood="coverEyes" size="hero" />
        <Text accessibilityRole="header" className="type-title text-center text-foreground">
          {copy.secretMatch.coverTitle}
        </Text>
        <Text className="type-body-bold text-center text-muted">{copy.secretMatch.coverBody}</Text>
      </View>
    </Screen>
  );
}
