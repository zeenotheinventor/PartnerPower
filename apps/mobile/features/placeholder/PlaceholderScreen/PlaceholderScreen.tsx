import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

const swatchClasses = [
  'h-48 w-48 rounded-lg bg-category-c1',
  'h-48 w-48 rounded-lg bg-category-c2',
  'h-48 w-48 rounded-lg bg-category-c3',
  'h-48 w-48 rounded-lg bg-category-c4',
];

export function PlaceholderScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background p-24">
      <Text accessibilityRole="header" className="type-display text-foreground">
        {copy.appName}
      </Text>
      <Text className="type-body mt-8 text-muted">{copy.placeholder.status}</Text>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="mt-24 flex-row gap-12"
      >
        {swatchClasses.map((swatchClass) => (
          <View key={swatchClass} className={swatchClass} />
        ))}
      </View>
    </View>
  );
}
