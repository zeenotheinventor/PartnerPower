import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import type { EffectOriginProps } from './types';

/**
 * A point with no size at the given spot in the layer. Particles are centred on it and move away
 * from it. The spot is a measured pixel value that no class can name, so it is given through the
 * animated style, the one place a style prop is allowed.
 */
export function EffectOrigin({ x, y, children }: EffectOriginProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x }, { translateY: y }],
  }));

  return (
    <Animated.View
      className="absolute left-0 top-0 h-0 w-0 items-center justify-center"
      style={animatedStyle}
    >
      {children}
    </Animated.View>
  );
}
