import { copy, fillCopy } from '@getfreak/content';
import { act, fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { PickView } from './PickView';
import type { PickViewProps } from './types';

const props: PickViewProps = {
  frame: {
    countLabel: 'Question 1 of 10',
    progress: { number: 1, length: 10 },
    category: 'c1',
    categoryName: 'Group one',
    topicName: 'Topic one',
    prompt: { lead: undefined, text: 'Asked?' },
    penaltyLine: 'It costs 1',
    onEndRound: jest.fn(),
  },
  format: 'eitherOr',
  stage: 'answering',
  holderName: 'Player A',
  otherName: 'Player B',
  options: [
    { id: 'first', text: 'First option' },
    { id: 'second', text: 'Second option' },
    { id: 'third', text: 'Third option' },
  ],
  onPick: jest.fn(),
  onNotThisOne: jest.fn(),
};

function renderView(overrides: Partial<PickViewProps> = {}) {
  return renderThemed(<PickView {...props} {...overrides} />);
}

// The options are named by their text alone, in the order given, and carry no state, whichever
// stage the view is at. That is all a screen reader or an eye has to go on.
function expectOptionsUnmarked() {
  const options = screen.getAllByRole('button', { name: /option$/ });
  expect(options.map((option) => option.props.accessibilityLabel)).toEqual(
    props.options.map(({ text }) => text),
  );
  options.forEach((option) => {
    expect(option).not.toBeSelected();
    expect(option.props.accessibilityState).toEqual({ disabled: false });
  });
}

const turnMood = () => drawnCharacters()[0]?.props.mood;

describe('PickView', () => {
  it('should show each option as a button named by its text, in the order it is given', async () => {
    await renderView();

    const names = screen
      .getAllByRole('button', { name: /option$/ })
      .map((button) => button.props.accessibilityLabel);
    expect(names).toEqual(['First option', 'Second option', 'Third option']);
  });

  it('should send the id of the option that is pressed', async () => {
    const onPick = jest.fn();
    await renderView({ onPick });

    fireEvent.press(screen.getByRole('button', { name: 'Second option' }));

    expect(onPick).toHaveBeenCalledWith('second');
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('should open Not this one from its link', async () => {
    const onNotThisOne = jest.fn();
    await renderView({ onNotThisOne });

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.notThisOne }));

    expect(onNotThisOne).toHaveBeenCalledTimes(1);
  });

  describe('the second pick of would you rather', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should ignore presses for a moment, then take one, without looking disabled', async () => {
      const onPick = jest.fn();
      await renderView({ stage: 'secondPick', onPick });
      const option = screen.getByRole('button', { name: 'First option' });

      fireEvent.press(option);
      fireEvent.press(option);
      expect(onPick).not.toHaveBeenCalled();
      expect(option.props.accessibilityState).toEqual({ disabled: false });

      act(() => jest.advanceTimersByTime(700));
      fireEvent.press(option);

      expect(onPick).toHaveBeenCalledTimes(1);
    });

    it('should take the first pick at once', async () => {
      const onPick = jest.fn();
      await renderView({ stage: 'answering', onPick });

      fireEvent.press(screen.getByRole('button', { name: 'First option' }));

      expect(onPick).toHaveBeenCalledTimes(1);
    });

    it('should not guard a guess', async () => {
      const onPick = jest.fn();
      await renderView({ format: 'guess', stage: 'secondPick', onPick });

      fireEvent.press(screen.getByRole('button', { name: 'First option' }));

      expect(onPick).toHaveBeenCalledTimes(1);
    });
  });

  describe('would you rather', () => {
    it('should say the holder picks in private, and that the other player picks next', async () => {
      await renderView();

      expect(screen.getByRole('header', { name: 'Player A picks' })).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.questionsPlay.pickPrivate, { partner: 'Player B' })),
      ).toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsPlay.lockedChip)).not.toBeOnTheScreen();
      expect(turnMood()).toBe('idle');
    });

    it('should say the pick is locked in, without saying which, and ask the other player', async () => {
      await renderView({ stage: 'secondPick' });

      expect(screen.getByRole('header', { name: 'Player B picks' })).toBeOnTheScreen();
      expect(screen.getByText(copy.questionsPlay.lockedChip)).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.questionsPlay.lockedIn, { name: 'Player A' })),
      ).toBeOnTheScreen();
      expect(screen.queryByText(/Pick in private/)).not.toBeOnTheScreen();
      expect(turnMood()).toBe('flirty');
    });

    it.each(['answering', 'secondPick'] as const)(
      'should show the same options with no selected state in the %s stage',
      async (stage) => {
        await renderView({ stage });

        expectOptionsUnmarked();
      },
    );

    it('should leave Not this one on the second pick, because the question can still be replaced', async () => {
      await renderView({ stage: 'secondPick' });

      expect(screen.getByRole('button', { name: copy.roundPlay.notThisOne })).toBeOnTheScreen();
    });
  });

  describe('guess your partner', () => {
    it('should say that only the answerer looks, with Theo covering his eyes', async () => {
      await renderView({ format: 'guess' });

      expect(screen.getByRole('header', { name: 'Player A answers' })).toBeOnTheScreen();
      expect(
        screen.getByText(fillCopy(copy.questionsPlay.onlyLooks, { name: 'Player A' })),
      ).toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsPlay.lockedChip)).not.toBeOnTheScreen();
      expect(turnMood()).toBe('coverEyes');
    });

    it('should ask the guesser what the answerer picked, and say nothing of the answer', async () => {
      await renderView({ format: 'guess', stage: 'secondPick' });

      expect(
        screen.getByRole('header', {
          name: fillCopy(copy.questionsPlay.guessTitle, { name: 'Player A' }),
        }),
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(fillCopy(copy.questionsPlay.onlyLooks, { name: 'Player A' })),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText(copy.questionsPlay.lockedChip)).not.toBeOnTheScreen();
      expect(turnMood()).toBe('idle');
    });

    it.each(['answering', 'secondPick'] as const)(
      'should show the same options with no selected state in the %s stage',
      async (stage) => {
        await renderView({ format: 'guess', stage });

        expectOptionsUnmarked();
      },
    );
  });
});
