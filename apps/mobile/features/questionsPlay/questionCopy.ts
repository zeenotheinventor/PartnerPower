import { copy, fillCopy } from '@getfreak/content';
import type { PlayableFormat, PlayableQuestion } from '@getfreak/core';

/** The words of a question as the card shows them. A lead and a clause read as one sentence. */
export type QuestionPrompt = { lead: string | undefined; text: string | undefined };

export function promptOf(question: PlayableQuestion): QuestionPrompt {
  switch (question.format) {
    case 'ifYou':
      return { lead: copy.questionLeads.ifYou, text: question.text };
    case 'neverHave':
      return { lead: copy.questionLeads.neverHave, text: question.text };
    case 'eitherOr':
      return { lead: copy.questionLeads.eitherOr, text: question.text };
    case 'guess':
      return { lead: undefined, text: question.text };
  }
}

/** What the question costs, under the prompt. The guesser is the one who drinks for a wrong guess. */
export function penaltyLineOf(format: PlayableFormat, penalty: number, guesserName: string) {
  switch (format) {
    case 'ifYou':
      return fillCopy(copy.questionsPlay.penaltyIfYou, { penalty });
    case 'neverHave':
      return fillCopy(copy.questionsPlay.penaltyNeverHave, { penalty });
    case 'eitherOr':
      return fillCopy(copy.questionsPlay.penaltyEitherOr, { penalty });
    case 'guess':
      return fillCopy(copy.questionsPlay.penaltyGuess, { name: guesserName, penalty });
  }
}
