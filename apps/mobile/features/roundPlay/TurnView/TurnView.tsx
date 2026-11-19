import { copy } from '@getfreak/content';
import { useRef, type RefObject } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, Character, Chip, Screen } from '../../../components/ui';
import type { PressEffectKind } from '../pressEffect';
import { ProgressBar } from '../ProgressBar';
import type { TurnViewProps } from './types';

export function TurnView({
  turnLabel,
  countLabel,
  progress,
  category,
  categoryName,
  text,
  penaltyLine,
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

      <Text accessibilityRole="header" className="type-body-bold text-muted">
        {turnLabel}
      </Text>

      {/* Mei's head peeks over the top edge of the card. This view has no height and cancels its own
          gap, so the card stays where it was. It sits above the card so the head draws over it. */}
      <View className="z-10 -mb-16 h-0 items-end pr-16">
        {/* 46 is tuned to the proportions of the head crop at tile size, so the chin sits 18 over the card. */}
        <View className="-mt-[46px]">
          <Character character="dealer" mood="flirty" size="tile" crop="head" />
        </View>
      </View>

      <Card category={category} accent={isTogether} grouped={false}>
        <View className="gap-12">
          <View className="items-start gap-8">
            {isTogether ? <Chip label={copy.roundPlay.togetherChip} accent /> : null}
            <Chip label={categoryName} category={category} />
          </View>
          {isTogether ? (
            <Text className="type-body-bold text-foreground">{togetherNames}</Text>
          ) : null}
          <Text className="type-heading text-foreground">{text}</Text>
          <Text className="type-caption text-muted">{penaltyLine}</Text>
        </View>
      </Card>

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

      <Pressable
        accessibilityRole="button"
        onPress={onNotThisOne}
        className="min-h-48 items-center justify-center"
      >
        <Text className="type-caption text-muted underline">{copy.roundPlay.notThisOne}</Text>
      </Pressable>
    </Screen>
  );
}
