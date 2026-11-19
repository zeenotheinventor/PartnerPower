import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Button, Card, Character, Chip, Screen } from '../../../components/ui';
import { LineBox } from '../../questionsPlay/LineBox';
import type { SavedLine, SecretMatchRevealViewProps } from './types';

const savedLineText: Record<Exclude<SavedLine, null>, string> = {
  saved: copy.secretMatch.saved,
  savingOff: copy.secretMatch.savingOff,
};

/**
 * What the two both like. The engine's reveal holds only the matches and their strength, so there
 * is no rating here to show and nothing says who said maybe. Nothing here logs.
 */
export function SecretMatchRevealView({
  matches,
  total,
  savedLine,
  onOpenDares,
  onDone,
}: SecretMatchRevealViewProps) {
  if (matches.length === 0) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center gap-16">
          <Character character="shy" mood="flustered" size="hero" />
          <LineBox>{copy.secretMatch.noneTheo}</LineBox>
          <Text accessibilityRole="header" className="type-title text-center text-foreground">
            {copy.secretMatch.noneTitle}
          </Text>
          <Text className="type-body text-center text-muted">{copy.secretMatch.noneBody}</Text>
        </View>
        <Button label={copy.secretMatch.done} fullWidth onPress={onDone} />
      </Screen>
    );
  }

  const countLine =
    matches.length === 1
      ? fillCopy(copy.secretMatch.revealCountOne, { total })
      : fillCopy(copy.secretMatch.revealCountMany, { count: matches.length, total });

  return (
    <Screen scroll>
      <View className="gap-4">
        <Text accessibilityRole="header" className="type-title text-center text-foreground">
          {copy.secretMatch.revealTitle}
        </Text>
        <Text className="type-body-bold text-center text-muted">{countLine}</Text>
      </View>
      <View className="flex-row items-center gap-12">
        <Character character="shy" mood="happy" size="tile" crop="head" />
        <View className="flex-1">
          <LineBox>{copy.secretMatch.revealTheo}</LineBox>
        </View>
      </View>
      {matches.map(({ item, strength }) => (
        <Card key={item.id} category={item.category}>
          <View className="gap-8">
            <View className="flex-row flex-wrap items-start gap-8">
              <Chip label={categoryNames[item.category]} category={item.category} />
            </View>
            <Text className="type-heading text-foreground">{item.text}</Text>
            {strength === 'yes' ? (
              <Chip label={copy.secretMatch.strengthYes} accent />
            ) : (
              <Chip label={copy.secretMatch.strengthMaybe} />
            )}
          </View>
        </Card>
      ))}
      {savedLine ? (
        <Text accessibilityLiveRegion="polite" className="type-caption text-center text-muted">
          {savedLineText[savedLine]}
        </Text>
      ) : null}
      {onOpenDares ? (
        <Card label={copy.secretMatch.daresTitle} onPress={onOpenDares}>
          <View className="gap-4">
            <Text className="type-heading text-foreground">{copy.secretMatch.daresTitle}</Text>
            <Text className="type-body text-muted">{copy.secretMatch.daresBody}</Text>
          </View>
        </Card>
      ) : null}
      <View className="flex-1" />
      <Button label={copy.secretMatch.done} fullWidth onPress={onDone} />
    </Screen>
  );
}
