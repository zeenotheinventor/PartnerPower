import { copy, fillCopy } from '@getfreak/content';
import { useState } from 'react';

import { Button, SegmentedControl } from '../../../components/ui';
import { TurnFrame } from '../TurnFrame';
import type { StatementViewProps } from './types';

type Answer = 'yes' | 'no';
type Answers = readonly [Answer | undefined, Answer | undefined];

// A never have I ever question is answered "I have" or "Never". The first is the one that drinks,
// as a yes does, so both formats send the same action.
const answerLabels = {
  ifYou: { yes: copy.questionsPlay.yes, no: copy.questionsPlay.no },
  neverHave: { yes: copy.questionsPlay.have, no: copy.questionsPlay.never },
};

/**
 * The answering stage of a drink if or never have I ever question. Both players answer in the open
 * on one screen, and either can change their answer until the button sends them. A new question
 * gets a new instance, keyed by the question, so the answers start empty.
 */
export function StatementView({
  frame,
  format,
  playerNames,
  readerName,
  mood,
  onShowWhoDrinks,
  onNotThisOne,
}: StatementViewProps) {
  const [answers, setAnswers] = useState<Answers>([undefined, undefined]);
  const labels = answerLabels[format];
  const options = [
    { value: 'yes' as const, label: labels.yes },
    { value: 'no' as const, label: labels.no },
  ];
  const [firstAnswer, secondAnswer] = answers;
  const bothAnswered = firstAnswer !== undefined && secondAnswer !== undefined;

  const answer = (playerIndex: 0 | 1, value: Answer) =>
    setAnswers(playerIndex === 0 ? [value, secondAnswer] : [firstAnswer, value]);

  const showWhoDrinks = () => {
    if (firstAnswer !== undefined && secondAnswer !== undefined) {
      onShowWhoDrinks([firstAnswer === 'yes', secondAnswer === 'yes']);
    }
  };

  return (
    <TurnFrame
      {...frame}
      turnLine={fillCopy(
        format === 'ifYou' ? copy.questionsPlay.reads : copy.questionsPlay.readAloud,
        { name: readerName },
      )}
      mood={bothAnswered ? 'flirty' : mood}
      onNotThisOne={onNotThisOne}
    >
      <SegmentedControl
        label={playerNames[0]}
        options={options}
        value={firstAnswer}
        onValueChange={(value) => answer(0, value)}
      />
      <SegmentedControl
        label={playerNames[1]}
        options={options}
        value={secondAnswer}
        onValueChange={(value) => answer(1, value)}
      />
      <Button
        label={copy.questionsPlay.showWhoDrinks}
        fullWidth
        disabled={!bothAnswered}
        onPress={showWhoDrinks}
      />
    </TurnFrame>
  );
}
