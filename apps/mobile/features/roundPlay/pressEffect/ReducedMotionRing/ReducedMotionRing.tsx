import { useEffect } from 'react';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { categoryRingClasses } from '../../categoryClasses';
import { easings, reducedMotionRing } from '../motion';
import type { ReducedMotionRingProps } from './types';

const doneClass = 'absolute left-0 top-0 rounded-xl border-8';
const passClass = 'absolute left-0 top-0 rounded-xl border-8 border-muted';

/**
 * What replaces the particles when the system asks for reduced motion. A ring around the pressed
 * button that only fades in and out, in the card's colour for Done and muted for Pass. Nothing
 * moves.
 */
export function ReducedMotionRing({ kind, category, bounds }: ReducedMotionRingProps) {
  const { peakOpacity, riseDuration, fallDuration } = reducedMotionRing[kind];
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Reanimated jumps an animation to its end when the system setting is on, which would hide the
    // fade. This fade is the reduced motion version, so it opts out of that.
    opacity.set(
      withSequence(
        withTiming(peakOpacity, {
          duration: riseDuration,
          easing: easings.out,
          reduceMotion: ReduceMotion.Never,
        }),
        withTiming(0, {
          duration: fallDuration,
          easing: easings.in,
          reduceMotion: ReduceMotion.Never,
        }),
      ),
    );
  }, [fallDuration, opacity, peakOpacity, riseDuration]);

  const { margin } = reducedMotionRing;
  // Animated style only. It carries the opacity and the measured position and size of the button,
  // which no class can name. The colour, border and radius are token classes.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    width: bounds.width + margin * 2,
    height: bounds.height + margin * 2,
    transform: [{ translateX: bounds.x - margin }, { translateY: bounds.y - margin }],
  }));

  return (
    <Animated.View
      testID="reduced-motion-ring"
      className={kind === 'done' ? `${doneClass} ${categoryRingClasses[category]}` : passClass}
      style={animatedStyle}
    />
  );
}
