import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { burstMotion, easings } from '../motion';
import { ParticleShape } from '../ParticleShape';
import type { BurstParticleProps } from './types';

const holdDuration =
  burstMotion.travelDuration - burstMotion.growDuration - burstMotion.shrinkDuration;

/** One star, diamond or dot of the Done burst. It flies out, spins, shrinks and fades. */
export function BurstParticle({ particle, fillClass }: BurstParticleProps) {
  const { shape, offsetX, offsetY, peakScale, delay, spinDegrees } = particle;
  const travel = useSharedValue(0);
  const spin = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    travel.set(
      withDelay(
        delay,
        withTiming(1, {
          duration: burstMotion.travelDuration,
          easing: burstMotion.travelEasing,
        }),
      ),
    );
    spin.set(
      withDelay(
        delay,
        withTiming(spinDegrees, { duration: burstMotion.travelDuration, easing: easings.linear }),
      ),
    );
    scale.set(
      withDelay(
        delay,
        withSequence(
          withTiming(peakScale, { duration: burstMotion.growDuration, easing: easings.out }),
          withTiming(peakScale, { duration: holdDuration, easing: easings.linear }),
          withTiming(peakScale * burstMotion.shrinkTo, {
            duration: burstMotion.shrinkDuration,
            easing: easings.in,
          }),
        ),
      ),
    );
    opacity.set(
      withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: burstMotion.opacityHoldDuration, easing: easings.linear }),
          withTiming(0, { duration: burstMotion.fadeDuration, easing: easings.in }),
        ),
      ),
    );
  }, [delay, opacity, peakScale, scale, spin, spinDegrees, travel]);

  // The animated style is the one place a style prop is allowed. It carries only values that change
  // every frame. The colour and size are token classes on the shape.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { translateX: travel.get() * offsetX },
      { translateY: travel.get() * offsetY },
      { rotate: `${spin.get()}deg` },
      { scale: scale.get() },
    ],
  }));

  return (
    <Animated.View
      testID="burst-particle"
      className="absolute h-0 w-0 items-center justify-center"
      style={animatedStyle}
    >
      <ParticleShape shape={shape} fillClass={fillClass} />
    </Animated.View>
  );
}
