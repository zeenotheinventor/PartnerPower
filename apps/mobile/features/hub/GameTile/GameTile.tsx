import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

import { Card, Chip } from '../../../components/ui';
import type { GameTileProps } from './types';

// A coming soon tile is named by its title and the marker, so a screen reader says it cannot be
// opened yet. Disabling the card leaves the tile in the reading order and exposes the state.
export function GameTile({ title, description, status, decoration, onPress }: GameTileProps) {
  const isComingSoon = status === 'comingSoon';
  const label = isComingSoon ? `${title}, ${copy.hub.comingSoon}` : title;

  return (
    <Card label={label} onPress={onPress} disabled={isComingSoon}>
      <View className="flex-row items-center gap-12">
        {decoration}
        <View className="flex-1 gap-4">
          <Text className="type-heading text-foreground">{title}</Text>
          <Text className="type-body text-muted">{description}</Text>
          {isComingSoon ? <Chip label={copy.hub.comingSoon} /> : null}
        </View>
      </View>
    </Card>
  );
}
