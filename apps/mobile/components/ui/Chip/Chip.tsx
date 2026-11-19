import { Text } from 'react-native';

import type { CategoryId } from '@getfreak/core';
import { FeedbackPressable } from '../FeedbackPressable';
import type { ChipProps } from './types';

type ChipTone = CategoryId | 'neutral' | 'accent';
type ChipLook = 'filled' | 'outlined';

const shapeClasses = 'self-start rounded-pill border-2 px-12';
const staticPadding = 'py-4';
const pressablePadding = 'py-12';
const labelShapeClasses = 'type-caption uppercase';

const containerClasses: Record<ChipTone, Record<ChipLook, string>> = {
  neutral: {
    filled: `${shapeClasses} border-foreground bg-surface`,
    outlined: `${shapeClasses} border-border bg-surface`,
  },
  accent: {
    filled: `${shapeClasses} border-accent bg-accent`,
    outlined: `${shapeClasses} border-dashed border-border bg-transparent`,
  },
  c1: {
    filled: `${shapeClasses} border-category-c1 bg-category-c1`,
    outlined: `${shapeClasses} border-dashed border-border bg-transparent`,
  },
  c2: {
    filled: `${shapeClasses} border-category-c2 bg-category-c2`,
    outlined: `${shapeClasses} border-dashed border-border bg-transparent`,
  },
  c3: {
    filled: `${shapeClasses} border-category-c3 bg-category-c3`,
    outlined: `${shapeClasses} border-dashed border-border bg-transparent`,
  },
  c4: {
    filled: `${shapeClasses} border-category-c4 bg-category-c4`,
    outlined: `${shapeClasses} border-dashed border-border bg-transparent`,
  },
};

const labelClasses: Record<ChipTone, Record<ChipLook, string>> = {
  neutral: {
    filled: `${labelShapeClasses} text-foreground`,
    outlined: `${labelShapeClasses} text-foreground`,
  },
  accent: {
    filled: `${labelShapeClasses} text-on-accent-small`,
    outlined: `${labelShapeClasses} text-muted`,
  },
  c1: {
    filled: `${labelShapeClasses} text-on-category-c1`,
    outlined: `${labelShapeClasses} text-muted`,
  },
  c2: {
    filled: `${labelShapeClasses} text-on-category-c2`,
    outlined: `${labelShapeClasses} text-muted`,
  },
  c3: {
    filled: `${labelShapeClasses} text-on-category-c3`,
    outlined: `${labelShapeClasses} text-muted`,
  },
  c4: {
    filled: `${labelShapeClasses} text-on-category-c4`,
    outlined: `${labelShapeClasses} text-muted`,
  },
};

// A neutral chip is only picked out, with a foreground border, when it is selected. A category chip
// is filled unless it has been switched off.
function lookOf(tone: ChipTone, selected: boolean | undefined): ChipLook {
  if (tone === 'neutral') return selected ? 'filled' : 'outlined';
  return selected === false ? 'outlined' : 'filled';
}

export function Chip({
  label,
  category,
  accent = false,
  onPress,
  accessibilityLabel,
  feedback = 'select',
  selected,
}: ChipProps) {
  const tone: ChipTone = accent ? 'accent' : (category ?? 'neutral');
  const look = lookOf(tone, selected);

  if (!onPress) {
    return (
      <Text
        className={`${containerClasses[tone][look]} ${staticPadding} ${labelClasses[tone][look]}`}
      >
        {label}
      </Text>
    );
  }

  return (
    <FeedbackPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      feedback={feedback}
      onPress={onPress}
      className={`${containerClasses[tone][look]} ${pressablePadding}`}
    >
      <Text className={labelClasses[tone][look]}>{label}</Text>
    </FeedbackPressable>
  );
}
