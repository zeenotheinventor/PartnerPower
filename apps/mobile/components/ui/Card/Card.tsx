import { Pressable, Text, View } from 'react-native';

import type { CategoryId } from '@getfreak/core';
import type { CardProps, ShownCardProps } from './types';

type CardTone = CategoryId | 'plain' | 'accent';

// A static card is an outer view that is the depth edge, with the face inside it. Both carry the
// same colour so the border and the edge read as one shape.
const staticEdgeClasses: Record<CardTone, string> = {
  plain: 'rounded-xl bg-border pb-4',
  accent: 'rounded-xl bg-accent-deep pb-4',
  c1: 'rounded-xl bg-category-c1 pb-4',
  c2: 'rounded-xl bg-category-c2 pb-4',
  c3: 'rounded-xl bg-category-c3 pb-4',
  c4: 'rounded-xl bg-category-c4 pb-4',
};

const staticFaceClasses: Record<CardTone, string> = {
  plain: 'rounded-xl border-2 border-border bg-surface p-16',
  accent: 'rounded-xl border-2 border-accent bg-surface p-16',
  c1: 'rounded-xl border-2 border-category-c1 bg-surface p-16',
  c2: 'rounded-xl border-2 border-category-c2 bg-surface p-16',
  c3: 'rounded-xl border-2 border-category-c3 bg-surface p-16',
  c4: 'rounded-xl border-2 border-category-c4 bg-surface p-16',
};

// A pressable card builds its edge the way a button does. The edge is a decorative view that starts
// 4px down, and pressing moves the face onto it, so nothing shows above the face.
const pressableEdgeClasses: Record<CardTone, string> = {
  plain: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-border',
  accent: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-accent-deep',
  c1: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-category-c1',
  c2: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-category-c2',
  c3: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-category-c3',
  c4: 'pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-xl bg-category-c4',
};

const pressableFaceClasses: Record<CardTone, string> = {
  plain: 'mb-4 rounded-xl border-2 border-border bg-surface p-16 group-active:translate-y-4',
  accent: 'mb-4 rounded-xl border-2 border-accent bg-surface p-16 group-active:translate-y-4',
  c1: 'mb-4 rounded-xl border-2 border-category-c1 bg-surface p-16 group-active:translate-y-4',
  c2: 'mb-4 rounded-xl border-2 border-category-c2 bg-surface p-16 group-active:translate-y-4',
  c3: 'mb-4 rounded-xl border-2 border-category-c3 bg-surface p-16 group-active:translate-y-4',
  c4: 'mb-4 rounded-xl border-2 border-category-c4 bg-surface p-16 group-active:translate-y-4',
};

// A card that can be selected lays its face out as a row, with the mark after the children. The
// selected card takes the accent tone, as the checked option of a segmented control does.
const selectableFaceClasses = 'flex-row items-center gap-12';

const markClasses = {
  off: 'h-24 w-24 rounded-pill border-2 border-border bg-surface',
  on: 'h-24 w-24 items-center justify-center rounded-pill bg-accent',
};

// The tick and the border change together with the fill, so the state does not rest on colour alone.
const tickClasses = '-mt-4 h-12 w-8 rotate-45 border-b-4 border-r-4 border-on-accent';

/**
 * Without onPress a card is for reading. A screen reader treats it as one group named by the text
 * inside, so a static card must not contain controls. Passing grouped as false leaves the card
 * without an accessibility element of its own, so its children are read separately. With onPress it is one button named by its
 * label.
 * Passing selected makes it a choice: the card gets a mark, is announced as selected or not, and
 * the selected one takes the accent tone.
 */
export function Card(props: CardProps) {
  if (props.faceDown) {
    return <FaceDownCard mark={props.mark} title={props.title} label={props.label} />;
  }
  return <ShownCard {...props} />;
}

function FaceDownCard({ mark, title, label }: { mark: string; title: string; label: string }) {
  return (
    <View
      accessible
      role="img"
      accessibilityLabel={label}
      className="rounded-xl bg-accent-deep pb-4"
    >
      <View className="rounded-xl border-2 border-accent bg-accent p-16">
        <View className="items-center gap-4 rounded-lg border-2 border-dashed border-on-accent px-16 py-32">
          <Text className="type-display text-on-accent">{mark}</Text>
          <Text className="type-heading text-on-accent">{title}</Text>
        </View>
      </View>
    </View>
  );
}

function ShownCard({
  children,
  category,
  accent = false,
  onPress,
  label,
  disabled = false,
  grouped = true,
  selected,
}: ShownCardProps) {
  const tone: CardTone = accent || selected ? 'accent' : (category ?? 'plain');

  if (!onPress) {
    return (
      <View
        accessible={grouped}
        role={grouped ? 'group' : undefined}
        className={staticEdgeClasses[tone]}
      >
        <View className={staticFaceClasses[tone]}>{children}</View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? { disabled } : { disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      className={`group ${disabled ? 'opacity-50' : ''}`}
    >
      <View className={pressableEdgeClasses[tone]} />
      <View
        className={
          selected === undefined
            ? pressableFaceClasses[tone]
            : `${pressableFaceClasses[tone]} ${selectableFaceClasses}`
        }
      >
        {selected === undefined ? (
          children
        ) : (
          <>
            <View className="flex-1">{children}</View>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className={markClasses[selected ? 'on' : 'off']}
            >
              {selected ? <View className={tickClasses} /> : null}
            </View>
          </>
        )}
      </View>
    </Pressable>
  );
}
