import { copy, fillCopy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { HandoffView } from './HandoffView';

describe('HandoffView', () => {
  it('should name who receives the phone and continue from the button', async () => {
    const onContinue = jest.fn();
    await renderThemed(<HandoffView name="Player B" onContinue={onContinue} />);

    expect(
      screen.getByRole('header', {
        name: fillCopy(copy.roundPlay.handoffTitle, { name: 'Player B' }),
      }),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.handoffButton }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('should tell the previous player to look away when it knows who that is', async () => {
    await renderThemed(
      <HandoffView name="Player B" previousName="Player A" onContinue={jest.fn()} />,
    );

    expect(
      screen.getByText(fillCopy(copy.roundPlay.handoffLine, { name: 'Player A' })),
    ).toBeOnTheScreen();
  });

  it('should show the line it is given under the title', async () => {
    await renderThemed(
      <HandoffView name="Player B" line="Player B, do the thing." onContinue={jest.fn()} />,
    );

    expect(screen.getByText('Player B, do the thing.')).toBeOnTheScreen();
  });

  it('should show no extra line when it is not given one', async () => {
    await renderThemed(<HandoffView name="Player B" onContinue={jest.fn()} />);

    expect(screen.queryByText('Player B, do the thing.')).not.toBeOnTheScreen();
  });
});
