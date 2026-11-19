import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { easings, splashMotion } from '../motion';

const { ring } = splashMotion;

/** The flat ring that splashes out along the top edge of the Pass button. */
export function SplashRing() {
  const scaleX = useSharedValue<number>(ring.startScale);
  const scaleY = useSharedValue<number>(ring.startScale);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scaleX.set(withTiming(ring.endScaleX, { duration: ring.duration, easing: easings.out }));
    scaleY.set(withTiming(ring.endScaleY, { duration: ring.duration, easing: easings.out }));
    opacity.set(
      withSequence(
        withTiming(1, { duration: ring.opacityHoldDuration, easing: easings.linear }),
        withTiming(0, { duration: ring.fadeDuration, easing: easings.linear }),
      ),
    );
  }, [opacity, scaleX, scaleY]);

  // Animated style only. The colour, size and shape are token classes.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ scaleX: scaleX.get() }, { scaleY: scaleY.get() }],
  }));

  return (
    <Animated.View
      testID="splash-ring"
      className="h-16 w-48 rounded-pill border-4 border-muted"
      style={animatedStyle}
    />
  );
}
