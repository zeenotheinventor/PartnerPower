import { copy } from '@getfreak/content';
import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { ChoiceView } from './ChoiceView';
import type { ChoiceViewProps } from './types';

const prompt = 'Pick a dare for Player A';
const firstDare = 'The first dare on offer.';
const secondDare = 'The second dare on offer.';

function renderView(props: Partial<ChoiceViewProps> = {}) {
  return renderThemed(
    <ChoiceView
      prompt={prompt}
      countLabel="Card 14 of 20"
      progress={{ number: 14, length: 20 }}
      category="c3"
      categoryName="Category three"
      options={[firstDare, secondDare]}
      onChoose={jest.fn()}
      onEndRound={jest.fn()}
      {...props}
    />,
  );
}

describe('ChoiceView', () => {
  it('should ask for a dare by name as a heading', async () => {
    await renderView();

    expect(screen.getByRole('header', { name: prompt })).toBeOnTheScreen();
  });

  it('should show each dare as a button named by its text', async () => {
    await renderView();

    expect(screen.getByRole('button', { name: firstDare })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: secondDare })).toBeOnTheScreen();
  });

  it('should send the index of the dare that is pressed', async () => {
    const onChoose = jest.fn();
    await renderView({ onChoose });

    fireEvent.press(screen.getByRole('button', { name: secondDare }));

    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(1);
  });

  it('should send index 0 for the first dare', async () => {
    const onChoose = jest.fn();
    await renderView({ onChoose });

    fireEvent.press(screen.getByRole('button', { name: firstDare }));

    expect(onChoose).toHaveBeenCalledWith(0);
  });

  it('should name the category on each dare', async () => {
    await renderView();

    expect(screen.getAllByText('Category three')).toHaveLength(2);
  });

  it('should show the card count and the progress of the round', async () => {
    await renderView();

    expect(screen.getByText('Card 14 of 20')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Card 14 of 20' })).toBeOnTheScreen();
  });

  it('should leave out the progress bar for an endless round', async () => {
    await renderView({ progress: undefined, countLabel: 'Card 14, endless' });

    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
  });

  it('should end the round from End round', async () => {
    const onEndRound = jest.fn();
    await renderView({ onEndRound });

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.endRound }));

    expect(onEndRound).toHaveBeenCalledTimes(1);
  });

  it.each(['light', 'dark'] as const)(
    'should set the prompt in the foreground in %s mode',
    async (themeName) => {
      await renderThemed(
        <ChoiceView
          prompt={prompt}
          countLabel="Card 14 of 20"
          category="c3"
          categoryName="Category three"
          options={[firstDare, secondDare]}
          onChoose={jest.fn()}
          onEndRound={jest.fn()}
        />,
        themeName,
      );

      expect(screen.getByRole('header', { name: prompt })).toHaveStyle({
        color: colorThemes[themeName].foreground.toLowerCase(),
      });
    },
  );
});
