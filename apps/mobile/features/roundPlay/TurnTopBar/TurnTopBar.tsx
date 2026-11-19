import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { FeedbackPressable } from '../../../components/ui';
import { ProgressBar } from '../ProgressBar';
import type { TurnTopBarProps } from './types';

/** The End round control and the card count, with the progress bar under them for a set length. */
export function TurnTopBar({ countLabel, progress, onEndRound }: TurnTopBarProps) {
  return (
    <>
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
    </>
  );
}
