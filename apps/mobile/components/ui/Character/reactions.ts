import type { CharacterMood } from '../../../characters';

export type Reaction = 'none' | 'hop' | 'jolt' | 'tilt';

/** The short reaction a mood plays when it first shows, before it settles into its idle. */
export const reactionByMood: Record<CharacterMood, Reaction> = {
  idle: 'none',
  happy: 'hop',
  celebrate: 'hop',
  wave: 'hop',
  shocked: 'jolt',
  flustered: 'jolt',
  coverEyes: 'jolt',
  flirty: 'tilt',
  armsCrossed: 'tilt',
};

/** How far the head rests tilted in a mood, in degrees. Positive tilts towards the viewer's right. */
export const restingTiltByMood: Record<CharacterMood, number> = {
  idle: 0,
  happy: 0,
  celebrate: 0,
  wave: 0,
  shocked: 0,
  flustered: 0,
  coverEyes: 0,
  flirty: 3,
  armsCrossed: -2,
};
