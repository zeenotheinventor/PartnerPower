import { copy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { TurnTopBar } from './TurnTopBar';

describe('TurnTopBar', () => {
  it('should show the card count and a progress bar named by it', async () => {
    await renderThemed(
      <TurnTopBar
        countLabel="Card 7 of 20"
        progress={{ number: 7, length: 20 }}
        onEndRound={jest.fn()}
      />,
    );

    expect(screen.getByText('Card 7 of 20')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Card 7 of 20' })).toBeOnTheScreen();
  });

  it('should show only the count for an endless round', async () => {
    await renderThemed(<TurnTopBar countLabel="Card 7, endless" onEndRound={jest.fn()} />);

    expect(screen.getByText('Card 7, endless')).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
  });

  it('should end the round from End round', async () => {
    const onEndRound = jest.fn();
    await renderThemed(<TurnTopBar countLabel="Card 7, endless" onEndRound={onEndRound} />);

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.endRound }));

    expect(onEndRound).toHaveBeenCalledTimes(1);
  });
});
