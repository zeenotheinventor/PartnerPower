import { Easing } from 'react-native-reanimated';

// Every duration, angle, distance and easing of the two press effects, from the milestone 2 polish
// design. Lengths are dp, times are milliseconds and angles are degrees, where 0 is to the right
// and -90 is straight up. The origin of both effects is the centre of the top edge of the pressed
// button.

export const easings = {
  out: Easing.out(Easing.quad),
  in: Easing.in(Easing.quad),
  linear: Easing.linear,
};

export type BurstShape = 'star' | 'diamond' | 'dot';

export type BurstParticle = {
  shape: BurstShape;
  offsetX: number;
  offsetY: number;
  peakScale: number;
  delay: number;
  spinDegrees: number;
};

function burstParticle(
  shape: BurstShape,
  angleDegrees: number,
  distance: number,
  peakScale: number,
  delay: number,
  spinDegrees: number,
): BurstParticle {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    shape,
    offsetX: Math.round(Math.cos(radians) * distance),
    offsetY: Math.round(Math.sin(radians) * distance),
    peakScale,
    delay,
    spinDegrees,
  };
}

/** Done: a core star and twelve particles fanning upward. It is over 590 ms after the press. */
export const burstMotion = {
  travelDuration: 520,
  travelEasing: Easing.out(Easing.cubic),
  growDuration: 120,
  shrinkDuration: 200,
  shrinkTo: 0.4,
  opacityHoldDuration: 320,
  fadeDuration: 200,
  core: {
    growDuration: 140,
    growEasing: Easing.out(Easing.back(1.7)),
    peakScale: 1.2,
    shrinkDuration: 200,
    spinDegrees: 45,
    spinDuration: 340,
  },
  particles: [
    burstParticle('star', -90, 96, 1.25, 0, 90),
    burstParticle('star', -128, 84, 1, 20, -90),
    burstParticle('star', -52, 84, 1, 20, 90),
    burstParticle('star', -165, 68, 0.75, 40, -90),
    burstParticle('star', -15, 68, 0.75, 40, 90),
    burstParticle('diamond', -108, 60, 1, 30, 45),
    burstParticle('diamond', -72, 60, 1, 30, -45),
    burstParticle('diamond', -146, 50, 0.75, 50, 45),
    burstParticle('diamond', -34, 50, 0.75, 50, -45),
    burstParticle('dot', -112, 112, 1, 60, 0),
    burstParticle('dot', -68, 112, 1, 60, 0),
    burstParticle('dot', -90, 128, 0.75, 70, 0),
  ] satisfies BurstParticle[],
} as const;

export type SplashDrop = {
  /** The width and height of the drop. */
  size: 8 | 12 | 16;
  endX: number;
  peakY: number;
  landY: number;
  startTiltDegrees: number;
  endTiltDegrees: number;
  delay: number;
};

/** Pass: a flat ring and six drops that jump and fall back. It is over 700 ms after the press. */
export const splashMotion = {
  duration: 640,
  riseDuration: 260,
  fallDuration: 380,
  xEasing: Easing.out(Easing.sin),
  growDuration: 120,
  startScale: 0.4,
  endScale: 0.8,
  opacityHoldDuration: 480,
  fadeDuration: 160,
  ring: {
    duration: 360,
    startScale: 0.3,
    endScaleX: 1.8,
    endScaleY: 1.2,
    opacityHoldDuration: 120,
    fadeDuration: 240,
  },
  drops: [
    {
      size: 16,
      endX: -34,
      peakY: -64,
      landY: 40,
      startTiltDegrees: -20,
      endTiltDegrees: -70,
      delay: 0,
    },
    {
      size: 16,
      endX: 34,
      peakY: -64,
      landY: 40,
      startTiltDegrees: 20,
      endTiltDegrees: 70,
      delay: 0,
    },
    {
      size: 12,
      endX: -62,
      peakY: -44,
      landY: 48,
      startTiltDegrees: -40,
      endTiltDegrees: -100,
      delay: 30,
    },
    {
      size: 12,
      endX: 62,
      peakY: -44,
      landY: 48,
      startTiltDegrees: 40,
      endTiltDegrees: 100,
      delay: 30,
    },
    {
      size: 8,
      endX: -14,
      peakY: -80,
      landY: 32,
      startTiltDegrees: -8,
      endTiltDegrees: -40,
      delay: 60,
    },
    {
      size: 8,
      endX: 16,
      peakY: -76,
      landY: 34,
      startTiltDegrees: 8,
      endTiltDegrees: 40,
      delay: 60,
    },
  ] satisfies SplashDrop[],
} as const;

/** With reduce motion on, a ring around the button only fades in and out. */
export const reducedMotionRing = {
  /** How far the ring sits outside the button on every side. */
  margin: 8,
  done: { peakOpacity: 1, riseDuration: 120, fallDuration: 280 },
  pass: { peakOpacity: 0.7, riseDuration: 160, fallDuration: 320 },
} as const;

function longestDelay(delays: number[]) {
  return Math.max(...delays);
}

/** How long each effect lasts, so the layer can remove it when the last animation has ended. */
export const effectDuration = {
  done: longestDelay(burstMotion.particles.map(({ delay }) => delay)) + burstMotion.travelDuration,
  pass: longestDelay(splashMotion.drops.map(({ delay }) => delay)) + splashMotion.duration,
  reducedMotionDone: reducedMotionRing.done.riseDuration + reducedMotionRing.done.fallDuration,
  reducedMotionPass: reducedMotionRing.pass.riseDuration + reducedMotionRing.pass.fallDuration,
} as const;
