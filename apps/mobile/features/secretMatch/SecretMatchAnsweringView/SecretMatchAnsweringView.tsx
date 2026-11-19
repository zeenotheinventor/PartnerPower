import { categoryNames, copy, fillCopy } from '@getfreak/content';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, Character, Chip, Screen } from '../../../components/ui';
import { ProgressBar } from '../../roundPlay/ProgressBar';
import { isBoldCategory } from '../../questionsPlay/isBoldCategory';
import type { SecretMatchAnsweringViewProps } from './types';

/**
 * One item of one partner's private pass. The answer buttons never show a chosen state, because
 * choosing moves on at once. After going back, only the player's own earlier answer shows, in the
 * item card. The view holds nothing of the other partner's pass, and nothing here logs.
 */
export function SecretMatchAnsweringView({
  view,
  lookAwayName,
  onRate,
  onBack,
  onStop,
}: SecretMatchAnsweringViewProps) {
  const { item, ownRating } = view;
  const countLabel = fillCopy(copy.secretMatch.count, {
    number: view.position,
    total: view.total,
  });

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between gap-8">
        <Pressable
          accessibilityRole="button"
          onPress={onStop}
          className="min-h-48 justify-center rounded-pill border-2 border-border bg-surface px-12"
        >
          <Text className="type-caption text-foreground">{copy.secretMatch.stop}</Text>
        </Pressable>
        <Text className="type-caption text-muted">{countLabel}</Text>
      </View>
      <ProgressBar number={view.position} length={view.total} label={countLabel} />
      <View className="min-h-64 flex-row items-center justify-between gap-12">
        <Text accessibilityRole="header" className="type-body-bold flex-1 text-muted">
          {fillCopy(copy.secretMatch.passOf, { name: view.playerName })}
        </Text>
        <Character
          character="shy"
          mood={isBoldCategory(item.category) ? 'flustered' : 'coverEyes'}
          size="tile"
          crop="head"
        />
      </View>
      <Text className="type-body text-muted">
        {fillCopy(copy.secretMatch.lookAway, { name: lookAwayName })}
      </Text>
      <Card category={item.category}>
        <View className="gap-12">
          <View className="flex-row flex-wrap items-start gap-8">
            <Chip label={categoryNames[item.category]} category={item.category} />
          </View>
          <Text className="type-heading text-foreground">{item.text}</Text>
          {ownRating ? (
            <View className="flex-row flex-wrap items-start gap-8">
              <Chip
                label={fillCopy(copy.secretMatch.yourAnswer, {
                  answer: copy.secretMatch[ownRating],
                })}
                selected
              />
            </View>
          ) : null}
        </View>
      </Card>
      <View className="gap-12">
        <Button label={copy.secretMatch.yes} fullWidth onPress={() => onRate('yes')} />
        <Button
          label={copy.secretMatch.maybe}
          variant="secondary"
          fullWidth
          onPress={() => onRate('maybe')}
        />
        <Button
          label={copy.secretMatch.no}
          variant="secondary"
          fullWidth
          onPress={() => onRate('no')}
        />
      </View>
      {view.canGoBack ? (
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          className="min-h-48 items-center justify-center"
        >
          <Text className="type-caption text-muted underline">{copy.secretMatch.back}</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}
