import type { CategoryId } from '@getfreak/core';

/** Which answer button was pressed. Each has its own effect. */
export type PressEffectKind = 'done' | 'pass';

/** A rectangle in dp. */
export type ButtonBounds = { x: number; y: number; width: number; height: number };

/**
 * One effect to play. The key changes with every press, so a new press replaces the effect still
 * playing and the old particles are removed.
 */
export type PressEffect = {
  key: number;
  kind: PressEffectKind;
  /** The category of the card in play, which colours the Done effect. */
  category: CategoryId;
  /** The pressed button, in the coordinates of the layer that draws the effect. */
  bounds: ButtonBounds;
};
