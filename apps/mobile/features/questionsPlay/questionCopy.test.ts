import { copy, fillCopy } from '@getfreak/content';
import type { PlayableQuestion } from '@getfreak/core';

import { penaltyLineOf, promptOf } from './questionCopy';

const base = { id: 'question', category: 'c1', topic: 't1', source: 'shipped' } as const;
const options = [
  { id: 'a', text: 'Option A' },
  { id: 'b', text: 'Option B' },
];

describe('promptOf', () => {
  it('should lead a drink if question with its lead and keep the clause as text', () => {
    const question: PlayableQuestion = { ...base, format: 'ifYou', text: 'clause one.' };

    expect(promptOf(question)).toEqual({ lead: copy.questionLeads.ifYou, text: 'clause one.' });
  });

  it('should lead a never have I ever question with its lead', () => {
    const question: PlayableQuestion = { ...base, format: 'neverHave', text: 'clause two.' };

    expect(promptOf(question)).toEqual({ lead: copy.questionLeads.neverHave, text: 'clause two.' });
  });

  it('should lead a would you rather question with its lead, with no text when it has none', () => {
    const question: PlayableQuestion = { ...base, format: 'eitherOr', options };

    expect(promptOf(question)).toEqual({ lead: copy.questionLeads.eitherOr, text: undefined });
  });

  it('should give a guess question its text alone, because it has no lead', () => {
    const question: PlayableQuestion = { ...base, format: 'guess', text: 'Asked?', options };

    expect(promptOf(question)).toEqual({ lead: undefined, text: 'Asked?' });
  });
});

describe('penaltyLineOf', () => {
  it('should say what a yes costs for a drink if question', () => {
    expect(penaltyLineOf('ifYou', 2, 'Player B')).toBe(
      fillCopy(copy.questionsPlay.penaltyIfYou, { penalty: 2 }),
    );
  });

  it('should say what having done it costs for a never have I ever question', () => {
    expect(penaltyLineOf('neverHave', 3, 'Player B')).toBe(
      fillCopy(copy.questionsPlay.penaltyNeverHave, { penalty: 3 }),
    );
  });

  it('should say what no match costs for a would you rather question', () => {
    expect(penaltyLineOf('eitherOr', 1, 'Player B')).toBe(
      fillCopy(copy.questionsPlay.penaltyEitherOr, { penalty: 1 }),
    );
  });

  it('should name the guesser as the one who drinks for a wrong guess', () => {
    expect(penaltyLineOf('guess', 4, 'Player B')).toBe(
      fillCopy(copy.questionsPlay.penaltyGuess, { name: 'Player B', penalty: 4 }),
    );
  });
});
