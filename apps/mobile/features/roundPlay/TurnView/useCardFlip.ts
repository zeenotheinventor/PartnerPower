import { useEffect, useState } from 'react';
import {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// The flip of a mystery dare, from the milestone 3 design. The card turns edge on, the face down
// card is swapped for the played one there, and it turns back. Nothing in the kit has motion
// tokens yet, so the timings are constants here. With reduced motion on, the card fades instead.
const turnAwayMilliseconds = 120;
const turnBackMilliseconds = 160;
const fadeOutMilliseconds = 80;
const fadeInMilliseconds = 120;
const perspective = 900;

/**
 * Tells whether the back of the card is still showing, and the animated style that flips it. The
 * back stays up until the flip has turned half way. A new mystery dare always comes after a reveal
 * screen, which unmounts the turn view, so each one starts with its back showing.
 */
export function useCardFlip(isFaceDown: boolean) {
  const reduceMotion = useReducedMotion();
  const [isBackShowing, setIsBackShowing] = useState(isFaceDown);
  const turnDegrees = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (isFaceDown || !isBackShowing) return;
    const showFront = () => setIsBackShowing(false);
    if (reduceMotion) {
      opacity.set(
        withTiming(0, { duration: fadeOutMilliseconds, easing: Easing.linear }, (finished) => {
          if (!finished) return;
          scheduleOnRN(showFront);
          opacity.set(withTiming(1, { duration: fadeInMilliseconds, easing: Easing.linear }));
        }),
      );
      return;
    }
    turnDegrees.set(
      withTiming(
        90,
        { duration: turnAwayMilliseconds, easing: Easing.in(Easing.quad) },
        (finished) => {
          if (!finished) return;
          scheduleOnRN(showFront);
          turnDegrees.set(
            withTiming(0, { duration: turnBackMilliseconds, easing: Easing.out(Easing.quad) }),
          );
        },
      ),
    );
  }, [isFaceDown, isBackShowing, reduceMotion, opacity, turnDegrees]);

  // Leaving the screen mid flip stops both animations.
  useEffect(
    () => () => {
      cancelAnimation(turnDegrees);
      cancelAnimation(opacity);
    },
    [opacity, turnDegrees],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ perspective }, { rotateY: `${turnDegrees.get()}deg` }],
  }));

  return { isBackShowing, animatedStyle };
}
