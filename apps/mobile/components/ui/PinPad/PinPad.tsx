import { copy, fillCopy } from '@getfreak/content';
import { pinLength } from '@getfreak/core';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Text, View } from 'react-native';

import { FeedbackPressable } from '../FeedbackPressable';
import type { PinPadProps } from './types';

const keyRows = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

const dotClasses = {
  empty: 'h-20 w-20 rounded-pill border-2 border-muted',
  filled: 'h-20 w-20 rounded-pill border-2 border-accent bg-accent',
  error: 'h-20 w-20 rounded-pill border-2 border-danger',
};

// The dots move left and right and settle: 0, -4, 4, -4, 4, 0 over 240 ms.
const shakeSteps = [-4, 4, -4, 4, 0];
const shakeStepMilliseconds = 48;

// The keys are built the way a secondary button is, with a face that is pushed in onto an edge when
// pressed, but with the label and padding the design gives a key.
function DigitKey({
  digit,
  disabled,
  onPress,
}: {
  digit: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <FeedbackPressable
      accessibilityRole="button"
      accessibilityLabel={digit}
      disabled={disabled}
      onPress={onPress}
      className={`group flex-1 ${disabled ? 'opacity-50' : ''}`}
    >
      <View className="pointer-events-none absolute inset-x-0 bottom-0 top-4 rounded-lg bg-border" />
      <Text className="type-title mb-4 rounded-lg border-2 border-border bg-surface py-12 text-center text-foreground group-active:translate-y-4">
        {digit}
      </Text>
    </FeedbackPressable>
  );
}

/**
 * Four dots and a keypad of the ten digits and Delete. It has no text field, so the phone's
 * keyboard never sees the PIN, and the digits are only in the `value` the screen holds. The dots
 * say only how many are typed, as a count, and the digits are in no name or text.
 */
export function PinPad({
  value,
  onChange,
  onComplete,
  error,
  message,
  disabled = false,
}: PinPadProps) {
  const [shakeOffset] = useState(() => new Animated.Value(0));

  // An error is announced and shakes the dots, unless the player asked for less motion.
  useEffect(() => {
    if (!error) return;
    AccessibilityInfo.announceForAccessibility(error);
    let isCurrent = true;
    let shake: Animated.CompositeAnimation | undefined;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((isReduced) => {
        if (!isCurrent || isReduced) return;
        shake = Animated.sequence(
          shakeSteps.map((toValue) =>
            Animated.timing(shakeOffset, {
              toValue,
              duration: shakeStepMilliseconds,
              useNativeDriver: true,
            }),
          ),
        );
        shake.start();
      });
    return () => {
      isCurrent = false;
      shake?.stop();
      shakeOffset.setValue(0);
    };
  }, [error, shakeOffset]);

  const type = (digit: string) => {
    if (value.length >= pinLength) return;
    const next = `${value}${digit}`;
    onChange(next);
    if (next.length === pinLength) onComplete(next);
  };

  const dotState = (index: number) => (error ? 'error' : index < value.length ? 'filled' : 'empty');

  return (
    <View className="w-full items-center gap-12">
      {/* The shake is an animated value, which a class cannot express, so it is the one style. */}
      <Animated.View style={{ transform: [{ translateX: shakeOffset }] }}>
        <View
          accessible
          accessibilityRole="text"
          accessibilityLabel={fillCopy(copy.pin.dots, { count: value.length, length: pinLength })}
          accessibilityLiveRegion="polite"
          className="flex-row gap-16 py-8"
        >
          {Array.from({ length: pinLength }, (_, index) => (
            <View key={index} className={dotClasses[dotState(index)]} />
          ))}
        </View>
      </Animated.View>
      <View className="min-h-[44px] max-w-[300px] justify-center">
        {error ? (
          <Text className="type-body-bold text-center text-danger">{error}</Text>
        ) : message ? (
          <Text className="type-body-bold text-center text-muted">{message}</Text>
        ) : null}
      </View>
      <View className="w-full gap-12">
        {keyRows.map((row) => (
          <View key={row.join('')} className="flex-row gap-16">
            {row.map((digit) => (
              <DigitKey key={digit} digit={digit} disabled={disabled} onPress={() => type(digit)} />
            ))}
          </View>
        ))}
        <View className="flex-row gap-16">
          <View className="flex-1" />
          <DigitKey digit="0" disabled={disabled} onPress={() => type('0')} />
          <FeedbackPressable
            accessibilityRole="button"
            accessibilityLabel={copy.pin.delete}
            disabled={disabled || value.length === 0}
            onPress={() => onChange(value.slice(0, -1))}
            className={`min-h-[58px] flex-1 items-center justify-center ${
              disabled || value.length === 0 ? 'opacity-50' : ''
            }`}
          >
            <Text className="type-label uppercase text-foreground">{copy.pin.delete}</Text>
          </FeedbackPressable>
        </View>
      </View>
    </View>
  );
}
