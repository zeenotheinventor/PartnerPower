import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { TextFieldProps } from './types';

const boxClasses = {
  resting: 'rounded-lg border-2 border-border bg-surface px-12 py-4',
  focused: 'rounded-lg border-2 border-foreground bg-surface px-12 py-4',
  alerting: 'rounded-lg border-2 border-accent bg-surface px-12 py-4',
};

const inputClasses = 'type-heading p-0 text-foreground placeholder:text-muted';
const multilineInputClasses =
  'type-heading min-h-[78px] p-0 text-foreground placeholder:text-muted';

// Pressing anywhere in the box focuses the input. The box is not an accessibility element, so the
// input stays the one thing a screen reader finds. The input carries the label as its accessible
// name. The small label above the value is for sighted players, so it is hidden from a screen
// reader to avoid reading it twice. The error and the count under the box are hidden for the same
// reason: the error and the count in words are the input's hint, so they are read with the field.
// An error or a count over the maximum takes the accent border, which wins over the focus border.
export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline = false,
  count,
  maxCount,
  countHint,
  error,
}: TextFieldProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const hasCount = count !== undefined && maxCount !== undefined;
  const isOverMaximum = hasCount && count > maxCount;
  const outline = error || isOverMaximum ? 'alerting' : isFocused ? 'focused' : 'resting';
  const hint = [error, countHint].filter(Boolean).join(' ');

  return (
    <View className="gap-4">
      <Pressable
        accessible={false}
        onPress={() => inputRef.current?.focus()}
        className={boxClasses[outline]}
      >
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no"
          className="type-caption uppercase text-muted"
        >
          {label}
        </Text>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          accessibilityHint={hint || undefined}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
          className={multiline ? multilineInputClasses : inputClasses}
        />
      </Pressable>
      {error || hasCount ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="flex-row items-start justify-between gap-12"
        >
          {error ? (
            <View className="flex-1 flex-row items-start gap-8">
              <View className="mt-[1px] h-16 w-16 items-center justify-center rounded-pill bg-accent">
                <Text className="type-caption text-on-accent-small">!</Text>
              </View>
              <Text className="type-label flex-1 text-foreground">{error}</Text>
            </View>
          ) : null}
          {hasCount ? (
            <Text
              className={
                isOverMaximum
                  ? 'type-caption ml-auto text-foreground'
                  : 'type-caption ml-auto text-muted'
              }
            >
              {count}/{maxCount}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
