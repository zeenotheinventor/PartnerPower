import { Pressable, View } from 'react-native';

import type { CategoryId } from '../CategoryId';
import type { CardProps } from './types';

type CardTone = CategoryId | 'plain';

// A static card is an outer view that is the depth edge, with the face inside it. Both carry the
// same colour so the border and the edge read as one shape.
const staticEdgeClasses: Record<CardTone, string> = {
  plain: 'rounded-xl bg-border pb-4',
  c1: 'rounded-xl bg-category-c1 pb-4',
  c2: 'rounded-xl bg-category-c2 pb-4',
  c3: 'rounded-xl bg-category-c3 pb-4',
  c4: 'rounded-xl bg-category-c4 pb-4',
};

const staticFaceClasses: Record<CardTone, string> = {
  plain: 'rounded-xl border-2 border-border bg-surface p-16',
  c1: 'rounded-xl border-2 border-category-c1 bg-surface p-16',
  c2: 'rounded-xl border-2 border-category-c2 bg-surface p-16',
  c3: 'rounded-xl border-2 border-category-c3 bg-surface p-16',
  c4: 'rounded-xl border-2 border-category-c4 bg-surface p-16',
};

// A pressable card builds its edge the way a button does. The edge is a decorative view that starts
// 4px down, and pressing moves the face onto it, so nothing shows above the face.
const pressableEdgeClasses: Record<CardTone, string> = {
  plain: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-border',
  c1: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-category-c1',
  c2: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-category-c2',
  c3: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-category-c3',
  c4: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-category-c4',
};

const pressableFaceClasses: Record<CardTone, string> = {
  plain: 'mb-4 rounded-xl border-2 border-border bg-surface p-16 group-active:translate-y-4',
  c1: 'mb-4 rounded-xl border-2 border-category-c1 bg-surface p-16 group-active:translate-y-4',
  c2: 'mb-4 rounded-xl border-2 border-category-c2 bg-surface p-16 group-active:translate-y-4',
  c3: 'mb-4 rounded-xl border-2 border-category-c3 bg-surface p-16 group-active:translate-y-4',
  c4: 'mb-4 rounded-xl border-2 border-category-c4 bg-surface p-16 group-active:translate-y-4',
};

/**
 * Without onPress a card is for reading. A screen reader treats it as one group named by the text
 * inside, so a static card must not contain controls. With onPress it is one button named by its
 * label.
 */
export function Card({ children, category, onPress, label, disabled = false }: CardProps) {
  const tone = category ?? 'plain';

  if (!onPress) {
    return (
      <View accessible role="group" className={staticEdgeClasses[tone]}>
        <View className={staticFaceClasses[tone]}>{children}</View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`group ${disabled ? 'opacity-50' : ''}`}
    >
      <View className={pressableEdgeClasses[tone]} />
      <View className={pressableFaceClasses[tone]}>{children}</View>
    </Pressable>
  );
}
