import { Pressable, View } from 'react-native';

import type { FavouriteToggleProps } from './types';

const switchClasses = {
  on: 'h-48 w-48 items-center justify-center rounded-lg border-2 border-accent bg-accent',
  off: 'h-48 w-48 items-center justify-center rounded-lg border-2 border-border bg-surface',
};

const squareClasses = {
  on: 'mt-4 h-12 w-12 -rotate-45 bg-on-accent',
  off: 'mt-4 h-12 w-12 -rotate-45 bg-muted',
};

const leftHalfClasses = {
  on: 'absolute -top-[6px] left-0 h-12 w-12 rounded-pill bg-on-accent',
  off: 'absolute -top-[6px] left-0 h-12 w-12 rounded-pill bg-muted',
};

const rightHalfClasses = {
  on: 'absolute left-[6px] top-0 h-12 w-12 rounded-pill bg-on-accent',
  off: 'absolute left-[6px] top-0 h-12 w-12 rounded-pill bg-muted',
};

// The fill changes as well as the colour, so the state does not rest on colour alone. The heart is
// a turned square with a round half on two of its sides. The press flips the state at once, so
// there is no pressed look, as with the kit Toggle.
export function FavouriteToggle({ label, value, onValueChange, context }: FavouriteToggleProps) {
  const state = value ? 'on' : 'off';

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={context}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      className={switchClasses[state]}
    >
      <View className={squareClasses[state]}>
        <View className={leftHalfClasses[state]} />
        <View className={rightHalfClasses[state]} />
      </View>
    </Pressable>
  );
}
