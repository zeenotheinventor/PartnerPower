import { categoryNames, copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Card, Chip } from '../../../components/ui';
import { LineBox } from '../../questionsPlay/LineBox';
import type { DaresForYouTwoProps } from './types';

/**
 * Dares picked from what the couple matched on, with a way to play them. With too few to make a
 * round it holds the hint to play a secret match instead. The screen works the suggestions out, so
 * this holds no rules. Nothing here logs, because every dare here is personal.
 */
export function DaresForYouTwo({ dares, canPlay, onPlay, onStartMatch }: DaresForYouTwoProps) {
  return (
    <View className="gap-12">
      <View className="gap-4">
        <Text accessibilityRole="header" className="type-heading text-foreground">
          {copy.discoveries.daresTitle}
        </Text>
        <Text className="type-body text-muted">{copy.discoveries.daresBody}</Text>
      </View>
      {canPlay ? (
        <>
          {dares.map((dare) => (
            <Card key={dare.id} category={dare.category}>
              <View className="gap-8">
                <View className="flex-row flex-wrap items-start gap-8">
                  <Chip label={categoryNames[dare.category]} category={dare.category} />
                </View>
                <Text className="type-body-bold text-foreground">{dare.text}</Text>
              </View>
            </Card>
          ))}
          <Button label={copy.discoveries.daresPlay} fullWidth onPress={onPlay} />
        </>
      ) : (
        <>
          <LineBox>{copy.discoveries.daresTooFew}</LineBox>
          <Button
            label={copy.discoveries.daresStartMatch}
            variant="secondary"
            fullWidth
            onPress={onStartMatch}
          />
        </>
      )}
    </View>
  );
}
