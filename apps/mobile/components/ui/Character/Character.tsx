import type { CharacterId } from '@getfreak/core';
import { characterPalettes } from '@getfreak/tokens';
import { useColorScheme } from 'nativewind';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import {
  bustViewBox,
  characters,
  composeLayers,
  headViewBox,
  moodArtOf,
  sizeInDp,
  type CharacterCrop,
  type CharacterMood,
  type CharacterSize,
  type Point,
} from '../../../characters';
import { ShapeLayer } from './ShapeLayer';
import type { CharacterProps, CharacterPropsFor } from './types';
import { useCharacterMotion } from './useCharacterMotion';

// The root is a fixed square. The classes are listed whole, so Tailwind can see them, and a test
// keeps them equal to `sizeInDp`.
export const sizeClasses: Record<CharacterSize, string> = {
  tile: 'pointer-events-none h-[64px] w-[64px] overflow-hidden',
  medium: 'pointer-events-none h-[96px] w-[96px] overflow-hidden',
  hero: 'pointer-events-none h-[150px] w-[150px] overflow-hidden',
};

// Every moving layer is a full-size animated view. Reanimated writes its transform from the UI
// thread, so it takes its style through the style prop and not a class.
const fill = StyleSheet.absoluteFill;

type ViewProps = {
  character: CharacterId;
  mood: CharacterMood;
  size: CharacterSize;
  crop: CharacterCrop;
  animated: boolean;
};

function useLookup({ character, mood, size: sizeName, crop }: ViewProps) {
  const { colorScheme } = useColorScheme();
  const palette = characterPalettes[character][colorScheme === 'dark' ? 'dark' : 'light'];
  const art = characters[character];
  // An unknown mood draws the idle one.
  const layers = useMemo(() => composeLayers(art, mood), [art, mood]);
  const moodArt = moodArtOf(art, mood);
  const size = sizeInDp[sizeName];
  const viewBox = crop === 'head' ? headViewBox : bustViewBox;
  return { art, moodArt, layers, palette, size, viewBox };
}

function StillCharacter(props: ViewProps) {
  const { layers, palette, size, viewBox } = useLookup(props);
  // At rest nothing moves, so every layer but the blink goes into one SVG.
  const shapes = useMemo(
    () => layers.filter((layer) => layer.name !== 'blink').flatMap((layer) => layer.shapes),
    [layers],
  );
  return <ShapeLayer shapes={shapes} palette={palette} viewBox={viewBox} size={size} />;
}

function AnimatedCharacter(props: ViewProps) {
  const { art, moodArt, layers, palette, size, viewBox } = useLookup(props);
  const unit = size / viewBox.width;

  // Pivots are offsets from the centre of the square view, passed as plain numbers, so a parent
  // render does not rebuild the animated styles.
  const at = (point: Point) => toOffset(point, viewBox, unit, size);
  const figure = at({ x: viewBox.x + viewBox.width / 2, y: viewBox.y + viewBox.height });
  const head = at(art.headPivot);
  const hair = at(art.hairPivot);
  const left = at(moodArt.armLeft.pivot);
  const right = at(moodArt.armRight.pivot);
  const motion = useCharacterMotion({
    mood: props.mood,
    limbMotion: moodArt.motion,
    unit,
    // The squash turns about the bottom centre of what the crop shows.
    figurePivotX: figure.x,
    figurePivotY: figure.y,
    headPivotX: head.x,
    headPivotY: head.y,
    hairPivotX: hair.x,
    hairPivotY: hair.y,
    leftPivotX: left.x,
    leftPivotY: left.y,
    rightPivotX: right.x,
    rightPivotY: right.y,
  });

  const shapesOf = (name: string) => layers.find((layer) => layer.name === name)?.shapes ?? [];
  const layer = (name: string): ReactNode => (
    <ShapeLayer shapes={shapesOf(name)} palette={palette} viewBox={viewBox} size={size} />
  );
  const hasShapes = (name: string) => shapesOf(name).length > 0;

  return (
    <Animated.View style={[fill, motion.figureStyle]}>
      <Animated.View style={[fill, motion.hairBackStyle]}>{layer('hairBack')}</Animated.View>
      <View style={fill}>{layer('body')}</View>
      {hasShapes('armLeft') && (
        <Animated.View style={[fill, motion.leftLimbStyle]}>{layer('armLeft')}</Animated.View>
      )}
      {hasShapes('armRight') && (
        <Animated.View style={[fill, motion.rightLimbStyle]}>{layer('armRight')}</Animated.View>
      )}
      <Animated.View style={[fill, motion.headStyle]}>
        <View style={fill}>{layer('head')}</View>
        {hasShapes('irises') && (
          <Animated.View style={[fill, motion.glanceStyle]}>{layer('irises')}</Animated.View>
        )}
        <View style={fill}>{layer('face')}</View>
        {hasShapes('blink') && (
          <Animated.View style={[fill, motion.blinkStyle]}>{layer('blink')}</Animated.View>
        )}
        <Animated.View style={[fill, motion.hairFrontStyle]}>{layer('hairFront')}</Animated.View>
      </Animated.View>
      {hasShapes('handLeft') && (
        <Animated.View style={[fill, motion.leftLimbStyle]}>{layer('handLeft')}</Animated.View>
      )}
      {hasShapes('handRight') && (
        <Animated.View style={[fill, motion.rightLimbStyle]}>{layer('handRight')}</Animated.View>
      )}
    </Animated.View>
  );
}

function toOffset(
  point: Point,
  viewBox: { x: number; y: number },
  unit: number,
  size: number,
): Point {
  return { x: (point.x - viewBox.x) * unit - size / 2, y: (point.y - viewBox.y) * unit - size / 2 };
}

function CharacterView(props: ViewProps) {
  const reduceMotion = useReducedMotion();
  const still = !props.animated || reduceMotion;
  return (
    <View
      className={sizeClasses[props.size]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      {still ? <StillCharacter {...props} /> : <AnimatedCharacter {...props} />}
    </View>
  );
}

/**
 * A character of the cast, drawn in code and animated on the UI thread. It is decorative, so it is
 * hidden from screen readers. With reduced motion on, or `animated={false}`, it shows the mood's
 * still pose. The role and the mood are checked as a pair. An unknown mood draws the idle one.
 */
export function Character({ crop = 'bust', animated = true, ...rest }: CharacterProps) {
  return <CharacterView {...rest} crop={crop} animated={animated} />;
}

/** The same component for code that is generic in the role, such as the kit gallery. */
export function CharacterOf<Id extends CharacterId>({
  crop = 'bust',
  animated = true,
  ...rest
}: CharacterPropsFor<Id>) {
  return <CharacterView {...rest} crop={crop} animated={animated} />;
}
