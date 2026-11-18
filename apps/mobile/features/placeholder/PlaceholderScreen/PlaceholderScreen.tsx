import { copy } from '@getfreak/content';
import { Text, View } from 'react-native';

type DevKitLinkModule = typeof import('../../dev/DevKitLink');

const swatchClasses = [
  'h-48 w-48 rounded-lg bg-category-c1',
  'h-48 w-48 rounded-lg bg-category-c2',
  'h-48 w-48 rounded-lg bg-category-c3',
  'h-48 w-48 rounded-lg bg-category-c4',
];

// The link is required inside the development branch, so Metro drops it from a production bundle.
function renderDevLink() {
  if (__DEV__) {
    /* eslint-disable-next-line @typescript-eslint/no-require-imports */
    const { DevKitLink }: DevKitLinkModule = require('../../dev/DevKitLink');
    return (
      <View className="mt-24">
        <DevKitLink />
      </View>
    );
  }

  return null;
}

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
      {renderDevLink()}
    </View>
  );
}
