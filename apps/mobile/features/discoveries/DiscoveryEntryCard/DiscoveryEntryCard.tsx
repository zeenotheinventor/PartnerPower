import { memo } from 'react';
import { Text, View } from 'react-native';

import { Card, Chip } from '../../../components/ui';
import type { DiscoveryEntryCardProps } from './types';

// The card is not grouped, because it holds the remove control and a screen reader must reach it.
// It is memoised, since the list can hold hundreds of entries and a change elsewhere on the screen
// should not draw them all again. Nothing here logs.
export const DiscoveryEntryCard = memo(function DiscoveryEntryCard({
  kind,
  questionId,
  answererName,
  topicName,
  lead,
  text,
  answerLine,
  strengthLabel,
  isStrongMatch = false,
  removeLabel,
  removeText,
  onRemove,
}: DiscoveryEntryCardProps) {
  return (
    <Card grouped={false}>
      <View className="gap-8">
        <View className="flex-row items-center gap-12">
          <View className="flex-1 flex-row">
            <Chip label={topicName} />
          </View>
          <Chip
            label={removeText}
            accessibilityLabel={removeLabel}
            feedback="tap"
            onPress={() => onRemove(kind, questionId, answererName)}
          />
        </View>
        <Text className="type-body-bold text-foreground">
          {lead ? <Text className="text-accent-deep">{lead}</Text> : null}
          {lead && text ? ' ' : ''}
          {text}
        </Text>
        {answerLine ? <Text className="type-body text-muted">{answerLine}</Text> : null}
        {strengthLabel ? (
          <View className="flex-row">
            <Chip label={strengthLabel} accent={isStrongMatch} />
          </View>
        ) : null}
      </View>
    </Card>
  );
});
