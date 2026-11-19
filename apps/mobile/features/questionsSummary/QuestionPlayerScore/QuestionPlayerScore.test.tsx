import { copy } from '@getfreak/content';
import { screen, within } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { QuestionPlayerScore } from './QuestionPlayerScore';

describe('QuestionPlayerScore', () => {
  it('should read as one group with the name, the drinks and the guesses right', async () => {
    await renderThemed(
      <QuestionPlayerScore
        name="Player A"
        drinks={3}
        guessesRight={2}
        guessesMade={5}
        knowsBest={false}
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Player A, 3 drinks, 2 of 5 guesses right' }),
    ).toBeOnTheScreen();
  });

  it('should show the numbers beside their labels', async () => {
    await renderThemed(
      <QuestionPlayerScore
        name="Player A"
        drinks={3}
        guessesRight={2}
        guessesMade={5}
        knowsBest={false}
      />,
    );

    const group = within(screen.getByRole('group'));
    expect(group.getByText('Player A')).toBeOnTheScreen();
    expect(group.getByText('3')).toBeOnTheScreen();
    expect(group.getByText(copy.roundSummary.drinkLabelMany)).toBeOnTheScreen();
    expect(group.getByText('2 of 5')).toBeOnTheScreen();
    expect(group.getByText(copy.questionsSummary.guessedRight)).toBeOnTheScreen();
  });

  it('should use the singular for one drink', async () => {
    await renderThemed(
      <QuestionPlayerScore
        name="Player A"
        drinks={1}
        guessesRight={1}
        guessesMade={1}
        knowsBest={false}
      />,
    );

    expect(
      screen.getByRole('group', { name: 'Player A, 1 drink, 1 of 1 guesses right' }),
    ).toBeOnTheScreen();
    expect(
      within(screen.getByRole('group')).getByText(copy.roundSummary.drinkLabelOne),
    ).toBeOnTheScreen();
  });

  it('should show the badge and announce it when the player knows best', async () => {
    await renderThemed(
      <QuestionPlayerScore name="Player A" drinks={3} guessesRight={4} guessesMade={5} knowsBest />,
    );

    const group = screen.getByRole('group', {
      name: 'Player A, 3 drinks, 4 of 5 guesses right, knows you best',
    });
    expect(within(group).getByText(copy.questionsSummary.badge)).toBeOnTheScreen();
  });

  it('should show no badge when the player does not know best', async () => {
    await renderThemed(
      <QuestionPlayerScore
        name="Player A"
        drinks={3}
        guessesRight={4}
        guessesMade={5}
        knowsBest={false}
      />,
    );

    expect(screen.queryByText(copy.questionsSummary.badge)).not.toBeOnTheScreen();
  });

  it('should leave out the guess line when the player made no guesses', async () => {
    await renderThemed(
      <QuestionPlayerScore
        name="Player A"
        drinks={4}
        guessesRight={0}
        guessesMade={0}
        knowsBest={false}
      />,
    );

    expect(screen.getByRole('group', { name: 'Player A, 4 drinks' })).toBeOnTheScreen();
    expect(screen.queryByText(copy.questionsSummary.guessedRight)).not.toBeOnTheScreen();
  });
});
