import { Text, View } from 'react-native';

import { Card } from '../../../components/ui';
import type { SetupRowProps } from './types';

// A row of setup that opens another screen: a caption, the value that is chosen, and a chevron.
export function SetupRow({ caption, value, name, onPress }: SetupRowProps) {
  return (
    <Card label={name} onPress={onPress}>
      <View className="flex-row items-center gap-12">
        <View className="flex-1">
          <Text className="type-caption uppercase text-muted">{caption}</Text>
          <Text className="type-heading text-foreground">{value ?? ' '}</Text>
        </View>
        <View className="mr-4 h-12 w-12 rotate-45 border-r-4 border-t-4 border-muted" />
      </View>
    </Card>
  );
}
