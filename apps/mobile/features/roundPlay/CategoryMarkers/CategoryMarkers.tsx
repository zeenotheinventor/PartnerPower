import { categoryIds } from '@getfreak/core';
import { View } from 'react-native';

import { categoryFillClasses } from '../categoryClasses';
import type { CategoryMarkersProps } from './types';

// The markers show how far up the categories the round has climbed. They repeat what the category
// name says, so a screen reader skips them.
export function CategoryMarkers({ category }: CategoryMarkersProps) {
  const reachedCount = categoryIds.indexOf(category) + 1;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="flex-row gap-8"
    >
      {categoryIds.map((id, index) => (
        <View
          key={id}
          className={`h-8 w-32 rounded-pill ${index < reachedCount ? categoryFillClasses[id] : 'bg-border'}`}
        />
      ))}
    </View>
  );
}
