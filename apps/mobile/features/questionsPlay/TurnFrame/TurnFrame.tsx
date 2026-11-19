import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Card, Character, Chip, FeedbackPressable, Screen } from '../../../components/ui';
import { ProgressBar } from '../../roundPlay/ProgressBar';
import { isBoldCategory } from '../isBoldCategory';
import type { TheoMood, TurnFrameProps } from './types';

// Theo is flustered in a bold category, whatever the question is. The only thing that beats it is
// covering his eyes during a private pick.
function showingMood(mood: TheoMood, isBold: boolean): TheoMood {
  return isBold && mood !== 'coverEyes' ? 'flustered' : mood;
}

/**
 * What every turn of a question has in common: the end round pill, the count, the turn line with
 * Theo at its end, the question card and the Not this one link. The controls or the result go in
 * as children. Theo is decoration and sits at the end of the turn line, so nothing moves around him.
 */
export function TurnFrame({
  countLabel,
  progress,
  category,
  categoryName,
  topicName,
  prompt,
  penaltyLine,
  turnLine,
  isTurnLineLarge = false,
  isTurnLineAnnounced = false,
  mood,
  aboveCard,
  onEndRound,
  onNotThisOne,
  children,
}: TurnFrameProps) {
  const { lead, text } = prompt;

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between gap-8">
        <FeedbackPressable
          accessibilityRole="button"
          onPress={onEndRound}
          className="min-h-48 justify-center rounded-pill border-2 border-border bg-surface px-12"
        >
          <Text className="type-caption text-foreground">{copy.roundPlay.endRound}</Text>
        </FeedbackPressable>
        <Text className="type-caption text-muted">{countLabel}</Text>
      </View>

      {progress ? (
        <ProgressBar number={progress.number} length={progress.length} label={countLabel} />
      ) : null}

      <View className="min-h-64 flex-row items-center justify-between gap-12">
        <Text
          accessibilityRole="header"
          accessibilityLiveRegion={isTurnLineAnnounced ? 'polite' : undefined}
          className={`flex-1 ${isTurnLineLarge ? 'type-heading text-foreground' : 'type-body-bold text-muted'}`}
        >
          {turnLine}
        </Text>
        <Character
          character="shy"
          mood={showingMood(mood, isBoldCategory(category))}
          size="tile"
          crop="head"
        />
      </View>

      {aboveCard}

      <Card category={category}>
        <View className="gap-12">
          <View className="flex-row flex-wrap items-start gap-8">
            <Chip label={categoryName} category={category} />
            <Chip label={topicName} />
          </View>
          <Text className="type-heading text-foreground">
            {lead ? <Text className="text-accent-deep">{lead}</Text> : null}
            {lead && text ? ' ' : ''}
            {text}
          </Text>
          <Text className="type-caption text-muted">{penaltyLine}</Text>
        </View>
      </Card>

      {children}

      {onNotThisOne ? (
        <FeedbackPressable
          accessibilityRole="button"
          onPress={onNotThisOne}
          className="min-h-48 items-center justify-center"
        >
          <Text className="type-caption text-muted underline">{copy.roundPlay.notThisOne}</Text>
        </FeedbackPressable>
      ) : null}
    </Screen>
  );
}
