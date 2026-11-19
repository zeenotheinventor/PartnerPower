import { copy, fillCopy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Character, Screen } from '../../../components/ui';
import type { SecretMatchHandoffViewProps } from './types';

/**
 * Passes the phone to the second partner. It has one button and no way back, so the first pass can
 * never be reached again. Its copy and Theo's spot are not those of the dares hand over screen.
 */
export function SecretMatchHandoffView({
  finishedPlayerName,
  nextPlayerName,
  onContinue,
}: SecretMatchHandoffViewProps) {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-24">
        <Character character="shy" mood="coverEyes" size="hero" />
        <Text accessibilityRole="header" className="type-title text-center text-foreground">
          {fillCopy(copy.secretMatch.handoffTitle, {
            name: finishedPlayerName,
            partner: nextPlayerName,
          })}
        </Text>
        <Text className="type-body-bold text-center text-muted">
          {fillCopy(copy.secretMatch.handoffLine, { name: finishedPlayerName })}
        </Text>
      </View>
      <Button
        label={fillCopy(copy.secretMatch.handoffButton, { partner: nextPlayerName })}
        fullWidth
        onPress={onContinue}
      />
    </Screen>
  );
}
