import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { hostViewsInside } from '../../../tailwind/hostViewsInside';
import { renderThemed } from '../../../tailwind/renderThemed';
import { FavouriteToggle } from './FavouriteToggle';

const themeNames = ['light', 'dark'] as const;
const name = 'Favourite';

function heartOf(toggle: ReturnType<typeof screen.getByRole>) {
  // The heart is three views: the turned square, then the two round halves.
  const [square] = hostViewsInside(toggle);
  if (!square) throw new Error('The toggle has no heart');
  return square;
}

describe('FavouriteToggle', () => {
  it('should be a switch named Favourite', async () => {
    await renderThemed(<FavouriteToggle label={name} value={false} onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name })).toBeOnTheScreen();
  });

  it('should take its name from the label it is given', async () => {
    await renderThemed(<FavouriteToggle label="Keep" value onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name: 'Keep' })).toBeOnTheScreen();
  });

  it('should give the context as the hint of the switch', async () => {
    await renderThemed(
      <FavouriteToggle
        label={name}
        value={false}
        onValueChange={jest.fn()}
        context="Placeholder card text"
      />,
    );

    expect(screen.getByRole('switch', { name }).props.accessibilityHint).toBe(
      'Placeholder card text',
    );
  });

  it('should have no hint without a context', async () => {
    await renderThemed(<FavouriteToggle label={name} value onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name }).props.accessibilityHint).toBeUndefined();
  });

  it('should expose that it is on', async () => {
    await renderThemed(<FavouriteToggle label={name} value onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name, checked: true })).toBeOnTheScreen();
  });

  it('should expose that it is off', async () => {
    await renderThemed(<FavouriteToggle label={name} value={false} onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name, checked: false })).toBeOnTheScreen();
  });

  it('should report the opposite value when pressed while off', async () => {
    const onValueChange = jest.fn();
    await renderThemed(
      <FavouriteToggle label={name} value={false} onValueChange={onValueChange} />,
    );

    fireEvent.press(screen.getByRole('switch', { name }));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('should report the opposite value when pressed while on', async () => {
    const onValueChange = jest.fn();
    await renderThemed(<FavouriteToggle label={name} value onValueChange={onValueChange} />);

    fireEvent.press(screen.getByRole('switch', { name }));

    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('should be 48 wide and 48 high', async () => {
    await renderThemed(<FavouriteToggle label={name} value onValueChange={jest.fn()} />);

    expect(screen.getByRole('switch', { name })).toHaveStyle({ width: 48, height: 48 });
  });

  it('should draw a heart of a turned square and two round halves', async () => {
    await renderThemed(<FavouriteToggle label={name} value onValueChange={jest.fn()} />);

    const views = hostViewsInside(screen.getByRole('switch', { name }));

    expect(views).toHaveLength(3);
    expect(views[0]).toHaveStyle({ width: 12, height: 12 });
    expect(views[1]).toHaveStyle({ width: 12, height: 12, borderRadius: 999 });
    expect(views[2]).toHaveStyle({ width: 12, height: 12, borderRadius: 999 });
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should fill with the accent colour and draw an on-accent heart when on', async () => {
      await renderThemed(
        <FavouriteToggle label={name} value onValueChange={jest.fn()} />,
        themeName,
      );

      const toggle = screen.getByRole('switch', { name });
      expect(toggle).toHaveStyle({
        backgroundColor: theme.accent.toLowerCase(),
        borderColor: theme.accent.toLowerCase(),
      });
      expect(heartOf(toggle)).toHaveStyle({ backgroundColor: theme.onAccent.toLowerCase() });
    });

    it('should show a surface with a border and a muted heart when off', async () => {
      await renderThemed(
        <FavouriteToggle label={name} value={false} onValueChange={jest.fn()} />,
        themeName,
      );

      const toggle = screen.getByRole('switch', { name });
      expect(toggle).toHaveStyle({
        backgroundColor: theme.surface.toLowerCase(),
        borderColor: theme.border.toLowerCase(),
      });
      expect(heartOf(toggle)).toHaveStyle({ backgroundColor: theme.muted.toLowerCase() });
    });
  });
});
