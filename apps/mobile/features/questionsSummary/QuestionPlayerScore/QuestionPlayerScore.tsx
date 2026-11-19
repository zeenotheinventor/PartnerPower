import { copy, fillCopy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Chip } from '../../../components/ui';
import type { QuestionPlayerScoreProps } from './types';

// The block is an outer view that is the depth edge, with the face inside it, like PlayerScore. The
// player who knows best takes the accent for its border and edge. The face has 8 more of top padding
// than PlayerScore, because the badge is wider and as tall as "Boldest" and must not touch the name.
const edgeClasses = {
  best: 'rounded-xl bg-accent-deep pb-4',
  other: 'rounded-xl bg-border pb-4',
};

const faceClasses = {
  best: 'items-center rounded-xl border-2 border-accent bg-surface px-8 pb-12 pt-20',
  other: 'items-center rounded-xl border-2 border-border bg-surface px-8 pb-12 pt-20',
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/**
 * One player's block on the Drink If summary: the name, the drinks and the guesses right. A screen
 * reader reads it as one group, and adds that the player knows best when the badge shows. A player
 * who made no guesses has no guess line.
 */
export function QuestionPlayerScore({
  name,
  drinks,
  guessesRight,
  guessesMade,
  knowsBest,
}: QuestionPlayerScoreProps) {
  const hasGuesses = guessesMade > 0;
  const drinksTaken = fillCopy(
    plural(drinks, copy.roundSummary.drinksOne, copy.roundSummary.drinksMany),
    { count: drinks },
  );
  const guesses = fillCopy(copy.questionsSummary.guessesLine, {
    right: guessesRight,
    made: guessesMade,
  });
  const label = !hasGuesses
    ? fillCopy(copy.questionsSummary.playerSummaryNoGuesses, { name, drinks: drinksTaken })
    : fillCopy(
        knowsBest ? copy.questionsSummary.playerSummaryBest : copy.questionsSummary.playerSummary,
        { name, drinks: drinksTaken, guesses },
      );
  const tone = knowsBest ? 'best' : 'other';

  return (
    <View accessible role="group" accessibilityLabel={label} className={edgeClasses[tone]}>
      <View className={faceClasses[tone]}>
        <Text className="type-label text-muted">{name}</Text>
        <View className="flex-row items-baseline gap-4">
          <Text className="type-heading text-foreground">{drinks}</Text>
          <Text className="type-caption text-muted">
            {plural(drinks, copy.roundSummary.drinkLabelOne, copy.roundSummary.drinkLabelMany)}
          </Text>
        </View>
        {hasGuesses ? (
          <View className="flex-row items-baseline gap-4">
            <Text className="type-heading text-foreground">
              {fillCopy(copy.questionsSummary.guessCount, {
                right: guessesRight,
                made: guessesMade,
              })}
            </Text>
            <Text className="type-caption text-muted">{copy.questionsSummary.guessedRight}</Text>
          </View>
        ) : null}
      </View>
      {knowsBest ? (
        <View className="absolute inset-x-0 top-[-12px] items-center">
          <Chip label={copy.questionsSummary.badge} accent />
        </View>
      ) : null}
    </View>
  );
}
