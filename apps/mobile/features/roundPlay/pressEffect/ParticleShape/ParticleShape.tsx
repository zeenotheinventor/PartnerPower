import { View } from 'react-native';

import type { ParticleShapeProps } from './types';

// Each square of a star is stretched along one axis by the outer view and turned 45 degrees by the
// inner view. The outer view must do the stretch and the inner view the turn, so the result is a
// four point star and not a tilted bar. A star is 16 dp tip to tip, and the core is 32 dp.
const starSquareClasses = { star: 'h-4 w-4', core: 'h-8 w-8' };

/** A plain View in the shape of a star, diamond or dot, centred on its own origin. */
export function ParticleShape({ shape, fillClass }: ParticleShapeProps) {
  if (shape === 'diamond') return <View className={`h-8 w-8 rotate-45 ${fillClass}`} />;
  if (shape === 'dot') return <View className={`h-8 w-8 rounded-pill ${fillClass}`} />;

  return (
    <View className={starSquareClasses[shape]}>
      <View className="absolute inset-0 scale-y-[2.8]">
        <View className={`flex-1 rotate-45 ${fillClass}`} />
      </View>
      <View className="absolute inset-0 scale-x-[2.8]">
        <View className={`flex-1 rotate-45 ${fillClass}`} />
      </View>
    </View>
  );
}
