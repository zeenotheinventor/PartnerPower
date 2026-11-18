import { useRef } from 'react';
import { Pressable, Text, TextInput } from 'react-native';

import type { TextFieldProps } from './types';

// Pressing anywhere in the box focuses the input. The box is not an accessibility element, so the
// input stays the one thing a screen reader finds. The input carries the label as its accessible
// name. The small label above the value is for sighted players, so it is hidden from a screen
// reader to avoid reading it twice.
export function TextField({ label, value, onChangeText, placeholder, maxLength }: TextFieldProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      accessible={false}
      onPress={() => inputRef.current?.focus()}
      className="rounded-lg border-2 border-border bg-surface px-12 py-4"
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
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        maxLength={maxLength}
        className="type-heading p-0 text-foreground placeholder:text-muted"
      />
    </Pressable>
  );
}
