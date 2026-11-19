import { copy, fillCopy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { SteppingUpView } from './SteppingUpView';

function drawnRolesAndMoods() {
  return drawnCharacters().map(({ props }) => [props.character, props.mood]);
}

describe('SteppingUpView', () => {
  it('should say the Freak or Drink line and cost by default, with the gatekeeper', async () => {
    await renderThemed(
      <SteppingUpView category="c2" categoryName="Group two" penalty={2} onContinue={jest.fn()} />,
    );

    expect(screen.getByText(copy.roundPlay.stepUpLine)).toBeOnTheScreen();
    expect(screen.getByText(fillCopy(copy.roundPlay.stepUpCost, { penalty: 2 }))).toBeOnTheScreen();
    expect(drawnRolesAndMoods()).toEqual([['gatekeeper', 'flirty']]);
  });

  it('should say the line and cost line it is given, with the character it is given', async () => {
    await renderThemed(
      <SteppingUpView
        category="c3"
        categoryName="Group three"
        penalty={3}
        line="A different line."
        costLine="A different cost."
        character={{ character: 'shy', mood: 'flustered' }}
        onContinue={jest.fn()}
      />,
    );

    expect(screen.getByText('A different line.')).toBeOnTheScreen();
    expect(screen.getByText('A different cost.')).toBeOnTheScreen();
    expect(screen.queryByText(copy.roundPlay.stepUpLine)).not.toBeOnTheScreen();
    expect(drawnRolesAndMoods()).toEqual([['shy', 'flustered']]);
  });

  it('should continue from the button', async () => {
    const onContinue = jest.fn();
    await renderThemed(
      <SteppingUpView category="c2" categoryName="Group two" penalty={2} onContinue={onContinue} />,
    );

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.stepUpButton }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
