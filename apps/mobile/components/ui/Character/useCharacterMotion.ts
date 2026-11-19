import { useEffect, useMemo, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { CharacterMood, LimbMotion } from '../../../characters';
import { reactionByMood, restingTiltByMood } from './reactions';

type Transform = Extract<NonNullable<ViewStyle['transform']>, readonly unknown[]>[number];

/** Where a part turns, as an offset from the centre of its own square view, in dp. */
type PivotOffset = { x: number; y: number };

type MotionInput = {
  mood: CharacterMood;
  limbMotion: LimbMotion;
  /** dp per canvas unit. Every distance below is scaled by it. */
  unit: number;
  // Pivots are offsets from the view centre, as numbers so the styles are only rebuilt when one changes.
  figurePivotX: number;
  figurePivotY: number;
  headPivotX: number;
  headPivotY: number;
  hairPivotX: number;
  hairPivotY: number;
  leftPivotX: number;
  leftPivotY: number;
  rightPivotX: number;
  rightPivotY: number;
};

// Kinds are numbers because a worklet reads them from a shared value.
const reactionCodes = { none: 0, hop: 1, jolt: 2, tilt: 3 } as const;
const limbCodes = { none: 0, wave: 1, pump: 2, tap: 3, peek: 4 } as const;

const closeEyes = () =>
  withSequence(withTiming(1, { duration: 45 }), withDelay(30, withTiming(0, { duration: 55 })));

function aroundPivot(pivot: PivotOffset, operations: Transform[]): Transform[] {
  'worklet';
  return [
    { translateX: pivot.x },
    { translateY: pivot.y },
    ...operations,
    { translateX: -pivot.x },
    { translateY: -pivot.y },
  ];
}

/** What one arm does at this moment of its pose. Runs on the UI thread. */
function limbTransform(
  side: 'left' | 'right',
  kind: number,
  value: number,
  pivot: PivotOffset,
  unit: number,
): Transform[] {
  'worklet';
  if (kind === limbCodes.wave && side === 'right') {
    return aroundPivot(pivot, [{ rotate: `${14 * value}deg` }]);
  }
  if (kind === limbCodes.pump) {
    const direction = side === 'right' ? 1 : -1;
    return [
      { translateY: -3 * unit * Math.abs(value) },
      ...aroundPivot(pivot, [{ rotate: `${-direction * 7 * value}deg` }]),
    ];
  }
  if (kind === limbCodes.tap && side === 'right') return [{ translateY: 1.8 * unit * value }];
  if (kind === limbCodes.peek) return [{ translateY: 14 * unit * value }];
  return [{ translateY: 0 }];
}

/**
 * Every animation of one character, all on the UI thread. It returns an animated style for each
 * moving layer. It is only mounted when the character animates, so a still pose never starts it.
 */
export function useCharacterMotion(input: MotionInput) {
  const { mood, limbMotion, unit } = input;
  const figurePivot = useMemo(
    () => ({ x: input.figurePivotX, y: input.figurePivotY }),
    [input.figurePivotX, input.figurePivotY],
  );
  const headPivot = useMemo(
    () => ({ x: input.headPivotX, y: input.headPivotY }),
    [input.headPivotX, input.headPivotY],
  );
  const hairPivot = useMemo(
    () => ({ x: input.hairPivotX, y: input.hairPivotY }),
    [input.hairPivotX, input.hairPivotY],
  );
  const limbPivots = useMemo(
    () => ({
      left: { x: input.leftPivotX, y: input.leftPivotY },
      right: { x: input.rightPivotX, y: input.rightPivotY },
    }),
    [input.leftPivotX, input.leftPivotY, input.rightPivotX, input.rightPivotY],
  );

  const breath = useSharedValue(0);
  const blink = useSharedValue(0);
  const lookX = useSharedValue(0);
  const lookY = useSharedValue(0);
  const sway = useSharedValue(0);
  const reaction = useSharedValue(0);
  const reactionKind = useSharedValue<number>(reactionCodes.none);
  // Seeded from the first mood, so it does not tween in from zero on mount.
  const restingTilt = useSharedValue(restingTiltByMood[mood]);
  const limb = useSharedValue(0);
  const limbKind = useSharedValue<number>(limbCodes.none);

  // The loops that run whatever the mood: breathing, blinking, glancing and the hair.
  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    // A blink every few seconds, with a double blink now and then.
    blink.value = withRepeat(
      withSequence(
        withDelay(3200, closeEyes()),
        withDelay(2600, closeEyes()),
        withDelay(3800, withSequence(closeEyes(), withDelay(110, closeEyes()))),
      ),
      -1,
    );
    const glance = (target: number, wait: number) =>
      withDelay(wait, withTiming(target, { duration: 240, easing: Easing.out(Easing.quad) }));
    lookX.value = withRepeat(
      withSequence(glance(1, 2400), glance(0, 1300), glance(-1, 3100), glance(0, 1100)),
      -1,
    );
    lookY.value = withRepeat(withSequence(glance(0.6, 4100), glance(0, 900)), -1);
    sway.value = withSequence(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.sin) }),
      withRepeat(withTiming(-1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => {
      // Back to rest, so a loop that is stopped mid blink does not leave the eyes shut.
      for (const value of [breath, blink, lookX, lookY, sway]) {
        cancelAnimation(value);
        value.value = 0;
      }
    };
  }, [breath, blink, lookX, lookY, sway]);

  // The motion of the arms in a pose.
  useEffect(() => {
    limbKind.value = limbCodes[limbMotion];
    limb.value = 0;
    if (limbMotion === 'none') return;
    if (limbMotion === 'wave') {
      limb.value = withSequence(
        withTiming(-1, { duration: 140 }),
        withRepeat(withTiming(1, { duration: 420, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    } else if (limbMotion === 'pump') {
      limb.value = withRepeat(
        withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else if (limbMotion === 'tap') {
      const tap = () =>
        withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 90 }));
      limb.value = withRepeat(withDelay(2800, withSequence(tap(), tap(), tap())), -1);
    } else {
      // peek: lower the hands for a moment, then cover again
      limb.value = withRepeat(
        withSequence(
          withDelay(2600, withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) })),
          withDelay(900, withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) })),
        ),
        -1,
      );
    }
    return () => {
      cancelAnimation(limb);
      limb.value = 0;
    };
  }, [limbMotion, limb, limbKind]);

  // The head rests tilted in some moods, and a new mood plays a short reaction first.
  const previousMood = useRef(mood);
  useEffect(() => {
    const tilt = restingTiltByMood[mood];
    const changed = previousMood.current !== mood;
    previousMood.current = mood;
    restingTilt.value = withTiming(tilt, { duration: 300, easing: Easing.out(Easing.quad) });
    if (!changed) return;
    const kind = reactionByMood[mood];
    // A mood that changes mid-reaction starts the new one from rest.
    cancelAnimation(reaction);
    reaction.value = 0;
    reactionKind.value = reactionCodes[kind];
    if (kind === 'hop') {
      reaction.value = withSequence(
        withTiming(-1, { duration: 90, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 190, easing: Easing.in(Easing.quad) }),
      );
    } else if (kind === 'jolt') {
      reaction.value = withSequence(
        withTiming(1, { duration: 60, easing: Easing.out(Easing.quad) }),
        withTiming(-0.4, { duration: 100 }),
        withTiming(0, { duration: 190 }),
      );
    } else if (kind === 'tilt') {
      reaction.value = withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 220, easing: Easing.inOut(Easing.quad) }),
      );
    }
  }, [mood, reaction, reactionKind, restingTilt]);

  const figureStyle = useAnimatedStyle(() => {
    const kind = reactionKind.value;
    const hop = kind === reactionCodes.hop ? reaction.value : 0;
    const jolt = kind === reactionCodes.jolt ? reaction.value : 0;
    const lift = -1.2 * unit * breath.value - 6 * unit * Math.max(hop, 0) - 2 * unit * jolt;
    const stretch = 1 + 0.012 * breath.value + 0.05 * Math.min(hop, 0) + 0.03 * Math.max(hop, 0);
    return {
      transform: [
        { translateY: lift },
        ...aroundPivot(figurePivot, [
          { scaleX: 1 - 0.5 * (stretch - 1) + 0.04 * jolt },
          { scaleY: stretch + 0.04 * jolt },
        ]),
      ],
    };
  });

  const headStyle = useAnimatedStyle(() => {
    const tilt = reactionKind.value === reactionCodes.tilt ? reaction.value : 0;
    return {
      transform: [
        { translateY: -0.8 * unit * breath.value },
        ...aroundPivot(headPivot, [{ rotate: `${restingTilt.value + 5 * tilt}deg` }]),
      ],
    };
  });

  const glanceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: 2.4 * unit * lookX.value }, { translateY: 1.4 * unit * lookY.value }],
  }));

  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.value }));

  const hairFrontStyle = useAnimatedStyle(() => ({
    transform: aroundPivot(hairPivot, [{ rotate: `${1.1 * sway.value}deg` }]),
  }));

  const hairBackStyle = useAnimatedStyle(() => ({
    transform: aroundPivot(hairPivot, [{ rotate: `${-0.7 * sway.value}deg` }]),
  }));

  const leftLimbStyle = useAnimatedStyle(() => ({
    transform: limbTransform('left', limbKind.value, limb.value, limbPivots.left, unit),
  }));

  const rightLimbStyle = useAnimatedStyle(() => ({
    transform: limbTransform('right', limbKind.value, limb.value, limbPivots.right, unit),
  }));

  return {
    figureStyle,
    headStyle,
    glanceStyle,
    blinkStyle,
    hairFrontStyle,
    hairBackStyle,
    leftLimbStyle,
    rightLimbStyle,
  };
}
