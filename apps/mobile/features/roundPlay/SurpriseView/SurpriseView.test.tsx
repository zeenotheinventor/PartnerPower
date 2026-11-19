import { copy, surpriseNames } from '@getfreak/content';
import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { SurpriseView } from './SurpriseView';

const rule = 'The rule of this surprise, already filled in.';
const turnLine = "Player A's turn";

function renderView(props: Partial<Parameters<typeof SurpriseView>[0]> = {}) {
  return renderThemed(
    <SurpriseView
      surprise="swap"
      rule={rule}
      turnLine={turnLine}
      onContinue={jest.fn()}
      {...props}
    />,
  );
}

describe('SurpriseView', () => {
  it('should say it is a surprise', async () => {
    await renderView();

    expect(screen.getByText(copy.roundPlay.surpriseTitle)).toBeOnTheScreen();
  });

  it.each(['mystery', 'jump', 'swap', 'freePass'] as const)(
    'should name the %s surprise as a heading',
    async (surprise) => {
      await renderView({ surprise });

      expect(screen.getByRole('header', { name: surpriseNames[surprise] })).toBeOnTheScreen();
    },
  );

  it('should draw the name of the surprise on the accent colour', async () => {
    await renderView({ surprise: 'swap' });

    expect(screen.getByRole('header', { name: surpriseNames.swap })).toHaveStyle({
      color: colorThemes.light.onAccent.toLowerCase(),
    });
  });

  it('should show its rule line and whose turn it is for', async () => {
    await renderView();

    expect(screen.getByText(rule)).toBeOnTheScreen();
    expect(screen.getByText(turnLine)).toBeOnTheScreen();
  });

  it('should continue when Bring it is pressed', async () => {
    const onContinue = jest.fn();
    await renderView({ onContinue });

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.surpriseButton }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('should show no notice unless it is given one', async () => {
    await renderView();

    expect(screen.queryByRole('status')).not.toBeOnTheScreen();
  });

  it('should show the notice it is given', async () => {
    await renderView({ notice: copy.roundPlay.freePassUsed });

    expect(screen.getByRole('status', { name: copy.roundPlay.freePassUsed })).toBeOnTheScreen();
  });
});
