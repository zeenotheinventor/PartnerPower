import { View } from 'react-native';

import type { ProgressBarProps } from './types';

// Every width the bar can take is written out, because Tailwind only sees whole class names. A
// round of 10 reaches every second step and a round of 20 reaches every step.
const fillWidthClasses = [
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-[50%]',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-[100%]',
];

function fillWidthClass(number: number, length: number) {
  const step = Math.ceil((number / length) * fillWidthClasses.length);
  const clamped = Math.min(Math.max(step, 1), fillWidthClasses.length);
  return fillWidthClasses[clamped - 1];
}

export function ProgressBar({ number, length, label }: ProgressBarProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: length, now: number }}
      className="h-16 overflow-hidden rounded-pill border-2 border-border bg-surface"
    >
      <View className={`h-full rounded-pill bg-category-c2 ${fillWidthClass(number, length)}`} />
    </View>
  );
}
