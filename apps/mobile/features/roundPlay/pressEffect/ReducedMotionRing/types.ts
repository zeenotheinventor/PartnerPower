import type { CategoryId } from '@getfreak/core';

import type { ButtonBounds, PressEffectKind } from '../types';

export type ReducedMotionRingProps = {
  kind: PressEffectKind;
  category: CategoryId;
  bounds: ButtonBounds;
};
