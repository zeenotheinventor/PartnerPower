import { copy } from '@getfreak/content';
import { fireEvent, screen, within } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { StatementView } from './StatementView';
import type { StatementViewProps } from './types';

const props: StatementViewProps = {
  frame: {
    countLabel: 'Question 1 of 10',
    progress: { number: 1, length: 10 },
    category: 'c1',
    categoryName: 'Group one',
    topicName: 'Topic one',
    prompt: { lead: 'Lead in', text: 'the clause.' },
    penaltyLine: 'It costs 1',
    onEndRound: jest.fn(),
  },
  format: 'ifYou',
  playerNames: ['Player A', 'Player B'],
  readerName: 'Player A',
  mood: 'idle',
  onShowWhoDrinks: jest.fn(),
  onNotThisOne: jest.fn(),
};

function renderView(overrides: Partial<StatementViewProps> = {}) {
  return renderThemed(<StatementView {...props} {...overrides} />);
}

function groupOf(name: string) {
  // The group is not an accessibility element of its own, so it is found by its label.
  return within(screen.getByLabelText(name));
}

describe('StatementView', () => {
  it('should tell the reader to read a drink if question', async () => {
    await renderView();
    expect(screen.getByRole('header', { name: 'Player A reads' })).toBeOnTheScreen();
  });

  it('should tell the reader to read a never have I ever question out loud', async () => {
    await renderView({ format: 'neverHave' });

    expect(screen.getByRole('header', { name: 'Player A, read it out loud.' })).toBeOnTheScreen();
  });

  it('should ask each player for yes or no, with nothing chosen yet', async () => {
    await renderView();

    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(
      groupOf('Player A').getByRole('radio', { name: copy.questionsPlay.yes }),
    ).toBeOnTheScreen();
    expect(
      groupOf('Player B').getByRole('radio', { name: copy.questionsPlay.no }),
    ).toBeOnTheScreen();
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0);
  });

  it('should ask for I have or never for a never have I ever question', async () => {
    await renderView({ format: 'neverHave' });

    expect(
      groupOf('Player A').getByRole('radio', { name: copy.questionsPlay.have }),
    ).toBeOnTheScreen();
    expect(
      groupOf('Player B').getByRole('radio', { name: copy.questionsPlay.never }),
    ).toBeOnTheScreen();
  });

  it('should keep the button off until both players have answered', async () => {
    await renderView();

    fireEvent.press(groupOf('Player A').getByRole('radio', { name: copy.questionsPlay.yes }));

    expect(screen.getByRole('button', { name: copy.questionsPlay.showWhoDrinks })).toBeDisabled();
  });

  it('should send both answers by player once both are set, and let either change before then', async () => {
    const onShowWhoDrinks = jest.fn();
    await renderView({ onShowWhoDrinks });

    fireEvent.press(groupOf('Player A').getByRole('radio', { name: copy.questionsPlay.yes }));
    fireEvent.press(groupOf('Player B').getByRole('radio', { name: copy.questionsPlay.yes }));
    fireEvent.press(groupOf('Player B').getByRole('radio', { name: copy.questionsPlay.no }));
    fireEvent.press(screen.getByRole('button', { name: copy.questionsPlay.showWhoDrinks }));

    expect(onShowWhoDrinks).toHaveBeenCalledWith([true, false]);
  });

  it('should send a have as a yes for a never have I ever question', async () => {
    const onShowWhoDrinks = jest.fn();
    await renderView({ format: 'neverHave', onShowWhoDrinks });

    fireEvent.press(groupOf('Player A').getByRole('radio', { name: copy.questionsPlay.never }));
    fireEvent.press(groupOf('Player B').getByRole('radio', { name: copy.questionsPlay.have }));
    fireEvent.press(screen.getByRole('button', { name: copy.questionsPlay.showWhoDrinks }));

    expect(onShowWhoDrinks).toHaveBeenCalledWith([false, true]);
  });

  it('should check the answer a player gave', async () => {
    await renderView();

    fireEvent.press(groupOf('Player B').getByRole('radio', { name: copy.questionsPlay.no }));

    expect(
      groupOf('Player B').getByRole('radio', { name: copy.questionsPlay.no, checked: true }),
    ).toBeOnTheScreen();
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('should open Not this one from its link', async () => {
    const onNotThisOne = jest.fn();
    await renderView({ onNotThisOne });

    fireEvent.press(screen.getByRole('button', { name: copy.roundPlay.notThisOne }));

    expect(onNotThisOne).toHaveBeenCalledTimes(1);
  });
});
