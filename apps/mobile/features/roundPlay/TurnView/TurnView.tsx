import { copy, fillCopy, surpriseNames } from '@getfreak/content';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  Button,
  Card,
  Character,
  Chip,
  Countdown,
  FeedbackPressable,
  Screen,
} from '../../../components/ui';
import { useFeedback } from '../../../feedback/FeedbackProvider';
import type { PressEffectKind } from '../pressEffect';
import { TurnTopBar } from '../TurnTopBar';
import type { TurnViewProps } from './types';
import { useCardFlip } from './useCardFlip';
import { useVibrationRun } from './useVibrationRun';

function countdownSecondsText(count: number) {
  return fillCopy(
    count === 1 ? copy.roundPlay.countdownSecondsOne : copy.roundPlay.countdownSecondsMany,
    { count },
  );
}

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
  timer,
  vibration,
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

  // A timer card's clock starts when this view first shows, which is after the reveal and the pass
  // the phone screens. Done stays locked until the countdown ends, and ending it gives one haptic.
  const { timerEnd } = useFeedback();
  const [shownAt] = useState(() => Date.now());
  const [isTimeUp, setIsTimeUp] = useState(false);
  const isDoneLocked = timer !== undefined && !isTimeUp;
  const endTimer = () => {
    setIsTimeUp(true);
    timerEnd();
  };
  // The run is kept even when there is no vibration, so the hook count never changes.
  const vibrationRun = useVibrationRun(vibration?.seconds ?? 0);
  // Everything but Stop is left alone while the phone vibrates, because stray touches are likely.
  const isLockedByVibration = vibrationRun.isRunning;
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
      <TurnTopBar
        countLabel={countLabel}
        progress={progress}
        isEndRoundDisabled={isLockedByVibration}
        onEndRound={onEndRound}
      />

      <View className="min-h-32 flex-row items-center justify-between gap-8">
        <Text accessibilityRole="header" className="type-body-bold flex-1 text-muted">
          {turnLabel}
        </Text>
        {freePass && !isFaceDownShowing ? (
          <Chip label={copy.roundPlay.freePassMarker} accent />
        ) : null}
      </View>

      {/* The head peeks over the top edge of the card. This view has no height and cancels its own
          gap, so the card stays where it was. It sits above the card so the head draws over it, and
          outside the flip, so only the card turns. */}
      <View className="z-10 -mb-16 h-0 items-end pr-16">
        {/* 46 is tuned to the proportions of the head crop at tile size, so the chin sits 18 over the card. */}
        <View className="-mt-[46px]">
          <Character character="dealer" mood="flirty" size="tile" crop="head" />
        </View>
      </View>

      {mystery ? (
        <Animated.View style={animatedStyle}>
          {isFaceDownShowing ? faceDownCard : playedCard}
        </Animated.View>
      ) : (
        playedCard
      )}

      {timer ? (
        <Countdown
          seconds={timer.seconds}
          startedAt={shownAt}
          label={copy.roundPlay.countdownLabel}
          secondsText={countdownSecondsText}
          endText={copy.roundPlay.timerDone}
          onEnd={endTimer}
        />
      ) : null}

      {vibration ? (
        <View className="flex-row items-center gap-12">
          <View className="flex-1">
            <Countdown
              seconds={vibration.seconds}
              startedAt={vibrationRun.startedAt}
              label={copy.roundPlay.countdownLabel}
              secondsText={countdownSecondsText}
              endText={copy.roundPlay.timerDone}
              onEnd={vibrationRun.end}
            />
          </View>
          <View className="w-1/3">
            <Button
              label={
                vibrationRun.isRunning ? copy.roundPlay.vibrationStop : copy.roundPlay.vibrationGo
              }
              variant={vibrationRun.isRunning ? 'secondary' : 'primary'}
              fullWidth
              onPress={vibrationRun.isRunning ? vibrationRun.stop : vibrationRun.go}
            />
          </View>
        </View>
      ) : null}

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
                disabled={isDoneLocked || isLockedByVibration}
                fullWidth
                onPress={() => answer('done', doneButtonRef, onDone)}
              />
            </View>
            <View ref={passButtonRef} collapsable={false} className="flex-1">
              <Button
                label={isTogether ? copy.roundPlay.togetherPass : copy.roundPlay.pass}
                variant="secondary"
                feedback="pass"
                disabled={isLockedByVibration}
                fullWidth
                onPress={() => answer('pass', passButtonRef, onPass)}
              />
            </View>
          </View>
          {timer ? (
            <Text className="type-caption text-center text-muted">
              {isTimeUp ? copy.roundPlay.timerDone : copy.roundPlay.timerRunning}
            </Text>
          ) : null}
          {freePass ? (
            <Button
              label={copy.roundPlay.useFreePass}
              variant="secondary"
              disabled={isLockedByVibration}
              fullWidth
              onPress={freePass.onUse}
            />
          ) : null}
        </View>
      )}

      {isFaceDownShowing ? null : (
        <FeedbackPressable
          accessibilityRole="button"
          disabled={isLockedByVibration}
          onPress={onNotThisOne}
          className="min-h-48 items-center justify-center"
        >
          <Text className="type-caption text-muted underline">{copy.roundPlay.notThisOne}</Text>
        </FeedbackPressable>
      )}
    </Screen>
  );
}
