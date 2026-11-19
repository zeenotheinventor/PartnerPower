import { copy } from '@getfreak/content';
import { screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { TurnView } from './TurnView';
import type { TurnViewProps } from './types';

const baseProps: TurnViewProps = {
  kind: 'solo',
  turnLabel: 'Turn label',
  countLabel: 'Count label',
  category: 'c1',
  categoryName: 'Category name',
  text: 'Card text',
  penaltyLine: 'Penalty line',
  onDone: jest.fn(),
  onPass: jest.fn(),
  onEndRound: jest.fn(),
  onNotThisOne: jest.fn(),
  onPressEffect: jest.fn(),
};

const startButton = () => screen.queryByRole('button', { name: copy.roundPlay.cardTimerStart });

describe('TurnView with a card timer', () => {
  it('should show the countdown and Start', async () => {
    await renderThemed(<TurnView {...baseProps} cardTimer={{ seconds: 60 }} />);

    expect(screen.getByRole('timer', { name: copy.roundPlay.countdownLabel })).toBeOnTheScreen();
    expect(startButton()).toBeOnTheScreen();
  });

  it('should show no Start, and one countdown only, on a timer surprise', async () => {
    await renderThemed(
      <TurnView {...baseProps} timer={{ seconds: 30 }} cardTimer={{ seconds: 60 }} />,
    );

    expect(startButton()).not.toBeOnTheScreen();
    expect(screen.getAllByRole('timer')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: copy.roundPlay.done, disabled: true }),
    ).toBeOnTheScreen();
  });

  it('should show no Start, and one countdown only, on a vibration card', async () => {
    await renderThemed(
      <TurnView {...baseProps} vibration={{ seconds: 10 }} cardTimer={{ seconds: 60 }} />,
    );

    expect(startButton()).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: copy.roundPlay.vibrationGo })).toBeOnTheScreen();
    expect(screen.getAllByRole('timer')).toHaveLength(1);
  });

  it('should show no countdown while the card is face down', async () => {
    await renderThemed(
      <TurnView
        {...baseProps}
        mystery={{ isFaceDown: true, onFlip: jest.fn() }}
        cardTimer={{ seconds: 60 }}
      />,
    );

    expect(screen.queryByRole('timer')).not.toBeOnTheScreen();
    expect(startButton()).not.toBeOnTheScreen();
  });
});
