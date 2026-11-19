import { colorThemes } from '@getfreak/tokens';
import { fireEvent, screen } from 'nativewind/test';

import { View } from 'react-native';
import { renderWithMockFeedback } from '../../../feedback/renderWithMockFeedback';

import { hostViewsInside } from '../../../tailwind/hostViewsInside';
import { renderThemed } from '../../../tailwind/renderThemed';
import { Header } from './Header';

const themeNames = ['light', 'dark'] as const;

describe('Header', () => {
  it('should show the title as a heading', async () => {
    await renderThemed(<Header title="Set the round" />);

    expect(screen.getByRole('header', { name: 'Set the round' })).toBeOnTheScreen();
  });

  it('should show the subtitle when there is one', async () => {
    await renderThemed(<Header title="Set the round" subtitle="Card 1 of 20" />);

    expect(screen.getByText('Card 1 of 20')).toBeOnTheScreen();
  });

  it('should have no back button by default', async () => {
    await renderThemed(<Header title="Set the round" />);

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
  });

  it('should show a back button named by the caller', async () => {
    await renderThemed(<Header title="Set the round" backLabel="Go back" onBack={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Go back' })).toBeOnTheScreen();
  });

  it('should call the handler when the back button is pressed', async () => {
    const onBack = jest.fn();
    await renderThemed(<Header title="Set the round" backLabel="Go back" onBack={onBack} />);

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should show a trailing element at the end of the title row', async () => {
    await renderThemed(
      <Header
        title="Set the round"
        trailing={<View accessible accessibilityRole="image" accessibilityLabel="Avatar" />}
      />,
    );

    expect(screen.getByRole('image', { name: 'Avatar' })).toBeOnTheScreen();
  });

  it('should draw the back chevron turned 45 degrees', async () => {
    await renderThemed(<Header title="Set the round" backLabel="Go back" onBack={jest.fn()} />);

    const [chevron] = hostViewsInside(screen.getByRole('button', { name: 'Go back' }));

    expect(chevron).toHaveStyle({
      transform: expect.arrayContaining([{ rotate: '45deg' }]),
    });
  });

  describe.each(themeNames)('with the device in %s mode', (themeName) => {
    const theme = colorThemes[themeName];

    it('should set the title in the title type and the foreground colour', async () => {
      await renderThemed(<Header title="Set the round" />, themeName);

      expect(screen.getByRole('header', { name: 'Set the round' })).toHaveStyle({
        color: theme.foreground.toLowerCase(),
        fontFamily: 'Baloo2_800ExtraBold',
        fontSize: 26,
      });
    });

    it('should set the subtitle in the muted colour', async () => {
      await renderThemed(<Header title="Set the round" subtitle="Card 1 of 20" />, themeName);

      expect(screen.getByText('Card 1 of 20')).toHaveStyle({ color: theme.muted.toLowerCase() });
    });

    it('should draw the back button on the surface with a border', async () => {
      await renderThemed(
        <Header title="Set the round" backLabel="Go back" onBack={jest.fn()} />,
        themeName,
      );

      expect(screen.getByRole('button', { name: 'Go back' })).toHaveStyle({
        backgroundColor: theme.surface.toLowerCase(),
        borderColor: theme.border.toLowerCase(),
      });
    });
  });
});

describe('Header press feedback', () => {
  it('should give the back feedback when the back button is pressed', async () => {
    const onBack = jest.fn();
    const feedback = await renderWithMockFeedback(
      <Header title="Set the round" backLabel="Go back" onBack={onBack} />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(feedback.back).toHaveBeenCalledTimes(1);
    expect(feedback.tap).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
