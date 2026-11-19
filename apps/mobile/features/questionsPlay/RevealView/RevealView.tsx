import { copy, fillCopy } from '@getfreak/content';
import type { PlayableQuestion, PlayerIndex, QuestionOption, QuestionReveal } from '@getfreak/core';
import { Text, View } from 'react-native';

import { Button, Card, Chip } from '../../../components/ui';
import { AnswerRows } from '../AnswerRows';
import { TurnFrame, type TheoMood } from '../TurnFrame';
import type { RevealViewProps } from './types';

type Marks = { text: string; isAccent: boolean }[];

function optionsOf(question: PlayableQuestion): readonly QuestionOption[] {
  return question.format === 'eitherOr' || question.format === 'guess' ? question.options : [];
}

function otherOf(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0;
}

// Names the options in a would you rather question that were picked, and by whom. An option both
// picked carries both names in one chip.
function pickMarks(
  reveal: Extract<QuestionReveal, { kind: 'picks' }>,
  holderName: string,
  otherName: string,
): Record<string, Marks> {
  if (reveal.matched) {
    const both = fillCopy(copy.questionsPlay.bothNames, { first: holderName, second: otherName });
    return { [reveal.holderPick]: [{ text: both, isAccent: false }] };
  }
  return {
    [reveal.holderPick]: [{ text: holderName, isAccent: false }],
    [reveal.otherPick]: [{ text: otherName, isAccent: false }],
  };
}

// Marks the right answer, and the guess. A right guess lands both on one option.
function guessMarks(
  reveal: Extract<QuestionReveal, { kind: 'guess' }>,
  holderName: string,
  guesserName: string,
): Record<string, Marks> {
  const answerMark = {
    text: fillCopy(copy.questionsPlay.answerChip, { name: holderName }),
    isAccent: false,
  };
  const guessMark = {
    text: fillCopy(copy.questionsPlay.guessChip, { name: guesserName }),
    isAccent: true,
  };
  if (reveal.correct) return { [reveal.answer]: [answerMark, guessMark] };
  return { [reveal.answer]: [answerMark], [reveal.guess]: [guessMark] };
}

function marksOf(
  reveal: QuestionReveal,
  holderName: string,
  guesserName: string,
): Record<string, Marks> {
  if (reveal.kind === 'picks') return pickMarks(reveal, holderName, guesserName);
  if (reveal.kind === 'guess') return guessMarks(reveal, holderName, guesserName);
  return {};
}

/**
 * The revealed stage of every format. It shows what the engine worked out: who drinks, what was
 * picked and by whom, and whether a guess was right. The reveal is the only place a first pick can
 * appear, and it appears only once both players have picked.
 */
export function RevealView({
  frame,
  question,
  reveal,
  playerNames,
  holder,
  onNext,
}: RevealViewProps) {
  const holderName = playerNames[holder];
  const guesserIndex = otherOf(holder);
  const guesserName = playerNames[guesserIndex];
  const marksByOption = marksOf(reveal, holderName, guesserName);

  let turnLine: string;
  let mood: TheoMood;
  if (reveal.kind === 'answers') {
    turnLine = fillCopy(
      question.format === 'neverHave' ? copy.questionsPlay.readAloud : copy.questionsPlay.reads,
      { name: holderName },
    );
    mood = 'happy';
  } else if (reveal.kind === 'picks') {
    turnLine = reveal.matched
      ? copy.questionsPlay.matchLine
      : fillCopy(copy.questionsPlay.noMatchLine, { penalty: reveal.drinks[0] });
    mood = reveal.matched ? 'happy' : 'shocked';
  } else {
    turnLine = reveal.correct
      ? fillCopy(copy.questionsPlay.rightLine, { name: guesserName })
      : fillCopy(copy.questionsPlay.wrongLine, {
          name: guesserName,
          penalty: reveal.drinks[guesserIndex],
        });
    mood = reveal.correct ? 'happy' : 'shocked';
  }

  return (
    <TurnFrame
      {...frame}
      turnLine={turnLine}
      isTurnLineLarge={reveal.kind !== 'answers'}
      isTurnLineAnnounced={reveal.kind !== 'answers'}
      mood={mood}
    >
      {reveal.kind === 'answers' ? (
        <AnswerRows reveal={reveal} playerNames={playerNames} category={frame.category} />
      ) : (
        optionsOf(question).map((option) => {
          const marks = marksByOption[option.id];
          return (
            <Card key={option.id} category={marks ? frame.category : undefined}>
              <View className="gap-8">
                <Text className="type-heading text-foreground">{option.text}</Text>
                {marks ? (
                  <View className="flex-row flex-wrap items-start gap-8">
                    {marks.map(({ text, isAccent }) => (
                      <Chip
                        key={text}
                        label={text}
                        accent={isAccent}
                        selected={isAccent ? undefined : true}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            </Card>
          );
        })
      )}
      <View className="flex-1" />
      <Button label={copy.questionsPlay.nextQuestion} fullWidth onPress={onNext} />
    </TurnFrame>
  );
}
