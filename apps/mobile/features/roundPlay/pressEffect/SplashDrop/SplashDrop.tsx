import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { easings, splashMotion } from '../motion';
import type { SplashDropProps } from './types';

// Tailwind only sees whole class names, so each size is written out in full.
const dropSizeClasses = { 8: 'h-8 w-8', 12: 'h-12 w-12', 16: 'h-16 w-16' };

const scaleDownDuration = splashMotion.duration - splashMotion.growDuration;

/**
 * One drop of the Pass splash. It leaps up and out, then falls back past the button edge. The
 * rise slows as the drop climbs and the fall speeds up, which is the gravity.
 */
export function SplashDrop({ drop }: SplashDropProps) {
  const { size, endX, peakY, landY, startTiltDegrees, endTiltDegrees, delay } = drop;
  const travelX = useSharedValue(0);
  const travelY = useSharedValue(0);
  const tilt = useSharedValue<number>(startTiltDegrees);
  const scale = useSharedValue<number>(splashMotion.startScale);
  const opacity = useSharedValue(1);

  useEffect(() => {
    travelX.set(
      withDelay(
        delay,
        withTiming(endX, { duration: splashMotion.duration, easing: splashMotion.xEasing }),
      ),
    );
    travelY.set(
      withDelay(
        delay,
        withSequence(
          withTiming(peakY, { duration: splashMotion.riseDuration, easing: easings.out }),
          withTiming(landY, { duration: splashMotion.fallDuration, easing: easings.in }),
        ),
      ),
    );
    tilt.set(
      withDelay(
        delay,
        withTiming(endTiltDegrees, { duration: splashMotion.duration, easing: easings.linear }),
      ),
    );
    scale.set(
      withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: splashMotion.growDuration, easing: easings.out }),
          withTiming(splashMotion.endScale, {
            duration: scaleDownDuration,
            easing: easings.linear,
          }),
        ),
      ),
    );
    opacity.set(
      withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: splashMotion.opacityHoldDuration, easing: easings.linear }),
          withTiming(0, { duration: splashMotion.fadeDuration, easing: easings.linear }),
        ),
      ),
    );
  }, [delay, endTiltDegrees, endX, landY, opacity, peakY, scale, tilt, travelX, travelY]);

  // The animated style is the one place a style prop is allowed. It carries only values that change
  // every frame. The colour, size and shape are token classes.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { translateX: travelX.get() },
      { translateY: travelY.get() },
      { rotate: `${tilt.get()}deg` },
      { scale: scale.get() },
    ],
  }));

  return (
    <Animated.View
      testID="splash-drop"
      className="absolute h-0 w-0 items-center justify-center"
      style={animatedStyle}
    >
      {/* Turned 45 degrees with a square corner at the top left, so the point faces up. */}
      <View
        className={`rotate-45 rounded-pill rounded-tl-none bg-muted ${dropSizeClasses[size]}`}
      />
    </Animated.View>
  );
}
