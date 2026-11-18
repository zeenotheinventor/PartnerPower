import { copy } from '@getfreak/content';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, Chip, Screen } from '../../../components/ui';
import { ProgressBar } from '../ProgressBar';
import type { TurnViewProps } from './types';

export function TurnView({
  turnLabel,
  countLabel,
  progress,
  category,
  categoryName,
  text,
  penaltyLine,
  onDone,
  onPass,
  onEndRound,
}: TurnViewProps) {
  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between gap-8">
        <Pressable
          accessibilityRole="button"
          onPress={onEndRound}
          className="min-h-48 justify-center rounded-pill border-2 border-border bg-surface px-12"
        >
          <Text className="type-caption text-foreground">{copy.roundPlay.endRound}</Text>
        </Pressable>
        <Text className="type-caption text-muted">{countLabel}</Text>
      </View>

      {progress ? (
        <ProgressBar number={progress.number} length={progress.length} label={countLabel} />
      ) : null}

      <Text accessibilityRole="header" className="type-body-bold text-muted">
        {turnLabel}
      </Text>

      <Card category={category} grouped={false}>
        <View className="gap-12">
          <Chip label={categoryName} category={category} />
          <Text className="type-heading text-foreground">{text}</Text>
          <Text className="type-caption text-muted">{penaltyLine}</Text>
        </View>
      </Card>

      <View className="flex-row gap-12">
        <View className="flex-1">
          <Button label={copy.roundPlay.done} fullWidth onPress={onDone} />
        </View>
        <View className="flex-1">
          <Button label={copy.roundPlay.pass} variant="secondary" fullWidth onPress={onPass} />
        </View>
      </View>

      {/* The space below the buttons is kept for the Not this one control. */}
      <View className="h-24" />
    </Screen>
  );
}
