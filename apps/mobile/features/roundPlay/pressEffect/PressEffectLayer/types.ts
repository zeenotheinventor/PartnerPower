import type { PressEffect } from '../types';

export type PressEffectLayerProps = {
  effect: PressEffect;
  /** Called with the key of the effect when its last animation has ended. */
  onFinished: (key: number) => void;
};
