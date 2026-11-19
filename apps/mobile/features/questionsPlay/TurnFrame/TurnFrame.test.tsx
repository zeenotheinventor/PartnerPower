import { copy } from '@getfreak/content';
import { fireEvent, screen } from 'nativewind/test';
import { Text } from 'react-native';

import { renderThemed } from '../../../tailwind/renderThemed';
import { drawnCharacters } from '../../../testing/drawnCharacters';
import { TurnFrame } from './TurnFrame';
import type { TurnFrameProps } from './types';

const frame: Omit<TurnFrameProps, 'children'> = {
  countLabel: 'Question 3 of 20',
  progress: { number: 3, length: 20 },
  category: 'c2',
  categoryName: 'Group two',
  topicName: 'Topic one',
  prompt: { lead: 'Lead in', text: 'the clause.' },
  penaltyLine: 'It costs 2',
  turnLine: 'Player A reads',
  mood: 'idle',
  onEndRound: jest.fn(),
};

function renderFrame(overrides: Partial<Omit<TurnFrameProps, 'children'>> = {}) {
  return renderThemed(
    <TurnFrame {...frame} {...overrides}>
      <Text>Controls</Text>
    </TurnFrame>,
  );
}

describe('TurnFrame', () => {
  it('should show the count, and a progress bar named by it', async () => {
    await renderFrame();

    expect(screen.getByText('Question 3 of 20')).toBeOnTheScreen();
    expect(screen.getByRole('progressbar', { name: 'Question 3 of 20' })).toBeOnTheScreen();
  });

  it('should show only the count for an endless round', async () => {
    await renderFrame({ progress: undefined, countLabel: 'Question 3, endless' });

    expect(screen.getByText('Question 3, endless')).toBeOnTheScreen();
    expect(screen.queryByRole('progressbar')).not.toBeOnTheScreen();
  });

  it('should show the turn line as a heading', async () => {
    await renderFrame();

    expect(screen.getByRole('header', { name: 'Player A reads' })).toBeOnTheScreen();
  });

  it('should read the lead and the clause as one sentence, with the category, topic and cost', async () => {
    await renderFrame();

    expect(screen.getByRole('group', { name: /Group two/ })).toBeOnTheScreen();
    expect(screen.getByText('Group two')).toBeOnTheScreen();
    expect(screen.getByText('Topic one')).toBeOnTheScreen();
    expect(screen.getByText('Lead in the clause.')).toBeOnTheScreen();
    expect(screen.getByText('It costs 2')).toBeOnTheScreen();
  });

  it('should show a prompt with no lead as its text alone', async () => {
    await renderFrame({ prompt: { lead: undefined, text: 'Asked?' } });

    expect(screen.getByText('Asked?')).toBeOnTheScreen();
  });

  it('should show a prompt with no text as its lead alone', async () => {
    await renderFrame({ prompt: { lead: 'Lead in', text: undefined } });

    expect(screen.getByText('Lead in')).toBeOnTheScreen();
  });

  it('should show what it is given under the card', async () => {
    await renderFrame();

    expect(screen.getByText('Controls')).toBeOnTheScreen();
  });

  it('should show what it is given between the turn line and the card', async () => {
    await renderFrame({ aboveCard: <Text>Only them</Text> });

    expect(screen.getByText('Only them')).toBeOnTheScreen();
  });

  it('should end the round from the end round pill', async () => {
    const onEndRound = jest.fn();
    await renderFrame({ onEndRound });

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.endRound }));

    expect(onEndRound).toHaveBeenCalledTimes(1);
  });

  it('should offer Not this one only when it has something to do', async () => {
    const onNotThisOne = jest.fn();
    await renderFrame({ onNotThisOne });

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.notThisOne }));

    expect(onNotThisOne).toHaveBeenCalledTimes(1);
  });

  it('should leave Not this one out when it has nothing to do', async () => {
    await renderFrame();

    expect(screen.queryByRole('button', { name: copy.roundPlay.notThisOne })).not.toBeOnTheScreen();
  });

  describe('Theo', () => {
    it('should show Theo in the mood it is given, as decoration', async () => {
      await renderFrame({ mood: 'flirty' });

      expect(drawnCharacters()).toEqual([
        expect.objectContaining({
          props: expect.objectContaining({ character: 'shy', mood: 'flirty', crop: 'head' }),
          isHiddenFromScreenReaders: true,
        }),
      ]);
    });

    it.each(['c3', 'c4'] as const)(
      'should show Theo flustered in %s whatever the mood',
      async (category) => {
        await renderFrame({ category, mood: 'happy' });

        expect(drawnCharacters()[0]?.props).toEqual(expect.objectContaining({ mood: 'flustered' }));
      },
    );

    it('should keep Theo covering his eyes in a bold category while a pick is private', async () => {
      await renderFrame({ category: 'c4', mood: 'coverEyes' });

      expect(drawnCharacters()[0]?.props).toEqual(expect.objectContaining({ mood: 'coverEyes' }));
    });

    it.each(['c1', 'c2'] as const)(
      'should show Theo in the mood it is given in %s',
      async (category) => {
        await renderFrame({ category, mood: 'shocked' });

        expect(drawnCharacters()[0]?.props).toEqual(expect.objectContaining({ mood: 'shocked' }));
      },
    );
  });
});
