import { copy, surpriseNames } from '@getfreak/content';
import { useEffect, useRef, type RefObject } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button, Card, Chip, Screen } from '../../../components/ui';
import type { PressEffectKind } from '../pressEffect';
import { ProgressBar } from '../ProgressBar';
import type { TurnViewProps } from './types';
import { useCardFlip } from './useCardFlip';

export function TurnView({
  turnLabel,
  countLabel,
  progress,
  category,
  categoryName,
  text,
  penaltyLine,
  isPenaltyRaised = false,
  surpriseName,
  mystery,
  freePass,
  kind,
  togetherNames,
  onDone,
  onPass,
  onEndRound,
  onNotThisOne,
  onPressEffect,
}: TurnViewProps) {
  const isTogether = kind === 'together';
  const doneButtonRef = useRef<View>(null);
  const passButtonRef = useRef<View>(null);
  const cardTextRef = useRef<Text>(null);
  const { isBackShowing, animatedStyle } = useCardFlip(mystery?.isFaceDown ?? false);
  const faceDownMystery = mystery && isBackShowing ? mystery : undefined;
  const isFaceDownShowing = faceDownMystery !== undefined;

  // Once the card has turned over, a screen reader is taken to what is written on it.
  const wasFaceDownShowing = useRef(isFaceDownShowing);
  useEffect(() => {
    if (wasFaceDownShowing.current && !isFaceDownShowing) {
      const cardText = cardTextRef.current;
      if (cardText) AccessibilityInfo.sendAccessibilityEvent(cardText, 'focus');
    }
    wasFaceDownShowing.current = isFaceDownShowing;
  }, [isFaceDownShowing]);

  // The buttons are replaced as soon as the answer is given, so the spot of the pressed one is
  // measured first. The answer itself does not wait for the measurement.
  const answer = (
    effectKind: PressEffectKind,
    buttonRef: RefObject<View | null>,
    act: () => void,
  ) => {
    buttonRef.current?.measureInWindow((x, y, width, height) =>
      onPressEffect(effectKind, { x, y, width, height }),
    );
    act();
  };

  const faceDownCard = (
    <Card
      faceDown
      mark={copy.roundPlay.faceDownMark}
      title={surpriseNames.mystery}
      label={copy.roundPlay.faceDownLabel}
    />
  );

  const playedCard = (
    <Card category={category} accent={isTogether} grouped={false}>
      <View className="gap-12">
        <View className="items-start gap-8">
          {isTogether ? <Chip label={copy.roundPlay.togetherChip} accent /> : null}
          {surpriseName ? <Chip label={surpriseName} accent /> : null}
          <Chip label={categoryName} category={category} />
        </View>
        {isTogether ? (
          <Text className="type-body-bold text-foreground">{togetherNames}</Text>
        ) : null}
        <Text ref={cardTextRef} className="type-heading text-foreground">
          {text}
        </Text>
        <Text className={`type-caption ${isPenaltyRaised ? 'text-foreground' : 'text-muted'}`}>
          {penaltyLine}
        </Text>
      </View>
    </Card>
  );

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between gap-8">
        <Pressable
          accessibilityRole="button"
          onPress={onEndRound}
          className="min-h-48 justify-center rounded-pill border-2 border-border bg-surface px-12"
        >
          <Text className="type-caption text-foreground">{copy.roundPlay.endRound}</Text>
        </Pressable>
        <Text className="type-caption text-muted">{countLabel}</Text>
      </View>

      {progress ? (
        <ProgressBar number={progress.number} length={progress.length} label={countLabel} />
      ) : null}

      <View className="min-h-32 flex-row items-center justify-between gap-8">
        <Text accessibilityRole="header" className="type-body-bold flex-1 text-muted">
          {turnLabel}
        </Text>
        {freePass && !isFaceDownShowing ? (
          <Chip label={copy.roundPlay.freePassMarker} accent />
        ) : null}
      </View>

      {mystery ? (
        <Animated.View style={animatedStyle}>
          {isFaceDownShowing ? faceDownCard : playedCard}
        </Animated.View>
      ) : (
        playedCard
      )}

      {faceDownMystery ? (
        <Button label={copy.roundPlay.flip} fullWidth onPress={faceDownMystery.onFlip} />
      ) : (
        <View className="gap-16">
          <View className="flex-row gap-12">
            {/* Not collapsable, because a view with no style of its own is removed on Android and
                cannot be measured. */}
            <View ref={doneButtonRef} collapsable={false} className="flex-1">
              <Button
                label={isTogether ? copy.roundPlay.togetherDone : copy.roundPlay.done}
                feedback="done"
                fullWidth
                onPress={() => answer('done', doneButtonRef, onDone)}
              />
            </View>
            <View ref={passButtonRef} collapsable={false} className="flex-1">
              <Button
                label={isTogether ? copy.roundPlay.togetherPass : copy.roundPlay.pass}
                variant="secondary"
                feedback="pass"
                fullWidth
                onPress={() => answer('pass', passButtonRef, onPass)}
              />
            </View>
          </View>
          {freePass ? (
            <Button
              label={copy.roundPlay.useFreePass}
              variant="secondary"
              fullWidth
              onPress={freePass.onUse}
            />
          ) : null}
        </View>
      )}

      {isFaceDownShowing ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={onNotThisOne}
          className="min-h-48 items-center justify-center"
        >
          <Text className="type-caption text-muted underline">{copy.roundPlay.notThisOne}</Text>
        </Pressable>
      )}
    </Screen>
  );
}
