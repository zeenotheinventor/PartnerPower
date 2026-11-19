import { copy, fillCopy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Card, Chip } from '../../../components/ui';
import type { AnswerRowsProps } from './types';

/**
 * Who drinks, one row for each player. The rows are read as one group, named for every player in
 * turn, such as "Sam, drinks 2. Alex, safe.", and a screen reader announces it when it appears.
 */
export function AnswerRows({ reveal, playerNames, category }: AnswerRowsProps) {
  const rows = playerNames.map((name, index) => {
    const penalty = reveal.drinks[index] ?? 0;
    return {
      name,
      penalty,
      result:
        penalty > 0
          ? fillCopy(copy.questionsPlay.drinksResult, { penalty })
          : copy.questionsPlay.safeResult,
    };
  });

  return (
    <View
      accessible
      role="group"
      accessibilityLabel={rows
        .map(({ name, result }) => `${fillCopy(copy.questionsPlay.resultLabel, { name, result })}.`)
        .join(' ')}
      accessibilityLiveRegion="polite"
    >
      <Card grouped={false}>
        <View className="gap-8">
          {rows.map(({ name, penalty }, index) => (
            <View key={name}>
              {index > 0 ? <View className="mb-8 border-t-2 border-border" /> : null}
              <View className="min-h-32 flex-row items-center justify-between gap-12">
                <Text className="type-heading text-foreground">{name}</Text>
                {penalty > 0 ? (
                  <Chip
                    label={fillCopy(copy.questionsPlay.drinksChip, { penalty })}
                    category={category}
                  />
                ) : (
                  <Chip label={copy.questionsPlay.safeChip} />
                )}
              </View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}
