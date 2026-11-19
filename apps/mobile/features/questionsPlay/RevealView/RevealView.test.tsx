import { copy, fillCopy } from '@getfreak/content';
import type { PlayableQuestion, QuestionReveal } from '@getfreak/core';
import { fireEvent, screen, within } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { RevealView } from './RevealView';
import type { RevealViewProps } from './types';

const options = [
  { id: 'a', text: 'First option' },
  { id: 'b', text: 'Second option' },
  { id: 'c', text: 'Third option' },
];
const base = { id: 'question', category: 'c2', topic: 't1', source: 'shipped' } as const;
const ifYou: PlayableQuestion = { ...base, format: 'ifYou', text: 'clause.' };
const neverHave: PlayableQuestion = { ...base, format: 'neverHave', text: 'clause.' };
const eitherOr: PlayableQuestion = { ...base, format: 'eitherOr', options: options.slice(0, 2) };
const guess: PlayableQuestion = { ...base, format: 'guess', text: 'Asked?', options };

const props: RevealViewProps = {
  frame: {
    countLabel: 'Question 1 of 10',
    progress: { number: 1, length: 10 },
    category: 'c2',
    categoryName: 'Group two',
    topicName: 'Topic one',
    prompt: { lead: undefined, text: 'Asked?' },
    penaltyLine: 'It costs 2',
    onEndRound: jest.fn(),
  },
  question: ifYou,
  reveal: { kind: 'answers', answers: [true, false], drinks: [2, 0] },
  playerNames: ['Player A', 'Player B'],
  holder: 0,
  onNext: jest.fn(),
};

function renderView(overrides: Partial<RevealViewProps> = {}) {
  return renderThemed(<RevealView {...props} {...overrides} />);
}

const turnMood = () => drawnCharacters()[0]?.props.mood;

function optionCard(text: string) {
  return within(screen.getByRole('group', { name: new RegExp(text) }));
}

const answerChip = (name: string) => fillCopy(copy.questionsPlay.answerChip, { name });
const guessChip = (name: string) => fillCopy(copy.questionsPlay.guessChip, { name });

