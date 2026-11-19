import type { BurstShape } from '../motion';

export type ParticleShapeProps = {
  /** The core is the large star at the heart of the burst. */
  shape: BurstShape | 'core';
  /** The fill class, written out in full such as `bg-category-c1`, so Tailwind can see it. */
  fillClass: string;
};
