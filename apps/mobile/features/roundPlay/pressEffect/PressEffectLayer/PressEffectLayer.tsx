import { useEffect } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { EffectOrigin } from '../EffectOrigin';
import { effectDuration } from '../motion';
import { ReducedMotionRing } from '../ReducedMotionRing';
import { Splash } from '../Splash';
import { Starburst } from '../Starburst';
import type { PressEffectLayerProps } from './types';

/**
 * The layer that draws the effect of an answer button, over whatever view is showing. It lives in
 * the round play screen and not in the button, because pressing the button replaces it at once.
 * Nothing in the layer takes a touch or is read out, since it is decoration. It takes itself off
 * when the effect ends, and a timer that has not run is dropped if the layer goes first.
 */
export function PressEffectLayer({ effect, onFinished }: PressEffectLayerProps) {
  const reduceMotion = useReducedMotion();
  const { key, kind, category, bounds } = effect;

  const duration = reduceMotion
    ? kind === 'done'
      ? effectDuration.reducedMotionDone
      : effectDuration.reducedMotionPass
    : effectDuration[kind];

  useEffect(() => {
    const timer = setTimeout(() => onFinished(key), duration);
    return () => clearTimeout(timer);
  }, [duration, key, onFinished]);

  let content;
  if (reduceMotion) {
    content = <ReducedMotionRing kind={kind} category={category} bounds={bounds} />;
  } else {
    // The effects start at the top edge of the button, so the label stays readable.
    content = (
      <EffectOrigin x={bounds.x + bounds.width / 2} y={bounds.y}>
        {kind === 'done' ? <Starburst category={category} /> : <Splash />}
      </EffectOrigin>
    );
  }

  return (
    // This layer is decoration with no accessible name or role to query by, so a test finds it by
    // its test id.
    <View
      testID="press-effect-layer"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="absolute inset-0"
    >
      {content}
    </View>
  );
}
