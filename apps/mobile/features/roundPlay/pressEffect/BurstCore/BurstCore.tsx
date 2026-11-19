import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { burstMotion, easings } from '../motion';
import { ParticleShape } from '../ParticleShape';
import type { BurstCoreProps } from './types';

const { core } = burstMotion;

/** The large star at the heart of the Done burst. It pops up, turns a little and shrinks away. */
export function BurstCore({ fillClass }: BurstCoreProps) {
  const spin = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    spin.set(withTiming(core.spinDegrees, { duration: core.spinDuration, easing: easings.linear }));
    scale.set(
      withSequence(
        withTiming(core.peakScale, { duration: core.growDuration, easing: core.growEasing }),
        withTiming(0, { duration: core.shrinkDuration, easing: easings.in }),
      ),
    );
  }, [scale, spin]);

  // Animated style only. The colour and size are token classes on the shape.
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get()}deg` }, { scale: scale.get() }],
  }));

  return (
    <Animated.View
      testID="burst-core"
      className="absolute h-0 w-0 items-center justify-center"
      style={animatedStyle}
    >
      <ParticleShape shape="core" fillClass={fillClass} />
    </Animated.View>
  );
}
