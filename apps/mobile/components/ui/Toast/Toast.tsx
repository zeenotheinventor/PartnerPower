import { cssInterop } from 'nativewind';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ToastProps } from './types';

// The safe area view needs the interop so that it accepts a class name.
const ThemedSafeAreaView = cssInterop(SafeAreaView, { className: 'style' });

const fadeMilliseconds = 200;
const showMilliseconds = 3000;

// A short line at the bottom of the screen. It fades in, stays about 3 seconds and fades out, or is
// tapped away. With reduce motion on it simply appears and disappears. Only the toast itself takes
// touches, so the screen behind it stays usable.
export function Toast({ message, dismissHint, onDismiss }: ToastProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState<boolean | undefined>(undefined);
  const animation = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const hasDismissed = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(setReduceMotion);
  }, []);

  // Android reads the live region. iOS has no live regions, so it is announced.
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  // The toast is dismissed once, whether the time ran out or it was tapped.
  const dismiss = useCallback(() => {
    if (hasDismissed.current) return;
    hasDismissed.current = true;
    animation.current?.stop();
    if (reduceMotion) {
      opacity.setValue(0);
      onDismiss();
      return;
    }
    animation.current = Animated.timing(opacity, {
      toValue: 0,
      duration: fadeMilliseconds,
      useNativeDriver: true,
    });
    animation.current.start(onDismiss);
  }, [onDismiss, opacity, reduceMotion]);

  useEffect(() => {
    if (reduceMotion === undefined) return;
    if (reduceMotion) {
      opacity.setValue(1);
      const timer = setTimeout(dismiss, showMilliseconds);
      return () => clearTimeout(timer);
    }
    animation.current = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: fadeMilliseconds, useNativeDriver: true }),
      Animated.delay(showMilliseconds),
    ]);
    animation.current.start(({ finished }) => {
      if (finished) dismiss();
    });
    return () => animation.current?.stop();
  }, [reduceMotion, opacity, dismiss]);

  return (
    <ThemedSafeAreaView pointerEvents="box-none" className="absolute inset-0">
      <View pointerEvents="box-none" className="flex-1 justify-end p-16">
        {/* The fade is an animated value, which a class cannot express, so it is the one style. */}
        <Animated.View style={{ opacity }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={message}
            accessibilityHint={dismissHint}
            accessibilityLiveRegion="polite"
            onPress={dismiss}
            className="rounded-xl border-2 border-border bg-surface px-16 py-12"
          >
            <Text className="type-body text-foreground">{message}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </ThemedSafeAreaView>
  );
}
