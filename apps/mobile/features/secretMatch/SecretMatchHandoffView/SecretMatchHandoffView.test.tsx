import { copy, fillCopy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { SecretMatchHandoffView } from './SecretMatchHandoffView';

const onContinue = jest.fn();

async function renderView() {
  await renderThemed(
    <SecretMatchHandoffView
      finishedPlayerName="Player A"
      nextPlayerName="Player B"
      onContinue={onContinue}
    />,
  );
}

describe('SecretMatchHandoffView', () => {
  afterEach(() => {
    onContinue.mockClear();
  });

  it('should thank the first player and say who gets the phone', async () => {
    await renderView();

    expect(
      screen.getByRole('header', {
        name: fillCopy(copy.secretMatch.handoffTitle, { name: 'Player A', partner: 'Player B' }),
      }),
    ).toBeOnTheScreen();
  });

  it('should say that the first answers are locked and hidden', async () => {
    await renderView();

    expect(
      screen.getByText(fillCopy(copy.secretMatch.handoffLine, { name: 'Player A' })),
    ).toBeOnTheScreen();
  });

  it('should start the second pass from the one button, named for the partner', async () => {
    await renderView();

    fireEvent.press(
      screen.getByRole('button', {
        name: fillCopy(copy.secretMatch.handoffButton, { partner: 'Player B' }),
      }),
    );

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('should offer nothing else, so there is no way back into the first pass', async () => {
    await renderView();

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: copy.secretMatch.back })).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: copy.secretMatch.backLabel }),
    ).not.toBeOnTheScreen();
  });

  it('should show Theo covering his eyes, as decoration', async () => {
    await renderView();

    expect(drawnCharacters()).toEqual([
      {
        props: { character: 'shy', mood: 'coverEyes', size: 'hero' },
        isHiddenFromScreenReaders: true,
      },
    ]);
  });
});
