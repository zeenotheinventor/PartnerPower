import { useEffect } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { CountdownProps } from './types';
import { useCountdownClock } from './useCountdownClock';

const secondsInMinute = 60;

// Written as m:ss, such as 0:42 or 1:00.
function formatTime(seconds: number) {
  const wholeSeconds = String(seconds % secondsInMinute).padStart(2, '0');
  return `${Math.floor(seconds / secondsInMinute)}:${wholeSeconds}`;
}

/**
 * The time left on a countdown, as digits and a bar that empties from the right. It runs on the
 * real time since `startedAt`, so the background and a locked screen do not pause it. Before it
 * starts (`startedAt` is null) it shows the full time. At zero the border turns to the accent.
 * It is one element for a screen reader, a timer named by `label` whose value is the time left,
 * and the value changes silently. The haptic at zero is the caller's, from `onEnd`.
 */
export function Countdown({
  seconds,
  startedAt,
  label,
  secondsText,
  endText,
  onEnd,
}: CountdownProps) {
  const reduceMotion = useReducedMotion();
  const { secondsLeft, resumeCount } = useCountdownClock({
    seconds,
    startedAt,
    secondsText,
    endText,
    onEnd,
  });
  const isEnded = startedAt !== null && secondsLeft === 0;

  // The bar is a fill as wide as the track that slides left as the time goes, so its rounded end
  // stays round. `remaining` is the fraction of the time left.
  const remaining = useSharedValue(1);
  const trackWidth = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (remaining.get() - 1) * trackWidth.get() }],
  }));
  const measureTrack = (event: LayoutChangeEvent) => trackWidth.set(event.nativeEvent.layout.width);

  // Drains over the real time left, and starts again from the real time when the app comes back.
  useEffect(() => {
    if (startedAt === null) {
      remaining.set(1);
      return;
    }
    const totalMilliseconds = seconds * 1000;
    const remainingMilliseconds = Math.max(0, startedAt + totalMilliseconds - Date.now());
    if (reduceMotion || remainingMilliseconds === 0) return;
    remaining.set(remainingMilliseconds / totalMilliseconds);
    remaining.set(withTiming(0, { duration: remainingMilliseconds, easing: Easing.linear }));
    return () => cancelAnimation(remaining);
  }, [seconds, startedAt, reduceMotion, resumeCount, remaining]);

  // With reduce motion on there is no timing, so the bar steps once a second. It also settles at
  // empty when the time was already up.
  useEffect(() => {
    if (startedAt === null) return;
    if (reduceMotion || secondsLeft === 0) remaining.set(secondsLeft / seconds);
  }, [seconds, startedAt, reduceMotion, secondsLeft, remaining]);

  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={label}
      accessibilityValue={{ text: secondsText(secondsLeft) }}
      className={`min-h-48 flex-row items-center gap-12 rounded-lg border-2 bg-surface px-12 py-8 ${
        isEnded ? 'border-accent' : 'border-border'
      }`}
    >
      <Text className="type-title w-64 text-foreground tabular-nums">
        {formatTime(secondsLeft)}
      </Text>
      <View className="h-16 flex-1 overflow-hidden rounded-pill border-2 border-border bg-background">
        {/* The slide is an animated value, which a class cannot express, so it is the one style. */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, fillStyle]}
          onLayout={measureTrack}
        >
          <View className="h-full w-full rounded-pill bg-accent" />
        </Animated.View>
      </View>
    </View>
  );
}
