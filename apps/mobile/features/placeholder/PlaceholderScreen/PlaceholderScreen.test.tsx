import { colorThemes, typeScale } from '@getfreak/tokens';
import { screen } from 'nativewind/test';

import { renderThemed } from '../../../tailwind/renderThemed';
import { PlaceholderScreen } from './PlaceholderScreen';

describe('PlaceholderScreen', () => {
  it('should show the app name as the heading', async () => {
    await renderThemed(<PlaceholderScreen />);

    expect(screen.getByRole('header', { name: 'Get Freak' })).toBeOnTheScreen();
  });

  it('should show that the app is coming soon', async () => {
    await renderThemed(<PlaceholderScreen />);

    expect(screen.getByText('Coming soon')).toBeOnTheScreen();
  });

  describe.each(['light', 'dark'] as const)('with the device in %s mode', (themeName) => {
    it('should set the heading in the display type and the theme text colour', async () => {
      await renderThemed(<PlaceholderScreen />, themeName);

      expect(screen.getByRole('header', { name: 'Get Freak' })).toHaveStyle({
        color: colorThemes[themeName].foreground.toLowerCase(),
        fontFamily: typeScale.display.fontFamily,
        fontSize: typeScale.display.fontSize,
      });
    });

    it('should set the status line in the muted colour', async () => {
      await renderThemed(<PlaceholderScreen />, themeName);

      expect(screen.getByText('Coming soon')).toHaveStyle({
        color: colorThemes[themeName].muted.toLowerCase(),
        fontFamily: typeScale.body.fontFamily,
      });
    });
  });
});
