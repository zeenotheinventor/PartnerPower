import { copy } from '@getfreak/content';
import { colorThemes } from '@getfreak/tokens';
import { screen, within } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { PlayerScore } from './PlayerScore';

describe('PlayerScore', () => {
  it('should read as one group with the name, the dares done and the drinks', async () => {
    await renderThemed(<PlayerScore name="Player A" daresDone={6} drinks={4} isBoldest={false} />);

    expect(
      screen.getByRole('group', { name: 'Player A, 6 dares done, 4 drinks' }),
    ).toBeOnTheScreen();
  });

  it('should show the numbers beside their labels', async () => {
    await renderThemed(<PlayerScore name="Player A" daresDone={6} drinks={4} isBoldest={false} />);

    const group = within(screen.getByRole('group'));
    expect(group.getByText('Player A')).toBeOnTheScreen();
    expect(group.getByText('6')).toBeOnTheScreen();
    expect(group.getByText(copy.roundSummary.doneLabel)).toBeOnTheScreen();
    expect(group.getByText('4')).toBeOnTheScreen();
    expect(group.getByText(copy.roundSummary.drinkLabelMany)).toBeOnTheScreen();
  });

  it('should use the singular for one dare and one drink', async () => {
    await renderThemed(<PlayerScore name="Player A" daresDone={1} drinks={1} isBoldest={false} />);

    expect(screen.getByRole('group', { name: 'Player A, 1 dare done, 1 drink' })).toBeOnTheScreen();
    expect(
      within(screen.getByRole('group')).getByText(copy.roundSummary.drinkLabelOne),
    ).toBeOnTheScreen();
  });

  it('should show the boldest badge and announce it when the player is the boldest', async () => {
    await renderThemed(<PlayerScore name="Player A" daresDone={8} drinks={2} isBoldest />);

    const group = screen.getByRole('group', { name: 'Player A, 8 dares done, 2 drinks, boldest' });
    expect(within(group).getByText(copy.roundSummary.boldestBadge)).toBeOnTheScreen();
  });

  describe.each(['light', 'dark'] as const)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should fill the boldest badge with the accent and set its text in the small label colour', async () => {
      await renderThemed(
        <PlayerScore name="Player A" daresDone={8} drinks={2} isBoldest />,
        themeName,
      );

      const badge = screen.getByText(copy.roundSummary.boldestBadge);
      expect(badge).toHaveStyle({ backgroundColor: theme.accent.toLowerCase() });
      expect(badge).toHaveStyle({ color: theme.onAccentSmall.toLowerCase() });
    });
  });

  it('should show no badge when the player is not the boldest', async () => {
    await renderThemed(<PlayerScore name="Player A" daresDone={8} drinks={2} isBoldest={false} />);

    expect(screen.queryByText(copy.roundSummary.boldestBadge)).not.toBeOnTheScreen();
  });
});
