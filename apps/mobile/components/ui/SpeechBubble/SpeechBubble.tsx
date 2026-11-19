import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { SpeechBubbleProps, SpeechBubbleTail } from './types';

// The bubble hugs its text and sits on the side its tail points to.
const sideClasses: Record<SpeechBubbleTail, string> = {
  left: 'self-start',
  center: 'self-center',
  right: 'self-end',
};

const bubbleClasses = 'rounded-lg border-2 border-border bg-surface px-12 py-12';

// The tail is a square turned 45 degrees, with its two outer edges bordered. Half of it sits over
// the bubble's own border, so the two read as one shape.
const tailClasses: Record<SpeechBubbleTail, string> = {
  left: 'absolute bottom-[-9px] left-24 h-[14px] w-[14px] rotate-45 border-b-2 border-r-2 border-border bg-surface',
  center:
    'absolute bottom-[-9px] left-[50%] ml-[-7px] h-[14px] w-[14px] rotate-45 border-b-2 border-r-2 border-border bg-surface',
  right:
    'absolute bottom-[-9px] right-24 h-[14px] w-[14px] rotate-45 border-b-2 border-r-2 border-border bg-surface',
};

/**
 * A speech bubble for a character. It holds no copy, the text comes from the caller. The text is
 * read by screen readers like any other text, and the tail is decoration.
 */
export function SpeechBubble({ text, tail = 'left', popIn = false }: SpeechBubbleProps) {
  const reduceMotion = useReducedMotion();
  const animate = popIn && !reduceMotion;
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    progress.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.back(1.8)) });
  }, [animate, progress]);

  // Reanimated writes this style from the UI thread, so it comes through the style prop.
  const popStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [{ scale: 0.85 + 0.15 * progress.value }],
  }));

  return (
    // The outer view shrinks to the bubble, so the pop scales about the bubble's own centre.
    <View className={sideClasses[tail]}>
      <Animated.View style={popStyle}>
        <View className={bubbleClasses}>
          <Text className="type-body-bold text-foreground">{text}</Text>
          <View className={tailClasses[tail]} />
        </View>
      </Animated.View>
    </View>
  );
}