describe('RevealView', () => {
  it('should move on from the next question button, and offer no Not this one', async () => {
    const onNext = jest.fn();
    await renderView({ onNext });

    fireEvent.press(screen.getByRole('button', { name: copy.questionsPlay.nextQuestion }));

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: copy.roundPlay.notThisOne })).not.toBeOnTheScreen();
  });

  describe('a drink if or never have I ever question', () => {
    it('should name who drinks and how much, and who is safe, as one group', async () => {
      await renderView();

      expect(
        screen.getByRole('group', { name: 'Player A, drinks 2. Player B, safe.' }),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.questionsPlay.drinksChip, { penalty: 2 })),
      ).toBeOnTheScreen();
      expect(screen.getByText(copy.questionsPlay.safeChip)).toBeOnTheScreen();
      expect(turnMood()).toBe('happy');
    });

    it('should name the other player as the one who drinks when only they do', async () => {
      await renderView({ reveal: { kind: 'answers', answers: [false, true], drinks: [0, 2] } });

      expect(
        screen.getByRole('group', { name: 'Player A, safe. Player B, drinks 2.' }),
      ).toBeOnTheScreen();
    });

    it('should name both players when both drink', async () => {
      await renderView({ reveal: { kind: 'answers', answers: [true, true], drinks: [2, 2] } });

      expect(
        screen.getByRole('group', { name: 'Player A, drinks 2. Player B, drinks 2.' }),
      ).toBeOnTheScreen();
    });

    it('should keep the reader as the turn line for each format', async () => {
      await renderView();
      expect(screen.getByRole('header', { name: 'Player A reads' })).toBeOnTheScreen();
    });

    it('should tell the reader to read a never have I ever question out loud', async () => {
      await renderView({ question: neverHave, holder: 1 });

      expect(screen.getByRole('header', { name: 'Player B, read it out loud.' })).toBeOnTheScreen();
    });
  });

  describe('a would you rather question', () => {
    const matched: QuestionReveal = {
      kind: 'picks',
      holderPick: 'a',
      otherPick: 'a',
      matched: true,
      drinks: [0, 0],
    };
    const apart: QuestionReveal = {
      kind: 'picks',
      holderPick: 'a',
      otherPick: 'b',
      matched: false,
      drinks: [1, 1],
    };

    it('should say it is a match and that nobody drinks, announced to a screen reader', async () => {
      await renderView({ question: eitherOr, reveal: matched });

      const line = screen.getByRole('header', { name: copy.questionsPlay.matchLine });
      expect(line).toHaveProp('accessibilityLiveRegion', 'polite');
      expect(turnMood()).toBe('happy');
    });

    it('should name both players on the option they both picked, and nobody on the other', async () => {
      await renderView({ question: eitherOr, reveal: matched });

      expect(
        optionCard('First option').getByText(
          fillCopy(copy.questionsPlay.bothNames, { first: 'Player A', second: 'Player B' }),
        ),
      ).toBeOnTheScreen();
      expect(optionCard('Second option').queryByText(/Player/)).not.toBeOnTheScreen();
    });

    it('should say that both drink when the picks differ', async () => {
      await renderView({ question: eitherOr, reveal: apart });

      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.noMatchLine, { penalty: 1 }),
        }),
      ).toBeOnTheScreen();
      expect(turnMood()).toBe('shocked');
    });

    it('should name who picked each option when the picks differ', async () => {
      await renderView({ question: eitherOr, reveal: apart });

      expect(optionCard('First option').getByText('Player A')).toBeOnTheScreen();
      expect(optionCard('Second option').getByText('Player B')).toBeOnTheScreen();
    });

    it('should name the picks by player when the other player is the holder', async () => {
      await renderView({ question: eitherOr, reveal: apart, holder: 1 });

      expect(optionCard('First option').getByText('Player B')).toBeOnTheScreen();
      expect(optionCard('Second option').getByText('Player A')).toBeOnTheScreen();
    });
  });

  describe('a guess your partner question', () => {
    const right: QuestionReveal = {
      kind: 'guess',
      answer: 'b',
      guess: 'b',
      correct: true,
      drinks: [0, 0],
    };
    const wrong: QuestionReveal = {
      kind: 'guess',
      answer: 'b',
      guess: 'a',
      correct: false,
      drinks: [0, 2],
    };

    it('should say the guesser scores a point for a right guess, announced to a screen reader', async () => {
      await renderView({ question: guess, reveal: right });

      const line = screen.getByRole('header', {
        name: fillCopy(copy.questionsPlay.rightLine, { name: 'Player B' }),
      });
      expect(line).toHaveProp('accessibilityLiveRegion', 'polite');
      expect(turnMood()).toBe('happy');
    });

    it('should show the answer and the guess on the same option for a right guess', async () => {
      await renderView({ question: guess, reveal: right });

      const card = optionCard('Second option');
      expect(card.getByText(answerChip('Player A'))).toBeOnTheScreen();
      expect(card.getByText(guessChip('Player B'))).toBeOnTheScreen();
      expect(optionCard('First option').queryByText(/Player/)).not.toBeOnTheScreen();
      expect(optionCard('Third option').queryByText(/Player/)).not.toBeOnTheScreen();
    });

    it('should say the guesser drinks for a wrong guess', async () => {
      await renderView({ question: guess, reveal: wrong });

      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.wrongLine, { name: 'Player B', penalty: 2 }),
        }),
      ).toBeOnTheScreen();
      expect(turnMood()).toBe('shocked');
    });

    it('should mark the right answer and the wrong guess on separate options', async () => {
      await renderView({ question: guess, reveal: wrong });

      expect(optionCard('Second option').getByText(answerChip('Player A'))).toBeOnTheScreen();
      expect(optionCard('Second option').queryByText(guessChip('Player B'))).not.toBeOnTheScreen();
      expect(optionCard('First option').getByText(guessChip('Player B'))).toBeOnTheScreen();
      expect(optionCard('First option').queryByText(answerChip('Player A'))).not.toBeOnTheScreen();
    });

    it('should name the guesser as the other player when the second player holds the phone', async () => {
      await renderView({ question: guess, reveal: wrong, holder: 1 });

      expect(optionCard('Second option').getByText(answerChip('Player B'))).toBeOnTheScreen();
      expect(optionCard('First option').getByText(guessChip('Player A'))).toBeOnTheScreen();
    });
  });
});
