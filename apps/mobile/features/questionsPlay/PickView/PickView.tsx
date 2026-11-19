import { copy, fillCopy } from '@getfreak/content';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Card, Chip } from '../../../components/ui';
import { LineBox } from '../LineBox';
import { TurnFrame, type TheoMood } from '../TurnFrame';
import type { PickViewProps } from './types';

// How long the second pick of a would you rather question ignores presses. The options stay live
// and look the same as before, so a fast second tap by the first player cannot answer for both.
const secondPickGuardMilliseconds = 700;

/**
 * A pick stage of a would you rather or guess your partner question. This view knows nothing of the
 * first pick. It is given the stage and the options, and draws the same options in the same order
 * at both stages, with no selected state, so no earlier pick can show, to the eye or to a screen
 * reader. At the second stage of a would you rather it says only that a pick is locked in.
 */
export function PickView({
  frame,
  format,
  stage,
  holderName,
  otherName,
  options,
  onPick,
  onNotThisOne,
}: PickViewProps) {
  const isGuess = format === 'guess';
  const isFirst = stage === 'answering';

  // The guard is a press filter and not a disabled state, so the second stage looks and announces
  // the same as the first. The screen keys this view by question, so every question starts unarmed.
  const isGuarded = format === 'eitherOr' && stage === 'secondPick';
  const [hasWaited, setHasWaited] = useState(false);
  useEffect(() => {
    if (!isGuarded) return;
    const timer = setTimeout(() => setHasWaited(true), secondPickGuardMilliseconds);
    return () => clearTimeout(timer);
  }, [isGuarded]);
  const pick = (optionId: string) => {
    if (isGuarded && !hasWaited) return;
    onPick(optionId);
  };

  let turnLine: string;
  if (!isGuess) {
    turnLine = fillCopy(copy.questionsPlay.picks, { name: isFirst ? holderName : otherName });
  } else {
    turnLine = isFirst
      ? fillCopy(copy.questionsPlay.answers, { name: holderName })
      : fillCopy(copy.questionsPlay.guessTitle, { name: holderName });
  }

  let mood: TheoMood = 'idle';
  if (isGuess && isFirst) mood = 'coverEyes';
  if (!isGuess && !isFirst) mood = 'flirty';

  // The guess format says only the answerer looks above the card. The would you rather format
  // says what happens to the pick below it.
  const lineAboveCard =
    isGuess && isFirst ? fillCopy(copy.questionsPlay.onlyLooks, { name: holderName }) : undefined;

  return (
    <TurnFrame
      {...frame}
      turnLine={turnLine}
      isTurnLineLarge={isGuess && !isFirst}
      mood={mood}
      aboveCard={lineAboveCard ? <LineBox>{lineAboveCard}</LineBox> : undefined}
      onNotThisOne={onNotThisOne}
    >
      {!isGuess && isFirst ? (
        <LineBox>{fillCopy(copy.questionsPlay.pickPrivate, { partner: otherName })}</LineBox>
      ) : null}
      {!isGuess && !isFirst ? (
        <View className="items-start gap-8 rounded-lg border-2 border-border bg-surface p-12">
          <Chip label={copy.questionsPlay.lockedChip} accent />
          <Text className="type-body-bold text-foreground">
            {fillCopy(copy.questionsPlay.lockedIn, { name: holderName })}
          </Text>
        </View>
      ) : null}
      {options.map((option) => (
        <Card key={option.id} label={option.text} onPress={() => pick(option.id)}>
          <Text className="type-heading text-foreground">{option.text}</Text>
        </Card>
      ))}
    </TurnFrame>
  );
}
