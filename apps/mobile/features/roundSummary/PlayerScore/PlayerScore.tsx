import { copy, fillCopy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Chip } from '../../../components/ui';
import type { PlayerScoreProps } from './types';

// The block is an outer view that is the depth edge, with the face inside it, like a static card.
// The boldest player's block takes the accent for its border and edge.
const edgeClasses = {
  boldest: 'rounded-xl bg-accent-deep pb-4',
  other: 'rounded-xl bg-border pb-4',
};

const faceClasses = {
  boldest: 'items-center rounded-xl border-2 border-accent bg-surface px-8 py-12',
  other: 'items-center rounded-xl border-2 border-border bg-surface px-8 py-12',
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/**
 * One player's block on the summary: the name, the dares done and the drinks taken. A screen reader
 * reads it as one group, and adds that the player was the boldest when the badge shows.
 */
export function PlayerScore({ name, daresDone, drinks, isBoldest }: PlayerScoreProps) {
  const dares = fillCopy(
    plural(daresDone, copy.roundSummary.daresDoneOne, copy.roundSummary.daresDoneMany),
    {
      count: daresDone,
    },
  );
  const drinksTaken = fillCopy(
    plural(drinks, copy.roundSummary.drinksOne, copy.roundSummary.drinksMany),
    { count: drinks },
  );
  const summaryLine = isBoldest
    ? copy.roundSummary.playerSummaryBoldest
    : copy.roundSummary.playerSummary;
  const tone = isBoldest ? 'boldest' : 'other';

  return (
    <View
      accessible
      role="group"
      accessibilityLabel={fillCopy(summaryLine, { name, dares, drinks: drinksTaken })}
      className={edgeClasses[tone]}
    >
      <View className={faceClasses[tone]}>
        <Text className="type-label text-muted">{name}</Text>
        <View className="flex-row items-baseline gap-4">
          <Text className="type-heading text-foreground">{daresDone}</Text>
          <Text className="type-caption text-muted">{copy.roundSummary.doneLabel}</Text>
        </View>
        <View className="flex-row items-baseline gap-4">
          <Text className="type-heading text-foreground">{drinks}</Text>
          <Text className="type-caption text-muted">
            {plural(drinks, copy.roundSummary.drinkLabelOne, copy.roundSummary.drinkLabelMany)}
          </Text>
        </View>
      </View>
      {isBoldest ? (
        <View className="absolute inset-x-0 top-[-12px] items-center">
          <Chip label={copy.roundSummary.boldestBadge} accent />
        </View>
      ) : null}
    </View>
  );
}
