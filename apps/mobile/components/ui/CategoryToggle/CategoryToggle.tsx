import { Text, View } from 'react-native';

import type { CategoryId } from '@getfreak/core';
import { FeedbackPressable } from '../FeedbackPressable';
import type { CategoryToggleProps } from './types';

const rowShape = 'min-h-48 flex-row items-center justify-between gap-8 rounded-lg border-2 px-12';
const trackShape = 'h-24 w-40 flex-row rounded-pill p-4';
const knobShape = 'h-16 w-16 rounded-pill';

// A switched-on row is filled with its category colour. The border is the same colour, so the row
// keeps its size when it is switched off and drawn dashed. A locked row is switched on, with a
// foreground border to pick it out. The track and knob use the label colour and the fill colour
// of the category, so they read in both themes.
const onRowClasses: Record<CategoryId, string> = {
  c1: `${rowShape} border-category-c1 bg-category-c1`,
  c2: `${rowShape} border-category-c2 bg-category-c2`,
  c3: `${rowShape} border-category-c3 bg-category-c3`,
  c4: `${rowShape} border-category-c4 bg-category-c4`,
};

const lockedRowClasses: Record<CategoryId, string> = {
  c1: `${rowShape} border-foreground bg-category-c1`,
  c2: `${rowShape} border-foreground bg-category-c2`,
  c3: `${rowShape} border-foreground bg-category-c3`,
  c4: `${rowShape} border-foreground bg-category-c4`,
};

const offRowClasses = `${rowShape} border-dashed border-border bg-transparent`;

const onLabelClasses: Record<CategoryId, string> = {
  c1: 'type-body-bold flex-1 text-on-category-c1',
  c2: 'type-body-bold flex-1 text-on-category-c2',
  c3: 'type-body-bold flex-1 text-on-category-c3',
  c4: 'type-body-bold flex-1 text-on-category-c4',
};

const offLabelClasses = 'type-body-bold flex-1 text-muted';

const onTrackClasses: Record<CategoryId, string> = {
  c1: `${trackShape} justify-end bg-on-category-c1`,
  c2: `${trackShape} justify-end bg-on-category-c2`,
  c3: `${trackShape} justify-end bg-on-category-c3`,
  c4: `${trackShape} justify-end bg-on-category-c4`,
};

const offTrackClasses = `${trackShape} justify-start bg-border`;

const onKnobClasses: Record<CategoryId, string> = {
  c1: `${knobShape} bg-category-c1`,
  c2: `${knobShape} bg-category-c2`,
  c3: `${knobShape} bg-category-c3`,
  c4: `${knobShape} bg-category-c4`,
};

const offKnobClasses = `${knobShape} bg-muted`;

// The whole row is the switch and its visible label is its accessible name. The track and knob
// only draw the state.
export function CategoryToggle({
  label,
  category,
  value,
  onValueChange,
  locked = false,
  lockedHint,
}: CategoryToggleProps) {
  const onRowClass = locked ? lockedRowClasses[category] : onRowClasses[category];

  return (
    <FeedbackPressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityHint={locked ? lockedHint : undefined}
      disabled={locked}
      feedback={value ? 'toggleOff' : 'toggleOn'}
      onPress={() => onValueChange(!value)}
      className={value ? onRowClass : offRowClasses}
    >
      <Text className={value ? onLabelClasses[category] : offLabelClasses}>{label}</Text>
      <View className={value ? onTrackClasses[category] : offTrackClasses}>
        <View className={value ? onKnobClasses[category] : offKnobClasses} />
      </View>
    </FeedbackPressable>
  );
}
